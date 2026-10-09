# 02. Firebase / auth debugging checklist

Written for Firebase Auth + Firestore/Storage apps, but most items apply to any token-based login.
*Note: the rules examples below are documentation, not tested here. Test any rules change in the Firebase Emulator before deploying.*

## A. "Login doesn't work"
- [ ] Is the exact error code shown? (`auth/invalid-credential`, `auth/unauthorized-domain`, `auth/popup-blocked`, `auth/network-request-failed`.) Search the code, not the sentence.
- [ ] `auth/unauthorized-domain`: add your deployed domain AND `localhost` under Authentication > Settings > Authorized domains.
- [ ] Is the sign-in method enabled (Authentication > Sign-in method)?
- [ ] Using the right Firebase project? Compare `projectId` in your config to the console. Staging vs production mixups are common.
- [ ] Popup blocked or third-party cookie issues: try redirect sign-in or a different browser.
- [ ] OAuth providers: redirect URI in Google/Apple/GitHub console must exactly match what Firebase shows (trailing slash, http vs https).

## B. "Logged in on the client, but the API says unauthorized"
- [ ] Are you sending the ID token? `const token = await user.getIdToken()` then `Authorization: Bearer <token>`.
- [ ] Tokens expire after ~1 hour. Use `getIdToken()` per request (it refreshes), don't cache the string forever.
- [ ] Server side: verify with the Admin SDK `verifyIdToken(token)`. A decoded token is not proof unless it is verified.
- [ ] Admin SDK initialized with the SAME project's service account as the client app?
- [ ] Clock skew on the server can cause "token used too early" errors.
- [ ] Using cookies/sessions instead? Check `SameSite`, `Secure`, and domain; cross-site cookies fail silently.

## C. "Permission denied" from Firestore / Storage
- [ ] The error tells you the operation and path. Reproduce in the Rules Playground / emulator with the same auth state.
- [ ] `request.auth` is null? The user isn't signed in at that moment (race on page load: wait for `onAuthStateChanged`).
- [ ] Rules are evaluated per document: a query must be provably allowed by its filter. `where('ownerId','==',uid)` can satisfy `resource.data.ownerId == request.auth.uid`; an unfiltered `getDocs(collection)` cannot.
- [ ] Custom claims (roles) need a token refresh after being set: `getIdToken(true)`.
- [ ] Never "fix" it with `allow read, write: if true;`. If you did, fix it now (see D).

## D. Security quick audit (10 minutes)
- [ ] No rule is `if true` for anything but genuinely public data.
- [ ] Every write rule checks `request.auth != null` AND ownership or role.
- [ ] Users cannot set their own role/admin field (check the allowed-fields in update rules).
- [ ] Storage rules restrict file size and content type for uploads.
- [ ] Service account JSON and Admin SDK keys are NOT in the repo or the frontend bundle. (`git log -S"private_key"` to check history.) Firebase *web config* keys are not secrets; service accounts are.
- [ ] If a secret was ever committed: rotate it. Deleting the file is not enough.

Minimal ownership rule pattern (verify in the emulator before use):
```
match /users/{userId} {
  allow read: if request.auth != null && request.auth.uid == userId;
  allow create: if request.auth != null && request.auth.uid == userId;
  allow update: if request.auth != null && request.auth.uid == userId
                && !('role' in request.resource.data.diff(resource.data).affectedKeys());
}
```
