# Newsletter Research & Publishing for n8n

Collect, filter and organize the week's stories automatically, then get a ready-to-edit draft.

**For:** Solo newsletter operators and small editorial teams. **Built and tested with n8n 2.42.5.** Needs Gmail and Google Sheets credentials plus the credentials named in each workflow's sticky notes.

## What's inside

| # | Workflow file | What it does | Lite |
|---|---|---|---|
| 1 | `workflows/1-collect-stories.json` | Runs daily at 06:00: reads your RSS feeds, filters and de-duplicates stories. | yes |
| 2 | `workflows/2-approve-or-reject-story.json` | Webhook `newsletter-approve`: updates one row in **Stories**. | yes |
| 3 | `workflows/3-stories-waiting-for-review.json` | Runs daily at 06:30: emails a list of stories that need attention. |  |
| 4 | `workflows/4-build-newsletter-draft.json` | Runs Thursdays at 09:00: builds a newsletter DRAFT from approved stories. | yes |
| 5 | `workflows/5-error-alert.json` | Emails you when any workflow fails (set it as the Error Workflow). | yes |

**Lite** = the workflows marked yes ($29 test price). **Pro** = all 5 ($49 test price).

## Setup (about 30 minutes)

1. **Make the sheet.** Create one Google Sheet with these tabs, named exactly: `Stories`. Paste each header row from `sheets/<Tab>.csv` into row 1 of its tab. Copy the sheet ID from the URL.
2. **Import** every workflow JSON into n8n (Workflows > Import from file) and select your credentials on each Gmail / Google Sheets node. Nodes that need other credentials have a sticky note saying so.
3. **Edit the `Config` node** in each workflow. The top part (business name, your email, links, sheet ID, timezone, and any pack settings) must be the same in every workflow. The `flow` section is that workflow's own settings and message wording; edit the wording freely.
4. **Dry run first.** `dry_run` ships as `true`: webhooks validate and return a preview, and nothing is sent or written. Test with `sample-data/curl-tests.sh`, then set `dry_run` to `false` in every workflow.
5. **Activate** the workflows. Set the Error Alert workflow as the *Error Workflow* in the settings of the others.

## Webhooks

Each webhook is `POST https://YOUR-N8N/webhook/<path>` with a JSON body. Optional: set `webhook_secret` in Config and send the same value in an `x-webhook-secret` header. Responses: `200` accepted (or duplicate), `422` invalid input with a list of errors, `401` wrong secret.

### `newsletter-approve`: Approve Or Reject Story

| Field | Required | Type / values | Example |
|---|---|---|---|
| `story_id` | yes | text | Sabc123 |
| `status` | yes | one of: approved, rejected | approved |
| `editor_note` | no | text | Why it matters: affects our readers' bud... |

## Google Sheet tabs

- **Stories**: `story_id, created_at, title, link, source, published, summary, score, status, editor_note, drafted_at, updated_at`

Column names must match exactly. Columns that only some workflows use are blank until those workflows run.

## Settings in Config

`business_name`, `dry_run`, `editor_email`, `exclude_keywords`, `feeds`, `include_keywords`, `intro_text`, `max_age_days`, `max_items`, `max_new_per_run`, `newsletter_name`, `optout_footer`, `owner_email`, `sheet_id`, `timezone`, `webhook_secret`

## Notes: read before going live

- Feeds, keywords and limits are set in the Config node. Replace the example feeds with your own.
- Stories keep only the title, link, source and a short (300 character) plain-text snippet from the feed, with a link back to the source. Check each source's terms before republishing excerpts, and write your own summaries where required.
- The weekly workflow creates a DRAFT email in the editor's Gmail. It never sends to subscribers. Paste the draft into your email platform (Substack, Beehiiv, Mailchimp...) and add your unsubscribe link.
- No AI summarization is used. Summaries are the feed's own text, shortened.
- Email only. No SMS is included (SMS needs separate consent and carrier registration).
- Any message that is marketing rather than transactional carries an opt-out line. When someone replies STOP, set `opted_out` to `yes` in their row (this pack does not read your inbox).
- Text from forms is HTML-escaped before it goes into an email, and line breaks are stripped from subject lines.

## Limits

- Duplicate detection is by link (tracking parameters removed). Syndicated copies with different links can slip through.
- RSS feeds that return only titles produce stories with empty summaries.
- The Google Sheets steps (`appendOrUpdate` / `update`) and Gmail steps follow n8n's current node schemas but were not run against live Google accounts in the build environment. Test with your own sheet in dry-run-off mode on one test row first, and re-select a field if n8n asks you to after import.
- Daily schedules run once a day in your n8n's timezone setting; dates are `YYYY-MM-DD`.

## Tests

Run `./sample-data/curl-tests.sh https://YOUR-N8N/webhook` (use `/webhook-test` while building). Logic is covered by automated tests in the source repo (`node --test test/`).

Support: this is a template, not a managed service. Installation help is a separate paid service.
