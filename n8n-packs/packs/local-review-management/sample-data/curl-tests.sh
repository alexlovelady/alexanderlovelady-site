#!/usr/bin/env bash
# Usage: ./curl-tests.sh https://YOUR-N8N/webhook   (use /webhook-test while building)
BASE="${1:?pass the base webhook URL}"
cd "$(dirname "$0")"
echo "--- review-customer"; curl -s -X POST "$BASE/review-customer" -H 'Content-Type: application/json' -d @1-log-a-completed-job-payload.json; echo
echo "--- review-customer with empty body (expect 422)"; curl -s -w '\nHTTP %{http_code}\n' -X POST "$BASE/review-customer" -H 'Content-Type: application/json' -d '{}'
echo "--- review-feedback"; curl -s -X POST "$BASE/review-feedback" -H 'Content-Type: application/json' -d @3-private-feedback-form-payload.json; echo
echo "--- review-feedback with empty body (expect 422)"; curl -s -w '\nHTTP %{http_code}\n' -X POST "$BASE/review-feedback" -H 'Content-Type: application/json' -d '{}'
