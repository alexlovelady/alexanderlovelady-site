require("dotenv").config();
const path = require("node:path");
const express = require("express");
const compression = require("compression");
const helmet = require("helmet");

const apiRoutes = require("./routes/api");
const { site, ridingYears } = require("./lib/site-data");

const app = express();
const PORT = process.env.PORT || 3000;
const SITE_URL = (process.env.SITE_URL || `https://${site.domain}`).replace(/\/$/, "");

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.set("trust proxy", 1);

app.use(
  helmet({
    contentSecurityPolicy: false, // no third-party scripts beyond Google Fonts/YouTube embeds; keep this simple for a static personal site
  })
);
app.use(compression());
app.use(express.static(path.join(__dirname, "public"), { maxAge: "7d" }));

// Data available to every view.
app.use((req, res, next) => {
  res.locals.site = site;
  res.locals.currentYear = new Date().getFullYear();
  res.locals.ridingYears = ridingYears();
  res.locals.siteUrl = SITE_URL;
  res.locals.canonical = `${SITE_URL}${req.path === "/" ? "" : req.path}`;
  res.locals.currentPath = req.path;
  next();
});

app.use("/api", apiRoutes);

const pages = {
  "/": { view: "index", title: "Alexander Lovelady — Automation Developer & Bull Rider", description: "I build systems. I ride bulls. Automation developer, founder, Navy veteran, and competitive bull rider based in Elizabeth City, North Carolina.", ogImage: site.images.homeHero },
  "/work": { view: "work", title: "Work — Alexander Lovelady", description: "The Cleaners Place and RentNest: two SaaS products built and shipped under AMP Titans Automations.", ogImage: "/images/logos/rentnest.jpg" },
  "/bull-riding": { view: "bull-riding", title: "Bull Riding — Alexander Lovelady", description: `${ridingYears()} years chasing a qualified ride. Journey, results, photos, and videos from the arena.`, ogImage: site.images.bullRidingHero },
  "/sponsors": { view: "sponsors", title: "2027 Sponsorship — Alexander Lovelady", description: "Partner with Alexander Lovelady for the 2027 bull riding season. First qualified ride, second-place finish, and a growing audience.", ogImage: site.images.sponsorsHero },
  "/about": { view: "about", title: "About — Alexander Lovelady", description: "Navy veteran, computer science student, automation founder, and bull rider — the full story.", ogImage: site.images.portrait },
  "/contact": { view: "contact", title: "Contact — Alexander Lovelady", description: "Get in touch about an automation project or the 2027 sponsorship season.", ogImage: site.images.homeHero },
};

for (const [route, meta] of Object.entries(pages)) {
  app.get(route, (req, res) => {
    const initialType = route === "/contact" && req.query.type === "sponsor" ? "sponsor" : "automation";
    res.render(meta.view, { meta, initialType });
  });
}

// Redirect the old .html URLs from the previous site so shared/bookmarked links keep working.
const legacyRedirects = {
  "/index.html": "/",
  "/bullriding.html": "/bull-riding",
  "/projects.html": "/work",
  "/about.html": "/about",
  "/contact.html": "/contact",
};
for (const [from, to] of Object.entries(legacyRedirects)) {
  app.get(from, (req, res) => res.redirect(301, to));
}

app.get("/robots.txt", (req, res) => {
  res.type("text/plain").send(`User-agent: *\nAllow: /\nSitemap: ${SITE_URL}/sitemap.xml\n`);
});

app.get("/sitemap.xml", (req, res) => {
  const urls = Object.keys(pages)
    .map((route) => `  <url><loc>${SITE_URL}${route}</loc></url>`)
    .join("\n");
  res.type("application/xml").send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`);
});

app.get("/healthz", (req, res) => res.json({ ok: true }));

app.use((req, res) => {
  res.status(404).render("404", { meta: { title: "Page not found — Alexander Lovelady", description: "Page not found.", ogImage: site.images.homeHero } });
});

app.listen(PORT, () => {
  console.log(`Alexander Lovelady site running on http://localhost:${PORT}`);
});
