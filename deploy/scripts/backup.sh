#!/usr/bin/env bash
#
# Sauvegarde PostgreSQL du serveur dédié Arborisis.
# Appelé par `arborisis backup` et par le timer systemd arborisis-backup.timer.
#
set -Eeuo pipefail

SCRIPT_PATH="$(readlink -f "${BASH_SOURCE[0]}")"
DEPLOY_DIR="$(dirname "$(dirname "$SCRIPT_PATH")")"
ROOT_DIR="$(dirname "$DEPLOY_DIR")"
COMPOSE_FILE="$DEPLOY_DIR/docker-compose.prod.yml"
ENV_FILE="$DEPLOY_DIR/.env"

[ -f "$ENV_FILE" ] || { echo "Configuration introuvable : $ENV_FILE" >&2; exit 1; }

env_value() { sed -n "s/^$1=//p" "$ENV_FILE" | tail -1; }

SUDO=""
if [ "$(id -u)" -ne 0 ] && ! docker info >/dev/null 2>&1; then
  SUDO="sudo"
fi
run_root() { if [ -n "$SUDO" ]; then $SUDO "$@"; else "$@"; fi; }
compose() { run_root docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" "$@"; }

PG_USER="$(env_value POSTGRES_USER)"; PG_USER="${PG_USER:-arborisis}"
PG_DB="$(env_value POSTGRES_DB)"; PG_DB="${PG_DB:-arborisis}"
PG_PASS="$(env_value POSTGRES_PASSWORD)"

BACKUP_DIR="$(env_value BACKUP_DIR)"; BACKUP_DIR="${BACKUP_DIR:-./backups}"
case "$BACKUP_DIR" in /*) ;; *) BACKUP_DIR="$ROOT_DIR/${BACKUP_DIR#./}" ;; esac

RETENTION_DAYS="$(env_value BACKUP_RETENTION_DAYS)"; RETENTION_DAYS="${RETENTION_DAYS:-14}"

# Les dumps sont écrits par redirection shell, pas par Docker : c'est l'utilisateur
# courant qui doit pouvoir écrire dans BACKUP_DIR (root sous systemd).
if ! mkdir -p "$BACKUP_DIR" 2>/dev/null || [ ! -w "$BACKUP_DIR" ]; then
  if [ "$(id -u)" -ne 0 ] && command -v sudo >/dev/null 2>&1; then
    exec sudo -- "$SCRIPT_PATH" "$@"
  fi
  echo "Écriture impossible dans $BACKUP_DIR (droits insuffisants)." >&2
  exit 1
fi
chmod 700 "$BACKUP_DIR"

STAMP="$(date -u '+%Y%m%d-%H%M%S')"
TARGET="$BACKUP_DIR/arborisis-$STAMP.dump"

echo "==> Sauvegarde de $PG_DB vers $TARGET"

# Format custom (-Fc) : compressé et restaurable sélectivement via pg_restore.
# On écrit dans un fichier temporaire pour ne jamais laisser un dump tronqué.
if ! compose exec -T -e PGPASSWORD="$PG_PASS" postgres \
  pg_dump -U "$PG_USER" -d "$PG_DB" -Fc --no-owner --no-acl >"$TARGET.part"; then
  rm -f "$TARGET.part"
  echo "  ✗ Échec de pg_dump — aucune sauvegarde écrite." >&2
  exit 1
fi

mv "$TARGET.part" "$TARGET"
chmod 600 "$TARGET"

SIZE="$(du -h "$TARGET" | cut -f1)"
echo "  ✓ Sauvegarde terminée ($SIZE)"

if [ "$RETENTION_DAYS" -gt 0 ]; then
  DELETED="$(find "$BACKUP_DIR" -maxdepth 1 -name 'arborisis-*.dump' -type f -mtime "+$RETENTION_DAYS" -print -delete | wc -l)"
  [ "$DELETED" -gt 0 ] && echo "  ✓ $DELETED sauvegarde(s) de plus de $RETENTION_DAYS jours supprimée(s)"
fi

echo "  Rappel : copier $BACKUP_DIR hors de cette machine (un disque perdu = tout perdu)."
