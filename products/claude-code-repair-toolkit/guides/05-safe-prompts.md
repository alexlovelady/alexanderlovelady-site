# 05. Prompts that get better fixes from AI coding tools (and safer ones)

Replace the [brackets]. Always: work on a git branch, commit first, review the diff, run the tests.

## Before you paste anything
- Remove secrets, tokens, customer data and real emails. Use placeholders.
- Paste the exact error and the smallest relevant code, not the whole repo.
- If a key was pasted by accident, rotate it.

## 1. Diagnose before fixing
```
Do not change any code yet. Here is the symptom: [when I do X I expect Y but get Z].
Error (verbatim): [paste]
Relevant files: [paths]
List the 3 most likely root causes, what evidence would confirm or rule out each, and the smallest check I can run for each.
```

## 2. Minimal fix with a test
```
Root cause is [cause]. Write a failing test that reproduces it first, show me that it fails,
then make the smallest change that makes it pass. Do not refactor unrelated code and do not
change the public API. Show the full diff.
```

## 3. Review the AI's own change
```
Review the diff below like a skeptical reviewer. Look for: broken edge cases, missing error handling,
security issues (authorization, injection, secrets), and anything unrelated to the stated bug.
List problems by severity. Say what you are unsure about instead of guessing.
[paste diff]
```

## 4. Stop an AI "fix loop"
```
We have tried [N] fixes and the bug persists. Stop proposing new fixes. Summarize: what we know for
certain (with evidence), what we assumed, and what we have not verified. Then propose ONE experiment
that would split the possibilities in half.
```

## 5. Add logging, not guesses
```
Add temporary, removable logging to [function/flow] that records the inputs, the branch taken and the
output at each step, with a request id. Do not log secrets or personal data. Tell me how to read the output.
```

## 6. Environment drift
```
Works locally, fails in [production/CI]. Compare these two environments and list every difference that
could matter: [Node/runtime versions, env vars (names only), build command, OS, region, file paths].
Do not change code.
```

## 7. Security pass on one file
```
Audit [file] for: missing authentication/authorization checks, trusting client input, SQL/NoSQL injection,
secrets in code, unsafe redirects, and verbose errors. For each finding give the line, the risk, and a fix.
Do not report style issues.
```

## Habits
- Ask the AI to explain a change you don't understand before accepting it.
- If it says "this should work", make it run it.
- Prefer many small commits over one giant AI rewrite.
