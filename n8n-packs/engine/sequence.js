// SEQUENCE: runs on a schedule over a sheet. For every row it sends at most ONE message: the latest step that is due and
// unsent. Earlier unsent steps are marked "skipped" so nothing is sent twice or out of order. Stops on opt-out/status.
const out = [];
const rows = $(flow.read_node).all().map(i => i.json);
for (const r of rows) {
  const key = r[flow.key_col]; if (!key) continue;
  if (flow.base_status && !flow.base_status.map(lc).includes(lc(r.status))) continue;
  if (Object.entries(flow.stop_cols || {}).some(([c, val]) => lc(r[c]) === lc(val))) continue;
  const to = r[flow.email_col || 'email']; if (!isEmail(to)) continue;
  const base = ymdOf(r[flow.date_col]); if (!isYmd(base)) continue;
  if (flow.where && !match(flow.where, r)) continue;
  let pick = -1;
  flow.steps.forEach((s, i) => {
    const due = addDays(base, s.offset_days);
    if (!String(r[s.flag] ?? '').trim() && today >= due && today <= addDays(due, s.window_days ?? 365) && match(s.where, r)) pick = i;
  });
  if (pick < 0) continue;
  const s = flow.steps[pick];
  const flags = {};
  flow.steps.forEach((x, i) => { const cur = String(r[x.flag] ?? '').trim(); flags[x.flag] = i === pick ? 'yes' : (i < pick && !cur ? 'skipped' : cur); });
  const ctx = { ...r, today, first_name: String(r.name || '').trim().split(/\s+/)[0] || 'there' };
  out.push({ json: { [flow.key_col]: key, to, kind: s.flag, subject: renderText(s.subject, ctx), html: withFooter(render(s.body, ctx), s.marketing), ...flags } });
}
return out;
