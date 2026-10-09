// Daily: (1) reminder the day before a booking, (2) feedback request the day after a completed job,
// (3) rebook nudge 30 days after a completed one-time job. Every message is sent at most once per lead.
const cfg = $('Config').first().json;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const today = cfg.today_override || new Date().toLocaleDateString('en-CA', { timeZone: cfg.timezone || 'UTC' });
const shift = n => { const d = new Date(today + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const yes = v => String(v).toLowerCase() === 'yes';
const [tomorrow, yesterday, rebookDay] = [shift(1), shift(-1), shift(-(cfg.rebook_after_days ?? 30))];
const out = [];
for (const it of $input.all()) {
  const r = it.json;
  if (!r.lead_id || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(r.email || ''))) continue;
  const status = String(r.status).toLowerCase();
  const date = String(r.booking_date || '').slice(0, 10);
  const first = esc(String(r.name || '').split(' ')[0] || 'there');
  const base = { lead_id: r.lead_id, to: r.email, reminder_sent: r.reminder_sent || '', feedback_sent: r.feedback_sent || '', rebook_sent: r.rebook_sent || '' };
  const stopped = yes(r.followups_stopped);

  if (status === 'booked' && date === tomorrow && !yes(r.reminder_sent)) {
    out.push({ json: { ...base, kind: 'reminder', reminder_sent: 'yes', subject: `Reminder: your cleaning is tomorrow`,
      html: `<p>Hi ${first},</p><p>A reminder that your clean is tomorrow, ${esc(date)} at ${esc(r.booking_time)}${r.address ? ' at ' + esc(r.address) : ''}. Reply if anything has changed.</p><p>${esc(cfg.business_name)}</p>` } });
  } else if (status === 'completed' && !stopped && date === yesterday && !yes(r.feedback_sent)) {
    out.push({ json: { ...base, kind: 'feedback', feedback_sent: 'yes', subject: `How was your clean?`,
      html: `<p>Hi ${first},</p><p>Thank you for choosing ${esc(cfg.business_name)}. We'd love your honest feedback. If you'd like to share it publicly, you can leave a review here: <a href="${esc(cfg.review_link)}">${esc(cfg.review_link)}</a>. If anything wasn't right, reply to this email and we'll make it right.</p><p>${esc(cfg.business_name)}</p><p style="color:#777;font-size:12px">Reply STOP to stop emails from us.</p>` } });
  } else if (status === 'completed' && !stopped && date === rebookDay && String(r.frequency).toLowerCase() === 'one-time' && !yes(r.rebook_sent)) {
    out.push({ json: { ...base, kind: 'rebook', rebook_sent: 'yes', subject: `Ready for your next clean?`,
      html: `<p>Hi ${first},</p><p>It's been about a month since your last clean. Want to book another, or set up a recurring schedule (recurring clients get a better rate)? <a href="${esc(cfg.booking_link)}">Book here</a>.</p><p>${esc(cfg.business_name)}</p><p style="color:#777;font-size:12px">Reply STOP to stop emails from us.</p>` } });
  }
}
return out;
