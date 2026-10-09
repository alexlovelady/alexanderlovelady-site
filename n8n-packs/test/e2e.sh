#!/usr/bin/env bash
# End-to-end test against a real n8n: imports all 9 workflows, publishes the 3 webhook workflows, starts n8n,
# and checks the dry-run and validation responses. Needs NO Google/Gmail credentials.
# Requirements: Node >= 24 on PATH for n8n 2.42.5, and `npm install n8n@2.42.5` done in N8N_DIR
# (if isolated-vm fails to load: `npm rebuild isolated-vm` with Node 24).
# Usage: N8N_DIR=/path/to/folder-with-node_modules ./test/e2e.sh
set -uo pipefail
N8N_DIR="${N8N_DIR:?set N8N_DIR to the folder where n8n was installed}"
HERE="$(cd "$(dirname "$0")/.." && pwd)"
export N8N_USER_FOLDER="$(mktemp -d)" N8N_DIAGNOSTICS_ENABLED=false N8N_VERSION_NOTIFICATIONS_ENABLED=false \
  N8N_PERSONALIZATION_ENABLED=false N8N_PORT=5699 N8N_LISTEN_ADDRESS=127.0.0.1 N8N_SECURE_COOKIE=false
N8N=(node "$N8N_DIR/node_modules/n8n/bin/n8n")
fail=0; ok() { echo "ok   $1"; }; bad() { echo "FAIL $1 :: $2"; fail=1; }

for f in "$HERE"/*/workflows/*.json; do "${N8N[@]}" import:workflow --input="$f" 2>&1 | grep -q "Successfully imported" || bad "import $(basename "$f")" "import failed"; done
ok "imported 9 workflows"
for name in "Agency 1 - Deal Won" "Cleaning 1 - New Lead" "Cleaning 3 - Booking"; do
  id=$("${N8N[@]}" list:workflow 2>/dev/null | grep "|$name" | cut -d'|' -f1); "${N8N[@]}" publish:workflow --id="$id" >/dev/null 2>&1
done
"${N8N[@]}" start > "$N8N_USER_FOLDER/server.log" 2>&1 & SERVER=$!
trap 'kill $SERVER 2>/dev/null' EXIT
for _ in $(seq 1 90); do grep -q "Finished building" "$N8N_USER_FOLDER/server.log" 2>/dev/null && break; sleep 2; done; sleep 4

B=http://127.0.0.1:5699/webhook
check() { # name url file expected_code expected_substring
  out=$(curl -s -w '\n%{http_code}' -X POST "$2" -H 'Content-Type: application/json' -d "$3"); code=${out##*$'\n'}; body=${out%$'\n'*}
  [[ "$code" == "$4" && "$body" == *"$5"* ]] && ok "$1" || bad "$1" "got $code $body"
}
check "agency valid deal (dry run)"   $B/agency-deal-won "$(cat "$HERE"/agency-client-onboarding/sample-data/deal-won.json)" 200 '"dry_run":true'
check "agency invalid deal -> 422"    $B/agency-deal-won '{"deal_id":"x","client_name":"A","contact_email":"nope"}' 422 'missing contact_name'
check "cleaning lead (dry run)"       $B/cleaning-new-lead "$(cat "$HERE"/cleaning-lead-to-booking/sample-data/new-lead.json)" 200 '"est_low":230'
check "cleaning bad lead -> 422"      $B/cleaning-new-lead '{"name":"","email":"x"}' 422 'missing name'
check "cleaning booking (dry run)"    $B/cleaning-booking "$(cat "$HERE"/cleaning-lead-to-booking/sample-data/booking.json)" 200 '"end_iso":"2026-10-20T12:30:00"'
check "cleaning bad booking -> 422"   $B/cleaning-booking '{"lead_id":"x"}' 422 'date must be YYYY-MM-DD'
[[ $fail == 0 ]] && echo "ALL E2E CHECKS PASSED" || { echo "E2E FAILURES"; exit 1; }
