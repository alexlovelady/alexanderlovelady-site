#!/usr/bin/env bash
# Usage: ./curl-tests.sh https://YOUR-N8N/webhook-test   (use /webhook once activated)
BASE="${1:?pass the base webhook URL}"
echo "--- new lead"; curl -s -X POST "$BASE/cleaning-new-lead" -H 'Content-Type: application/json' -d @new-lead.json; echo
echo "--- bad lead (expect 422)"; curl -s -w '\nHTTP %{http_code}\n' -X POST "$BASE/cleaning-new-lead" -H 'Content-Type: application/json' -d '{"name":"","email":"x"}'
echo "--- booking"; curl -s -X POST "$BASE/cleaning-booking" -H 'Content-Type: application/json' -d @booking.json; echo
