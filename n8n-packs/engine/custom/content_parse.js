// Turns the AI response into one Drafts row per asset, all "pending_approval". Anything malformed becomes an ai_error, never a guess.
const prep = $('Prepare').first().json;
const resp = $input.first().json;
const text = ((resp.content || []).filter(c => c.type === 'text').map(c => c.text).join('\n') || '').trim();
const fail = msg => [{ json: { status: 'ai_error', content_id: prep.id, error: msg, to: cfg.owner_email, subject: 'Content drafting failed: ' + prep.title,
  html: render('The AI draft for "' + prep.title + '" could not be used: ' + msg + '\n\nThe content is still in your Content sheet (status ai_error). Resubmit or write it manually.', {}) } }];
let data;
try {
  const cleaned = text.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const a = cleaned.indexOf('{'), b = cleaned.lastIndexOf('}');
  data = JSON.parse(cleaned.slice(a, b + 1));
} catch (e) { return fail('response was not valid JSON'); }
if (typeof data.blog_title !== 'string' || typeof data.blog_markdown !== 'string' || data.blog_markdown.length < 200) return fail('missing or too-short blog draft');
const drafts = [];
const add = (type, platform, title, body) => {
  const t = String(body || '').trim(); if (!t) return;
  drafts.push({ draft_id: prep.id + '-' + (drafts.length + 1), content_id: prep.id, asset_type: type, platform, title, text: t.slice(0, 20000), status: 'pending_approval', scheduled_date: '', created_at: today });
};
add('blog', '', data.blog_title, data.blog_markdown);
for (const p of (Array.isArray(data.social_posts) ? data.social_posts : []).slice(0, Number(cfg.max_social || 5)))
  if (p && typeof p.text === 'string' && ['linkedin', 'x', 'facebook', 'instagram'].includes(lc(p.platform))) add('social', lc(p.platform), '', p.text.slice(0, 1000));
add('newsletter', '', 'Newsletter blurb', data.newsletter_blurb);
for (const q of (Array.isArray(data.quotes) ? data.quotes : []).slice(0, 3)) add('quote', '', '', typeof q === 'string' ? q : '');
return [{ json: { status: 'ok', content_id: prep.id, count: drafts.length, drafts,
  to: cfg.owner_email, subject: renderText(flow.owner.subject, { count: drafts.length, title: prep.title }), html: render(flow.owner.body, { count: drafts.length, title: prep.title }) } }];
