# Listing: Shopify Customer Operations

**Title:** n8n Shopify Store Automation | Order Alerts, Shipping Emails, Return Requests, Review Requests, Low Stock

**Price tests:** Lite $39 / Pro $59

**Description:**

The small, repeatable customer-ops jobs of a Shopify store, automated. This n8n pack gives you 7 importable workflows for small shopify stores.

INCLUDED
- New Order Alert And Log
- Shipment Update Email
- Return Request Intake
- Review Requests
- Low Stock Alert
- Weekly Store Summary
- Error alert workflow
- Google Sheets header templates
- Step-by-step README and sample requests
- Built-in dry-run mode so you can test without sending anything

GOOD TO KNOW
- Order and shipping workflows use n8n's Shopify Trigger node with a custom-app access token. The low-stock workflow reads products through the Shopify node. Create a custom app with read access to orders and products.
- Shopify already sends order confirmations and shipping notifications. Set `send_shipping_email` to false (or disable Shopify's own) so customers aren't emailed twice. This pack adds a tracking email only if you want it.
- Returns are logged and acknowledged only. Nothing is refunded automatically.
- Review requests go to every fulfilled order (no review gating). Opt-outs are honored through the `opted_out` column.

REQUIREMENTS: n8n (self-hosted or Cloud) and a Google account. Tested on n8n 2.42.5. This is a template, not a managed service.

**Do not claim:** sales, reviews, guaranteed results, endorsement by n8n/Google/Stripe/Shopify/Anthropic, or that it was tested with live accounts (it was not).