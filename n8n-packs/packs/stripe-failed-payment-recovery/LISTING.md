# Listing: Stripe Failed-Payment Recovery

**Title:** n8n Stripe Failed Payment Recovery Automation | Dunning Emails, Recovery Tracking, Subscription Sync | Stripe + Google Sheets

**Price tests:** Lite $49 / Pro $79

**Description:**

Recover revenue from failed subscription payments with timely, polite reminders. This n8n pack gives you 6 importable workflows for saas and subscription founders using stripe billing.

INCLUDED
- Payment Failed
- Dunning Sequence
- Payment Recovered
- Subscription Status Sync
- Weekly Recovery Report
- Error alert workflow
- Google Sheets header templates
- Step-by-step README and sample requests
- Built-in dry-run mode so you can test without sending anything

GOOD TO KNOW
- Test in Stripe TEST mode first (Stripe CLI `stripe trigger invoice.payment_failed`). The Stripe Trigger node registers its own webhook and verifies Stripe's signature.
- Stripe Billing already has Smart Retries and customer email settings. Turn off Stripe's own failed-payment emails (or set `send_immediate_email` to false) so customers aren't emailed twice.
- Never email card data. Emails link only to Stripe's hosted invoice page and your Customer Portal.
- Duplicate events are ignored (event id), and repeated retries of the same invoice only update the attempt count.

REQUIREMENTS: n8n (self-hosted or Cloud) and a Google account. Tested on n8n 2.42.5. This is a template, not a managed service.

**Do not claim:** sales, reviews, guaranteed results, endorsement by n8n/Google/Stripe/Shopify/Anthropic, or that it was tested with live accounts (it was not).