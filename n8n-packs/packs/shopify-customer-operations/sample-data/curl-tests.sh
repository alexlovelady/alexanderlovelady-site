#!/usr/bin/env bash
# Usage: ./curl-tests.sh https://YOUR-N8N/webhook   (use /webhook-test while building)
BASE="${1:?pass the base webhook URL}"
cd "$(dirname "$0")"
echo "--- shopify-return"; curl -s -X POST "$BASE/shopify-return" -H 'Content-Type: application/json' -d @3-return-request-intake-payload.json; echo
echo "--- shopify-return with empty body (expect 422)"; curl -s -w '\nHTTP %{http_code}\n' -X POST "$BASE/shopify-return" -H 'Content-Type: application/json' -d '{}'
