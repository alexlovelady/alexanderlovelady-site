const express = require("express");
const rateLimit = require("express-rate-limit");
const { sendContactEmail } = require("../lib/email");
const { getSocialStats } = require("../lib/social-stats");

const router = express.Router();

const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: "Too many submissions. Please try again later or email directly." },
});

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

router.post("/contact", contactLimiter, express.json(), async (req, res) => {
  const body = req.body || {};
  const { type, name, email, phone, company, message, website, formStartedAt } = body;

  // Honeypot: a real visitor never fills the hidden "website" field.
  if (website) {
    return res.json({ ok: true }); // pretend success, drop silently
  }

  // Time trap: a bot that fills and submits in under 2 seconds is almost certainly automated.
  if (formStartedAt && Date.now() - Number(formStartedAt) < 2000) {
    return res.json({ ok: true });
  }

  if (!["automation", "sponsor"].includes(type)) {
    return res.status(400).json({ ok: false, error: "Invalid inquiry type." });
  }
  if (!name || name.trim().length < 2) {
    return res.status(400).json({ ok: false, error: "Please enter your name." });
  }
  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ ok: false, error: "Please enter a valid email." });
  }
  if (!message || message.trim().length < 10) {
    return res.status(400).json({ ok: false, error: "Please include a few more details in your message." });
  }

  try {
    await sendContactEmail({
      type,
      name: name.trim(),
      email: email.trim(),
      phone: (phone || "").trim(),
      company: (company || "").trim(),
      message: message.trim(),
    });
    res.json({ ok: true });
  } catch (err) {
    console.error("[api/contact] failed to send:", err);
    res.status(500).json({ ok: false, error: "Something went wrong sending your message. Please try emailing directly." });
  }
});

router.get("/social-stats", async (req, res) => {
  try {
    const stats = await getSocialStats();
    res.set("Cache-Control", "public, max-age=300");
    res.json(stats);
  } catch (err) {
    console.error("[api/social-stats] failed:", err);
    res.status(500).json({ error: "unavailable" });
  }
});

module.exports = router;
