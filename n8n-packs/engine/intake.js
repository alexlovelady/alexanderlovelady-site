// INTAKE: validates a webhook payload, blocks same-day duplicates, tags/routes it, builds the row, the acknowledgement and the owner alert.
const store = $getWorkflowStaticData('global');
const out = [];
for (const item of $('Webhook').all()) {
  const dry = cfg.dry_run === true;
  if (authFails(item)) { out.push({ json: { status: 'unauthorized', dry_run: dry } }); continue; }
  const { v, errors } = validateFields(flow.fields, item.json.body || {});
  if (errors.length) { out.push({ json: { status: 'invalid', errors, dry_run: dry } }); continue; }
  if (flow.dedupe && flow.dedupe.length) {
    const key = 'in|' + flow.sheet + '|' + flow.dedupe.map(k => lc(v[k])).join('|');
    if (isSeen(store, key)) { out.push({ json: { status: 'duplicate', dry_run: dry } }); continue; }
    if (!dry) markSeen(store, key);
  }
  const id = flow.id_field && v[flow.id_field] ? String(v[flow.id_field]) : newId(flow.id_prefix || 'R');
  const row = { [flow.id_col]: id, created_at: today, ...v };
  for (const c of flow.extra_cols || []) row[c.key] = c.value;
  const ctx = { ...row, today, first_name: String(v.name || '').trim().split(/\s+/)[0] || 'there' };
  for (const f of flow.fields) if (f.type === 'date' && isYmd(String(v[f.key]))) ctx['days_until_' + f.key] = daysBetween(today, v[f.key]);
  for (const t of flow.tags || []) if (match(t.when, ctx)) { Object.assign(row, t.set); Object.assign(ctx, t.set); }
  let ackKey = null;
  for (const va of flow.variants || []) if (match(va.when, ctx)) { Object.assign(row, va.set || {}); Object.assign(ctx, va.set || {}); ackKey = va.ack; break; }
  let ownerTo = cfg.owner_email;
  if (flow.route) {
    const m = get(cfg, flow.route.map_cfg) || {};
    ownerTo = m[lc(v[flow.route.by])] || get(cfg, flow.route.default_cfg || 'owner_email') || cfg.owner_email;
  }
  if (flow.escalate && match(flow.escalate.when, ctx)) ownerTo = get(cfg, flow.escalate.to_cfg) || ownerTo;
  ctx.route_email = ownerTo; ctx.id = id;
  if (flow.route && flow.route.store_col) row[flow.route.store_col] = ownerTo;
  if (flow.sla) {
    const h = Number((get(cfg, flow.sla.hours_cfg) || {})[lc(row[flow.sla.by])] ?? (get(cfg, flow.sla.hours_cfg) || {}).default ?? 24);
    row[flow.sla.col] = new Date(Date.now() + h * 3600000).toISOString().slice(0, 16) + 'Z';
    row[flow.sla.date_col] = addDays(today, Math.floor(h / 24));
    ctx[flow.sla.col] = row[flow.sla.col]; ctx.sla_hours = h; ctx[flow.sla.date_col] = row[flow.sla.date_col];
  }
  let draft = null;
  if (flow.drafts) { const d = flow.drafts[lc(row[flow.drafts_by || 'category'])] || flow.drafts.default; if (d) draft = d; }
  const ack = (ackKey && flow.acks && flow.acks[ackKey]) || flow.ack;
  out.push({ json: {
    status: 'new', dry_run: dry, id, variant: ackKey || '', row,
    ack_to: ack ? String(v[ack.to || 'email'] || '') : '', ack_subject: ack ? renderText(ack.subject, ctx) : '',
    ack_html: ack ? withFooter(render(ack.body, ctx), ack.marketing) : '',
    draft_to: draft ? String(v[draft.to || 'email'] || '') : '', draft_subject: draft ? renderText(draft.subject, ctx) : '', draft_html: draft ? render(draft.body, ctx) : '',
    owner_to: ownerTo, owner_subject: flow.owner ? renderText(flow.owner.subject, ctx) : '', owner_html: flow.owner ? render(flow.owner.body, ctx) : '',
  } });
}
return out;
