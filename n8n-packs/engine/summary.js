const p = $('Prepare').first().json;
return [{ json: { status: 'recorded', id: p.id, variant: p.variant || undefined } }];
