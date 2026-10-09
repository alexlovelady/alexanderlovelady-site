# Shopify Customer Operations for n8n

The small, repeatable customer-ops jobs of a Shopify store, automated.

**For:** Small Shopify stores. **Built and tested with n8n 2.42.5.** Needs Gmail and Google Sheets credentials plus the credentials named in each workflow's sticky notes.

## What's inside

| # | Workflow file | What it does | Lite |
|---|---|---|---|
| 1 | `workflows/1-new-order-alert-and-log.json` | Fires on orders/create (shopifyTrigger). Needs your credential. | yes |
| 2 | `workflows/2-shipment-update-email.json` | Fires on orders/fulfilled (shopifyTrigger). Needs your credential. | yes |
| 3 | `workflows/3-return-request-intake.json` | Webhook `shopify-return`: validates the request, ignores same-day duplicates, logs it to the **Returns** tab, emails the sender an acknowledgement, alerts you. |  |
| 4 | `workflows/4-review-requests.json` | Runs daily at 11:00 over **Orders**: sends at most one email per row per run, steps at (day +7) relative to `fulfilled_at`. Never repeats a step. Only rows with status fulfilled. |  |
| 5 | `workflows/5-low-stock-alert.json` | Runs daily at 08:00: emails Shopify variants at or below the low-stock threshold. |  |
| 6 | `workflows/6-weekly-store-summary.json` | Runs Mondays at 08:00: emails a metrics summary (last 7 days vs the period before). |  |
| 7 | `workflows/7-error-alert.json` | Emails you when any workflow fails (set it as the Error Workflow). | yes |

**Lite** = the workflows marked yes ($39 test price). **Pro** = all 7 ($59 test price).

## Setup (about 30 minutes)

1. **Make the sheet.** Create one Google Sheet with these tabs, named exactly: `Orders`, `Returns`. Paste each header row from `sheets/<Tab>.csv` into row 1 of its tab. Copy the sheet ID from the URL.
2. **Import** every workflow JSON into n8n (Workflows > Import from file) and select your credentials on each Gmail / Google Sheets node. Nodes that need other credentials have a sticky note saying so.
3. **Edit the `Config` node** in each workflow. The top part (business name, your email, links, sheet ID, timezone, and any pack settings) must be the same in every workflow. The `flow` section is that workflow's own settings and message wording; edit the wording freely.
4. **Dry run first.** `dry_run` ships as `true`: webhooks validate and return a preview, and nothing is sent or written. Test with `sample-data/curl-tests.sh`, then set `dry_run` to `false` in every workflow.
5. **Activate** the workflows. Set the Error Alert workflow as the *Error Workflow* in the settings of the others.

## Webhooks

Each webhook is `POST https://YOUR-N8N/webhook/<path>` with a JSON body. Optional: set `webhook_secret` in Config and send the same value in an `x-webhook-secret` header. Responses: `200` accepted (or duplicate), `422` invalid input with a list of errors, `401` wrong secret.

### `shopify-return`: Return Request Intake

| Field | Required | Type / values | Example |
|---|---|---|---|
| `order_number` | yes | text | #1042 |
| `name` | yes | text | Dana Cole |
| `email` | yes | email | dana@example.test |
| `item` | yes | text | Ceramic mug |
| `reason` | yes | one of: Damaged, Wrong item, Not as described, Changed my mind, Other | Damaged |
| `resolution` | no | one of: Refund, Exchange, Store credit | Refund |
| `note` | no | text | Handle broke in shipping. |

## Google Sheet tabs

- **Orders**: `order_id, order_number, email, name, total_price, currency, items, ship_to, financial_status, status, created_at, fulfilled_at, tracking, opted_out, review_sent`
- **Returns**: `return_id, created_at, order_number, name, email, item, reason, resolution, note, status`

Column names must match exactly. Columns that only some workflows use are blank until those workflows run.

## Settings in Config

`business_name`, `business_phone`, `dry_run`, `high_value_threshold`, `low_stock_threshold`, `notify_every_order`, `optout_footer`, `owner_email`, `returns_policy_url`, `review_link`, `send_shipping_email`, `sheet_id`, `timezone`, `webhook_secret`

## Notes: read before going live

- Order and shipping workflows use n8n's Shopify Trigger node with a custom-app access token. The low-stock workflow reads products through the Shopify node. Create a custom app with read access to orders and products.
- Shopify already sends order confirmations and shipping notifications. Set `send_shipping_email` to false (or disable Shopify's own) so customers aren't emailed twice. This pack adds a tracking email only if you want it.
- Returns are logged and acknowledged only. Nothing is refunded automatically.
- Review requests go to every fulfilled order (no review gating). Opt-outs are honored through the `opted_out` column.
- Email only. No SMS is included (SMS needs separate consent and carrier registration).
- Any message that is marketing rather than transactional carries an opt-out line. When someone replies STOP, set `opted_out` to `yes` in their row (this pack does not read your inbox).
- Text from forms is HTML-escaped before it goes into an email, and line breaks are stripped from subject lines.

## Limits

- Not exercised against a live Shopify store in the build environment: payload handling is unit-tested with Shopify-shaped sample orders and the workflows import into n8n. Connect a development store and test before going live.
- Low-stock alerts cover only variants with Shopify inventory tracking enabled.
- The Google Sheets steps (`appendOrUpdate` / `update`) and Gmail steps follow n8n's current node schemas but were not run against live Google accounts in the build environment. Test with your own sheet in dry-run-off mode on one test row first, and re-select a field if n8n asks you to after import.
- Daily schedules run once a day in your n8n's timezone setting; dates are `YYYY-MM-DD`.

## Tests

Run `./sample-data/curl-tests.sh https://YOUR-N8N/webhook` (use `/webhook-test` while building). Logic is covered by automated tests in the source repo (`node --test test/`).

Support: this is a template, not a managed service. Installation help is a separate paid service.
