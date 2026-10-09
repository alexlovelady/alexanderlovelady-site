# Fiverr Launch — Handoff Document

**Purpose:** Self-contained brief for a separate chat to (a) publish the Fiverr profile and four gigs and (b) build the portfolio demos. Everything Fiverr-related lives in this `fiverr/` folder. Source plan: `digital_product_ideas_demand_research.md` (Oct 8, 2026).

**Written:** 2026-10-09 · **Seller:** Alexander Lovelady · **Status:** drafts, nothing published

---

## 1. Goal and the real numbers

| Item | Amount |
|---|---:|
| Rent shortfall to cover (on top of $2,400 separate income) | **$2,000 net** |
| Fiverr seller fee | 20% flat (unverified, see §2) |
| **Gross needed to net $2,000** | **$2,500** |
| Plan's original target ($2,000 gross) nets only | $1,600 |

**Timing risk:** Fiverr holds earnings after an order completes (reported as ~14 days for new sellers, see §2). With rent due around Nov 1, orders must be *completed* by about **Oct 18** to clear in time. That is very tight for a brand-new account with no reviews. Treat Fiverr as a way to start revenue, not a guaranteed way to cover November. Keep other income options open (see §9).

**Capacity:** 8+ hrs/day available for delivery. Skill: comfortable with all four gig topics (n8n/Make/Zapier, Claude Code/AI-built apps, Stripe, Excel/CSV).

---

## 2. Fiverr rules to verify in the live interface

Figures below came from third-party blogs, not Fiverr's own help pages, and sources conflict. **Check each in the Fiverr editor before relying on it.**

| Item | Commonly reported | Action |
|---|---|---|
| Gig title | max 80 chars; ~50–60 show in search | Titles below are 56–60 chars |
| Gig description | max 1,200 chars | Descriptions below are under 1,200 |
| Package description | ~100 chars per tier | Tier text below is under 100 |
| Tags | 5 tags, ~20 chars each | 5 listed per gig |
| Seller fee | 20% of everything incl. tips/extras | Price accordingly |
| Payout hold | ~14 days (7 for higher levels?) | Confirm in Seller Help Center |
| Buyer fee | ~5.5% + small-order fee | Buyer pays it, not you |

Sources: [Fiverr character limits guide](https://eduearnhub.com/?p=5875), [Fiverr fees 2026](https://vaultleap.com/blog/fiverr-fees-explained-2026), [gig description formula](https://eduearnhub.com/?p=5620).

**Non-negotiable platform rules:** keep all communication and payment on Fiverr; no sharing emails/phones/links to take buyers off-platform; no fake reviews or fabricated client results; don't imply endorsement by Stripe, Firebase, Anthropic, n8n etc.; use only original demos.

**Account actions are manual.** Claude does not log in to or automate Fiverr. The human pastes text into the editor and reports back any field Fiverr rejects.

---

## 3. Seller profile (paste-ready)

Built only from facts on alexanderlovelady.com. Edit anything that is not accurate.

**Display name:** Alexander Lovelady

**Profile tagline (check length limit in editor):**
> Automation developer · Navy veteran · Security+ certified

**Description:**
```
I'm an automation developer and Navy veteran (9 years) who builds and fixes production software. I run two live SaaS products with real paying customers: The Cleaners Place (scheduling, invoicing and Stripe subscriptions for cleaning businesses) and RentNest (rent collection and property management for landlords). Both use Stripe billing, webhooks and authentication, so I debug the same kinds of problems you are probably facing.

What I fix: broken n8n, Make.com and Zapier workflows; bugs in apps built with Claude Code or other AI tools; Stripe checkout, subscription and webhook issues; and messy Excel/CSV data.

How I work: I reproduce the problem first, fix it, test it, and hand over a short written summary of what changed so you can maintain it. I never need your passwords. Test-mode access, sanitized exports and masked logs are enough, and I ask you to revoke any access when we finish.

I am also CompTIA Security+ certified, so security is part of the fix, not an afterthought.

Send me your error message and what you expected to happen. I will tell you honestly whether I can fix it before you order.
```

**Languages:** English (native/bilingual)
**Skills to add:** n8n, Make.com, Zapier, Stripe, Webhooks, Node.js, Python, Next.js, Firebase, PostgreSQL, Excel, Google Sheets, API integration, Debugging
**Education/certification:** CompTIA Security+ ce (issuer CompTIA; verify link: https://www.credly.com/badges/3206a7a7-f167-4415-943e-aa10ba1968b3/public_url)
**Profile photo:** use the portrait from the site (`public/images/portrait.jpg`) — buyers trust a real face.
**Location:** Elizabeth City, NC, USA

> Do not claim a Fiverr level, ratings, or number of completed orders. You have none yet.

---

## 4. The four gigs (paste-ready)

Prices are launch tests. Revisit after the first 3–5 orders. Fiverr usually asks for a category/subcategory: pick the closest match in the live editor (suggestions given).

### Gig 1 — n8n / Make.com / Zapier repair

- **Category (suggest):** Programming & Tech → Website Development / Automation / Workflows (use whatever "automation" subcategory exists)
- **Title (56):** `I will fix your broken n8n, Make.com or Zapier automation`
- **Tags:** `n8n`, `make com`, `zapier`, `automation`, `workflow fix`

**Description:**
```
Workflow stopped running? Webhook not firing? Data going to the wrong place? I will find the cause and fix it.

I repair automations in n8n, Make.com and Zapier, including:
- Failed or skipped executions and error nodes
- Webhook, API and OAuth connection problems
- Wrong field mapping, duplicate runs, missing data
- Google Sheets, Gmail, Slack, Stripe, CRM and database steps
- Adding error handling, retries and logging so it fails loudly next time

HOW IT WORKS
1. You send the platform, a workflow export (or sanitized screenshots), the exact error and what it should do.
2. I reproduce the problem and fix it.
3. I test it and send a short written summary of what was wrong and what changed.

I never need your passwords. Share a sanitized export or temporary limited access, and revoke it when we are done.

NOT INCLUDED: building brand-new systems from scratch, paid API plans, or fixes for third-party outages. Need something bigger? Message me first and I will quote it.
```

| Package | Name (≤ ~30) | Description (≤100) | Delivery | Revisions | Price |
|---|---|---|---|---|---:|
| Basic | Quick fix | One simple issue, up to 3 steps/nodes | 2 days | 1 | $45 |
| Standard | Workflow repair | One workflow, up to 10 nodes, 1 integration + error path | 3 days | 2 | $125 |
| Premium | Full stabilize | Up to 3 related workflows or 25 nodes, logging + handover | 5 days | 2 | $250 |

**Buyer requirements (set in the gig):**
1. Which platform and version (n8n self-hosted/cloud, Make, Zapier)?
2. Attach a workflow export (JSON/blueprint) with credentials removed, or screenshots.
3. What is the exact error message?
4. What should the workflow do, and when did it last work?
5. Which apps/services does it connect to?

**FAQs:**
- *Do you need my passwords?* No. A sanitized export plus masked logs is enough. If access is needed, use a temporary limited account and revoke it afterward.
- *What if you can't fix it?* I will tell you before you order if I can see it's out of scope, and I explain what I found either way.
- *Can you build a new automation?* This gig is for repairs. Message me first for new builds and I will quote separately.
- *Which platforms?* n8n, Make.com and Zapier.
- *What counts as a revision?* Adjustments within the original problem. New features are a separate order.

**Thumbnail brief:** Dark background, copper accent. Left: broken workflow (red node with an X). Right: same flow green. Headline text: "FIX BROKEN AUTOMATIONS". Small logos area left blank (do not use brand logos without rights; use generic node shapes).

---

### Gig 2 — Claude Code / AI-built app debugging

- **Category (suggest):** Programming & Tech → Website Development / Software Development → Bug fixing (closest available)
- **Title (57):** `I will debug and fix your Claude Code or AI built web app`
- **Tags:** `claude code`, `bug fixing`, `web app`, `api integration`, `debugging`

**Description:**
```
Built your app with Claude Code, Cursor, Copilot or another AI tool and now it is stuck on a bug it cannot fix? I debug and stabilize AI-built apps.

Typical problems I fix:
- Login/auth failures (Firebase, Auth0, sessions, tokens)
- API calls that return errors or the wrong data
- Features that work locally but break when deployed
- Database and environment-variable problems
- Frontend bugs in React/Next.js, backend bugs in Node.js/Python
- Messy code that needs a safe, minimal fix and a few tests

HOW IT WORKS
1. You send a sanitized copy of the project (no secrets), your stack, the error and steps to reproduce.
2. I reproduce the bug, fix the root cause (not just the symptom) and add tests where it makes sense.
3. You get the fixed code plus a plain-English change log.

I work on code you own or have a license to modify. I never need production secrets; use test keys.

NOT INCLUDED: full rebuilds, open-ended new features, or guaranteed production launches. Message me first if the job is large and I will quote it.
```

| Package | Name | Description (≤100) | Delivery | Revisions | Price |
|---|---|---|---|---|---:|
| Basic | One bug | Reproduce and fix one isolated bug in a small project | 2 days | 1 | $50 |
| Standard | Bug bundle | Up to 3 related bugs or one API/auth integration, with tests and handover | 4 days | 2 | $150 |
| Premium | Stabilize a feature | One bounded feature across frontend/backend or deploy, tests, change log | 6 days | 2 | $300 |

**Buyer requirements:**
1. Send a sanitized repo or zip (remove .env files and keys).
2. Tech stack and hosting/deployment environment?
3. Exact error messages or logs.
4. Steps to reproduce the bug.
5. What is the expected result?
6. Confirm you own the code or have permission to modify it.

**FAQs:**
- *Do you need my API keys?* No. Use test keys or placeholders. Never send production secrets.
- *Which stacks?* JavaScript/TypeScript (React, Next.js, Node), Python (FastAPI, Flask), Firebase, PostgreSQL and common APIs.
- *Can you finish my whole app?* This gig is bug fixing. Message me for larger scopes and I will quote.
- *Will you add tests?* Yes in Standard and Premium; Basic fixes the one bug.
- *Do you guarantee it will run in production?* I fix and verify the scoped problem. I can't guarantee behavior of systems I don't control.

**Thumbnail brief:** Terminal-style panel with a red error line turning green, caption "AI BUILT IT. I FIX IT." Copper accent.

---

### Gig 3 — Stripe payments / subscriptions / webhooks

- **Category (suggest):** Programming & Tech → Website Development / Software Development → Payment integration
- **Title (59):** `I will fix your Stripe checkout, subscriptions and webhooks`
- **Tags:** `stripe`, `stripe integration`, `subscriptions`, `payment gateway`, `webhooks`

**Description:**
```
Stripe checkout failing? Subscriptions not updating? Webhooks missing or firing twice? I run live Stripe billing in my own SaaS products and fix the same problems for you.

I fix:
- Checkout Session and Payment Intent errors
- Webhook signature failures and missed or duplicate events
- Subscription status not syncing to your database
- Failed-payment, cancellation, upgrade and proration flows
- Customer portal and trial logic
- Idempotency, retries and failure handling

HOW IT WORKS
1. You send your framework, a description of the billing flow, sanitized webhook events and error logs. We use Stripe TEST mode.
2. I reproduce the problem, fix it and verify it with test events.
3. You get the fix, test evidence and a short written summary.

I never need your live secret keys or cardholder data. Test mode and a restricted key are enough.

NOT INCLUDED: PCI audits or certification, legal or tax advice, recovery of failed charges, or handling live card data. Not affiliated with or endorsed by Stripe.
```

| Package | Name | Description (≤100) | Delivery | Revisions | Price |
|---|---|---|---|---|---:|
| Basic | One Stripe fix | Diagnose and fix one Checkout or webhook issue | 2 days | 1 | $65 |
| Standard | Billing flow repair | Repair one checkout/subscription flow, verify webhooks, test-mode proof | 4 days | 2 | $150 |
| Premium | Bulletproof billing | Idempotent events, status sync and failure handling for one billing flow | 6 days | 2 | $300 |

**Buyer requirements:**
1. Framework/language (Node, Next.js, Python, etc.)?
2. Which Stripe flow is broken (Checkout, subscriptions, invoices, portal)?
3. Share sanitized webhook event payloads and error logs. Remove secrets.
4. What should happen vs. what happens now?
5. Confirm you can test in Stripe test mode.

**FAQs:**
- *Do you need my live Stripe keys?* No. Test mode only, or a restricted key you create and revoke.
- *Will you touch card data?* Never. Stripe handles card data; I work on your integration code.
- *Do you handle Stripe Connect/marketplaces?* Basic Connect issues yes; large marketplace builds need a custom quote.
- *Can you recover failed payments?* No, I fix the integration so future failures are handled and retried correctly.
- *Do you give tax or legal advice?* No.

**Thumbnail brief:** Payment card + webhook arrow icon, one red failed event turning green. Caption "STRIPE BILLING, FIXED". Do not use Stripe's logo or brand purple as a "logo".

---

### Gig 4 — Excel / CSV data cleaning and automation

- **Category (suggest):** Data → Data Entry / Data Processing → Data cleaning
- **Title (56):** `I will clean, format and automate your Excel or CSV data`
- **Tags:** `excel cleaning`, `csv`, `data cleaning`, `spreadsheet`, `data formatting`

**Description:**
```
Messy spreadsheet? Duplicates, mixed formats, broken columns, files that won't line up? I turn it into clean, consistent, ready-to-use data.

What I do:
- Remove duplicates and fix inconsistent names, dates, phone numbers and addresses
- Split, merge and standardize columns
- Combine and reconcile multiple files
- Add formulas, data validation and summary tabs
- Build a reusable report or a repeatable cleanup script so you never do it by hand again

HOW IT WORKS
1. You send sample files and tell me what "clean" looks like (target columns, duplicate rules, how to treat blanks).
2. I clean the data, keep your original untouched and send the cleaned file with a short validation summary showing what changed.
3. Revisions fix anything that does not match your rules.

I work in Excel, Google Sheets and Python. Send only the data needed, and tell me if any of it is sensitive.

NOT INCLUDED: verifying the accuracy of your source data, data enrichment/lookup of new records, or regulated data (medical, payment cards) without agreed safeguards.
```

| Package | Name | Description (≤100) | Delivery | Revisions | Price |
|---|---|---|---|---|---:|
| Basic | Quick clean | 1 file up to 500 rows: dedupe and format columns | 1 day | 1 | $25 |
| Standard | Multi-file clean | Up to 5,000 rows, 3 files, reconcile fields, formulas, validation | 2 days | 2 | $75 |
| Premium | Clean + automate | Up to 20,000 rows, 5 files, reusable report or cleanup script | 4 days | 2 | $150 |

**Buyer requirements:**
1. Upload example files (remove sensitive data if you can).
2. What should the final file look like (columns, formats)?
3. How should duplicates be defined (e.g., same email)?
4. How should blank/missing values be handled?
5. Is any of the data sensitive or regulated?

**FAQs:**
- *Do you keep my data?* No. Files are used only for your order and deleted after delivery.
- *Will you change my original file?* No. You get a new cleaned file and a change summary.
- *Excel or Google Sheets?* Either. Python scripts are available in Premium.
- *Can you clean files over 20,000 rows?* Yes, message me for a custom quote.
- *Do you verify the facts in my data?* No, I standardize and organize it; I can't verify real-world accuracy.

**Thumbnail brief:** Left half messy grid (red cells, mismatched), right half tidy green grid. Caption "MESSY → CLEAN".

---

## 5. Private intake / scope-gate checklist (internal)

Run this on every inquiry **before** accepting custom work. Keep it inside Fiverr messages.

1. What is broken, exactly? (error text, screenshots, expected vs. actual)
2. Platform/stack and versions.
3. Is it within the gig's scope and package limits? If not, quote a custom offer via Fiverr's Custom Offer.
4. Access method: sanitized export, test mode, temporary limited access. **No raw passwords, no production secrets, no card data.**
5. Do they own/have rights to the code or data?
6. Estimated hours (log it) vs. package price. Decline or upsell if it won't pay.
7. At completion: summary delivered, access revoked, files deleted.

---

## 6. Demos to build (one per gig, original, honest)

Build in `fiverr/demos/` (separate subfolders). Each demo must be reproducible and *clearly labelled as a sample*, not a client project.

| Gig | Demo | Contents |
|---|---|---|
| 1 | Broken webhook → Google Sheets flow | Failing n8n workflow JSON, fixed version, redacted execution log, 30s screen recording |
| 2 | Sample app with broken Firebase auth / API call | Small app, failing test, fix commit, passing test, short write-up |
| 3 | Stripe test-mode subscription lifecycle | Webhook handler with signature check, duplicate-event test showing idempotency, test-mode evidence |
| 4 | Fictional messy customer/transaction CSV | Before/after samples, validation summary tab, cleanup script |

Use only fictional data. Strip all secrets. Screenshots and the recording go into the gig gallery/portfolio (Fiverr allows images, video and PDFs in a gig gallery).

---

## 7. Launch order (today onward)

1. **Profile + Gig 1 and Gig 2** live first (strongest search-growth signals in the plan).
2. **Gig 3 and Gig 4** same day if possible. Fiverr usually reviews gigs before they appear.
3. Demos in parallel; add to galleries as they finish. Gig can launch with thumbnails + text first.
4. Check Fiverr's current rules/limits as you go (§2) and fix any rejected fields.
5. Fifth gig later: Firebase security rules review.

**Pricing note:** brand-new sellers with zero reviews often get orders by pricing the Basic tier low. Keep Basic as the entry point, push Standard/Premium for margin. Consider a temporary lower Basic if there are no impressions after ~3 days, but only by editing real scope, not by deceptive discounts.

---

## 8. Tracking sheet (create `fiverr/tracking.csv`)

Columns: `date, gig, impressions, clicks, inquiries, orders, gross_usd, fee_usd, net_usd, hours_spent, delivered_on, cleared_on, notes`

Review daily for the first 14 days. Fix low-click gigs (title/thumbnail), then low-conversion gigs (demos/price), then delivery friction.

---

## 9. Contingency (rent is the priority)

- Fiverr alone may not clear by Nov 1. If there are no orders by ~Oct 14, put equal effort into faster paths: direct freelance repair work through existing contacts, a one-time Emergency Code Repair page, or part-time/contract roles (note: this session has an Indeed connector available to search jobs).
- Don't spend money on Fiverr promoted gigs until you've seen organic impressions.
- Keep prices and scope honest; one bad early review hurts more than a lower price.

---

## 10. Open questions for the next chat

1. Are the profile facts right (9 years Navy, Security+, two live products, Elizabeth City NC)? Anything to add, e.g., the trading platform, or Navy rate/field?
2. Is it OK to name The Cleaners Place and RentNest in the profile? (Used above.)
3. Which gig does the human want live first?
4. Replace "Basic" tier price on any gig if impressions don't come.
5. Fiverr account state: is the account created, is identity verification done, any restrictions?

---

## 11. Instructions for the Claude chat that picks this up

- Read this file first. Do not log into Fiverr or automate it; the human pastes text and reports rejections.
- Tasks: (1) refine/verify copy against live Fiverr limits the human reports; (2) build the four demos in `fiverr/demos/`; (3) write thumbnails (e.g., HTML/SVG exported to PNG at 1280×769) per the briefs; (4) set up `fiverr/tracking.csv`.
- Never invent reviews, client results, certifications, or Fiverr levels. Never embed real secrets in demos.
