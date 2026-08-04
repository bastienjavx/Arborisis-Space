#!/usr/bin/env bash
#
# Arborisis — installateur one-click pour serveur dédié.
#
#   curl -fsSL https://raw.githubusercontent.com/bastienjavx/arborisis-space/main/install.sh | sudo bash -s -- --domain jeu.example.com --email admin@example.com
#
# ou depuis un dépôt déjà cloné :
#
#   sudo ./install.sh
#
# Le script est idempotent : relancé, il conserve les secrets déjà générés et se
# contente de reconstruire et redémarrer la stack.
#
set -Eeuo pipefail

REPO_URL_DEFAULT="https://github.com/bastienjavx/arborisis-space.git"
INSTALL_DIR_DEFAULT="/opt/arborisis"
BRANCH_DEFAULT="main"

REPO_URL="${ARBORISIS_REPO_URL:-$REPO_URL_DEFAULT}"
INSTALL_DIR="${ARBORISIS_DIR:-$INSTALL_DIR_DEFAULT}"
BRANCH="${ARBORISIS_BRANCH:-$BRANCH_DEFAULT}"
DOMAIN=""
ACME_EMAIL=""
ASSUME_YES=0
WANT_TLS=1
WANT_SYSTEMD=1
WANT_BACKUP_TIMER=1
WANT_DOCKER_INSTALL=1

# ── Sortie ───────────────────────────────────────────────────────────────────

if [ -t 1 ]; then
  C_RESET=$'\033[0m'; C_DIM=$'\033[2m'; C_RED=$'\033[31m'
  C_GREEN=$'\033[32m'; C_YELLOW=$'\033[33m'; C_CYAN=$'\033[36m'
else
  C_RESET=''; C_DIM=''; C_RED=''; C_GREEN=''; C_YELLOW=''; C_CYAN=''
fi

log()  { printf '%s==>%s %s\n' "$C_CYAN" "$C_RESET" "$*"; }
ok()   { printf '%s  ✓%s %s\n' "$C_GREEN" "$C_RESET" "$*"; }
warn() { printf '%s  !%s %s\n' "$C_YELLOW" "$C_RESET" "$*" >&2; }
die()  { printf '%s  ✗%s %s\n' "$C_RED" "$C_RESET" "$*" >&2; exit 1; }
hint() { printf '%s    %s%s\n' "$C_DIM" "$*" "$C_RESET"; }

trap 'die "Échec ligne $LINENO. Rien n'\''a été démarré ou la stack est restée dans son état précédent."' ERR

usage() {
  cat <<'EOF'
Arborisis — installateur serveur dédié

Usage : install.sh [options]

Options :
  --domain <fqdn>       Domaine public (HTTPS automatique via Let's Encrypt).
                        Omis : le jeu est servi en HTTP sur l'IP de la machine.
  --email <adresse>     Contact ACME pour les certificats (requis avec --domain).
  --dir <chemin>        Répertoire d'installation (défaut : /opt/arborisis).
  --branch <nom>        Branche Git à déployer (défaut : main).
  --repo <url>          Dépôt source (défaut : dépôt public Arborisis).
  --no-tls              Force le mode HTTP simple même avec un domaine.
  --no-systemd          N'installe pas le service systemd de démarrage auto.
  --no-backup-timer     N'installe pas la sauvegarde quotidienne planifiée.
  --skip-docker         N'installe pas Docker automatiquement s'il manque.
  -y, --yes             Ne pose aucune question (mode non interactif).
  -h, --help            Affiche cette aide.

Exemples :
  sudo ./install.sh --domain jeu.example.com --email admin@example.com -y
  sudo ./install.sh --no-tls -y            # test rapide en HTTP sur l'IP
EOF
}

# ── Arguments ────────────────────────────────────────────────────────────────

while [ $# -gt 0 ]; do
  case "$1" in
    --domain) DOMAIN="${2:-}"; shift 2 ;;
    --email) ACME_EMAIL="${2:-}"; shift 2 ;;
    --dir) INSTALL_DIR="${2:-}"; shift 2 ;;
    --branch) BRANCH="${2:-}"; shift 2 ;;
    --repo) REPO_URL="${2:-}"; shift 2 ;;
    --no-tls) WANT_TLS=0; shift ;;
    --no-systemd) WANT_SYSTEMD=0; shift ;;
    --no-backup-timer) WANT_BACKUP_TIMER=0; shift ;;
    --skip-docker) WANT_DOCKER_INSTALL=0; shift ;;
    -y|--yes) ASSUME_YES=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) usage >&2; die "Option inconnue : $1" ;;
  esac
done

# Sans TTY (curl | bash) et sans -y, on ne peut pas poser de questions.
if [ ! -t 0 ] && [ "$ASSUME_YES" -eq 0 ]; then
  ASSUME_YES=1
fi

ask() {
  # ask <question> <valeur-par-défaut>
  local question="$1" default="${2:-}" answer
  if [ "$ASSUME_YES" -eq 1 ] || [ ! -t 0 ]; then
    printf '%s' "$default"
    return
  fi
  read -r -p "$question${default:+ [$default]} : " answer </dev/tty || answer=""
  printf '%s' "${answer:-$default}"
}

confirm() {
  local question="$1"
  [ "$ASSUME_YES" -eq 1 ] && return 0
  local answer
  read -r -p "$question [o/N] " answer </dev/tty || answer=""
  case "$answer" in [oOyY]*) return 0 ;; *) return 1 ;; esac
}

# ── Privilèges ───────────────────────────────────────────────────────────────

SUDO=""
if [ "$(id -u)" -ne 0 ]; then
  if command -v sudo >/dev/null 2>&1; then
    SUDO="sudo"
  else
    die "Ce script doit tourner en root (ou avec sudo disponible)."
  fi
fi

run_root() { if [ -n "$SUDO" ]; then $SUDO "$@"; else "$@"; fi; }

# ── Préflight ────────────────────────────────────────────────────────────────

log "Vérification de la machine"

OS_NAME="inconnu"
if [ -r /etc/os-release ]; then
  # shellcheck disable=SC1091
  . /etc/os-release
  OS_NAME="${PRETTY_NAME:-${NAME:-inconnu}}"
fi
ok "Système : $OS_NAME ($(uname -m))"

case "$(uname -s)" in
  Linux) ;;
  *) die "Seul Linux est supporté pour l'installation serveur dédié." ;;
esac

TOTAL_MEM_MB=$(awk '/MemTotal/ {printf "%d", $2/1024}' /proc/meminfo 2>/dev/null || echo 0)
if [ "$TOTAL_MEM_MB" -gt 0 ] && [ "$TOTAL_MEM_MB" -lt 3500 ]; then
  warn "RAM détectée : ${TOTAL_MEM_MB} Mo. 4 Go minimum recommandés (8 Go confortables)."
  hint "Le build Next.js peut échouer par manque de mémoire sous 4 Go."
else
  ok "RAM : ${TOTAL_MEM_MB} Mo"
fi

FREE_DISK_GB=$(df -BG --output=avail / 2>/dev/null | tail -1 | tr -dc '0-9' || echo 0)
if [ -n "$FREE_DISK_GB" ] && [ "$FREE_DISK_GB" -lt 15 ]; then
  warn "Espace disque libre : ${FREE_DISK_GB} Go. 20 Go recommandés (images + base + sauvegardes)."
else
  ok "Disque libre : ${FREE_DISK_GB} Go"
fi

for port in 80 443; do
  if command -v ss >/dev/null 2>&1 && ss -ltn "( sport = :$port )" 2>/dev/null | grep -q LISTEN; then
    warn "Le port $port est déjà occupé — Caddy ne pourra pas démarrer."
    hint "Arrêter le service concerné (nginx, apache2…) ou mettre HTTP_BIND/HTTPS_BIND sur 127.0.0.1."
  fi
done

# ── Docker ───────────────────────────────────────────────────────────────────

install_docker() {
  log "Installation de Docker"
  if [ "$WANT_DOCKER_INSTALL" -eq 0 ]; then
    die "Docker est absent et --skip-docker est actif. Installer Docker puis relancer."
  fi
  if ! confirm "Installer Docker Engine via https://get.docker.com ?"; then
    die "Docker est requis. Installation annulée."
  fi
  command -v curl >/dev/null 2>&1 || die "curl est requis pour installer Docker."
  curl -fsSL https://get.docker.com -o /tmp/get-docker.sh
  run_root sh /tmp/get-docker.sh
  rm -f /tmp/get-docker.sh
  run_root systemctl enable --now docker 2>/dev/null || true
  ok "Docker installé"
}

if ! command -v docker >/dev/null 2>&1; then
  install_docker
fi

if ! run_root docker compose version >/dev/null 2>&1; then
  die "Le plugin « docker compose » (v2) est absent. Installer docker-compose-plugin puis relancer."
fi
ok "Docker : $(run_root docker --version | sed 's/,.*//')"

for tool in git openssl; do
  command -v "$tool" >/dev/null 2>&1 || die "« $tool » est requis. L'installer puis relancer."
done

# ── Récupération des sources ─────────────────────────────────────────────────

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"

if [ -f "$SCRIPT_DIR/deploy/docker-compose.prod.yml" ]; then
  INSTALL_DIR="$SCRIPT_DIR"
  log "Sources locales détectées : $INSTALL_DIR"
elif [ -d "$INSTALL_DIR/.git" ]; then
  log "Mise à jour des sources dans $INSTALL_DIR"
  run_root git -C "$INSTALL_DIR" fetch --depth 1 origin "$BRANCH"
  run_root git -C "$INSTALL_DIR" checkout -B "$BRANCH" "origin/$BRANCH"
  ok "Sources à jour ($BRANCH)"
else
  log "Clonage de $REPO_URL dans $INSTALL_DIR"
  run_root mkdir -p "$(dirname "$INSTALL_DIR")"
  run_root git clone --depth 1 --branch "$BRANCH" "$REPO_URL" "$INSTALL_DIR"
  ok "Dépôt cloné"
fi

cd "$INSTALL_DIR"
COMPOSE_FILE="deploy/docker-compose.prod.yml"
ENV_FILE="deploy/.env"
[ -f "$COMPOSE_FILE" ] || die "Fichier introuvable : $INSTALL_DIR/$COMPOSE_FILE"

compose() { run_root docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" "$@"; }

# ── Configuration ────────────────────────────────────────────────────────────

log "Configuration"

# Relecture des valeurs existantes : une réinstallation ne doit jamais faire
# tourner les secrets (sessions invalidées, base inaccessible).
existing() {
  [ -f "$ENV_FILE" ] || { printf ''; return; }
  run_root sed -n "s/^$1=//p" "$ENV_FILE" | tail -1
}

gen_secret() { openssl rand -hex 32; }

keep_or_generate() {
  local current
  current="$(existing "$1")"
  if [ -n "$current" ]; then printf '%s' "$current"; else gen_secret; fi
}

if [ -z "$DOMAIN" ] && [ "$ASSUME_YES" -eq 0 ]; then
  DOMAIN="$(ask 'Domaine public (vide = HTTP sur IP)' '')"
fi

if [ -n "$DOMAIN" ] && [ "$WANT_TLS" -eq 1 ]; then
  if [ -z "$ACME_EMAIL" ]; then
    ACME_EMAIL="$(ask "E-mail de contact pour les certificats TLS" "admin@$DOMAIN")"
  fi
  PUBLIC_URL="https://$DOMAIN"
  SITE_ADDRESS="$DOMAIN"

  # Contrôle DNS purement informatif : on n'arrête jamais l'installation dessus.
  PUBLIC_IP="$(curl -fsS --max-time 5 https://api.ipify.org 2>/dev/null || true)"
  RESOLVED="$(getent ahostsv4 "$DOMAIN" 2>/dev/null | awk 'NR==1 {print $1}' || true)"
  if [ -n "$PUBLIC_IP" ] && [ -n "$RESOLVED" ] && [ "$PUBLIC_IP" != "$RESOLVED" ]; then
    warn "$DOMAIN pointe vers $RESOLVED alors que cette machine est en $PUBLIC_IP."
    hint "Let's Encrypt échouera tant que l'enregistrement A ne pointe pas ici ; Caddy réessaiera automatiquement."
  fi
else
  HOST_ADDR="${DOMAIN:-$(curl -fsS --max-time 5 https://api.ipify.org 2>/dev/null || hostname -I 2>/dev/null | awk '{print $1}')}"
  HOST_ADDR="${HOST_ADDR:-localhost}"
  PUBLIC_URL="http://$HOST_ADDR"
  SITE_ADDRESS=":80"
  ACME_EMAIL="${ACME_EMAIL:-}"
  warn "Mode HTTP simple : les cookies de session ne sont pas chiffrés en transit."
  hint "Relancer avec --domain <fqdn> --email <adresse> pour activer HTTPS."
fi

ok "URL publique : $PUBLIC_URL"

POSTGRES_PASSWORD="$(keep_or_generate POSTGRES_PASSWORD)"
REDIS_PASSWORD="$(keep_or_generate REDIS_PASSWORD)"
JWT_ACCESS_SECRET="$(keep_or_generate JWT_ACCESS_SECRET)"
JWT_REFRESH_SECRET="$(keep_or_generate JWT_REFRESH_SECRET)"
TOTP_ENC_KEY="$(keep_or_generate TOTP_ENC_KEY)"
UNIVERSE_COOKIE_SECRET="$(keep_or_generate UNIVERSE_COOKIE_SECRET)"

# Dimensionnement Postgres déduit de la RAM disponible.
if [ "$TOTAL_MEM_MB" -ge 15000 ]; then
  PG_SHARED_BUFFERS="4GB"; PG_CACHE="12GB"; REDIS_MAXMEMORY="1gb"
elif [ "$TOTAL_MEM_MB" -ge 7000 ]; then
  PG_SHARED_BUFFERS="2GB"; PG_CACHE="6GB"; REDIS_MAXMEMORY="768mb"
else
  PG_SHARED_BUFFERS="512MB"; PG_CACHE="1536MB"; REDIS_MAXMEMORY="512mb"
fi

# Valeurs réglables conservées si l'opérateur les a déjà personnalisées.
SMTP_HOST="$(existing SMTP_HOST)"; SMTP_HOST="${SMTP_HOST:-sandbox.smtp.mailtrap.io}"
SMTP_PORT="$(existing SMTP_PORT)"; SMTP_PORT="${SMTP_PORT:-2525}"
SMTP_USER="$(existing SMTP_USER)"
SMTP_PASS="$(existing SMTP_PASS)"
SMTP_FROM="$(existing SMTP_FROM)"; SMTP_FROM="${SMTP_FROM:-noreply@arborisis.game}"
GOOGLE_SITE_VERIFICATION="$(existing GOOGLE_SITE_VERIFICATION)"
UNIVERSE_MAX_PLAYERS="$(existing UNIVERSE_MAX_PLAYERS)"; UNIVERSE_MAX_PLAYERS="${UNIVERSE_MAX_PLAYERS:-500}"

log "Écriture de $ENV_FILE"

TMP_ENV="$(mktemp)"
chmod 600 "$TMP_ENV"
cat >"$TMP_ENV" <<EOF
# Généré par install.sh le $(date -u '+%Y-%m-%d %H:%M:%S UTC').
# Modèle documenté : deploy/.env.dedicated.example
# Ce fichier contient des secrets de production — ne jamais le commiter.

PUBLIC_URL=$PUBLIC_URL
SITE_ADDRESS=$SITE_ADDRESS
ACME_EMAIL=$ACME_EMAIL
COOKIE_DOMAIN=
HTTP_BIND=0.0.0.0
HTTPS_BIND=0.0.0.0
TZ=$(cat /etc/timezone 2>/dev/null || echo UTC)

POSTGRES_USER=arborisis
POSTGRES_DB=arborisis
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
POSTGRES_BIND=127.0.0.1:5432
POSTGRES_MAX_CONNECTIONS=200
POSTGRES_SHARED_BUFFERS=$PG_SHARED_BUFFERS
POSTGRES_EFFECTIVE_CACHE_SIZE=$PG_CACHE
PRISMA_CONNECTION_LIMIT=10
PRISMA_STATEMENT_TIMEOUT_MS=30000

REDIS_PASSWORD=$REDIS_PASSWORD
REDIS_MAXMEMORY=$REDIS_MAXMEMORY

JWT_ACCESS_SECRET=$JWT_ACCESS_SECRET
JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET
JWT_ACCESS_TTL=900
JWT_REFRESH_TTL=1209600
TOTP_ENC_KEY=$TOTP_ENC_KEY
UNIVERSE_COOKIE_SECRET=$UNIVERSE_COOKIE_SECRET

UNIVERSE_MAX_PLAYERS=$UNIVERSE_MAX_PLAYERS

SMTP_HOST=$SMTP_HOST
SMTP_PORT=$SMTP_PORT
SMTP_USER=$SMTP_USER
SMTP_PASS=$SMTP_PASS
SMTP_FROM=$SMTP_FROM

GOOGLE_SITE_VERIFICATION=$GOOGLE_SITE_VERIFICATION

BACKUP_DIR=./backups
BACKUP_RETENTION_DAYS=14
EOF

run_root install -m 600 "$TMP_ENV" "$ENV_FILE"
rm -f "$TMP_ENV"
ok "Configuration écrite (permissions 600)"

# ── Build et démarrage ───────────────────────────────────────────────────────

log "Construction des images (plusieurs minutes au premier lancement)"
compose build --pull
ok "Images construites"

# Le service `migrate` (one-shot) applique migrations + seed avant que l'API et les
# workers ne démarrent : c'est `depends_on: service_completed_successfully` qui
# séquence tout, comme la release phase Railway.
log "Démarrage de la stack (migrations et seed inclus)"
compose up -d --remove-orphans
ok "Conteneurs démarrés"

log "Attente de la disponibilité du jeu"
HEALTHY=0
for _ in $(seq 1 60); do
  API_CID="$(compose ps -q api 2>/dev/null || true)"
  if [ -n "$API_CID" ]; then
    STATUS="$(run_root docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$API_CID" 2>/dev/null || true)"
    if [ "$STATUS" = "healthy" ]; then
      HEALTHY=1
      break
    fi
  fi
  sleep 5
done

if [ "$HEALTHY" -eq 1 ]; then
  ok "API opérationnelle"
else
  warn "L'API n'est pas saine après 5 minutes. Extrait des journaux :"
  compose logs --tail 40 migrate api 2>&1 | sed 's/^/    /' >&2 || true
  hint "Diagnostic complet : arborisis logs"
fi

# ── Intégration système ──────────────────────────────────────────────────────

if [ -w /usr/local/bin ] || [ -n "$SUDO" ]; then
  run_root ln -sf "$INSTALL_DIR/deploy/arborisis.sh" /usr/local/bin/arborisis
  ok "Commande « arborisis » disponible"
fi

if [ "$WANT_SYSTEMD" -eq 1 ] && command -v systemctl >/dev/null 2>&1; then
  log "Installation des unités systemd"
  for unit in arborisis.service arborisis-backup.service arborisis-backup.timer; do
    sed "s#@INSTALL_DIR@#$INSTALL_DIR#g" "deploy/systemd/$unit" >"/tmp/$unit"
    run_root install -m 644 "/tmp/$unit" "/etc/systemd/system/$unit"
    rm -f "/tmp/$unit"
  done
  run_root systemctl daemon-reload
  run_root systemctl enable arborisis.service >/dev/null 2>&1 || warn "Impossible d'activer arborisis.service"
  if [ "$WANT_BACKUP_TIMER" -eq 1 ]; then
    run_root systemctl enable --now arborisis-backup.timer >/dev/null 2>&1 \
      || warn "Impossible d'activer la sauvegarde planifiée"
    ok "Sauvegarde quotidienne planifiée (03h30)"
  fi
  ok "Démarrage automatique activé"
fi

if command -v ufw >/dev/null 2>&1 && run_root ufw status 2>/dev/null | grep -q 'Status: active'; then
  run_root ufw allow 80/tcp >/dev/null 2>&1 || true
  run_root ufw allow 443/tcp >/dev/null 2>&1 || true
  ok "Règles ufw ouvertes sur 80/443"
fi

# ── Résumé ───────────────────────────────────────────────────────────────────

cat <<EOF

${C_GREEN}Arborisis est installé.${C_RESET}

  Jeu            ${C_CYAN}${PUBLIC_URL}${C_RESET}
  Santé API      ${PUBLIC_URL}/api/health
  Installation   ${INSTALL_DIR}
  Configuration  ${INSTALL_DIR}/${ENV_FILE}  ${C_DIM}(secrets — sauvegarder hors machine)${C_RESET}

  Compte de démonstration créé par le seed :
    demo@arborisis.test / arborisis-demo
    ${C_DIM}Le supprimer ou changer son mot de passe avant d'ouvrir le serveur au public.${C_RESET}

  Exploitation :
    arborisis status          état des services
    arborisis logs api        journaux d'un service
    arborisis update          git pull + rebuild + migrations + redémarrage
    arborisis backup          dump PostgreSQL horodaté
    arborisis --help          toutes les commandes

EOF

if [ "$SITE_ADDRESS" != ":80" ]; then
  hint "Le certificat TLS est émis au premier accès : la toute première requête peut prendre quelques secondes."
fi
