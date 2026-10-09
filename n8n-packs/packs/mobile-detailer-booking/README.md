# Mobile Detailer Booking Assistant for n8n

Fewer no-shows and unpaid slots, with zero manual reminders.

**For:** Mobile and shop-based auto detailers. **Built and tested with n8n 2.42.5.** Needs Gmail and Google Sheets credentials.

## What's inside

| # | Workflow file | What it does | Lite |
|---|---|---|---|
| 1 | `workflows/1-booking-request-intake.json` | Webhook `detailer-request`: validates the request, ignores same-day duplicates, logs it to the **Bookings** tab, emails the sender an acknowledgement, alerts you. | yes |
| 2 | `workflows/2-confirm-booking.json` | Webhook `detailer-confirm`: updates one row in **Bookings** (sets status=`booked`), emails the customer. | yes |
| 3 | `workflows/3-deposit-reminders.json` | Runs daily at 10:00 over **Bookings**: sends at most one email per row per run, steps at (day +1; day +3) relative to `confirmed_at`. Never repeats a step. Only rows with status booked. | yes |
| 4 | `workflows/4-appointment-reminders.json` | Runs daily at 17:00 over **Bookings**: sends at most one email per row per run, steps at (day -2; day -1) relative to `appt_date`. Never repeats a step. Only rows with status booked. |  |
| 5 | `workflows/5-thank-you-and-review-request.json` | Runs daily at 11:00 over **Bookings**: sends at most one email per row per run, steps at (day +1; day +60) relative to `appt_date`. Never repeats a step. Only rows with status completed. |  |
| 6 | `workflows/6-weekly-bookings-report.json` | Runs Mondays at 08:00: emails a metrics summary (last 7 days vs the period before). |  |
| 7 | `workflows/7-error-alert.json` | Emails you when any workflow fails (set it as the Error Workflow). | yes |

**Lite** = the workflows marked yes ($29 test price). **Pro** = all 7 ($49 test price).

## Setup (about 30 minutes)

1. **Make the sheet.** Create one Google Sheet with these tabs, named exactly: `Bookings`. Paste each header row from `sheets/<Tab>.csv` into row 1 of its tab. Copy the sheet ID from the URL.
2. **Import** every workflow JSON into n8n (Workflows > Import from file) and select your credentials on each Gmail / Google Sheets node. Nodes that need other credentials have a sticky note saying so.
3. **Edit the `Config` node** in each workflow. The top part (business name, your email, links, sheet ID, timezone, and any pack settings) must be the same in every workflow. The `flow` section is that workflow's own settings and message wording; edit the wording freely.
4. **Dry run first.** `dry_run` ships as `true`: webhooks validate and return a preview, and nothing is sent or written. Test with `sample-data/curl-tests.sh`, then set `dry_run` to `false` in every workflow.
5. **Activate** the workflows. Set the Error Alert workflow as the *Error Workflow* in the settings of the others.

## Webhooks

Each webhook is `POST https://YOUR-N8N/webhook/<path>` with a JSON body. Optional: set `webhook_secret` in Config and send the same value in an `x-webhook-secret` header. Responses: `200` accepted (or duplicate), `422` invalid input with a list of errors, `401` wrong secret.

### `detailer-request`: Booking Request Intake

| Field | Required | Type / values | Example |
|---|---|---|---|
| `name` | yes | text | Chris Park |
| `email` | yes | email | chris@example.test |
| `phone` | no | phone | 555-0177 |
| `service` | yes | one of: Wash & Wax, Interior Detail, Full Detail, Ceramic Coating, Other | Full Detail |
| `vehicle` | yes | text | 2021 Honda CR-V |
| `location` | no | text | 12 Oak St |
| `appt_date` | yes | date | 2026-10-24 |
| `notes` | no | text | Pet hair in the back seat |

### `detailer-confirm`: Confirm Booking

| Field | Required | Type / values | Example |
|---|---|---|---|
| `booking_id` | yes | text | Dabc123 |
| `email` | yes | email | chris@example.test |
| `name` | no | text | Chris Park |
| `service` | no | text | Full Detail |
| `appt_date` | yes | date | 2026-10-24 |
| `appt_time` | yes | time | 09:00 |

## Google Sheet tabs

- **Bookings**: `booking_id, created_at, name, email, phone, service, vehicle, location, appt_date, notes, status, deposit_paid, opted_out, updated_at, appt_time, confirmed_at, dep1_sent, dep2_sent, rem2_sent, rem1_sent, review_sent, rebook_sent`

Column names must match exactly. Columns that only some workflows use are blank until those workflows run.

## Settings in Config

`business_name`, `business_phone`, `deposit_amount`, `deposit_link`, `dry_run`, `optout_footer`, `owner_email`, `review_link`, `sheet_id`, `timezone`, `webhook_secret`

## Notes: read before going live

- Deposits are collected through YOUR payment link (Stripe, Square, PayPal, etc.). Mark `deposit_paid` = `yes` in the sheet when it arrives to stop reminders.
- Statuses used: requested, booked, completed. Set `completed` after the job to trigger the thank-you/review email.
- The review email goes to every completed customer. Do not change it to send only to happy customers.
- Email only. No SMS is included (SMS needs separate consent and carrier registration).
- Any message that is marketing rather than transactional carries an opt-out line. When someone replies STOP, set `opted_out` to `yes` in their row (this pack does not read your inbox).
- Text from forms is HTML-escaped before it goes into an email, and line breaks are stripped from subject lines.

## Limits

- Reminders run once a day in the evening; they cannot target a specific hour.
- No online scheduling calendar. Connect your own booking form to the request webhook.
- The Google Sheets steps (`appendOrUpdate` / `update`) and Gmail steps follow n8n's current node schemas but were not run against live Google accounts in the build environment. Test with your own sheet in dry-run-off mode on one test row first, and re-select a field if n8n asks you to after import.
- Daily schedules run once a day in your n8n's timezone setting; dates are `YYYY-MM-DD`.

## Tests

Run `./sample-data/curl-tests.sh https://YOUR-N8N/webhook` (use `/webhook-test` while building). Logic is covered by automated tests in the source repo (`node --test test/`).

Support: this is a template, not a managed service. Installation help is a separate paid service.
