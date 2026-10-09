// Turns the checklist inside the prepared deal into one item per task, for the Tasks sheet.
return $('Prepare Deal').first().json.tasks.map(t => ({ json: t }));
