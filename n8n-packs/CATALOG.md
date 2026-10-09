# Catalog: 20 n8n packs

Prices are test hypotheses, not market-verified. 'Lite' and 'Pro' are different zips of the same folder.

| # | Pack | For | Workflows | Lite / Pro | Credentials beyond Gmail + Google Sheets | Folder |
|---:|---|---|---:|---|---|---|
| 1 | Cleaning Business Lead-to-Booking | Residential/commercial cleaners | 5 | $29 / $49 | Calendar (optional) | `cleaning-lead-to-booking/` |
| 2 | Contractor Quote & Follow-Up | Remodelers, electricians, plumbers, roofers and other trades that quote jobs | 6 | $29 / $59 | none | `packs/contractor-quote-followup/` |
| 3 | Mobile Detailer Booking Assistant | Mobile and shop-based auto detailers | 7 | $29 / $49 | none | `packs/mobile-detailer-booking/` |
| 4 | Real Estate Lead Response | Independent real estate agents and small teams | 6 | $29 / $49 | none | `packs/real-estate-lead-response/` |
| 5 | Stripe Failed-Payment Recovery | SaaS and subscription founders using Stripe Billing | 6 | $49 / $79 | Stripe (test mode first) | `packs/stripe-failed-payment-recovery/` |
| 6 | SaaS Trial-to-Paid Lifecycle | Micro-SaaS owners and indie founders | 8 | $39 / $69 | none | `packs/saas-trial-to-paid/` |
| 7 | Shopify Customer Operations | Small Shopify stores | 7 | $39 / $59 | Shopify custom app token | `packs/shopify-customer-operations/` |
| 8 | Etsy Seller Operations | Etsy and handmade-goods sellers who run orders from a spreadsheet | 7 | $29 / $49 | none | `packs/etsy-seller-operations/` |
| 9 | Invoice & Accounts Receivable | Freelancers, agencies and small service businesses that invoice clients | 6 | $39 / $59 | none | `packs/invoice-accounts-receivable/` |
| 10 | Local Business Review Management | Local service businesses (cleaners, trades, salons, clinics, detailers) | 5 | $29 / $39 | none | `packs/local-review-management/` |
| 11 | Appointment No-Show Reduction | Salons, tutors, coaches, clinics and other appointment-based businesses | 8 | $29 / $39 | none | `packs/appointment-no-show-reduction/` |
| 12 | Recruiting Applicant Pipeline | Small businesses hiring without an applicant-tracking system | 5 | $39 / $59 | none | `packs/recruiting-applicant-pipeline/` |
| 13 | Customer Support Triage | Small SaaS companies and help desks without a ticketing system | 5 | $39 / $69 | none | `packs/support-ticket-triage/` |
| 14 | Agency Client Onboarding | Web/design/marketing agencies | 4 | $29 / $49 | Google Drive | `agency-client-onboarding/` |
| 15 | Content Repurposing Studio | Creators, podcasters and small marketing teams | 5 | $39 / $69 | Anthropic API key (billed to you) | `packs/content-repurposing-studio/` |
| 16 | Newsletter Research & Publishing | Solo newsletter operators and small editorial teams | 5 | $29 / $49 | none (RSS feeds) | `packs/newsletter-research-publishing/` |
| 17 | Restaurant Catering Inquiry Funnel | Caterers and restaurants that take event orders | 7 | $29 / $49 | none | `packs/catering-inquiry-funnel/` |
| 18 | Property Manager Maintenance Desk | Small landlords and property managers | 5 | $29 / $59 | none | `packs/property-maintenance-desk/` |
| 19 | Small Business Daily KPI Digest | Owners who want their key numbers in one email without opening five dashboards | 5 | $39 / $59 | none | `packs/kpi-daily-digest/` |
| 20 | Website & Automation Incident Alerts | Developers and agencies who run client sites and automations | 4 | $39 / $69 | none (any uptime monitor that can send a webhook) | `packs/incident-alerts/` |

## How these were verified

- Shared engine and custom logic: automated tests (`node --test test/`).
- Every webhook workflow: imported into a real n8n 2.42.5 and exercised in dry-run mode (valid payload accepted, empty payload rejected with 422) by `test/e2e.sh`.
- NOT verified: anything that needs a live account. Gmail, Google Sheets, Google Drive/Calendar, Stripe, Shopify and Anthropic API calls were not run against real accounts in the build environment. Each pack README lists what to test first.

## Build order that makes sense

Sell the ones where you can show a believable demo and where buyers already pay for software: 1, 14 and 9 (invoices) first, then 2, 3, 4, 11, 17, 18 (service businesses), then 5, 6, 13, 20 (SaaS/dev), then the rest. Check the competitor note in `LISTING.md`: bulk workflow bundles sell for about $15, so lead with the outcome and the tested setup, not the node count.
