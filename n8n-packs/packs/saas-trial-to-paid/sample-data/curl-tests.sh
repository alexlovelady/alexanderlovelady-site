#!/usr/bin/env bash
# Usage: ./curl-tests.sh https://YOUR-N8N/webhook   (use /webhook-test while building)
BASE="${1:?pass the base webhook URL}"
cd "$(dirname "$0")"
echo "--- saas-signup"; curl -s -X POST "$BASE/saas-signup" -H 'Content-Type: application/json' -d @1-new-trial-signup-payload.json; echo
echo "--- saas-signup with empty body (expect 422)"; curl -s -w '\nHTTP %{http_code}\n' -X POST "$BASE/saas-signup" -H 'Content-Type: application/json' -d '{}'
echo "--- saas-converted"; curl -s -X POST "$BASE/saas-converted" -H 'Content-Type: application/json' -d @4-converted-to-paid-payload.json; echo
echo "--- saas-converted with empty body (expect 422)"; curl -s -w '\nHTTP %{http_code}\n' -X POST "$BASE/saas-converted" -H 'Content-Type: application/json' -d '{}'
echo "--- saas-cancelled"; curl -s -X POST "$BASE/saas-cancelled" -H 'Content-Type: application/json' -d @5-cancelled-or-churned-payload.json; echo
echo "--- saas-cancelled with empty body (expect 422)"; curl -s -w '\nHTTP %{http_code}\n' -X POST "$BASE/saas-cancelled" -H 'Content-Type: application/json' -d '{}'
echo "--- saas-activated"; curl -s -X POST "$BASE/saas-activated" -H 'Content-Type: application/json' -d @6-mark-user-activated-payload.json; echo
echo "--- saas-activated with empty body (expect 422)"; curl -s -w '\nHTTP %{http_code}\n' -X POST "$BASE/saas-activated" -H 'Content-Type: application/json' -d '{}'
