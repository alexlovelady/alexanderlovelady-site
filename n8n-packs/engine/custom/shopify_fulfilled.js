// Shopify orders/fulfilled -> mark the order fulfilled and (optionally) email the customer their tracking info.
const store = $getWorkflowStaticData('global');
const out = [];
for (const it of $('Trigger').all()) {
  const dry = cfg.dry_run === true;
  const o = it.json.body && it.json.body.id ? it.json.body : it.json;
  if (!o || !o.id) { out.push({ json: { status: 'ignored', dry_run: dry } }); continue; }
  const key = 'ful|' + o.id;
  if (isSeen(store, key)) { out.push({ json: { status: 'duplicate', dry_run: dry } }); continue; }
  if (!dry) markSeen(store, key);
  const f = (o.fulfillments || []).filter(x => x && (x.tracking_number || x.tracking_url));
  const tracking = f.map(x => [x.tracking_company, x.tracking_number].filter(Boolean).join(' ')).filter(Boolean).join(', ');
  const urls = f.map(x => x.tracking_url).filter(Boolean).join('\n');
  const cust = o.customer || {};
  const email = lc(o.email);
  const ctx = { first_name: cust.first_name || 'there', order_number: o.name || o.order_number, tracking: tracking || 'no tracking number provided', tracking_urls: urls, email };
  const send = cfg.send_shipping_email !== false && isEmail(email);
  out.push({ json: {
    status: 'new', dry_run: dry, id: String(o.id),
    row: { order_id: String(o.id), status: 'fulfilled', fulfilled_at: today, tracking },
    mail_to: send ? email : '', mail_subject: renderText(flow.email.subject, ctx), mail_html: render(flow.email.body, ctx),
  } });
}
return out;
