# Small Business Daily KPI Digest for n8n

Your key numbers in your inbox every morning, with an alert when something moves sharply.

**For:** Owners who want their key numbers in one email without opening five dashboards. **Built and tested with n8n 2.42.5.** Needs Gmail and Google Sheets credentials.

## What's inside

| # | Workflow file | What it does | Lite |
|---|---|---|---|
| 1 | `workflows/1-record-a-metric.json` | Webhook `kpi-record`: validates the request, ignores same-day duplicates, logs it to the **Metrics** tab. | yes |
| 2 | `workflows/2-daily-kpi-digest.json` | Runs daily at 07:00: emails a metrics summary (last 1 days vs the period before). | yes |
| 3 | `workflows/3-anomaly-alert.json` | Runs daily at 07:00: emails a metrics summary (last 1 days vs the period before). | yes |
| 4 | `workflows/4-weekly-trend-report.json` | Runs Mondays at 08:00: emails a metrics summary (last 7 days vs the period before). |  |
| 5 | `workflows/5-error-alert.json` | Emails you when any workflow fails (set it as the Error Workflow). | yes |

**Lite** = the workflows marked yes ($39 test price). **Pro** = all 5 ($59 test price).

## Setup (about 30 minutes)

1. **Make the sheet.** Create one Google Sheet with these tabs, named exactly: `Metrics`. Paste each header row from `sheets/<Tab>.csv` into row 1 of its tab. Copy the sheet ID from the URL.
2. **Import** every workflow JSON into n8n (Workflows > Import from file) and select your credentials on each Gmail / Google Sheets node. Nodes that need other credentials have a sticky note saying so.
3. **Edit the `Config` node** in each workflow. The top part (business name, your email, links, sheet ID, timezone, and any pack settings) must be the same in every workflow. The `flow` section is that workflow's own settings and message wording; edit the wording freely.
4. **Dry run first.** `dry_run` ships as `true`: webhooks validate and return a preview, and nothing is sent or written. Test with `sample-data/curl-tests.sh`, then set `dry_run` to `false` in every workflow.
5. **Activate** the workflows. Set the Error Alert workflow as the *Error Workflow* in the settings of the others.

## Webhooks

Each webhook is `POST https://YOUR-N8N/webhook/<path>` with a JSON body. Optional: set `webhook_secret` in Config and send the same value in an `x-webhook-secret` header. Responses: `200` accepted (or duplicate), `422` invalid input with a list of errors, `401` wrong secret.

### `kpi-record`: Record A Metric

| Field | Required | Type / values | Example |
|---|---|---|---|
| `metric` | yes | one of: Revenue, New Leads, New Customers, Support Tickets, Website Visits | Revenue |
| `value` | yes | number | 1250.5 |
| `date` | no | date | 2026-10-11 |
| `note` | no | text | From Stripe daily total |

## Google Sheet tabs

- **Metrics**: `metric_id, created_at, metric, value, date, note`

Column names must match exactly. Columns that only some workflows use are blank until those workflows run.

## Settings in Config

`business_name`, `dry_run`, `optout_footer`, `owner_email`, `sheet_id`, `timezone`, `webhook_secret`

## Notes: read before going live

- The pack does not connect to Stripe, your CRM or analytics by itself. Anything that can send a webhook (n8n's own Stripe/HubSpot/GA nodes, Zapier, Make, a script) posts a value to `kpi-record`, or you paste rows into the Metrics sheet. The pack then summarizes.
- Metrics list: Revenue, New Leads, New Customers, Support Tickets, Website Visits. Edit the select options (`flow.fields`) in the record workflow and the `metrics` list in the digest workflows' Config to use your own.
- Multiple values for the same metric and day are summed (for example one entry per order).
- If no values were recorded for a day, the digest shows 0, which can trigger a 'drop' alert. That alert usually means the data feed broke.
- Email only. No SMS is included (SMS needs separate consent and carrier registration).
- Any message that is marketing rather than transactional carries an opt-out line. When someone replies STOP, set `opted_out` to `yes` in their row (this pack does not read your inbox).
- Text from forms is HTML-escaped before it goes into an email, and line breaks are stripped from subject lines.

## Limits

- Only sums per day are supported. Averages and ratios across metrics are limited.
- The Google Sheets steps (`appendOrUpdate` / `update`) and Gmail steps follow n8n's current node schemas but were not run against live Google accounts in the build environment. Test with your own sheet in dry-run-off mode on one test row first, and re-select a field if n8n asks you to after import.
- Daily schedules run once a day in your n8n's timezone setting; dates are `YYYY-MM-DD`.

## Tests

Run `./sample-data/curl-tests.sh https://YOUR-N8N/webhook` (use `/webhook-test` while building). Logic is covered by automated tests in the source repo (`node --test test/`).

Support: this is a template, not a managed service. Installation help is a separate paid service.
