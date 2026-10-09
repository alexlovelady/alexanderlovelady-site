// Turns raw RSS items into Stories rows: recent, on-topic, de-duplicated, with a short plain-text summary and a relevance score.
const store = $getWorkflowStaticData('global');
store.links = store.links || {};
const dry = cfg.dry_run === true;
const cutoff = addDays(today, -Number(cfg.max_age_days ?? 7));
const inc = (cfg.include_keywords || []).map(lc).filter(Boolean), exc = (cfg.exclude_keywords || []).map(lc).filter(Boolean);
const norm = u => String(u).replace(/[?&](utm_[a-z]+|fbclid|gclid)=[^&]*/gi, '').replace(/[?&]$/, '').replace(/\/$/, '').toLowerCase();
const strip = h => String(h || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();
const cut = (s, n) => s.length <= n ? s : s.slice(0, n).replace(/\s+\S*$/, '') + '...';
const found = [];
for (const it of $('Fetch Feed').all()) {
  const j = it.json;
  if (!j.link || !j.title) continue;
  const d = new Date(j.isoDate || j.pubDate || ''); const date = isNaN(d) ? today : d.toISOString().slice(0, 10);
  if (date < cutoff) continue;
  const summary = cut(strip(j.contentSnippet || j.summary || j.content || ''), 300);
  const hay = lc(j.title + ' ' + summary);
  const score = inc.filter(k => hay.includes(k)).length;
  if (inc.length && !score) continue;
  if (exc.some(k => hay.includes(k))) continue;
  const nl = norm(j.link);
  if (store.links[nl] || found.some(f => f.nl === nl)) continue;
  let host = ''; try { host = new URL(j.link).hostname.replace(/^www\./, ''); } catch (e) { continue; }
  found.push({ nl, row: { story_id: newId('S'), created_at: today, title: strip(j.title).slice(0, 200), link: j.link, source: host, published: date, summary, score, status: 'new', editor_note: '' } });
}
found.sort((a, b) => b.row.score - a.row.score || b.row.published.localeCompare(a.row.published));
const chosen = found.slice(0, Number(cfg.max_new_per_run ?? 30));
if (!dry) for (const f of chosen) store.links[f.nl] = today;
const keys = Object.keys(store.links);
if (keys.length > 3000) for (const k of keys) if (store.links[k] < addDays(today, -60)) delete store.links[k];
return chosen.map(f => ({ json: { status: 'new', dry_run: dry, row: f.row } }));
