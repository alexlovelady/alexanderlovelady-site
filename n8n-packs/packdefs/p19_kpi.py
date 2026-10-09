KPIS = [("Revenue", "money", 30, 0), ("New Leads", "number", 40, 0), ("New Customers", "number", 50, 0), ("Support Tickets", "number", 0, 150), ("Website Visits", "number", 50, 0)]


def metrics(window_alerts=True, with_date=True):
    out = []
    for name, fmt, drop, rise in KPIS:
        m = dict(label=name, source="metrics", op="sum", col="value", date_col="date", where=[dict(field="metric", equals=name)], format="money" if fmt == "money" else "number")
        if window_alerts and drop:
            m["alert_drop_pct"] = drop
        if window_alerts and rise:
            m["alert_rise_pct"] = rise
        out.append(m)
    return out


TEST_ROWS = dict(metrics=[
    dict(metric_id="M1", metric="Revenue", value="1000", date="2026-10-11"), dict(metric_id="M2", metric="Revenue", value="3000", date="2026-10-10"),
    dict(metric_id="M3", metric="Support Tickets", value="9", date="2026-10-11"), dict(metric_id="M4", metric="Support Tickets", value="2", date="2026-10-10")])

PACK = dict(
    slug="kpi-daily-digest", num=19, short="KPI", name="Small Business Daily KPI Digest",
    buyer="Owners who want their key numbers in one email without opening five dashboards",
    price=dict(lite=39, pro=59),
    cfg=dict(business_name="YOUR BUSINESS"),
    sheets={},
    flows=[
        dict(id="record", kind="intake", title="Record A Metric", lite=True, hook="kpi-record",
             rt=dict(
                 sheet="Metrics", id_col="metric_id", id_prefix="K",
                 fields=[
                     dict(key="metric", type="select", required=True, sample="Revenue", options=[k[0] for k in KPIS]),
                     dict(key="value", type="number", required=True, sample=1250.5),
                     dict(key="date", type="date", default_today=True, sample="2026-10-11"),
                     dict(key="note", max_length=200, sample="From Stripe daily total"),
                 ])),
        dict(id="daily", kind="digest", title="Daily KPI Digest", lite=True, cron="0 7 * * *",
             rt=dict(mode="metrics", window_days=1, end_offset_days=-1, sources=[dict(name="metrics", sheet="Metrics", key_col="metric_id")],
                     metrics=metrics(), subject="Yesterday's numbers ({{flagged_count}} alert(s))",
                     intro="Yesterday compared with the day before. Values come from what was recorded in the Metrics sheet."),
             test_rows=TEST_ROWS, expect_count=1),
        dict(id="anomaly", kind="digest", title="Anomaly Alert", lite=True, cron="0 7 * * *",
             rt=dict(mode="metrics", window_days=1, end_offset_days=-1, only_if_flagged=True, sources=[dict(name="metrics", sheet="Metrics", key_col="metric_id")],
                     metrics=metrics(), subject="ALERT: {{flagged_count}} KPI(s) moved sharply",
                     intro="One or more metrics moved sharply versus the day before. Check whether it's real (or whether data was not recorded)."),
             test_rows=TEST_ROWS, expect_count=1),
        dict(id="weekly", kind="digest", title="Weekly Trend Report", lite=False, cron="0 8 * * 1",
             rt=dict(mode="metrics", window_days=7, end_offset_days=-1, sources=[dict(name="metrics", sheet="Metrics", key_col="metric_id")],
                     metrics=metrics(), subject="Weekly KPI trends ({{flagged_count}} alert(s))",
                     intro="The last {{window_days}} full days compared with the {{window_days}} before."),
             test_rows=TEST_ROWS, expect_count=1),
    ],
    listing=dict(title="n8n Daily KPI Digest Automation | Morning Numbers Email, Anomaly Alerts, Weekly Trends | Google Sheets + Gmail",
                 hook="Your key numbers in your inbox every morning, with an alert when something moves sharply."),
    notes=[
        "The pack does not connect to Stripe, your CRM or analytics by itself. Anything that can send a webhook (n8n's own Stripe/HubSpot/GA nodes, Zapier, Make, a script) posts a value to `kpi-record`, or you paste rows into the Metrics sheet. The pack then summarizes.",
        "Metrics list: Revenue, New Leads, New Customers, Support Tickets, Website Visits. Edit the select options (`flow.fields`) in the record workflow and the `metrics` list in the digest workflows' Config to use your own.",
        "Multiple values for the same metric and day are summed (for example one entry per order).",
        "If no values were recorded for a day, the digest shows 0, which can trigger a 'drop' alert. That alert usually means the data feed broke.",
    ],
    limits=["Only sums per day are supported. Averages and ratios across metrics are limited."],
)
