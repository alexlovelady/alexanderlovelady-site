// Helper for e2e.sh.  node e2e.js prepare <outdir>   copies workflows, marking the webhook ones active
//                      node e2e.js check <baseUrl>   posts a valid and an empty payload to every webhook
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const cases = [...JSON.parse(fs.readFileSync(path.join(__dirname, 'e2e-legacy.json'))), ...JSON.parse(fs.readFileSync(path.join(__dirname, 'e2e-cases.json')))];
const [cmd, arg] = process.argv.slice(2);
if (cmd === 'prepare') {
  fs.mkdirSync(arg, { recursive: true });
  const hooks = new Set(cases.map(c => c.workflow));
  const dirs = [...['agency-client-onboarding', 'cleaning-lead-to-booking'].map(d => path.join(root, d, 'workflows')),
                ...fs.readdirSync(path.join(root, 'packs')).map(d => path.join(root, 'packs', d, 'workflows'))];
  let n = 0, a = 0;
  for (const d of dirs) for (const f of fs.readdirSync(d)) {
    const wf = JSON.parse(fs.readFileSync(path.join(d, f)));
    wf.active = hooks.has(wf.name); a += wf.active ? 1 : 0;
    fs.writeFileSync(path.join(arg, `${n++}.json`), JSON.stringify(wf));
  }
  const missing = [...hooks].filter(h => !JSON.parse('[' + fs.readdirSync(arg).map(f => fs.readFileSync(path.join(arg, f), 'utf8')).join(',') + ']').some(w => w.name === h));
  fs.writeFileSync(path.join(arg, '..', path.basename(arg) + '-hooks.txt'), [...hooks].join('\n'));
  console.log(`prepared ${n} workflows, ${a} marked active`, missing.length ? 'MISSING: ' + missing.join(', ') : '');
  process.exit(missing.length ? 1 : 0);
}
if (cmd === 'check') {
  (async () => {
    let fail = 0;
    const post = async (p, body) => { const r = await fetch(`${arg}/${p}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }); return [r.status, await r.text()]; };
    for (const c of cases) {
      const [s1, b1] = await post(c.path, c.valid);
      const ok1 = s1 === 200 && b1.includes(c.expect_valid || '"dry_run":true');
      const [s2, b2] = await post(c.path, {});
      const ok2 = s2 === 422;
      if (!ok1 || !ok2) { fail++; console.log(`FAIL ${c.path}: valid -> ${s1} ${b1.slice(0, 200)} | empty -> ${s2} ${b2.slice(0, 120)}`); } else console.log(`ok   ${c.path}`);
    }
    console.log(fail ? `${fail} FAILED of ${cases.length}` : `ALL ${cases.length} WEBHOOKS PASSED (valid payload dry-run + empty payload 422)`);
    process.exit(fail ? 1 : 0);
  })();
}
