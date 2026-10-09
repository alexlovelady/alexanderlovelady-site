#!/usr/bin/env bash
# Usage: ./curl-tests.sh https://YOUR-N8N/webhook   (use /webhook-test while building)
BASE="${1:?pass the base webhook URL}"
cd "$(dirname "$0")"
echo "--- support-ticket"; curl -s -X POST "$BASE/support-ticket" -H 'Content-Type: application/json' -d @1-ticket-intake-and-triage-payload.json; echo
echo "--- support-ticket with empty body (expect 422)"; curl -s -w '\nHTTP %{http_code}\n' -X POST "$BASE/support-ticket" -H 'Content-Type: application/json' -d '{}'
echo "--- support-update"; curl -s -X POST "$BASE/support-update" -H 'Content-Type: application/json' -d @2-update-ticket-payload.json; echo
echo "--- support-update with empty body (expect 422)"; curl -s -w '\nHTTP %{http_code}\n' -X POST "$BASE/support-update" -H 'Content-Type: application/json' -d '{}'
