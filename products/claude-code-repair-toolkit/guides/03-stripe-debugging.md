# 03. Stripe checkout, subscriptions and webhooks

Use **test mode** (keys starting `sk_test_`) for everything here. Never paste live keys or card data into a chat or prompt.
The files in `sample-tests/` implement the two hardest parts and have passing tests: `stripe-signature.js` and `idempotent-handler.js`. Run them: `node --test sample-tests/toolkit.test.js`.

## A. Webhook never arrives
- [ ] Dashboard > Developers > Webhooks (or Workbench): is the endpoint URL right, and is it receiving events? Stripe shows the attempt, the response code and the body your server returned.
- [ ] Local development: use the Stripe CLI `stripe listen --forward-to localhost:3000/webhook`. It prints its OWN signing secret (`whsec_...`); use that locally, not the dashboard one.
- [ ] Is your endpoint reachable from the internet over HTTPS (not behind auth, a redirect, or a firewall)? A 301/302 redirect counts as a failure.
- [ ] Are you subscribed to the event types you handle (`checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted`)?

## B. "Signature verification failed" (the #1 problem)
- [ ] You must verify against the **raw request body**. If a JSON body parser runs first, the bytes change and verification fails. In Express: `app.post('/webhook', express.raw({type:'application/json'}), handler)` registered BEFORE `express.json()`. In Next.js route handlers: `await req.text()`. Test: `sample-tests` has a test showing re-formatted JSON breaks the signature.
- [ ] Right secret for the right endpoint and mode (test vs live; CLI vs dashboard; one secret per endpoint).
- [ ] Don't compare signatures with `===` in production; use the SDK's `constructEvent` or a constant-time compare.
- [ ] Check the timestamp tolerance (default 5 minutes). Server clock wrong? Replays are intentionally rejected.

## C. Duplicate or out-of-order events
Stripe delivers **at least once** and may retry for days. Your handler must be safe to run twice.
- [ ] Store each processed `event.id` in a table with a UNIQUE constraint and insert BEFORE doing the work (see `idempotent-handler.js`).
- [ ] Return 2xx quickly; do slow work after responding or in a queue. A timeout makes Stripe retry.
- [ ] Don't assume order. Fetch the current object from Stripe (`stripe.subscriptions.retrieve`) when the final state matters, instead of trusting the event's snapshot.
- [ ] Return 4xx only for events you will never accept; return 5xx for temporary failure so Stripe retries.

## D. Subscription state out of sync
Pick ONE source of truth: Stripe. Your database mirrors it.
- [ ] Store `stripe_customer_id`, `stripe_subscription_id`, `status`, `current_period_end`, `cancel_at_period_end`, and the price id.
- [ ] Update from webhooks: `customer.subscription.created/updated/deleted`, `invoice.paid`, `invoice.payment_failed`.
- [ ] Grant access when `status` is `active` or `trialing`. Decide your policy for `past_due` (grace period) and write it down.
- [ ] After Checkout redirect, don't grant access just because the user landed on `/success`. Wait for the webhook (or verify the session server-side).
- [ ] Put your own user id in `client_reference_id` or `metadata` when creating the Checkout Session so webhooks can find the user.

## E. Checkout / API errors
- [ ] "No such price/customer": test and live objects are separate. Check the mode of the key vs the id.
- [ ] `amount_too_small` / currency mismatch: minimum charge amounts apply.
- [ ] Wrong `success_url`/`cancel_url` (must be absolute URLs).
- [ ] Using the publishable key on the server or the secret key in the browser: the secret key must NEVER ship to the client.
- [ ] Use idempotency keys on your own create calls that might be retried (`Idempotency-Key` header / `idempotencyKey` option).

## F. Test checklist before going live
- [ ] Successful payment, declined card (`4000000000000002`), 3D Secure card (`4000002500003155`).
- [ ] Subscription renewal (use test clocks), failed renewal, cancellation, upgrade/downgrade.
- [ ] Same event delivered twice: no double effect.
- [ ] Webhook secret rotated/changed: handler fails safely.
- [ ] Live key + live webhook secret set only in production env vars.
(Test card numbers come from Stripe's public testing docs; confirm current values there.)

Not legal, tax or PCI advice. Using Stripe Checkout/Elements keeps card data off your servers.
