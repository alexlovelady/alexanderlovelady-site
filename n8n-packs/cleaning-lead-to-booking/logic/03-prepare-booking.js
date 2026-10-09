// Validates a booking and prepares the confirmation email and calendar times.
const cfg = $('Config').first().json;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const out = [];
for (const item of $('Webhook').all()) {
  const b = item.json.body || {};
  const dry = cfg.dry_run === true;
  if (cfg.webhook_secret && (item.json.headers || {})['x-webhook-secret'] !== cfg.webhook_secret) {
    out.push({ json: { status: 'unauthorized', dry_run: dry } }); continue;
  }
  const email = String(b.email || '').trim().toLowerCase();
  const problems = [];
  if (!String(b.lead_id || '').trim()) problems.push('missing lead_id');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) problems.push('missing or invalid email');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(b.date || ''))) problems.push('date must be YYYY-MM-DD');
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(String(b.start_time || ''))) problems.push('start_time must be HH:MM (24h)');
  const hours = parseFloat(b.duration_hours ?? 2);
  if (!(hours > 0 && hours <= 12)) problems.push('duration_hours must be between 0 and 12');
  if (problems.length) { out.push({ json: { status: 'invalid', errors: problems, dry_run: dry } }); continue; }

  const pad = n => String(n).padStart(2, '0');
  const [sh, sm] = b.start_time.split(':').map(Number);
  const endMin = sh * 60 + sm + Math.round(hours * 60);
  const endDayOffset = Math.floor(endMin / 1440);
  const end = new Date(b.date + 'T00:00:00Z'); end.setUTCDate(end.getUTCDate() + endDayOffset);
  const endDate = end.toISOString().slice(0, 10);
  const endTime = `${pad(Math.floor((endMin % 1440) / 60))}:${pad(endMin % 60)}`;
  const name = String(b.name || '').trim();
  out.push({ json: {
    status: 'new', dry_run: dry, lead_id: String(b.lead_id).trim(), email, name, address: String(b.address || '').trim(),
    booking_date: b.date, booking_time: b.start_time, lead_status: 'booked', reminder_sent: '',
    start_iso: `${b.date}T${b.start_time}:00`, end_iso: `${endDate}T${endTime}:00`,
    event_title: `Clean: ${name || email}`,
    subject: `Your cleaning is booked for ${b.date} at ${b.start_time}`,
    html: `<p>Hi ${esc(name.split(' ')[0] || 'there')},</p><p>You're booked! <strong>${esc(b.date)} at ${esc(b.start_time)}</strong>${b.address ? ' at ' + esc(b.address) : ''}.</p><p>Expect us for about ${esc(hours)} hour(s). Please make sure we can access the home. Need to change something? Reply to this email or call ${esc(cfg.business_phone)}.</p><p>${esc(cfg.business_name)}</p>`,
  } });
}
return out;
