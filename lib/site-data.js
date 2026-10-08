const RIDING_START_YEAR = 2017;
const NAVY_YEARS = 9;

function ridingYears(atDate = new Date()) {
  return atDate.getFullYear() - RIDING_START_YEAR;
}

const site = {
  name: "Alexander Lovelady",
  domain: "alexanderlovelady.com",
  tagline: "I build systems. I ride bulls.",
  subtitle: "Automation developer, founder, Navy veteran, and competitive bull rider.",
  location: "Elizabeth City, North Carolina",
  region: "Regional bull rider — North Carolina and surrounding states",
  circuit: "SEBRA and local jackpots",
  navyYears: NAVY_YEARS,
  contact: {
    email: "alexander.s.lovelady@gmail.com",
    phone: "(252) 421-1355",
    phoneHref: "+12524211355",
  },
  social: {
    tiktokHandle: "alexanderlovelady",
    tiktokUrl: "https://www.tiktok.com/@alexanderlovelady",
    youtubeHandle: "@alexanderlovelady",
    youtubeUrl: "https://youtube.com/@alexanderlovelady",
  },
  featuredVideoId: null, // set to a YouTube video ID to embed the latest ride video on the homepage
  sponsorshipPacketUrl: "/downloads/Alexander_Lovelady_2027_Bull_Riding_Sponsorship_Packet.pdf",
  businesses: [
    {
      slug: "cleaners-place",
      name: "The Cleaners Place",
      logo: "/images/logos/cleaners-place-horizontal.png",
      url: "https://thecleanersplace.com",
      status: "Live product",
      oneLiner: "The all-in-one operations platform house-cleaning businesses run their day on.",
      problem: "Cleaning businesses were juggling paper schedules, group texts, and three or four disconnected apps just to book a job, invoice a client, and pay a crew.",
      solution: "A single platform handling scheduling, invoicing, recurring subscriptions, and team management — plus a 24/7 client self-booking portal and a public marketplace so new customers can find and book a cleaner directly.",
      who: "Independent and small-team house-cleaning businesses, from solo operators to multi-crew shops.",
      results: [
        "24/7 self-booking portal replaces phone-tag scheduling",
        "Built-in Stripe billing for subscriptions and one-off invoices",
        "Public marketplace (find-a-cleaner) drives new customer discovery",
        "Sales-rep portal and admin console for multi-person teams",
      ],
      tags: ["Next.js", "PostgreSQL", "Stripe", "Firebase Auth"],
    },
    {
      slug: "rentnest",
      name: "RentNest",
      logo: "/images/logos/rentnest.jpg",
      url: "https://rentnest.us",
      status: "Live product",
      oneLiner: "Simple property management software for landlords who self-manage 1–20 units.",
      problem: "Small independent landlords were stuck choosing between a spreadsheet-and-Venmo setup or enterprise property management software built for portfolios ten times their size.",
      solution: "A clean, affordable platform covering tenant management, online rent collection, maintenance requests, lease storage, and expense tracking — with a tenant portal included at every tier.",
      who: "Independent landlords managing a handful of rental units themselves, without a property management company.",
      results: [
        "Plans from $19/mo — undercuts every serious paid competitor",
        "Tenant portal included at every tier, not an upsell",
        "Online rent collection via Stripe, no manual chasing",
        "Lease storage, maintenance requests, and expense tracking in one place",
      ],
      tags: ["Next.js", "Prisma", "Stripe", "PDF generation"],
    },
  ],
  parentCompany: {
    name: "AMP Titans Automations",
    logo: "/images/logos/amp-titans-reverse.jpg",
    description: "The studio behind The Cleaners Place and RentNest — where automation, product, and infrastructure work for both products comes together under one roof.",
  },
  githubUrl: "https://github.com/alexlovelady",
  certifications: [
    {
      name: "CompTIA Security+ ce",
      issuer: "CompTIA",
      image: "/images/badges/comptia-security-plus.png",
      url: "https://www.credly.com/badges/3206a7a7-f167-4415-943e-aa10ba1968b3/public_url",
    },
  ],
  portfolio: {
    caseStudy: {
      name: "AMP Titans Capital",
      tagline: "Algorithmic trading platform",
      oneLiner: "A production trading system that gives automated strategies queryable memory of their own history.",
      problem: "Automated trading bots tend to make the same categorical mistakes on repeat, because every decision is made in isolation — nothing in the system remembers whether a similar setup worked before.",
      solution: "A multi-service platform: a FastAPI backend and a risk-managed execution engine trading live through the Ironbeam broker API, a Next.js dashboard for monitoring bots in real time, and — the core of it — a Neo4j knowledge graph built with Graphiti that extracts entities from narrative trade logs, so a strategy can query \"has this bot and condition combination worked before?\" before it acts.",
      stack: ["FastAPI", "Next.js", "Neo4j + Graphiti", "Ironbeam broker API", "ML model registry", "Risk management layer", "Spark worker", "Docker + Railway"],
      note: "Proprietary system — architecture and stack shown here; strategy logic and code are not public.",
    },
    projects: [
      {
        name: "Lead Intent Monitor",
        status: "Live internal tool",
        oneLiner: "Finds public conversations where prospects are already talking about a problem your product solves, scores them, and surfaces the ones worth responding to today.",
        detail: "Built first for The Cleaners Place — a FastAPI backend with an AI classifier scores conversations for intent and relevance, sitting behind a password-gated admin dashboard. The scoring engine (keywords, sources, classifier) is generic and reconfigurable for other businesses.",
        stack: ["FastAPI", "Python", "AI classifier", "Session auth"],
      },
      {
        name: "ForgeDeck",
        status: "In progress",
        oneLiner: "A Windows-first spatial command center for orchestrating multiple coding agents — Claude Code, Codex, terminals, browsers — from one persistent workspace.",
        detail: "An infinite pan/zoom canvas (React Flow) where each agent, terminal, and browser session is a draggable node instead of a buried tab. Built milestone-by-milestone against a written spec; currently at the working-shell stage.",
        stack: ["Electron", "React", "TypeScript", "Vite", "React Flow"],
      },
      {
        name: "RideSight",
        status: "In progress",
        oneLiner: "A computer-vision coach for bull riding — upload a ride video, get evidence-grounded feedback on body position and technique.",
        detail: "A custom fine-tuned rider/bull detector feeds a SAM 2.1 tracking pipeline and 2D pose estimation, run frame-by-frame through a local GPU inference server. Uncertain detections are withheld from riders and routed to a human review queue instead of guessed at.",
        stack: ["Python", "YOLO", "SAM 2.1", "React", "Express", "Local GPU inference"],
      },
    ],
    smallTools: [
      {
        name: "Proxy Collector & Validator",
        oneLiner: "Standalone Python app that collects, validates, and exports proxies — Tkinter GUI over a Flask backend.",
        url: "https://github.com/alexlovelady/proxy-collector-validator",
        stack: ["Python", "Flask", "Tkinter"],
      },
      {
        name: "CursorGPT",
        oneLiner: "Select any region of your screen, OCR it, and get a concise GPT answer in a floating tooltip — for quick lookups and code explanations.",
        url: "https://github.com/alexlovelady/CursorGPT",
        stack: ["Python", "Tesseract OCR", "GPT-4"],
      },
    ],
  },
  sponsorship: {
    tiers: [
      {
        name: "Supporter",
        price: "$250",
        fit: "Local businesses and individual supporters",
        benefits: [
          "Thank-you announcement",
          "Tagged sponsor recognition across content",
          "End-of-season appreciation post",
        ],
      },
      {
        name: "Partner",
        price: "$500",
        fit: "Businesses seeking regular season visibility",
        featured: true,
        benefits: [
          "All Supporter benefits",
          "Recurring mentions in season updates",
          "Logo placement on approved apparel or gear where practical",
        ],
      },
      {
        name: "Season Sponsor",
        price: "$1,000+",
        fit: "Brands wanting a deeper season-long partnership",
        benefits: [
          "All Partner benefits",
          "Prominent approved logo placement",
          "Dedicated content and priority mentions",
          "Selected content usage rights by agreement",
        ],
      },
    ],
    inKindCategories: [
      "Riding equipment, western apparel, boots, hats, protective gear, and training support",
      "Fuel, vehicle maintenance, lodging, meals, photography, and video production",
      "Fitness, recovery, chiropractic, physical therapy, and other rider support services",
    ],
    everySponsorGets: [
      "Professional communication and clear approval before logo or brand use",
      "A season-end summary of results, content activity, and sponsor visibility",
      "Honest representation — no guaranteed wins, views, reach, or event acceptance",
    ],
    goals2027: [
      "Compete regularly at regional events within practical travel distance of northeastern North Carolina",
      "Build on the podium finish with more qualified rides and consistent results",
      "Grow TikTok and YouTube through regular, sponsor-friendly bull riding content",
      "Represent every partner professionally at events and online",
    ],
    fundUse: [
      { area: "Entry fees", purpose: "More opportunities to compete and build results" },
      { area: "Travel", purpose: "Fuel and lodging for regional events" },
      { area: "Equipment", purpose: "Replacement and maintenance of essential riding gear" },
      { area: "Training and content", purpose: "Practice, recovery, photography, and video production" },
    ],
  },
  images: {
    homeHero: "/images/bull-riding/hero-true-grit-wide.jpg",
    bullRidingHero: "/images/bull-riding/hero-true-grit.jpg",
    sponsorsHero: "/images/bull-riding/gallery-03-crowd-wide.jpg",
    portrait: "/images/portrait.jpg",
  },
  gallery: [
    { src: "/images/bull-riding/hero-true-grit.jpg", alt: "Alexander Lovelady out of the chute at True Grit Rodeo" },
    { src: "/images/bull-riding/gallery-04-higgins-chute.jpg", alt: "Alexander Lovelady riding out of the chute" },
    { src: "/images/bull-riding/gallery-08-golden-hour.jpg", alt: "Alexander Lovelady bull riding at golden hour, True Grit Rodeo" },
    { src: "/images/bull-riding/gallery-03-crowd-wide.jpg", alt: "Alexander Lovelady bull riding in front of a crowd" },
    { src: "/images/bull-riding/gallery-05-crmp.jpg", alt: "Alexander Lovelady bull riding" },
    { src: "/images/bull-riding/gallery-01-aggies-buckles.jpg", alt: "Alexander Lovelady bull riding" },
    { src: "/images/bull-riding/gallery-02-farm-city.jpg", alt: "Alexander Lovelady bull riding" },
    { src: "/images/bull-riding/gallery-06-envy-farm.jpg", alt: "Alexander Lovelady bull riding" },
    { src: "/images/bull-riding/gallery-07-tracies-boots.jpg", alt: "Alexander Lovelady bull riding" },
  ],
  // Upcoming schedule shown on the Bull Riding page. Add events as they're
  // booked — the site automatically drops anything once its date has passed
  // and shows a placeholder when this list is empty. `date` must be an
  // ISO string (YYYY-MM-DD) so it sorts and filters correctly; `label` is
  // what actually displays. `status` is "confirmed" or "tentative".
  upcomingEvents: [
    { date: "2026-09-18", label: "September 18, 2026", event: "Crossfire Division Bull Riding", location: "Windsor, VA", status: "confirmed", url: null },
    { date: "2026-09-19", label: "September 19, 2026", event: "Crossfire Division Bull Riding", location: "Windsor, VA", status: "confirmed", url: null },
    { date: "2026-10-10", label: "October 10, 2026", event: "SEBRA Extreme Bulls & Barrels", location: "Wind Vineyards at Laurel Grove, Tappahannock, VA", status: "tentative", url: null },
  ],
};

function upcomingEventsSorted(atDate = new Date()) {
  const today = new Date(atDate.getFullYear(), atDate.getMonth(), atDate.getDate());
  return site.upcomingEvents
    .filter((e) => new Date(e.date) >= today)
    .sort((a, b) => new Date(a.date) - new Date(b.date));
}

module.exports = { site, ridingYears, RIDING_START_YEAR, upcomingEventsSorted };
