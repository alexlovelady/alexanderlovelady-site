#!/usr/bin/env bash
# End-to-end test against a real n8n: imports every workflow, activates the webhook ones, starts n8n, and posts a valid and an
# empty payload to each webhook (dry-run mode). Needs NO Google/Stripe/Shopify credentials.
# Requirements: Node >= 24 on PATH for n8n 2.42.5, and `npm install n8n@2.42.5` done in N8N_DIR
# (if isolated-vm fails to load: `npm rebuild isolated-vm` with Node 24). Run `python3 build_packs.py` first.
# Usage: N8N_DIR=/path/to/folder-with-node_modules ./test/e2e.sh
set -uo pipefail
N8N_DIR="${N8N_DIR:?set N8N_DIR to the folder where n8n was installed}"
HERE="$(cd "$(dirname "$0")" && pwd)"
export N8N_USER_FOLDER="$(mktemp -d)" N8N_DIAGNOSTICS_ENABLED=false N8N_VERSION_NOTIFICATIONS_ENABLED=false \
  N8N_PERSONALIZATION_ENABLED=false N8N_PORT=5699 N8N_LISTEN_ADDRESS=127.0.0.1 N8N_SECURE_COOKIE=false
N8N=(node "$N8N_DIR/node_modules/n8n/bin/n8n")
TMP="$(mktemp -d)"
node "$HERE/e2e.js" prepare "$TMP" || exit 1
"${N8N[@]}" import:workflow --separate --input="$TMP" 2>&1 | grep -E "Successfully|rror" | tail -3
# publish the webhook workflows (the CLI publishes one workflow per call)
"${N8N[@]}" list:workflow 2>/dev/null | grep -v '^\[' > "$TMP.list"
while IFS= read -r name || [ -n "$name" ]; do
  id=$(grep -F "|$name" "$TMP.list" | head -1 | cut -d'|' -f1)
  [ -n "$id" ] && "${N8N[@]}" publish:workflow --id="$id" >/dev/null 2>&1 || echo "could not publish: $name"
done < "$TMP-hooks.txt"
"${N8N[@]}" start > "$N8N_USER_FOLDER/server.log" 2>&1 & SERVER=$!
trap 'kill $SERVER 2>/dev/null' EXIT
for _ in $(seq 1 120); do grep -q "Finished building" "$N8N_USER_FOLDER/server.log" 2>/dev/null && break; sleep 2; done; sleep 6
node "$HERE/e2e.js" check http://127.0.0.1:5699/webhook
