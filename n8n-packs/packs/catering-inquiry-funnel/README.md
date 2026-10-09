# Restaurant Catering Inquiry Funnel for n8n

Reply to every event inquiry the same day, decline impossible dates politely, and chase proposals and deposits automatically.

**For:** Caterers and restaurants that take event orders. **Built and tested with n8n 2.42.5.** Needs Gmail and Google Sheets credentials.

## What's inside

| # | Workflow file | What it does | Lite |
|---|---|---|---|
| 1 | `workflows/1-event-inquiry-intake.json` | Webhook `catering-inquiry`: validates the request, ignores same-day duplicates, logs it to the **Inquiries** tab, tags/routes it with the rules in the Config, emails the sender an acknowledgement, alerts you. | yes |
| 2 | `workflows/2-proposal-follow-ups.json` | Runs daily at 10:00 over **Inquiries**: sends at most one email per row per run, steps at (day +2; day +6) relative to `quote_sent_at`. Never repeats a step. Only rows with status quoted. | yes |
| 3 | `workflows/3-event-confirmed.json` | Webhook `catering-confirmed`: updates one row in **Inquiries** (sets status=`confirmed`), emails the customer, alerts you. |  |
| 4 | `workflows/4-deposit-reminders.json` | Runs daily at 10:00 over **Inquiries**: sends at most one email per row per run, steps at (day +2; day +5) relative to `confirmed_at`. Never repeats a step. Only rows with status confirmed. |  |
| 5 | `workflows/5-event-countdown.json` | Runs daily at 10:00 over **Inquiries**: sends at most one email per row per run, steps at (day -7; day -2) relative to `event_date`. Never repeats a step. Only rows with status confirmed. |  |
| 6 | `workflows/6-upcoming-event-prep-list.json` | Runs daily at 06:00: emails a list of inquiries that need attention. |  |
| 7 | `workflows/7-error-alert.json` | Emails you when any workflow fails (set it as the Error Workflow). | yes |

**Lite** = the workflows marked yes ($29 test price). **Pro** = all 7 ($49 test price).

## Setup (about 30 minutes)

1. **Make the sheet.** Create one Google Sheet with these tabs, named exactly: `Inquiries`. Paste each header row from `sheets/<Tab>.csv` into row 1 of its tab. Copy the sheet ID from the URL.
2. **Import** every workflow JSON into n8n (Workflows > Import from file) and select your credentials on each Gmail / Google Sheets node. Nodes that need other credentials have a sticky note saying so.
3. **Edit the `Config` node** in each workflow. The top part (business name, your email, links, sheet ID, timezone, and any pack settings) must be the same in every workflow. The `flow` section is that workflow's own settings and message wording; edit the wording freely.
4. **Dry run first.** `dry_run` ships as `true`: webhooks validate and return a preview, and nothing is sent or written. Test with `sample-data/curl-tests.sh`, then set `dry_run` to `false` in every workflow.
5. **Activate** the workflows. Set the Error Alert workflow as the *Error Workflow* in the settings of the others.

## Webhooks

Each webhook is `POST https://YOUR-N8N/webhook/<path>` with a JSON body. Optional: set `webhook_secret` in Config and send the same value in an `x-webhook-secret` header. Responses: `200` accepted (or duplicate), `422` invalid input with a list of errors, `401` wrong secret.

### `catering-inquiry`: Event Inquiry Intake

| Field | Required | Type / values | Example |
|---|---|---|---|
| `name` | yes | text | Sam Rivers |
| `email` | yes | email | sam@example.test |
| `phone` | no | phone | 555-0121 |
| `event_type` | yes | one of: Wedding, Corporate, Birthday, Memorial, Other | Corporate |
| `event_date` | yes | date | 2026-12-12 |
| `guests` | yes | number | 60 |
| `location` | no | text | Waterfront Hall |
| `budget` | no | text | $2,500 |
| `dietary` | no | text | 2 vegetarian, 1 nut allergy |

### `catering-confirmed`: Event Confirmed

| Field | Required | Type / values | Example |
|---|---|---|---|
| `inquiry_id` | yes | text | CTabc123 |
| `email` | yes | email | sam@example.test |
| `name` | no | text | Sam Rivers |
| `event_type` | no | text | Corporate |
| `event_date` | yes | date | 2026-12-12 |

## Google Sheet tabs

- **Inquiries**: `inquiry_id, created_at, name, email, phone, event_type, event_date, guests, location, budget, dietary, status, quote_sent_at, deposit_paid, opted_out, q1_sent, q2_sent, updated_at, confirmed_at, d1_sent, d2_sent, c7_sent, c2_sent`

Column names must match exactly. Columns that only some workflows use are blank until those workflows run.

## Settings in Config

`blackout_dates`, `business_name`, `business_phone`, `deposit_text`, `dry_run`, `kitchen_email`, `max_guests`, `min_lead_days`, `optout_footer`, `owner_email`, `sheet_id`, `timezone`, `webhook_secret`

## Notes: read before going live

- Blackout dates, maximum guests and minimum lead time are set in the Config (`blackout_dates`, `max_guests`, `min_lead_days`). Edit them.
- The pack checks only those three rules. It does not read your calendar for double-bookings; review `new` inquiries before quoting.
- Dietary and allergy information is copied from the customer. It does not replace your own allergen process.
- Deposit payment instructions are text in the Config. Payment is handled by your own invoicing/payment tool.
- Email only. No SMS is included (SMS needs separate consent and carrier registration).
- Any message that is marketing rather than transactional carries an opt-out line. When someone replies STOP, set `opted_out` to `yes` in their row (this pack does not read your inbox).
- Text from forms is HTML-escaped before it goes into an email, and line breaks are stripped from subject lines.

## Limits

- No proposal/PDF generation; you send your proposal as you do today.
- The Google Sheets steps (`appendOrUpdate` / `update`) and Gmail steps follow n8n's current node schemas but were not run against live Google accounts in the build environment. Test with your own sheet in dry-run-off mode on one test row first, and re-select a field if n8n asks you to after import.
- Daily schedules run once a day in your n8n's timezone setting; dates are `YYYY-MM-DD`.

## Tests

Run `./sample-data/curl-tests.sh https://YOUR-N8N/webhook` (use `/webhook-test` while building). Logic is covered by automated tests in the source repo (`node --test test/`).

Support: this is a template, not a managed service. Installation help is a separate paid service.
