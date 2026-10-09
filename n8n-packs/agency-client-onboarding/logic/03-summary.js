// Collapses the many task rows into one response for the webhook caller.
const p = $('Prepare Deal').first().json;
return [{ json: { status: 'onboarding_started', deal_id: p.deal_id, client: p.client_name, kickoff_date: p.kickoff_date, tasks_created: p.tasks.length } }];
