# Stripe Failed-Payment Recovery for n8n

Recover revenue from failed subscription payments with timely, polite reminders.

**For:** SaaS and subscription founders using Stripe Billing. **Built and tested with n8n 2.42.5.** Needs Gmail and Google Sheets credentials plus the credentials named in each workflow's sticky notes.

## What's inside

| # | Workflow file | What it does | Lite |
|---|---|---|---|
| 1 | `workflows/1-payment-failed.json` | Fires on invoice.payment_failed (stripeTrigger). Needs your credential. | yes |
| 2 | `workflows/2-dunning-sequence.json` | Runs daily at 10:00 over **FailedPayments**: sends at most one email per row per run, steps at (day +3; day +7; day +12) relative to `failed_at`. Never repeats a step. Only rows with status open. | yes |
| 3 | `workflows/3-payment-recovered.json` | Fires on invoice.paid (stripeTrigger). Needs your credential. |  |
| 4 | `workflows/4-subscription-status-sync.json` | Fires on customer.subscription.updated, customer.subscription.deleted (stripeTrigger). Needs your credential. |  |
| 5 | `workflows/5-weekly-recovery-report.json` | Runs Mondays at 08:00: emails a metrics summary (last 7 days vs the period before). |  |
| 6 | `workflows/6-error-alert.json` | Emails you when any workflow fails (set it as the Error Workflow). | yes |

**Lite** = the workflows marked yes ($49 test price). **Pro** = all 6 ($79 test price).

## Setup (about 30 minutes)

1. **Make the sheet.** Create one Google Sheet with these tabs, named exactly: `FailedPayments`, `Subscribers`. Paste each header row from `sheets/<Tab>.csv` into row 1 of its tab. Copy the sheet ID from the URL.
2. **Import** every workflow JSON into n8n (Workflows > Import from file) and select your credentials on each Gmail / Google Sheets node. Nodes that need other credentials have a sticky note saying so.
3. **Edit the `Config` node** in each workflow. The top part (business name, your email, links, sheet ID, timezone, and any pack settings) must be the same in every workflow. The `flow` section is that workflow's own settings and message wording; edit the wording freely.
4. **Dry run first.** `dry_run` ships as `true`: webhooks validate and return a preview, and nothing is sent or written. Test with `sample-data/curl-tests.sh`, then set `dry_run` to `false` in every workflow.
5. **Activate** the workflows. Set the Error Alert workflow as the *Error Workflow* in the settings of the others.

## Google Sheet tabs

- **FailedPayments**: `invoice_id, customer_id, email, name, amount, amount_display, currency, attempt_count, failed_at, hosted_invoice_url, subscription_id, status, d0_sent, d1_sent, d2_sent, d3_sent, recovered_at, opted_out`
- **Subscribers**: `subscription_id, customer_id, status, cancel_at_period_end, current_period_end, price_id, updated_at`

Column names must match exactly. Columns that only some workflows use are blank until those workflows run.

## Settings in Config

`billing_portal_url`, `business_name`, `dry_run`, `optout_footer`, `owner_email`, `send_immediate_email`, `send_recovery_email`, `sheet_id`, `timezone`, `webhook_secret`

## Notes: read before going live

- Test in Stripe TEST mode first (Stripe CLI `stripe trigger invoice.payment_failed`). The Stripe Trigger node registers its own webhook and verifies Stripe's signature.
- Stripe Billing already has Smart Retries and customer email settings. Turn off Stripe's own failed-payment emails (or set `send_immediate_email` to false) so customers aren't emailed twice.
- Never email card data. Emails link only to Stripe's hosted invoice page and your Customer Portal.
- Duplicate events are ignored (event id), and repeated retries of the same invoice only update the attempt count.
- Reminders are transactional and courteous. Check your terms of service and local rules for payment reminders. This is not legal advice.
- The workflow stops reminding as soon as Stripe reports the invoice paid. You can also set `opted_out` = `yes` or change `status` in the sheet to stop it.
- Email only. No SMS is included (SMS needs separate consent and carrier registration).
- Any message that is marketing rather than transactional carries an opt-out line. When someone replies STOP, set `opted_out` to `yes` in their row (this pack does not read your inbox).
- Text from forms is HTML-escaped before it goes into an email, and line breaks are stripped from subject lines.

## Limits

- Not exercised against a live Stripe account in the build environment: the logic is unit-tested with Stripe-shaped sample events, and the workflows import into n8n. Run it in test mode before going live.
- Currency amounts are not converted.
- The Google Sheets steps (`appendOrUpdate` / `update`) and Gmail steps follow n8n's current node schemas but were not run against live Google accounts in the build environment. Test with your own sheet in dry-run-off mode on one test row first, and re-select a field if n8n asks you to after import.
- Daily schedules run once a day in your n8n's timezone setting; dates are `YYYY-MM-DD`.

## Tests

Run `./sample-data/curl-tests.sh https://YOUR-N8N/webhook` (use `/webhook-test` while building). Logic is covered by automated tests in the source repo (`node --test test/`).

Support: this is a template, not a managed service. Installation help is a separate paid service.
