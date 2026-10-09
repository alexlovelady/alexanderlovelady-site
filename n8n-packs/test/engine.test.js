// Auto-generated checks for every spec-driven pack. Run: node --test test/engine.test.js   (after python3 build_packs.py)
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const specs = JSON.parse(fs.readFileSync(path.join(__dirname, 'specs.json'), 'utf8'));
const engineDir = path.join(__dirname, '..', 'engine');
const prelude = fs.readFileSync(path.join(engineDir, '_prelude.js'), 'utf8');
const TODAY = '2026-10-12';

function run(kind, cfg, { webhook = [], nodes = {}, staticData = {} } = {}) {
  const code = prelude + '\n' + fs.readFileSync(path.join(engineDir, kind + '.js'), 'utf8');
  const wrap = arr => ({ all: () => arr.map(j => ({ json: j })), first: () => ({ json: arr[0] }), item: { json: arr[0] } });
  const $ = name => name === 'Config' ? wrap([cfg]) : name === 'Webhook' ? { all: () => webhook, first: () => webhook[0] } : wrap(nodes[name] || []);
  return new Function('$', '$getWorkflowStaticData', code)($, () => staticData).map(x => x.json);
}
const hook = (body, headers = {}) => ({ json: { headers, body } });
const cfgOf = (pack, flow, over = {}) => ({ ...pack.cfg, flow: flow.rt, today_override: TODAY, ...over });
const noJunk = (o, label) => { const s = JSON.stringify(o); assert.ok(!s.includes('{{'), label + ': unresolved placeholder'); assert.ok(!/undefined|\[object/.test(s), label + ': undefined in output'); };
const sample = flow => Object.fromEntries(flow.rt.fields.filter(f => 'sample' in f).map(f => [f.key, f.sample]));

for (const pack of specs) {
  for (const flow of pack.flows) {
    const label = `${pack.slug}/${flow.id}`;
    if (flow.kind === 'intake') {
      test(`${label}: valid sample is accepted and fully rendered`, () => {
        const [o] = run('intake', cfgOf(pack, flow), { webhook: [hook(sample(flow))] });
        assert.strictEqual(o.status, 'new', JSON.stringify(o));
        if (flow.rt.id_field) assert.strictEqual(o.row[flow.rt.id_col], sample(flow)[flow.rt.id_field]); else assert.ok(o.row[flow.rt.id_col].startsWith(flow.rt.id_prefix || 'R'));
        for (const f of flow.rt.fields) assert.ok(f.key in o.row, 'row missing ' + f.key);
        if (flow.rt.ack) assert.ok(o.ack_to.includes('@'), 'ack recipient');
        noJunk([o.ack_subject, o.ack_html, o.owner_subject, o.owner_html], label);
      });
      test(`${label}: each required field is enforced`, () => {
        for (const f of flow.rt.fields.filter(f => f.required)) {
          const s = sample(flow); delete s[f.key];
          const [o] = run('intake', cfgOf(pack, flow), { webhook: [hook(s)] });
          assert.strictEqual(o.status, 'invalid', f.key); assert.ok(o.errors.includes('missing ' + f.key));
        }
      });
      test(`${label}: duplicates blocked (live) but not recorded in dry run`, () => {
        if (!(flow.rt.dedupe || []).length) return;
        const sd = {};
        run('intake', cfgOf(pack, flow, { dry_run: false }), { webhook: [hook(sample(flow))], staticData: sd });
        assert.strictEqual(run('intake', cfgOf(pack, flow, { dry_run: false }), { webhook: [hook(sample(flow))], staticData: sd })[0].status, 'duplicate');
        const sd2 = {};
        run('intake', cfgOf(pack, flow, { dry_run: true }), { webhook: [hook(sample(flow))], staticData: sd2 });
        assert.strictEqual(run('intake', cfgOf(pack, flow, { dry_run: true }), { webhook: [hook(sample(flow))], staticData: sd2 })[0].status, 'new');
      });
      test(`${label}: text is HTML-escaped in emails`, () => {
        const s = { ...sample(flow), name: '<b>Eve</b> & Co' };
        const [o] = run('intake', cfgOf(pack, flow), { webhook: [hook(s)] });
        for (const h of [o.ack_html, o.owner_html]) assert.ok(!h.includes('<b>Eve'), 'raw markup leaked');
        assert.ok(!/[\r\n]/.test(o.ack_subject + o.owner_subject));
      });
      test(`${label}: webhook secret and bad select value`, () => {
        const c = cfgOf(pack, flow, { webhook_secret: 'k' });
        assert.strictEqual(run('intake', c, { webhook: [hook(sample(flow))] })[0].status, 'unauthorized');
        assert.strictEqual(run('intake', c, { webhook: [hook(sample(flow), { 'x-webhook-secret': 'k' })] })[0].status, 'new');
        const sel = flow.rt.fields.find(f => f.type === 'select');
        if (sel) assert.strictEqual(run('intake', cfgOf(pack, flow), { webhook: [hook({ ...sample(flow), [sel.key]: 'zzz-not-an-option' })] })[0].status, 'invalid');
      });
      for (const [i, t] of (flow.tests || []).entries()) {
        test(`${label}: custom case ${i + 1} ${t.name || ''}`, () => {
          const [o] = run('intake', cfgOf(pack, flow, t.cfg || {}), { webhook: [hook({ ...sample(flow), ...t.set })] });
          for (const [k, v] of Object.entries(t.expect_row || {})) assert.strictEqual(String(o.row[k]), String(v), k);
          if (t.expect_variant !== undefined) assert.strictEqual(o.variant, t.expect_variant);
          if (t.expect_owner_to) assert.strictEqual(o.owner_to, t.expect_owner_to);
          if (t.expect_html) for (const s of t.expect_html) assert.ok(o.ack_html.includes(s) || o.owner_html.includes(s), 'missing text: ' + s);
          noJunk([o.ack_subject, o.ack_html, o.owner_html], label);
        });
      }
    }
    if (flow.kind === 'event') {
      test(`${label}: valid update, required fields, escaping`, () => {
        const [o] = run('event', cfgOf(pack, flow), { webhook: [hook(sample(flow))] });
        assert.strictEqual(o.status, 'new', JSON.stringify(o));
        assert.strictEqual(String(o.row[flow.rt.key_col]), String(sample(flow)[flow.rt.key_field || flow.rt.key_col]));
        for (const [k, v] of Object.entries(flow.rt.set || {})) assert.strictEqual(o.row[k], v);
        noJunk([o.mail_subject, o.mail_html, o.owner_subject, o.owner_html], label);
        for (const f of flow.rt.fields.filter(f => f.required)) {
          const s = sample(flow); delete s[f.key];
          assert.strictEqual(run('event', cfgOf(pack, flow), { webhook: [hook(s)] })[0].status, 'invalid', f.key);
        }
        const [e] = run('event', cfgOf(pack, flow), { webhook: [hook({ ...sample(flow), name: '<script>x</script>' })] });
        if (flow.rt.emails) for (const k of Object.keys(flow.rt.emails)) {
          const [m] = run('event', cfgOf(pack, flow), { webhook: [hook({ ...sample(flow), [flow.rt.emails_key]: k })] });
          assert.ok(m.mail_to.includes('@') && m.mail_subject, 'email for status ' + k); noJunk([m.mail_subject, m.mail_html], label + ':' + k);
        }
        assert.ok(!(e.mail_html + e.owner_html).includes('<script>'));
      });
      test(`${label}: same event twice on one day is ignored (live)`, () => {
        const sd = {}; const c = cfgOf(pack, flow, { dry_run: false });
        run('event', c, { webhook: [hook(sample(flow))], staticData: sd });
        assert.strictEqual(run('event', c, { webhook: [hook(sample(flow))], staticData: sd })[0].status, 'duplicate');
      });
    }
    if (flow.kind === 'sequence') {
      const rt = flow.rt, cols = pack.cols[rt.sheet];
      const rowFor = (stepOffset, over = {}) => {
        const r = Object.fromEntries(cols.map(c => [c, '']));
        const d = new Date(TODAY + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() - stepOffset);
        Object.assign(r, { [rt.key_col]: 'K1', email: 'sam@ray.test', name: 'Sam Ray', [rt.date_col]: d.toISOString().slice(0, 10) }, rt.base_status ? { status: rt.base_status[0] } : {}, flow.test_row || {}, over);
        return r;
      };
      const runSeq = rows => run('sequence', cfgOf(pack, flow), { nodes: { [rt.read_node]: rows } });
      test(`${label}: every step fires on its day, once, and skips older steps`, () => {
        rt.steps.forEach((s, i) => {
          const [o] = runSeq([rowFor(s.offset_days)]);
          assert.ok(o, 'step ' + s.flag + ' did not fire');
          assert.strictEqual(o.kind, s.flag); assert.strictEqual(o[s.flag], 'yes');
          rt.steps.slice(0, i).forEach(p => assert.strictEqual(o[p.flag], 'skipped'));
          noJunk([o.subject, o.html], label + ':' + s.flag);
          assert.strictEqual(runSeq([rowFor(s.offset_days, { [s.flag]: 'yes' })]).filter(x => x.kind === s.flag).length, 0, 'sent twice');
          assert.strictEqual(runSeq([rowFor(s.offset_days - 1)]).filter(x => x.kind === s.flag).length, 0, 'fired a day early');
        });
      });
      test(`${label}: stops on opt-out/status, ignores bad rows`, () => {
        const s0 = rt.steps[0].offset_days;
        for (const [c, v] of Object.entries(rt.stop_cols || {})) assert.strictEqual(runSeq([rowFor(s0, { [c]: v })]).length, 0, c);
        if (rt.base_status) assert.strictEqual(runSeq([rowFor(s0, { status: 'zzz' })]).length, 0);
        assert.strictEqual(runSeq([rowFor(s0, { email: 'nope' }), rowFor(s0, { [rt.date_col]: '' }), { [rt.key_col]: '' }]).length, 0);
      });
      test(`${label}: marketing steps carry the opt-out footer`, () => {
        for (const s of rt.steps.filter(s => s.marketing)) assert.ok(runSeq([rowFor(s.offset_days)])[0].html.includes('STOP'));
      });
    }
    if (flow.kind === 'digest' && flow.test_rows) {
      test(`${label}: digest renders for sample rows`, () => {
        const nodes = {};
        for (const s of flow.rt.sources) nodes[s.node] = flow.test_rows[s.name] || [];
        const out = run('digest', cfgOf(pack, flow), { nodes });
        assert.strictEqual(out.length, flow.expect_count ?? 1, JSON.stringify(out).slice(0, 300));
        noJunk(out.map(x => [x.subject, x.html]), label);
        for (const o of out) assert.ok(o.to.includes('@'));
      });
    }
  }
}
