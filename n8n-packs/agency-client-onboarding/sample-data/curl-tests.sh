#!/usr/bin/env bash
# Usage: ./curl-tests.sh https://YOUR-N8N/webhook-test/agency-deal-won   (or /webhook/ once activated)
URL="${1:?pass the webhook URL}"
echo "--- valid deal"; curl -s -X POST "$URL" -H 'Content-Type: application/json' -d @deal-won.json; echo
echo "--- invalid deal (expect 422)"; curl -s -w '\nHTTP %{http_code}\n' -X POST "$URL" -H 'Content-Type: application/json' -d '{"deal_id":"x","client_name":"A","contact_email":"nope"}'
