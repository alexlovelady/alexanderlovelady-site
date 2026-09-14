// Live-ish subscriber/follower counts for the site's social widget.
// Both providers are cached in-memory so we don't hammer their APIs on every
// page view — a personal site has no need for per-request freshness.

const CACHE_MS = 30 * 60 * 1000; // 30 minutes
let cache = { at: 0, data: null };

// Turns "241", "1.2K", "3.4M" into a plain number. YouTube's channel page
// only ever exposes this abbreviated display string, not a raw integer.
function parseAbbreviatedCount(str) {
  const match = String(str).trim().match(/^([\d.,]+)\s*([KM]?)$/i);
  if (!match) return null;
  const n = Number(match[1].replace(/,/g, ""));
  if (Number.isNaN(n)) return null;
  const suffix = match[2].toUpperCase();
  if (suffix === "K") return Math.round(n * 1000);
  if (suffix === "M") return Math.round(n * 1000000);
  return Math.round(n);
}

async function getYoutubeStatsFromApi(apiKey, handle) {
  const params = new URLSearchParams({ part: "statistics", forHandle: handle, key: apiKey });
  const res = await fetch(`https://www.googleapis.com/youtube/v3/channels?${params}`);
  if (!res.ok) throw new Error(`YouTube API ${res.status}`);
  const json = await res.json();
  const item = json.items && json.items[0];
  if (!item) throw new Error("channel not found");
  return Number(item.statistics.subscriberCount);
}

async function getYoutubeStatsFromScrape(handle) {
  const res = await fetch(`https://www.youtube.com/${handle}`, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });
  if (!res.ok) throw new Error(`YouTube page ${res.status}`);
  const html = await res.text();
  // Matches e.g. "content":"241 subscribers" from the channel page's embedded JSON.
  const match = html.match(/"content":"([\d.,]+[KM]?) subscribers?"/i);
  if (!match) throw new Error("subscriber count not found in page");
  const count = parseAbbreviatedCount(match[1]);
  if (count == null) throw new Error(`could not parse "${match[1]}"`);
  return count;
}

async function getYoutubeStats() {
  const apiKey = process.env.YOUTUBE_API_KEY;
  const handle = process.env.YOUTUBE_HANDLE || "@alexanderlovelady";
  const url = `https://youtube.com/${handle}`;

  try {
    const count = apiKey ? await getYoutubeStatsFromApi(apiKey, handle) : await getYoutubeStatsFromScrape(handle);
    return { count, url, source: apiKey ? "live" : "live-scrape" };
  } catch (err) {
    console.error("[social-stats] youtube failed:", err.message);
    // If a configured API key call fails, fall back to scraping once before giving up.
    if (apiKey) {
      try {
        const count = await getYoutubeStatsFromScrape(handle);
        return { count, url, source: "live-scrape" };
      } catch (err2) {
        console.error("[social-stats] youtube scrape fallback also failed:", err2.message);
      }
    }
    return { count: null, url, source: "error" };
  }
}

async function getTiktokStats() {
  const username = process.env.TIKTOK_USERNAME || "alexanderlovelady";
  const fallback = process.env.TIKTOK_FALLBACK_FOLLOWERS ? Number(process.env.TIKTOK_FALLBACK_FOLLOWERS) : null;
  const url = `https://www.tiktok.com/@${username}`;

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    if (!res.ok) throw new Error(`TikTok page ${res.status}`);
    const html = await res.text();
    const match = html.match(/"followerCount":(\d+)/);
    if (!match) throw new Error("followerCount not found in page");
    return { count: Number(match[1]), url, source: "live" };
  } catch (err) {
    console.error("[social-stats] tiktok failed:", err.message);
    return { count: fallback, url, source: fallback != null ? "fallback" : "error" };
  }
}

async function getSocialStats() {
  const now = Date.now();
  if (cache.data && now - cache.at < CACHE_MS) return cache.data;

  const [youtube, tiktok] = await Promise.all([getYoutubeStats(), getTiktokStats()]);
  const data = { youtube, tiktok, fetchedAt: now };
  cache = { at: now, data };
  return data;
}

module.exports = { getSocialStats };
