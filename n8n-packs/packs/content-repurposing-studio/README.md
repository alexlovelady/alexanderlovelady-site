# Content Repurposing Studio for n8n

Turn one transcript into a full set of drafts, with every piece waiting for your approval.

**For:** Creators, podcasters and small marketing teams. **Built and tested with n8n 2.42.5.** Needs Gmail and Google Sheets credentials plus the credentials named in each workflow's sticky notes.

## What's inside

| # | Workflow file | What it does | Lite |
|---|---|---|---|
| 1 | `workflows/1-submit-content-for-drafting.json` | Webhook that sends a transcript to the AI, then saves drafts for your approval. | yes |
| 2 | `workflows/2-approve-or-reject-draft.json` | Webhook `content-approve`: updates one row in **Drafts**. | yes |
| 3 | `workflows/3-publishing-calendar.json` | Runs weekdays at 08:00: emails a list of drafts that need attention. |  |
| 4 | `workflows/4-drafts-waiting-for-approval.json` | Runs weekdays at 09:00: emails a list of drafts that need attention. |  |
| 5 | `workflows/5-error-alert.json` | Emails you when any workflow fails (set it as the Error Workflow). | yes |

**Lite** = the workflows marked yes ($39 test price). **Pro** = all 5 ($69 test price).

## Setup (about 30 minutes)

1. **Make the sheet.** Create one Google Sheet with these tabs, named exactly: `Content`, `Drafts`. Paste each header row from `sheets/<Tab>.csv` into row 1 of its tab. Copy the sheet ID from the URL.
2. **Import** every workflow JSON into n8n (Workflows > Import from file) and select your credentials on each Gmail / Google Sheets node. Nodes that need other credentials have a sticky note saying so.
3. **Edit the `Config` node** in each workflow. The top part (business name, your email, links, sheet ID, timezone, and any pack settings) must be the same in every workflow. The `flow` section is that workflow's own settings and message wording; edit the wording freely.
4. **Dry run first.** `dry_run` ships as `true`: webhooks validate and return a preview, and nothing is sent or written. Test with `sample-data/curl-tests.sh`, then set `dry_run` to `false` in every workflow.
5. **Activate** the workflows. Set the Error Alert workflow as the *Error Workflow* in the settings of the others.

## Webhooks

Each webhook is `POST https://YOUR-N8N/webhook/<path>` with a JSON body. Optional: set `webhook_secret` in Config and send the same value in an `x-webhook-secret` header. Responses: `200` accepted (or duplicate), `422` invalid input with a list of errors, `401` wrong secret.

### `content-submit`: Submit Content For Drafting

| Field | Required | Type / values | Example |
|---|---|---|---|
| `title` | yes | text | Episode 42: How we cut onboarding time i... |
| `transcript` | yes | text | Today we talk about onboarding. The main... |
| `content_url` | no | url | https://example.com/episodes/42 |
| `author` | no | text | Alex |
| `tone` | no | one of: neutral, friendly, professional, playful | friendly |

### `content-approve`: Approve Or Reject Draft

| Field | Required | Type / values | Example |
|---|---|---|---|
| `draft_id` | yes | text | CNabc123-1 |
| `status` | yes | one of: approved, rejected | approved |
| `scheduled_date` | no | date | 2026-10-20 |

## Google Sheet tabs

- **Content**: `content_id, created_at, title, author, source_url, tone, status, draft_count`
- **Drafts**: `draft_id, content_id, asset_type, platform, title, text, status, scheduled_date, created_at, updated_at`

Column names must match exactly. Columns that only some workflows use are blank until those workflows run.

## Settings in Config

`ai_max_tokens`, `ai_model`, `audience`, `business_name`, `dry_run`, `max_chars`, `max_social`, `optout_footer`, `owner_email`, `sheet_id`, `timezone`, `voice`, `webhook_secret`

## Notes: read before going live

- AI STEP: the `Call AI` node sends the transcript to Anthropic's Messages API using YOUR API key (HTTP Header Auth credential: header `x-api-key`). Usage is billed to you; a typical 5,000-word transcript costs on the order of cents to a few tens of cents, depending on the model. Check current pricing. The model name is a setting (`ai_model`) in Config.
- Do not submit confidential transcripts unless your agreements with the speakers and your AI provider's terms allow it.
- AI drafts can contain mistakes. The prompt tells the model to use only the transcript, but you must review every draft. Nothing is published automatically; approved drafts only appear on the publishing calendar email.
- If the AI response is malformed, the content row is marked `ai_error` and you are emailed. The pack never guesses.
- Transcripts longer than `max_chars` are truncated before sending (the Content row notes the title; truncation is logged in the execution).
- Email only. No SMS is included (SMS needs separate consent and carrier registration).
- Any message that is marketing rather than transactional carries an opt-out line. When someone replies STOP, set `opted_out` to `yes` in their row (this pack does not read your inbox).
- Text from forms is HTML-escaped before it goes into an email, and line breaks are stripped from subject lines.

## Limits

- Tested end-to-end only up to the AI call (dry run) in the build environment. The parsing logic is unit-tested against sample AI responses (valid, fenced, malformed). Run one real transcript before relying on it.
- The Google Sheets steps (`appendOrUpdate` / `update`) and Gmail steps follow n8n's current node schemas but were not run against live Google accounts in the build environment. Test with your own sheet in dry-run-off mode on one test row first, and re-select a field if n8n asks you to after import.
- Daily schedules run once a day in your n8n's timezone setting; dates are `YYYY-MM-DD`.

## Tests

Run `./sample-data/curl-tests.sh https://YOUR-N8N/webhook` (use `/webhook-test` while building). Logic is covered by automated tests in the source repo (`node --test test/`).

Support: this is a template, not a managed service. Installation help is a separate paid service.
