#!/usr/bin/env bash
# Usage: ./curl-tests.sh https://YOUR-N8N/webhook   (use /webhook-test while building)
BASE="${1:?pass the base webhook URL}"
cd "$(dirname "$0")"
echo "--- noshow-book"; curl -s -X POST "$BASE/noshow-book" -H 'Content-Type: application/json' -d @1-new-appointment-payload.json; echo
echo "--- noshow-book with empty body (expect 422)"; curl -s -w '\nHTTP %{http_code}\n' -X POST "$BASE/noshow-book" -H 'Content-Type: application/json' -d '{}'
echo "--- noshow-missed"; curl -s -X POST "$BASE/noshow-missed" -H 'Content-Type: application/json' -d @3-mark-no-show-payload.json; echo
echo "--- noshow-missed with empty body (expect 422)"; curl -s -w '\nHTTP %{http_code}\n' -X POST "$BASE/noshow-missed" -H 'Content-Type: application/json' -d '{}'
echo "--- noshow-attended"; curl -s -X POST "$BASE/noshow-attended" -H 'Content-Type: application/json' -d @4-mark-attended-payload.json; echo
echo "--- noshow-attended with empty body (expect 422)"; curl -s -w '\nHTTP %{http_code}\n' -X POST "$BASE/noshow-attended" -H 'Content-Type: application/json' -d '{}'
echo "--- noshow-reschedule"; curl -s -X POST "$BASE/noshow-reschedule" -H 'Content-Type: application/json' -d @5-reschedule-appointment-payload.json; echo
echo "--- noshow-reschedule with empty body (expect 422)"; curl -s -w '\nHTTP %{http_code}\n' -X POST "$BASE/noshow-reschedule" -H 'Content-Type: application/json' -d '{}'
