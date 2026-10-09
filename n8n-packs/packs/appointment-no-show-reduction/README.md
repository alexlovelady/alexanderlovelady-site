# Appointment No-Show Reduction for n8n

Reminders that actually reduce no-shows, with a one-click reschedule path.

**For:** Salons, tutors, coaches, clinics and other appointment-based businesses. **Built and tested with n8n 2.42.5.** Needs Gmail and Google Sheets credentials.

## What's inside

| # | Workflow file | What it does | Lite |
|---|---|---|---|
| 1 | `workflows/1-new-appointment.json` | Webhook `noshow-book`: validates the request, ignores same-day duplicates, logs it to the **Appointments** tab, emails the sender an acknowledgement. | yes |
| 2 | `workflows/2-appointment-reminders.json` | Runs daily at 16:00 over **Appointments**: sends at most one email per row per run, steps at (day -2; day -1) relative to `appt_date`. Never repeats a step. Only rows with status booked. | yes |
| 3 | `workflows/3-mark-no-show.json` | Webhook `noshow-missed`: updates one row in **Appointments** (sets status=`no_show`). | yes |
| 4 | `workflows/4-mark-attended.json` | Webhook `noshow-attended`: updates one row in **Appointments** (sets status=`attended`). |  |
| 5 | `workflows/5-reschedule-appointment.json` | Webhook `noshow-reschedule`: updates one row in **Appointments** (sets status=`booked`, rem2_sent=``, rem1_sent=``), emails the customer. |  |
| 6 | `workflows/6-missed-appointment-follow-up.json` | Runs daily at 11:00 over **Appointments**: sends at most one email per row per run, steps at (day +1; day +14) relative to `appt_date`. Never repeats a step. Only rows with status no_show. |  |
| 7 | `workflows/7-weekly-no-show-report.json` | Runs Mondays at 08:00: emails a metrics summary (last 7 days vs the period before). |  |
| 8 | `workflows/8-error-alert.json` | Emails you when any workflow fails (set it as the Error Workflow). | yes |

**Lite** = the workflows marked yes ($29 test price). **Pro** = all 8 ($39 test price).

## Setup (about 30 minutes)

1. **Make the sheet.** Create one Google Sheet with these tabs, named exactly: `Appointments`. Paste each header row from `sheets/<Tab>.csv` into row 1 of its tab. Copy the sheet ID from the URL.
2. **Import** every workflow JSON into n8n (Workflows > Import from file) and select your credentials on each Gmail / Google Sheets node. Nodes that need other credentials have a sticky note saying so.
3. **Edit the `Config` node** in each workflow. The top part (business name, your email, links, sheet ID, timezone, and any pack settings) must be the same in every workflow. The `flow` section is that workflow's own settings and message wording; edit the wording freely.
4. **Dry run first.** `dry_run` ships as `true`: webhooks validate and return a preview, and nothing is sent or written. Test with `sample-data/curl-tests.sh`, then set `dry_run` to `false` in every workflow.
5. **Activate** the workflows. Set the Error Alert workflow as the *Error Workflow* in the settings of the others.

## Webhooks

Each webhook is `POST https://YOUR-N8N/webhook/<path>` with a JSON body. Optional: set `webhook_secret` in Config and send the same value in an `x-webhook-secret` header. Responses: `200` accepted (or duplicate), `422` invalid input with a list of errors, `401` wrong secret.

### `noshow-book`: New Appointment

| Field | Required | Type / values | Example |
|---|---|---|---|
| `name` | yes | text | Jordan Smith |
| `email` | yes | email | jordan@example.test |
| `phone` | no | phone | 555-0166 |
| `service` | no | text | Haircut |
| `appt_date` | yes | date | 2026-10-22 |
| `appt_time` | yes | time | 15:30 |

### `noshow-missed`: Mark No-Show

| Field | Required | Type / values | Example |
|---|---|---|---|
| `appt_id` | yes | text | Aabc123 |

### `noshow-attended`: Mark Attended

| Field | Required | Type / values | Example |
|---|---|---|---|
| `appt_id` | yes | text | Aabc123 |

### `noshow-reschedule`: Reschedule Appointment

| Field | Required | Type / values | Example |
|---|---|---|---|
| `appt_id` | yes | text | Aabc123 |
| `email` | yes | email | jordan@example.test |
| `name` | no | text | Jordan Smith |
| `appt_date` | yes | date | 2026-10-29 |
| `appt_time` | yes | time | 10:00 |

## Google Sheet tabs

- **Appointments**: `appt_id, created_at, name, email, phone, service, appt_date, appt_time, status, opted_out, rem2_sent, rem1_sent, updated_at, miss1_sent, miss2_sent`

Column names must match exactly. Columns that only some workflows use are blank until those workflows run.

## Settings in Config

`booking_link`, `business_name`, `business_phone`, `dry_run`, `optout_footer`, `owner_email`, `reschedule_link`, `sheet_id`, `timezone`, `webhook_secret`

## Notes: read before going live

- After each appointment, mark it attended or no-show (webhook or the sheet's `status` column). The pack only reports what you record.
- Reminders run once daily in the afternoon: 2 days before and 1 day before. They cannot target an exact hour.
- No deposits or fees are charged by this pack. If you have a cancellation policy, state it in your own terms and in the Config wording.
- Email only. No SMS is included (SMS needs separate consent and carrier registration).
- Any message that is marketing rather than transactional carries an opt-out line. When someone replies STOP, set `opted_out` to `yes` in their row (this pack does not read your inbox).
- Text from forms is HTML-escaped before it goes into an email, and line breaks are stripped from subject lines.

## Limits

- Email only. SMS reminders are not included (SMS requires consent and carrier registration).
- The Google Sheets steps (`appendOrUpdate` / `update`) and Gmail steps follow n8n's current node schemas but were not run against live Google accounts in the build environment. Test with your own sheet in dry-run-off mode on one test row first, and re-select a field if n8n asks you to after import.
- Daily schedules run once a day in your n8n's timezone setting; dates are `YYYY-MM-DD`.

## Tests

Run `./sample-data/curl-tests.sh https://YOUR-N8N/webhook` (use `/webhook-test` while building). Logic is covered by automated tests in the source repo (`node --test test/`).

Support: this is a template, not a managed service. Installation help is a separate paid service.
