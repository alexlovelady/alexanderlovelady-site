#!/usr/bin/env bash
# Usage: ./curl-tests.sh https://YOUR-N8N/webhook   (use /webhook-test while building)
BASE="${1:?pass the base webhook URL}"
cd "$(dirname "$0")"
echo "--- realestate-lead"; curl -s -X POST "$BASE/realestate-lead" -H 'Content-Type: application/json' -d @1-lead-intake-and-instant-reply-payload.json; echo
echo "--- realestate-lead with empty body (expect 422)"; curl -s -w '\nHTTP %{http_code}\n' -X POST "$BASE/realestate-lead" -H 'Content-Type: application/json' -d '{}'
echo "--- realestate-viewing"; curl -s -X POST "$BASE/realestate-viewing" -H 'Content-Type: application/json' -d @3-viewing-scheduled-payload.json; echo
echo "--- realestate-viewing with empty body (expect 422)"; curl -s -w '\nHTTP %{http_code}\n' -X POST "$BASE/realestate-viewing" -H 'Content-Type: application/json' -d '{}'
