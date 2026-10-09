// Run: node --test sample-tests/     (Node 18+; no dependencies)
const test = require('node:test');
const assert = require('node:assert');
const { verifyStripeSignature, signForTest } = require('./stripe-signature');
const { createHandler, memoryStore } = require('./idempotent-handler');
const { checkEnv } = require('./env-check');

const SECRET = 'whsec_test_secret';
const BODY = JSON.stringify({ id: 'evt_1', type: 'invoice.paid' });

test('valid signature passes', () => {
  assert.deepStrictEqual(verifyStripeSignature(BODY, signForTest(BODY, SECRET), SECRET), { ok: true });
});
test('tampered body fails', () => {
  const header = signForTest(BODY, SECRET);
  assert.strictEqual(verifyStripeSignature(BODY.replace('evt_1', 'evt_2'), header, SECRET).reason, 'signature mismatch');
});
test('wrong secret fails', () => {
  assert.strictEqual(verifyStripeSignature(BODY, signForTest(BODY, 'other'), SECRET).ok, false);
});
test('old timestamp is rejected (replay protection)', () => {
  const old = Math.floor(Date.now() / 1000) - 3600;
  assert.strictEqual(verifyStripeSignature(BODY, signForTest(BODY, SECRET, old), SECRET).reason, 'timestamp outside tolerance');
});
test('malformed or missing header is rejected', () => {
  assert.strictEqual(verifyStripeSignature(BODY, 'garbage', SECRET).ok, false);
  assert.strictEqual(verifyStripeSignature(BODY, '', SECRET).ok, false);
});
test('parsed JSON instead of raw body throws a helpful error', () => {
  assert.throws(() => verifyStripeSignature({ id: 'evt_1' }, 'x', SECRET), /RAW request body/);
});
test('re-formatted JSON breaks the signature (why you need the raw body)', () => {
  const header = signForTest(BODY, SECRET);
  const reformatted = JSON.stringify(JSON.parse(BODY), null, 2);
  assert.strictEqual(verifyStripeSignature(reformatted, header, SECRET).ok, false);
});

test('idempotent handler processes an event once', async () => {
  let calls = 0;
  const h = createHandler({ store: memoryStore(), apply: async () => { calls++; } });
  assert.strictEqual((await h({ id: 'evt_1' })).status, 'processed');
  assert.strictEqual((await h({ id: 'evt_1' })).status, 'duplicate');
  assert.strictEqual(calls, 1);
});
test('concurrent duplicate deliveries still process once', async () => {
  let calls = 0;
  const h = createHandler({ store: memoryStore(), apply: async () => { await new Promise(r => setTimeout(r, 10)); calls++; } });
  const results = await Promise.all([h({ id: 'evt_9' }), h({ id: 'evt_9' }), h({ id: 'evt_9' })]);
  assert.strictEqual(calls, 1);
  assert.deepStrictEqual(results.map(r => r.status).sort(), ['duplicate', 'duplicate', 'processed']);
});
test('failed processing releases the event so a retry can succeed', async () => {
  let fail = true, calls = 0;
  const h = createHandler({ store: memoryStore(), apply: async () => { if (fail) throw new Error('db down'); calls++; } });
  await assert.rejects(h({ id: 'evt_5' }), /db down/);
  fail = false;
  assert.strictEqual((await h({ id: 'evt_5' })).status, 'processed');
  assert.strictEqual(calls, 1);
});

test('env check reports missing, placeholder and test/live key mixups', () => {
  const r = checkEnv({ NODE_ENV: 'production', STRIPE_SECRET_KEY: 'sk_test_abc', API_URL: 'your_api_url' }, ['STRIPE_SECRET_KEY', 'API_URL', 'DB_URL']);
  assert.deepStrictEqual(r.missing, ['DB_URL']);
  assert.deepStrictEqual(r.placeholders, ['API_URL']);
  assert.ok(r.warnings[0].includes('TEST key'));
  assert.strictEqual(r.ok, false);
  assert.strictEqual(checkEnv({ A: 'x' }, ['A']).ok, true);
});
