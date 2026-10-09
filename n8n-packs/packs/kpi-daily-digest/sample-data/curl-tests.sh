#!/usr/bin/env bash
# Usage: ./curl-tests.sh https://YOUR-N8N/webhook   (use /webhook-test while building)
BASE="${1:?pass the base webhook URL}"
cd "$(dirname "$0")"
echo "--- kpi-record"; curl -s -X POST "$BASE/kpi-record" -H 'Content-Type: application/json' -d @1-record-a-metric-payload.json; echo
echo "--- kpi-record with empty body (expect 422)"; curl -s -w '\nHTTP %{http_code}\n' -X POST "$BASE/kpi-record" -H 'Content-Type: application/json' -d '{}'
