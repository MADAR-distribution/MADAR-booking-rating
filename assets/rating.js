(function () {
  "use strict";

  const LS_API_BASE = "public_booking_api_base";
  const LS_DEVICE_ID = "device_id";
  const LS_THEME = "public_booking_theme";

  const byId = (id) => document.getElementById(id);

  function getPreferredTheme() {
    const stored = (localStorage.getItem(LS_THEME) || "").trim();
    if (stored === "dark" || stored === "light") return stored;
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) return "dark";
    return "light";
  }

  function applyTheme(theme) {
    if (theme === "dark" || theme === "light") document.documentElement.setAttribute("data-theme", theme);
    else document.documentElement.removeAttribute("data-theme");
    const label = byId("themeBtnLabel");
    if (label) label.textContent = getPreferredTheme() === "dark" ? "Light" : "Dark";
  }

  function initThemeToggle() {
    const stored = (localStorage.getItem(LS_THEME) || "").trim();
    if (stored === "dark" || stored === "light") applyTheme(stored);
    else applyTheme("auto");
    const btn = byId("themeBtn");
    if (!btn) return;
    btn.addEventListener("click", () => {
      const current = getPreferredTheme();
      const next = current === "dark" ? "light" : "dark";
      localStorage.setItem(LS_THEME, next);
      applyTheme(next);
    });
  }

  function escapeHtml(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function safeJsonParse(str) {
    try {
      if (typeof str !== "string") return null;
      const looksLikeObj = str.includes("{") && str.includes("}");
      if (!looksLikeObj) return null;
      let s = str.trim();
      // Backend sometimes sends single-quoted pseudo-JSON: "{'en': 'x', 'ar': 'y'}"
      if (s.includes("'")) s = s.replace(/'/g, '"');
      return JSON.parse(s);
    } catch {
      return null;
    }
  }

  function getLocalizedName(value) {
    if (value === null || value === undefined) return "";
    if (typeof value === "string") {
      const parsed = safeJsonParse(value);
      if (parsed && typeof parsed === "object") return parsed[state.lang] || parsed.en || parsed.ar || value;
      return value;
    }
    if (typeof value === "object") {
      return value[state.lang] || value.en || value.ar || "";
    }
    return String(value);
  }

  function getOrCreateDeviceId() {
    let id = localStorage.getItem(LS_DEVICE_ID);
    if (id) return id;
    id = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
    localStorage.setItem(LS_DEVICE_ID, id);
    return id;
  }

  function getApiBase() {
    const fromWindow = (window.__API_BASE__ || "").trim();
    if (fromWindow) return fromWindow.replace(/\/+$/, "");
    const fromLS = (localStorage.getItem(LS_API_BASE) || "").trim();
    if (fromLS) return fromLS.replace(/\/+$/, "");
    return "";
  }

  function setApiBase(value) {
    const v = (value || "").trim().replace(/\/+$/, "");
    localStorage.setItem(LS_API_BASE, v);
    return v;
  }

  function apiUrl(base, path) {
    if (!base) return path;
    if (path.startsWith("http")) return path;
    if (!path.startsWith("/")) path = "/" + path;
    return base + path;
  }

  async function apiFetch(base, path, opts = {}) {
    const url = apiUrl(base, path);
    const headers = Object.assign(
      { Accept: "application/json" },
      opts.body ? { "Content-Type": "application/json" } : {},
      opts.headers || {}
    );
    const res = await fetch(url, Object.assign({}, opts, { headers }));
    const text = await res.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { raw: text };
    }
    if (!res.ok) {
      const msg = (data && (data.error || data.message)) || `Request failed (${res.status})`;
      const err = new Error(msg);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  function show(el, yes) {
    if (el) el.hidden = !yes;
  }

  function setText(id, txt) {
    const el = byId(id);
    if (el) el.textContent = txt;
  }

  function setAlert(el, kind, msg) {
    if (!el) return;
    el.classList.remove("alertOk", "alertErr", "alertWarn");
    el.classList.add("alert");
    if (kind === "ok") el.classList.add("alertOk");
    if (kind === "err") el.classList.add("alertErr");
    if (kind === "warn") el.classList.add("alertWarn");
    el.textContent = msg;
    el.hidden = false;
  }

  function getServiceIdFromUrl() {
    const url = new URL(window.location.href);
    const qp = (url.searchParams.get("serviceId") || "").trim();
    if (qp) return qp;
    const parts = window.location.pathname.split("/").filter(Boolean);
    const ratingIdx = parts.indexOf("rating");
    if (ratingIdx >= 0 && parts.length > ratingIdx + 1) {
      const seg = parts[ratingIdx + 1];
      if (seg && seg !== "index.html") return decodeURIComponent(seg).trim();
    }
    return "";
  }

  const i18n = {
    en: {
      rating: "Rating",
      publicRatingPage: "Public rating page",
      shareFeedback: "Share your feedback",
      rateYourService: "Rate your service",
      subtitle: "Select a rating and optionally add a comment.",
      yourRating: "Your rating",
      tapStar: "Tap a star, then submit.",
      ratingLabel: "Rating",
      ratingHelp: "5 is the best.",
      nameOptional: "Name (optional)",
      phoneOptional: "Phone (optional)",
      commentOptional: "Comment (optional)",
      commentPlaceholder: "Tell us what went well or what we can improve",
      submit: "Submit",
      reset: "Reset",
      recentRatings: "Recent ratings",
      recentHint: "Latest feedback for this service.",
      refresh: "Refresh",
      configurationRequired: "Configuration required",
      needsApiBase: "This page needs an API base URL to call your public rating endpoints.",
      apiBaseUrl: "API Base URL",
      saveAndReload: "Save & Reload",
      back: "Back",
      error: "Error",
      missingServiceId: "Missing service id in URL. Use /rating/<serviceId> or /rating/?serviceId=<serviceId>.",
      pickRating: "Please choose a rating",
      submitted: "Thank you! Your rating was submitted.",
      failedToSubmit: "Failed to submit rating",
      failedToLoad: "Failed to load service ratings",
      servicePrefix: "Service:",
      branchPrefix: "Branch:",
      anonymous: "Anonymous",
      average: "Average",
      ratingsCount: "Ratings",
      tip: "Tip",
      hintTapStar: "Tap a star to rate",
      avgShort: "Avg",
      countShort: "Count",
      selected: "Selected",
    },
    ar: {
      rating: "التقييم",
      publicRatingPage: "صفحة التقييم العامة",
      shareFeedback: "شاركنا رأيك",
      rateYourService: "قيّم الخدمة",
      subtitle: "اختر التقييم ويمكنك إضافة تعليق اختياري.",
      yourRating: "تقييمك",
      tapStar: "اختر نجمة ثم أرسل.",
      ratingLabel: "التقييم",
      ratingHelp: "5 هو الأفضل.",
      nameOptional: "الاسم (اختياري)",
      phoneOptional: "الهاتف (اختياري)",
      commentOptional: "تعليق (اختياري)",
      commentPlaceholder: "أخبرنا بما أعجبك أو ما يمكن تحسينه",
      submit: "إرسال",
      reset: "إعادة ضبط",
      recentRatings: "أحدث التقييمات",
      recentHint: "آخر التعليقات لهذه الخدمة.",
      refresh: "تحديث",
      configurationRequired: "إعدادات مطلوبة",
      needsApiBase: "تحتاج هذه الصفحة إلى عنوان API لاستدعاء واجهات التقييم العامة.",
      apiBaseUrl: "عنوان API",
      saveAndReload: "حفظ وإعادة تحميل",
      back: "رجوع",
      error: "خطأ",
      missingServiceId: "رقم الخدمة غير موجود في الرابط. استخدم /rating/<serviceId> أو /rating/?serviceId=<serviceId>.",
      pickRating: "يرجى اختيار تقييم",
      submitted: "شكراً لك! تم إرسال تقييمك.",
      failedToSubmit: "فشل إرسال التقييم",
      failedToLoad: "فشل تحميل تقييمات الخدمة",
      servicePrefix: "الخدمة:",
      branchPrefix: "الفرع:",
      anonymous: "مجهول",
      average: "المتوسط",
      ratingsCount: "عدد التقييمات",
      tip: "معلومة",
      hintTapStar: "اختر نجمة للتقييم",
      avgShort: "المتوسط",
      countShort: "العدد",
      selected: "تم الاختيار",
    },
  };

  const state = {
    lang: "en",
    apiBase: "",
    serviceId: "",
    service: null,
  };

  function t(key) {
    const dict = i18n[state.lang] || i18n.en;
    return dict[key] || i18n.en[key] || key;
  }

  function applyLanguage() {
    document.documentElement.lang = state.lang;
    document.documentElement.dir = state.lang === "ar" ? "rtl" : "ltr";

    setText("brandTitle", t("rating"));
    setText("brandSubtitle", t("publicRatingPage"));
    setText("heroSubtitle", t("shareFeedback"));
    setText("pageTitle", t("rateYourService"));
    setText("pageSubtitle", t("subtitle"));
    setText("stepTitle", t("yourRating"));
    setText("stepDesc", t("tapStar"));
    setText("starsLabel", t("ratingLabel"));
    setText("starsHelp", t("ratingHelp"));
    setText("nameLabel", t("nameOptional"));
    setText("phoneLabel", t("phoneOptional"));
    setText("commentLabel", t("commentOptional"));
    const comment = byId("commentInput");
    if (comment) comment.placeholder = t("commentPlaceholder");
    setText("submitBtn", t("submit"));
    setText("resetBtn", t("reset"));
    setText("recentTitle", t("recentRatings"));
    setText("recentHint", t("recentHint"));
    setText("refreshBtn", t("refresh"));

    setText("configTitle", t("configurationRequired"));
    setText("configText", t("needsApiBase"));
    setText("saveApiBtn", t("saveAndReload"));
    setText("backHome", t("back"));
    setText("errorTitle", t("error"));
    setText("goHomeBtn", t("back"));

    setText("langBtnLabel", state.lang === "ar" ? "EN" : "AR");
    setText("avgLabel", t("average"));
    setText("countLabel", t("ratingsCount"));
    setText("hintLabel", t("tip"));
    setText("hintValue", t("hintTapStar"));
    renderServicePills();
    updateRatingPreview();
  }

  function coerceRatingValue(r) {
    const v = Number(r?.rating ?? r?.value ?? r?.stars);
    if (!Number.isFinite(v)) return null;
    if (v < 1 || v > 5) return null;
    return v;
  }

  function updateStats(ratings) {
    const vals = (ratings || []).map(coerceRatingValue).filter((x) => x !== null);
    const count = vals.length;
    const avg = count ? vals.reduce((a, b) => a + b, 0) / count : null;
    const avgText = avg === null ? "—" : avg.toFixed(1);
    const countText = count ? String(count) : "—";

    setText("avgValue", avgText);
    setText("countValue", countText);
  }

  function starSvg() {
    return (
      '<svg class="starIcon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
      '<path d="M12 17.3 6.8 20l1-5.9-4.3-4.2 6-0.9L12 3.6l2.7 5.4 6 0.9-4.3 4.2 1 5.9L12 17.3Z"/>' +
      "</svg>"
    );
  }

  function getSelectedRating() {
    const v = Number(byId("ratingValue")?.value);
    if (!Number.isFinite(v)) return null;
    if (v < 1 || v > 5) return null;
    return v;
  }

  function updateRatingPreview(previewValue) {
    const el = byId("ratingPreview");
    if (!el) return;
    const v = Number.isFinite(Number(previewValue)) ? Number(previewValue) : getSelectedRating();
    if (!v) {
      el.textContent = "";
      return;
    }
    el.textContent = `${t("selected")}: ${v} / 5`;
  }

  function setStarVisuals(value) {
    const stars = byId("stars");
    if (!stars) return;
    const v = Number(value);
    [...stars.querySelectorAll(".starBtn")].forEach((btn) => {
      const n = Number(btn.dataset.value);
      btn.dataset.active = Number.isFinite(v) && n <= v ? "true" : "false";
      btn.setAttribute("aria-checked", Number.isFinite(v) && n === v ? "true" : "false");
    });
  }

  function setRating(value) {
    const v = Number(value);
    const input = byId("ratingValue");
    if (input) input.value = Number.isFinite(v) ? String(v) : "";
    setStarVisuals(v);
    updateRatingPreview(v);
  }

  function wireStars() {
    const stars = byId("stars");
    if (!stars) return;
    stars.innerHTML = "";
    for (let i = 1; i <= 5; i++) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "starBtn";
      btn.dataset.value = String(i);
      btn.setAttribute("role", "radio");
      btn.setAttribute("aria-checked", "false");
      btn.setAttribute("aria-label", String(i));
      btn.innerHTML = starSvg();
      btn.addEventListener("click", () => setRating(i));
      btn.addEventListener("mouseenter", () => {
        setStarVisuals(i);
        updateRatingPreview(i);
      });
      stars.appendChild(btn);
    }
    stars.addEventListener("mouseleave", () => {
      const selected = getSelectedRating();
      setStarVisuals(selected || NaN);
      updateRatingPreview(selected || NaN);
    });
    // initialize visuals
    const selected = getSelectedRating();
    setStarVisuals(selected || NaN);
    updateRatingPreview(selected || NaN);
  }

  function getLocalizedField(obj, enKey, arKey) {
    if (!obj) return "";
    if (state.lang === "ar") return obj[arKey] || obj[enKey] || "";
    return obj[enKey] || obj[arKey] || "";
  }

  function renderServicePills() {
    const servicePill = byId("servicePill");
    const branchPill = byId("branchPill");
    const serviceRaw = state.service ? (state.service.name_ar || state.service.name || "") : "";
    const branchRaw = state.service ? (state.service.branch_name_ar || state.service.branch_name || "") : "";
    const serviceName = getLocalizedName(serviceRaw);
    const branchName = getLocalizedName(branchRaw);

    if (servicePill) servicePill.textContent = `${t("servicePrefix")} ${serviceName || "—"}`;
    if (branchPill) branchPill.textContent = `${t("branchPrefix")} ${branchName || "—"}`;
  }

  function renderRatings(listEl, ratings) {
    if (!listEl) return;
    listEl.innerHTML = "";
    if (!ratings || ratings.length === 0) {
      // Keep the side panel clean when empty.
      return;
    }
    ratings.slice(0, 20).forEach((r) => {
      const item = document.createElement("div");
      item.className = "ratingItem";
      const ratingVal = r.rating ?? r.value ?? r.stars ?? "";
      const name = r.name || r.customer_name || t("anonymous");
      const comment = r.comment || r.notes || r.feedback || "";
      const created = r.created_at || r.createdAt || r.date || "";

      item.innerHTML =
        `<div class="ratingTop">` +
        `<div class="ratingStarsText">${escapeHtml(String(ratingVal))} / 5</div>` +
        `<div class="ratingMeta">${escapeHtml(String(name))}${created ? " • " + escapeHtml(String(created)) : ""}</div>` +
        `</div>` +
        (comment ? `<div class="ratingComment muted small">${escapeHtml(comment)}</div>` : "");

      listEl.appendChild(item);
    });
  }

  async function loadServiceInfo() {
    // Best-effort: this endpoint exists in your TS publicApi.ts
    const data = await apiFetch(state.apiBase, `/api/public/booking/service/${encodeURIComponent(state.serviceId)}/`);
    // Some backends return {service:{...}}, others return the service object directly.
    state.service = (data && (data.service || data.data || data)) || null;
    renderServicePills();
  }

  async function loadRatings() {
    // Recent-ratings card removed; keep stats only.
    const data = await apiFetch(
      state.apiBase,
      `/api/public/booking/get_service_ratings/?service_id=${encodeURIComponent(state.serviceId)}`
    );
    const ratings = (data && (data.ratings || data.data || data.results)) || [];
    const arr = Array.isArray(ratings) ? ratings : [];
    updateStats(arr);
  }

  async function submitRating(payload) {
    return apiFetch(state.apiBase, "/api/public/booking/submit_rating/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  function wireUi() {
    wireStars();

    const langBtn = byId("langBtn");
    if (langBtn) {
      langBtn.addEventListener("click", () => {
        state.lang = state.lang === "en" ? "ar" : "en";
        applyLanguage();
      });
    }

    const resetBtn = byId("resetBtn");
    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        setRating(NaN);
        byId("nameInput").value = "";
        byId("phoneInput").value = "";
        byId("commentInput").value = "";
        const alertEl = byId("resultAlert");
        if (alertEl) alertEl.hidden = true;
      });
    }

    const form = byId("ratingForm");
    if (form) {
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const alertEl = byId("resultAlert");
        if (alertEl) alertEl.hidden = true;

        const rating = Number(byId("ratingValue").value);
        if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
          setAlert(alertEl, "warn", t("pickRating"));
          return;
        }

        const payload = {
          service_id: state.serviceId,
          // Backend validation expects "rate" in some deployments; keep "rating" too.
          rate: rating,
          rating,
          name: (byId("nameInput").value || "").trim(),
          phone: (byId("phoneInput").value || "").trim(),
          comment: (byId("commentInput").value || "").trim(),
          device_id: getOrCreateDeviceId(),
        };

        try {
          await submitRating(payload);
          setAlert(alertEl, "ok", t("submitted"));
          // reset form but keep rating at 5? keep selection for fast repeats: clear comment only
          byId("commentInput").value = "";
          await loadRatings();
        } catch (err) {
          setAlert(alertEl, "err", err.message || t("failedToSubmit"));
        }
      });
    }
  }

  async function boot() {
    state.serviceId = getServiceIdFromUrl();
    state.apiBase = getApiBase();

    // Init language from browser
    const navLang = (navigator.language || "en").toLowerCase();
    state.lang = navLang.startsWith("ar") ? "ar" : "en";

    initThemeToggle();
    applyLanguage();

    const configCard = byId("configCard");
    const mainCard = byId("mainCard");
    const errorCard = byId("errorCard");

    if (!state.serviceId) {
      show(errorCard, true);
      setText("errorText", t("missingServiceId"));
      return;
    }

    if (!state.apiBase) {
      show(configCard, true);
      const apiBaseInput = byId("apiBase");
      if (apiBaseInput) apiBaseInput.value = localStorage.getItem(LS_API_BASE) || "";
      const cfgForm = byId("configForm");
      if (cfgForm) {
        cfgForm.addEventListener("submit", (e) => {
          e.preventDefault();
          const v = (apiBaseInput.value || "").trim();
          if (!v) return;
          setApiBase(v);
          window.location.reload();
        });
      }
      return;
    }

    show(mainCard, true);
    wireUi();

    try {
      await loadServiceInfo();
    } catch {
      // Non-fatal; UI still works without service name.
    }

    try {
      await loadRatings();
    } catch (e) {
      setAlert(byId("resultAlert"), "err", e.message || t("failedToLoad"));
    }
  }

  boot();
})();

