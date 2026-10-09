# n8n Packs — Listing Pack (Gumroad / Etsy / n8n community where allowed)

Two packs built. Prices are test hypotheses, not market-verified. Competitor evidence in the plan: bulk bundles sell for ~$15 with visible sales; curated, outcome-specific packs are the differentiator, so lead with the outcome and the tested setup, not the node count.

| Pack | Lite (3 workflows) | Pro (all) | Install add-on |
|---|---:|---:|---|
| Agency Client Onboarding | $29 (workflows 1, 2, 4) | $49 (4 workflows + Sheets templates) | via Fiverr gig only, keep orders on-platform |
| Cleaning Lead-to-Booking | $29 (workflows 1, 2, 5) | $49 (5 workflows) | same |

Zip each pack folder (`workflows/`, `sheets/`, `sample-data/`, `logic/`, `README.md`) as the download. Lite = delete the extra workflows from the zip.

## Honest claims to make
- "Tested on n8n 2.42.5." True. "Logic covered by 22 automated tests." True.
- Do NOT say "tested with live Gmail/Sheets" until you do it (checklist below).
- Say what it costs to run: n8n hosting + free Gmail/Sheets. No hidden API fees.
- No reviews/sales claims. No "set and forget". It's a template with a 20-30 minute setup.

## Listing copy: Agency Client Onboarding

**Title:** n8n Agency Client Onboarding Automation | Welcome Email, Drive Folder, Task Checklist, Kickoff Reminders | Google Sheets + Gmail

**Description:**
Stop onboarding clients by hand. When a deal is won, this n8n pack sends the welcome email, creates the client folder in Google Drive, logs the client in Google Sheets, builds a 6-step onboarding checklist with due dates, reminds the client the day before kickoff, and emails your project managers a daily digest of overdue tasks.

INCLUDED
- 4 importable n8n workflows (.json)
- Google Sheets header templates
- Step-by-step README (about 20 minutes to set up)
- Sample requests and curl tests
- Built-in dry-run mode so you can test without sending anything

BUILT-IN SAFETY
- Duplicate deals are ignored
- Optional webhook secret
- All text is escaped before it goes in an email
- Never asks for passwords

REQUIREMENTS: n8n (self-hosted or Cloud), a Google account (Gmail, Sheets, Drive). Tested on n8n 2.42.5. This is a template, not a managed service.

## Listing copy: Cleaning Business Lead-to-Booking

**Title:** n8n Cleaning Business Automation | Instant Estimate, Follow-Ups, Booking Confirmation, Reminders | Lead to Booking

**Description:**
Answer every lead in seconds, follow up automatically, and never forget a reminder. When someone fills out your website form, this n8n pack emails them an instant price range (from YOUR rates), alerts you, and logs the lead. It follows up on day 2 and day 7 if they haven't booked, sends a confirmation with a calendar event when you book, a reminder the day before, a feedback request after the clean, and a rebook nudge a month later.

INCLUDED
- 5 importable n8n workflows (.json)
- Google Sheets template for leads
- README with setup in about 30 minutes
- Sample requests and curl tests
- Dry-run mode

DONE RIGHT
- Out-of-area leads get a polite decline
- Follow-ups stop when someone books or opts out
- Review requests go to every customer (no review gating)
- Email only, no SMS

REQUIREMENTS: n8n, Gmail, Google Sheets (Calendar optional). Estimates are ranges, not final quotes. Tested on n8n 2.42.5. Template, not a managed service.

Cross-sell: pairs with the Cleaning Job Profit & Quote Calculator (set your hourly price from real costs).

## Pre-publish checklist (human)
1. Import all workflows into a real n8n, connect real Gmail + Sheets + Drive/Calendar test accounts, run the curl tests with `dry_run` false, check each email arrives and sheet rows update. Fix anything and re-run `python3 build.py`.
2. Confirm the Sheets `appendOrUpdate` node updates the right row after a follow-up (this is the most likely thing to need tweaking).
3. Add a screen recording (30-60s) of the dry-run curl tests and of a real run.
4. Add license text (single business use, no resale).
5. Check current platform fees and rules for selling n8n templates.
6. Tell n8n community buyers it is unofficial; don't imply n8n endorsement.
