# Claude Code Repair Toolkit

A practical toolkit for founders and builders whose AI-built app is stuck: a triage decision tree, checklists for Firebase/auth, Stripe and webhooks, and deploy/environment problems, safe prompts for AI coding tools, and runnable sample tests.

## Contents
- `guides/01-triage-decision-tree.md`: find the kind of bug fast
- `guides/02-firebase-auth-checklist.md`: login, tokens, Firestore/Storage rules, security quick audit
- `guides/03-stripe-debugging.md`: webhooks, signature verification, idempotency, subscription sync
- `guides/04-deploy-and-env-checklist.md`: env vars, build, CORS, cookies, "works locally" problems
- `guides/05-safe-prompts.md`: 7 prompts for diagnosing and fixing without making it worse
- `sample-tests/`: dependency-free Node code with 11 passing tests (Stripe-style signature check, idempotent event handler, environment check). Run: `node --test sample-tests/toolkit.test.js` (Node 18+)

## What's tested vs not
- Tested: everything in `sample-tests/` (11 tests).
- Not tested: the Firestore rules snippet and the product-specific steps in the guides, which describe how Firebase, Stripe and hosting dashboards behave at the time of writing. Dashboards and defaults change. Verify against the vendor docs and test in the emulator or test mode.

## Disclaimer
Guidance only. No guarantee your problem is solved. Not legal, tax, security-audit or PCI advice. Not affiliated with or endorsed by Anthropic, Google/Firebase or Stripe.

Suggested price test: $29 (guides + tests), $49 with a short video walkthrough you record yourself.
