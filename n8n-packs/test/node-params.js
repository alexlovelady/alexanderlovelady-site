// Verifies every node in every generated workflow against n8n's own node definitions: the node type and version exist, every
// top-level parameter name is a real property, and every resource/operation value is one of the node's allowed options.
// Usage: N8N_DIR=/path/to/n8n-install node test/node-params.js
const fs = require('fs');
const path = require('path');
const N8N_DIR = process.env.N8N_DIR || (() => { throw new Error('set N8N_DIR'); })();
const base = path.join(N8N_DIR, 'node_modules', 'n8n-nodes-base');
const known = JSON.parse(fs.readFileSync(path.join(base, 'dist', 'known', 'nodes.json'), 'utf8'));
const root = path.join(__dirname, '..');
const dirs = [path.join(root, 'agency-client-onboarding', 'workflows'), path.join(root, 'cleaning-lead-to-booking', 'workflows'),
  ...fs.readdirSync(path.join(root, 'packs')).map(d => path.join(root, 'packs', d, 'workflows'))];
const cache = {};
function props(type, version) {
  const name = type.replace('n8n-nodes-base.', '');
  const k = name + '@' + version;
  if (cache[k] !== undefined) return cache[k];
  const entry = known[name]; if (!entry) return (cache[k] = null);
  const Cls = Object.values(require(path.join(base, entry.sourcePath.replace(/^dist\//, 'dist/').replace(/^nodes\//, 'dist/nodes/'))))[0];
  const inst = new Cls();
  const d = inst.nodeVersions ? inst.nodeVersions[version] && inst.nodeVersions[version].description : inst.description;
  return (cache[k] = d ? d.properties : null);
}
let problems = 0, checked = 0; const seen = new Set();
for (const dir of dirs) for (const f of fs.readdirSync(dir)) {
  const wf = JSON.parse(fs.readFileSync(path.join(dir, f)));
  for (const n of wf.nodes) {
    const sig = n.type + '@' + n.typeVersion + '|' + Object.keys(n.parameters).sort().join(',') + '|' + (n.parameters.resource || '') + '/' + (n.parameters.operation || '');
    if (seen.has(sig)) continue; seen.add(sig); checked++;
    const p = props(n.type, n.typeVersion);
    if (!p) { console.log(`PROBLEM ${wf.name} / ${n.name}: unknown node ${n.type} v${n.typeVersion}`); problems++; continue; }
    const names = new Set(p.map(x => x.name));
    for (const key of Object.keys(n.parameters)) if (!names.has(key)) { console.log(`PROBLEM ${wf.name} / ${n.name}: ${n.type} v${n.typeVersion} has no parameter "${key}"`); problems++; }
    for (const key of ['resource', 'operation', 'authentication', 'method', 'respondWith', 'emailType', 'specifyBody', 'mode']) {
      if (n.parameters[key] === undefined) continue;
      const defs = p.filter(x => x.name === key && Array.isArray(x.options));
      if (!defs.length) continue;
      const allowed = new Set(defs.flatMap(x => x.options.map(o => o.value)));
      if (!allowed.has(n.parameters[key])) { console.log(`PROBLEM ${wf.name} / ${n.name}: ${key}="${n.parameters[key]}" not in [${[...allowed].join(', ')}]`); problems++; }
    }
  }
}
console.log(`${checked} distinct node configurations checked, ${problems} problem(s)`);
process.exit(problems ? 1 : 0);
