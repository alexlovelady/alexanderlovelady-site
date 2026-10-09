# Recruiting Applicant Pipeline for n8n

Every applicant acknowledged and routed, every status change communicated, no ATS subscription.

**For:** Small businesses hiring without an applicant-tracking system. **Built and tested with n8n 2.42.5.** Needs Gmail and Google Sheets credentials.

## What's inside

| # | Workflow file | What it does | Lite |
|---|---|---|---|
| 1 | `workflows/1-application-intake.json` | Webhook `recruiting-apply`: validates the request, ignores same-day duplicates, logs it to the **Applicants** tab, emails the sender an acknowledgement, alerts you. | yes |
| 2 | `workflows/2-update-applicant-status.json` | Webhook `recruiting-status`: updates one row in **Applicants**, emails the customer. | yes |
| 3 | `workflows/3-applicants-waiting-for-review.json` | Runs weekdays at 08:00: emails a list of applicants that need attention. |  |
| 4 | `workflows/4-weekly-hiring-report.json` | Runs Mondays at 08:00: emails a metrics summary (last 7 days vs the period before). |  |
| 5 | `workflows/5-error-alert.json` | Emails you when any workflow fails (set it as the Error Workflow). | yes |

**Lite** = the workflows marked yes ($39 test price). **Pro** = all 5 ($59 test price).

## Setup (about 30 minutes)

1. **Make the sheet.** Create one Google Sheet with these tabs, named exactly: `Applicants`. Paste each header row from `sheets/<Tab>.csv` into row 1 of its tab. Copy the sheet ID from the URL.
2. **Import** every workflow JSON into n8n (Workflows > Import from file) and select your credentials on each Gmail / Google Sheets node. Nodes that need other credentials have a sticky note saying so.
3. **Edit the `Config` node** in each workflow. The top part (business name, your email, links, sheet ID, timezone, and any pack settings) must be the same in every workflow. The `flow` section is that workflow's own settings and message wording; edit the wording freely.
4. **Dry run first.** `dry_run` ships as `true`: webhooks validate and return a preview, and nothing is sent or written. Test with `sample-data/curl-tests.sh`, then set `dry_run` to `false` in every workflow.
5. **Activate** the workflows. Set the Error Alert workflow as the *Error Workflow* in the settings of the others.

## Webhooks

Each webhook is `POST https://YOUR-N8N/webhook/<path>` with a JSON body. Optional: set `webhook_secret` in Config and send the same value in an `x-webhook-secret` header. Responses: `200` accepted (or duplicate), `422` invalid input with a list of errors, `401` wrong secret.

### `recruiting-apply`: Application Intake

| Field | Required | Type / values | Example |
|---|---|---|---|
| `name` | yes | text | Alex Morgan |
| `email` | yes | email | alex@example.test |
| `phone` | no | phone | 555-0133 |
| `role` | yes | one of: Cleaner, Driver, Office Admin, Other | Driver |
| `resume_url` | no | url | https://example.test/alex-resume.pdf |
| `source` | no | text | Indeed |
| `note` | no | text | Available to start in two weeks. |

### `recruiting-status`: Update Applicant Status

| Field | Required | Type / values | Example |
|---|---|---|---|
| `applicant_id` | yes | text | APabc123 |
| `email` | yes | email | alex@example.test |
| `name` | no | text | Alex Morgan |
| `role` | no | text | Driver |
| `status` | yes | one of: screening, interview, offer, rejected, hired, withdrawn | interview |

## Google Sheet tabs

- **Applicants**: `applicant_id, created_at, name, email, phone, role, resume_url, source, note, status, manager_email, updated_at`

Column names must match exactly. Columns that only some workflows use are blank until those workflows run.

## Settings in Config

`business_name`, `careers_email`, `dry_run`, `hiring_managers`, `optout_footer`, `owner_email`, `scheduling_link`, `sheet_id`, `timezone`, `webhook_secret`

## Notes: read before going live

- A HUMAN decides every candidate's status. The pack never scores, ranks or rejects anyone automatically; a rejection email is sent only after you set the status to `rejected`.
- Hiring regulations (equal opportunity, anti-discrimination, data retention, consent for storing applicant data) are your responsibility. Do not collect sensitive information (age, health, protected characteristics) in your application form. Not legal advice.
- Role options and hiring-manager routing are edited in the Config (`flow.fields` role options and `hiring_managers`).
- Applicant data lives in your Google Sheet. Restrict who can open it and delete old applicants on a schedule that matches your policy.
- Email only. No SMS is included (SMS needs separate consent and carrier registration).
- Any message that is marketing rather than transactional carries an opt-out line. When someone replies STOP, set `opted_out` to `yes` in their row (this pack does not read your inbox).
- Text from forms is HTML-escaped before it goes into an email, and line breaks are stripped from subject lines.

## Limits

- No resume parsing, no interview scheduling system (a scheduling link you provide is emailed), no background checks.
- The Google Sheets steps (`appendOrUpdate` / `update`) and Gmail steps follow n8n's current node schemas but were not run against live Google accounts in the build environment. Test with your own sheet in dry-run-off mode on one test row first, and re-select a field if n8n asks you to after import.
- Daily schedules run once a day in your n8n's timezone setting; dates are `YYYY-MM-DD`.

## Tests

Run `./sample-data/curl-tests.sh https://YOUR-N8N/webhook` (use `/webhook-test` while building). Logic is covered by automated tests in the source repo (`node --test test/`).

Support: this is a template, not a managed service. Installation help is a separate paid service.
