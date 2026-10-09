// Stripe invoice.paid -> only acts if that invoice is an OPEN row in FailedPayments (everything else is ignored).
const store = $getWorkflowStaticData('global');
const rows = $('Read Failed Payments').all().map(i => i.json).filter(r => r.invoice_id);
const out = [];
for (const it of $('Trigger').all()) {
  const dry = cfg.dry_run === true;
  const ev = it.json.data && it.json.data.object ? it.json : (it.json.body || it.json);
  const inv = ev && ev.data && ev.data.object;
  if (!inv || ev.type !== 'invoice.paid' || !inv.id) { out.push({ json: { status: 'ignored', dry_run: dry } }); continue; }
  const r = rows.find(x => x.invoice_id === inv.id && lc(x.status) === 'open');
  if (!r) { out.push({ json: { status: 'ignored', dry_run: dry } }); continue; }
  if (ev.id && isSeen(store, 'evt|' + ev.id)) { out.push({ json: { status: 'duplicate', dry_run: dry } }); continue; }
  if (!dry && ev.id) markSeen(store, 'evt|' + ev.id);
  const ctx = { first_name: String(r.name || '').trim().split(/\s+/)[0] || 'there', amount_display: r.amount_display, name: r.name || r.email, email: r.email };
  const sendThanks = flow.email && isEmail(r.email) && cfg.send_recovery_email !== false;
  out.push({ json: {
    status: 'new', dry_run: dry, id: inv.id, row: { invoice_id: inv.id, status: 'recovered', recovered_at: today },
    mail_to: sendThanks ? r.email : '', mail_subject: flow.email ? renderText(flow.email.subject, ctx) : '', mail_html: flow.email ? render(flow.email.body, ctx) : '',
    owner_to: cfg.owner_email, owner_subject: renderText(flow.owner.subject, ctx), owner_html: render(flow.owner.body, ctx),
  } });
}
return out;
