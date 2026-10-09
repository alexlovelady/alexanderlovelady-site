#!/usr/bin/env bash
# Usage: ./curl-tests.sh https://YOUR-N8N/webhook   (use /webhook-test while building)
BASE="${1:?pass the base webhook URL}"
cd "$(dirname "$0")"
echo "--- content-submit"; curl -s -X POST "$BASE/content-submit" -H 'Content-Type: application/json' -d @1-submit-content-for-drafting-payload.json; echo
echo "--- content-submit with empty body (expect 422)"; curl -s -w '\nHTTP %{http_code}\n' -X POST "$BASE/content-submit" -H 'Content-Type: application/json' -d '{}'
echo "--- content-approve"; curl -s -X POST "$BASE/content-approve" -H 'Content-Type: application/json' -d @2-approve-or-reject-draft-payload.json; echo
echo "--- content-approve with empty body (expect 422)"; curl -s -w '\nHTTP %{http_code}\n' -X POST "$BASE/content-approve" -H 'Content-Type: application/json' -d '{}'
