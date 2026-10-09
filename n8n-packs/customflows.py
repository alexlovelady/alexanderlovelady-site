"""Builders for flows that need more than the shared engine (Stripe/Shopify triggers, AI drafting, RSS, incidents).
build_packs.py sets customflows.H to itself so helpers can be shared without a circular import."""
import os

from build import WF, code_node, config_node, gmail, if_node, respond, schedule  # noqa: F401

H = None  # set by build_packs.main()
ROOT = os.path.dirname(os.path.abspath(__file__))


def custom_code(name):
    with open(os.path.join(ROOT, "engine", "custom", name)) as f:
        return H.read_js("_prelude.js") + "\n" + f.read()


def noop(wf, name, x, y):
    return wf.add(name, "n8n-nodes-base.noOp", 1, {}, x, y)


def rowmap(cols, node="Prepare"):
    return {c: f'={{{{ $(\'{node}\').first().json.row["{c}"] }}}}' for c in cols}


def add_action(wf, a, x, y, node):
    n = a["name"]
    if a["type"] == "sheet":
        H.node_sheet_write(wf, n, a["sheet"], a["op"], rowmap(a["cols"], node), a.get("match", []), x, y)
    elif a["type"] == "gmail":
        gmail(wf, n, f"={{{{ $('{node}').first().json.{a['to']} }}}}", f"={{{{ $('{node}').first().json.{a['subject']} }}}}",
              f"={{{{ $('{node}').first().json.{a['html']} }}}}", x, y)
    elif a["type"] == "gmail_draft":
        wf.add(n, "n8n-nodes-base.gmail", 2.1,
               {"resource": "draft", "operation": "create", "subject": f"={{{{ $('{node}').first().json.{a['subject']} }}}}", "emailType": "html",
                "message": f"={{{{ $('{node}').first().json.{a['html']} }}}}", "options": {"sendTo": f"={{{{ $('{node}').first().json.{a['to']} }}}}"}},
               x, y, notes="Creates a DRAFT for you to review and send. Connect your Gmail credential.")
    else:
        raise ValueError(a["type"])


def run_actions(wf, dangling, actions, x, y, node="Prepare"):
    """Chain actions after `dangling` outputs [(node, idx)...]. An action with `when` is wrapped in an IF whose false output skips it.
    Returns the outputs still dangling at the end."""
    for a in actions:
        entry = a["name"]
        if a.get("when"):
            entry = if_node(wf, "If " + a["name"], f"={{{{ String(!!$('{node}').first().json.{a['when']}) }}}}", "true", x, y)
            x += 200
        add_action(wf, a, x, y, node)
        for src, idx in dangling:
            wf.link(src, entry, idx)
        if a.get("when"):
            wf.link(entry, a["name"], 0)
            dangling = [(a["name"], 0), (entry, 1)]
        else:
            dangling = [(a["name"], 0)]
        x += 200
    return dangling


def build_trigger(pack, fl, wfname):
    """Trigger node -> Config -> [Read sheet] -> Prepare -> routes by $json.status, each with its own dry-run check and actions."""
    wf = WF(wfname)
    t = fl["trigger"]
    wf.add("Trigger", t["type"], t.get("ver", 1), t["params"], 0, 0, notes=t.get("note", ""))
    config_node(wf, H.flow_cfg(pack, fl), 200, 0)
    wf.link("Trigger", "Config")
    prev, x = "Config", 400
    if fl.get("read_sheet"):
        H.node_sheet_read(wf, fl["read_node"], fl["read_sheet"], x, 0)
        wf.link(prev, fl["read_node"]); prev = fl["read_node"]; x += 200
    code_node(wf, "Prepare", custom_code(fl["js"]), x, 0)
    wf.link(prev, "Prepare")
    x += 200
    noop(wf, "Dry Run Preview", x + 1200, -300)
    noop(wf, "Ignored", x + 1200, 600)
    chain = ("Prepare", 0)
    y = 0
    for rt in fl["routes"]:
        ifn = if_node(wf, f"Is {rt['status']}?", "={{ $json.status }}", rt["status"], x, y)
        wf.link(chain[0], ifn, chain[1])
        dry = if_node(wf, f"Dry Run? ({rt['status']})", "={{ $json.dry_run }}", "true", x + 200, y - 100)
        wf.link(ifn, dry, 0)
        wf.link(dry, "Dry Run Preview", 0)
        run_actions(wf, [(dry, 1)], rt["actions"], x + 400, y - 100)
        chain = (ifn, 1)
        y += 350
    wf.link(chain[0], "Ignored", chain[1])
    return wf


def build_content(pack, fl, wfname):
    wf = WF(wfname)
    H.webhook_head(wf, fl, pack)
    C = ["content_id", "created_at", "title", "author", "source_url", "tone", "status", "draft_count"]
    H.node_sheet_write(wf, "Log Content", "Content", "append", {c: f'={{{{ $json.row["{c}"] }}}}' for c in C}, [], 1000, 0)
    wf.link("Dry Run?", "Log Content", 1)
    respond(wf, "Respond: Accepted", "={{ JSON.stringify({ status: 'accepted', content_id: $('Prepare').first().json.id }) }}", 1200, 0)
    wf.add("Call AI", "n8n-nodes-base.httpRequest", 4.2, {
        "method": "POST", "url": "https://api.anthropic.com/v1/messages", "authentication": "genericCredentialType", "genericAuthType": "httpHeaderAuth",
        "sendHeaders": True, "headerParameters": {"parameters": [{"name": "anthropic-version", "value": "2023-06-01"}, {"name": "content-type", "value": "application/json"}]},
        "sendBody": True, "specifyBody": "json", "jsonBody": "={{ JSON.stringify($('Prepare').first().json.ai_body) }}", "options": {"timeout": 180000}},
        1400, 0, onError="continueRegularOutput",
        notes="Create an HTTP Header Auth credential: name x-api-key, value = your Anthropic API key. Usage is billed to your API account.")
    code_node(wf, "Parse Drafts", custom_code("content_parse.js"), 1600, 0)
    if_node(wf, "AI OK?", "={{ $json.status }}", "ok", 1800, 0)
    code_node(wf, "Expand Drafts", "return $input.first().json.drafts.map(d => ({ json: d }));", 2000, -100)
    D = ["draft_id", "content_id", "asset_type", "platform", "title", "text", "status", "scheduled_date", "created_at"]
    H.node_sheet_write(wf, "Add Drafts", "Drafts", "append", {c: f"={{{{ $json.{c} }}}}" for c in D}, [], 2200, -100)
    code_node(wf, "Once", "return [{ json: {} }];", 2400, -100)
    H.node_sheet_write(wf, "Mark Drafted", "Content", "update",
                       {"content_id": "={{ $('Parse Drafts').first().json.content_id }}", "status": "drafted", "draft_count": "={{ $('Parse Drafts').first().json.count }}"},
                       ["content_id"], 2600, -100)
    gmail(wf, "Notify Owner", "={{ $('Parse Drafts').first().json.to }}", "={{ $('Parse Drafts').first().json.subject }}", "={{ $('Parse Drafts').first().json.html }}", 2800, -100)
    H.node_sheet_write(wf, "Mark AI Error", "Content", "update",
                       {"content_id": "={{ $json.content_id }}", "status": "ai_error"}, ["content_id"], 2000, 150)
    gmail(wf, "Notify Error", "={{ $('Parse Drafts').first().json.to }}", "={{ $('Parse Drafts').first().json.subject }}", "={{ $('Parse Drafts').first().json.html }}", 2200, 150)
    wf.chain("Log Content", "Respond: Accepted", "Call AI", "Parse Drafts", "AI OK?")
    wf.link("AI OK?", "Expand Drafts", 0)
    wf.link("AI OK?", "Mark AI Error", 1)
    wf.chain("Expand Drafts", "Add Drafts", "Once", "Mark Drafted", "Notify Owner")
    wf.chain("Mark AI Error", "Notify Error")
    return wf


def build_rss(pack, fl, wfname):
    wf = WF(wfname)
    schedule(wf, fl["cron"], 0, 0)
    config_node(wf, H.flow_cfg(pack, fl), 200, 0)
    code_node(wf, "Split Feeds", "return (cfg => (cfg.feeds || []).map(url => ({ json: { url } })))($('Config').first().json);", 400, 0)
    wf.add("Fetch Feed", "n8n-nodes-base.rssFeedRead", 1.2, {"url": "={{ $json.url }}", "options": {}}, 600, 0, onError="continueRegularOutput")
    code_node(wf, "Prepare", custom_code("rss_collect.js"), 800, 0)
    if_node(wf, "Dry Run?", "={{ $json.dry_run }}", "true", 1000, 0)
    noop(wf, "Dry Run Preview", 1200, -100)
    C = ["story_id", "created_at", "title", "link", "source", "published", "summary", "score", "status", "editor_note"]
    H.node_sheet_write(wf, "Add Stories", "Stories", "append", {c: f'={{{{ $json.row["{c}"] }}}}' for c in C}, [], 1200, 100)
    wf.chain("Schedule Trigger", "Config", "Split Feeds", "Fetch Feed", "Prepare", "Dry Run?")
    wf.link("Dry Run?", "Dry Run Preview", 0)
    wf.link("Dry Run?", "Add Stories", 1)
    return wf


def build_newsletter(pack, fl, wfname):
    wf = WF(wfname)
    schedule(wf, fl["cron"], 0, 0)
    config_node(wf, H.flow_cfg(pack, fl), 200, 0)
    H.node_sheet_read(wf, "Read Stories", "Stories", 400, 0)
    code_node(wf, "Prepare Draft", custom_code("newsletter_build.js"), 600, 0)
    if_node(wf, "Dry Run?", "={{ $json.dry_run }}", "true", 800, 0)
    noop(wf, "Dry Run Preview", 1000, -100)
    wf.add("Create Newsletter Draft", "n8n-nodes-base.gmail", 2.1,
           {"resource": "draft", "operation": "create", "subject": "={{ $json.subject }}", "emailType": "html", "message": "={{ $json.html }}",
            "options": {"sendTo": "={{ $json.to }}"}}, 1000, 100, notes="Creates a DRAFT in the editor's Gmail. It never sends to subscribers.")
    code_node(wf, "Expand Stories", custom_code("expand_ids.js"), 1200, 100)
    H.node_sheet_write(wf, "Mark Drafted", "Stories", "update",
                       {"story_id": "={{ $json.story_id }}", "status": "={{ $json.status }}", "drafted_at": "={{ $json.drafted_at }}"}, ["story_id"], 1400, 100)
    wf.chain("Schedule Trigger", "Config", "Read Stories", "Prepare Draft", "Dry Run?")
    wf.link("Dry Run?", "Dry Run Preview", 0)
    wf.link("Dry Run?", "Create Newsletter Draft", 1)
    wf.chain("Create Newsletter Draft", "Expand Stories", "Mark Drafted")
    return wf


def build_lowstock(pack, fl, wfname):
    wf = WF(wfname)
    schedule(wf, fl["cron"], 0, 0)
    config_node(wf, H.flow_cfg(pack, fl), 200, 0)
    wf.add("Shopify Products", "n8n-nodes-base.shopify", 1, {"authentication": "accessToken", "resource": "product", "operation": "getAll", "returnAll": True, "options": {}},
           400, 0, alwaysOutputData=False, notes="Connect your Shopify Access Token credential (a custom app with read_products).")
    code_node(wf, "Prepare", custom_code("shopify_lowstock.js"), 600, 0)
    if_node(wf, "Dry Run?", "={{ $json.dry_run }}", "true", 800, 0)
    noop(wf, "Dry Run Preview", 1000, -100)
    gmail(wf, "Send Alert", "={{ $json.to }}", "={{ $json.subject }}", "={{ $json.html }}", 1000, 100)
    wf.chain("Schedule Trigger", "Config", "Shopify Products", "Prepare", "Dry Run?")
    wf.link("Dry Run?", "Dry Run Preview", 0)
    wf.link("Dry Run?", "Send Alert", 1)
    return wf


def build_incident(pack, fl, wfname):
    """Webhook (uptime monitors) or Error Trigger -> shared incident logic -> open / resolve / reminder / error branches."""
    wf = WF(wfname)
    is_hook = fl["trigger_kind"] == "webhook"
    if is_hook:
        wf.add("Trigger", "n8n-nodes-base.webhook", 2, {"httpMethod": "POST", "path": fl["hook"], "responseMode": "responseNode", "options": {}}, 0, 0,
               webhookId=str(H.uuid.uuid5(H.NS, wfname + fl["hook"])))
    else:
        wf.add("Trigger", "n8n-nodes-base.errorTrigger", 1, {}, 0, 0, notes="Set THIS workflow as the Error Workflow of the workflows you want to monitor.")
    config_node(wf, H.flow_cfg(pack, fl), 200, 0)
    code_node(wf, "Prepare", custom_code("incident.js"), 400, 0)
    wf.chain("Trigger", "Config", "Prepare")
    ok = lambda: respond(wf, "Respond: OK", "={{ JSON.stringify({ status: $('Prepare').first().json.status, action: $('Prepare').first().json.action, incident: $('Prepare').first().json.id }) }}", 2600, 0) if is_hook else None  # noqa: E731
    if_node(wf, "New?", "={{ $json.status }}", "new", 600, 0)
    wf.link("Prepare", "New?")
    if is_hook:
        respond(wf, "Respond: Rejected", "={{ JSON.stringify($json) }}", 800, 400, H.STATUS_CODE)
        wf.link("New?", "Respond: Rejected", 1)
        respond(wf, "Respond: Dry Run Preview", "={{ JSON.stringify({ dry_run: true, preview: $json }) }}", 1000, -300)
    else:
        noop(wf, "Dry Run Preview", 1000, -300)
    if_node(wf, "Dry Run?", "={{ $json.dry_run }}", "true", 800, 0)
    wf.link("New?", "Dry Run?", 0)
    wf.link("Dry Run?", "Respond: Dry Run Preview" if is_hook else "Dry Run Preview", 0)
    end = "Respond: OK"
    if is_hook:
        ok()
    else:
        noop(wf, "Done", 2600, 0)
        end = "Done"
    notify = lambda name, x, y: gmail(wf, name, "={{ $('Prepare').first().json.owner_to }}", "={{ $('Prepare').first().json.owner_subject }}",  # noqa: E731
                                      "={{ $('Prepare').first().json.owner_html }}", x, y)
    cols_open = ["incident_id", "monitor", "client", "url", "severity", "status", "opened_at", "message", "closed_at", "duration_min", "alerts_sent"]
    if_node(wf, "Is Open?", "={{ $json.action }}", "open", 1000, 0)
    wf.link("Dry Run?", "Is Open?", 1)
    H.node_sheet_write(wf, "Log Incident", "Incidents", "append", rowmap(cols_open), [], 1200, -100)
    notify("Notify Owner (Open)", 1400, -100)
    if_node(wf, "If Client Draft (Open)", "={{ String(!!$('Prepare').first().json.draft_to) }}", "true", 1600, -100)
    wf.add("Draft Client Notice", "n8n-nodes-base.gmail", 2.1, {"resource": "draft", "operation": "create", "subject": "={{ $('Prepare').first().json.draft_subject }}", "emailType": "html",
           "message": "={{ $('Prepare').first().json.draft_html }}", "options": {"sendTo": "={{ $('Prepare').first().json.draft_to }}"}}, 1800, -100, notes="DRAFT for you to review and send.")
    wf.link("Is Open?", "Log Incident", 0)
    wf.chain("Log Incident", "Notify Owner (Open)", "If Client Draft (Open)")
    wf.link("If Client Draft (Open)", "Draft Client Notice", 0)
    wf.link("Draft Client Notice", end)
    wf.link("If Client Draft (Open)", end, 1)
    if_node(wf, "Is Resolve?", "={{ $json.action }}", "resolve", 1200, 300)
    wf.link("Is Open?", "Is Resolve?", 1)
    H.node_sheet_write(wf, "Close Incident", "Incidents", "update", rowmap(["incident_id", "status", "closed_at", "duration_min"]), ["incident_id"], 1400, 200)
    notify("Notify Owner (Resolved)", 1600, 200)
    if_node(wf, "If Client Draft (Resolved)", "={{ String(!!$('Prepare').first().json.draft_to) }}", "true", 1800, 200)
    wf.add("Draft Resolved Notice", "n8n-nodes-base.gmail", 2.1, {"resource": "draft", "operation": "create", "subject": "={{ $('Prepare').first().json.draft_subject }}", "emailType": "html",
           "message": "={{ $('Prepare').first().json.draft_html }}", "options": {"sendTo": "={{ $('Prepare').first().json.draft_to }}"}}, 2000, 200, notes="DRAFT for you to review and send.")
    wf.link("Is Resolve?", "Close Incident", 0)
    wf.chain("Close Incident", "Notify Owner (Resolved)", "If Client Draft (Resolved)")
    wf.link("If Client Draft (Resolved)", "Draft Resolved Notice", 0)
    wf.link("Draft Resolved Notice", end)
    wf.link("If Client Draft (Resolved)", end, 1)
    if_node(wf, "Is Error Alert?", "={{ $json.action }}", "error_alert", 1400, 500)
    wf.link("Is Resolve?", "Is Error Alert?", 1)
    H.node_sheet_write(wf, "Log Error Incident", "Incidents", "append", rowmap(cols_open[:8] + ["alerts_sent"]), [], 1600, 450)
    notify("Notify Owner (Error)", 1800, 450)
    wf.link("Is Error Alert?", "Log Error Incident", 0)
    wf.chain("Log Error Incident", "Notify Owner (Error)", end)
    notify("Notify Owner (Reminder)", 1600, 650)
    wf.link("Is Error Alert?", "Notify Owner (Reminder)", 1)
    wf.link("Notify Owner (Reminder)", end)
    return wf


BUILDERS = {"trigger": build_trigger, "content": build_content, "rss": build_rss, "newsletter": build_newsletter,
            "lowstock": build_lowstock, "incident": build_incident}
