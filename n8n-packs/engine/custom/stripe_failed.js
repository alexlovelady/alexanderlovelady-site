// Stripe invoice.payment_failed -> normalized row. First failure for an invoice = "new" (log + email), later retries = "existing" (just bump attempt_count).
const store = $getWorkflowStaticData('global');
const ZERO = ['bif', 'clp', 'djf', 'gnf', 'jpy', 'kmf', 'krw', 'mga', 'pyg', 'rwf', 'ugx', 'vnd', 'vuv', 'xaf', 'xof', 'xpf'];
const known = new Set($('Read Failed Payments').all().map(i => i.json.invoice_id).filter(Boolean));
const out = [];
for (const it of $('Trigger').all()) {
  const dry = cfg.dry_run === true;
  const ev = it.json.data && it.json.data.object ? it.json : (it.json.body || it.json);
  const inv = ev && ev.data && ev.data.object;
  if (!inv || ev.type !== 'invoice.payment_failed' || !inv.id) { out.push({ json: { status: 'ignored', dry_run: dry } }); continue; }
  if (ev.id && isSeen(store, 'evt|' + ev.id)) { out.push({ json: { status: 'duplicate', dry_run: dry } }); continue; }
  if (!dry && ev.id) markSeen(store, 'evt|' + ev.id);
  const cur = String(inv.currency || 'usd').toLowerCase();
  const major = ZERO.includes(cur) ? Number(inv.amount_due || 0) : Number(inv.amount_due || 0) / 100;
  const display = (cur === 'usd' ? '$' : '') + major.toFixed(ZERO.includes(cur) ? 0 : 2) + (cur === 'usd' ? '' : ' ' + cur.toUpperCase());
  const email = lc(inv.customer_email);
  const attempt = Number(inv.attempt_count || 1);
  if (known.has(inv.id)) {
    out.push({ json: { status: 'existing', dry_run: dry, id: inv.id, row: { invoice_id: inv.id, attempt_count: attempt } } });
    continue;
  }
  const ctx = { first_name: String(inv.customer_name || '').trim().split(/\s+/)[0] || 'there', amount_display: display, hosted_invoice_url: inv.hosted_invoice_url || '', attempt_count: attempt };
  const sendNow = cfg.send_immediate_email !== false && isEmail(email);
  out.push({ json: {
    status: 'new', dry_run: dry, id: inv.id,
    row: { invoice_id: inv.id, customer_id: inv.customer || '', email, name: inv.customer_name || '', amount: major, amount_display: display, currency: cur,
           attempt_count: attempt, failed_at: today, hosted_invoice_url: inv.hosted_invoice_url || '', subscription_id: inv.subscription || '', status: 'open',
           d0_sent: sendNow ? 'yes' : '', opted_out: '' },
    mail_to: sendNow ? email : '', mail_subject: renderText(flow.email.subject, ctx), mail_html: render(flow.email.body, ctx),
    owner_to: cfg.owner_email, owner_subject: renderText(flow.owner.subject, { ...ctx, name: inv.customer_name || email }),
    owner_html: render(flow.owner.body, { ...ctx, name: inv.customer_name || email, email }),
  } });
}
return out;
