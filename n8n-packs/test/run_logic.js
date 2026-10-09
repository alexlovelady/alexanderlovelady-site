// Runs every workflow Code-node script against sample inputs. Usage: node run_logic.js
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const root = path.join(__dirname, '..');

function run(pack, file, { cfg, nodes = {}, input = [], staticData = {} }) {
  const code = fs.readFileSync(path.join(root, pack, 'logic', file), 'utf8');
  const wrap = (arr) => ({ all: () => arr.map(j => ({ json: j })), first: () => ({ json: arr[0] }) });
  const $ = (name) => name === 'Config' ? wrap([cfg]) : wrap(nodes[name] || []);
  const fn = new Function('$input', '$', '$getWorkflowStaticData', code);
  return fn(wrap(input), $, () => staticData).map(x => x.json);
}
const hook = (body, headers = {}) => ({ headers, body });
let passed = 0;
const t = (name, f) => { try { f(); passed++; console.log('ok  ', name); } catch (e) { console.error('FAIL', name, '\n    ', e.message); process.exitCode = 1; } };

// ---------------- Agency ----------------
const A = 'agency-client-onboarding';
const aCfg = { agency_name: 'Northwind Studio', intake_form_url: 'https://example.com/intake', calendar_link: 'https://example.com/cal', timezone: 'UTC',
  default_pm_email: 'pm@example.com', default_pm_name: 'Pat', folder_prefix: 'Client', dry_run: false, webhook_secret: '', today_override: '2026-10-12' };
const deal = { deal_id: 'D-100', client_name: 'Acme <Co>', contact_name: 'Jo Lee', contact_email: 'JO@acme.test', package: 'Growth' };

t('agency: valid deal builds email + 6 tasks', () => {
  const [o] = run(A, '01-prepare-deal.js', { cfg: aCfg, nodes: { Webhook: [hook(deal)] } });
  assert.strictEqual(o.status, 'new');
  assert.strictEqual(o.contact_email, 'jo@acme.test');
  assert.strictEqual(o.tasks.length, 6);
  assert.strictEqual(o.kickoff_date, '2026-10-15'); // Mon + 3 business days
  assert.ok(o.welcome_html.includes('Acme &lt;Co&gt;'), 'html escaped');
  assert.ok(!o.welcome_html.includes('<Co>'));
  assert.strictEqual(o.folder_name, 'Client - Acme <Co>');
  assert.deepStrictEqual(o.tasks.map(x => x.due_date), ['2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-15', '2026-10-19']);
});
t('agency: weekend start skips to business days', () => {
  const [o] = run(A, '01-prepare-deal.js', { cfg: { ...aCfg, today_override: '2026-10-16' }, nodes: { Webhook: [hook(deal)] } });
  assert.strictEqual(o.kickoff_date, '2026-10-21');
});
t('agency: duplicate deal blocked', () => {
  const sd = {};
  run(A, '01-prepare-deal.js', { cfg: aCfg, nodes: { Webhook: [hook(deal)] }, staticData: sd });
  const [o] = run(A, '01-prepare-deal.js', { cfg: aCfg, nodes: { Webhook: [hook(deal)] }, staticData: sd });
  assert.strictEqual(o.status, 'duplicate');
});
t('agency: dry run does not record the deal', () => {
  const sd = {};
  run(A, '01-prepare-deal.js', { cfg: { ...aCfg, dry_run: true }, nodes: { Webhook: [hook(deal)] }, staticData: sd });
  assert.deepStrictEqual(sd.seen, {});
});
t('agency: missing/invalid fields rejected', () => {
  const [o] = run(A, '01-prepare-deal.js', { cfg: aCfg, nodes: { Webhook: [hook({ deal_id: 'x', client_name: 'A', contact_email: 'nope' })] } });
  assert.strictEqual(o.status, 'invalid');
  assert.ok(o.errors.includes('missing contact_name') && o.errors.includes('invalid contact_email'));
});
t('agency: bad kickoff date rejected', () => {
  const [o] = run(A, '01-prepare-deal.js', { cfg: aCfg, nodes: { Webhook: [hook({ ...deal, kickoff_date: '10/15/2026' })] } });
  assert.strictEqual(o.status, 'invalid');
});
t('agency: webhook secret enforced', () => {
  const c = { ...aCfg, webhook_secret: 's3cret' };
  assert.strictEqual(run(A, '01-prepare-deal.js', { cfg: c, nodes: { Webhook: [hook(deal)] } })[0].status, 'unauthorized');
  assert.strictEqual(run(A, '01-prepare-deal.js', { cfg: c, nodes: { Webhook: [hook(deal, { 'x-webhook-secret': 's3cret' })] } })[0].status, 'new');
});
t('agency: kickoff reminders only for tomorrow, unsent', () => {
  const rows = [
    { deal_id: '1', contact_name: 'A', contact_email: 'a@x.test', kickoff_date: '2026-10-13', reminder_sent: '' },
    { deal_id: '2', contact_name: 'B', contact_email: 'b@x.test', kickoff_date: '2026-10-13', reminder_sent: 'yes' },
    { deal_id: '3', contact_name: 'C', contact_email: 'c@x.test', kickoff_date: '2026-10-14', reminder_sent: '' },
    { deal_id: '4', contact_name: 'D', contact_email: 'bad', kickoff_date: '2026-10-13', reminder_sent: '' },
  ];
  const o = run(A, '04-kickoff-reminders.js', { cfg: aCfg, input: rows });
  assert.deepStrictEqual(o.map(x => x.deal_id), ['1']);
});
t('agency: digest groups by PM, flags overdue, skips done/client', () => {
  const rows = [
    { task_id: '1', owner: 'PM', owner_email: 'pm@x.test', client_name: 'A', task: 'T1', due_date: '2026-10-10', status: 'open' },
    { task_id: '2', owner: 'PM', owner_email: 'pm@x.test', client_name: 'B', task: 'T2', due_date: '2026-10-14', status: 'open' },
    { task_id: '3', owner: 'PM', owner_email: 'pm@x.test', client_name: 'C', task: 'T3', due_date: '2026-10-20', status: 'open' },
    { task_id: '4', owner: 'PM', owner_email: 'pm@x.test', client_name: 'D', task: 'T4', due_date: '2026-10-09', status: 'done' },
    { task_id: '5', owner: 'Client', owner_email: 'c@x.test', client_name: 'E', task: 'T5', due_date: '2026-10-09', status: 'open' },
    { task_id: '6', owner: 'PM', owner_email: 'two@x.test', client_name: 'F', task: 'T6', due_date: '2026-10-12', status: 'open' },
  ];
  const o = run(A, '05-task-digest.js', { cfg: aCfg, input: rows });
  assert.strictEqual(o.length, 2);
  const pm = o.find(x => x.to === 'pm@x.test');
  assert.strictEqual(pm.total, 2); assert.strictEqual(pm.overdue_count, 1);
});
t('agency: digest empty when nothing due', () => {
  assert.deepStrictEqual(run(A, '05-task-digest.js', { cfg: aCfg, input: [] }), []);
});

// ---------------- Cleaning ----------------
const C = 'cleaning-lead-to-booking';
const cCfg = { business_name: 'Sparkle Co', business_phone: '(555) 010-0000', booking_link: 'https://example.com/book', review_link: 'https://example.com/review',
  timezone: 'UTC', service_zips: ['27909', '27910'], dry_run: false, webhook_secret: '', today_override: '2026-10-12', rebook_after_days: 30,
  pricing: { base_hours: 1.5, hours_per_bedroom: 0.5, hours_per_bathroom: 0.75, hours_per_extra_1000_sqft: 0.5, price_per_labor_hour: 60,
    minimum_price: 90, range_percent: 15, service_multipliers: { standard: 1, deep: 1.6, 'move-out': 1.8 }, frequency_discounts: { weekly: 0.15, biweekly: 0.1, monthly: 0.05, 'one-time': 0 } } };
const lead = { name: 'Sam Ray', email: 'Sam@Ray.test', phone: '555-1', service: 'standard', bedrooms: 3, bathrooms: 2, sqft: 1800, frequency: 'one-time', zip: '27909', preferred_date: '2026-10-20', notes: '<b>dogs</b>' };

t('cleaning: in-area lead gets estimate range', () => {
  const [o] = run(C, '01-prepare-lead.js', { cfg: cCfg, nodes: { Webhook: [hook(lead)] } });
  // hours = 1.5 + 1.5 + 1.5 = 4.5 ; mid = 270 ; +/-15%
  assert.strictEqual(o.status, 'new'); assert.strictEqual(o.in_area, 'yes');
  assert.strictEqual(o.est_low, 230); assert.strictEqual(o.est_high, 311);
  assert.strictEqual(o.lead_status, 'quoted'); assert.strictEqual(o.email, 'sam@ray.test');
  assert.ok(o.customer_html.includes('$230 to $311'));
  assert.ok(o.owner_html.includes('&lt;b&gt;dogs'), 'notes escaped');
});
t('cleaning: deep clean + weekly discount', () => {
  const [o] = run(C, '01-prepare-lead.js', { cfg: cCfg, nodes: { Webhook: [hook({ ...lead, service: 'deep', frequency: 'weekly' })] } });
  // 4.5*1.6=7.2h*60=432*0.85=367.2
  assert.ok(o.est_low < 367 && o.est_high > 367);
});
t('cleaning: minimum price applies to tiny jobs', () => {
  const [o] = run(C, '01-prepare-lead.js', { cfg: cCfg, nodes: { Webhook: [hook({ ...lead, bedrooms: 0, bathrooms: 0 })] } });
  assert.strictEqual(o.est_low, 90);
});
t('cleaning: out-of-area lead gets polite decline, no estimate', () => {
  const [o] = run(C, '01-prepare-lead.js', { cfg: cCfg, nodes: { Webhook: [hook({ ...lead, zip: '99999' })] } });
  assert.strictEqual(o.in_area, 'no'); assert.strictEqual(o.lead_status, 'out_of_area');
  assert.ok(!o.customer_html.includes('$')); assert.strictEqual(o.est_low, '');
});
t('cleaning: duplicate same-day lead blocked; bad input rejected', () => {
  const sd = {};
  run(C, '01-prepare-lead.js', { cfg: cCfg, nodes: { Webhook: [hook(lead)] }, staticData: sd });
  assert.strictEqual(run(C, '01-prepare-lead.js', { cfg: cCfg, nodes: { Webhook: [hook(lead)] }, staticData: sd })[0].status, 'duplicate');
  assert.strictEqual(run(C, '01-prepare-lead.js', { cfg: cCfg, nodes: { Webhook: [hook({ name: '', email: 'x' })] } })[0].status, 'invalid');
});
const L = (o) => ({ lead_id: 'L1', name: 'Sam Ray', email: 'sam@ray.test', status: 'quoted', created_at: '2026-10-10', est_low: 230, est_high: 311, fu1_sent: '', fu2_sent: '', followups_stopped: '', ...o });
t('cleaning: followup 1 at day 2, not before, not twice', () => {
  assert.strictEqual(run(C, '02-followups.js', { cfg: cCfg, input: [L({ created_at: '2026-10-11' })] }).length, 0);
  const o = run(C, '02-followups.js', { cfg: cCfg, input: [L()] });
  assert.strictEqual(o.length, 1); assert.strictEqual(o[0].fu1_sent, 'yes');
  assert.strictEqual(run(C, '02-followups.js', { cfg: cCfg, input: [L({ fu1_sent: 'yes' })] }).length, 0);
});
t('cleaning: followup 2 at day 7; skips booked/stopped', () => {
  const o = run(C, '02-followups.js', { cfg: cCfg, input: [L({ created_at: '2026-10-05', fu1_sent: 'yes' })] });
  assert.strictEqual(o[0].fu2_sent, 'yes'); assert.strictEqual(o[0].fu1_sent, 'yes');
  assert.strictEqual(run(C, '02-followups.js', { cfg: cCfg, input: [L({ status: 'booked' }), L({ followups_stopped: 'yes' })] }).length, 0);
});
t('cleaning: late lead jumps straight to final follow-up (no double send)', () => {
  const o = run(C, '02-followups.js', { cfg: cCfg, input: [L({ created_at: '2026-10-01' })] });
  assert.strictEqual(o.length, 1); assert.strictEqual(o[0].fu2_sent, 'yes');
});
const B = { lead_id: 'L1', email: 'sam@ray.test', name: 'Sam Ray', date: '2026-10-20', start_time: '09:30', duration_hours: 3.5, address: '1 Main St' };
t('cleaning: booking builds confirmation + calendar times', () => {
  const [o] = run(C, '03-prepare-booking.js', { cfg: cCfg, nodes: { Webhook: [hook(B)] } });
  assert.strictEqual(o.status, 'new'); assert.strictEqual(o.start_iso, '2026-10-20T09:30:00'); assert.strictEqual(o.end_iso, '2026-10-20T13:00:00');
});
t('cleaning: booking crossing midnight and bad input', () => {
  const [o] = run(C, '03-prepare-booking.js', { cfg: cCfg, nodes: { Webhook: [hook({ ...B, start_time: '23:00', duration_hours: 2 })] } });
  assert.strictEqual(o.end_iso, '2026-10-21T01:00:00');
  const [bad] = run(C, '03-prepare-booking.js', { cfg: cCfg, nodes: { Webhook: [hook({ ...B, date: 'tomorrow', start_time: '9am', duration_hours: 0 })] } });
  assert.strictEqual(bad.status, 'invalid'); assert.strictEqual(bad.errors.length, 3);
});
const R = (o) => ({ lead_id: 'L1', name: 'Sam', email: 's@x.test', status: 'booked', booking_date: '2026-10-13', booking_time: '09:00', frequency: 'one-time', reminder_sent: '', feedback_sent: '', rebook_sent: '', followups_stopped: '', ...o });
t('cleaning: reminder, feedback, rebook each fire once on the right day', () => {
  const o = run(C, '04-touchpoints.js', { cfg: cCfg, input: [
    R(), R({ lead_id: 'L2', status: 'completed', booking_date: '2026-10-11' }), R({ lead_id: 'L3', status: 'completed', booking_date: '2026-09-12' }),
    R({ lead_id: 'L4', reminder_sent: 'yes' }), R({ lead_id: 'L5', status: 'completed', booking_date: '2026-10-11', followups_stopped: 'yes' }),
    R({ lead_id: 'L6', status: 'completed', booking_date: '2026-09-12', frequency: 'weekly' }) ] });
  assert.deepStrictEqual(o.map(x => x.lead_id + ':' + x.kind), ['L1:reminder', 'L2:feedback', 'L3:rebook']);
  assert.strictEqual(o[1].feedback_sent, 'yes'); assert.strictEqual(o[1].reminder_sent, '');
});
t('cleaning: feedback email sends review link to everyone (no review gating)', () => {
  const [o] = run(C, '04-touchpoints.js', { cfg: cCfg, input: [R({ status: 'completed', booking_date: '2026-10-11' })] });
  assert.ok(o.html.includes('https://example.com/review'));
});

console.log(`\n${passed} passed${process.exitCode ? ', some FAILED' : ''}`);
