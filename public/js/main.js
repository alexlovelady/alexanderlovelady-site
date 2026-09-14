// Mobile nav toggle
(function () {
  const toggle = document.getElementById("navToggle");
  const mobile = document.getElementById("navMobile");
  if (!toggle || !mobile) return;
  toggle.addEventListener("click", () => {
    const isOpen = mobile.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(isOpen));
  });
  mobile.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => {
    mobile.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
  }));
})();

// Shared count-up animation helper: eases a number from 0 to `target`,
// re-running `render(currentValue)` on every frame so callers can format
// (add a suffix, abbreviate to "1.2K", etc.) however they need.
function animateCountUp(target, render, duration) {
  if (duration === undefined) duration = 1200;
  if (!target || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    render(target);
    return;
  }
  const start = performance.now();
  function frame(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
    render(Math.round(target * eased));
    if (progress < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

// Fires `onEnter(el)` once, the first time each observed element scrolls into view.
function onScrollIntoView(elements, onEnter) {
  const els = Array.prototype.filter.call(elements, Boolean);
  if (!els.length) return;
  if (!("IntersectionObserver" in window)) {
    els.forEach(onEnter);
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      observer.unobserve(entry.target);
      onEnter(entry.target);
    });
  }, { threshold: 0.4, rootMargin: "0px 0px -10% 0px" });
  els.forEach((el) => observer.observe(el));
}

// Live social stats widget — counts up to the real number once it's fetched
// and the element has scrolled into view (whichever happens later).
(function () {
  const nodes = document.querySelectorAll("[data-social-count]");
  if (!nodes.length) return;

  function formatCount(n) {
    if (n == null) return "—";
    if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
    if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "K";
    return String(n);
  }

  const dataReady = fetch("/api/social-stats")
    .then((r) => r.json())
    .catch(() => null);

  function reveal(el) {
    const platform = el.dataset.socialCount;
    dataReady.then((data) => {
      const count = data ? data[platform] && data[platform].count : null;
      if (count == null) {
        el.textContent = "—";
        return;
      }
      animateCountUp(count, (v) => { el.textContent = formatCount(v); });
    });
  }

  onScrollIntoView(nodes, reveal);
})();

// Count up the plain numeric stats (years riding, products shipped, etc.)
// the moment each one scrolls into view.
(function () {
  const nodes = document.querySelectorAll(".stat__num:not([data-no-count])");
  if (!nodes.length) return;

  function parse(text) {
    const match = text.trim().match(/^(\D*)(\d[\d,]*)(\D*)$/);
    if (!match) return null;
    const target = parseInt(match[2].replace(/,/g, ""), 10);
    if (Number.isNaN(target)) return null;
    return { prefix: match[1], target, suffix: match[3] };
  }

  const parsed = new Map();
  nodes.forEach((el) => {
    const p = parse(el.textContent);
    if (p) parsed.set(el, p);
  });
  if (!parsed.size) return;

  onScrollIntoView([...parsed.keys()], (el) => {
    const { prefix, target, suffix } = parsed.get(el);
    animateCountUp(target, (v) => { el.textContent = prefix + v + suffix; });
  });
})();

// Contact form
(function () {
  const form = document.getElementById("contactForm");
  if (!form) return;

  const typeButtons = form.querySelectorAll("[data-type-toggle]");
  const typeInput = form.querySelector('input[name="type"]');
  const companyRow = form.querySelector('[data-company-row]');

  function setType(type) {
    typeInput.value = type;
    typeButtons.forEach((btn) => btn.classList.toggle("is-active", btn.dataset.typeToggle === type));
    if (companyRow) companyRow.style.display = type === "sponsor" ? "" : "none";
    const messageLabel = form.querySelector('[data-message-label]');
    if (messageLabel) {
      messageLabel.textContent = type === "sponsor"
        ? "Tell me about your business and what you're hoping to get from a partnership"
        : "Tell me about the process you want to automate";
    }
  }

  typeButtons.forEach((btn) => btn.addEventListener("click", () => setType(btn.dataset.typeToggle)));

  const startedAtField = form.querySelector('input[name="formStartedAt"]');
  if (startedAtField) startedAtField.value = String(Date.now());

  const statusEl = form.querySelector(".form-status");
  const submitBtn = form.querySelector('button[type="submit"]');

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    statusEl.className = "form-status";
    submitBtn.disabled = true;
    const originalLabel = submitBtn.textContent;
    submitBtn.textContent = "Sending…";

    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Something went wrong.");
      statusEl.textContent = "Thanks — your message is in. I'll get back to you soon.";
      statusEl.classList.add("is-visible", "form-status--ok");
      form.reset();
      setType(typeInput.value);
      if (startedAtField) startedAtField.value = String(Date.now());
    } catch (err) {
      statusEl.textContent = err.message || "Something went wrong. Please try emailing directly.";
      statusEl.classList.add("is-visible", "form-status--err");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalLabel;
    }
  });
})();
