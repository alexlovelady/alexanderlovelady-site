#!/usr/bin/env bash
# Usage: ./curl-tests.sh https://YOUR-N8N/webhook   (use /webhook-test while building)
BASE="${1:?pass the base webhook URL}"
cd "$(dirname "$0")"
echo "--- recruiting-apply"; curl -s -X POST "$BASE/recruiting-apply" -H 'Content-Type: application/json' -d @1-application-intake-payload.json; echo
echo "--- recruiting-apply with empty body (expect 422)"; curl -s -w '\nHTTP %{http_code}\n' -X POST "$BASE/recruiting-apply" -H 'Content-Type: application/json' -d '{}'
echo "--- recruiting-status"; curl -s -X POST "$BASE/recruiting-status" -H 'Content-Type: application/json' -d @2-update-applicant-status-payload.json; echo
echo "--- recruiting-status with empty body (expect 422)"; curl -s -w '\nHTTP %{http_code}\n' -X POST "$BASE/recruiting-status" -H 'Content-Type: application/json' -d '{}'
