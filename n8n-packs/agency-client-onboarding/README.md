# Agency Client Onboarding Pack for n8n

Turns "deal won" into a started onboarding: welcome email, shared folder, client log, a 6-step task checklist, a kickoff reminder, and a daily task digest for your project managers.

**Built and tested with n8n 2.42.5.** Other versions may work but are untested. Needs Gmail, Google Sheets and Google Drive credentials in your n8n.

## What's inside

| File | What it does |
|---|---|
| `workflows/1-deal-won-to-kickoff.json` | Webhook when a deal is won. Validates, blocks duplicate deals, emails the client, creates a Drive folder, logs the client, creates 6 tasks. |
| `workflows/2-kickoff-reminder.json` | Daily 8:00. Emails each client whose kickoff is tomorrow (once). |
| `workflows/3-daily-task-digest.json` | Weekdays 8:00. One email per PM listing overdue and soon-due tasks. |
| `workflows/4-error-alert.json` | Emails you when any workflow fails (set it as the Error Workflow). |
| `sheets/Clients.csv`, `sheets/Tasks.csv` | Header rows for the two Google Sheet tabs. |
| `sample-data/` | Example request bodies and curl commands. |
| `logic/` | The plain JavaScript inside the Code nodes, for reading or editing. |

**Lite = workflows 1 + 4. Pro = all four.**

## Setup (about 20 minutes)

1. **Make the sheet.** Create a Google Sheet with two tabs named exactly `Clients` and `Tasks`. Paste the header row from each CSV into row 1. Copy the sheet ID from its URL.
2. **Import.** In n8n: Workflows > Import from file. Import each JSON.
3. **Credentials.** Open each Gmail / Google Sheets / Google Drive node and select your credential (nodes with a note tell you which).
4. **Edit the `Config` node** (first node after the trigger) in every workflow: agency name, your emails, intake form and calendar links, sheet ID, timezone. It is the same JSON in each workflow, so keep them identical.
5. **Dry run first.** `dry_run` ships as `true`: the webhook validates and returns a preview but sends nothing and writes nothing. Test with `sample-data/curl-tests.sh`, then set `dry_run` to `false` in workflow 1's Config.
6. **Activate** the workflows. Set workflow 4 as the *Error Workflow* in the settings of workflows 1-3.
7. **Connect your CRM.** Point a "deal won" automation in your CRM (HubSpot, Pipedrive, Zapier, anything that can POST JSON) at the production webhook URL. Optional: set `webhook_secret` in Config and send the same value in an `x-webhook-secret` header.

## Webhook body (workflow 1)

```json
{
  "deal_id": "D-1001",
  "client_name": "Acme Dental",
  "contact_name": "Jo Lee",
  "contact_email": "jo@acme.test",
  "package": "Growth",
  "project_manager_email": "pm@youragency.com",
  "project_manager_name": "Pat",
  "kickoff_date": "2026-11-02"
}
```
Required: `deal_id`, `client_name`, `contact_name`, `contact_email`, `package`. The rest are optional (kickoff defaults to 3 business days out).

Responses: `200` onboarding started / duplicate, `422` invalid input (with a list of errors), `401` wrong secret.

## Safety behavior

- Duplicate `deal_id`s are ignored (stored in the workflow's static data; only saved on production runs, not when you press Test).
- All text from the webhook is HTML-escaped before it goes into an email.
- The welcome email tells clients not to email passwords. Nothing in this pack asks for or stores credentials.
- The Tasks sheet owns task status. Change `status` to `done` and the task drops out of the digest.

## Requirements and costs

- n8n (self-hosted, or n8n Cloud, which has its own subscription).
- Gmail has sending limits (about 500/day for free Gmail accounts, more for Workspace). This pack sends a handful of emails per client.
- No other paid APIs.

## Known limits

- Not tested against live Gmail / Sheets / Drive accounts in the build environment. Credential-dependent nodes are configured per n8n's current node schemas; if a node asks you to re-select a field after import, that is normal.
- Google Sheets must keep the exact header names from the CSVs.
- The checklist (6 tasks) is defined in `logic/01-prepare-deal.js`; edit it to match your process.
- Dates are `YYYY-MM-DD`. Business-day math skips weekends but not holidays.

Support: this is a template. It is not a managed service and cannot guarantee results for your specific setup. Installation help is sold separately.
