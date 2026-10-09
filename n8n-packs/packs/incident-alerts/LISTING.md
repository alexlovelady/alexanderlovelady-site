# Listing: Website & Automation Incident Alerts

**Title:** n8n Website & Automation Incident Alerts | Uptime Webhook, Alert De-Duplication, Client Notice Drafts, n8n Error Collector

**Price tests:** Lite $39 / Pro $69

**Description:**

One calm alert per incident instead of a flood, plus client notices drafted for you. This n8n pack gives you 4 importable workflows for developers and agencies who run client sites and automations.

INCLUDED
- Uptime Alert Webhook
- Automation Error Collector
- Weekly Incident Report
- Error alert workflow
- Google Sheets header templates
- Step-by-step README and sample requests
- Built-in dry-run mode so you can test without sending anything

GOOD TO KNOW
- The pack does not monitor anything itself. Point any uptime monitor that can send a webhook (UptimeRobot, Better Stack, Uptime Kuma, StatusCake, or your own script) at the `incident-alert` webhook. `status` may be down/up (common synonyms are mapped).
- Repeated 'down' alerts for the same monitor become ONE incident: you get an alert when it opens, a reminder every `reminder_minutes` while it stays down, and a message when it recovers (with downtime).
- The Automation Error Collector turns n8n failures into alerts. Set that workflow as the Error Workflow of the workflows you want to watch. Repeated errors from the same workflow within `suppress_minutes` are counted instead of emailed.
- Client notices are created as Gmail DRAFTS for you to review. Nothing is sent to clients automatically.

REQUIREMENTS: n8n (self-hosted or Cloud) and a Google account. Tested on n8n 2.42.5. This is a template, not a managed service.

**Do not claim:** sales, reviews, guaranteed results, endorsement by n8n/Google/Stripe/Shopify/Anthropic, or that it was tested with live accounts (it was not).