// One item per story that went into the draft, marked "drafted".
const p = $('Prepare Draft').first().json;
return p.ids.map(id => ({ json: { story_id: id, status: 'drafted', drafted_at: today } }));
