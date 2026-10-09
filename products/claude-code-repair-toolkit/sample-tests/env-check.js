// Fail at startup, with a clear message, instead of failing at 2am with "undefined is not a function".
function checkEnv(env, required) {
  const missing = required.filter(k => !env[k] || String(env[k]).trim() === '');
  const placeholders = required.filter(k => /^(your_|changeme|xxx|todo|<)/i.test(String(env[k] || '')));
  const warnings = [];
  if (env.STRIPE_SECRET_KEY && env.NODE_ENV === 'production' && env.STRIPE_SECRET_KEY.startsWith('sk_test_')) warnings.push('production is using a Stripe TEST key');
  if (env.STRIPE_SECRET_KEY && env.NODE_ENV !== 'production' && env.STRIPE_SECRET_KEY.startsWith('sk_live_')) warnings.push('non-production is using a Stripe LIVE key');
  return { ok: missing.length === 0 && placeholders.length === 0, missing, placeholders, warnings };
}
module.exports = { checkEnv };
