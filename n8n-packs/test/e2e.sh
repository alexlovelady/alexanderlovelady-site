#!/usr/bin/env bash
# End-to-end smoke test against a real n8n (no external credentials needed: runs the dry-run paths).
# Usage: N8N_DIR=/path/with/node_modules/n8n ./test/e2e.sh
set -euo pipefail
N8N_DIR="${N8N_DIR:?set N8N_DIR to a folder where 'npm install n8n@2.42.5' was run}"
HERE="$(cd "$(dirname "$0")/.." && pwd)"
export N8N_USER_FOLDER="$(mktemp -d)" N8N_PORT=5699 N8N_DIAGNOSTICS_ENABLED=false N8N_PERSONALIZATION_ENABLED=false
N8N="$N8N_DIR/node_modules/.bin/n8n"
for f in "$HERE"/*/workflows/*.json; do "$N8N" import:workflow --input="$f" >/dev/null; done
echo "imported $(ls "$HERE"/*/workflows/*.json | wc -l) workflows"
"$N8N" list:workflow
