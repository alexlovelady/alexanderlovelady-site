# Listing: Small Business Daily KPI Digest

**Title:** n8n Daily KPI Digest Automation | Morning Numbers Email, Anomaly Alerts, Weekly Trends | Google Sheets + Gmail

**Price tests:** Lite $39 / Pro $59

**Description:**

Your key numbers in your inbox every morning, with an alert when something moves sharply. This n8n pack gives you 5 importable workflows for owners who want their key numbers in one email without opening five dashboards.

INCLUDED
- Record A Metric
- Daily KPI Digest
- Anomaly Alert
- Weekly Trend Report
- Error alert workflow
- Google Sheets header templates
- Step-by-step README and sample requests
- Built-in dry-run mode so you can test without sending anything

GOOD TO KNOW
- The pack does not connect to Stripe, your CRM or analytics by itself. Anything that can send a webhook (n8n's own Stripe/HubSpot/GA nodes, Zapier, Make, a script) posts a value to `kpi-record`, or you paste rows into the Metrics sheet. The pack then summarizes.
- Metrics list: Revenue, New Leads, New Customers, Support Tickets, Website Visits. Edit the select options (`flow.fields`) in the record workflow and the `metrics` list in the digest workflows' Config to use your own.
- Multiple values for the same metric and day are summed (for example one entry per order).
- If no values were recorded for a day, the digest shows 0, which can trigger a 'drop' alert. That alert usually means the data feed broke.

REQUIREMENTS: n8n (self-hosted or Cloud) and a Google account. Tested on n8n 2.42.5. This is a template, not a managed service.

**Do not claim:** sales, reviews, guaranteed results, endorsement by n8n/Google/Stripe/Shopify/Anthropic, or that it was tested with live accounts (it was not).