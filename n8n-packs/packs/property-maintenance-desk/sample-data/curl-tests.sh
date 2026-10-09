#!/usr/bin/env bash
# Usage: ./curl-tests.sh https://YOUR-N8N/webhook   (use /webhook-test while building)
BASE="${1:?pass the base webhook URL}"
cd "$(dirname "$0")"
echo "--- maintenance-request"; curl -s -X POST "$BASE/maintenance-request" -H 'Content-Type: application/json' -d @1-maintenance-request-intake-payload.json; echo
echo "--- maintenance-request with empty body (expect 422)"; curl -s -w '\nHTTP %{http_code}\n' -X POST "$BASE/maintenance-request" -H 'Content-Type: application/json' -d '{}'
echo "--- maintenance-update"; curl -s -X POST "$BASE/maintenance-update" -H 'Content-Type: application/json' -d @2-update-request-payload.json; echo
echo "--- maintenance-update with empty body (expect 422)"; curl -s -w '\nHTTP %{http_code}\n' -X POST "$BASE/maintenance-update" -H 'Content-Type: application/json' -d '{}'
