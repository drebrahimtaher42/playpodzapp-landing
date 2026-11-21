(function () {
  const STORAGE_KEY = "playpodz_b2b_lang";
  const html = document.documentElement;

  /* ── 1. Bilingual Engine (AR / EN) ─────────────────────────────────── */
  function detectInitialLang() {
    const params = new URLSearchParams(window.location.search);
    const q = params.get("lang");
    if (q === "en" || q === "ar") return q;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "en" || saved === "ar") return saved;
    } catch (_) {}
    return html.getAttribute("lang") === "en" ? "en" : "ar";
  }

  function applyLang(lang) {
    const isEn = lang === "en";
    html.setAttribute("lang", isEn ? "en" : "ar");
    html.setAttribute("dir", isEn ? "ltr" : "rtl");

    const titleAr = html.getAttribute("data-title-ar");
    const titleEn = html.getAttribute("data-title-en");
    if (titleAr && titleEn) {
      document.title = isEn ? titleEn : titleAr;
    }

    document.querySelectorAll("[data-lang-toggle]").forEach((btn) => {
      btn.innerHTML = isEn ? '<span style="transform:translateY(-2px);display:inline-block">ع</span>' : "EN";
      btn.setAttribute("aria-label", isEn ? "التبديل إلى العربية" : "Switch to English");
    });

    document.querySelectorAll("[data-placeholder-ar][data-placeholder-en]").forEach((el) => {
      el.setAttribute(
        "placeholder",
        isEn ? el.getAttribute("data-placeholder-en") : el.getAttribute("data-placeholder-ar")
      );
    });

    try {
      localStorage.setItem(STORAGE_KEY, isEn ? "en" : "ar");
    } catch (_) {}

    window.dispatchEvent(new CustomEvent("playpodz:langchange", { detail: { lang: isEn ? "en" : "ar" } }));
  }

  applyLang(detectInitialLang());

  document.querySelectorAll("[data-lang-toggle]").forEach((btn) => {
    btn.addEventListener("click", () => {
      applyLang(html.getAttribute("lang") === "en" ? "ar" : "en");
    });
  });

  /* ── 2. Exact Dynamic Header Height & Fade Start (Header.tsx + index.tsx) */
  const headerEl = document.querySelector(".floating-header");
  if (headerEl) {
    const syncHeaderH = () => {
      const h = Math.round(headerEl.getBoundingClientRect().height);
      if (h > 0) document.documentElement.style.setProperty("--header-h", `${h}px`);
    };
    syncHeaderH();
    if (typeof ResizeObserver !== "undefined") {
      new ResizeObserver(syncHeaderH).observe(headerEl);
    }
    window.addEventListener("resize", syncHeaderH);
  }

  const pageWrapper = document.querySelector(".home-page-bg");
  const fadeMarker = document.getElementById("fade-start-marker");
  if (pageWrapper && fadeMarker) {
    const syncFadeStart = () => {
      const top = fadeMarker.getBoundingClientRect().top - pageWrapper.getBoundingClientRect().top;
      pageWrapper.style.setProperty("--fade-start", `${Math.max(200, Math.round(top))}px`);
    };
    syncFadeStart();
    if (typeof ResizeObserver !== "undefined") {
      new ResizeObserver(syncFadeStart).observe(pageWrapper);
    }
    window.addEventListener("resize", syncFadeStart);
  }

  /* ── 3. Liquid Glass Edge Refraction (from liquidGlass.ts) ─────────── */
  function supportsBackdropRefraction(ua) {
    return /(Chrome|Chromium)\//.test(ua) && !/CriOS|FxiOS|EdgiOS|Firefox/.test(ua);
  }

  function lensMap(w, h, r, edge) {
    const data = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const cx = Math.min(Math.max(x + 0.5, r), w - r);
        const cy = Math.min(Math.max(y + 0.5, r), h - r);
        let nx = x + 0.5 - cx;
        let ny = y + 0.5 - cy;
        let d;
        if (nx === 0 && ny === 0) {
          const dl = x + 0.5, dr = w - x - 0.5, dt = y + 0.5, db = h - y - 0.5;
          d = Math.min(dl, dr, dt, db);
          nx = d === dl ? -1 : d === dr ? 1 : 0;
          ny = nx !== 0 ? 0 : d === dt ? -1 : 1;
        } else {
          const len = Math.hypot(nx, ny);
          d = r - len;
          nx /= len;
          ny /= len;
        }
        const t = Math.max(0, 1 - Math.max(0, d) / edge);
        const k = t * t * 127;
        const i = (y * w + x) * 4;
        data[i] = 128 - nx * k;
        data[i + 1] = 128 - ny * k;
        data[i + 2] = 128;
        data[i + 3] = 255;
      }
    }
    return data;
  }

  function startLiquidGlass() {
    if (!supportsBackdropRefraction(navigator.userAgent)) return;
    if (window.matchMedia("(prefers-reduced-transparency: reduce)").matches) return;
    const SVG_NS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("width", "0");
    svg.setAttribute("height", "0");
    svg.style.position = "absolute";
    svg.style.pointerEvents = "none";
    const defs = document.createElementNS(SVG_NS, "defs");
    svg.appendChild(defs);
    document.body.appendChild(svg);

    const filters = new Map();
    const EDGE = 18, SCALE = 22;
    const filterFor = (w, h, radius) => {
      const key = `${w}x${h}x${radius}`;
      if (filters.has(key)) return filters.get(key);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      const img = ctx.createImageData(w, h);
      img.data.set(lensMap(w, h, radius, Math.min(EDGE, Math.min(w, h) / 2)));
      ctx.putImageData(img, 0, 0);

      const id = `lg-refract-${filters.size}`;
      const filter = document.createElementNS(SVG_NS, "filter");
      filter.setAttribute("id", id);
      filter.setAttribute("x", "0");
      filter.setAttribute("y", "0");
      filter.setAttribute("width", String(w));
      filter.setAttribute("height", String(h));
      filter.setAttribute("filterUnits", "userSpaceOnUse");
      filter.setAttribute("color-interpolation-filters", "sRGB");
      const image = document.createElementNS(SVG_NS, "feImage");
      image.setAttribute("href", canvas.toDataURL());
      image.setAttribute("x", "0");
      image.setAttribute("y", "0");
      image.setAttribute("width", String(w));
      image.setAttribute("height", String(h));
      image.setAttribute("preserveAspectRatio", "none");
      image.setAttribute("result", "map");
      const displace = document.createElementNS(SVG_NS, "feDisplacementMap");
      displace.setAttribute("in", "SourceGraphic");
      displace.setAttribute("in2", "map");
      displace.setAttribute("scale", String(SCALE));
      displace.setAttribute("xChannelSelector", "R");
      displace.setAttribute("yChannelSelector", "G");
      filter.append(image, displace);
      defs.appendChild(filter);
      const url = `url(#${id})`;
      filters.set(key, url);
      return url;
    };

    const apply = (el) => {
      const w = Math.round(el.offsetWidth);
      const h = Math.round(el.offsetHeight);
      if (w < 8 || h < 8 || w > 1400 || h > 400) return;
      const radius = Math.min(parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0, h / 2, w / 2);
      const url = filterFor(w, h, Math.round(radius));
      if (!url) return;
      el.style.setProperty("--lg-refract", url);
      el.classList.add("lg-refract");
    };

    document.querySelectorAll(".lg").forEach(apply);
  }

  startLiquidGlass();

  /* ── 4. HeroGames Rotating Word (from HeroGames.tsx) ───────────────── */
  const heroWordEl = document.getElementById("hero-game-word");
  const heroBarEl = document.getElementById("hero-game-bar");
  const heroDotsEl = document.getElementById("hero-game-dots");
  if (heroWordEl && heroBarEl && heroDotsEl) {
    const GAMES = [
      { ar: "حساباتك", en: "Accounts & P&L", color: "#C9A84C" },
      { ar: "المخزون", en: "Inventory", color: "#BED7F1" },
      { ar: "الموظفين", en: "Your Staff", color: "#D8CBB3" },
      { ar: "الشفتات", en: "Shifts", color: "#C9A84C" },
      { ar: "اللاعيبة", en: "Players", color: "#BED7F1" },
      { ar: "الحجوزات", en: "Bookings", color: "#D8CBB3" },
    ];
    let idx = 0;
    let phase = "in";

    const renderGame = () => {
      const isEn = html.getAttribute("lang") === "en";
      const g = GAMES[idx % GAMES.length];
      heroWordEl.textContent = isEn ? g.en : g.ar;
      heroWordEl.style.color = g.color;

      if (phase === "in") {
        heroWordEl.style.transform = "translateY(0)";
        heroWordEl.style.opacity = "1";
        heroWordEl.style.transition = "transform .45s cubic-bezier(.2,1.5,.4,1), opacity .25s";
        heroBarEl.style.width = "84px";
      } else if (phase === "out") {
        heroWordEl.style.transform = "translateY(-65%)";
        heroWordEl.style.opacity = "0";
        heroWordEl.style.transition = "transform .22s ease-in, opacity .18s";
        heroBarEl.style.width = "0px";
      } else {
        heroWordEl.style.transform = "translateY(65%)";
        heroWordEl.style.opacity = "0";
        heroWordEl.style.transition = "none";
      }
      heroBarEl.style.background = g.color;
      heroBarEl.style.transition = "width .45s cubic-bezier(.2,1.3,.4,1), background-color .25s";

      Array.from(heroDotsEl.children).forEach((dot, i) => {
        dot.style.width = i === idx ? "22px" : "6px";
        dot.style.background = i === idx ? g.color : "rgba(245,245,242,.25)";
      });
    };

    renderGame();
    window.addEventListener("playpodz:langchange", renderGame);

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setInterval(() => {
      if (reduce) {
        idx = (idx + 1) % GAMES.length;
        renderGame();
        return;
      }
      phase = "out";
      renderGame();
      setTimeout(() => {
        idx = (idx + 1) % GAMES.length;
        phase = "pre";
        renderGame();
        setTimeout(() => {
          phase = "in";
          renderGame();
        }, 35);
      }, 220);
    }, 2600);
  }

  /* ── 5. LogoFlight (from HeaderLogo.tsx) ───────────────────────────── */
  const heroOctoAnchor = document.getElementById("hero-octopus");
  const flyingOcto = document.getElementById("flying-octopus");
  const flyingOctoImg = document.getElementById("flying-octopus-img");
  if (heroOctoAnchor && flyingOcto && flyingOctoImg && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    const VB_H = 29.76;
    const PLAY_RIGHT = 34.51, PODZ_LEFT = 63.63;
    const OCTO_LEFT = 36.26, OCTO_TOP = -0.04, OCTO_W = 25.61;
    const GAP_START = 4.6, START_SCALE = 1.3, FLY_PX = 160;
    const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

    const updateFlight = () => {
      const logos = Array.from(document.querySelectorAll("[data-logo-morph]"));
      const logo = logos.find((el) => el.offsetWidth > 0);
      if (!logo) {
        flyingOcto.style.visibility = "hidden";
        heroOctoAnchor.style.visibility = "";
        return;
      }
      const play = logo.querySelector('[data-logo-half="play"]');
      const podz = logo.querySelector('[data-logo-half="podz"]');
      const L = logo.getBoundingClientRect();
      const A = heroOctoAnchor.getBoundingClientRect();
      const u = L.height / VB_H;
      const raw = Math.min(1, Math.max(0, window.scrollY / FLY_PX));
      const p = ease(raw);

      const playR = PLAY_RIGHT * u;
      const podzL = PODZ_LEFT * u;
      const podzW = L.width - podzL;
      const gap0 = GAP_START * u;
      const gap = gap0 + (podzL - playR - gap0) * p;
      const k = START_SCALE + (1 - START_SCALE) * p;
      const x0 = (L.width - (playR + gap + podzW) * k) / 2;
      const y0 = (L.height * (1 - k)) / 2;
      if (play) play.style.transform = `translate(${x0}px, ${y0}px) scale(${k})`;
      if (podz) podz.style.transform = `translate(${x0 + (playR + gap - podzL) * k}px, ${y0}px) scale(${k})`;

      const slotW = OCTO_W * u;
      const slotX = L.left + OCTO_LEFT * u;
      const slotY = L.top + OCTO_TOP * u;
      const x = A.left + (slotX - A.left) * p;
      const y = A.top + (slotY - A.top) * p;
      const s = (A.width + (slotW - A.width) * p) / slotW;
      flyingOcto.style.width = `${slotW}px`;
      flyingOcto.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${s})`;
      flyingOctoImg.classList.toggle("octo-bob", raw < 0.02);
      heroOctoAnchor.style.visibility = "hidden";
      flyingOcto.style.visibility = "visible";
    };

    const scheduleFlight = () => requestAnimationFrame(updateFlight);
    window.addEventListener("scroll", scheduleFlight, { passive: true });
    window.addEventListener("resize", scheduleFlight);
    if (typeof ResizeObserver !== "undefined" && headerEl) {
      new ResizeObserver(scheduleFlight).observe(headerEl);
    }
    requestAnimationFrame(updateFlight);
  }

  /* ── 6. Mobile GlassTabBar Scroll Tuck (from GlassTabBar.tsx) ──────── */
  const phoneBarWrap = document.querySelector(".phone-tab-bar-wrap");
  if (phoneBarWrap) {
    let lastY = window.scrollY;
    window.addEventListener(
      "scroll",
      () => {
        const y = window.scrollY;
        const dy = y - lastY;
        if (y < 60) phoneBarWrap.classList.remove("is-compact");
        else if (dy > 6) phoneBarWrap.classList.add("is-compact");
        else if (dy < -6) phoneBarWrap.classList.remove("is-compact");
        if (Math.abs(dy) > 6) lastY = y;
      },
      { passive: true }
    );
  }

  /* ── 7. Scroll Reveal & Live Ticking Cashier Timer ─────────────────── */
  const reveals = document.querySelectorAll(".reveal");
  if (reveals.length && typeof IntersectionObserver !== "undefined") {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-visible");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add("is-visible"));
  }

  const liveTimers = document.querySelectorAll("[data-live-seconds]");
  if (liveTimers.length) {
    setInterval(() => {
      liveTimers.forEach((el) => {
        const secs = (parseInt(el.getAttribute("data-live-seconds") || "0", 10) || 0) + 1;
        el.setAttribute("data-live-seconds", String(secs));
        const h = String(Math.floor(secs / 3600)).padStart(2, "0");
        const m = String(Math.floor((secs % 3600) / 60)).padStart(2, "0");
        const s = String(secs % 60).padStart(2, "0");
        el.textContent = `${h}:${m}:${s}`;
      });
    }, 1000);
  }

  /* ── 8. Interactive Tabs & Filters ─────────────────────────────────── */
  document.querySelectorAll("[data-tab-group]").forEach((group) => {
    const tabs = group.querySelectorAll("[data-os-tab]");
    const panels = group.querySelectorAll("[data-os-panel]");
    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        const target = tab.getAttribute("data-os-tab");
        tabs.forEach((t) => {
          const on = t === tab;
          t.classList.toggle("is-active", on);
          t.setAttribute("aria-selected", String(on));
        });
        panels.forEach((p) => {
          p.classList.toggle("is-active", p.getAttribute("data-os-panel") === target);
        });
      });
    });
  });

  const filterChips = document.querySelectorAll("[data-filter]");
  const filterCards = document.querySelectorAll("[data-category]");
  if (filterChips.length && filterCards.length) {
    filterChips.forEach((chip) => {
      chip.addEventListener("click", () => {
        const cat = chip.getAttribute("data-filter");
        filterChips.forEach((c) => c.classList.toggle("is-active", c === chip));
        filterCards.forEach((card) => {
          const match = cat === "all" || card.getAttribute("data-category") === cat;
          card.classList.toggle("is-hidden", !match);
        });
      });
    });
  }

  /* ── 9. Venue Configurator, Quote Form & Lead Tracking ──────────────── */
  const WA_NUMBER = "201142762313";
  const cfg = window.PP_CONFIG || {};

  // Meta Pixel: loads only when an ID is set in assets/js/config.js
  if (cfg.metaPixelId) {
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version="2.0";n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,"script","https://connect.facebook.net/en_US/fbevents.js");
    window.fbq("init", cfg.metaPixelId);
    window.fbq("track", "PageView");
  }
  const trackLead = (source) => {
    try { if (window.fbq) window.fbq("track", "Lead", { content_name: source }); } catch (_) {}
  };
  // Any WhatsApp link click counts as a lead (demo buttons, footer, contact)
  document.addEventListener("click", (e) => {
    const a = e.target.closest && e.target.closest('a[href^="https://wa.me/"]');
    if (a) trackLead(a.getAttribute("data-lead") || "whatsapp");
  });

  const cfgForm = document.getElementById("venue-configurator");
  const cfgOutput = document.getElementById("configurator-output");
  if (cfgForm && cfgOutput) {
    const updateCfg = () => {
      const data = new FormData(cfgForm);
      const type = String(data.get("cfgType") || "PlayStation");
      const count = Math.max(1, parseInt(String(data.get("cfgStations") || "10"), 10) || 1);
      const cafe = data.get("cfgCafe") === "1";
      const isEn = html.getAttribute("lang") === "en";
      const activity = /Trampoline/.test(type);
      const plan = cafe ? "Growth" : "Starter";
      const rate = cafe ? 17 : 10;
      const monthly = (rate * count).toLocaleString("en-US");
      const head = activity
        ? (isEn ? "Big activities are separate add-ons" : "الأنشطة الكبيرة ليها اشتراك إضافي")
        : (isEn ? `Suggested plan: ${plan}` : `الباقة المناسبة: ${plan}`);
      const price = activity
        ? (isEn ? "Pricing depends on the activity. Message us and we'll work it out with you." : "السعر حسب النشاط. كلمنا ونحسبها معاك.")
        : (isEn ? `${rate} EGP × ${count} devices = <strong style="color:#fff;font-size:1.6rem;" dir="ltr">${monthly} EGP</strong> a month`
                : `${rate} جنيه × ${count} جهاز = <strong style="color:#fff;font-size:1.6rem;" dir="ltr">${monthly} جنيه</strong> في الشهر`);
      const note = isEn ? "No setup fee. Free trial first." : "مفيش مصاريف تركيب. وتبدأ بفترة تجريبية مجانية.";
      const msg = isEn
        ? `Hi Play Podz, I'd like a demo. Venue: ${type}, ${count} devices${cafe ? ", with a café/bar" : ""}.`
        : `أهلاً Play Podz، عايز أحجز ديمو. المكان: ${type}، ${count} جهاز${cafe ? "، وفيه كافيه/بار" : ""}.`;
      cfgOutput.innerHTML = `
        <h3 class="pp-card-title">${head}</h3>
        <p class="pp-card-text" style="font-size:1rem;">${price}</p>
        <p class="pp-card-text">${note}</p>
        <a href="https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}" target="_blank" rel="noopener noreferrer" class="btn btn-whatsapp" data-lead="configurator" style="align-self:flex-start;margin-top:.4rem;">
          ${isEn ? "Book a demo on WhatsApp" : "احجز ديمو على واتساب"}
        </a>`;
    };
    cfgForm.addEventListener("change", updateCfg);
    cfgForm.addEventListener("input", updateCfg);
    window.addEventListener("playpodz:langchange", updateCfg);
    updateCfg();
  }

  const quoteForm = document.getElementById("quote-form");
  const statusEl = document.getElementById("quote-status");
  if (quoteForm) {
    quoteForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const data = new FormData(quoteForm);
      const get = (k) => String(data.get(k) || "").trim();
      const lead = {
        venue: get("venue"), name: get("name"), phone: get("phone"), city: get("city"),
        venueType: get("venueType"), stations: get("stations"), notes: get("notes"), website: get("website"),
      };
      const isEn = html.getAttribute("lang") === "en";
      if (!lead.venue || !lead.name || !lead.phone) return;

      trackLead("quote-form");

      const lines = isEn
        ? [
            "Hi Play Podz, I'd like a demo:",
            `• Venue: ${lead.venue}`,
            `• Name: ${lead.name}`,
            `• WhatsApp: ${lead.phone}`,
            lead.city ? `• City: ${lead.city}` : "",
            lead.venueType ? `• Type: ${lead.venueType}` : "",
            lead.stations ? `• Devices: ${lead.stations}` : "",
            lead.notes ? `• Notes: ${lead.notes}` : "",
          ]
        : [
            "أهلاً Play Podz، عايز أحجز ديمو:",
            `• المكان: ${lead.venue}`,
            `• الاسم: ${lead.name}`,
            `• واتساب: ${lead.phone}`,
            lead.city ? `• المدينة: ${lead.city}` : "",
            lead.venueType ? `• النوع: ${lead.venueType}` : "",
            lead.stations ? `• الأجهزة: ${lead.stations}` : "",
            lead.notes ? `• ملاحظات: ${lead.notes}` : "",
          ];
      const message = lines.filter(Boolean).join("\n");
      window.open(`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
      if (statusEl) {
        statusEl.textContent = isEn
          ? "WhatsApp opened with your details. Press send and we'll get back to you."
          : "واتساب اتفتح وبياناتك مكتوبة. دوس إرسال ونكلمك.";
      }
    });
  }
})();
