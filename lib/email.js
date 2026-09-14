const { Resend } = require("resend");

function escapeHtml(str = "") {
  return str.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

async function sendContactEmail({ type, name, email, phone, company, message }) {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO_EMAIL || "alexander.s.lovelady@gmail.com";
  const from = process.env.CONTACT_FROM_EMAIL || "Alexander Lovelady Site <onboarding@resend.dev>";

  if (!apiKey) {
    console.warn("[email] RESEND_API_KEY not set — logging submission instead of sending.");
    console.warn({ type, name, email, phone, company, message });
    return { delivered: false };
  }

  const resend = new Resend(apiKey);
  const subjectPrefix = type === "sponsor" ? "Sponsorship inquiry" : "Automation project inquiry";

  const html = `
    <h2>${escapeHtml(subjectPrefix)}</h2>
    <p><strong>Name:</strong> ${escapeHtml(name)}</p>
    <p><strong>Email:</strong> ${escapeHtml(email)}</p>
    ${phone ? `<p><strong>Phone:</strong> ${escapeHtml(phone)}</p>` : ""}
    ${company ? `<p><strong>Company/Brand:</strong> ${escapeHtml(company)}</p>` : ""}
    <p><strong>Message:</strong></p>
    <p>${escapeHtml(message).replace(/\n/g, "<br>")}</p>
  `;

  await resend.emails.send({
    from,
    to,
    replyTo: email,
    subject: `${subjectPrefix} — ${name}`,
    html,
  });

  return { delivered: true };
}

module.exports = { sendContactEmail };
