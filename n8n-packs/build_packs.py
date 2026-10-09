"""Generates the 18 spec-driven n8n packs (workflows, sheet headers, READMEs, sample payloads, test manifests).

Specs live in packdefs/*.py. Shared Code-node logic lives in engine/*.js (tested by test/engine.test.js).
Run: python3 build_packs.py
"""
import copy
import csv
import importlib
import json
import os
import re
import sys
import uuid

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build import (NS, WF, code_node, config_node, error_workflow, gmail, if_node, respond, schedule, sheet_ref,  # noqa: E402
                   webhook)

ROOT = os.path.dirname(os.path.abspath(__file__))
SYSTEM_KEYS = {"sla_hours", "first_name", "today", "id", "route_email", "count", "overdue_count", "window_days", "flagged_count"}
COMMON_CFG = {
    "business_name": "YOUR BUSINESS NAME",
    "owner_email": "you@example.com",
    "sheet_id": "PASTE_GOOGLE_SHEET_ID",
    "timezone": "America/New_York",
    "webhook_secret": "",
    "optout_footer": "Reply STOP and we will stop sending you these emails.",
    "dry_run": True,
}
BUILD_ONLY = {"title", "lite", "hook", "cron", "tests", "test_rows", "expect_count", "kind", "rt", "notes_doc", "describe"}


def read_js(name):
    with open(os.path.join(ROOT, "engine", name)) as f:
        return f.read()


def engine_code(file):
    return read_js("_prelude.js") + "\n" + read_js(file)


# ------------------------------------------------------------------ columns
def collect_columns(pack):
    cols = {}

    def add(sheet, *names):
        lst = cols.setdefault(sheet, [])
        for n in names:
            if n and n not in lst:
                lst.append(n)

    for sh, meta in pack.get("sheets", {}).items():
        add(sh, *meta.get("columns", []))
    for fl in pack["flows"]:
        rt, k = fl["rt"], fl["kind"]
        if k == "intake":
            add(rt["sheet"], rt["id_col"], "created_at", *[f["key"] for f in rt["fields"]],
                *[c["key"] for c in rt.get("extra_cols", [])])
            if rt.get("sla"):
                add(rt["sheet"], rt["sla"]["col"], rt["sla"]["date_col"])
            if rt.get("drafts"):
                pass
            if rt.get("route", {}).get("store_col"):
                add(rt["sheet"], rt["route"]["store_col"])
            for t in rt.get("tags", []):
                add(rt["sheet"], *t["set"].keys())
            for v in rt.get("variants", []):
                add(rt["sheet"], *v.get("set", {}).keys())
        elif k == "event":
            add(rt["sheet"], rt["key_col"], "updated_at",
                *[f.get("col", f["key"]) for f in rt["fields"] if f.get("write", True)], *rt.get("set", {}).keys(), *rt.get("set_today", []))
        elif k == "sequence":
            add(rt["sheet"], rt["key_col"], rt.get("email_col", "email"), "name", rt["date_col"],
                *[s["flag"] for s in rt["steps"]], *rt.get("stop_cols", {}).keys(), *(["status"] if rt.get("base_status") else []))
        elif k == "digest":
            for s in rt["sources"]:
                add(s["sheet"], s["key_col"])
            if rt["mode"] == "list":
                L = rt["list"]
                src = next(s for s in rt["sources"] if s["name"] == L["source"])
                add(src["sheet"], *[c if isinstance(c, str) else c["key"] for c in L["columns"]], L.get("date_col"), L.get("group_by"))
            else:
                for m in rt["metrics"]:
                    src = next(s for s in rt["sources"] if s["name"] == m["source"])
                    add(src["sheet"], m.get("col"), m.get("date_col"))
        for sh, names in fl.get("columns", {}).items():
            add(sh, *names)
    return cols


def cond_fields(c, acc):
    if isinstance(c, list):
        for x in c:
            cond_fields(x, acc)
    elif isinstance(c, dict):
        for k in ("any", "all"):
            if k in c:
                cond_fields(c[k], acc)
        if "not" in c:
            cond_fields(c["not"], acc)
        if "field" in c:
            acc.add(c["field"])
        if "lte_field" in c:
            acc.add(c["lte_field"])
    return acc


PH = re.compile(r"\{\{\s*([\w.]+)\s*\}\}")


def check_templates(pack, cols):
    """Every {{placeholder}} must be a column, a payload field, a system value or a config key."""
    errors = []
    cfg_keys = set(pack["cfg"]) | set(COMMON_CFG)
    for fl in pack["flows"]:
        rt = fl["rt"]
        sheet = rt.get("sheet") or (rt["sources"][0]["sheet"] if rt.get("sources") else None) or next(iter(fl.get("columns", {})), None)
        allowed = set(SYSTEM_KEYS) | set(cols.get(sheet, [])) | set(sum((cols.get(sh, []) for sh in fl.get("columns", {})), []))
        allowed |= {f["key"] for f in rt.get("fields", [])} | set(fl.get("ctx_keys", []))
        for f in rt.get("fields", []):
            if f.get("type") == "date":
                allowed.add("days_until_" + f["key"])
        if fl["kind"] == "digest":
            for s in rt["sources"]:
                allowed |= set(cols.get(s["sheet"], []))
            allowed |= {"overdue"}

        def walk(o, path):
            if isinstance(o, dict):
                for kk, vv in o.items():
                    if kk in ("subject", "body", "intro", "outro") and isinstance(vv, str):
                        for m in PH.finditer(vv):
                            k = m.group(1)
                            if k not in allowed and k not in cfg_keys and k.split(".")[0] not in cfg_keys:
                                errors.append(f"{pack['slug']}/{fl['id']}: unknown placeholder {{{{{k}}}}} at {path}.{kk}")
                    else:
                        walk(vv, f"{path}.{kk}")
            elif isinstance(o, list):
                for i, x in enumerate(o):
                    walk(x, f"{path}[{i}]")
        walk(rt, fl["id"])
        # condition fields must exist
        conds = set()
        for t in rt.get("tags", []):
            cond_fields(t["when"], conds)
        for v in rt.get("variants", []):
            cond_fields(v["when"], conds)
        for s in rt.get("steps", []):
            cond_fields(s.get("where"), conds)
        cond_fields(rt.get("where"), conds)
        if rt.get("list"):
            cond_fields(rt["list"].get("where"), conds)
        for m in rt.get("metrics", []):
            cond_fields(m.get("where"), conds)
        for c in conds:
            if c not in allowed and c not in {"status"} | set(cols.get(sheet, [])) and not any(c in cols.get(s["sheet"], []) for s in rt.get("sources", [])):
                errors.append(f"{pack['slug']}/{fl['id']}: condition field '{c}' is not a known column")
    return errors


# ----------------------------------------------------------------- workflows
def flow_cfg(pack, fl):
    c = copy.deepcopy(COMMON_CFG)
    c.update(copy.deepcopy(pack["cfg"]))
    rt = copy.deepcopy(fl["rt"])
    c["flow"] = rt
    return c


def node_sheet_read(wf, name, sheet, x, y):
    return wf.add(name, "n8n-nodes-base.googleSheets", 4.5,
                  {"resource": "sheet", "operation": "read", **sheet_ref(sheet), "options": {}}, x, y,
                  notes="Connect your Google Sheets credential.", alwaysOutputData=True)


def node_sheet_write(wf, name, sheet, op, mapping, match, x, y):
    return wf.add(name, "n8n-nodes-base.googleSheets", 4.5,
                  {"resource": "sheet", "operation": op, **sheet_ref(sheet),
                   "columns": {"mappingMode": "defineBelow", "value": mapping, "matchingColumns": match, "schema": []},
                   "options": {}}, x, y, notes="Connect your Google Sheets credential.")


STATUS_CODE = '={{ Number($json.status === "unauthorized" ? 401 : ($json.status === "invalid" ? 422 : 200)) }}'


def webhook_head(wf, fl, pack):
    webhook(wf, fl["hook"], 0, 0)
    cfg = flow_cfg(pack, fl)
    config_node(wf, cfg, 200, 0)
    import customflows
    code_node(wf, "Prepare", customflows.custom_code(fl["js"]) if fl.get("js") else engine_code(fl["kind"] + ".js"), 400, 0)
    if_node(wf, "Valid and New?", "={{ $json.status }}", "new", 600, 0)
    respond(wf, "Respond: Rejected", "={{ JSON.stringify($json) }}", 800, 160, STATUS_CODE)
    if_node(wf, "Dry Run?", "={{ $json.dry_run }}", "true", 800, -80)
    respond(wf, "Respond: Dry Run Preview", "={{ JSON.stringify({ dry_run: true, preview: $json }) }}", 1000, -200)
    wf.chain("Webhook", "Config", "Prepare", "Valid and New?")
    wf.link("Valid and New?", "Dry Run?", 0)
    wf.link("Valid and New?", "Respond: Rejected", 1)
    wf.link("Dry Run?", "Respond: Dry Run Preview", 0)


def build_intake(pack, fl, wfname):
    wf = WF(wfname)
    rt = fl["rt"]
    webhook_head(wf, fl, pack)
    cols = [rt["id_col"], "created_at"] + [f["key"] for f in rt["fields"]] + [c["key"] for c in rt.get("extra_cols", [])]
    if rt.get("route", {}).get("store_col"):
        cols.append(rt["route"]["store_col"])
    if rt.get("sla"):
        cols += [rt["sla"]["col"], rt["sla"]["date_col"]]
    for t in rt.get("tags", []):
        cols += [k for k in t["set"] if k not in cols]
    for v in rt.get("variants", []):
        cols += [k for k in v.get("set", {}) if k not in cols]
    mapping = {c: f'={{{{ $json.row["{c}"] }}}}' for c in dict.fromkeys(cols)}
    node_sheet_write(wf, "Log Entry", rt["sheet"], "append", mapping, [], 1000, 0)
    wf.link("Dry Run?", "Log Entry", 1)
    prev, x = "Log Entry", 1200
    if rt.get("ack"):
        gmail(wf, "Send Acknowledgement", "={{ $('Prepare').first().json.ack_to }}", "={{ $('Prepare').first().json.ack_subject }}",
              "={{ $('Prepare').first().json.ack_html }}", x, 0)
        wf.link(prev, "Send Acknowledgement"); prev = "Send Acknowledgement"; x += 200
    if rt.get("drafts"):
        wf.add("Create Reply Draft", "n8n-nodes-base.gmail", 2.1,
               {"resource": "draft", "operation": "create", "subject": "={{ $('Prepare').first().json.draft_subject }}",
                "emailType": "html", "message": "={{ $('Prepare').first().json.draft_html }}",
                "options": {"sendTo": "={{ $('Prepare').first().json.draft_to }}"}}, x, 0,
               notes="Creates a DRAFT for a human to review and send. Connect your Gmail credential.")
        wf.link(prev, "Create Reply Draft"); prev = "Create Reply Draft"; x += 200
    if rt.get("owner"):
        gmail(wf, "Notify Owner", "={{ $('Prepare').first().json.owner_to }}", "={{ $('Prepare').first().json.owner_subject }}",
              "={{ $('Prepare').first().json.owner_html }}", x, 0)
        wf.link(prev, "Notify Owner"); prev = "Notify Owner"; x += 200
    code_node(wf, "Summary", read_js("summary.js"), x, 0)
    respond(wf, "Respond: OK", "={{ JSON.stringify($json) }}", x + 200, 0)
    wf.chain(prev, "Summary", "Respond: OK")
    return wf


def build_event(pack, fl, wfname):
    wf = WF(wfname)
    rt = fl["rt"]
    webhook_head(wf, fl, pack)
    cols = [rt["key_col"], "updated_at"] + [f.get("col", f["key"]) for f in rt["fields"] if f.get("write", True) and f["key"] != rt.get("key_field", rt["key_col"])] + list(rt.get("set", {})) + list(rt.get("set_today", []))
    mapping = {c: f'={{{{ $json.row["{c}"] }}}}' for c in dict.fromkeys(cols)}
    node_sheet_write(wf, "Update Row", rt["sheet"], "update", mapping, [rt["key_col"]], 1000, 0)
    prev = "Update Row"
    wf.link("Dry Run?", "Update Row", 1)
    x = 1200
    if rt.get("email") or rt.get("emails"):
        gmail(wf, "Email Customer", "={{ $('Prepare').first().json.mail_to }}", "={{ $('Prepare').first().json.mail_subject }}",
              "={{ $('Prepare').first().json.mail_html }}", x, 0)
        wf.link(prev, "Email Customer"); prev = "Email Customer"; x += 200
    if rt.get("owner"):
        gmail(wf, "Notify Owner", "={{ $('Prepare').first().json.owner_to }}", "={{ $('Prepare').first().json.owner_subject }}",
              "={{ $('Prepare').first().json.owner_html }}", x, 0)
        wf.link(prev, "Notify Owner"); prev = "Notify Owner"; x += 200
    code_node(wf, "Summary", read_js("summary.js"), x, 0)
    respond(wf, "Respond: OK", "={{ JSON.stringify($json) }}", x + 200, 0)
    wf.chain(prev, "Summary", "Respond: OK")
    return wf


def build_sequence(pack, fl, wfname):
    wf = WF(wfname)
    rt = fl["rt"]
    rt["read_node"] = "Read " + rt["sheet"]
    schedule(wf, fl["cron"], 0, 0)
    config_node(wf, flow_cfg(pack, fl), 200, 0)
    node_sheet_read(wf, rt["read_node"], rt["sheet"], 400, 0)
    code_node(wf, "Prepare", engine_code("sequence.js"), 600, 0)
    gmail(wf, "Send Message", "={{ $json.to }}", "={{ $json.subject }}", "={{ $json.html }}", 800, 0)
    flags = [s["flag"] for s in rt["steps"]]
    mapping = {rt["key_col"]: f"={{{{ $('Prepare').item.json['{rt['key_col']}'] }}}}"}
    for f in flags:
        mapping[f] = f"={{{{ $('Prepare').item.json['{f}'] }}}}"
    node_sheet_write(wf, "Mark Sent", rt["sheet"], "appendOrUpdate", mapping, [rt["key_col"]], 1000, 0)
    wf.chain("Schedule Trigger", "Config", rt["read_node"], "Prepare", "Send Message", "Mark Sent")
    return wf


def build_digest(pack, fl, wfname):
    wf = WF(wfname)
    rt = fl["rt"]
    for s in rt["sources"]:
        s["node"] = "Read " + s["sheet"]
    schedule(wf, fl["cron"], 0, 0)
    config_node(wf, flow_cfg(pack, fl), 200, 0)
    prev, x = "Config", 400
    wf.link("Schedule Trigger", "Config")
    seen = []
    for s in rt["sources"]:
        if s["sheet"] in seen:
            continue
        seen.append(s["sheet"])
        if prev != "Config":  # collapse to a single item so the next read runs once
            once = f"Once {len(seen)}"
            code_node(wf, once, "return [{ json: {} }];", x, 0)
            wf.link(prev, once); prev = once; x += 200
        node_sheet_read(wf, s["node"], s["sheet"], x, 0)
        wf.link(prev, s["node"]); prev = s["node"]; x += 200
    code_node(wf, "Prepare", engine_code("digest.js"), x, 0)
    gmail(wf, "Send Digest", "={{ $json.to }}", "={{ $json.subject }}", "={{ $json.html }}", x + 200, 0)
    wf.chain(prev, "Prepare", "Send Digest")
    return wf


BUILDERS = {"intake": build_intake, "event": build_event, "sequence": build_sequence, "digest": build_digest}


def build_pack(pack, extra_builders):
    out = os.path.join(ROOT, "packs", pack["slug"])
    os.makedirs(os.path.join(out, "workflows"), exist_ok=True)
    os.makedirs(os.path.join(out, "sheets"), exist_ok=True)
    os.makedirs(os.path.join(out, "sample-data"), exist_ok=True)
    cols = collect_columns(pack)
    errors = check_templates(pack, cols)
    manifest = []
    files = []
    for i, fl in enumerate(pack["flows"], 1):
        fl["n"] = i
        wfname = f"{pack['short']} {i} - {fl['title']}"
        fl["wfname"] = wfname
        builder = BUILDERS.get(fl["kind"]) or extra_builders[fl["kind"]]
        wf = builder(pack, fl, wfname)
        fname = f"{i}-{re.sub('[^a-z0-9]+', '-', fl['title'].lower()).strip('-')}.json"
        fl["file"] = fname
        with open(os.path.join(out, "workflows", fname), "w") as f:
            json.dump(wf.json(), f, indent=2); f.write("\n")
        files.append(fname)
        if fl.get("hook"):
            sample = fl.get("sample") or {fd["key"]: fd["sample"] for fd in fl["rt"].get("fields", []) if "sample" in fd}
            with open(os.path.join(out, "sample-data", fname.replace(".json", "-payload.json")), "w") as f:
                json.dump(sample, f, indent=2); f.write("\n")
            manifest.append({"pack": pack["slug"], "workflow": wfname, "path": fl["hook"], "valid": sample,
                             "expect_valid": fl.get("expect_valid", '"dry_run":true')})
    n = len(pack["flows"]) + 1
    err_name = f"{pack['short']} {n} - Error Alert"
    cfg0 = copy.deepcopy(COMMON_CFG); cfg0.update(pack["cfg"])
    ew = error_workflow(pack["short"], cfg0)
    ew.name = err_name
    for nd in ew.nodes:
        nd["id"] = str(uuid.uuid5(NS, err_name + nd["name"]))
    with open(os.path.join(out, "workflows", f"{n}-error-alert.json"), "w") as f:
        d = ew.json(); d["id"] = uuid.uuid5(NS, "wf" + err_name).hex[:16]
        json.dump(d, f, indent=2); f.write("\n")
    for sh, names in cols.items():
        with open(os.path.join(out, "sheets", f"{sh}.csv"), "w", newline="") as f:
            csv.writer(f).writerow(names)
    return {"errors": errors, "cols": cols, "manifest": manifest}


def main():
    names = sorted(m[:-3] for m in os.listdir(os.path.join(ROOT, "packdefs")) if re.match(r"p\d+_.*\.py$", m))
    import customflows
    customflows.H = sys.modules[__name__]
    extra = customflows.BUILDERS
    all_errors, manifest, specs = [], [], []
    for n in names:
        mod = importlib.import_module("packdefs." + n)
        pack = mod.PACK
        res = build_pack(pack, extra)
        all_errors += res["errors"]
        manifest += res["manifest"]
        specs.append({"slug": pack["slug"], "cfg": {**COMMON_CFG, **pack["cfg"]}, "flows": pack["flows"], "cols": res["cols"]})
        try:
            import docs
            docs.write_pack_docs(ROOT, pack, res["cols"])
        except ImportError:
            pass
        print("built", pack["slug"], len(pack["flows"]) + 1, "workflows")
    try:
        import docs
        docs.write_catalog(ROOT, [importlib.import_module("packdefs." + n).PACK for n in names])
    except ImportError:
        pass
    with open(os.path.join(ROOT, "test", "specs.json"), "w") as f:
        json.dump(specs, f, indent=1)
    with open(os.path.join(ROOT, "test", "e2e-cases.json"), "w") as f:
        json.dump(manifest, f, indent=1)
    if all_errors:
        print("\nTEMPLATE/SPEC ERRORS:")
        print("\n".join(all_errors))
        sys.exit(1)


if __name__ == "__main__":
    main()
