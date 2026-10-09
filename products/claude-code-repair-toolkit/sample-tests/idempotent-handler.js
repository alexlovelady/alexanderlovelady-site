// Processes each Stripe event id at most once, even if Stripe retries delivery or two requests arrive together.
// `store` is anything with an atomic "insert if absent" (in SQL: INSERT ... ON CONFLICT DO NOTHING on a UNIQUE event_id).
function createHandler({ store, apply }) {
  return async function handle(event) {
    const firstTime = await store.insertIfAbsent(event.id);
    if (!firstTime) return { status: 'duplicate' };
    try {
      await apply(event);
      return { status: 'processed' };
    } catch (err) {
      await store.remove(event.id); // let Stripe's retry try again instead of silently losing the event
      throw err;
    }
  };
}
// In-memory store for tests. Real code needs a database.
function memoryStore() {
  const seen = new Set();
  return { async insertIfAbsent(id) { if (seen.has(id)) return false; seen.add(id); return true; }, async remove(id) { seen.delete(id); }, seen };
}
module.exports = { createHandler, memoryStore };
