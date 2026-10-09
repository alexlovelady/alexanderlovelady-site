// Sends follow-up #1 after 2 days and #2 after 7 days to quoted leads who haven't booked. Stops if the lead opted out.
const cfg = $('Config').first().json;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const today = cfg.today_override || new Date().toLocaleDateString('en-CA', { timeZone: cfg.timezone || 'UTC' });
const daysBetween = (a, b) => Math.round((new Date(b + 'T00:00:00Z') - new Date(a + 'T00:00:00Z')) / 86400000);
const yes = v => String(v).toLowerCase() === 'yes';
const out = [];
for (const it of $input.all()) {
  const r = it.json;
  if (!r.lead_id || String(r.status).toLowerCase() !== 'quoted' || yes(r.followups_stopped)) continue;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(r.email || ''))) continue;
  const age = daysBetween(String(r.created_at).slice(0, 10), today);
  if (!Number.isFinite(age)) continue;
  const first = esc(String(r.name || '').split(' ')[0]);
  const foot = '<p style="color:#777;font-size:12px">Reply STOP to stop follow-up emails.</p>';
  let which = null;
  if (age >= 7 && !yes(r.fu2_sent)) which = 2;
  else if (age >= 2 && !yes(r.fu1_sent) && age < 7) which = 1;
  if (!which) continue;
  const body = which === 1
    ? `<p>Hi ${first},</p><p>Just checking in on the cleaning estimate we sent (${r.est_low ? '$' + r.est_low + ' to $' + r.est_high : 'see previous email'}). Would you like me to hold a time for you? <a href="${esc(cfg.booking_link)}">Book here</a> or reply with a day that works.</p><p>${esc(cfg.business_name)}</p>${foot}`
    : `<p>Hi ${first},</p><p>I'm closing out last week's estimates. If you're still interested, we'd be glad to help: <a href="${esc(cfg.booking_link)}">book here</a>. If the timing isn't right, no problem at all.</p><p>${esc(cfg.business_name)}</p>${foot}`;
  out.push({ json: {
    lead_id: r.lead_id, to: r.email, subject: which === 1 ? `Still need a clean, ${String(r.name || '').split(' ')[0]}?` : 'Closing out your cleaning estimate', html: body,
    fu1_sent: which === 1 ? 'yes' : (r.fu1_sent || ''), fu2_sent: which === 2 ? 'yes' : (r.fu2_sent || ''),
  } });
}
return out;
