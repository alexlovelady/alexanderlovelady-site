// Validates the "deal won" webhook, blocks duplicates, builds the welcome email and the onboarding checklist.
const cfg = $('Config').first().json;
const store = $getWorkflowStaticData('global');
store.seen = store.seen || {};

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const today = cfg.today_override || new Date().toLocaleDateString('en-CA', { timeZone: cfg.timezone || 'UTC' });
const addDays = (ymd, n) => { const d = new Date(ymd + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const addBizDays = (ymd, n) => { let d = ymd, left = n; while (left > 0) { d = addDays(d, 1); const w = new Date(d + 'T00:00:00Z').getUTCDay(); if (w !== 0 && w !== 6) left--; } return d; };
const validDate = s => /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(new Date(s + 'T00:00:00Z'));

const out = [];
for (const item of $('Webhook').all()) {
  const b = item.json.body || {};
  const dry = cfg.dry_run === true;
  if (cfg.webhook_secret && (item.json.headers || {})['x-webhook-secret'] !== cfg.webhook_secret) {
    out.push({ json: { status: 'unauthorized', dry_run: dry } }); continue;
  }
  const required = ['deal_id', 'client_name', 'contact_name', 'contact_email', 'package'];
  const missing = required.filter(k => !String(b[k] ?? '').trim());
  const email = String(b.contact_email || '').trim().toLowerCase();
  const problems = missing.map(k => 'missing ' + k);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) problems.push('invalid contact_email');
  if (b.kickoff_date && !validDate(String(b.kickoff_date))) problems.push('kickoff_date must be YYYY-MM-DD');
  if (problems.length) { out.push({ json: { status: 'invalid', errors: problems, dry_run: dry } }); continue; }
  const dealId = String(b.deal_id).trim();
  if (store.seen[dealId]) { out.push({ json: { status: 'duplicate', deal_id: dealId, dry_run: dry } }); continue; }
  if (!dry) store.seen[dealId] = today;

  const pmEmail = String(b.project_manager_email || cfg.default_pm_email || '').trim();
  const pmName = String(b.project_manager_name || cfg.default_pm_name || 'your project manager').trim();
  const kickoff = b.kickoff_date ? String(b.kickoff_date) : addBizDays(today, 3);
  const slug = String(b.client_name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
  const folder = `${cfg.folder_prefix || 'Client'} - ${String(b.client_name).trim()}`;

  const taskDefs = [
    ['Confirm signed contract and send first invoice', 'PM', 0],
    ['Create shared project folder and grant access', 'PM', 1],
    ['Client completes intake form', 'Client', 2],
    ['Client sends brand assets and access (via secure method, never email passwords)', 'Client', 3],
    ['Kickoff call', 'PM', null],
    ['Share project plan and milestones', 'PM', 2],
  ];
  const tasks = taskDefs.map(([task, owner, off], i) => ({
    task_id: `${dealId}-${i + 1}`, deal_id: dealId, client_name: String(b.client_name).trim(), task, owner,
    owner_email: owner === 'PM' ? pmEmail : email,
    due_date: off === null ? kickoff : (task.startsWith('Share project plan') ? addBizDays(kickoff, off) : addBizDays(today, off)),
    status: 'open',
  }));

  const html = `<p>Hi ${esc(b.contact_name)},</p>
<p>Welcome to ${esc(cfg.agency_name)}! We're glad to be working with ${esc(b.client_name)}.</p>
<p><strong>Next steps</strong></p>
<ol>
<li>Fill in the short intake form: <a href="${esc(cfg.intake_form_url)}">${esc(cfg.intake_form_url)}</a></li>
<li>Pick a time for our kickoff call (target date ${esc(kickoff)}): <a href="${esc(cfg.calendar_link)}">${esc(cfg.calendar_link)}</a></li>
<li>${esc(pmName)} will be your main contact${pmEmail ? ' (' + esc(pmEmail) + ')' : ''}.</li>
</ol>
<p>Please do not email passwords. We'll send a secure way to share access.</p>
<p>${esc(cfg.agency_name)}</p>`;

  out.push({ json: {
    status: 'new', dry_run: dry, deal_id: dealId, client_name: String(b.client_name).trim(), client_slug: slug,
    contact_name: String(b.contact_name).trim(), contact_email: email, package: String(b.package).trim(),
    pm_email: pmEmail, kickoff_date: kickoff, folder_name: folder, created_at: today,
    welcome_subject: `Welcome to ${cfg.agency_name}, ${String(b.contact_name).trim()}!`, welcome_html: html, tasks,
  } });
}
return out;
