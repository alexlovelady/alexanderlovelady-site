// EVENT: a webhook that updates one existing row (status change, booking, payment received...) and sends the matching emails.
const store = $getWorkflowStaticData('global');
const out = [];
for (const item of $('Webhook').all()) {
  const dry = cfg.dry_run === true;
  if (authFails(item)) { out.push({ json: { status: 'unauthorized', dry_run: dry } }); continue; }
  const { v, errors } = validateFields(flow.fields, item.json.body || {});
  if (errors.length) { out.push({ json: { status: 'invalid', errors, dry_run: dry } }); continue; }
  const key = v[flow.key_field || flow.key_col];
  const dkey = 'ev|' + flow.sheet + '|' + lc(key) + '|' + JSON.stringify(flow.set || {}) + '|' + (flow.dedupe_fields || []).map(k => lc(v[k])).join('|');
  if (isSeen(store, dkey)) { out.push({ json: { status: 'duplicate', dry_run: dry } }); continue; }
  if (!dry) markSeen(store, dkey);
  const row = { [flow.key_col]: key, updated_at: today };
  for (const f of flow.fields) if (f.write !== false && f.key !== (flow.key_field || flow.key_col) && v[f.key] !== '') row[f.col || f.key] = v[f.key];
  Object.assign(row, flow.set || {});
  for (const c of flow.set_today || []) row[c] = today;
  const ctx = { ...v, ...row, today, first_name: String(v.name || '').trim().split(/\s+/)[0] || 'there' };
  const res = { status: 'new', dry_run: dry, id: key, row, mail_to: '', mail_subject: '', mail_html: '', owner_to: cfg.owner_email, owner_subject: '', owner_html: '' };
  const em = flow.emails ? flow.emails[lc(v[flow.emails_key])] : flow.email;
  if (em) {
    res.mail_to = String(v[em.to_field || 'email'] || '');
    res.mail_subject = renderText(em.subject, ctx);
    res.mail_html = withFooter(render(em.body, ctx), em.marketing);
  }
  if (flow.owner) {
    if (flow.owner.to_field && v[flow.owner.to_field] && isEmail(v[flow.owner.to_field])) res.owner_to = v[flow.owner.to_field];
    res.owner_subject = renderText(flow.owner.subject, ctx);
    res.owner_html = render(flow.owner.body, ctx);
  }
  out.push({ json: res });
}
return out;
