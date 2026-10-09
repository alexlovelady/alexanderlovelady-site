// DIGEST: scheduled summary email. mode "list" = rows needing attention (optionally one email per person);
// mode "metrics" = counts/sums over a recent window with change vs the previous window and optional drop alerts.
const data = {};
for (const s of flow.sources) data[s.name] = $(s.node).all().map(i => i.json).filter(r => r[s.key_col]);
const out = [];
const inWindow = (r, col, fromDay, toDay) => { const d = ymdOf(r[col]); return isYmd(d) && d >= fromDay && d <= toDay; };
const table = (rows, cols) => '<table cellpadding="6" style="border-collapse:collapse;font-family:sans-serif;font-size:14px"><tr>' +
  cols.map(c => `<th align="left" style="border-bottom:1px solid #ccc">${esc(c.label ?? c)}</th>`).join('') + '</tr>' +
  rows.map(r => '<tr>' + cols.map(c => `<td style="border-bottom:1px solid #eee">${esc(r[c.key || c])}</td>`).join('') + '</tr>').join('') + '</table>';

if (flow.mode === 'list') {
  const L = flow.list;
  const from = L.min_days != null ? addDays(today, L.min_days) : '0000-01-01';
  const to = L.within_days != null ? addDays(today, L.within_days) : '9999-12-31';
  let rows = (data[L.source] || []).filter(r => match(L.where, r));
  if (L.date_col) rows = rows.filter(r => inWindow(r, L.date_col, from, to));
  rows = rows.map(r => ({ ...r, overdue: L.date_col && ymdOf(r[L.date_col]) < today ? 'OVERDUE' : '' }));
  if (L.date_col) rows.sort((a, b) => ymdOf(a[L.date_col]).localeCompare(ymdOf(b[L.date_col])));
  const groups = {};
  for (const r of rows) {
    const to_ = L.group_by ? String(r[L.group_by] || '').trim() : (L.to_cfg ? get(cfg, L.to_cfg) : cfg.owner_email);
    if (!isEmail(to_)) continue;
    (groups[to_] = groups[to_] || []).push(r);
  }
  for (const [email, list] of Object.entries(groups)) {
    const ctx = { count: list.length, overdue_count: list.filter(r => r.overdue).length, today };
    const cols = L.columns.map(c => (typeof c === 'string' ? { key: c, label: c.replace(/_/g, ' ') } : c));
    if (L.date_col) cols.push({ key: 'overdue', label: '' });
    out.push({ json: { to: email, count: list.length, overdue_count: ctx.overdue_count,
      subject: renderText(flow.subject, ctx),
      html: render(flow.intro || '', ctx) + table(list, cols) + (flow.outro ? render(flow.outro, ctx) : '') } });
  }
  return out;
}

// metrics mode
const w = flow.window_days || 7;
const end = addDays(today, flow.end_offset_days || 0);
const curFrom = addDays(end, -(w - 1)), prevFrom = addDays(end, -(2 * w - 1)), prevTo = addDays(end, -w);
const lines = []; const values = [];
for (const m of flow.metrics) {
  const rows = (data[m.source] || []).filter(r => match(m.where, r));
  const calc = (a, b) => { const sel = m.date_col ? rows.filter(r => inWindow(r, m.date_col, a, b)) : rows; return m.op === 'sum' ? sel.reduce((t, r) => t + (parseFloat(r[m.col]) || 0), 0) : m.op === 'avg' ? (sel.length ? sel.reduce((t, r) => t + (parseFloat(r[m.col]) || 0), 0) / sel.length : 0) : sel.length; };
  const cur = calc(curFrom, end), prev = m.date_col ? calc(prevFrom, prevTo) : null;
  const fmt = x => (m.format === 'money' ? fmtMoney(x) : (Math.round(x * 100) / 100).toString());
  const change = prev == null ? '' : prev === 0 ? (cur === 0 ? 'no change' : 'new') : ((cur - prev) / prev * 100 >= 0 ? '+' : '') + Math.round((cur - prev) / prev * 100) + '%';
  const flagged = !!(m.alert_drop_pct && prev > 0 && (prev - cur) / prev * 100 >= m.alert_drop_pct);
  values.push(cur);
  const spike = !!(m.alert_rise_pct && prev > 0 && (cur - prev) / prev * 100 >= m.alert_rise_pct);
  lines.push({ label: m.label, value: fmt(cur), prev: prev == null ? '' : fmt(prev), change, flagged: flagged ? 'DROP' : spike ? 'SPIKE' : '' });
}
for (const rt of flow.ratios || []) {
  if (rt.op === 'diff') { const d = values[rt.a] - values[rt.b]; lines.push({ label: rt.label, value: rt.format === 'money' ? fmtMoney(d) : String(Math.round(d * 100) / 100), prev: '', change: '', flagged: '' }); continue; }
  const num = values[rt.num], den = values[rt.den];
  lines.push({ label: rt.label, value: den > 0 ? Math.round(num / den * 1000) / 10 + '%' : 'n/a', prev: '', change: '', flagged: '' });
}
if (flow.skip_if_all_zero && values.every(x => !x)) return [];
if (flow.only_if_flagged && !lines.some(l => l.flagged)) return [];
const ctx = { today, window_days: w, flagged_count: lines.filter(l => l.flagged).length };
out.push({ json: { to: cfg.owner_email, flagged: ctx.flagged_count, subject: renderText(flow.subject, ctx),
  html: render(flow.intro || '', ctx) + table(lines, [{ key: 'label', label: 'Measure' }, { key: 'value', label: `Last ${w} days` }, { key: 'prev', label: 'Previous' }, { key: 'change', label: 'Change' }, { key: 'flagged', label: '' }]) + (flow.outro ? render(flow.outro, ctx) : '') } });
return out;
