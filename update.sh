#!/usr/bin/env bash
# Pulls the latest code from GitHub and rebuilds/restarts the Docker container.
# Safe to run by hand or from cron; does nothing destructive to ./data.
set -euo pipefail
cd "$(dirname "$0")"

echo "== Kalle Kotiapuri-päivitys: $(date '+%Y-%m-%d %H:%M:%S') =="

if [ -n "$(git status --porcelain)" ]; then
  echo "Hakemistossa on tallentamattomia muutoksia — keskeytetään." >&2
  git status --short
  exit 1
fi

BEFORE=$(git rev-parse HEAD)
git pull --ff-only
AFTER=$(git rev-parse HEAD)

if [ "$BEFORE" = "$AFTER" ]; then
  echo "Ei uusia päivityksiä (versio ${AFTER:0:7})."
  exit 0
fi

echo "Päivitetään ${BEFORE:0:7} -> ${AFTER:0:7}, rakennetaan uudelleen..."
docker compose up -d --build

echo "Valmis. Käynnissä oleva versio: $(git rev-parse --short HEAD)"
docker compose ps
