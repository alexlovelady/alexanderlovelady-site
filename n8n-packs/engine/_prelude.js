// ---- shared prelude (the generator puts this at the top of every engine Code node) ----
const cfg = $('Config').first().json;
const flow = cfg.flow || {};
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const today = cfg.today_override || new Date().toLocaleDateString('en-CA', { timeZone: cfg.timezone || 'UTC' });
const ymdOf = s => String(s ?? '').trim().slice(0, 10);
const isYmd = s => /^\d{4}-\d{2}-\d{2}$/.test(s) && new Date(s + 'T00:00:00Z').toISOString().slice(0, 10) === s;
const addDays = (ymd, n) => { const d = new Date(ymd + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const daysBetween = (a, b) => Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000);
const isEmail = s => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || ''));
const lc = x => String(x ?? '').trim().toLowerCase();
const yes = v => lc(v) === 'yes';
const get = (o, p) => String(p).split('.').reduce((a, k) => (a == null ? undefined : a[k]), o);
const lookup = (ctx, k) => { const v = get(ctx, k); return v === undefined ? get(cfg, k) : v; };
const fmtMoney = n => '$' + (Math.round(Number(n) * 100) / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
// Plain text with {{placeholders}} -> safe HTML (template text and values escaped, bare URLs linked, blank line = new paragraph).
const render = (tpl, ctx) => String(tpl ?? '').split(/\n\s*\n/).map(par => {
  let h = par.replace(/[<>&"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  h = h.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, k) => esc(lookup(ctx, k) ?? ''));
  h = h.replace(/(https?:\/\/[^\s<]+?)([.,;:!?)]*)(?=\s|<|$)/g, '<a href="$1">$1</a>$2').replace(/\n/g, '<br>');
  return '<p>' + h + '</p>';
}).join('\n');
// Subject lines: plain text, no line breaks (prevents header injection).
const renderText = (tpl, ctx) => String(tpl ?? '').replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, k) => String(lookup(ctx, k) ?? '')).replace(/[\r\n]+/g, ' ').trim();
const match = (c, ctx) => {
  if (!c) return true;
  if (Array.isArray(c)) return c.every(x => match(x, ctx));
  if (c.any) return c.any.some(x => match(x, ctx));
  if (c.all) return c.all.every(x => match(x, ctx));
  if (c.not) return !match(c.not, ctx);
  const raw = get(ctx, c.field); const s = lc(raw); const n = parseFloat(raw);
  const num = x => (typeof x === 'string' && x.startsWith('cfg.') ? parseFloat(get(cfg, x.slice(4))) : x);
  if ('equals' in c) return s === lc(c.equals);
  if ('in' in c) return c.in.map(lc).includes(s);
  if ('in_cfg' in c) return (get(cfg, c.in_cfg) || []).map(lc).includes(s);
  if ('contains' in c) return s.includes(lc(c.contains));
  if ('contains_any' in c) return c.contains_any.some(w => s.includes(lc(w)));
  if ('empty' in c) return (s === '') === !!c.empty;
  if ('gte' in c) return Number.isFinite(n) && n >= num(c.gte);
  if ('lte' in c) return Number.isFinite(n) && n <= num(c.lte);
  if ('gt' in c) return Number.isFinite(n) && n > num(c.gt);
  if ('lt' in c) return Number.isFinite(n) && n < num(c.lt);
  if ('lte_field' in c) { const o = parseFloat(get(ctx, c.lte_field)); return Number.isFinite(n) && Number.isFinite(o) && n <= o; }
  return false;
};
// Validates a payload against a field list. Returns { v: cleaned values, errors: [...] }.
const validateFields = (fields, b) => {
  const v = {}; const errors = [];
  for (const f of fields) {
    const s0 = b[f.key] == null ? '' : String(b[f.key]).trim();
    if (!s0) { if (f.required) errors.push('missing ' + f.key); v[f.key] = f.default_today ? today : (f.default ?? ''); continue; }
    let s = s0;
    switch (f.type || 'text') {
      case 'email': s = s.toLowerCase(); if (!isEmail(s)) errors.push('invalid ' + f.key); break;
      case 'phone': if (s.replace(/\D/g, '').length < 7) errors.push('invalid ' + f.key); s = s.slice(0, 30); break;
      case 'url': if (!/^https?:\/\/\S+$/i.test(s)) errors.push(f.key + ' must be a http(s) link'); s = s.slice(0, 500); break;
      case 'date': {
        if (!isYmd(s)) { errors.push(f.key + ' must be YYYY-MM-DD'); break; }
        const d = daysBetween(today, s);
        if (f.min_days_ahead != null && d < f.min_days_ahead) errors.push(f.key + ' is too soon');
        if (f.max_days_ahead != null && d > f.max_days_ahead) errors.push(f.key + ' is too far ahead');
        break;
      }
      case 'time': if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(s)) errors.push(f.key + ' must be HH:MM (24h)'); break;
      case 'number': { const n = parseFloat(s); if (!Number.isFinite(n) || (f.min != null && n < f.min) || (f.max != null && n > f.max)) errors.push('invalid ' + f.key); else s = n; break; }
      case 'select': { const hit = (f.options || []).find(o => lc(o) === lc(s)); if (hit === undefined) errors.push(f.key + ' must be one of: ' + (f.options || []).join(', ')); else s = hit; break; }
      default: s = s.slice(0, f.max_length || 1000);
    }
    v[f.key] = s;
  }
  return { v, errors };
};
const authFails = item => !!cfg.webhook_secret && (item.json.headers || {})['x-webhook-secret'] !== cfg.webhook_secret;
const newId = prefix => prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const markSeen = (store, key) => {
  store.seen = store.seen || {};
  const keys = Object.keys(store.seen);
  if (keys.length > 500) for (const k of keys) if (store.seen[k] < addDays(today, -3)) delete store.seen[k];
  store.seen[key] = today;
};
const isSeen = (store, key) => !!(store.seen && store.seen[key] === today);
const withFooter = (html, marketing) => marketing && cfg.optout_footer ? html + `<p style="color:#777;font-size:12px">${esc(cfg.optout_footer)}</p>` : html;
// ---- end prelude ----
