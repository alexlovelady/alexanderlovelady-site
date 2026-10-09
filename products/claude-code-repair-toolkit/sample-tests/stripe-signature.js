// Verifies a Stripe-style webhook signature without the Stripe SDK, so you can see exactly what is checked.
// Stripe signs `${timestamp}.${rawBody}` with HMAC-SHA256 using your endpoint's signing secret and sends
// the header: Stripe-Signature: t=<timestamp>,v1=<hex signature>[,v1=<another>]
// In production prefer the official stripe.webhooks.constructEvent(); this file exists for learning and tests.
const crypto = require('crypto');

function verifyStripeSignature(rawBody, header, secret, { toleranceSeconds = 300, now = Date.now() } = {}) {
  if (typeof rawBody !== 'string' && !Buffer.isBuffer(rawBody)) throw new Error('rawBody must be the RAW request body (string or Buffer), not parsed JSON');
  if (!header || !secret) return { ok: false, reason: 'missing header or secret' };
  const parts = String(header).split(',').map(p => p.trim().split('='));
  const t = parts.find(([k]) => k === 't')?.[1];
  const sigs = parts.filter(([k]) => k === 'v1').map(([, v]) => v);
  if (!t || !/^\d+$/.test(t) || sigs.length === 0) return { ok: false, reason: 'malformed header' };
  if (Math.abs(now / 1000 - Number(t)) > toleranceSeconds) return { ok: false, reason: 'timestamp outside tolerance' };
  const expected = crypto.createHmac('sha256', secret).update(`${t}.${rawBody.toString()}`).digest('hex');
  const match = sigs.some(s => s.length === expected.length && crypto.timingSafeEqual(Buffer.from(s), Buffer.from(expected)));
  return match ? { ok: true } : { ok: false, reason: 'signature mismatch' };
}

function signForTest(rawBody, secret, t = Math.floor(Date.now() / 1000)) {
  const sig = crypto.createHmac('sha256', secret).update(`${t}.${rawBody}`).digest('hex');
  return `t=${t},v1=${sig}`;
}
module.exports = { verifyStripeSignature, signForTest };
