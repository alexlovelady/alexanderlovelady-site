// Incident logic: groups repeated alerts into one incident, alerts once, reminds periodically, and closes on recovery.
// Accepts uptime-monitor webhooks (status down/up, or common synonyms) and n8n Error Trigger payloads (status error).
const store = $getWorkflowStaticData('global');
store.incidents = store.incidents || {}; store.errors = store.errors || {};
const DOWN = ['down', 'offline', 'failed', 'failure', 'critical', 'started', 'triggered', 'alert', 'firing', '1'];
const UP = ['up', 'online', 'recovered', 'resolved', 'ok', 'healthy', '2'];
const now = Number(cfg.now_override || Date.now());
const mins = Number;
const out = [];
for (const it of $('Trigger').all()) {
  const dry = cfg.dry_run === true;
  const j = it.json;
  let monitor, status, message, url, sev, isErr = false;
  if (j.workflow && j.execution) { isErr = true; monitor = j.workflow.name; status = 'error'; message = (j.execution.error && j.execution.error.message) || 'workflow failed'; url = j.execution.url || ''; }
  else {
    if (authFails(it)) { out.push({ json: { status: 'unauthorized', dry_run: dry } }); continue; }
    const b = j.body || {};
    monitor = String(b.monitor || b.monitorFriendlyName || b.name || '').trim();
    const raw = lc(b.status ?? b.alertType ?? b.state ?? '');
    status = DOWN.includes(raw) ? 'down' : UP.includes(raw) ? 'up' : raw === 'error' ? 'error' : '';
    message = String(b.message || b.alertDetails || b.error || '').slice(0, 500); url = String(b.url || b.monitorURL || '').slice(0, 300); sev = lc(b.severity);
    const errs = []; if (!monitor) errs.push('missing monitor'); if (!status) errs.push('status must be down, up or error (got "' + raw + '")');
    if (errs.length) { out.push({ json: { status: 'invalid', errors: errs, dry_run: dry } }); continue; }
    isErr = status === 'error';
  }
  if (!['critical', 'major', 'minor'].includes(sev || '')) {
    sev = cfg.default_severity || 'major';
    for (const r of cfg.severity_rules || []) if ((r.contains_any || []).some(w => lc(monitor).includes(lc(w)))) { sev = r.severity; break; }
  }
  const clientEmail = (cfg.clients || {})[monitor] || '';
  const base = { dry_run: dry, monitor, severity: sev, message, url };
  const ctx = { monitor, severity: sev, message: message || 'no details', url: url || '(none)', today, client_email: clientEmail };
  const alertTo = sev === 'critical' && cfg.oncall_email ? cfg.oncall_email : cfg.owner_email;
  const mk = (action, extra) => ({ json: { ...base, status: 'new', action, owner_to: alertTo, ...extra } });
  if (isErr) {
    const last = store.errors[monitor];
    if (!last || now - last.t >= mins(cfg.suppress_minutes ?? 30) * 60000) {
      const n = last ? last.n : 0;
      const id = newId('INC');
      if (!dry) store.errors[monitor] = { t: now, n: 0 };
      out.push(mk('error_alert', { id, row: { incident_id: id, monitor, client: clientEmail, url, severity: sev, status: 'logged', opened_at: today, message, alerts_sent: 1 },
        owner_subject: renderText(flow.error.subject, { ...ctx, suppressed: n }), owner_html: render(flow.error.body, { ...ctx, suppressed: n }) }));
    } else { if (!dry) last.n++; out.push({ json: { ...base, status: 'suppressed', action: 'none' } }); }
    continue;
  }
  const inc = store.incidents[monitor];
  if (status === 'down') {
    if (!inc) {
      const id = newId('INC');
      if (!dry) store.incidents[monitor] = { id, opened: now, last_alert: now, count: 1 };
      out.push(mk('open', { id, row: { incident_id: id, monitor, client: clientEmail, url, severity: sev, status: 'open', opened_at: today, message, closed_at: '', duration_min: '', alerts_sent: 1 },
        owner_subject: renderText(flow.open.subject, ctx), owner_html: render(flow.open.body, ctx),
        draft_to: clientEmail, draft_subject: clientEmail ? renderText(flow.client_open.subject, ctx) : '', draft_html: clientEmail ? render(flow.client_open.body, ctx) : '' }));
    } else {
      inc.count++;
      if (now - inc.last_alert >= mins(cfg.reminder_minutes ?? 60) * 60000) {
        const dur = Math.round((now - inc.opened) / 60000);
        if (!dry) inc.last_alert = now;
        out.push(mk('reminder', { id: inc.id, owner_subject: renderText(flow.reminder.subject, { ...ctx, minutes: dur }), owner_html: render(flow.reminder.body, { ...ctx, minutes: dur }) }));
      } else out.push({ json: { ...base, status: 'suppressed', action: 'none' } });
    }
  } else if (status === 'up') {
    if (!inc) { out.push({ json: { ...base, status: 'ignored', action: 'none' } }); continue; }
    const dur = Math.round((now - inc.opened) / 60000);
    if (!dry) delete store.incidents[monitor];
    out.push(mk('resolve', { id: inc.id, row: { incident_id: inc.id, status: 'resolved', closed_at: today, duration_min: dur },
      owner_subject: renderText(flow.resolved.subject, { ...ctx, minutes: dur }), owner_html: render(flow.resolved.body, { ...ctx, minutes: dur }),
      draft_to: clientEmail, draft_subject: clientEmail ? renderText(flow.client_resolved.subject, { ...ctx, minutes: dur }) : '', draft_html: clientEmail ? render(flow.client_resolved.body, { ...ctx, minutes: dur }) : '' }));
  }
}
return out;
