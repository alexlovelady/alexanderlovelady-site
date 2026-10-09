#!/usr/bin/env bash
# Usage: ./curl-tests.sh https://YOUR-N8N/webhook   (use /webhook-test while building)
BASE="${1:?pass the base webhook URL}"
cd "$(dirname "$0")"
echo "--- incident-alert"; curl -s -X POST "$BASE/incident-alert" -H 'Content-Type: application/json' -d @1-uptime-alert-webhook-payload.json; echo
echo "--- incident-alert with empty body (expect 422)"; curl -s -w '\nHTTP %{http_code}\n' -X POST "$BASE/incident-alert" -H 'Content-Type: application/json' -d '{}'
