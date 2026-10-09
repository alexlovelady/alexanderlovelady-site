// Validates a website lead, blocks duplicates, estimates a price range and writes the instant reply.
const cfg = $('Config').first().json;
const store = $getWorkflowStaticData('global');
store.seen = store.seen || {};

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const today = cfg.today_override || new Date().toLocaleDateString('en-CA', { timeZone: cfg.timezone || 'UTC' });
const money = n => '$' + Math.round(n).toLocaleString('en-US');
const num = (v, d = 0) => { const n = parseFloat(v); return Number.isFinite(n) && n >= 0 ? n : d; };

const out = [];
for (const item of $('Webhook').all()) {
  const b = item.json.body || {};
  const dry = cfg.dry_run === true;
  if (cfg.webhook_secret && (item.json.headers || {})['x-webhook-secret'] !== cfg.webhook_secret) {
    out.push({ json: { status: 'unauthorized', dry_run: dry } }); continue;
  }
  const email = String(b.email || '').trim().toLowerCase();
  const name = String(b.name || '').trim();
  const problems = [];
  if (!name) problems.push('missing name');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) problems.push('missing or invalid email');
  if (problems.length) { out.push({ json: { status: 'invalid', errors: problems, dry_run: dry } }); continue; }

  const service = String(b.service || 'standard').toLowerCase();
  const key = `${email}|${service}|${String(b.preferred_date || '')}`;
  if (store.seen[key] === today) { out.push({ json: { status: 'duplicate', dry_run: dry } }); continue; }
  if (!dry) store.seen[key] = today;

  const beds = num(b.bedrooms, 2), baths = num(b.bathrooms, 1), sqft = num(b.sqft, 0);
  const rates = cfg.pricing;
  const svcMult = (rates.service_multipliers || {})[service] ?? 1;
  const hours = (rates.base_hours + rates.hours_per_bedroom * beds + rates.hours_per_bathroom * baths + (sqft > 2000 ? rates.hours_per_extra_1000_sqft * ((sqft - 2000) / 1000) : 0)) * svcMult;
  const freq = String(b.frequency || 'one-time').toLowerCase();
  const disc = (rates.frequency_discounts || {})[freq] ?? 0;
  const mid = Math.max(rates.minimum_price, hours * rates.price_per_labor_hour * (1 - disc));
  const low = Math.max(rates.minimum_price, mid * (1 - rates.range_percent / 100));
  const high = Math.max(low, mid * (1 + rates.range_percent / 100));

  const zip = String(b.zip || '').trim().slice(0, 5);
  const inArea = (cfg.service_zips || []).length === 0 || cfg.service_zips.includes(zip);
  const leadId = 'L' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  let subject, html;
  if (inArea) {
    subject = `Your cleaning estimate from ${cfg.business_name}`;
    html = `<p>Hi ${esc(name.split(' ')[0])},</p>
<p>Thanks for contacting ${esc(cfg.business_name)}! Based on what you told us (${esc(beds)} bed, ${esc(baths)} bath, ${esc(service)} clean, ${esc(freq)}), a typical price is <strong>${money(low)} to ${money(high)}</strong>.</p>
<p>This is an estimate, not a final quote. The final price depends on the home's condition and any extras.</p>
<p><a href="${esc(cfg.booking_link)}">Book or confirm your clean here</a>, or just reply to this email with questions.</p>
<p>${esc(cfg.business_name)}<br>${esc(cfg.business_phone)}</p>
<p style="color:#777;font-size:12px">You're receiving this because you asked for an estimate. Reply STOP if you don't want follow-up emails.</p>`;
  } else {
    subject = `About your cleaning request - ${cfg.business_name}`;
    html = `<p>Hi ${esc(name.split(' ')[0])},</p><p>Thank you for reaching out. Unfortunately ${esc(zip || 'your area')} is outside the area we currently serve, so we can't take this job. We appreciate you thinking of us.</p><p>${esc(cfg.business_name)}</p>`;
  }

  out.push({ json: {
    status: 'new', dry_run: dry, lead_id: leadId, created_at: today, name, email, phone: String(b.phone || '').trim(),
    service, beds, baths, frequency: freq, zip, preferred_date: String(b.preferred_date || ''), notes: String(b.notes || '').slice(0, 500),
    in_area: inArea ? 'yes' : 'no', est_low: inArea ? Math.round(low) : '', est_high: inArea ? Math.round(high) : '',
    lead_status: inArea ? 'quoted' : 'out_of_area', customer_subject: subject, customer_html: html,
    owner_subject: `${inArea ? 'New lead' : 'Out-of-area lead'}: ${name} (${service}, ${beds}bd/${baths}ba)`,
    owner_html: `<p><strong>${esc(name)}</strong> - ${esc(email)} ${esc(b.phone || '')}</p><p>${esc(service)} / ${esc(freq)} / zip ${esc(zip)} / wants ${esc(b.preferred_date || 'no date given')}</p><p>Estimate sent: ${inArea ? money(low) + ' - ' + money(high) : 'none (out of area)'}</p><p>Notes: ${esc(b.notes || '-')}</p><p>Lead ID: ${esc(leadId)}</p>`,
  } });
}
return out;
