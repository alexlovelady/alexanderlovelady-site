# SaaS Trial-to-Paid Lifecycle for n8n

Turn more trials into customers with timely, plain-text emails driven by your own signup data.

**For:** Micro-SaaS owners and indie founders. **Built and tested with n8n 2.42.5.** Needs Gmail and Google Sheets credentials.

## What's inside

| # | Workflow file | What it does | Lite |
|---|---|---|---|
| 1 | `workflows/1-new-trial-signup.json` | Webhook `saas-signup`: validates the request, ignores same-day duplicates, logs it to the **Users** tab, emails the sender an acknowledgement. | yes |
| 2 | `workflows/2-onboarding-nudges.json` | Runs daily at 10:00 over **Users**: sends at most one email per row per run, steps at (day +2; day +5) relative to `created_at`. Never repeats a step. Only rows with status trial. | yes |
| 3 | `workflows/3-trial-ending-reminders.json` | Runs daily at 10:00 over **Users**: sends at most one email per row per run, steps at (day -3; day -1; day +1) relative to `trial_end`. Never repeats a step. Only rows with status trial. | yes |
| 4 | `workflows/4-converted-to-paid.json` | Webhook `saas-converted`: updates one row in **Users** (sets status=`paid`), emails the customer, alerts you. |  |
| 5 | `workflows/5-cancelled-or-churned.json` | Webhook `saas-cancelled`: updates one row in **Users** (sets status=`churned`), emails the customer. |  |
| 6 | `workflows/6-mark-user-activated.json` | Webhook `saas-activated`: updates one row in **Users** (sets activated=`yes`). |  |
| 7 | `workflows/7-weekly-conversion-report.json` | Runs Mondays at 08:00: emails a metrics summary (last 7 days vs the period before). |  |
| 8 | `workflows/8-error-alert.json` | Emails you when any workflow fails (set it as the Error Workflow). | yes |

**Lite** = the workflows marked yes ($39 test price). **Pro** = all 8 ($69 test price).

## Setup (about 30 minutes)

1. **Make the sheet.** Create one Google Sheet with these tabs, named exactly: `Users`. Paste each header row from `sheets/<Tab>.csv` into row 1 of its tab. Copy the sheet ID from the URL.
2. **Import** every workflow JSON into n8n (Workflows > Import from file) and select your credentials on each Gmail / Google Sheets node. Nodes that need other credentials have a sticky note saying so.
3. **Edit the `Config` node** in each workflow. The top part (business name, your email, links, sheet ID, timezone, and any pack settings) must be the same in every workflow. The `flow` section is that workflow's own settings and message wording; edit the wording freely.
4. **Dry run first.** `dry_run` ships as `true`: webhooks validate and return a preview, and nothing is sent or written. Test with `sample-data/curl-tests.sh`, then set `dry_run` to `false` in every workflow.
5. **Activate** the workflows. Set the Error Alert workflow as the *Error Workflow* in the settings of the others.

## Webhooks

Each webhook is `POST https://YOUR-N8N/webhook/<path>` with a JSON body. Optional: set `webhook_secret` in Config and send the same value in an `x-webhook-secret` header. Responses: `200` accepted (or duplicate), `422` invalid input with a list of errors, `401` wrong secret.

### `saas-signup`: New Trial Signup

| Field | Required | Type / values | Example |
|---|---|---|---|
| `user_id` | yes | text | u_1001 |
| `name` | no | text | Riley Quinn |
| `email` | yes | email | riley@example.test |
| `plan` | no | text | Pro |
| `trial_end` | yes | date | 2026-10-26 |

### `saas-converted`: Converted To Paid

| Field | Required | Type / values | Example |
|---|---|---|---|
| `user_id` | yes | text | u_1001 |
| `email` | yes | email | riley@example.test |
| `name` | no | text | Riley Quinn |
| `plan` | no | text | Pro |

### `saas-cancelled`: Cancelled Or Churned

| Field | Required | Type / values | Example |
|---|---|---|---|
| `user_id` | yes | text | u_1001 |
| `email` | yes | email | riley@example.test |
| `name` | no | text | Riley Quinn |

### `saas-activated`: Mark User Activated

| Field | Required | Type / values | Example |
|---|---|---|---|
| `user_id` | yes | text | u_1001 |

## Google Sheet tabs

- **Users**: `user_id, created_at, name, email, plan, trial_end, status, activated, converted_at, churned_at, opted_out, tips_sent, stuck_sent, end3_sent, end1_sent, ended_sent, updated_at`

Column names must match exactly. Columns that only some workflows use are blank until those workflows run.

## Settings in Config

`app_url`, `business_name`, `docs_url`, `dry_run`, `optout_footer`, `owner_email`, `product_name`, `sheet_id`, `survey_url`, `timezone`, `upgrade_url`, `webhook_secret`

## Notes: read before going live

- Your app calls the webhooks: `saas-signup` when a trial starts, `saas-activated` when the user hits your activation moment, `saas-converted` and `saas-cancelled` from your billing events.
- Onboarding and reminder emails go only to users with status `trial`, so converted and churned users stop getting them.
- Marketing-style emails carry an opt-out line. Set `opted_out` = `yes` when someone replies STOP.
- Email only. No SMS is included (SMS needs separate consent and carrier registration).
- Any message that is marketing rather than transactional carries an opt-out line. When someone replies STOP, set `opted_out` to `yes` in their row (this pack does not read your inbox).
- Text from forms is HTML-escaped before it goes into an email, and line breaks are stripped from subject lines.

## Limits

- No in-app tracking. Activation is whatever your app reports to `saas-activated`.
- Conversion rate is approximate (conversions this week / signups this week).
- The Google Sheets steps (`appendOrUpdate` / `update`) and Gmail steps follow n8n's current node schemas but were not run against live Google accounts in the build environment. Test with your own sheet in dry-run-off mode on one test row first, and re-select a field if n8n asks you to after import.
- Daily schedules run once a day in your n8n's timezone setting; dates are `YYYY-MM-DD`.

## Tests

Run `./sample-data/curl-tests.sh https://YOUR-N8N/webhook` (use `/webhook-test` while building). Logic is covered by automated tests in the source repo (`node --test test/`).

Support: this is a template, not a managed service. Installation help is a separate paid service.
