(function () {
  "use strict";

  const LS_API_BASE = "public_booking_api_base";
  const LS_DEVICE_ID = "device_id";
  const LS_LAST_REF = "booking_reference";
  const LS_THEME = "public_booking_theme";

  const byId = (id) => document.getElementById(id);

  function getPreferredTheme() {
    const stored = (localStorage.getItem(LS_THEME) || "").trim();
    if (stored === "dark" || stored === "light") return stored;
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) return "dark";
    return "light";
  }

  function applyTheme(theme) {
    if (theme === "dark" || theme === "light") {
      document.documentElement.setAttribute("data-theme", theme);
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
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

  function safeJsonParse(str) {
    try {
      if (typeof str !== "string") return null;
      const looksLikeObj = str.includes("{") && str.includes("}");
      if (!looksLikeObj) return null;
      let s = str;
      if (s.includes("'")) s = s.replace(/'/g, '"');
      return JSON.parse(s);
    } catch {
      return null;
    }
  }

  function escapeHtml(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function getCompanyIdFromUrl() {
    const url = new URL(window.location.href);
    const qp = (url.searchParams.get("companyId") || "").trim();
    if (qp) return qp;
    const parts = window.location.pathname.split("/").filter(Boolean);
    const bookingIdx = parts.indexOf("booking");
    if (bookingIdx >= 0 && parts.length > bookingIdx + 1) {
      const seg = parts[bookingIdx + 1];
      if (seg && seg !== "index.html") {
        const decoded = decodeURIComponent(seg);
        // Support /booking/<name>-<id> (or /booking/<name>--<id>) while keeping old /booking/<id>.
        // We always treat the *trailing number* as the canonical company id.
        const m = decoded.match(/(?:^|[-]{1,2})(\d+)$/);
        if (m && m[1]) return m[1];
        return decoded.trim();
      }
    }
    return "";
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

  function formatTimeString(timeStr) {
    try {
      const [hh, mm] = (timeStr || "").split(":");
      const h = parseInt(hh, 10);
      if (!Number.isFinite(h)) return timeStr;
      const ampm = h >= 12 ? "PM" : "AM";
      const h12 = h % 12 || 12;
      return `${h12}:${mm} ${ampm}`;
    } catch {
      return timeStr;
    }
  }

  function dateToYmd(d) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  function dayOfWeek1to7(d) {
    return d.getDay() + 1;
  }

  function setText(id, txt) {
    const el = byId(id);
    if (el) el.textContent = txt;
  }

  function show(el, yes) {
    if (el) el.hidden = !yes;
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

  const i18n = {
    en: {
      booking: "Booking",
      publicReservationPage: "Public reservation page",
      bookYourTurn: "Book your turn",
      selectBranchService: "Select branch and service, then enter your details.",
      newBooking: "New booking",
      myBookings: "My bookings",
      preBooking: "Pre-booking",
      branch: "Branch",
      service: "Service",
      name: "Name",
      phone: "Phone",
      chooseBranchFirst: "Choose a branch to see its services.",
      chooseServiceForSchedule: "Choose a service to load today’s available slots.",
      serviceSchedule: "Service schedule",
      refresh: "Refresh",
      bookNow: "Book now",
      reset: "Reset",
      turnAdded: "Turn added successfully",
      failedToLoadBranches: "Failed to load branches",
      failedToLoadServices: "Failed to load services",
      failedToLoadSchedule: "Failed to load service schedule",
      fillAllRequired: "Please fill all required fields",
      bookingReference: "Booking reference",
      search: "Search",
      noBookings: "No bookings to display. Enter a reference or create a new booking.",
      configurationRequired: "Configuration required",
      needsApiBase: "This page needs an API base URL to call your public booking endpoints.",
      apiBaseUrl: "API Base URL",
      saveAndReload: "Save & Reload",
      back: "Back",
      error: "Error",
      missingCompanyId: "Missing company id in URL. Use /booking/<companyName>-<companyId> or /booking/<companyId>.",
      prebookingInfo:
        "Pre-booking requires selecting a service that supports pre-booking, then choosing a date and slot.",
      prebookingService: "Pre-booking service",
      date: "Date",
      selectedSlot: "Selected slot",
      pickSlotRight: "Pick a slot from the list on the right.",
      availableSlots: "Available slots",
      price: "Price",
      deviceHint: "This uses a device id stored in your browser to retrieve your bookings.",
      bookingSuccess: "Your appointment has been booked successfully",
      bookingFailed: "Failed to book appointment",
      selectASlot: "Please select a slot",
      publicBookingPage: "Public booking page",
      unlimited: "Unlimited",
      remaining: "Remaining",
      selectBranch: "Select a branch",
      selectService: "Select a service",
      selectPreService: "Select a service",

      // New creative UI strings
      trustFast: "Fast",
      trustSecure: "Secure",
      trustMobile: "Mobile-ready",
      miniTodayTitle: "Today",
      miniTodayValue: "Live slots",
      miniStatusTitle: "Status",
      miniStatusValue: "Track bookings",
      stepNewTitle: "New booking",
      stepNewDesc: "Pick a branch and service, then confirm your details.",
      stepTrackTitle: "Track my bookings",
      stepTrackDesc: "Enter your reference to view status and queue position.",
      stepPreTitle: "Pre-booking",
      tipsTitle: "Tips",
      tip1: "Use your real phone number to receive updates.",
      tip2: "Switch to “My bookings” to track your status.",
      tip3: "For pre-booking, select a slot then confirm.",
    },
    ar: {
      booking: "الحجز",
      publicReservationPage: "صفحة الحجز العامة",
      bookYourTurn: "احجز دورك",
      selectBranchService: "اختر الفرع والخدمة ثم أدخل بياناتك.",
      newBooking: "حجز جديد",
      myBookings: "حجوزاتي",
      preBooking: "حجز مسبق",
      branch: "الفرع",
      service: "الخدمة",
      name: "الاسم",
      phone: "الهاتف",
      chooseBranchFirst: "اختر الفرع لعرض الخدمات.",
      chooseServiceForSchedule: "اختر خدمة لعرض المواعيد المتاحة لليوم.",
      serviceSchedule: "جدول الخدمة",
      refresh: "تحديث",
      bookNow: "احجز الآن",
      reset: "إعادة ضبط",
      turnAdded: "تم إضافة الدور بنجاح",
      failedToLoadBranches: "فشل تحميل الفروع",
      failedToLoadServices: "فشل تحميل الخدمات",
      failedToLoadSchedule: "فشل تحميل جدول الخدمة",
      fillAllRequired: "يرجى ملء جميع الحقول المطلوبة",
      bookingReference: "رقم المرجع",
      search: "بحث",
      noBookings: "لا توجد حجوزات لعرضها. أدخل رقم مرجع أو قم بإنشاء حجز جديد.",
      configurationRequired: "إعدادات مطلوبة",
      needsApiBase: "تحتاج هذه الصفحة إلى عنوان API لاستدعاء واجهات الحجز العامة.",
      apiBaseUrl: "عنوان API",
      saveAndReload: "حفظ وإعادة تحميل",
      back: "رجوع",
      error: "خطأ",
      missingCompanyId: "لم يتم العثور على رقم الشركة في الرابط. استخدم /booking/<companyName>-<companyId> أو /booking/<companyId>.",
      prebookingInfo: "الحجز المسبق يتطلب اختيار خدمة تدعم الحجز المسبق ثم اختيار التاريخ والموعد.",
      prebookingService: "خدمة الحجز المسبق",
      date: "التاريخ",
      selectedSlot: "الموعد المختار",
      pickSlotRight: "اختر موعداً من القائمة على اليمين.",
      availableSlots: "المواعيد المتاحة",
      price: "السعر",
      deviceHint: "يتم استخدام معرف جهاز مخزن في المتصفح لاسترجاع حجوزاتك.",
      bookingSuccess: "تم حجز موعدك بنجاح",
      bookingFailed: "فشل في حجز الموعد",
      selectASlot: "يرجى اختيار موعد",
      publicBookingPage: "صفحة الحجز العامة",
      unlimited: "غير محدود",
      remaining: "متبقي",
      selectBranch: "اختر فرعاً",
      selectService: "اختر خدمة",
      selectPreService: "اختر خدمة",

      // New creative UI strings (Arabic)
      trustFast: "سريع",
      trustSecure: "آمن",
      trustMobile: "مناسب للجوال",
      miniTodayTitle: "اليوم",
      miniTodayValue: "مواعيد متاحة",
      miniStatusTitle: "الحالة",
      miniStatusValue: "تتبع حجوزاتك",
      stepNewTitle: "حجز جديد",
      stepNewDesc: "اختر الفرع والخدمة ثم أكد بياناتك.",
      stepTrackTitle: "تتبع حجوزاتي",
      stepTrackDesc: "أدخل رقم المرجع لعرض الحالة وموقعك في الطابور.",
      stepPreTitle: "حجز مسبق",
      tipsTitle: "نصائح",
      tip1: "استخدم رقم هاتفك الحقيقي لاستلام التحديثات.",
      tip2: "انتقل إلى «حجوزاتي» لتتبع الحالة.",
      tip3: "للحجز المسبق، اختر موعداً ثم أكد الحجز.",
    },
  };

  const state = {
    lang: "en",
    apiBase: "",
    companyId: "",
    branches: [],
    services: [],
    preServices: [],
    schedule: [],
    preSchedule: [],
    preSelectedSlot: null,
    preSchedulePrice: null,
  };

  function t(key) {
    const dict = i18n[state.lang] || i18n.en;
    return dict[key] || i18n.en[key] || key;
  }

  function applyLanguage() {
    document.documentElement.lang = state.lang;
    document.documentElement.dir = state.lang === "ar" ? "rtl" : "ltr";

    setText("brandTitle", t("booking"));
    setText("brandSubtitle", t("publicReservationPage"));
    setText("pageTitle", t("bookYourTurn"));
    setText("pageSubtitle", t("selectBranchService"));
    setText("tabNew", t("newBooking"));
    setText("tabMy", t("myBookings"));
    setText("tabPre", t("preBooking"));
    setText("branchLabel", t("branch"));
    setText("serviceLabel", t("service"));
    setText("nameLabel", t("name"));
    setText("phoneLabel", t("phone"));
    setText("branchHelp", t("chooseBranchFirst"));
    setText("serviceHelp", t("chooseBranchFirst"));
    setText("scheduleTitle", t("serviceSchedule"));
    setText("scheduleHint", t("chooseServiceForSchedule"));
    setText("bookBtn", t("bookNow"));
    setText("resetBtn", t("reset"));
    setText("refLabel", t("bookingReference"));
    setText("refSearchBtn", t("search"));
    setText("refHelp", t("deviceHint"));
    setText("preBranchLabel", t("branch"));
    setText("preServiceLabel", t("prebookingService"));
    // Keep pre-booking UI concise (no long instruction text under service picker).
    setText("preInfo", "");
    setText("preServiceHelp", "");
    setText("preDateLabel", t("date"));
    setText("preSlotLabel", t("selectedSlot"));
    setText("preSlotHelp", t("pickSlotRight"));
    setText("preSlotsTitle", t("availableSlots"));
    setText("priceLabel", t("price"));
    setText("preNameLabel", t("name"));
    setText("prePhoneLabel", t("phone"));
    setText("preBookBtn", t("bookNow"));
    setText("preResetBtn", t("reset"));
    setText("footerText", t("publicBookingPage"));

    setText("configTitle", t("configurationRequired"));
    setText("configText", t("needsApiBase"));
    setText("saveApiBtn", t("saveAndReload"));
    setText("backHome", t("back"));
    setText("errorTitle", t("error"));
    setText("goHomeBtn", t("back"));

    // Language toggle button label (AR/EN)
    setText("langBtnLabel", state.lang === "ar" ? "EN" : "AR");

    // Creative UI elements
    setText("trustFast", t("trustFast"));
    setText("trustSecure", t("trustSecure"));
    setText("trustMobile", t("trustMobile"));
    setText("miniTodayTitle", t("miniTodayTitle"));
    setText("miniTodayValue", t("miniTodayValue"));
    setText("miniStatusTitle", t("miniStatusTitle"));
    setText("miniStatusValue", t("miniStatusValue"));
    setText("stepNewTitle", t("stepNewTitle"));
    setText("stepNewDesc", t("stepNewDesc"));
    setText("stepTrackTitle", t("stepTrackTitle"));
    setText("stepTrackDesc", t("stepTrackDesc"));
    setText("stepPreTitle", t("stepPreTitle"));
    setText("tipsTitle", t("tipsTitle"));
    setText("tip1", t("tip1"));
    setText("tip2", t("tip2"));
    setText("tip3", t("tip3"));

    // Buttons that were still hardcoded in HTML
    setText("refreshScheduleBtn", t("refresh"));
    setText("preRefreshBtn", t("refresh"));
  }

  function switchTab(tabKey) {
    const tabs = [
      { key: "new", tab: byId("tabNew"), panel: byId("panelNew") },
      { key: "my", tab: byId("tabMy"), panel: byId("panelMy") },
      { key: "pre", tab: byId("tabPre"), panel: byId("panelPre") },
    ];
    tabs.forEach((t0) => {
      const active = t0.key === tabKey;
      if (t0.tab) {
        t0.tab.classList.toggle("tabActive", active);
        t0.tab.setAttribute("aria-selected", active ? "true" : "false");
      }
      show(t0.panel, active);
    });

    // Sidebar visibility rules:
    // - New booking: show "Service schedule" (slotList)
    // - Pre-booking: show "Available slots" (preSlotList)
    // - My bookings: hide both
    const scheduleCard = byId("slotList")?.closest?.(".sideCard");
    const preSlotsCard = byId("preSlotList")?.closest?.(".sideCard");
    show(scheduleCard, tabKey === "new");
    show(preSlotsCard, tabKey === "pre");
  }

  function fillSelect(selectEl, items, placeholderText, labelGetter) {
    if (!selectEl) return;
    selectEl.innerHTML = "";
    const opt0 = document.createElement("option");
    opt0.value = "";
    opt0.textContent = placeholderText;
    selectEl.appendChild(opt0);
    items.forEach((item) => {
      const opt = document.createElement("option");
      opt.value = item.id;
      opt.textContent = labelGetter(item);
      selectEl.appendChild(opt);
    });
  }

  function getLocalizedName(name, name_ar) {
    if (state.lang === "ar" && name_ar) return name_ar;
    const parsed = safeJsonParse(name);
    if (parsed && typeof parsed === "object") {
      return parsed[state.lang] || parsed.en || name;
    }
    return name;
  }

  function serviceLabel(service) {
    const name = getLocalizedName(service.name, service.name_ar);
    const rem = service.remaining_turns;
    if (rem === undefined || rem === null) return `${name} (${t("unlimited")})`;
    return `${name} (${t("remaining")}: ${rem})`;
  }

  function renderSchedule(listEl, slots, onPick, selectedPredicate) {
    if (!listEl) return;
    listEl.innerHTML = "";
    if (!slots || slots.length === 0) {
      const empty = document.createElement("div");
      empty.className = "muted small";
      empty.textContent = state.lang === "ar" ? "لا توجد مواعيد متاحة" : "No available slots";
      listEl.appendChild(empty);
      return;
    }
    slots.forEach((slot) => {
      const row = document.createElement("div");
      row.className = "slotItem";

      const meta = document.createElement("div");
      meta.className = "slotMeta";
      const time = document.createElement("div");
      time.className = "slotTime";
      time.textContent = `${formatTimeString(slot.start)} — ${formatTimeString(slot.end)}`;
      const sub = document.createElement("div");
      sub.className = "slotSub";
      sub.textContent = state.lang === "ar" ? "موعد متاح" : "Available slot";
      meta.appendChild(time);
      meta.appendChild(sub);

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn btnGhost btnTiny slotBtn";
      const selected = selectedPredicate ? selectedPredicate(slot) : false;
      btn.textContent = selected ? (state.lang === "ar" ? "تم الاختيار" : "Selected") : (state.lang === "ar" ? "اختر" : "Pick");
      btn.addEventListener("click", () => onPick(slot));

      row.appendChild(meta);
      row.appendChild(btn);
      listEl.appendChild(row);
    });
  }

  async function loadBranches() {
    const branchSelect = byId("branchSelect");
    const preBranchSelect = byId("preBranchSelect");
    fillSelect(branchSelect, [], t("selectBranch"), (b) => b.name);
    fillSelect(preBranchSelect, [], t("selectBranch"), (b) => b.name);
    if (branchSelect) branchSelect.disabled = true;
    if (preBranchSelect) preBranchSelect.disabled = true;

    const data = await apiFetch(
      state.apiBase,
      `/api/public/booking/get_branches_by_company_id/?company_id=${encodeURIComponent(state.companyId)}`
    );
    state.branches = (data && data.branches) || [];

    fillSelect(branchSelect, state.branches, t("selectBranch"), (b) => getLocalizedName(b.name, b.name_ar));
    fillSelect(preBranchSelect, state.branches, t("selectBranch"), (b) => getLocalizedName(b.name, b.name_ar));
    if (branchSelect) branchSelect.disabled = false;
    if (preBranchSelect) preBranchSelect.disabled = false;
  }

  async function loadServices(branchId) {
    const serviceSelect = byId("serviceSelect");
    fillSelect(serviceSelect, [], t("selectService"), (s) => s.name);
    if (serviceSelect) serviceSelect.disabled = true;

    const data = await apiFetch(
      state.apiBase,
      `/api/public/booking/get_services_by_branch_id/?branch_id=${encodeURIComponent(branchId)}`
    );
    const services = (data && data.services) || [];
    state.services = services;
    state.preServices = services.filter((s) => s && s.prebooking_status === 1);

    fillSelect(serviceSelect, services, t("selectService"), serviceLabel);
    if (serviceSelect) serviceSelect.disabled = false;

    const preServiceSelect = byId("preServiceSelect");
    fillSelect(preServiceSelect, state.preServices, t("selectPreService"), (s) => getLocalizedName(s.name, s.name_ar));
    if (preServiceSelect) preServiceSelect.disabled = false;
  }

  async function loadScheduleForService(serviceId) {
    const slotList = byId("slotList");
    if (slotList) slotList.innerHTML = "";
    const today = new Date();
    const dateStr = dateToYmd(today);
    const day = dayOfWeek1to7(today);

    const data = await apiFetch(
      state.apiBase,
      `/api/public/booking/get_service_schedule/?service_id=${encodeURIComponent(serviceId)}&date=${encodeURIComponent(dateStr)}&day=${encodeURIComponent(day)}`
    );

    let slots = [];
    if (data && data.appointments && data.appointments.unbookedSlot) slots = data.appointments.unbookedSlot;
    else if (data && data.unbookedSlot) slots = data.unbookedSlot;
    else if (data && data.appointments && data.appointments.schedule && data.appointments.schedule.slots) slots = data.appointments.schedule.slots;

    state.schedule = slots || [];
    renderSchedule(slotList, state.schedule, () => {}, null);
  }

  async function loadPreSchedule(serviceId, dateStr) {
    const preSlotList = byId("preSlotList");
    if (preSlotList) preSlotList.innerHTML = "";
    const d = new Date(dateStr + "T00:00:00");
    const day = dayOfWeek1to7(d);

    const data = await apiFetch(
      state.apiBase,
      `/api/public/booking/get_service_schedule/?service_id=${encodeURIComponent(serviceId)}&date=${encodeURIComponent(dateStr)}&day=${encodeURIComponent(day)}`
    );

    let slots = [];
    let price = null;
    if (data && data.appointments && data.appointments.unbookedSlot) {
      slots = data.appointments.unbookedSlot;
      price = data.appointments.schedule && data.appointments.schedule.price;
    } else if (data && data.unbookedSlot) {
      slots = data.unbookedSlot;
      price = data.schedule && data.schedule.price;
    } else if (data && data.appointments && data.appointments.schedule && data.appointments.schedule.slots) {
      slots = data.appointments.schedule.slots;
      price = data.appointments.schedule.price;
    }
    state.preSchedule = slots || [];
    state.preSchedulePrice = price;

    const pricePill = byId("pricePill");
    if (pricePill) pricePill.textContent = price !== null && price !== undefined ? String(price) : "—";

    renderSchedule(
      preSlotList,
      state.preSchedule,
      (slot) => {
        state.preSelectedSlot = slot;
        const pill = byId("preSlotPill");
        if (pill) pill.textContent = `${formatTimeString(slot.start)} — ${formatTimeString(slot.end)}`;
        // re-render to update selection label
        renderSchedule(preSlotList, state.preSchedule, (s2) => {
          state.preSelectedSlot = s2;
          const pill2 = byId("preSlotPill");
          if (pill2) pill2.textContent = `${formatTimeString(s2.start)} — ${formatTimeString(s2.end)}`;
        }, (s2) => state.preSelectedSlot && s2.start === state.preSelectedSlot.start && s2.end === state.preSelectedSlot.end);
      },
      (s) => state.preSelectedSlot && s.start === state.preSelectedSlot.start && s.end === state.preSelectedSlot.end
    );
  }

  function statusBadge(status) {
    if (status === 7) return { cls: "badge badgeOk", txt: state.lang === "ar" ? "تم الانتهاء" : "Done" };
    if (status === 2) return { cls: "badge badgeInfo", txt: state.lang === "ar" ? "تم النداء" : "Called" };
    return { cls: "badge badgeWarn", txt: state.lang === "ar" ? "قيد الانتظار" : "Pending" };
  }

  function renderBookings(listEl, bookings) {
    if (!listEl) return;
    listEl.innerHTML = "";
    if (!bookings || bookings.length === 0) {
      const p = document.createElement("div");
      p.className = "muted";
      p.textContent = t("noBookings");
      listEl.appendChild(p);
      return;
    }
    bookings.forEach((b) => {
      const item = document.createElement("div");
      item.className = "listItem";

      const top = document.createElement("div");
      top.className = "listTop";
      const left = document.createElement("div");
      left.style.fontWeight = "900";
      const turn = b.service_prefix ? `${b.service_prefix}-${b.turn_number}` : String(b.turn_number ?? "");
      left.textContent = (state.lang === "ar" ? "رقم الدور: " : "Turn: ") + turn;
      const badge = statusBadge(b.status);
      const st = document.createElement("div");
      st.className = badge.cls;
      st.textContent = badge.txt;
      top.appendChild(left);
      top.appendChild(st);

      const body = document.createElement("div");
      body.className = "muted small";
      const serviceName = getLocalizedName(b.service, null);
      const branchName = getLocalizedName(b.branch, null);
      const ahead = b.people_ahead;
      body.innerHTML =
        `${state.lang === "ar" ? "الخدمة" : "Service"}: <strong>${escapeHtml(serviceName)}</strong><br/>` +
        `${state.lang === "ar" ? "الفرع" : "Branch"}: <strong>${escapeHtml(branchName)}</strong><br/>` +
        `${state.lang === "ar" ? "الاسم" : "Name"}: <strong>${escapeHtml(b.name)}</strong><br/>` +
        `${state.lang === "ar" ? "الهاتف" : "Phone"}: <strong>${escapeHtml(b.phone)}</strong><br/>` +
        `${state.lang === "ar" ? "عدد الأشخاص أمامك" : "People ahead"}: <strong>${escapeHtml(ahead)}</strong>`;

      item.appendChild(top);
      item.appendChild(body);
      listEl.appendChild(item);
    });
  }

  async function submitTurn(form) {
    const branchId = form.branch_id;
    const serviceId = form.service_id;
    const name = form.name;
    const phone = form.phone;
    if (!branchId || !serviceId || !name || !phone) throw new Error(t("fillAllRequired"));

    const deviceId = getOrCreateDeviceId();
    const body = { branch_id: branchId, service_id: serviceId, name, phone, device_id: deviceId };
    return apiFetch(state.apiBase, "/api/public/booking/add_turn_web/", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  async function submitPreBooking(payload) {
    const deviceId = getOrCreateDeviceId();
    void deviceId; // API does not require it for add_booking (kept for parity & future use).
    return apiFetch(state.apiBase, "/api/public/booking/add_booking/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async function fetchBookingsByReference(reference) {
    const deviceId = getOrCreateDeviceId();
    const data = await apiFetch(
      state.apiBase,
      `/api/public/booking/get_bookings_by_reference/?reference=${encodeURIComponent(reference)}&device_id=${encodeURIComponent(deviceId)}`
    );
    return (data && data.reservations) || [];
  }

  function wireUi() {
    const langBtn = byId("langBtn");
    if (langBtn) {
      langBtn.addEventListener("click", () => {
        state.lang = state.lang === "en" ? "ar" : "en";
        applyLanguage();
        // Rerender selects/slots for updated labels
        const branchSelect = byId("branchSelect");
        const preBranchSelect = byId("preBranchSelect");
        fillSelect(branchSelect, state.branches, t("selectBranch"), (b) => getLocalizedName(b.name, b.name_ar));
        fillSelect(preBranchSelect, state.branches, t("selectBranch"), (b) => getLocalizedName(b.name, b.name_ar));
        const serviceSelect = byId("serviceSelect");
        fillSelect(serviceSelect, state.services, t("selectService"), serviceLabel);
        const preServiceSelect = byId("preServiceSelect");
        fillSelect(preServiceSelect, state.preServices, t("selectPreService"), (s) => getLocalizedName(s.name, s.name_ar));
        renderSchedule(byId("slotList"), state.schedule, () => {}, null);
        renderSchedule(
          byId("preSlotList"),
          state.preSchedule,
          (slot) => {
            state.preSelectedSlot = slot;
            const pill = byId("preSlotPill");
            if (pill) pill.textContent = `${formatTimeString(slot.start)} — ${formatTimeString(slot.end)}`;
          },
          (s) => state.preSelectedSlot && s.start === state.preSelectedSlot.start && s.end === state.preSelectedSlot.end
        );
      });
    }

    // Tabs
    const tabBtns = [byId("tabNew"), byId("tabMy"), byId("tabPre")].filter(Boolean);
    tabBtns.forEach((btn) => {
      btn.addEventListener("click", () => switchTab(btn.dataset.tab));
    });

    // Branch changes
    const branchSelect = byId("branchSelect");
    const preBranchSelect = byId("preBranchSelect");
    const onBranchChange = async (branchId) => {
      if (!branchId) return;
      try {
        await loadServices(branchId);
      } catch (e) {
        console.error(e);
        setAlert(byId("turnResult"), "err", t("failedToLoadServices"));
      }
    };
    if (branchSelect) {
      branchSelect.addEventListener("change", (e) => {
        const v = e.target.value;
        const serviceSelect = byId("serviceSelect");
        if (serviceSelect) serviceSelect.value = "";
        onBranchChange(v);
      });
    }
    if (preBranchSelect) {
      preBranchSelect.addEventListener("change", (e) => {
        const v = e.target.value;
        const preServiceSelect = byId("preServiceSelect");
        if (preServiceSelect) preServiceSelect.value = "";
        state.preSelectedSlot = null;
        setText("preSlotPill", "—");
        onBranchChange(v);
      });
    }

    // Service schedule
    const serviceSelect = byId("serviceSelect");
    if (serviceSelect) {
      serviceSelect.addEventListener("change", async (e) => {
        const v = e.target.value;
        if (!v) return;
        try {
          await loadScheduleForService(v);
        } catch (err) {
          console.error(err);
          setAlert(byId("turnResult"), "err", t("failedToLoadSchedule"));
        }
      });
    }
    const refreshScheduleBtn = byId("refreshScheduleBtn");
    if (refreshScheduleBtn) {
      refreshScheduleBtn.addEventListener("click", async () => {
        const v = (byId("serviceSelect") || {}).value;
        if (!v) return;
        try {
          await loadScheduleForService(v);
        } catch (err) {
          console.error(err);
          setAlert(byId("turnResult"), "err", t("failedToLoadSchedule"));
        }
      });
    }

    // Turn submit
    const turnForm = byId("turnForm");
    if (turnForm) {
      turnForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const resultEl = byId("turnResult");
        resultEl.hidden = true;
        const payload = {
          branch_id: byId("branchSelect").value,
          service_id: byId("serviceSelect").value,
          name: byId("nameInput").value.trim(),
          phone: byId("phoneInput").value.trim(),
        };
        try {
          const res = await submitTurn(payload);
          const ref = res && res.turnReservation && res.turnReservation.reference;
          if (ref) {
            localStorage.setItem(LS_LAST_REF, ref);
            byId("refInput").value = ref;
          }
          setAlert(resultEl, "ok", t("turnAdded"));
          byId("nameInput").value = "";
          byId("phoneInput").value = "";
          // switch to My Bookings so user can lookup
          switchTab("my");
        } catch (err) {
          console.error(err);
          setAlert(resultEl, "err", err.message || "Failed");
        }
      });
    }

    const resetBtn = byId("resetBtn");
    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        byId("nameInput").value = "";
        byId("phoneInput").value = "";
        byId("serviceSelect").value = "";
        byId("slotList").innerHTML = "";
        byId("turnResult").hidden = true;
      });
    }

    // Reference lookup
    const refForm = byId("refForm");
    if (refForm) {
      refForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const listEl = byId("bookingList");
        listEl.innerHTML = "";
        const reference = byId("refInput").value.trim();
        try {
          const bookings = await fetchBookingsByReference(reference);
          renderBookings(listEl, bookings);
        } catch (err) {
          console.error(err);
          const el = document.createElement("div");
          el.className = "alert alertErr";
          el.textContent = err.message || "Failed";
          listEl.appendChild(el);
        }
      });
    }

    // Pre-booking
    const preDateInput = byId("preDateInput");
    if (preDateInput) {
      preDateInput.min = dateToYmd(new Date());
      preDateInput.value = dateToYmd(new Date());
      preDateInput.addEventListener("change", async () => {
        state.preSelectedSlot = null;
        setText("preSlotPill", "—");
        const serviceId = byId("preServiceSelect").value;
        if (!serviceId) return;
        try {
          await loadPreSchedule(serviceId, preDateInput.value);
        } catch (err) {
          console.error(err);
          setAlert(byId("preResult"), "err", t("failedToLoadSchedule"));
        }
      });
    }

    const preServiceSelect = byId("preServiceSelect");
    if (preServiceSelect) {
      preServiceSelect.addEventListener("change", async () => {
        state.preSelectedSlot = null;
        setText("preSlotPill", "—");
        const serviceId = preServiceSelect.value;
        if (!serviceId) return;
        try {
          await loadPreSchedule(serviceId, byId("preDateInput").value);
        } catch (err) {
          console.error(err);
          setAlert(byId("preResult"), "err", t("failedToLoadSchedule"));
        }
      });
    }

    const preRefreshBtn = byId("preRefreshBtn");
    if (preRefreshBtn) {
      preRefreshBtn.addEventListener("click", async () => {
        const serviceId = byId("preServiceSelect").value;
        if (!serviceId) return;
        try {
          await loadPreSchedule(serviceId, byId("preDateInput").value);
        } catch (err) {
          console.error(err);
          setAlert(byId("preResult"), "err", t("failedToLoadSchedule"));
        }
      });
    }

    const preForm = byId("preForm");
    if (preForm) {
      preForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const resultEl = byId("preResult");
        resultEl.hidden = true;
        if (!state.preSelectedSlot) {
          setAlert(resultEl, "warn", t("selectASlot"));
          return;
        }
        const payload = {
          service_id: byId("preServiceSelect").value,
          branch_id: byId("preBranchSelect").value,
          company_id: state.companyId,
          name: byId("preNameInput").value.trim(),
          phone: byId("prePhoneInput").value.trim(),
          start_time: state.preSelectedSlot.start,
          end_time: state.preSelectedSlot.end,
          date: byId("preDateInput").value,
          price: String(state.preSchedulePrice ?? "0"),
          booking_type: "prebooking",
        };
        try {
          await submitPreBooking(payload);
          setAlert(resultEl, "ok", t("bookingSuccess"));
          byId("preNameInput").value = "";
          byId("prePhoneInput").value = "";
          state.preSelectedSlot = null;
          setText("preSlotPill", "—");
          switchTab("my");
        } catch (err) {
          console.error(err);
          setAlert(resultEl, "err", err.message || t("bookingFailed"));
        }
      });
    }

    const preResetBtn = byId("preResetBtn");
    if (preResetBtn) {
      preResetBtn.addEventListener("click", () => {
        byId("preNameInput").value = "";
        byId("prePhoneInput").value = "";
        state.preSelectedSlot = null;
        setText("preSlotPill", "—");
        byId("preResult").hidden = true;
      });
    }
  }

  async function boot() {
    // config and companyId checks
    state.companyId = getCompanyIdFromUrl();
    state.apiBase = getApiBase();
    const companyPill = byId("companyPill");
    // Hide companyId pill (requested). Keep element for layout/JS safety.
    if (companyPill) {
      companyPill.textContent = "";
      companyPill.hidden = true;
    }

    // Init language from browser (light heuristic)
    const navLang = (navigator.language || "en").toLowerCase();
    state.lang = navLang.startsWith("ar") ? "ar" : "en";

    // Theme toggle (light/dark)
    initThemeToggle();

    applyLanguage();

    const configCard = byId("configCard");
    const mainCard = byId("mainCard");
    const errorCard = byId("errorCard");

    if (!state.companyId) {
      show(errorCard, true);
      setText("errorText", t("missingCompanyId"));
      return;
    }

    if (!state.apiBase) {
      show(configCard, true);
      const apiBaseInput = byId("apiBase");
      if (apiBaseInput) apiBaseInput.value = localStorage.getItem(LS_API_BASE) || "";
      const form = byId("configForm");
      if (form) {
        form.addEventListener("submit", (e) => {
          e.preventDefault();
          const v = (apiBaseInput.value || "").trim();
          if (!v) return;
          setApiBase(v);
          window.location.reload();
        });
      }
      return;
    }

    // Brand the page with the company name (from public API)
    try {
      const data = await apiFetch(state.apiBase, "/api/public/booking/get_active_companies/");
      const companies = (data && data.companies) || [];
      const company =
        companies.find((c) => String(c.id) === String(state.companyId)) ||
        companies.find((c) => String(c.company_id) === String(state.companyId));
      if (company && company.name) {
        const name = getLocalizedName(company.name, company.name_ar);
        const titleEl = byId("brandTitle");
        if (titleEl) titleEl.textContent = name;
        document.title = name;
      }
    } catch (e) {
      // Non-fatal: if API not reachable or the company isn't returned, keep default UI text.
      console.warn("Failed to fetch company name:", e);
    }

    // Pre-fill last reference
    const lastRef = localStorage.getItem(LS_LAST_REF);
    if (lastRef && byId("refInput")) byId("refInput").value = lastRef;
    getOrCreateDeviceId();

    show(mainCard, true);
    wireUi();

    // Load branches
    try {
      await loadBranches();
    } catch (err) {
      console.error(err);
      setAlert(byId("turnResult"), "err", t("failedToLoadBranches"));
    }

    // initialize selects placeholders
    fillSelect(byId("serviceSelect"), [], t("selectService"), (s) => s.name);
    if (byId("serviceSelect")) byId("serviceSelect").disabled = true;
    fillSelect(byId("preServiceSelect"), [], t("selectPreService"), (s) => s.name);
    if (byId("preServiceSelect")) byId("preServiceSelect").disabled = true;

    // default tab
    switchTab("new");
  }

  boot();
})();
