// Builds ONE newsletter draft email from stories the editor approved. Never sends to subscribers.
const rows = $('Read Stories').all().map(i => i.json).filter(r => r.story_id && lc(r.status) === 'approved');
if (!rows.length) return [];
rows.sort((a, b) => (parseFloat(b.score) || 0) - (parseFloat(a.score) || 0) || String(b.published).localeCompare(String(a.published)));
const chosen = rows.slice(0, Number(cfg.max_items ?? 10));
const item = r => `<h3 style="margin-bottom:4px"><a href="${esc(r.link)}">${esc(r.title)}</a></h3><p style="margin-top:0">${esc(r.editor_note || r.summary)}</p><p style="color:#777;font-size:12px;margin-top:0">Source: ${esc(r.source)}</p>`;
const html = `<h2>${esc(cfg.newsletter_name)}</h2><p>${esc(cfg.intro_text || '[WRITE A SHORT INTRO]')}</p>${chosen.map(item).join('')}<hr><p style="color:#777;font-size:12px">[ADD YOUR UNSUBSCRIBE LINK AND ADDRESS IN YOUR EMAIL PLATFORM]</p>`;
return [{ json: { dry_run: cfg.dry_run === true, to: cfg.editor_email, subject: `DRAFT: ${cfg.newsletter_name} ${today}`, html, count: chosen.length, ids: chosen.map(r => r.story_id) } }];
