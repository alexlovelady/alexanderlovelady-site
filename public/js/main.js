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

// Live social stats widget
(function () {
  const nodes = document.querySelectorAll("[data-social-count]");
  if (!nodes.length) return;

  function formatCount(n) {
    if (n == null) return "—";
    if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
    if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "K";
    return String(n);
  }

  fetch("/api/social-stats")
    .then((r) => r.json())
    .then((data) => {
      document.querySelectorAll('[data-social-count="youtube"]').forEach((el) => {
        el.textContent = formatCount(data.youtube.count);
      });
      document.querySelectorAll('[data-social-count="tiktok"]').forEach((el) => {
        el.textContent = formatCount(data.tiktok.count);
      });
    })
    .catch(() => {
      nodes.forEach((el) => { el.textContent = "—"; });
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
