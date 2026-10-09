// Shopify orders/create -> Orders row + optional owner alert (always, or only for high-value orders).
const store = $getWorkflowStaticData('global');
const out = [];
for (const it of $('Trigger').all()) {
  const dry = cfg.dry_run === true;
  const o = it.json.body && it.json.body.id ? it.json.body : it.json;
  if (!o || !o.id) { out.push({ json: { status: 'ignored', dry_run: dry } }); continue; }
  const key = 'ord|' + o.id;
  if (isSeen(store, key)) { out.push({ json: { status: 'duplicate', dry_run: dry } }); continue; }
  if (!dry) markSeen(store, key);
  const total = parseFloat(o.total_price) || 0;
  const items = (o.line_items || []).slice(0, 5).map(l => `${l.quantity || 1} x ${l.title}`).join('; ') + ((o.line_items || []).length > 5 ? '; ...' : '');
  const cust = o.customer || {};
  const name = [cust.first_name, cust.last_name].filter(Boolean).join(' ') || (o.billing_address && o.billing_address.name) || '';
  const ship = o.shipping_address ? [o.shipping_address.city, o.shipping_address.country_code].filter(Boolean).join(', ') : '';
  const high = total >= Number(cfg.high_value_threshold || Infinity);
  const ctx = { order_number: o.name || o.order_number, name: name || 'a customer', total: fmtMoney(total) + ' ' + String(o.currency || ''), items, ship_to: ship, financial_status: o.financial_status || '', email: lc(o.email), flag: high ? 'HIGH VALUE ' : '' };
  const notify = cfg.notify_every_order !== false || high;
  out.push({ json: {
    status: 'new', dry_run: dry, id: String(o.id),
    row: { order_id: String(o.id), order_number: o.name || String(o.order_number || ''), email: lc(o.email), name, total_price: total, currency: o.currency || '', items, ship_to: ship,
           financial_status: o.financial_status || '', status: 'new', created_at: ymdOf(o.created_at) || today, fulfilled_at: '', tracking: '', opted_out: '' },
    owner_to: notify ? cfg.owner_email : '', owner_subject: renderText(flow.owner.subject, ctx), owner_html: render(flow.owner.body, ctx),
  } });
}
return out;
