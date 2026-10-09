#!/usr/bin/env bash
# Usage: ./curl-tests.sh https://YOUR-N8N/webhook   (use /webhook-test while building)
BASE="${1:?pass the base webhook URL}"
cd "$(dirname "$0")"
echo "--- invoice-new"; curl -s -X POST "$BASE/invoice-new" -H 'Content-Type: application/json' -d @1-log-new-invoice-payload.json; echo
echo "--- invoice-new with empty body (expect 422)"; curl -s -w '\nHTTP %{http_code}\n' -X POST "$BASE/invoice-new" -H 'Content-Type: application/json' -d '{}'
echo "--- invoice-paid"; curl -s -X POST "$BASE/invoice-paid" -H 'Content-Type: application/json' -d @3-mark-invoice-paid-payload.json; echo
echo "--- invoice-paid with empty body (expect 422)"; curl -s -w '\nHTTP %{http_code}\n' -X POST "$BASE/invoice-paid" -H 'Content-Type: application/json' -d '{}'
