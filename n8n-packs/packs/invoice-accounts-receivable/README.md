# Invoice & Accounts Receivable for n8n

Polite, consistent payment reminders and a weekly overdue list, without chasing clients by hand.

**For:** Freelancers, agencies and small service businesses that invoice clients. **Built and tested with n8n 2.42.5.** Needs Gmail and Google Sheets credentials.

## What's inside

| # | Workflow file | What it does | Lite |
|---|---|---|---|
| 1 | `workflows/1-log-new-invoice.json` | Webhook `invoice-new`: validates the request, ignores same-day duplicates, logs it to the **Invoices** tab, alerts you. | yes |
| 2 | `workflows/2-payment-reminders.json` | Runs weekdays at 09:00 over **Invoices**: sends at most one email per row per run, steps at (day -3; day 0; day +3; day +10; day +20) relative to `due_date`. Never repeats a step. Only rows with status sent. | yes |
| 3 | `workflows/3-mark-invoice-paid.json` | Webhook `invoice-paid`: updates one row in **Invoices** (sets status=`paid`), emails the customer, alerts you. | yes |
| 4 | `workflows/4-weekly-overdue-report.json` | Runs Mondays at 08:00: emails a list of invoices that need attention. |  |
| 5 | `workflows/5-monthly-receivables-summary.json` | Runs the 1st of each month at 08:00: emails a metrics summary (last 30 days vs the period before). |  |
| 6 | `workflows/6-error-alert.json` | Emails you when any workflow fails (set it as the Error Workflow). | yes |

**Lite** = the workflows marked yes ($39 test price). **Pro** = all 6 ($59 test price).

## Setup (about 30 minutes)

1. **Make the sheet.** Create one Google Sheet with these tabs, named exactly: `Invoices`. Paste each header row from `sheets/<Tab>.csv` into row 1 of its tab. Copy the sheet ID from the URL.
2. **Import** every workflow JSON into n8n (Workflows > Import from file) and select your credentials on each Gmail / Google Sheets node. Nodes that need other credentials have a sticky note saying so.
3. **Edit the `Config` node** in each workflow. The top part (business name, your email, links, sheet ID, timezone, and any pack settings) must be the same in every workflow. The `flow` section is that workflow's own settings and message wording; edit the wording freely.
4. **Dry run first.** `dry_run` ships as `true`: webhooks validate and return a preview, and nothing is sent or written. Test with `sample-data/curl-tests.sh`, then set `dry_run` to `false` in every workflow.
5. **Activate** the workflows. Set the Error Alert workflow as the *Error Workflow* in the settings of the others.

## Webhooks

Each webhook is `POST https://YOUR-N8N/webhook/<path>` with a JSON body. Optional: set `webhook_secret` in Config and send the same value in an `x-webhook-secret` header. Responses: `200` accepted (or duplicate), `422` invalid input with a list of errors, `401` wrong secret.

### `invoice-new`: Log New Invoice

| Field | Required | Type / values | Example |
|---|---|---|---|
| `invoice_id` | yes | text | INV-1042 |
| `name` | yes | text | Morgan Lee |
| `email` | yes | email | accounts@client.test |
| `amount` | yes | number | 1250 |
| `issue_date` | no | date | 2026-10-01 |
| `due_date` | yes | date | 2026-10-31 |
| `invoice_link` | no | url | https://pay.example.com/inv-1042 |
| `description` | no | text | October retainer |

### `invoice-paid`: Mark Invoice Paid

| Field | Required | Type / values | Example |
|---|---|---|---|
| `invoice_id` | yes | text | INV-1042 |
| `email` | no | email | accounts@client.test |
| `name` | no | text | Morgan Lee |
| `amount` | no | number | 1250 |

## Google Sheet tabs

- **Invoices**: `invoice_id, created_at, name, email, amount, issue_date, due_date, invoice_link, description, status, paid_date, r_pre_sent, r_due_sent, r_late3_sent, r_late10_sent, r_late20_sent, updated_at`

Column names must match exactly. Columns that only some workflows use are blank until those workflows run.

## Settings in Config

`business_name`, `business_phone`, `dry_run`, `late_fee_text`, `optout_footer`, `owner_email`, `payment_instructions`, `sheet_id`, `timezone`, `webhook_secret`

## Notes: read before going live

- This pack does not create invoices or collect payments. Keep using your invoicing tool, then log each invoice with the `invoice-new` webhook (Zapier/Make can send it) or paste rows into the sheet.
- Reminders stop when you mark the invoice paid (`invoice-paid` webhook or set status to `paid` in the sheet).
- Payment reminders are transactional and have no STOP footer. The tone is courteous. Review wording for your jurisdiction; debt-collection rules can apply, and this is not legal advice or a collections service.
- Set `late_fee_text` in the Config only if a late fee is in your signed agreement.
- Email only. No SMS is included (SMS needs separate consent and carrier registration).
- Any message that is marketing rather than transactional carries an opt-out line. When someone replies STOP, set `opted_out` to `yes` in their row (this pack does not read your inbox).
- Text from forms is HTML-escaped before it goes into an email, and line breaks are stripped from subject lines.

## Limits

- No guarantee of payment. Reminders cannot verify whether a client actually paid; you update the status.
- The Google Sheets steps (`appendOrUpdate` / `update`) and Gmail steps follow n8n's current node schemas but were not run against live Google accounts in the build environment. Test with your own sheet in dry-run-off mode on one test row first, and re-select a field if n8n asks you to after import.
- Daily schedules run once a day in your n8n's timezone setting; dates are `YYYY-MM-DD`.

## Tests

Run `./sample-data/curl-tests.sh https://YOUR-N8N/webhook` (use `/webhook-test` while building). Logic is covered by automated tests in the source repo (`node --test test/`).

Support: this is a template, not a managed service. Installation help is a separate paid service.
