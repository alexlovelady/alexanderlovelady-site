#!/usr/bin/env bash
# Usage: ./curl-tests.sh https://YOUR-N8N/webhook   (use /webhook-test while building)
BASE="${1:?pass the base webhook URL}"
cd "$(dirname "$0")"
echo "--- contractor-request"; curl -s -X POST "$BASE/contractor-request" -H 'Content-Type: application/json' -d @1-estimate-request-intake-payload.json; echo
echo "--- contractor-request with empty body (expect 422)"; curl -s -w '\nHTTP %{http_code}\n' -X POST "$BASE/contractor-request" -H 'Content-Type: application/json' -d '{}'
echo "--- contractor-accepted"; curl -s -X POST "$BASE/contractor-accepted" -H 'Content-Type: application/json' -d @3-quote-accepted-payload.json; echo
echo "--- contractor-accepted with empty body (expect 422)"; curl -s -w '\nHTTP %{http_code}\n' -X POST "$BASE/contractor-accepted" -H 'Content-Type: application/json' -d '{}'
