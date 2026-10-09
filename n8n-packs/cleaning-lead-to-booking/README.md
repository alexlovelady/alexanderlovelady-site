# Cleaning Business Lead-to-Booking Pack for n8n

From website enquiry to booked clean: instant estimate email, owner alert, automatic follow-ups for people who don't book, booking confirmation with calendar event, day-before reminders, post-clean feedback request, and a one-month rebook nudge.

**Built and tested with n8n 2.42.5.** Needs Gmail, Google Sheets and (optional) Google Calendar credentials.

## What's inside

| File | What it does |
|---|---|
| `workflows/1-new-lead-instant-estimate.json` | Webhook for your website form. Validates, blocks same-day duplicates, estimates a price range from your rates, emails the customer (or politely declines out-of-area leads), alerts you, logs the lead. |
| `workflows/2-quote-follow-ups.json` | Daily 10:00. Follow-up #1 after 2 days and #2 after 7 days to leads who haven't booked. Stops on booking or when you mark them stopped. |
| `workflows/3-booking-confirmation.json` | Webhook when you book a job. Updates the lead, emails a confirmation, creates a calendar event. |
| `workflows/4-daily-touchpoints.json` | Daily 17:00. Day-before reminder, next-day feedback request, 30-day rebook nudge for one-time clients. |
| `workflows/5-error-alert.json` | Emails you when a workflow fails. |
| `sheets/Leads.csv` | Header row for the `Leads` tab. |
| `sample-data/` | Example requests and curl tests. |
| `logic/` | The JavaScript inside the Code nodes. |

**Lite = workflows 1 + 2 + 5. Pro = all five.**

## Setup (about 30 minutes)

1. Create a Google Sheet with one tab named `Leads`. Paste the header row from `sheets/Leads.csv` into row 1. Copy the sheet ID.
2. Import the five JSON files into n8n and select your credentials on each Gmail / Sheets / Calendar node. (Delete the Calendar node if you don't use it.)
3. Edit the `Config` node (identical in each workflow): business name, phone, owner email, booking and review links, sheet ID, timezone, **service ZIP codes** (leave `[]` to serve everywhere), and **pricing**.
4. **Set pricing from your real costs.** Defaults are placeholders: `price_per_labor_hour` 60, minimum $90, ±15% range. Use the Job Profit & Quote Calculator (sold separately) or your own numbers so quotes are profitable.
5. `dry_run` ships as `true` (previews only; sends and writes nothing). Test with `sample-data/curl-tests.sh`, then set it to `false` in workflows 1 and 3.
6. Activate. Post your website form to the lead webhook URL (any form tool that can send JSON: Tally, Typeform, Jotform, WordPress plugins, Zapier).
7. Run your day by updating the `status` column in the sheet: `quoted` -> `booked` (set automatically by workflow 3) -> `completed` (you set this after the job). Touchpoints key off status and `booking_date`.

## Lead webhook body

```json
{ "name": "Sam Ray", "email": "sam@ray.test", "phone": "555-0100", "service": "standard",
  "bedrooms": 3, "bathrooms": 2, "sqft": 1800, "frequency": "one-time", "zip": "27909",
  "preferred_date": "2026-10-20", "notes": "Two dogs" }
```
`service`: `standard`, `deep`, `move-out` (edit multipliers in Config). `frequency`: `one-time`, `monthly`, `biweekly`, `weekly`. Required: `name`, `email`.

## Booking webhook body

```json
{ "lead_id": "Labc123", "email": "sam@ray.test", "name": "Sam Ray", "date": "2026-10-20",
  "start_time": "09:30", "duration_hours": 3, "address": "1 Main St" }
```
Call it from your scheduling tool, or trigger it manually with curl when you confirm a job.

## Compliance and safety behavior

- Customers only get emails after they submit the form asking for an estimate. Follow-ups include "Reply STOP". **When someone replies STOP, you must set `followups_stopped` to `yes` in their row** (this pack does not read your inbox). Follow-ups and the feedback/rebook messages skip stopped leads.
- **No review gating.** The feedback email sends the review link to every customer, whatever their experience, and invites unhappy customers to reply. Do not change this to hide the link from unhappy customers; that breaks Google and Yelp rules.
- Email only. No SMS is included, since SMS needs separate consent and carrier registration.
- Estimates are labeled as estimates, not quotes. Make sure that wording fits your business and local rules.
- All form text is HTML-escaped before it goes into an email; lead notes are truncated to 500 characters.
- Duplicate protection: the same email + service + date submitted twice on the same day is ignored.

## Requirements and costs

- n8n (self-hosted or n8n Cloud). Gmail sending limits apply (about 500/day for free Gmail).
- No other paid APIs.

## Known limits

- Not tested against live Gmail / Sheets / Calendar in the build environment. Node parameters follow n8n's current schemas; re-select fields if n8n prompts you.
- Sheet headers must match `Leads.csv` exactly.
- The estimate formula (hours from bedrooms and bathrooms x your hourly price) is simple. It will not replace an in-person quote for unusual homes.
- The workflows don't replace a booking/payment system. If you use The Cleaners Place or another scheduler, send its booking webhook to workflow 3.

Support: this is a template, not a managed service. Installation help is sold separately.
