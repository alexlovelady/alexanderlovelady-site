const p = $('Prepare Lead').first().json;
return [{ json: { status: 'lead_recorded', lead_id: p.lead_id, in_area: p.in_area, estimate_low: p.est_low, estimate_high: p.est_high } }];
