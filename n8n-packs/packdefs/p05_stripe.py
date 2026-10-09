FP_COLS = ["invoice_id", "customer_id", "email", "name", "amount", "amount_display", "currency", "attempt_count", "failed_at", "hosted_invoice_url",
           "subscription_id", "status", "d0_sent", "d1_sent", "d2_sent", "d3_sent", "recovered_at", "opted_out"]

PACK = dict(
    slug="stripe-failed-payment-recovery", num=5, short="StripeRecovery", name="Stripe Failed-Payment Recovery",
    buyer="SaaS and subscription founders using Stripe Billing",
    price=dict(lite=49, pro=79),
    cfg=dict(business_name="YOUR COMPANY", billing_portal_url="https://billing.stripe.com/p/login/YOUR-PORTAL-LINK",
             send_immediate_email=True, send_recovery_email=True),
    sheets={},
    flows=[
        dict(id="failed", kind="trigger", title="Payment Failed", lite=True,
             trigger=dict(type="n8n-nodes-base.stripeTrigger", ver=1, params=dict(events=["invoice.payment_failed"]),
                          note="Connect your Stripe credential. n8n verifies Stripe's webhook signature for you. Use TEST mode first."),
             read_sheet="FailedPayments", read_node="Read Failed Payments", js="stripe_failed.js",
             ctx_keys=["first_name", "amount_display", "hosted_invoice_url", "attempt_count", "name", "email", "billing_portal_url"],
             columns={"FailedPayments": FP_COLS},
             rt=dict(
                 email=dict(subject="Action needed: your payment for {{business_name}} didn't go through",
                            body="Hi {{first_name}},\n\nWe couldn't process your latest payment of {{amount_display}} for {{business_name}}. This is usually an expired card or a bank block, and it's easy to fix.\n\nUpdate your payment method here: {{billing_portal_url}}\nOr pay this invoice directly: {{hosted_invoice_url}}\n\nIf you've already fixed it, thank you. Questions? Just reply.\n\n{{business_name}}"),
                 owner=dict(subject="Payment failed: {{name}} ({{amount_display}}, attempt {{attempt_count}})", body="{{name}} ({{email}}) had a failed payment of {{amount_display}}.\n\nInvoice: {{hosted_invoice_url}}\n\nThey were emailed an update link. Follow-ups run automatically while the invoice is unpaid.")),
             routes=[
                 dict(status="new", actions=[
                     dict(type="sheet", name="Log Failure", op="appendOrUpdate", sheet="FailedPayments", match=["invoice_id"],
                          cols=["invoice_id", "customer_id", "email", "name", "amount", "amount_display", "currency", "attempt_count", "failed_at", "hosted_invoice_url", "subscription_id", "status", "d0_sent", "opted_out"]),
                     dict(type="gmail", name="Email Customer", to="mail_to", subject="mail_subject", html="mail_html", when="mail_to"),
                     dict(type="gmail", name="Notify Owner", to="owner_to", subject="owner_subject", html="owner_html")]),
                 dict(status="existing", actions=[
                     dict(type="sheet", name="Update Attempt Count", op="update", sheet="FailedPayments", match=["invoice_id"], cols=["invoice_id", "attempt_count"])])]),
        dict(id="dunning", kind="sequence", title="Dunning Sequence", lite=True, cron="0 10 * * *",
             rt=dict(
                 sheet="FailedPayments", key_col="invoice_id", date_col="failed_at", base_status=["open"], stop_cols={"opted_out": "yes"},
                 steps=[
                     dict(flag="d1_sent", offset_days=3, window_days=3, subject="Reminder: please update your payment method",
                          body="Hi {{first_name}},\n\nWe still haven't been able to collect {{amount_display}} for {{business_name}}. To keep your access, please update your payment method: {{billing_portal_url}}\n\nOr pay this invoice: {{hosted_invoice_url}}\n\nNeed help? Reply to this email.\n\n{{business_name}}"),
                     dict(flag="d2_sent", offset_days=7, window_days=4, subject="Your {{business_name}} account is at risk",
                          body="Hi {{first_name}},\n\nYour payment of {{amount_display}} is still outstanding. If we can't collect it soon, your subscription may be cancelled.\n\nFix it in a minute: {{billing_portal_url}}\n\nIf there's a problem or you want to cancel, reply and tell us.\n\n{{business_name}}"),
                     dict(flag="d3_sent", offset_days=12, window_days=30, subject="Final notice: payment needed for {{business_name}}",
                          body="Hi {{first_name}},\n\nThis is our final notice about your unpaid {{amount_display}}. Please update your payment method now to avoid cancellation: {{billing_portal_url}}\n\nIf you'd like to stop your subscription instead, just reply.\n\n{{business_name}}")])),
        dict(id="recovered", kind="trigger", title="Payment Recovered", lite=False,
             trigger=dict(type="n8n-nodes-base.stripeTrigger", ver=1, params=dict(events=["invoice.paid"]), note="Connect your Stripe credential."),
             read_sheet="FailedPayments", read_node="Read Failed Payments", js="stripe_paid.js",
             ctx_keys=["first_name", "amount_display", "name", "email"], columns={"FailedPayments": FP_COLS},
             rt=dict(
                 email=dict(subject="Thank you, your payment went through", body="Hi {{first_name}},\n\nThanks, we received your payment of {{amount_display}} and your account is all set.\n\n{{business_name}}"),
                 owner=dict(subject="Recovered: {{name}} ({{amount_display}})", body="{{name}} ({{email}}) paid the previously failed invoice of {{amount_display}}.")),
             routes=[dict(status="new", actions=[
                 dict(type="sheet", name="Mark Recovered", op="update", sheet="FailedPayments", match=["invoice_id"], cols=["invoice_id", "status", "recovered_at"]),
                 dict(type="gmail", name="Thank Customer", to="mail_to", subject="mail_subject", html="mail_html", when="mail_to"),
                 dict(type="gmail", name="Notify Owner", to="owner_to", subject="owner_subject", html="owner_html")])]),
        dict(id="subs", kind="trigger", title="Subscription Status Sync", lite=False,
             trigger=dict(type="n8n-nodes-base.stripeTrigger", ver=1, params=dict(events=["customer.subscription.updated", "customer.subscription.deleted"]), note="Connect your Stripe credential."),
             js="stripe_sub.js", columns={"Subscribers": ["subscription_id", "customer_id", "status", "cancel_at_period_end", "current_period_end", "price_id", "updated_at"]},
             rt={}, routes=[dict(status="new", actions=[
                 dict(type="sheet", name="Upsert Subscriber", op="appendOrUpdate", sheet="Subscribers", match=["subscription_id"],
                      cols=["subscription_id", "customer_id", "status", "cancel_at_period_end", "current_period_end", "price_id", "updated_at"])])]),
        dict(id="weekly", kind="digest", title="Weekly Recovery Report", lite=False, cron="0 8 * * 1",
             rt=dict(
                 mode="metrics", window_days=7, sources=[dict(name="fp", sheet="FailedPayments", key_col="invoice_id")],
                 metrics=[dict(label="New failed payments", source="fp", op="count", date_col="failed_at", alert_rise_pct=50),
                          dict(label="Recovered", source="fp", op="count", date_col="recovered_at", where=[dict(field="status", equals="recovered")]),
                          dict(label="Recovered revenue", source="fp", op="sum", col="amount", date_col="recovered_at", format="money", where=[dict(field="status", equals="recovered")]),
                          dict(label="Still unpaid (count)", source="fp", op="count", where=[dict(field="status", equals="open")]),
                          dict(label="Revenue at risk", source="fp", op="sum", col="amount", format="money", where=[dict(field="status", equals="open")])],
                 subject="Weekly payment recovery ({{flagged_count}} alert(s))", intro="Failed-payment recovery for the last {{window_days}} days. Amounts are in each invoice's currency; mixed currencies are added without conversion."),
             test_rows=dict(fp=[dict(invoice_id="in_1", amount="49", failed_at="2026-10-08", recovered_at="2026-10-10", status="recovered"),
                                dict(invoice_id="in_2", amount="99", failed_at="2026-10-09", recovered_at="", status="open")]), expect_count=1),
    ],
    listing=dict(title="n8n Stripe Failed Payment Recovery Automation | Dunning Emails, Recovery Tracking, Subscription Sync | Stripe + Google Sheets",
                 hook="Recover revenue from failed subscription payments with timely, polite reminders."),
    notes=[
        "Test in Stripe TEST mode first (Stripe CLI `stripe trigger invoice.payment_failed`). The Stripe Trigger node registers its own webhook and verifies Stripe's signature.",
        "Stripe Billing already has Smart Retries and customer email settings. Turn off Stripe's own failed-payment emails (or set `send_immediate_email` to false) so customers aren't emailed twice.",
        "Never email card data. Emails link only to Stripe's hosted invoice page and your Customer Portal.",
        "Duplicate events are ignored (event id), and repeated retries of the same invoice only update the attempt count.",
        "Reminders are transactional and courteous. Check your terms of service and local rules for payment reminders. This is not legal advice.",
        "The workflow stops reminding as soon as Stripe reports the invoice paid. You can also set `opted_out` = `yes` or change `status` in the sheet to stop it.",
    ],
    limits=["Not exercised against a live Stripe account in the build environment: the logic is unit-tested with Stripe-shaped sample events, and the workflows import into n8n. Run it in test mode before going live.",
            "Currency amounts are not converted."],
)
