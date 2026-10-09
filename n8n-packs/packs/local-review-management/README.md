# Local Business Review Management for n8n

Ask every customer for a review the same way, and hear about unhappy customers the same day.

**For:** Local service businesses (cleaners, trades, salons, clinics, detailers). **Built and tested with n8n 2.42.5.** Needs Gmail and Google Sheets credentials.

## What's inside

| # | Workflow file | What it does | Lite |
|---|---|---|---|
| 1 | `workflows/1-log-a-completed-job.json` | Webhook `review-customer`: validates the request, ignores same-day duplicates, logs it to the **Customers** tab. | yes |
| 2 | `workflows/2-review-requests.json` | Runs daily at 11:00 over **Customers**: sends at most one email per row per run, steps at (day +1; day +10) relative to `job_date`. Never repeats a step. Only rows with status active. | yes |
| 3 | `workflows/3-private-feedback-form.json` | Webhook `review-feedback`: validates the request, ignores same-day duplicates, logs it to the **Feedback** tab, tags/routes it with the rules in the Config, emails the sender an acknowledgement, alerts you. | yes |
| 4 | `workflows/4-weekly-reputation-report.json` | Runs Mondays at 08:00: emails a metrics summary (last 7 days vs the period before). |  |
| 5 | `workflows/5-error-alert.json` | Emails you when any workflow fails (set it as the Error Workflow). | yes |

**Lite** = the workflows marked yes ($29 test price). **Pro** = all 5 ($39 test price).

## Setup (about 30 minutes)

1. **Make the sheet.** Create one Google Sheet with these tabs, named exactly: `Customers`, `Feedback`. Paste each header row from `sheets/<Tab>.csv` into row 1 of its tab. Copy the sheet ID from the URL.
2. **Import** every workflow JSON into n8n (Workflows > Import from file) and select your credentials on each Gmail / Google Sheets node. Nodes that need other credentials have a sticky note saying so.
3. **Edit the `Config` node** in each workflow. The top part (business name, your email, links, sheet ID, timezone, and any pack settings) must be the same in every workflow. The `flow` section is that workflow's own settings and message wording; edit the wording freely.
4. **Dry run first.** `dry_run` ships as `true`: webhooks validate and return a preview, and nothing is sent or written. Test with `sample-data/curl-tests.sh`, then set `dry_run` to `false` in every workflow.
5. **Activate** the workflows. Set the Error Alert workflow as the *Error Workflow* in the settings of the others.

## Webhooks

Each webhook is `POST https://YOUR-N8N/webhook/<path>` with a JSON body. Optional: set `webhook_secret` in Config and send the same value in an `x-webhook-secret` header. Responses: `200` accepted (or duplicate), `422` invalid input with a list of errors, `401` wrong secret.

### `review-customer`: Log A Completed Job

| Field | Required | Type / values | Example |
|---|---|---|---|
| `name` | yes | text | Pat Rivera |
| `email` | yes | email | pat@example.test |
| `service` | no | text | House cleaning |
| `job_date` | no | date | 2026-10-10 |

### `review-feedback`: Private Feedback Form

| Field | Required | Type / values | Example |
|---|---|---|---|
| `name` | yes | text | Pat Rivera |
| `email` | yes | email | pat@example.test |
| `rating` | yes | one of: 1, 2, 3, 4, 5 | 5 |
| `comment` | no | text | Great job, very thorough. |
| `service` | no | text | House cleaning |

## Google Sheet tabs

- **Customers**: `customer_id, created_at, name, email, service, job_date, status, reviewed, opted_out, ask1_sent, ask2_sent`
- **Feedback**: `feedback_id, created_at, name, email, rating, comment, service, priority, status`

Column names must match exactly. Columns that only some workflows use are blank until those workflows run.

## Settings in Config

`business_name`, `business_phone`, `dry_run`, `optout_footer`, `owner_email`, `review_link`, `sheet_id`, `timezone`, `webhook_secret`

## Notes: read before going live

- NO REVIEW GATING. Google, Yelp and Facebook prohibit sending only happy customers to the review site. This pack sends the review link to EVERY customer, and the private feedback form's thank-you also includes the public review link for every rating.
- Low ratings alert you so you can follow up personally. The pack never writes or posts replies for you.
- Mark `reviewed` = `yes` in the Customers sheet when a customer reviews, to stop reminders. `opted_out` = `yes` after a STOP reply.
- Check each platform's current rules about soliciting reviews; they change.
- Email only. No SMS is included (SMS needs separate consent and carrier registration).
- Any message that is marketing rather than transactional carries an opt-out line. When someone replies STOP, set `opted_out` to `yes` in their row (this pack does not read your inbox).
- Text from forms is HTML-escaped before it goes into an email, and line breaks are stripped from subject lines.

## Limits

- The pack cannot read your actual reviews from Google/Yelp. The report covers your private feedback form only.
- The Google Sheets steps (`appendOrUpdate` / `update`) and Gmail steps follow n8n's current node schemas but were not run against live Google accounts in the build environment. Test with your own sheet in dry-run-off mode on one test row first, and re-select a field if n8n asks you to after import.
- Daily schedules run once a day in your n8n's timezone setting; dates are `YYYY-MM-DD`.

## Tests

Run `./sample-data/curl-tests.sh https://YOUR-N8N/webhook` (use `/webhook-test` while building). Logic is covered by automated tests in the source repo (`node --test test/`).

Support: this is a template, not a managed service. Installation help is a separate paid service.
