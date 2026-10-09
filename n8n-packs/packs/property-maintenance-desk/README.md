# Property Manager Maintenance Desk for n8n

Every tenant request logged, routed to the right contractor and answered, with emergencies escalated instantly.

**For:** Small landlords and property managers. **Built and tested with n8n 2.42.5.** Needs Gmail and Google Sheets credentials.

## What's inside

| # | Workflow file | What it does | Lite |
|---|---|---|---|
| 1 | `workflows/1-maintenance-request-intake.json` | Webhook `maintenance-request`: validates the request, ignores same-day duplicates, logs it to the **Requests** tab, tags/routes it with the rules in the Config, emails the sender an acknowledgement, alerts you. | yes |
| 2 | `workflows/2-update-request.json` | Webhook `maintenance-update`: updates one row in **Requests**, emails the customer. | yes |
| 3 | `workflows/3-completion-survey.json` | Runs daily at 11:00 over **Requests**: sends at most one email per row per run, steps at (day +1) relative to `updated_at`. Never repeats a step. Only rows with status completed. |  |
| 4 | `workflows/4-open-request-aging.json` | Runs weekdays at 08:00: emails a list of requests that need attention. |  |
| 5 | `workflows/5-error-alert.json` | Emails you when any workflow fails (set it as the Error Workflow). | yes |

**Lite** = the workflows marked yes ($29 test price). **Pro** = all 5 ($59 test price).

## Setup (about 30 minutes)

1. **Make the sheet.** Create one Google Sheet with these tabs, named exactly: `Requests`. Paste each header row from `sheets/<Tab>.csv` into row 1 of its tab. Copy the sheet ID from the URL.
2. **Import** every workflow JSON into n8n (Workflows > Import from file) and select your credentials on each Gmail / Google Sheets node. Nodes that need other credentials have a sticky note saying so.
3. **Edit the `Config` node** in each workflow. The top part (business name, your email, links, sheet ID, timezone, and any pack settings) must be the same in every workflow. The `flow` section is that workflow's own settings and message wording; edit the wording freely.
4. **Dry run first.** `dry_run` ships as `true`: webhooks validate and return a preview, and nothing is sent or written. Test with `sample-data/curl-tests.sh`, then set `dry_run` to `false` in every workflow.
5. **Activate** the workflows. Set the Error Alert workflow as the *Error Workflow* in the settings of the others.

## Webhooks

Each webhook is `POST https://YOUR-N8N/webhook/<path>` with a JSON body. Optional: set `webhook_secret` in Config and send the same value in an `x-webhook-secret` header. Responses: `200` accepted (or duplicate), `422` invalid input with a list of errors, `401` wrong secret.

### `maintenance-request`: Maintenance Request Intake

| Field | Required | Type / values | Example |
|---|---|---|---|
| `name` | yes | text | Jamie Tenant |
| `email` | yes | email | jamie@example.test |
| `phone` | no | phone | 555-0144 |
| `property` | yes | text | Maple Court |
| `unit` | no | text | 4B |
| `category` | yes | one of: Plumbing, Electrical, HVAC, Appliance, Pest, Other | Plumbing |
| `urgency` | yes | one of: Emergency, Urgent, Routine | Routine |
| `description` | yes | text | Kitchen faucet drips constantly. |
| `permission_to_enter` | no | one of: Yes, No | Yes |

### `maintenance-update`: Update Request

| Field | Required | Type / values | Example |
|---|---|---|---|
| `request_id` | yes | text | Mabc123 |
| `email` | yes | email | jamie@example.test |
| `name` | no | text | Jamie Tenant |
| `status` | yes | one of: scheduled, in_progress, completed, cancelled | scheduled |
| `scheduled_date` | no | date | 2026-10-15 |
| `contractor` | no | text | Smith Plumbing |

## Google Sheet tabs

- **Requests**: `request_id, created_at, name, email, phone, property, unit, category, urgency, description, permission_to_enter, status, priority, scheduled_date, contractor, opted_out, updated_at, survey_sent`

Column names must match exactly. Columns that only some workflows use are blank until those workflows run.

## Settings in Config

`business_name`, `business_phone`, `contractors`, `dry_run`, `emergency_email`, `emergency_phone`, `optout_footer`, `owner_email`, `sheet_id`, `survey_link`, `timezone`, `webhook_secret`

## Notes: read before going live

- SAFETY: the emergency reply tells tenants to call 911 first for danger. This pack is NOT an emergency service and must never be the only way tenants can reach you in an emergency. Keep a phone line monitored.
- Contractors listed in `contractors` receive the tenant's name, phone and request details. Only add contractors you trust, and follow your local privacy and landlord-tenant rules.
- Edit the `category` list and routing map in the Config to match your trades.
- Statuses used: open, scheduled, in_progress, completed, cancelled. Completed requests trigger a next-day survey email.
- Email only. No SMS is included (SMS needs separate consent and carrier registration).
- Any message that is marketing rather than transactional carries an opt-out line. When someone replies STOP, set `opted_out` to `yes` in their row (this pack does not read your inbox).
- Text from forms is HTML-escaped before it goes into an email, and line breaks are stripped from subject lines.

## Limits

- No work-order billing, no vendor payments, no tenant portal.
- The Google Sheets steps (`appendOrUpdate` / `update`) and Gmail steps follow n8n's current node schemas but were not run against live Google accounts in the build environment. Test with your own sheet in dry-run-off mode on one test row first, and re-select a field if n8n asks you to after import.
- Daily schedules run once a day in your n8n's timezone setting; dates are `YYYY-MM-DD`.

## Tests

Run `./sample-data/curl-tests.sh https://YOUR-N8N/webhook` (use `/webhook-test` while building). Logic is covered by automated tests in the source repo (`node --test test/`).

Support: this is a template, not a managed service. Installation help is a separate paid service.
