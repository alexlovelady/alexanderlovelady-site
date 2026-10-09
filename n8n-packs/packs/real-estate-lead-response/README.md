# Real Estate Lead Response for n8n

Answer every lead in seconds and keep nurturing the ones who aren't ready yet.

**For:** Independent real estate agents and small teams. **Built and tested with n8n 2.42.5.** Needs Gmail and Google Sheets credentials.

## What's inside

| # | Workflow file | What it does | Lite |
|---|---|---|---|
| 1 | `workflows/1-lead-intake-and-instant-reply.json` | Webhook `realestate-lead`: validates the request, ignores same-day duplicates, logs it to the **Leads** tab, tags/routes it with the rules in the Config, emails the sender an acknowledgement, alerts you. | yes |
| 2 | `workflows/2-lead-nurture-sequence.json` | Runs daily at 10:00 over **Leads**: sends at most one email per row per run, steps at (day +1; day +3; day +7; day +14; day +30) relative to `created_at`. Never repeats a step. Only rows with status new/contacted/nurture. | yes |
| 3 | `workflows/3-viewing-scheduled.json` | Webhook `realestate-viewing`: updates one row in **Leads** (sets status=`viewing`), emails the customer. |  |
| 4 | `workflows/4-leads-waiting-for-first-contact.json` | Runs daily at 16:00: emails a list of leads that need attention. |  |
| 5 | `workflows/5-weekly-lead-report.json` | Runs Mondays at 08:00: emails a metrics summary (last 7 days vs the period before). |  |
| 6 | `workflows/6-error-alert.json` | Emails you when any workflow fails (set it as the Error Workflow). | yes |

**Lite** = the workflows marked yes ($29 test price). **Pro** = all 6 ($49 test price).

## Setup (about 30 minutes)

1. **Make the sheet.** Create one Google Sheet with these tabs, named exactly: `Leads`. Paste each header row from `sheets/<Tab>.csv` into row 1 of its tab. Copy the sheet ID from the URL.
2. **Import** every workflow JSON into n8n (Workflows > Import from file) and select your credentials on each Gmail / Google Sheets node. Nodes that need other credentials have a sticky note saying so.
3. **Edit the `Config` node** in each workflow. The top part (business name, your email, links, sheet ID, timezone, and any pack settings) must be the same in every workflow. The `flow` section is that workflow's own settings and message wording; edit the wording freely.
4. **Dry run first.** `dry_run` ships as `true`: webhooks validate and return a preview, and nothing is sent or written. Test with `sample-data/curl-tests.sh`, then set `dry_run` to `false` in every workflow.
5. **Activate** the workflows. Set the Error Alert workflow as the *Error Workflow* in the settings of the others.

## Webhooks

Each webhook is `POST https://YOUR-N8N/webhook/<path>` with a JSON body. Optional: set `webhook_secret` in Config and send the same value in an `x-webhook-secret` header. Responses: `200` accepted (or duplicate), `422` invalid input with a list of errors, `401` wrong secret.

### `realestate-lead`: Lead Intake And Instant Reply

| Field | Required | Type / values | Example |
|---|---|---|---|
| `name` | yes | text | Taylor Brooks |
| `email` | yes | email | taylor@example.test |
| `phone` | no | phone | 555-0188 |
| `interest` | yes | one of: Buying, Selling, Renting, Buying and selling | Buying |
| `area` | no | text | Elizabeth City |
| `price_range` | no | text | $250k-$350k |
| `timeline` | no | one of: Now, 1-3 months, 3-6 months, 6+ months, Just browsing | 1-3 months |
| `source` | no | one of: Website, Zillow, Realtor.com, Open house, Referral, Other | Website |
| `message` | no | text | Looking for a 3 bedroom near the water. |

### `realestate-viewing`: Viewing Scheduled

| Field | Required | Type / values | Example |
|---|---|---|---|
| `lead_id` | yes | text | REabc123 |
| `email` | yes | email | taylor@example.test |
| `name` | no | text | Taylor Brooks |
| `property_address` | yes | text | 12 Harbor Rd |
| `viewing_date` | yes | date | 2026-10-20 |
| `viewing_time` | yes | time | 14:00 |

## Google Sheet tabs

- **Leads**: `lead_id, created_at, name, email, phone, interest, area, price_range, timeline, source, message, status, priority, opted_out, n1_sent, n2_sent, n3_sent, n4_sent, n5_sent, updated_at, viewing_address, viewing_date, viewing_time`

Column names must match exactly. Columns that only some workflows use are blank until those workflows run.

## Settings in Config

`agent_name`, `brokerage`, `business_name`, `business_phone`, `calendar_link`, `dry_run`, `optout_footer`, `owner_email`, `sheet_id`, `timezone`, `webhook_secret`

## Notes: read before going live

- Messages are neutral and informational. You are responsible for compliance with fair housing, CAN-SPAM, TCPA and your brokerage's rules. Review every template before using it.
- Email only. No SMS (SMS needs separate consent and carrier registration).
- Your Leads sheet is the CRM. Export it to your real CRM, or POST new leads to its API from the intake webhook.
- When someone replies STOP, set `opted_out` to `yes`; nurture emails then stop.
- Email only. No SMS is included (SMS needs separate consent and carrier registration).
- Any message that is marketing rather than transactional carries an opt-out line. When someone replies STOP, set `opted_out` to `yes` in their row (this pack does not read your inbox).
- Text from forms is HTML-escaped before it goes into an email, and line breaks are stripped from subject lines.

## Limits

- Lead sources must be able to POST JSON (Zapier/Make bridge works for portals that only email you).
- The Google Sheets steps (`appendOrUpdate` / `update`) and Gmail steps follow n8n's current node schemas but were not run against live Google accounts in the build environment. Test with your own sheet in dry-run-off mode on one test row first, and re-select a field if n8n asks you to after import.
- Daily schedules run once a day in your n8n's timezone setting; dates are `YYYY-MM-DD`.

## Tests

Run `./sample-data/curl-tests.sh https://YOUR-N8N/webhook` (use `/webhook-test` while building). Logic is covered by automated tests in the source repo (`node --test test/`).

Support: this is a template, not a managed service. Installation help is a separate paid service.
