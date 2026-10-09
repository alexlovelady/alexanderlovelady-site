# Website & Automation Incident Alerts for n8n

One calm alert per incident instead of a flood, plus client notices drafted for you.

**For:** Developers and agencies who run client sites and automations. **Built and tested with n8n 2.42.5.** Needs Gmail and Google Sheets credentials plus the credentials named in each workflow's sticky notes.

## What's inside

| # | Workflow file | What it does | Lite |
|---|---|---|---|
| 1 | `workflows/1-uptime-alert-webhook.json` | Webhook from your uptime monitor: one alert per incident, reminders, recovery notice. | yes |
| 2 | `workflows/2-automation-error-collector.json` | Error Trigger: turns n8n workflow failures into de-duplicated alerts. | yes |
| 3 | `workflows/3-weekly-incident-report.json` | Runs Mondays at 08:00: emails a metrics summary (last 7 days vs the period before). |  |
| 4 | `workflows/4-error-alert.json` | Emails you when any workflow fails (set it as the Error Workflow). | yes |

**Lite** = the workflows marked yes ($39 test price). **Pro** = all 4 ($69 test price).

## Setup (about 30 minutes)

1. **Make the sheet.** Create one Google Sheet with these tabs, named exactly: `Incidents`. Paste each header row from `sheets/<Tab>.csv` into row 1 of its tab. Copy the sheet ID from the URL.
2. **Import** every workflow JSON into n8n (Workflows > Import from file) and select your credentials on each Gmail / Google Sheets node. Nodes that need other credentials have a sticky note saying so.
3. **Edit the `Config` node** in each workflow. The top part (business name, your email, links, sheet ID, timezone, and any pack settings) must be the same in every workflow. The `flow` section is that workflow's own settings and message wording; edit the wording freely.
4. **Dry run first.** `dry_run` ships as `true`: webhooks validate and return a preview, and nothing is sent or written. Test with `sample-data/curl-tests.sh`, then set `dry_run` to `false` in every workflow.
5. **Activate** the workflows. Set the Error Alert workflow as the *Error Workflow* in the settings of the others.

## Webhooks

Each webhook is `POST https://YOUR-N8N/webhook/<path>` with a JSON body. Optional: set `webhook_secret` in Config and send the same value in an `x-webhook-secret` header. Responses: `200` accepted (or duplicate), `422` invalid input with a list of errors, `401` wrong secret.

### `incident-alert`: Uptime Alert Webhook

Body example:
```json
{
  "monitor": "Client A website",
  "status": "down",
  "url": "https://client-a.example.com",
  "message": "HTTP 503",
  "severity": "critical"
}
```

## Google Sheet tabs

- **Incidents**: `incident_id, monitor, client, url, severity, status, opened_at, message, closed_at, duration_min, alerts_sent`

Column names must match exactly. Columns that only some workflows use are blank until those workflows run.

## Settings in Config

`business_name`, `clients`, `default_severity`, `dry_run`, `oncall_email`, `optout_footer`, `owner_email`, `reminder_minutes`, `severity_rules`, `sheet_id`, `suppress_minutes`, `timezone`, `webhook_secret`

## Notes: read before going live

- The pack does not monitor anything itself. Point any uptime monitor that can send a webhook (UptimeRobot, Better Stack, Uptime Kuma, StatusCake, or your own script) at the `incident-alert` webhook. `status` may be down/up (common synonyms are mapped).
- Repeated 'down' alerts for the same monitor become ONE incident: you get an alert when it opens, a reminder every `reminder_minutes` while it stays down, and a message when it recovers (with downtime).
- The Automation Error Collector turns n8n failures into alerts. Set that workflow as the Error Workflow of the workflows you want to watch. Repeated errors from the same workflow within `suppress_minutes` are counted instead of emailed.
- Client notices are created as Gmail DRAFTS for you to review. Nothing is sent to clients automatically.
- State (open incidents) is kept in the workflow's static data and the Incidents sheet is the log. If you re-import or reset the workflow, open incidents are forgotten.
- Severity comes from the payload's `severity` or the `severity_rules` (keyword match on the monitor name); critical alerts also go to `oncall_email`.
- Email only. No SMS is included (SMS needs separate consent and carrier registration).
- Any message that is marketing rather than transactional carries an opt-out line. When someone replies STOP, set `opted_out` to `yes` in their row (this pack does not read your inbox).
- Text from forms is HTML-escaped before it goes into an email, and line breaks are stripped from subject lines.

## Limits

- Email only. For phone/SMS paging use a dedicated on-call service. This pack is not a replacement for one.
- Email delivery can fail or be delayed; do not rely on it as your only alerting for critical systems.
- The Google Sheets steps (`appendOrUpdate` / `update`) and Gmail steps follow n8n's current node schemas but were not run against live Google accounts in the build environment. Test with your own sheet in dry-run-off mode on one test row first, and re-select a field if n8n asks you to after import.
- Daily schedules run once a day in your n8n's timezone setting; dates are `YYYY-MM-DD`.

## Tests

Run `./sample-data/curl-tests.sh https://YOUR-N8N/webhook` (use `/webhook-test` while building). Logic is covered by automated tests in the source repo (`node --test test/`).

Support: this is a template, not a managed service. Installation help is a separate paid service.
