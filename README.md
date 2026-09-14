# alexanderlovelady.com

Personal brand site for Alexander Lovelady — automation developer, founder,
Navy veteran, and competitive bull rider. Plain Node/Express + EJS (no build
step), styled to a charcoal/cream/copper editorial look.

## Pages

`/` `/work` `/bull-riding` `/sponsors` `/about` `/contact`

All copy and structured data (business info, sponsorship tiers, images, etc.)
lives in one place: [`lib/site-data.js`](lib/site-data.js). Edit that file to
change facts across the whole site instead of hunting through templates.

## Local development

```bash
npm install
cp .env.example .env   # fill in real values, see below
npm run dev            # http://localhost:3000, restarts on file changes
```

## Environment variables

See [`.env.example`](.env.example) for the full list. None are required for
the site to run — every integration degrades gracefully when its key is
missing:

- **`RESEND_API_KEY`** — powers the contact form email. Without it, submissions
  are just logged to the server console instead of emailed (fine for testing,
  not for production). Sign up free at [resend.com](https://resend.com),
  verify a sending domain (or use their `onboarding@resend.dev` test address
  for a quick start), and set `CONTACT_TO_EMAIL` / `CONTACT_FROM_EMAIL`.
- **YouTube and TikTok subscriber/follower counts both work with zero
  configuration** — the site does a best-effort read of each platform's public
  profile page (no API key needed for either). If you'd rather have a more
  reliable YouTube number, set `YOUTUBE_API_KEY` (free at
  [Google Cloud Console](https://console.cloud.google.com/apis/credentials),
  enable "YouTube Data API v3") — the site prefers it automatically when set,
  and falls back to scraping if that call ever fails. TikTok has no public API
  at all, so it's scrape-only; if TikTok ever changes their page markup and
  the scrape breaks, set `TIKTOK_FALLBACK_FOLLOWERS` to a manual number so the
  widget still shows something reasonable instead of "—". Check
  `lib/social-stats.js` if either scrape ever needs a fix.

## Deploying to Railway

1. Push this project to a GitHub repo, then in Railway: **New Project → Deploy
   from GitHub repo**.
2. Railway auto-detects Node from `package.json` and runs `npm install` then
   `npm start` — no extra config needed.
3. In the Railway project's **Variables** tab, add the environment variables
   from `.env.example` (at minimum `SITE_URL` set to your real domain, plus
   `RESEND_API_KEY` / `CONTACT_TO_EMAIL` if you want the contact form to
   actually send email, and `YOUTUBE_API_KEY` for live subscriber counts).
4. Under **Settings → Networking**, add your custom domain
   (`alexanderlovelady.com`) and point its DNS at Railway per their
   instructions (a `CNAME` for the root via Railway's provided target, or use
   their apex-domain support).
5. Railway sets `PORT` automatically — `server.js` already reads
   `process.env.PORT`, so no change needed there.

## Adding more bull riding photos

Drop new images into `public/images/bull-riding/` and add them to the
`gallery` array in `lib/site-data.js`. The homepage hero and the "From the
arena" gallery on `/bull-riding` both pull from `site-data.js`, so no template
edits are needed for new photos.

## Updating the upcoming schedule

Add, edit, or remove events in the `upcomingEvents` array in
`lib/site-data.js` — each one is `{ date, label, event, location, status, url }`
(`date` must be `YYYY-MM-DD` so it sorts correctly; `status` is `"confirmed"`
or `"tentative"`). The Bull Riding page automatically drops any event once
its date has passed, sorts what's left soonest-first, and shows a friendly
placeholder when the list is empty — no template edits needed.

## Adding a featured ride video

Set `featuredVideoId` in `lib/site-data.js` to a YouTube video ID (the part
after `v=` in a YouTube URL) to embed it on the homepage in place of the
"watch on YouTube" placeholder card.

## Legacy URLs

The old site's `.html` URLs (`/index.html`, `/bullriding.html`,
`/projects.html`, `/about.html`, `/contact.html`) 301-redirect to their new
clean-URL equivalents so old shared links and search results keep working.
See `legacyRedirects` in `server.js`.
