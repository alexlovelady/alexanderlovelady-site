#!/usr/bin/env bash
# Usage: ./curl-tests.sh https://YOUR-N8N/webhook   (use /webhook-test while building)
BASE="${1:?pass the base webhook URL}"
cd "$(dirname "$0")"
echo "--- etsy-order"; curl -s -X POST "$BASE/etsy-order" -H 'Content-Type: application/json' -d @1-log-an-order-payload.json; echo
echo "--- etsy-order with empty body (expect 422)"; curl -s -w '\nHTTP %{http_code}\n' -X POST "$BASE/etsy-order" -H 'Content-Type: application/json' -d '{}'
echo "--- etsy-shipped"; curl -s -X POST "$BASE/etsy-shipped" -H 'Content-Type: application/json' -d @2-mark-order-shipped-payload.json; echo
echo "--- etsy-shipped with empty body (expect 422)"; curl -s -w '\nHTTP %{http_code}\n' -X POST "$BASE/etsy-shipped" -H 'Content-Type: application/json' -d '{}'
echo "--- etsy-expense"; curl -s -X POST "$BASE/etsy-expense" -H 'Content-Type: application/json' -d @4-log-an-expense-payload.json; echo
echo "--- etsy-expense with empty body (expect 422)"; curl -s -w '\nHTTP %{http_code}\n' -X POST "$BASE/etsy-expense" -H 'Content-Type: application/json' -d '{}'
