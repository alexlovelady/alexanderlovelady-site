#!/usr/bin/env bash
# Usage: ./curl-tests.sh https://YOUR-N8N/webhook   (use /webhook-test while building)
BASE="${1:?pass the base webhook URL}"
cd "$(dirname "$0")"
echo "--- newsletter-approve"; curl -s -X POST "$BASE/newsletter-approve" -H 'Content-Type: application/json' -d @2-approve-or-reject-story-payload.json; echo
echo "--- newsletter-approve with empty body (expect 422)"; curl -s -w '\nHTTP %{http_code}\n' -X POST "$BASE/newsletter-approve" -H 'Content-Type: application/json' -d '{}'
