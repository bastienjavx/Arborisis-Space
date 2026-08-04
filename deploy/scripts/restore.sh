#!/usr/bin/env bash
#
# Restauration d'une sauvegarde PostgreSQL du serveur dédié Arborisis.
#
# OPÉRATION DESTRUCTIVE : le contenu actuel de la base est écrasé.
# L'API et les workers sont arrêtés pendant la restauration pour éviter que des
# jobs BullMQ n'écrivent dans une base à moitié restaurée.
#
set -Eeuo pipefail

SCRIPT_PATH="$(readlink -f "${BASH_SOURCE[0]}")"
DEPLOY_DIR="$(dirname "$(dirname "$SCRIPT_PATH")")"
COMPOSE_FILE="$DEPLOY_DIR/docker-compose.prod.yml"
ENV_FILE="$DEPLOY_DIR/.env"

DUMP="${1:-}"
FORCE="${2:-}"

if [ -z "$DUMP" ]; then
  echo "Usage : arborisis restore <fichier.dump> [--yes]" >&2
  echo "Sauvegardes disponibles :" >&2
  ls -1t "$(dirname "$DEPLOY_DIR")"/backups/*.dump 2>/dev/null | head -10 >&2 || echo "  (aucune)" >&2
  exit 1
fi
[ -f "$DUMP" ] || { echo "Fichier introuvable : $DUMP" >&2; exit 1; }

# Les dumps sont en mode 600 : sans droits de lecture, on relance sous sudo.
if [ ! -r "$DUMP" ]; then
  if [ "$(id -u)" -ne 0 ] && command -v sudo >/dev/null 2>&1; then
    exec sudo -- "$SCRIPT_PATH" "$@"
  fi
  echo "Lecture impossible de $DUMP (droits insuffisants)." >&2
  exit 1
fi

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

if [ "$FORCE" != "--yes" ]; then
  echo "Cette opération REMPLACE toutes les données de la base « $PG_DB »."
  echo "Source : $DUMP"
  read -r -p "Taper RESTAURER pour confirmer : " answer </dev/tty || answer=""
  [ "$answer" = "RESTAURER" ] || { echo "Annulé."; exit 1; }
fi

echo "==> Arrêt de l'API et des workers"
compose stop api web worker-gameplay worker-maintenance worker-provisioning 2>/dev/null || true

echo "==> Restauration en cours"
# --clean --if-exists : les objets existants sont supprimés avant réimport.
# --single-transaction : la base reste cohérente si la restauration échoue.
if ! compose exec -T -e PGPASSWORD="$PG_PASS" postgres \
  pg_restore -U "$PG_USER" -d "$PG_DB" --clean --if-exists --no-owner --no-acl --single-transaction <"$DUMP"; then
  echo "  ✗ Échec de la restauration — la base est restée dans son état précédent." >&2
  echo "    Redémarrer les services : arborisis up" >&2
  exit 1
fi

echo "==> Redémarrage de la stack"
compose up -d --remove-orphans

echo "  ✓ Restauration terminée. Vérifier : arborisis doctor"
