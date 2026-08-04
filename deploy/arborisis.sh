#!/usr/bin/env bash
#
# Arborisis — CLI d'exploitation du serveur dédié.
# Installé par install.sh sous /usr/local/bin/arborisis.
#
set -Eeuo pipefail

SCRIPT_PATH="$(readlink -f "${BASH_SOURCE[0]}")"
DEPLOY_DIR="$(dirname "$SCRIPT_PATH")"
ROOT_DIR="$(dirname "$DEPLOY_DIR")"
COMPOSE_FILE="$DEPLOY_DIR/docker-compose.prod.yml"
ENV_FILE="$DEPLOY_DIR/.env"

if [ -t 1 ]; then
  C_RESET=$'\033[0m'; C_RED=$'\033[31m'; C_GREEN=$'\033[32m'
  C_YELLOW=$'\033[33m'; C_CYAN=$'\033[36m'
else
  C_RESET=''; C_RED=''; C_GREEN=''; C_YELLOW=''; C_CYAN=''
fi

log()  { printf '%s==>%s %s\n' "$C_CYAN" "$C_RESET" "$*"; }
ok()   { printf '%s  ✓%s %s\n' "$C_GREEN" "$C_RESET" "$*"; }
warn() { printf '%s  !%s %s\n' "$C_YELLOW" "$C_RESET" "$*" >&2; }
die()  { printf '%s  ✗%s %s\n' "$C_RED" "$C_RESET" "$*" >&2; exit 1; }

run_root() { if [ -n "$SUDO" ]; then $SUDO "$@"; else "$@"; fi; }
compose() { run_root docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" "$@"; }

env_value() { sed -n "s/^$1=//p" "$ENV_FILE" | tail -1; }

usage() {
  cat <<'EOF'
arborisis — exploitation du serveur dédié Arborisis

  up [service...]        Démarre (ou met à jour) la stack.
  down                   Arrête la stack. Les données sont conservées.
  restart [service...]   Redémarre les services.
  status                 État, santé et ports des conteneurs.
  logs [service] [-f]    Journaux (par défaut : les 200 dernières lignes).
  update [--branch b]    git pull + rebuild + migrations + redémarrage.
  build                  Reconstruit les images sans redémarrer.
  migrate                Rejoue migrations + seed (idempotent).
  backup                 Dump PostgreSQL horodaté dans BACKUP_DIR.
  restore <fichier>      Restaure un dump (DESTRUCTIF, demande confirmation).
  psql [args...]         Console PostgreSQL.
  redis-cli [args...]    Console Redis.
  shell <service>        Shell dans un conteneur applicatif.
  scale <service> <n>    Ajuste le nombre d'instances (ex. worker-gameplay 3).
  config                 Affiche la configuration effective (secrets masqués).
  doctor                 Diagnostic : santé, disque, connectivité, certificats.
  version                Révision Git déployée et versions d'images.

Fichiers :
  Stack   deploy/docker-compose.prod.yml
  Config  deploy/.env
EOF
}

cmd_status() {
  compose ps
  echo
  local url
  url="$(env_value PUBLIC_URL)"
  printf '  URL publique : %s\n' "${url:-non configurée}"
}

cmd_logs() {
  if [ $# -eq 0 ]; then
    compose logs --tail 200
  else
    compose logs --tail 200 "$@"
  fi
}

cmd_update() {
  local branch=""
  while [ $# -gt 0 ]; do
    case "$1" in
      --branch) branch="${2:-}"; shift 2 ;;
      *) die "Option inconnue pour update : $1" ;;
    esac
  done

  if [ -d "$ROOT_DIR/.git" ]; then
    branch="${branch:-$(run_root git -C "$ROOT_DIR" rev-parse --abbrev-ref HEAD)}"
    log "Sauvegarde préventive avant mise à jour"
    cmd_backup || warn "Sauvegarde impossible — mise à jour poursuivie."
    if [ "$branch" = "HEAD" ]; then
      # HEAD détachée : cas d'un rollback volontaire sur un commit précis.
      # On reconstruit les sources en place au lieu de repartir sur une branche.
      warn "HEAD détachée sur $(run_root git -C "$ROOT_DIR" rev-parse --short HEAD) : reconstruction sans git pull."
    else
      log "Récupération de la branche $branch"
      run_root git -C "$ROOT_DIR" fetch origin "$branch"
      run_root git -C "$ROOT_DIR" checkout -B "$branch" "origin/$branch"
    fi
  else
    warn "Pas de dépôt Git ici : reconstruction des images sur les sources locales."
  fi

  log "Reconstruction des images"
  compose build --pull
  log "Redéploiement (migrations appliquées automatiquement)"
  compose up -d --remove-orphans
  ok "Mise à jour terminée — vérifier : arborisis status"
}

cmd_backup() { "$DEPLOY_DIR/scripts/backup.sh" "$@"; }
cmd_restore() { "$DEPLOY_DIR/scripts/restore.sh" "$@"; }

# Sans argument on ouvre une console interactive (TTY) ; avec arguments la commande
# est scriptée, donc `-T` : `docker compose exec` refuse d'allouer un TTY hors terminal.
cmd_psql() {
  local tty=()
  [ $# -eq 0 ] || tty=(-T)
  compose exec "${tty[@]}" -e PGPASSWORD="$(env_value POSTGRES_PASSWORD)" postgres \
    psql -U "$(env_value POSTGRES_USER)" -d "$(env_value POSTGRES_DB)" "$@"
}

cmd_redis() {
  local tty=()
  [ $# -eq 0 ] || tty=(-T)
  compose exec "${tty[@]}" redis redis-cli -a "$(env_value REDIS_PASSWORD)" --no-auth-warning "$@"
}

cmd_config() {
  # Masque toute valeur ressemblant à un secret avant affichage.
  sed -E 's/^(.*(PASSWORD|SECRET|KEY|PASS|TOKEN))=.+$/\1=********/' "$ENV_FILE"
}

cmd_doctor() {
  log "Santé des conteneurs"
  compose ps --all
  echo

  log "Points de contrôle applicatifs"
  local api_cid web_cid
  api_cid="$(compose ps -q api 2>/dev/null | head -1 || true)"
  web_cid="$(compose ps -q web 2>/dev/null | head -1 || true)"
  for entry in "api:$api_cid" "web:$web_cid"; do
    local name="${entry%%:*}" cid="${entry#*:}"
    if [ -z "$cid" ]; then
      warn "$name : conteneur absent"
      continue
    fi
    local state
    state="$(run_root docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$cid")"
    case "$state" in
      healthy|running) ok "$name : $state" ;;
      *) warn "$name : $state" ;;
    esac
  done

  echo
  log "Base de données et files"
  if cmd_psql -tAc 'select 1' >/dev/null 2>&1; then
    ok "PostgreSQL accessible ($(cmd_psql -tAc 'select count(*) from users' 2>/dev/null | tr -d '[:space:]' || echo '?') comptes)"
  else
    warn "PostgreSQL inaccessible"
  fi
  if cmd_redis ping 2>/dev/null | grep -q PONG; then
    ok "Redis accessible"
  else
    warn "Redis inaccessible"
  fi

  echo
  log "Accès public"
  local url
  url="$(env_value PUBLIC_URL)"
  if [ -n "$url" ] && command -v curl >/dev/null 2>&1; then
    local code
    code="$(curl -fsS -o /dev/null -w '%{http_code}' --max-time 10 "$url/api/health" 2>/dev/null || echo 000)"
    if [ "$code" = "200" ]; then
      ok "$url/api/health répond 200"
    else
      warn "$url/api/health répond $code (DNS, pare-feu ou certificat ?)"
    fi
  fi

  echo
  log "Ressources"
  df -h "$ROOT_DIR" | tail -1 | awk '{printf "  disque : %s utilisés sur %s (%s)\n", $3, $2, $5}'
  run_root docker system df 2>/dev/null | sed 's/^/  /' || true
}

cmd_version() {
  if [ -d "$ROOT_DIR/.git" ]; then
    printf 'Révision : %s (%s)\n' \
      "$(run_root git -C "$ROOT_DIR" rev-parse --short HEAD)" \
      "$(run_root git -C "$ROOT_DIR" rev-parse --abbrev-ref HEAD)"
    printf 'Commit   : %s\n' "$(run_root git -C "$ROOT_DIR" log -1 --pretty='%s (%cs)')"
  fi
  compose images 2>/dev/null || true
}

COMMAND="${1:-}"
[ $# -gt 0 ] && shift || true

# L'aide doit rester consultable avant toute installation.
case "$COMMAND" in
  ''|-h|--help|help) usage; exit 0 ;;
esac

[ -f "$COMPOSE_FILE" ] || die "Stack introuvable : $COMPOSE_FILE"
[ -f "$ENV_FILE" ] || die "Configuration introuvable : $ENV_FILE (lancer ./install.sh)"

SUDO=""
if [ "$(id -u)" -ne 0 ] && ! docker info >/dev/null 2>&1; then
  command -v sudo >/dev/null 2>&1 || die "Accès Docker refusé et sudo indisponible."
  SUDO="sudo"
fi

case "$COMMAND" in
  up) compose up -d --remove-orphans "$@" ;;
  down) compose down "$@" ;;
  restart) compose restart "$@" ;;
  status|ps) cmd_status ;;
  logs) cmd_logs "$@" ;;
  update) cmd_update "$@" ;;
  build) compose build --pull "$@" ;;
  migrate) compose run --rm migrate ;;
  backup) cmd_backup "$@" ;;
  restore) cmd_restore "$@" ;;
  psql) cmd_psql "$@" ;;
  redis-cli) cmd_redis "$@" ;;
  shell) [ $# -ge 1 ] || die "Usage : arborisis shell <service>"; compose exec "$1" sh ;;
  scale) [ $# -eq 2 ] || die "Usage : arborisis scale <service> <n>"; compose up -d --scale "$1=$2" "$1" ;;
  config) cmd_config ;;
  doctor) cmd_doctor ;;
  version) cmd_version ;;
  *) usage >&2; die "Commande inconnue : $COMMAND" ;;
esac
