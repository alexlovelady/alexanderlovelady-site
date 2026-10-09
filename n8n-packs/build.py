"""Generates the importable n8n workflow JSON + Google Sheets header CSVs for both packs.
Logic lives in <pack>/logic/*.js (tested by test/run_logic.js) and is embedded into Code nodes here.
Run: python3 build.py
"""
import csv
import json
import os
import uuid

ROOT = os.path.dirname(os.path.abspath(__file__))
NS = uuid.UUID("6f1c1c1e-0000-4000-8000-000000000001")
PINNED_N8N = "2.42.5"


def code(pack, fname):
    with open(os.path.join(ROOT, pack, "logic", fname)) as f:
        return f.read()


class WF:
    def __init__(self, name):
        self.name, self.nodes, self.conn = name, [], {}
        self._x = 0

    def add(self, name, ntype, ver, params, x, y, **extra):
        n = {"parameters": params, "id": str(uuid.uuid5(NS, self.name + name)), "name": name,
             "type": ntype, "typeVersion": ver, "position": [x, y]}
        n.update(extra)
        self.nodes.append(n)
        return name

    def link(self, a, b, out=0):
        self.conn.setdefault(a, {"main": []})
        m = self.conn[a]["main"]
        while len(m) <= out:
            m.append([])
        m[out].append({"node": b, "type": "main", "index": 0})

    def chain(self, *names):
        for a, b in zip(names, names[1:]):
            self.link(a, b)

    def json(self):
        return {"name": self.name, "nodes": self.nodes, "connections": self.conn, "active": False,
                "settings": {"executionOrder": "v1"}, "versionId": str(uuid.uuid5(NS, "v" + self.name)),
                "meta": {"templateCredsSetupCompleted": False}, "tags": []}


def config_node(wf, cfg, x, y):
    return wf.add("Config", "n8n-nodes-base.set", 3.4,
                  {"mode": "raw", "jsonOutput": json.dumps(cfg, indent=2), "options": {}}, x, y,
                  notes="EDIT ME: every setting for this pack lives in this node.", notesInFlow=True)


def webhook(wf, path, x, y):
    return wf.add("Webhook", "n8n-nodes-base.webhook", 2,
                  {"httpMethod": "POST", "path": path, "responseMode": "responseNode", "options": {}}, x, y,
                  webhookId=str(uuid.uuid5(NS, wf.name + path)))


def schedule(wf, cron, x, y):
    return wf.add("Schedule Trigger", "n8n-nodes-base.scheduleTrigger", 1.2,
                  {"rule": {"interval": [{"field": "cronExpression", "expression": cron}]}}, x, y)


def code_node(wf, name, src, x, y):
    return wf.add(name, "n8n-nodes-base.code", 2, {"jsCode": src}, x, y)


def if_node(wf, name, left, right, x, y, op="equals"):
    return wf.add(name, "n8n-nodes-base.if", 2.2, {
        "conditions": {"options": {"caseSensitive": True, "leftValue": "", "typeValidation": "loose", "version": 2},
                       "conditions": [{"id": str(uuid.uuid5(NS, wf.name + name)), "leftValue": left, "rightValue": right,
                                       "operator": {"type": "string", "operation": op}}], "combinator": "and"},
        "options": {}}, x, y)


def respond(wf, name, body, x, y, code_expr="200"):
    return wf.add(name, "n8n-nodes-base.respondToWebhook", 1.1,
                  {"respondWith": "json", "responseBody": body, "options": {"responseCode": code_expr}}, x, y)


def gmail(wf, name, to, subject, html, x, y):
    return wf.add(name, "n8n-nodes-base.gmail", 2.1,
                  {"resource": "message", "operation": "send", "sendTo": to, "subject": subject, "emailType": "html",
                   "message": html, "options": {"appendAttribution": False}}, x, y,
                  notes="Connect your Gmail credential.", notesInFlow=False)


def sheet_ref(sheet):
    return {"documentId": {"__rl": True, "value": "={{ $('Config').first().json.sheet_id }}", "mode": "id"},
            "sheetName": {"__rl": True, "value": sheet, "mode": "name"}}


def sheet_read(wf, name, sheet, x, y):
    return wf.add(name, "n8n-nodes-base.googleSheets", 4.5,
                  {"resource": "sheet", "operation": "read", **sheet_ref(sheet), "options": {}}, x, y,
                  notes="Connect your Google Sheets credential.", notesInFlow=False)


def sheet_write(wf, name, sheet, op, mapping, match, x, y):
    params = {"resource": "sheet", "operation": op, **sheet_ref(sheet),
              "columns": {"mappingMode": "defineBelow", "value": mapping, "matchingColumns": match, "schema": []},
              "options": {}}
    return wf.add(name, "n8n-nodes-base.googleSheets", 4.5, params, x, y,
                  notes="Connect your Google Sheets credential.", notesInFlow=False)


def error_workflow(pack_name, cfg):
    wf = WF(f"{pack_name} - Error Alert")
    wf.add("Error Trigger", "n8n-nodes-base.errorTrigger", 1, {}, 0, 0)
    config_node(wf, cfg, 220, 0)
    gmail(wf, "Email Owner", "={{ $('Config').first().json.owner_email }}",
          "=n8n workflow failed: {{ $('Error Trigger').first().json.workflow.name }}",
          "=<p>Workflow <strong>{{ $('Error Trigger').first().json.workflow.name }}</strong> failed at node "
          "<strong>{{ $('Error Trigger').first().json.execution.lastNodeExecuted }}</strong>.</p>"
          "<p>{{ $('Error Trigger').first().json.execution.error.message }}</p>"
          "<p>Execution: {{ $('Error Trigger').first().json.execution.url }}</p>", 440, 0)
    wf.chain("Error Trigger", "Config", "Email Owner")
    return wf


def write(pack, fname, wf):
    d = os.path.join(ROOT, pack, "workflows")
    os.makedirs(d, exist_ok=True)
    with open(os.path.join(d, fname), "w") as f:
        json.dump(wf.json(), f, indent=2)
        f.write("\n")
    print("wrote", pack, fname)


def write_csv(pack, fname, headers):
    d = os.path.join(ROOT, pack, "sheets")
    os.makedirs(d, exist_ok=True)
    with open(os.path.join(d, fname), "w", newline="") as f:
        csv.writer(f).writerow(headers)


# =========================================================== AGENCY
AG = "agency-client-onboarding"
AG_CFG = {
    "agency_name": "YOUR AGENCY NAME",
    "owner_email": "you@example.com",
    "default_pm_name": "Your Name",
    "default_pm_email": "you@example.com",
    "intake_form_url": "https://example.com/intake-form",
    "calendar_link": "https://example.com/book-kickoff",
    "folder_prefix": "Client",
    "drive_parent_folder_id": "root",
    "sheet_id": "PASTE_GOOGLE_SHEET_ID",
    "timezone": "America/New_York",
    "digest_days_ahead": 2,
    "webhook_secret": "",
    "dry_run": True,
}
AG_CLIENT_COLS = ["deal_id", "client_name", "contact_name", "contact_email", "package", "pm_email", "kickoff_date",
                  "folder_name", "created_at", "reminder_sent"]
AG_TASK_COLS = ["task_id", "deal_id", "client_name", "task", "owner", "owner_email", "due_date", "status"]


def agency():
    # 1. Deal won -> kickoff
    w = WF("Agency 1 - Deal Won to Onboarding Kickoff")
    webhook(w, "agency-deal-won", 0, 0)
    config_node(w, AG_CFG, 200, 0)
    code_node(w, "Prepare Deal", code(AG, "01-prepare-deal.js"), 400, 0)
    if_node(w, "Valid and New?", "={{ $json.status }}", "new", 600, 0)
    respond(w, "Respond: Rejected", "={{ JSON.stringify($json) }}",
            800, 160, '={{ $json.status === "unauthorized" ? 401 : ($json.status === "invalid" ? 422 : 200) }}')
    if_node(w, "Dry Run?", "={{ $json.dry_run }}", "true", 800, -80, op="equals")
    respond(w, "Respond: Dry Run Preview", "={{ JSON.stringify({ dry_run: true, preview: $json }) }}", 1000, -200)
    gmail(w, "Send Welcome Email", "={{ $json.contact_email }}", "={{ $json.welcome_subject }}", "={{ $json.welcome_html }}", 1000, 0)
    w.add("Create Drive Folder", "n8n-nodes-base.googleDrive", 3,
          {"resource": "folder", "operation": "create", "name": "={{ $('Prepare Deal').first().json.folder_name }}",
           "driveId": {"__rl": True, "mode": "list", "value": "My Drive"},
           "folderId": {"__rl": True, "mode": "id", "value": "={{ $('Config').first().json.drive_parent_folder_id }}"},
           "options": {}}, 1200, 0, notes="Connect your Google Drive credential.")
    m = {c: f"={{{{ $('Prepare Deal').first().json.{c} }}}}" for c in AG_CLIENT_COLS if c != "reminder_sent"}
    m["reminder_sent"] = ""
    sheet_write(w, "Log Client", "Clients", "appendOrUpdate", m, ["deal_id"], 1400, 0)
    code_node(w, "Expand Tasks", code(AG, "02-expand-tasks.js"), 1600, 0)
    mt = {c: f"={{{{ $json.{c} }}}}" for c in AG_TASK_COLS}
    sheet_write(w, "Add Tasks", "Tasks", "append", mt, [], 1800, 0)
    code_node(w, "Summary", code(AG, "03-summary.js"), 2000, 0)
    respond(w, "Respond: OK", "={{ JSON.stringify($json) }}", 2200, 0)
    w.chain("Webhook", "Config", "Prepare Deal", "Valid and New?")
    w.link("Valid and New?", "Dry Run?", 0)
    w.link("Valid and New?", "Respond: Rejected", 1)
    w.link("Dry Run?", "Respond: Dry Run Preview", 0)
    w.link("Dry Run?", "Send Welcome Email", 1)
    w.chain("Send Welcome Email", "Create Drive Folder", "Log Client", "Expand Tasks", "Add Tasks", "Summary", "Respond: OK")
    write(AG, "1-deal-won-to-kickoff.json", w)

    # 2. Kickoff reminder
    w = WF("Agency 2 - Kickoff Reminder")
    schedule(w, "0 8 * * *", 0, 0)
    config_node(w, AG_CFG, 200, 0)
    sheet_read(w, "Read Clients", "Clients", 400, 0)
    code_node(w, "Find Tomorrows Kickoffs", code(AG, "04-kickoff-reminders.js"), 600, 0)
    gmail(w, "Send Reminder", "={{ $json.to }}", "={{ $json.subject }}", "={{ $json.html }}", 800, 0)
    sheet_write(w, "Mark Reminder Sent", "Clients", "appendOrUpdate",
                {"deal_id": "={{ $('Find Tomorrows Kickoffs').item.json.deal_id }}", "reminder_sent": "yes"}, ["deal_id"], 1000, 0)
    w.chain("Schedule Trigger", "Config", "Read Clients", "Find Tomorrows Kickoffs", "Send Reminder", "Mark Reminder Sent")
    write(AG, "2-kickoff-reminder.json", w)

    # 3. Task digest
    w = WF("Agency 3 - Daily Task Digest")
    schedule(w, "0 8 * * 1-5", 0, 0)
    config_node(w, AG_CFG, 200, 0)
    sheet_read(w, "Read Tasks", "Tasks", 400, 0)
    code_node(w, "Build Digests", code(AG, "05-task-digest.js"), 600, 0)
    gmail(w, "Send Digest", "={{ $json.to }}", "={{ $json.subject }}", "={{ $json.html }}", 800, 0)
    w.chain("Schedule Trigger", "Config", "Read Tasks", "Build Digests", "Send Digest")
    write(AG, "3-daily-task-digest.json", w)

    write(AG, "4-error-alert.json", error_workflow("Agency", AG_CFG))
    write_csv(AG, "Clients.csv", AG_CLIENT_COLS)
    write_csv(AG, "Tasks.csv", AG_TASK_COLS)


# =========================================================== CLEANING
CL = "cleaning-lead-to-booking"
CL_CFG = {
    "business_name": "YOUR CLEANING BUSINESS",
    "business_phone": "(555) 000-0000",
    "owner_email": "you@example.com",
    "booking_link": "https://example.com/book",
    "review_link": "https://g.page/r/YOUR-REVIEW-LINK",
    "sheet_id": "PASTE_GOOGLE_SHEET_ID",
    "calendar_id": "primary",
    "timezone": "America/New_York",
    "service_zips": [],
    "rebook_after_days": 30,
    "webhook_secret": "",
    "dry_run": True,
    "pricing": {
        "base_hours": 1.5, "hours_per_bedroom": 0.5, "hours_per_bathroom": 0.75, "hours_per_extra_1000_sqft": 0.5,
        "price_per_labor_hour": 60, "minimum_price": 90, "range_percent": 15,
        "service_multipliers": {"standard": 1, "deep": 1.6, "move-out": 1.8},
        "frequency_discounts": {"one-time": 0, "monthly": 0.05, "biweekly": 0.1, "weekly": 0.15},
    },
}
CL_LEAD_COLS = ["lead_id", "created_at", "name", "email", "phone", "service", "beds", "baths", "frequency", "zip",
                "preferred_date", "notes", "in_area", "est_low", "est_high", "status", "followups_stopped", "fu1_sent",
                "fu2_sent", "booking_date", "booking_time", "address", "reminder_sent", "feedback_sent", "rebook_sent"]


def cleaning():
    w = WF("Cleaning 1 - New Lead Instant Estimate")
    webhook(w, "cleaning-new-lead", 0, 0)
    config_node(w, CL_CFG, 200, 0)
    code_node(w, "Prepare Lead", code(CL, "01-prepare-lead.js"), 400, 0)
    if_node(w, "Valid and New?", "={{ $json.status }}", "new", 600, 0)
    respond(w, "Respond: Rejected", "={{ JSON.stringify($json) }}", 800, 160,
            '={{ $json.status === "unauthorized" ? 401 : ($json.status === "invalid" ? 422 : 200) }}')
    if_node(w, "Dry Run?", "={{ $json.dry_run }}", "true", 800, -80)
    respond(w, "Respond: Dry Run Preview", "={{ JSON.stringify({ dry_run: true, preview: $json }) }}", 1000, -200)
    m = {"lead_id": "lead_id", "created_at": "created_at", "name": "name", "email": "email", "phone": "phone",
         "service": "service", "beds": "beds", "baths": "baths", "frequency": "frequency", "zip": "zip",
         "preferred_date": "preferred_date", "notes": "notes", "in_area": "in_area", "est_low": "est_low",
         "est_high": "est_high", "status": "lead_status"}
    mapping = {col: f"={{{{ $json.{src} }}}}" for col, src in m.items()}
    mapping.update({"followups_stopped": "", "fu1_sent": "", "fu2_sent": ""})
    sheet_write(w, "Log Lead", "Leads", "append", mapping, [], 1000, 0)
    gmail(w, "Send Customer Reply", "={{ $('Prepare Lead').first().json.email }}",
          "={{ $('Prepare Lead').first().json.customer_subject }}", "={{ $('Prepare Lead').first().json.customer_html }}", 1200, 0)
    gmail(w, "Notify Owner", "={{ $('Config').first().json.owner_email }}",
          "={{ $('Prepare Lead').first().json.owner_subject }}", "={{ $('Prepare Lead').first().json.owner_html }}", 1400, 0)
    code_node(w, "Summary", code(CL, "05-summary.js"), 1600, 0)
    respond(w, "Respond: OK", "={{ JSON.stringify($json) }}", 1800, 0)
    w.chain("Webhook", "Config", "Prepare Lead", "Valid and New?")
    w.link("Valid and New?", "Dry Run?", 0)
    w.link("Valid and New?", "Respond: Rejected", 1)
    w.link("Dry Run?", "Respond: Dry Run Preview", 0)
    w.link("Dry Run?", "Log Lead", 1)
    w.chain("Log Lead", "Send Customer Reply", "Notify Owner", "Summary", "Respond: OK")
    write(CL, "1-new-lead-instant-estimate.json", w)

    w = WF("Cleaning 2 - Quote Follow-Ups")
    schedule(w, "0 10 * * *", 0, 0)
    config_node(w, CL_CFG, 200, 0)
    sheet_read(w, "Read Leads", "Leads", 400, 0)
    code_node(w, "Prepare Follow-ups", code(CL, "02-followups.js"), 600, 0)
    gmail(w, "Send Follow-up", "={{ $json.to }}", "={{ $json.subject }}", "={{ $json.html }}", 800, 0)
    mk = {"lead_id": "={{ $('Prepare Follow-ups').item.json.lead_id }}",
          "fu1_sent": "={{ $('Prepare Follow-ups').item.json.fu1_sent }}",
          "fu2_sent": "={{ $('Prepare Follow-ups').item.json.fu2_sent }}"}
    sheet_write(w, "Mark Sent", "Leads", "appendOrUpdate", mk, ["lead_id"], 1000, 0)
    w.chain("Schedule Trigger", "Config", "Read Leads", "Prepare Follow-ups", "Send Follow-up", "Mark Sent")
    write(CL, "2-quote-follow-ups.json", w)

    w = WF("Cleaning 3 - Booking Confirmation")
    webhook(w, "cleaning-booking", 0, 0)
    config_node(w, CL_CFG, 200, 0)
    code_node(w, "Prepare Booking", code(CL, "03-prepare-booking.js"), 400, 0)
    if_node(w, "Valid and New?", "={{ $json.status }}", "new", 600, 0)
    respond(w, "Respond: Rejected", "={{ JSON.stringify($json) }}", 800, 160,
            '={{ $json.status === "unauthorized" ? 401 : ($json.status === "invalid" ? 422 : 200) }}')
    if_node(w, "Dry Run?", "={{ $json.dry_run }}", "true", 800, -80)
    respond(w, "Respond: Dry Run Preview", "={{ JSON.stringify({ dry_run: true, preview: $json }) }}", 1000, -200)
    mb = {c: f"={{{{ $json.{s} }}}}" for c, s in [("lead_id", "lead_id"), ("status", "lead_status"), ("booking_date", "booking_date"),
                                                   ("booking_time", "booking_time"), ("address", "address"), ("reminder_sent", "reminder_sent")]}
    sheet_write(w, "Update Lead", "Leads", "appendOrUpdate", mb, ["lead_id"], 1000, 0)
    gmail(w, "Send Confirmation", "={{ $('Prepare Booking').first().json.email }}",
          "={{ $('Prepare Booking').first().json.subject }}", "={{ $('Prepare Booking').first().json.html }}", 1200, 0)
    w.add("Create Calendar Event", "n8n-nodes-base.googleCalendar", 1.3,
          {"calendar": {"__rl": True, "value": "={{ $('Config').first().json.calendar_id }}", "mode": "id"},
           "start": "={{ $('Prepare Booking').first().json.start_iso }}", "end": "={{ $('Prepare Booking').first().json.end_iso }}",
           "additionalFields": {"summary": "={{ $('Prepare Booking').first().json.event_title }}",
                                "location": "={{ $('Prepare Booking').first().json.address }}"}}, 1400, 0,
          notes="Connect your Google Calendar credential, or delete this node.")
    respond(w, "Respond: OK", "={{ JSON.stringify({ status: 'booked', lead_id: $('Prepare Booking').first().json.lead_id }) }}", 1600, 0)
    w.chain("Webhook", "Config", "Prepare Booking", "Valid and New?")
    w.link("Valid and New?", "Dry Run?", 0)
    w.link("Valid and New?", "Respond: Rejected", 1)
    w.link("Dry Run?", "Respond: Dry Run Preview", 0)
    w.link("Dry Run?", "Update Lead", 1)
    w.chain("Update Lead", "Send Confirmation", "Create Calendar Event", "Respond: OK")
    write(CL, "3-booking-confirmation.json", w)

    w = WF("Cleaning 4 - Daily Customer Touchpoints")
    schedule(w, "0 17 * * *", 0, 0)
    config_node(w, CL_CFG, 200, 0)
    sheet_read(w, "Read Leads", "Leads", 400, 0)
    code_node(w, "Prepare Touchpoints", code(CL, "04-touchpoints.js"), 600, 0)
    gmail(w, "Send Message", "={{ $json.to }}", "={{ $json.subject }}", "={{ $json.html }}", 800, 0)
    mt = {c: f"={{{{ $('Prepare Touchpoints').item.json.{c} }}}}" for c in ["lead_id", "reminder_sent", "feedback_sent", "rebook_sent"]}
    sheet_write(w, "Mark Sent", "Leads", "appendOrUpdate", mt, ["lead_id"], 1000, 0)
    w.chain("Schedule Trigger", "Config", "Read Leads", "Prepare Touchpoints", "Send Message", "Mark Sent")
    write(CL, "4-daily-touchpoints.json", w)

    write(CL, "5-error-alert.json", error_workflow("Cleaning", CL_CFG))
    write_csv(CL, "Leads.csv", CL_LEAD_COLS)


if __name__ == "__main__":
    agency()
    cleaning()
