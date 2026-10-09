# Customer Support Triage for n8n

Every request logged, categorized and prioritized, with a draft reply waiting for your review.

**For:** Small SaaS companies and help desks without a ticketing system. **Built and tested with n8n 2.42.5.** Needs Gmail and Google Sheets credentials.

## What's inside

| # | Workflow file | What it does | Lite |
|---|---|---|---|
| 1 | `workflows/1-ticket-intake-and-triage.json` | Webhook `support-ticket`: validates the request, ignores same-day duplicates, logs it to the **Tickets** tab, tags/routes it with the rules in the Config, emails the sender an acknowledgement, creates a reply DRAFT in Gmail for you to review, alerts you. | yes |
| 2 | `workflows/2-update-ticket.json` | Webhook `support-update`: updates one row in **Tickets**, emails the customer. | yes |
| 3 | `workflows/3-sla-breach-watch.json` | Runs weekdays at 09:00, 15:00: emails a list of tickets that need attention. |  |
| 4 | `workflows/4-weekly-support-report.json` | Runs Mondays at 08:00: emails a metrics summary (last 7 days vs the period before). |  |
| 5 | `workflows/5-error-alert.json` | Emails you when any workflow fails (set it as the Error Workflow). | yes |

**Lite** = the workflows marked yes ($39 test price). **Pro** = all 5 ($69 test price).

## Setup (about 30 minutes)

1. **Make the sheet.** Create one Google Sheet with these tabs, named exactly: `Tickets`. Paste each header row from `sheets/<Tab>.csv` into row 1 of its tab. Copy the sheet ID from the URL.
2. **Import** every workflow JSON into n8n (Workflows > Import from file) and select your credentials on each Gmail / Google Sheets node. Nodes that need other credentials have a sticky note saying so.
3. **Edit the `Config` node** in each workflow. The top part (business name, your email, links, sheet ID, timezone, and any pack settings) must be the same in every workflow. The `flow` section is that workflow's own settings and message wording; edit the wording freely.
4. **Dry run first.** `dry_run` ships as `true`: webhooks validate and return a preview, and nothing is sent or written. Test with `sample-data/curl-tests.sh`, then set `dry_run` to `false` in every workflow.
5. **Activate** the workflows. Set the Error Alert workflow as the *Error Workflow* in the settings of the others.

## Webhooks

Each webhook is `POST https://YOUR-N8N/webhook/<path>` with a JSON body. Optional: set `webhook_secret` in Config and send the same value in an `x-webhook-secret` header. Responses: `200` accepted (or duplicate), `422` invalid input with a list of errors, `401` wrong secret.

### `support-ticket`: Ticket Intake And Triage

| Field | Required | Type / values | Example |
|---|---|---|---|
| `name` | yes | text | Casey Dunn |
| `email` | yes | email | casey@example.test |
| `subject` | yes | text | I was charged twice this month |
| `message` | yes | text | Hi, I see two charges for my subscriptio... |
| `channel` | no | one of: Web form, Email, Chat, Other | Web form |

### `support-update`: Update Ticket

| Field | Required | Type / values | Example |
|---|---|---|---|
| `ticket_id` | yes | text | Tabc123 |
| `email` | yes | email | casey@example.test |
| `name` | no | text | Casey Dunn |
| `subject` | no | text | Billing question |
| `status` | yes | one of: open, pending, resolved, closed | resolved |
| `assigned_to` | no | text | Sam |

## Google Sheet tabs

- **Tickets**: `ticket_id, created_at, name, email, subject, message, channel, status, priority, category, assigned_to, sla_due, sla_date, updated_at`

Column names must match exactly. Columns that only some workflows use are blank until those workflows run.

## Settings in Config

`business_name`, `dry_run`, `optout_footer`, `owner_email`, `sheet_id`, `sla_hours`, `timezone`, `webhook_secret`

## Notes: read before going live

- Categories and priorities come from KEYWORD RULES (no AI), which you can read and edit in the intake Config (`tags`). They are a first pass and will sometimes be wrong; the sheet's category/priority columns can be corrected by hand.
- Reply DRAFTS are created in Gmail for a human to edit and send. Nothing but the receipt is sent automatically. Placeholders like [WRITE YOUR REPLY] must be replaced before sending.
- The receipt promises a response target (`sla_hours` in Config). Set realistic hours; only promise what you can meet.
- SLA dates have daily granularity. The breach watch runs twice on weekdays.
- Tickets arrive through the `support-ticket` webhook (your contact form, Zapier/Make, or a forwarding tool). It does not read your inbox.
- Email only. No SMS is included (SMS needs separate consent and carrier registration).
- Any message that is marketing rather than transactional carries an opt-out line. When someone replies STOP, set `opted_out` to `yes` in their row (this pack does not read your inbox).
- Text from forms is HTML-escaped before it goes into an email, and line breaks are stripped from subject lines.

## Limits

- Not a full helpdesk: no threaded conversations, attachments, or agent assignments beyond the assigned_to column.
- The Google Sheets steps (`appendOrUpdate` / `update`) and Gmail steps follow n8n's current node schemas but were not run against live Google accounts in the build environment. Test with your own sheet in dry-run-off mode on one test row first, and re-select a field if n8n asks you to after import.
- Daily schedules run once a day in your n8n's timezone setting; dates are `YYYY-MM-DD`.

## Tests

Run `./sample-data/curl-tests.sh https://YOUR-N8N/webhook` (use `/webhook-test` while building). Logic is covered by automated tests in the source repo (`node --test test/`).

Support: this is a template, not a managed service. Installation help is a separate paid service.
