// Emails clients whose kickoff call is tomorrow, once.
const cfg = $('Config').first().json;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const today = cfg.today_override || new Date().toLocaleDateString('en-CA', { timeZone: cfg.timezone || 'UTC' });
const tomorrow = (() => { const d = new Date(today + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + 1); return d.toISOString().slice(0, 10); })();
const out = [];
for (const it of $input.all()) {
  const r = it.json;
  if (!r.deal_id || String(r.reminder_sent).toLowerCase() === 'yes') continue;
  if (String(r.kickoff_date).slice(0, 10) !== tomorrow) continue;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(r.contact_email || ''))) continue;
  out.push({ json: {
    deal_id: r.deal_id, to: r.contact_email, reminder_sent: 'yes',
    subject: `Reminder: kickoff call tomorrow with ${cfg.agency_name}`,
    html: `<p>Hi ${esc(r.contact_name)},</p><p>A quick reminder that our kickoff call is scheduled for tomorrow (${esc(tomorrow)}). If you haven't yet, please complete the intake form: <a href="${esc(cfg.intake_form_url)}">${esc(cfg.intake_form_url)}</a>.</p><p>Need to reschedule? Use ${esc(cfg.calendar_link)}.</p><p>${esc(cfg.agency_name)}</p>`,
  } });
}
return out;
