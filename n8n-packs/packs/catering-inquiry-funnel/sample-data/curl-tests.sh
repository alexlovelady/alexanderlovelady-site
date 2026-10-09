#!/usr/bin/env bash
# Usage: ./curl-tests.sh https://YOUR-N8N/webhook   (use /webhook-test while building)
BASE="${1:?pass the base webhook URL}"
cd "$(dirname "$0")"
echo "--- catering-inquiry"; curl -s -X POST "$BASE/catering-inquiry" -H 'Content-Type: application/json' -d @1-event-inquiry-intake-payload.json; echo
echo "--- catering-inquiry with empty body (expect 422)"; curl -s -w '\nHTTP %{http_code}\n' -X POST "$BASE/catering-inquiry" -H 'Content-Type: application/json' -d '{}'
echo "--- catering-confirmed"; curl -s -X POST "$BASE/catering-confirmed" -H 'Content-Type: application/json' -d @3-event-confirmed-payload.json; echo
echo "--- catering-confirmed with empty body (expect 422)"; curl -s -w '\nHTTP %{http_code}\n' -X POST "$BASE/catering-confirmed" -H 'Content-Type: application/json' -d '{}'
