# Etsy Seller Operations for n8n

Never miss a ship-by date, and know your numbers every Monday, from one Google Sheet.

**For:** Etsy and handmade-goods sellers who run orders from a spreadsheet. **Built and tested with n8n 2.42.5.** Needs Gmail and Google Sheets credentials.

## What's inside

| # | Workflow file | What it does | Lite |
|---|---|---|---|
| 1 | `workflows/1-log-an-order.json` | Webhook `etsy-order`: validates the request, ignores same-day duplicates, logs it to the **Orders** tab. | yes |
| 2 | `workflows/2-mark-order-shipped.json` | Webhook `etsy-shipped`: updates one row in **Orders** (sets status=`shipped`). | yes |
| 3 | `workflows/3-ship-by-queue.json` | Runs daily at 08:00: emails a list of orders that need attention. | yes |
| 4 | `workflows/4-log-an-expense.json` | Webhook `etsy-expense`: validates the request, ignores same-day duplicates, logs it to the **Expenses** tab. |  |
| 5 | `workflows/5-low-stock-alert.json` | Runs Mondays at 08:00: emails a list of inventory that need attention. |  |
| 6 | `workflows/6-weekly-shop-summary.json` | Runs Mondays at 08:00: emails a metrics summary (last 7 days vs the period before). |  |
| 7 | `workflows/7-error-alert.json` | Emails you when any workflow fails (set it as the Error Workflow). | yes |

**Lite** = the workflows marked yes ($29 test price). **Pro** = all 7 ($49 test price).

## Setup (about 30 minutes)

1. **Make the sheet.** Create one Google Sheet with these tabs, named exactly: `Orders`, `Expenses`, `Inventory`. Paste each header row from `sheets/<Tab>.csv` into row 1 of its tab. Copy the sheet ID from the URL.
2. **Import** every workflow JSON into n8n (Workflows > Import from file) and select your credentials on each Gmail / Google Sheets node. Nodes that need other credentials have a sticky note saying so.
3. **Edit the `Config` node** in each workflow. The top part (business name, your email, links, sheet ID, timezone, and any pack settings) must be the same in every workflow. The `flow` section is that workflow's own settings and message wording; edit the wording freely.
4. **Dry run first.** `dry_run` ships as `true`: webhooks validate and return a preview, and nothing is sent or written. Test with `sample-data/curl-tests.sh`, then set `dry_run` to `false` in every workflow.
5. **Activate** the workflows. Set the Error Alert workflow as the *Error Workflow* in the settings of the others.

## Webhooks

Each webhook is `POST https://YOUR-N8N/webhook/<path>` with a JSON body. Optional: set `webhook_secret` in Config and send the same value in an `x-webhook-secret` header. Responses: `200` accepted (or duplicate), `422` invalid input with a list of errors, `401` wrong secret.

### `etsy-order`: Log An Order

| Field | Required | Type / values | Example |
|---|---|---|---|
| `order_id` | yes | text | 3012345678 |
| `name` | no | text | Buyer Name |
| `item` | yes | text | Walnut cutting board |
| `qty` | no | number | 1 |
| `price` | yes | number | 64 |
| `ship_by` | yes | date | 2026-10-16 |
| `notes` | no | text | Gift message: Happy birthday! |

### `etsy-shipped`: Mark Order Shipped

| Field | Required | Type / values | Example |
|---|---|---|---|
| `order_id` | yes | text | 3012345678 |
| `tracking` | no | text | 9400111899223344556677 |

### `etsy-expense`: Log An Expense

| Field | Required | Type / values | Example |
|---|---|---|---|
| `date` | no | date | 2026-10-10 |
| `category` | yes | one of: Supplies, Shipping, Fees, Software, Advertising, Other | Supplies |
| `vendor` | no | text | Wood Supply Co |
| `amount` | yes | number | 42.5 |
| `note` | no | text | Walnut boards |

## Google Sheet tabs

- **Orders**: `order_id, created_at, name, item, qty, price, ship_by, notes, status, tracking, shipped_at, updated_at`
- **Expenses**: `expense_id, created_at, date, category, vendor, amount, note`
- **Inventory**: `sku, item, qty, reorder_point`

Column names must match exactly. Columns that only some workflows use are blank until those workflows run.

## Settings in Config

`business_name`, `dry_run`, `optout_footer`, `owner_email`, `sheet_id`, `timezone`, `webhook_secret`

## Notes: read before going live

- This pack does NOT call the Etsy API (it requires an approved developer app). Orders enter through the `etsy-order` webhook (send from Zapier/Make, a form, or a script) or by pasting rows into the sheet.
- It sends no emails to buyers. Use Etsy's own messaging for buyer communication to stay within Etsy's rules.
- Profit figures are only as accurate as the expenses you log, and are not tax advice.
- Email only. No SMS is included (SMS needs separate consent and carrier registration).
- Any message that is marketing rather than transactional carries an opt-out line. When someone replies STOP, set `opted_out` to `yes` in their row (this pack does not read your inbox).
- Text from forms is HTML-escaped before it goes into an email, and line breaks are stripped from subject lines.

## Limits

- Inventory quantities are maintained by you in the Inventory sheet; the pack only alerts.
- The Google Sheets steps (`appendOrUpdate` / `update`) and Gmail steps follow n8n's current node schemas but were not run against live Google accounts in the build environment. Test with your own sheet in dry-run-off mode on one test row first, and re-select a field if n8n asks you to after import.
- Daily schedules run once a day in your n8n's timezone setting; dates are `YYYY-MM-DD`.

## Tests

Run `./sample-data/curl-tests.sh https://YOUR-N8N/webhook` (use `/webhook-test` while building). Logic is covered by automated tests in the source repo (`node --test test/`).

Support: this is a template, not a managed service. Installation help is a separate paid service.
