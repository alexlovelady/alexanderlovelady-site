// Tests for the custom (non-engine) Code-node logic: Stripe, Shopify, AI content, RSS, newsletter, incidents.
// Run: node --test test/custom.test.js   (after python3 build_packs.py)
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const specs = JSON.parse(fs.readFileSync(path.join(__dirname, 'specs.json'), 'utf8'));
const dir = path.join(__dirname, '..', 'engine');
const prelude = fs.readFileSync(path.join(dir, '_prelude.js'), 'utf8');
const TODAY = '2026-10-12';
const pack = slug => specs.find(p => p.slug === slug);
const flowOf = (slug, id) => pack(slug).flows.find(f => f.id === id);

function runJs(file, slug, flowId, { nodes = {}, input = [], cfg: over = {}, staticData = {} } = {}) {
  const p = pack(slug), fl = flowOf(slug, flowId);
  const cfg = { ...p.cfg, flow: fl.rt, today_override: TODAY, ...over };
  const code = prelude + '\n' + fs.readFileSync(path.join(dir, 'custom', file), 'utf8');
  const wrap = arr => ({ all: () => arr.map(j => ({ json: j })), first: () => ({ json: arr[0] }) });
  const $ = name => name === 'Config' ? wrap([cfg]) : wrap(nodes[name] || []);
  const $input = wrap(input);
  return new Function('$', '$input', '$getWorkflowStaticData', code)($, $input, () => staticData).map(x => x.json);
}
const noJunk = (o, l) => { const s = JSON.stringify(o); assert.ok(!s.includes('{{'), l + ' unresolved'); assert.ok(!/undefined|\[object/.test(s), l + ' undefined'); };

// ---------------- Stripe ----------------
const S = 'stripe-failed-payment-recovery';
const failedEvt = (o = {}) => ({ id: 'evt_1', type: 'invoice.payment_failed', data: { object: { id: 'in_1', customer: 'cus_1', customer_email: 'Ann@Example.test', customer_name: 'Ann Lee', amount_due: 4900, currency: 'usd', attempt_count: 1, hosted_invoice_url: 'https://invoice.stripe.com/i/x', subscription: 'sub_1', ...o } } });
const runFailed = (evt, rows = [], cfg = {}, sd = {}) => runJs('stripe_failed.js', S, 'failed', { nodes: { Trigger: [evt], 'Read Failed Payments': rows }, cfg, staticData: sd });

test('stripe: first failure is logged and emailed with a hosted-invoice link', () => {
  const [o] = runFailed(failedEvt());
  assert.strictEqual(o.status, 'new'); assert.strictEqual(o.row.amount, 49); assert.strictEqual(o.row.amount_display, '$49.00');
  assert.strictEqual(o.row.email, 'ann@example.test'); assert.strictEqual(o.row.status, 'open'); assert.strictEqual(o.row.d0_sent, 'yes');
  assert.ok(o.mail_html.includes('https://invoice.stripe.com/i/x') && o.mail_html.includes('billing.stripe.com')); assert.strictEqual(o.mail_to, 'ann@example.test');
  noJunk([o.mail_subject, o.mail_html, o.owner_subject, o.owner_html], 'stripe_failed');
});
test('stripe: retry of a known invoice only updates attempt_count', () => {
  const [o] = runFailed(failedEvt({ attempt_count: 2 }), [{ invoice_id: 'in_1' }]);
  assert.deepStrictEqual(o.row, { invoice_id: 'in_1', attempt_count: 2 }); assert.strictEqual(o.status, 'existing');
});
test('stripe: duplicate event ignored; wrong type ignored; dry run not recorded', () => {
  const sd = {}; const live = { dry_run: false };
  runFailed(failedEvt(), [], live, sd);
  assert.strictEqual(runFailed(failedEvt(), [], live, sd)[0].status, 'duplicate');
  assert.strictEqual(runFailed({ ...failedEvt(), type: 'invoice.paid' })[0].status, 'ignored');
  const sd2 = {}; runFailed(failedEvt(), [], { dry_run: true }, sd2); assert.strictEqual(runFailed(failedEvt(), [], { dry_run: true }, sd2)[0].status, 'new');
});
test('stripe: zero-decimal currency, missing email and disabled immediate email', () => {
  assert.strictEqual(runFailed(failedEvt({ currency: 'jpy', amount_due: 5000 }))[0].row.amount, 5000);
  assert.strictEqual(runFailed(failedEvt({ customer_email: null }))[0].mail_to, '');
  assert.strictEqual(runFailed(failedEvt(), [], { send_immediate_email: false })[0].mail_to, '');
  assert.strictEqual(runFailed(failedEvt({ currency: 'eur' }))[0].row.amount_display, '49.00 EUR');
});
test('stripe: invoice.paid recovers only OPEN rows we know about', () => {
  const paid = { id: 'evt_2', type: 'invoice.paid', data: { object: { id: 'in_1' } } };
  const open = [{ invoice_id: 'in_1', status: 'open', email: 'ann@example.test', name: 'Ann Lee', amount_display: '$49.00' }];
  const run = (rows, evt = paid, sd = {}) => runJs('stripe_paid.js', S, 'recovered', { nodes: { Trigger: [evt], 'Read Failed Payments': rows }, cfg: { dry_run: false }, staticData: sd });
  const [o] = run(open); assert.strictEqual(o.status, 'new'); assert.strictEqual(o.row.status, 'recovered'); assert.strictEqual(o.row.recovered_at, TODAY); assert.strictEqual(o.mail_to, 'ann@example.test'); noJunk([o.mail_html, o.owner_html], 'paid');
  assert.strictEqual(run([])[0].status, 'ignored');
  assert.strictEqual(run([{ ...open[0], status: 'recovered' }])[0].status, 'ignored');
  assert.strictEqual(run(open, { ...paid, data: { object: { id: 'in_999' } } })[0].status, 'ignored');
});
test('stripe: subscription events become a Subscribers row', () => {
  const evt = (type, o = {}) => ({ id: 'evt_' + type, type, data: { object: { id: 'sub_1', customer: 'cus_1', status: 'active', cancel_at_period_end: true, current_period_end: 1795000000, items: { data: [{ price: { id: 'price_1' } }] }, ...o } } });
  const run = e => runJs('stripe_sub.js', S, 'subs', { nodes: { Trigger: [e] } })[0];
  const u = run(evt('customer.subscription.updated')); assert.strictEqual(u.row.status, 'active'); assert.strictEqual(u.row.price_id, 'price_1'); assert.strictEqual(u.row.cancel_at_period_end, 'yes'); assert.match(u.row.current_period_end, /^\d{4}-\d{2}-\d{2}$/);
  assert.strictEqual(run(evt('customer.subscription.deleted')).row.status, 'canceled');
  assert.strictEqual(run({ id: 'e', type: 'invoice.paid', data: { object: { id: 'x' } } }).status, 'ignored');
});

// ---------------- Shopify ----------------
const SH = 'shopify-customer-operations';
const order = (o = {}) => ({ id: 5001, name: '#1042', order_number: 1042, email: 'Buyer@Example.test', total_price: '64.50', currency: 'USD', financial_status: 'paid', created_at: '2026-10-11T14:00:00-04:00',
  customer: { first_name: 'Bo', last_name: 'Ray' }, shipping_address: { city: 'Norfolk', country_code: 'US' }, line_items: [{ title: 'Mug', quantity: 2 }, { title: 'Plate', quantity: 1 }], ...o });
test('shopify: order is logged and the owner alerted', () => {
  const [o] = runJs('shopify_order.js', SH, 'order', { nodes: { Trigger: [order()] } });
  assert.strictEqual(o.status, 'new'); assert.strictEqual(o.row.total_price, 64.5); assert.strictEqual(o.row.email, 'buyer@example.test'); assert.strictEqual(o.row.created_at, '2026-10-11');
  assert.ok(o.row.items.includes('2 x Mug')); assert.strictEqual(o.row.ship_to, 'Norfolk, US'); assert.ok(o.owner_to); noJunk([o.owner_subject, o.owner_html], 'order');
});
test('shopify: high value flag, quiet mode, duplicates', () => {
  assert.ok(runJs('shopify_order.js', SH, 'order', { nodes: { Trigger: [order({ total_price: '900.00' })] } })[0].owner_subject.includes('HIGH VALUE'));
  const q = { notify_every_order: false };
  assert.strictEqual(runJs('shopify_order.js', SH, 'order', { nodes: { Trigger: [order()] }, cfg: q })[0].owner_to, '');
  assert.ok(runJs('shopify_order.js', SH, 'order', { nodes: { Trigger: [order({ total_price: '900' })] }, cfg: q })[0].owner_to);
  const sd = {}; const c = { dry_run: false };
  runJs('shopify_order.js', SH, 'order', { nodes: { Trigger: [order()] }, cfg: c, staticData: sd });
  assert.strictEqual(runJs('shopify_order.js', SH, 'order', { nodes: { Trigger: [order()] }, cfg: c, staticData: sd })[0].status, 'duplicate');
});
test('shopify: fulfilled order gets tracking email; can be disabled', () => {
  const f = order({ fulfillments: [{ tracking_number: '9400', tracking_company: 'USPS', tracking_url: 'https://track.example/9400' }] });
  const [o] = runJs('shopify_fulfilled.js', SH, 'shipped', { nodes: { Trigger: [f] } });
  assert.strictEqual(o.row.status, 'fulfilled'); assert.ok(o.row.tracking.includes('USPS 9400')); assert.ok(o.mail_html.includes('https://track.example/9400')); noJunk([o.mail_subject, o.mail_html], 'fulfilled');
  assert.strictEqual(runJs('shopify_fulfilled.js', SH, 'shipped', { nodes: { Trigger: [f] }, cfg: { send_shipping_email: false } })[0].mail_to, '');
});
test('shopify: low stock lists tracked variants at or below threshold only', () => {
  const products = [{ title: 'Mug', variants: [{ title: 'Default Title', sku: 'M1', inventory_quantity: 2, inventory_management: 'shopify' }, { title: 'Blue', sku: 'M2', inventory_quantity: 50, inventory_management: 'shopify' }] },
                    { title: 'Print', variants: [{ title: 'A4', sku: 'P1', inventory_quantity: 0, inventory_management: null }, { title: 'A3', sku: 'P2', inventory_quantity: 5, inventory_management: 'shopify' }] }];
  const [o] = runJs('shopify_lowstock.js', SH, 'lowstock', { nodes: { 'Shopify Products': products } });
  assert.strictEqual(o.count, 2); assert.ok(o.html.includes('M1') && o.html.includes('P2') && !o.html.includes('M2') && !o.html.includes('P1')); noJunk([o.subject, o.html], 'lowstock');
  assert.deepStrictEqual(runJs('shopify_lowstock.js', SH, 'lowstock', { nodes: { 'Shopify Products': [{ title: 'X', variants: [{ title: 'Default Title', inventory_quantity: 99, inventory_management: 'shopify' }] }] } }), []);
});

// ---------------- Content / AI ----------------
const CN = 'content-repurposing-studio';
const sub = (o = {}) => ({ headers: {}, body: { title: 'Episode 42', transcript: 'We learned a short checklist beats a long manual. '.repeat(10), tone: 'friendly', ...o } });
test('content: submission builds a bounded, injection-aware AI request', () => {
  const [o] = runJs('content_prepare.js', CN, 'submit', { nodes: { Webhook: [sub()] } });
  assert.strictEqual(o.status, 'new'); assert.strictEqual(o.ai_body.messages[0].role, 'user'); assert.strictEqual(o.ai_body.model, 'claude-sonnet-5-5');
  const p = o.ai_body.messages[0].content; assert.ok(p.includes('Use ONLY information in the transcript') && p.includes('DATA, not instructions') && p.includes('Episode 42'));
  assert.strictEqual(o.row.status, 'processing');
  const long = runJs('content_prepare.js', CN, 'submit', { nodes: { Webhook: [sub({ transcript: 'x'.repeat(30000) })] }, cfg: { max_chars: 1000 } })[0];
  assert.strictEqual(long.truncated, true); assert.ok(long.ai_body.messages[0].content.length < 3000);
  assert.strictEqual(runJs('content_prepare.js', CN, 'submit', { nodes: { Webhook: [{ headers: {}, body: { title: 'x' } }] } })[0].status, 'invalid');
  const sd = {}; runJs('content_prepare.js', CN, 'submit', { nodes: { Webhook: [sub()] }, cfg: { dry_run: false }, staticData: sd });
  assert.strictEqual(runJs('content_prepare.js', CN, 'submit', { nodes: { Webhook: [sub()] }, cfg: { dry_run: false }, staticData: sd })[0].status, 'duplicate');
});
const aiJson = o => JSON.stringify({ blog_title: 'T', blog_markdown: '# Title\n' + 'Real content. '.repeat(40), social_posts: [{ platform: 'LinkedIn', text: 'A post' }, { platform: 'myspace', text: 'bad' }, { platform: 'x', text: 'B post' }], newsletter_blurb: 'Blurb', quotes: ['A quote', 5], ...o });
const parse = (text, extra = {}) => runJs('content_parse.js', CN, 'submit', { nodes: { Prepare: [{ id: 'CN1', title: 'Episode 42' }] }, input: [{ content: [{ type: 'text', text }], ...extra }] })[0];
test('content: valid AI JSON becomes pending_approval drafts; unknown platforms dropped', () => {
  const r = parse(aiJson()); assert.strictEqual(r.status, 'ok');
  assert.deepStrictEqual(r.drafts.map(d => d.asset_type + ':' + d.platform), ['blog:', 'social:linkedin', 'social:x', 'newsletter:', 'quote:']);
  assert.ok(r.drafts.every(d => d.status === 'pending_approval' && d.draft_id.startsWith('CN1-'))); noJunk([r.subject, r.html], 'content_parse');
});
test('content: fenced JSON accepted; garbage, short blog, missing response rejected as ai_error', () => {
  assert.strictEqual(parse('```json\n' + aiJson() + '\n```').status, 'ok');
  assert.strictEqual(parse('Sorry, I cannot do that').status, 'ai_error');
  assert.strictEqual(parse(aiJson({ blog_markdown: 'short' })).status, 'ai_error');
  assert.strictEqual(runJs('content_parse.js', CN, 'submit', { nodes: { Prepare: [{ id: 'CN1', title: 'T' }] }, input: [{ error: { message: '401' } }] })[0].status, 'ai_error');
});

// ---------------- RSS / newsletter ----------------
const NL = 'newsletter-research-publishing';
const rss = (o = {}) => ({ title: 'Big <b>News</b>', link: 'https://news.example.com/a?utm_source=x', contentSnippet: 'Budget changes &amp; more. ' + 'detail '.repeat(80), isoDate: '2026-10-11T08:00:00Z', ...o });
const collect = (items, cfg = {}, sd = {}) => runJs('rss_collect.js', NL, 'collect', { nodes: { 'Fetch Feed': items }, cfg, staticData: sd });
test('rss: stories are cleaned, summarized and carry a source', () => {
  const [o] = collect([rss()]);
  assert.strictEqual(o.status, 'new'); assert.strictEqual(o.row.title, 'Big News'); assert.strictEqual(o.row.source, 'news.example.com'); assert.ok(o.row.summary.length <= 304 && o.row.summary.endsWith('...') && !o.row.summary.includes('&amp;'));
});
test('rss: old, excluded, off-topic and duplicate stories are dropped; keyword score orders results', () => {
  assert.strictEqual(collect([rss({ isoDate: '2026-09-01T00:00:00Z' })]).length, 0);
  assert.strictEqual(collect([rss({ title: 'Sponsored: buy now' })]).length, 0);
  assert.strictEqual(collect([rss()], { include_keywords: ['budget'] }).length, 1);
  assert.strictEqual(collect([rss()], { include_keywords: ['zebra'] }).length, 0);
  const o = collect([rss({ link: 'https://a.test/1', title: 'Plain', contentSnippet: 'x' }), rss({ link: 'https://a.test/2', title: 'Budget budget', contentSnippet: 'tax' })], { include_keywords: ['budget', 'tax'], exclude_keywords: [] });
  assert.strictEqual(o[0].row.link, 'https://a.test/2');
  const sd = {}; collect([rss()], { dry_run: false }, sd);
  assert.strictEqual(collect([rss({ link: 'https://news.example.com/a/' })], { dry_run: false }, sd).length, 0, 'same link w/o tracking params is a duplicate');
  assert.strictEqual(collect([rss(), rss({ link: 'https://news.example.com/a' })]).length, 1, 'duplicates within one run');
  assert.strictEqual(collect([{ title: 'no link' }, { link: 'https://x.test' }]).length, 0);
});
test('newsletter: only approved stories, escaped, as a draft email', () => {
  const rows = [{ story_id: 'S1', status: 'approved', title: 'A <script>x</script>', link: 'https://a.test', source: 'a.test', summary: 'Sum', score: '2', published: '2026-10-10', editor_note: '' },
                { story_id: 'S2', status: 'new', title: 'B', link: 'https://b.test', source: 'b.test', summary: '', score: '5', published: '2026-10-10' },
                { story_id: 'S3', status: 'approved', title: 'C', link: 'https://c.test', source: 'c.test', summary: 'S', score: '4', published: '2026-10-09', editor_note: 'Why it matters' }];
  const [o] = runJs('newsletter_build.js', NL, 'build', { nodes: { 'Read Stories': rows } });
  assert.deepStrictEqual(o.ids, ['S3', 'S1']); assert.ok(!o.html.includes('<script>') && o.html.includes('Why it matters') && o.html.includes('UNSUBSCRIBE')); assert.ok(o.subject.startsWith('DRAFT'));
  assert.deepStrictEqual(runJs('newsletter_build.js', NL, 'build', { nodes: { 'Read Stories': [rows[1]] } }), []);
  const ex = runJs('expand_ids.js', NL, 'build', { nodes: { 'Prepare Draft': [o] } });
  assert.deepStrictEqual(ex.map(x => x.story_id), ['S3', 'S1']); assert.ok(ex.every(x => x.status === 'drafted'));
});

// ---------------- Incidents ----------------
const INC = 'incident-alerts';
const NOW = Date.parse('2026-10-12T12:00:00Z');
const hookItem = (body, headers = {}) => ({ headers, body });
const inc = (item, { sd = {}, at = 0, cfg = {} } = {}) => runJs('incident.js', INC, 'alert', { nodes: { Trigger: [item] }, staticData: sd, cfg: { dry_run: false, now_override: NOW + at * 60000, ...cfg } })[0];
const down = hookItem({ monitor: 'Client A website', status: 'down', url: 'https://a.test', message: 'HTTP 503' });
test('incident: first down opens an incident with a client draft; repeats are suppressed; reminder after the interval', () => {
  const sd = {};
  const a = inc(down, { sd }); assert.strictEqual(a.action, 'open'); assert.strictEqual(a.row.status, 'open'); assert.strictEqual(a.draft_to, 'client-a@example.com'); noJunk([a.owner_subject, a.owner_html, a.draft_html], 'open');
  assert.strictEqual(inc(down, { sd, at: 5 }).status, 'suppressed');
  const r = inc(down, { sd, at: 61 }); assert.strictEqual(r.action, 'reminder'); assert.ok(r.owner_subject.includes('61')); noJunk([r.owner_subject, r.owner_html], 'reminder');
  assert.strictEqual(inc(down, { sd, at: 70 }).status, 'suppressed');
});
test('incident: recovery closes it with the downtime; stray "up" is ignored', () => {
  const sd = {}; inc(down, { sd });
  const r = inc(hookItem({ monitor: 'Client A website', status: 'UP' }), { sd, at: 18 });
  assert.strictEqual(r.action, 'resolve'); assert.strictEqual(r.row.duration_min, 18); assert.strictEqual(r.row.status, 'resolved'); noJunk([r.owner_subject, r.owner_html, r.draft_html], 'resolve');
  assert.strictEqual(inc(hookItem({ monitor: 'Client A website', status: 'up' }), { sd, at: 20 }).status, 'ignored');
  assert.strictEqual(inc(down, { sd, at: 30 }).action, 'open', 'a new outage after recovery is a new incident');
});
test('incident: monitor synonyms, severity rules, on-call routing, validation, secret', () => {
  assert.strictEqual(inc(hookItem({ monitor: 'x', status: 'Alert' })).action, 'open');
  assert.strictEqual(inc(hookItem({ monitor: 'x', alertType: '1' })).action, 'open');
  const c = inc(hookItem({ monitor: 'Checkout page', status: 'down' })); assert.strictEqual(c.severity, 'critical'); assert.strictEqual(c.owner_to, 'oncall@example.com');
  assert.strictEqual(inc(hookItem({ monitor: 'Blog', status: 'down' })).severity, 'minor');
  assert.strictEqual(inc(hookItem({ monitor: 'Other', status: 'down' })).owner_to, 'you@example.com');
  assert.strictEqual(inc(hookItem({ monitor: 'x', status: 'down', severity: 'critical' })).severity, 'critical');
  assert.strictEqual(inc(hookItem({ status: 'down' })).status, 'invalid'); assert.strictEqual(inc(hookItem({ monitor: 'x', status: 'banana' })).status, 'invalid');
  assert.strictEqual(inc(down, { cfg: { webhook_secret: 's' } }).status, 'unauthorized');
  assert.strictEqual(inc(hookItem(down.body, { 'x-webhook-secret': 's' }), { cfg: { webhook_secret: 's' } }).action, 'open');
});
test('incident: n8n errors are alerted once per window and counted when suppressed', () => {
  const err = { workflow: { name: 'Order sync' }, execution: { url: 'https://n8n.test/e/1', error: { message: 'boom' } } };
  const sd = {}; const run = at => runJs('incident.js', INC, 'errors', { nodes: { Trigger: [err] }, staticData: sd, cfg: { dry_run: false, now_override: NOW + at * 60000 } })[0];
  const a = run(0); assert.strictEqual(a.action, 'error_alert'); assert.ok(a.owner_html.includes('boom')); noJunk([a.owner_subject, a.owner_html], 'err');
  assert.strictEqual(run(5).status, 'suppressed'); assert.strictEqual(run(6).status, 'suppressed');
  const b = run(40); assert.strictEqual(b.action, 'error_alert'); assert.ok(b.owner_html.includes('suppressed since the last alert: 2'));
});
test('incident: dry run changes no state', () => {
  const sd = {}; inc(down, { sd, cfg: { dry_run: true } }); assert.deepStrictEqual(sd.incidents, {});
});
