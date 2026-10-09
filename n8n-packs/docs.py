"""Generates README.md, LISTING.md and curl tests for each spec-driven pack, straight from its spec (so docs can't drift from the workflows)."""
import json
import os
import re

CRON_WORDS = {"* * * * *": "every minute"}


def cron_text(c):
    m, h, dom, mon, dow = c.split()
    if dow == "1-5":
        d = "weekdays"
    elif dow == "1":
        d = "Mondays"
    elif dow == "4":
        d = "Thursdays"
    elif dom == "1":
        d = "the 1st of each month"
    else:
        d = "daily"
    hrs = ", ".join(f"{int(x):02d}:{int(m):02d}" for x in h.split(","))
    return f"{d} at {hrs}"


def step_text(s):
    o = s["offset_days"]
    return f"day {o:+d}".replace("+", "+") if o else "day 0"


def describe(fl, pack):
    rt, k = fl["rt"], fl["kind"]
    if k == "intake":
        bits = [f"Webhook `{fl['hook']}`: validates the request, ignores same-day duplicates, logs it to the **{rt['sheet']}** tab"]
        if rt.get("tags") or rt.get("variants"):
            bits.append("tags/routes it with the rules in the Config")
        if rt.get("ack"):
            bits.append("emails the sender an acknowledgement")
        if rt.get("drafts"):
            bits.append("creates a reply DRAFT in Gmail for you to review")
        if rt.get("owner"):
            bits.append("alerts you")
        return ", ".join(bits) + "."
    if k == "event":
        t = f"Webhook `{fl['hook']}`: updates one row in **{rt['sheet']}**"
        if rt.get("set"):
            t += " (sets " + ", ".join(f"{a}=`{b}`" for a, b in rt["set"].items()) + ")"
        if rt.get("email") or rt.get("emails"):
            t += ", emails the customer"
        if rt.get("owner"):
            t += ", alerts you"
        return t + "."
    if k == "sequence":
        steps = "; ".join(f"{step_text(s)}" for s in rt["steps"])
        stop = ""
        if rt.get("base_status"):
            stop = f" Only rows with status {'/'.join(rt['base_status'])}."
        return f"Runs {cron_text(fl['cron'])} over **{rt['sheet']}**: sends at most one email per row per run, steps at ({steps}) relative to `{rt['date_col']}`. Never repeats a step.{stop}"
    if k == "digest":
        if rt["mode"] == "list":
            return f"Runs {cron_text(fl['cron'])}: emails a list of {rt['list']['source']} that need attention."
        return f"Runs {cron_text(fl['cron'])}: emails a metrics summary (last {rt.get('window_days', 7)} days vs the period before)."
    if k == "trigger":
        return f"Fires on {', '.join(fl['trigger']['params'].get('events') or [fl['trigger']['params'].get('topic', '')])} ({fl['trigger']['type'].split('.')[-1]}). Needs your credential."
    return {"content": "Webhook that sends a transcript to the AI, then saves drafts for your approval.",
            "rss": f"Runs {cron_text(fl.get('cron', '0 6 * * *'))}: reads your RSS feeds, filters and de-duplicates stories.",
            "newsletter": f"Runs {cron_text(fl.get('cron', '0 9 * * 4'))}: builds a newsletter DRAFT from approved stories.",
            "lowstock": f"Runs {cron_text(fl.get('cron', '0 8 * * *'))}: emails Shopify variants at or below the low-stock threshold.",
            "incident": "Webhook from your uptime monitor: one alert per incident, reminders, recovery notice." if fl.get("trigger_kind") == "webhook"
            else "Error Trigger: turns n8n workflow failures into de-duplicated alerts."}.get(k, "")


def field_table(fields):
    rows = ["| Field | Required | Type / values | Example |", "|---|---|---|---|"]
    for f in fields:
        t = f.get("type", "text")
        if t == "select":
            t = "one of: " + ", ".join(f["options"])
        ex = f.get("sample", "")
        ex = (str(ex)[:40] + "...") if len(str(ex)) > 40 else ex
        rows.append(f"| `{f['key']}` | {'yes' if f.get('required') else 'no'} | {t} | {ex} |")
    return "\n".join(rows)


def write_pack_docs(root, pack, cols):
    out = os.path.join(root, "packs", pack["slug"])
    flows = pack["flows"]
    lite = [f for f in flows if f.get("lite")]
    n_err = len(flows) + 1
    L = []
    a = L.append
    a(f"# {pack['name']} for n8n\n")
    a(f"{pack['listing']['hook']}\n")
    a(f"**For:** {pack['buyer']}. **Built and tested with n8n 2.42.5.** Needs Gmail and Google Sheets credentials" +
      (" plus the credentials named in each workflow's sticky notes." if any(f['kind'] in ('trigger', 'content', 'lowstock', 'rss', 'newsletter', 'incident') for f in flows) else ".") + "\n")
    a("## What's inside\n")
    a("| # | Workflow file | What it does | Lite |\n|---|---|---|---|")
    for f in flows:
        a(f"| {f['n']} | `workflows/{f['file']}` | {describe(f, pack)} | {'yes' if f.get('lite') else ''} |")
    a(f"| {n_err} | `workflows/{n_err}-error-alert.json` | Emails you when any workflow fails (set it as the Error Workflow). | yes |")
    a(f"\n**Lite** = the workflows marked yes (${pack['price']['lite']} test price). **Pro** = all {n_err} (${pack['price']['pro']} test price).\n")
    a("## Setup (about 30 minutes)\n")
    sheets = ", ".join(f"`{s}`" for s in cols)
    a(f"1. **Make the sheet.** Create one Google Sheet with these tabs, named exactly: {sheets}. Paste each header row from `sheets/<Tab>.csv` into row 1 of its tab. Copy the sheet ID from the URL.")
    a("2. **Import** every workflow JSON into n8n (Workflows > Import from file) and select your credentials on each Gmail / Google Sheets node. Nodes that need other credentials have a sticky note saying so.")
    a("3. **Edit the `Config` node** in each workflow. The top part (business name, your email, links, sheet ID, timezone, and any pack settings) must be the same in every workflow. The `flow` section is that workflow's own settings and message wording; edit the wording freely.")
    a("4. **Dry run first.** `dry_run` ships as `true`: webhooks validate and return a preview, and nothing is sent or written. Test with `sample-data/curl-tests.sh`, then set `dry_run` to `false` in every workflow.")
    a("5. **Activate** the workflows. Set the Error Alert workflow as the *Error Workflow* in the settings of the others.\n")
    hooks = [f for f in flows if f.get("hook")]
    if hooks:
        a("## Webhooks\n")
        a("Each webhook is `POST https://YOUR-N8N/webhook/<path>` with a JSON body. Optional: set `webhook_secret` in Config and send the same value in an `x-webhook-secret` header. Responses: `200` accepted (or duplicate), `422` invalid input with a list of errors, `401` wrong secret.\n")
        for f in hooks:
            a(f"### `{f['hook']}`: {f['title']}\n")
            fields = f["rt"].get("fields")
            if fields:
                a(field_table(fields) + "\n")
            else:
                a("Body example:\n```json\n" + json.dumps(f.get("sample", {}), indent=2) + "\n```\n")
    a("## Google Sheet tabs\n")
    for sh, names in cols.items():
        a(f"- **{sh}**: `{', '.join(names)}`")
    a("\nColumn names must match exactly. Columns that only some workflows use are blank until those workflows run.\n")
    a("## Settings in Config\n")
    a("`" + "`, `".join(sorted(set(list({'business_name': 1, 'owner_email': 1, 'sheet_id': 1, 'timezone': 1, 'webhook_secret': 1, 'dry_run': 1, 'optout_footer': 1}) + list(pack['cfg'])))) + "`\n")
    a("## Notes: read before going live\n")
    for n in pack["notes"]:
        a(f"- {n}")
    a("- Email only. No SMS is included (SMS needs separate consent and carrier registration).")
    a("- Any message that is marketing rather than transactional carries an opt-out line. When someone replies STOP, set `opted_out` to `yes` in their row (this pack does not read your inbox).")
    a("- Text from forms is HTML-escaped before it goes into an email, and line breaks are stripped from subject lines.\n")
    a("## Limits\n")
    for n in pack["limits"]:
        a(f"- {n}")
    a("- The Google Sheets steps (`appendOrUpdate` / `update`) and Gmail steps follow n8n's current node schemas but were not run against live Google accounts in the build environment. Test with your own sheet in dry-run-off mode on one test row first, and re-select a field if n8n asks you to after import.")
    a("- Daily schedules run once a day in your n8n's timezone setting; dates are `YYYY-MM-DD`.\n")
    a("## Tests\n")
    a("Run `./sample-data/curl-tests.sh https://YOUR-N8N/webhook` (use `/webhook-test` while building). Logic is covered by automated tests in the source repo (`node --test test/`).\n")
    a("Support: this is a template, not a managed service. Installation help is a separate paid service.\n")
    with open(os.path.join(out, "README.md"), "w") as f:
        f.write("\n".join(L))

    # listing
    P = []
    p = P.append
    p(f"# Listing: {pack['name']}\n")
    p(f"**Title:** {pack['listing']['title']}\n")
    p(f"**Price tests:** Lite ${pack['price']['lite']} / Pro ${pack['price']['pro']}\n")
    p("**Description:**\n")
    p(f"{pack['listing']['hook']} This n8n pack gives you {n_err} importable workflows for {pack['buyer'].lower()}.\n")
    p("INCLUDED")
    for f in flows:
        p(f"- {f['title']}")
    p("- Error alert workflow\n- Google Sheets header templates\n- Step-by-step README and sample requests\n- Built-in dry-run mode so you can test without sending anything\n")
    p("GOOD TO KNOW")
    for n in pack["notes"][:4]:
        p(f"- {n}")
    p("\nREQUIREMENTS: n8n (self-hosted or Cloud) and a Google account. Tested on n8n 2.42.5. This is a template, not a managed service.\n")
    p("**Do not claim:** sales, reviews, guaranteed results, endorsement by n8n/Google/Stripe/Shopify/Anthropic, or that it was tested with live accounts (it was not).")
    with open(os.path.join(out, "LISTING.md"), "w") as f:
        f.write("\n".join(P))

    # curl tests
    C = ["#!/usr/bin/env bash", "# Usage: ./curl-tests.sh https://YOUR-N8N/webhook   (use /webhook-test while building)", 'BASE="${1:?pass the base webhook URL}"', 'cd "$(dirname "$0")"']
    for f in hooks:
        pf = f["file"].replace(".json", "-payload.json")
        C.append(f'echo "--- {f["hook"]}"; curl -s -X POST "$BASE/{f["hook"]}" -H \'Content-Type: application/json\' -d @{pf}; echo')
        C.append(f'echo "--- {f["hook"]} with empty body (expect 422)"; curl -s -w \'\\nHTTP %{{http_code}}\\n\' -X POST "$BASE/{f["hook"]}" -H \'Content-Type: application/json\' -d \'{{}}\'')
    with open(os.path.join(out, "sample-data", "curl-tests.sh"), "w") as f:
        f.write("\n".join(C) + "\n")
    os.chmod(os.path.join(out, "sample-data", "curl-tests.sh"), 0o755)


EXTRA_CREDS = {"stripe-failed-payment-recovery": "Stripe (test mode first)", "shopify-customer-operations": "Shopify custom app token",
               "content-repurposing-studio": "Anthropic API key (billed to you)", "newsletter-research-publishing": "none (RSS feeds)",
               "incident-alerts": "none (any uptime monitor that can send a webhook)"}


def write_catalog(root, packs):
    L = ["# Catalog: 20 n8n packs\n",
         "Prices are test hypotheses, not market-verified. 'Lite' and 'Pro' are different zips of the same folder.\n",
         "| # | Pack | For | Workflows | Lite / Pro | Credentials beyond Gmail + Google Sheets | Folder |", "|---:|---|---|---:|---|---|---|",
         "| 1 | Cleaning Business Lead-to-Booking | Residential/commercial cleaners | 5 | $29 / $49 | Calendar (optional) | `cleaning-lead-to-booking/` |",
         "| 14 | Agency Client Onboarding | Web/design/marketing agencies | 4 | $29 / $49 | Google Drive | `agency-client-onboarding/` |"]
    rows = []
    for p in packs:
        rows.append((p["num"], f"| {p['num']} | {p['name']} | {p['buyer']} | {len(p['flows']) + 1} | ${p['price']['lite']} / ${p['price']['pro']} | {EXTRA_CREDS.get(p['slug'], 'none')} | `packs/{p['slug']}/` |"))
    allrows = sorted(rows, key=lambda r: r[0])
    # merge legacy rows into numeric order
    legacy = {1: L[4], 14: L[5]}
    body = sorted([(1, L[4]), (14, L[5])] + allrows, key=lambda r: r[0])
    out = L[:4] + [r[1] for r in body]
    out += ["", "## How these were verified", "",
            "- Shared engine and custom logic: automated tests (`node --test test/`).",
            "- Every webhook workflow: imported into a real n8n 2.42.5 and exercised in dry-run mode (valid payload accepted, empty payload rejected with 422) by `test/e2e.sh`.",
            "- NOT verified: anything that needs a live account. Gmail, Google Sheets, Google Drive/Calendar, Stripe, Shopify and Anthropic API calls were not run against real accounts in the build environment. Each pack README lists what to test first.",
            "", "## Build order that makes sense", "",
            "Sell the ones where you can show a believable demo and where buyers already pay for software: 1, 14 and 9 (invoices) first, then 2, 3, 4, 11, 17, 18 (service businesses), then 5, 6, 13, 20 (SaaS/dev), then the rest. Check the competitor note in `LISTING.md`: bulk workflow bundles sell for about $15, so lead with the outcome and the tested setup, not the node count."]
    with open(os.path.join(root, "CATALOG.md"), "w") as f:
        f.write("\n".join(out) + "\n")
