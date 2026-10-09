// Stripe customer.subscription.updated / .deleted -> one Subscribers row keyed by subscription id.
const store = $getWorkflowStaticData('global');
const out = [];
for (const it of $('Trigger').all()) {
  const dry = cfg.dry_run === true;
  const ev = it.json.data && it.json.data.object ? it.json : (it.json.body || it.json);
  const sub = ev && ev.data && ev.data.object;
  if (!sub || !sub.id || !/^customer\.subscription\./.test(ev.type || '')) { out.push({ json: { status: 'ignored', dry_run: dry } }); continue; }
  if (ev.id && isSeen(store, 'evt|' + ev.id)) { out.push({ json: { status: 'duplicate', dry_run: dry } }); continue; }
  if (!dry && ev.id) markSeen(store, 'evt|' + ev.id);
  const item0 = sub.items && sub.items.data && sub.items.data[0];
  const end = sub.current_period_end || (item0 && item0.current_period_end);
  out.push({ json: { status: 'new', dry_run: dry, id: sub.id, row: {
    subscription_id: sub.id, customer_id: sub.customer || '', status: ev.type === 'customer.subscription.deleted' ? 'canceled' : (sub.status || ''),
    cancel_at_period_end: sub.cancel_at_period_end ? 'yes' : '', current_period_end: end ? new Date(end * 1000).toISOString().slice(0, 10) : '',
    price_id: (item0 && item0.price && item0.price.id) || '', updated_at: today } } });
}
return out;
