# 04. "Works on my machine" - deploy and environment checklist

## A. Env vars
- [ ] List every variable the code reads: `grep -rn "process.env\." src | sed 's/.*process.env.\([A-Z_0-9]*\).*/\1/' | sort -u`.
- [ ] Each one is set in the hosting dashboard for the right environment (production vs preview).
- [ ] Frontend frameworks only expose prefixed variables to the browser (`NEXT_PUBLIC_`, `VITE_`). Unprefixed ones are `undefined` client-side. And anything prefixed is PUBLIC; never put a secret behind a public prefix.
- [ ] Variables are baked in at BUILD time for many frameworks: change the variable, then redeploy.
- [ ] Use `sample-tests/env-check.js` at startup to fail fast with a clear message and to catch test keys in production.
- [ ] `.env` is in `.gitignore`. Keep a `.env.example` with fake values.

## B. Build and runtime
- [ ] Same Node version locally and in production (`engines` in package.json, `.nvmrc`).
- [ ] Case-sensitive file names: `Header.tsx` vs `header.tsx` works on macOS/Windows and breaks on Linux.
- [ ] Lockfile committed; install with `npm ci` in CI.
- [ ] Devdependencies needed at build time are not skipped in production install.
- [ ] Database migrations ran against the production database.
- [ ] Uses `localhost` anywhere in code? Replace with config.
- [ ] File writes: serverless/containers have read-only or ephemeral disks. Use object storage.

## C. CORS, cookies, URLs
- [ ] CORS errors are server configuration, not frontend bugs: the API must send `Access-Control-Allow-Origin` for your frontend origin.
- [ ] Cookies in production need `Secure` + the right `SameSite`. Cross-domain frontend/API pairs usually need `SameSite=None; Secure`.
- [ ] Base URL / callback URLs (OAuth, Stripe, email links) are updated for the production domain.
- [ ] HTTP vs HTTPS and `www` vs apex mismatches.

## D. First 10 minutes when production breaks
1. Check the hosting provider's logs for the failing request time.
2. Compare to the last good deploy: what changed? Roll back first, debug second.
3. Check status pages of dependencies (database, auth, payments).
4. Confirm env vars and secrets weren't rotated or expired.
5. Write down what you changed and when. Future you needs it.
