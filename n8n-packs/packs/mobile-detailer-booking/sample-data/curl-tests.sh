#!/usr/bin/env bash
# Usage: ./curl-tests.sh https://YOUR-N8N/webhook   (use /webhook-test while building)
BASE="${1:?pass the base webhook URL}"
cd "$(dirname "$0")"
echo "--- detailer-request"; curl -s -X POST "$BASE/detailer-request" -H 'Content-Type: application/json' -d @1-booking-request-intake-payload.json; echo
echo "--- detailer-request with empty body (expect 422)"; curl -s -w '\nHTTP %{http_code}\n' -X POST "$BASE/detailer-request" -H 'Content-Type: application/json' -d '{}'
echo "--- detailer-confirm"; curl -s -X POST "$BASE/detailer-confirm" -H 'Content-Type: application/json' -d @2-confirm-booking-payload.json; echo
echo "--- detailer-confirm with empty body (expect 422)"; curl -s -w '\nHTTP %{http_code}\n' -X POST "$BASE/detailer-confirm" -H 'Content-Type: application/json' -d '{}'
