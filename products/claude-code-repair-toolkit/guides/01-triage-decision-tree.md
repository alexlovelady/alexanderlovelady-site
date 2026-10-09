# 01. Triage: what kind of broken is it?

Work top to bottom. Stop at the first "yes". Do not let an AI tool edit code until you can state the symptom in one sentence.

```
START: Write the symptom in ONE sentence: "When I do X, I expect Y, but I get Z."
 |
 +-- Can you reproduce it right now?
 |     NO  -> It's intermittent. Go to "Intermittent bugs" below. Add logging first, change nothing else.
 |     YES -> continue
 |
 +-- Did it ever work?
 |     YES -> Find the last working commit: `git log --oneline`, then `git bisect`. The bug is in that diff. STOP guessing.
 |     NO  -> It was never right. Continue.
 |
 +-- Is there an error message or stack trace?
 |     YES -> Read the FIRST line and the first line of YOUR code in the trace. Search that exact message. Go to the matching guide.
 |     NO  -> Open the browser console AND the server logs. "Nothing happens" almost always has a log somewhere.
 |
 +-- Where does it fail?
       Browser only (console error)     -> frontend. Check network tab for the failing request.
       Network request is 4xx           -> your request is wrong or you are not authorized. Auth guide (02).
       Network request is 5xx           -> server bug. Read server logs for that request id/time.
       Works locally, fails deployed    -> environment difference. Deploy/env guide (04).
       Payment/webhook not firing       -> Stripe guide (03).
       Data missing / wrong             -> database query or permissions rules. Print the actual query and result.
```

## Rules that save hours
1. **One change at a time.** If you change three things and it works, you don't know which one fixed it.
2. **Make it fail on purpose first.** A fix you can't see failing before is a guess.
3. **Smallest reproduction wins.** Strip the app down until the bug still happens with the least code.
4. **Read the actual error, not the summary.** AI tools often paraphrase an error and lose the detail that matters.
5. **Commit before every AI-assisted change.** `git commit -am "before AI fix"` so you can undo.
6. **Never paste secrets into a prompt.** Use placeholders (`sk_test_XXXX`), and rotate any key you did paste.

## Intermittent bugs
- Log inputs, timestamps and an id for each request. Find what the failing cases have in common (time of day, user, size, concurrency).
- Race conditions: two requests at once, retries, double clicks. Make the operation idempotent (see 03).
- "Only in production": compare env vars, versions, region, and caching.

## When to stop and ask for help
- You've spent 2 hours without a one-sentence hypothesis.
- The bug touches money, authentication or customer data and you can't explain it.
- The AI keeps proposing different fixes that each "work" but the bug returns.
