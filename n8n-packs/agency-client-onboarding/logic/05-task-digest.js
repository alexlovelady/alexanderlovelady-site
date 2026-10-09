// One email per project manager listing overdue and soon-due tasks. Client-owned tasks are excluded.
const cfg = $('Config').first().json;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const today = cfg.today_override || new Date().toLocaleDateString('en-CA', { timeZone: cfg.timezone || 'UTC' });
const soon = (() => { const d = new Date(today + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + (cfg.digest_days_ahead ?? 2)); return d.toISOString().slice(0, 10); })();
const groups = {};
for (const it of $input.all()) {
  const t = it.json;
  if (!t.task_id || String(t.owner).toLowerCase() !== 'pm' || String(t.status).toLowerCase() === 'done') continue;
  const due = String(t.due_date).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(due) || due > soon) continue;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(t.owner_email || ''))) continue;
  (groups[t.owner_email] = groups[t.owner_email] || []).push({ ...t, due, overdue: due < today });
}
return Object.entries(groups).map(([email, list]) => {
  list.sort((a, b) => a.due.localeCompare(b.due));
  const row = t => `<li>${t.overdue ? '<strong style="color:#b00020">OVERDUE</strong> ' : ''}${esc(t.client_name)}: ${esc(t.task)} (due ${esc(t.due)})</li>`;
  return { json: { to: email, overdue_count: list.filter(t => t.overdue).length, total: list.length,
    subject: `Onboarding digest: ${list.length} task${list.length === 1 ? '' : 's'} need attention`,
    html: `<p>Onboarding tasks due by ${esc(soon)}:</p><ul>${list.map(row).join('')}</ul><p>Mark tasks as <em>done</em> in the Tasks sheet to remove them from this digest.</p>` } };
});
