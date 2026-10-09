# Tutorial post drafts (Days 5-7 of the plan)

Rules: post only where self-written tutorials are allowed (check each community's rules first), answer questions in the thread, no cold DMs, no link-dropping in unrelated threads. Disclose that you sell related products/services. Link to the toolkit/services at most once, at the end, if the rules allow it. These are drafts for you to edit into your own voice.

---

## Draft 1: "Stripe webhook says 'signature verification failed'? It's almost always the raw body"

If your Stripe webhook handler logs `No signatures found matching the expected signature for payload`, the cause is usually not your secret. It's your body parser.

**How Stripe signs**
Stripe computes an HMAC-SHA256 over `timestamp + "." + the exact bytes of the request body`, using the endpoint's signing secret, and sends it in the `Stripe-Signature` header. To verify, you must hash the *same bytes*.

**What breaks it**
`express.json()` (or any middleware that parses JSON first) turns the body into an object. When you `JSON.stringify` it back, whitespace and key order can differ, so the bytes differ, so the hash differs.

**Fix (Express)**
```js
// Register the webhook route BEFORE express.json()
app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send('Bad signature');
  }
  // handle event...
  res.sendStatus(200);
});
app.use(express.json()); // everything else
```
Next.js route handlers: read `await req.text()`, not `req.json()`.

**Other causes, in order of how often I see them**
1. Using the dashboard's secret while testing with the Stripe CLI (the CLI prints its own `whsec_` secret).
2. Test-mode secret with a live endpoint, or the reverse.
3. A proxy or framework that modifies the body.
4. Server clock far off (Stripe rejects timestamps older than 5 minutes).

**Then make it idempotent**
Stripe can deliver the same event more than once. Store `event.id` with a UNIQUE constraint before doing the work, and skip if it already exists.

I put a dependency-free signature verifier and an idempotent handler, with tests, in a small repo so you can see exactly what is checked: [link, only if allowed]. Disclosure: I do paid Stripe debugging, but this works fine without me.

---

## Draft 2: "My n8n workflow sent the same email twice. Here's how I stopped duplicates"

Webhooks get retried, forms get double-submitted, and schedules overlap. If your workflow sends emails or creates records, assume every trigger can fire twice.

**Pattern 1: a unique key per business event**
Pick something that identifies the real-world event (deal id, `email + service + date`). On the first line of your logic, check a store for that key. In n8n, a Code node can use workflow static data:
```js
const store = $getWorkflowStaticData('global');
store.seen = store.seen || {};
if (store.seen[key]) return [{ json: { status: 'duplicate' } }];
store.seen[key] = new Date().toISOString().slice(0, 10);
```
Gotcha: static data is only saved on *production* executions (not when you press "Test workflow"), so test with the production webhook URL. For high volume or multi-instance setups, use a database with a unique constraint instead.

**Pattern 2: mark the row after sending, and filter on it**
For scheduled workflows that read a sheet, add a `reminder_sent` column. The workflow only selects rows where it's empty and writes `yes` after the email goes out. That makes every run safe to repeat.

**Pattern 3: dry-run switch**
Put `dry_run: true` in one Config node. When true, return the preview and skip the Gmail/Sheets nodes. You can test your validation and templates with no side effects.

**Pattern 4: escape user text**
If form fields end up inside an HTML email, escape `& < > " '`. Otherwise a name like `<b>x</b>` renders as markup.

I built two small n8n packs around these patterns (agency onboarding and cleaning lead-to-booking). Disclosure: they're for sale, but the patterns above are free to copy. [link, only if allowed]
