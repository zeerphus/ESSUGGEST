/**
 * ESSUGGEST — dotted.js
 * Independent pieces sharing one file since index.html only loads
 * one <script>:
 *   1. Magnetic dot-grid background canvas (#dots-canvas)
 *   2. Shrink-on-scroll masthead (#site-header)
 *   3. Hero image float + tilt (essuggest.png)
 *   4. Staff access panel (HR passcode gate, fingerprint trigger)
 *   5. Hero video sound controls (#hero-video: mute toggle + volume)
 */

/* =========================================================================
   1) MAGNETIC DOT BACKGROUND
   ---------------------------------------------------------------------
   Fix vs. the previous version: the canvas used to be sized once off
   getBoundingClientRect() right at DOMContentLoaded. If web fonts or
   images finished loading afterward (changing the page's height), the
   canvas stayed shorter than the actual content — which is exactly why
   the "Two ways to be heard" and "Three steps" sections were showing
   flat white instead of dots. This version:
     - sizes against #dots-area's full scrollHeight, not just the
       initial bounding rect
     - rebuilds after window 'load' AND after document.fonts.ready
     - watches the area with a ResizeObserver so any later layout
       shift (font swap, image decode, responsive breakpoint) resizes
       the canvas automatically

   Bulge vs. color are now decoupled: the 3D bulge (dot size + magnetic
   pull + shake) reacts across BULGE_INFLUENCE px, while the color glow
   reacts across the smaller COLOR_INFLUENCE px — so the bump reads as
   big and soft, but only the dots right under the cursor actually
   tint green.

   MOBILE PERFORMANCE: this grid can be well over a thousand dots on a
   tall page, and the loop below used to call requestAnimationFrame
   forever, redrawing every dot every frame even while nothing was
   moving. That's wasted CPU/battery on phones, and the biggest source
   of jank on lower-end devices. Now the loop stops itself once every
   dot has eased back to rest and the pointer isn't active, and
   restarts on the next mousemove/touchmove (with a one-frame redraw
   forced after any resize/orientation-change rebuild, so the canvas
   never sits blank waiting for a pointer event that may not come).

   ACCESSIBILITY: the pointer-reactive bulge/pull/shake is a
   motion effect that can bother people with vestibular disorders or
   motion sensitivity. It's already inert until someone moves a pointer
   over it, but for anyone with the OS-level "reduce motion" setting on,
   we skip the reactive animation entirely and just draw a still grid of
   dots — this is checked once via prefers-reduced-motion and mirrors
   the same guard already used for CSS animations elsewhere on the page.
========================================================================= */
(function magneticDots() {
  const area = document.getElementById("dots-area");
  const canvas = document.getElementById("dots-canvas");
  if (!area || !canvas) return;

  const ctx = canvas.getContext("2d");

  const prefersReducedMotion = window.matchMedia
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;

  const SPACING = 30;   // px between dots — lower = denser grid
  const BASE_RADIUS = 1.4;  // dot size at idle
  const MAX_RADIUS = 4;    // dot size when cursor is on it (was 6 — bigger bulge)
  const BULGE_INFLUENCE = 220;  // px radius around cursor where dots grow/pull/shake
  const COLOR_INFLUENCE = 100;  // px radius around cursor where dots tint green (smaller than bulge)
  const MAX_PULL = 26;   // max px a dot can be dragged toward cursor (was 16 — bigger bulge)
  const EASE = 0.1;    // 0-1, lower = slower/smoother motion
  const MAX_JITTER = 2;  // px of shake at the very center of the cursor
  const SETTLE_EPSILON = 0.02; // below this, a dot's bulge/color are close enough to 0 to call it "at rest"
  const GLOW_COLOR = "#16A34A";  // color of dots near the cursor
  const GLOW_RGB = [22, 163, 74]; // same color as GLOW_COLOR, as RGB for lerping
  const DOT_RGB = [180, 186, 196];   // RGB of resting dots (alpha set below)

  let dots = [];
  let width = 0;
  let height = 0;
  let dpr = Math.min(window.devicePixelRatio || 1, 2);

  let pointer = { x: -9999, y: -9999, active: false };
  let rafId = null;

  // Rounds the influence falloff into a soft hill instead of a linear
  // cone — this is a big part of what makes the bump feel 3D instead
  // of mechanical.
  function smoothstep(edge0, edge1, x) {
    const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
  }

  // Blends resting grey toward the glow color as t goes 0 -> 1, so the
  // color fades smoothly across the influence radius instead of
  // switching abruptly at its edge.
  function lerpColor(rgbA, rgbB, t) {
    const r = Math.round(rgbA[0] + (rgbB[0] - rgbA[0]) * t);
    const g = Math.round(rgbA[1] + (rgbB[1] - rgbA[1]) * t);
    const b = Math.round(rgbA[2] + (rgbB[2] - rgbA[2]) * t);
    return `rgb(${r}, ${g}, ${b})`;
  }

  function buildGrid() {
    // Use scrollHeight, not just the viewport-clipped bounding rect,
    // so the canvas always covers the full stacked height of every
    // section inside #dots-area — even sections below the fold.
    width = area.clientWidth;
    height = area.scrollHeight;

    if (width === 0 || height === 0) return;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    dots = [];
    const cols = Math.ceil(width / SPACING) + 1;
    const rows = Math.ceil(height / SPACING) + 1;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const baseX = c * SPACING;
        const baseY = r * SPACING;
        dots.push({
          baseX,
          baseY,
          x: baseX,
          y: baseY,
          r: BASE_RADIUS,
          z: 0,       // bulge intensity (size/pull/shake)
          colorT: 0,  // color-tint intensity (smaller radius than z)
          // Random phase + frequency per dot so the jitter looks like
          // independent shaking rather than every dot vibrating in sync.
          jitterPhaseX: Math.random() * Math.PI * 2,
          jitterPhaseY: Math.random() * Math.PI * 2,
          jitterFreq: 0.006 + Math.random() * 0.004,
        });
      }
    }
  }

  function updatePointerFromEvent(clientX, clientY) {
    const rect = area.getBoundingClientRect();
    pointer.x = clientX - rect.left;
    pointer.y = clientY - rect.top;
    pointer.active = true;
  }

  function wake() {
    // Restart the draw loop if it had stopped itself after settling.
    if (!prefersReducedMotion && !rafId) {
      rafId = requestAnimationFrame(step);
    }
  }

  function onMouseMove(e) {
    updatePointerFromEvent(e.clientX, e.clientY);
    wake();
  }

  function onTouchMove(e) {
    if (!e.touches || !e.touches.length) return;
    const t = e.touches[0];
    updatePointerFromEvent(t.clientX, t.clientY);
    wake();
  }

  function onLeave() {
    pointer.active = false;
    pointer.x = -9999;
    pointer.y = -9999;
  }

  function drawStillGrid() {
    // Reduced-motion path: draw every dot once at rest, no pointer
    // reactivity, no per-frame redraw loop.
    ctx.clearRect(0, 0, width, height);
    for (let i = 0; i < dots.length; i++) {
      const d = dots[i];
      ctx.beginPath();
      ctx.arc(d.baseX, d.baseY, BASE_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = `rgb(${DOT_RGB[0]}, ${DOT_RGB[1]}, ${DOT_RGB[2]})`;
      ctx.globalAlpha = 0.6;
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  // True once every dot has eased back close enough to its resting
  // state (no bulge, no color tint, no offset) and the pointer isn't
  // currently active over the area — i.e. nothing left to animate.
  function allSettled() {
    if (pointer.active) return false;
    for (let i = 0; i < dots.length; i++) {
      const d = dots[i];
      if (d.z > SETTLE_EPSILON || d.colorT > SETTLE_EPSILON) return false;
    }
    return true;
  }

  function step(now) {
    ctx.clearRect(0, 0, width, height);

    for (let i = 0; i < dots.length; i++) {
      const d = dots[i];

      let targetX = d.baseX;
      let targetY = d.baseY;
      let targetR = BASE_RADIUS;
      let targetZ = 0;       // 0-1, how "raised" this dot is (bulge)
      let targetColorT = 0;  // 0-1, how tinted this dot is (color)

      if (pointer.active) {
        const dx = pointer.x - d.baseX;
        const dy = pointer.y - d.baseY;
        const dist = Math.hypot(dx, dy);

        if (dist < BULGE_INFLUENCE) {
          const falloff = smoothstep(BULGE_INFLUENCE, 0, dist);
          const pull = Math.min(MAX_PULL, dist) * falloff;
          const angle = Math.atan2(dy, dx);

          targetX = d.baseX + Math.cos(angle) * pull;
          targetY = d.baseY + Math.sin(angle) * pull;
          targetR = BASE_RADIUS + (MAX_RADIUS - BASE_RADIUS) * falloff;
          targetZ = falloff;
        }

        if (dist < COLOR_INFLUENCE) {
          targetColorT = smoothstep(COLOR_INFLUENCE, 0, dist);
        }
      }

      d.x += (targetX - d.x) * EASE;
      d.y += (targetY - d.y) * EASE;
      d.r += (targetR - d.r) * EASE;
      d.z += (targetZ - d.z) * EASE;
      d.colorT += (targetColorT - d.colorT) * EASE;

      // Shake: small oscillation layered on top of the eased position,
      // strongest at the cursor's center (d.z near 1) and fading to
      // nothing at the influence edge (d.z near 0). d.z^2 makes the
      // falloff steeper so only dots quite close to the cursor shake.
      const jitterAmount = MAX_JITTER * d.z * d.z;
      const jx = Math.sin(now * d.jitterFreq + d.jitterPhaseX) * jitterAmount;
      const jy = Math.cos(now * d.jitterFreq * 1.3 + d.jitterPhaseY) * jitterAmount;

      // Flat dot, just a color shift near the cursor — no shadowBlur glow,
      // since overlapping blurred shadows on nearby dots stack into a
      // washed-out bright core that reads as a light source.
      // Color uses colorT (tighter radius) while size/position use z
      // (wider radius) — this is what makes the bulge feel bigger than
      // the green tint around it.
      ctx.beginPath();
      ctx.arc(d.x + jx, d.y + jy, d.r, 0, Math.PI * 2);
      ctx.fillStyle = lerpColor(DOT_RGB, GLOW_RGB, d.colorT);
      ctx.globalAlpha = 0.6 + 0.4 * d.colorT;
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    if (allSettled()) {
      // Nothing left to animate — stop calling requestAnimationFrame
      // until a pointer/touch move wakes it back up. Saves CPU/battery,
      // most noticeably on phones where this loop would otherwise run
      // forever untouched.
      rafId = null;
      return;
    }

    rafId = requestAnimationFrame(step);
  }

  function start() {
    buildGrid();
    if (prefersReducedMotion) {
      drawStillGrid();
      return;
    }
    if (!rafId) rafId = requestAnimationFrame(step);
  }

  let resizeTimeout;
  function scheduleRebuild() {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      buildGrid();
      if (prefersReducedMotion) {
        drawStillGrid();
      } else {
        // The loop may have stopped itself after settling before this
        // resize/orientation-change happened; buildGrid() just replaced
        // `dots` with brand-new objects, so force at least one frame to
        // draw them instead of leaving the canvas blank until the next
        // pointer move.
        wake();
      }
    }, 120);
  }

  if (!prefersReducedMotion) {
    window.addEventListener("mousemove", onMouseMove, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("mouseleave", onLeave);
    area.addEventListener("mouseleave", onLeave);
  }
  window.addEventListener("resize", scheduleRebuild);
  window.addEventListener("load", scheduleRebuild);

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(scheduleRebuild);
  }

  if ("ResizeObserver" in window) {
    const ro = new ResizeObserver(scheduleRebuild);
    ro.observe(area);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();

/* =========================================================================
   2) SHRINK-ON-SCROLL MASTHEAD
   ---------------------------------------------------------------------
   #site-header (the main green navbar) is the sticky nav now — the old
   top utility bar isn't sticky anymore. While the hero is on screen
   (scrollY below THRESHOLD), the header stays fully intact at its
   normal size. Past that, .is-shrunk is added and animationLp.css
   handles the actual size/shrink transition — this just tracks scroll
   position and flips the class. No color change, no blur — solid
   green-700 the whole time.
========================================================================= */
(function shrinkMasthead() {
  const header = document.getElementById("site-header");
  if (!header) return;

  // Two thresholds instead of one: once shrunk, you have to scroll back
  // up past a lower point before it expands again. A single threshold
  // means scroll bounce (trackpads, momentum scrolling) right at that
  // line flips the class back and forth rapidly, which is what was
  // reading as a jittery/"off" transition.
  const SHRINK_AT = 60;
  const EXPAND_AT = 20;
  let isShrunk = false;
  let ticking = false;

  function update() {
    const y = window.scrollY;
    if (!isShrunk && y > SHRINK_AT) {
      isShrunk = true;
    } else if (isShrunk && y < EXPAND_AT) {
      isShrunk = false;
    }
    header.classList.toggle("is-shrunk", isShrunk);
    ticking = false;
  }

  function onScroll() {
    if (!ticking) {
      requestAnimationFrame(update);
      ticking = true;
    }
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  update(); // set correct state on load if the page opens mid-scroll (e.g. via anchor link)
})();

/* =========================================================================
   3) HERO IMAGE FLOAT + TILT (essuggest.png)
   ---------------------------------------------------------------------
   Split into two layers so the CSS float animation and the JS tilt
   loop don't fight over the same element's transform:
     - .hero-float (outer, in index.html) — pure CSS keyframe bob,
       runs constantly, untouched by JS.
     - .hero-tilt-img (inner <img>, this script) — tilts toward the
       cursor like a physical card. No bulge/scale or glow — plain
       tilt only.

   Mouse-only on purpose: there's no touch handler here, so on phones
   and tablets the image just holds still (aside from the CSS float) —
   there's no cursor to tilt toward, and rigging this to touch-drag
   would fight normal page scrolling.

   Respects prefers-reduced-motion the same way section 1 does — for
   anyone with that OS setting on, this whole effect is skipped and the
   image just sits still. The CSS float animation is separately
   disabled in animationLp.css under the same media query.
========================================================================= */
(function heroTilt() {
  const wrap = document.querySelector(".hero-tilt-wrap");
  const img = document.querySelector(".hero-tilt-img");
  if (!wrap || !img) return;

  const prefersReducedMotion = window.matchMedia
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;
  if (prefersReducedMotion) return; // leave the image completely static

  // ---- Tunables ---------------------------------------------------------
  const MAX_TILT = 10;   // degrees of rotation at the edge of the image
  const EASE = 0.12;     // 0-1, lower = slower/smoother trailing motion

  let target = { rx: 0, ry: 0 };
  let current = { rx: 0, ry: 0 };
  let rafId = null;
  let hovering = false;

  function onMouseMove(e) {
    const rect = wrap.getBoundingClientRect();
    const offsetX = (e.clientX - rect.left) / rect.width; // 0 (left) -> 1 (right)
    const offsetY = (e.clientY - rect.top) / rect.height; // 0 (top) -> 1 (bottom)

    // Cursor right of center -> tilt right; cursor above center -> top
    // edge tilts toward the viewer (hence the minus sign on rx).
    target.ry = (offsetX - 0.5) * MAX_TILT * 2;
    target.rx = -(offsetY - 0.5) * MAX_TILT * 2;
  }

  function onEnter() {
    hovering = true;
    if (!rafId) rafId = requestAnimationFrame(tick);
  }

  function onLeave() {
    hovering = false;
    target = { rx: 0, ry: 0 };
    // Don't stop the rAF loop here — tick() keeps it running until the
    // image has actually eased back to neutral, otherwise it would
    // just snap flat instead of settling smoothly.
  }

  function tick() {
    current.rx += (target.rx - current.rx) * EASE;
    current.ry += (target.ry - current.ry) * EASE;

    img.style.transform = `rotateX(${current.rx}deg) rotateY(${current.ry}deg)`;

    const settled =
      Math.abs(current.rx) < 0.01 && Math.abs(current.ry) < 0.01;

    if (hovering || !settled) {
      rafId = requestAnimationFrame(tick);
    } else {
      rafId = null;
    }
  }

  wrap.addEventListener("mouseenter", onEnter);
  wrap.addEventListener("mousemove", onMouseMove, { passive: true });
  wrap.addEventListener("mouseleave", onLeave);
})();

/* =========================================================================
   5) HERO VIDEO SOUND CONTROLS
   ---------------------------------------------------------------------
   Video stays autoplay + muted + loop (browsers only allow autoplay when
   muted). The only things the user can change are mute/unmute and volume.
   Clicking the button or dragging the slider counts as a user gesture,
   so unmuting is allowed.
========================================================================= */
(function videoSoundControls() {
  const video  = document.getElementById("hero-video");
  const toggle = document.getElementById("vc-toggle");
  const slider = document.getElementById("vc-volume");
  if (!video || !toggle || !slider) return;

  const iconOn  = toggle.querySelector(".vc-icon-on");
  const iconOff = toggle.querySelector(".vc-icon-off");

  const DEFAULT_VOLUME = 0.5;
  let lastVolume = DEFAULT_VOLUME;

  // iOS Safari ignores video.volume (always reads 1), so a slider would do
  // nothing there. Detect that and keep just the mute button.
  video.volume = DEFAULT_VOLUME;
  if (Math.abs(video.volume - DEFAULT_VOLUME) > 0.01) {
    slider.hidden = true;
  }

  function render() {
    const silent = video.muted || video.volume === 0;
    const pct = silent ? 0 : Math.round(video.volume * 100);

    // SVG elements have no .hidden property (only HTML elements do), so
    // assigning it does nothing. Toggle the attribute instead; the CSS rule
    // `.vc-btn svg[hidden] { display: none }` handles the rest.
    iconOn.toggleAttribute("hidden", silent);
    iconOff.toggleAttribute("hidden", !silent);
    toggle.setAttribute("aria-label", silent ? "Unmute video" : "Mute video");

    slider.value = pct;
    slider.style.setProperty("--vol", pct + "%");
    slider.setAttribute("aria-valuetext", pct + " percent");
  }

  toggle.addEventListener("click", () => {
    if (video.muted || video.volume === 0) {
      video.muted = false;
      if (video.volume === 0) video.volume = lastVolume;
    } else {
      video.muted = true;
    }
  });

  slider.addEventListener("input", () => {
    const v = slider.value / 100;
    video.volume = v;
    video.muted = v === 0;
    if (v > 0) lastVolume = v;
  });

  video.addEventListener("volumechange", render);

  // Belt and braces for autoplay (e.g. if the tab loaded in the background)
  const p = video.play();
  if (p && p.catch) p.catch(() => {});

  render();
})();

/* =========================================================================
   6) SITE SEARCH (utility bar)
   ---------------------------------------------------------------------
   Append this to the end of dotted.js (every page already loads it), or
   save it as /pages/search.js and add a <script> tag after dotted.js.

   How it works: on first focus it fetches every page listed in PAGES,
   reads the visible content (headings, paragraphs, list items, FAQ
   questions) and builds an in-memory index. Because it reads the real
   HTML, there is no separate index to keep in sync — edit a page and the
   search follows. Clicking a result opens the page, scrolls to the
   matching block and highlights the matched words.

   Needs to run from a web server (Vite dev server / Netlify), not from
   a file:// URL, because it uses fetch().
========================================================================= */
(function siteSearch() {
  const input = document.getElementById("site-search-input");
  const panel = document.getElementById("site-search-results");
  const status = document.getElementById("site-search-status");
  if (!input || !panel) return;
  const wrap = input.closest(".site-search");

  // Every page that should be searchable. Add new pages here.
  const PAGES = [
    "/pages/homepage.html",
    "/pages/aboutus.html",
    "/pages/contactus.html",
    "/pages/faq.html",
    "/pages/UserGuides.html",
    "/pages/ComGuide.html",
    "/pages/ReportHandB.html",
    "/pages/PrivacyPolicy.html",
    "/pages/SecurityPolicy.html",
    "/pages/IPrightsPolicy.html",
    "/pages/TermsofUse.html",
  ];

  const BLOCKS = "h1,h2,h3,h4,summary,p,li,address";
  const SKIP_IDS = new Set(["dots-area", "policy-content"]);
  const HL_KEY = "essuggest:search-highlight";
  const MAX_RESULTS = 8;
  const MAX_PER_PAGE = 3;
  const MIN_QUERY = 2;

  let index = null;
  let loading = null;
  let current = [];
  let active = -1;
  let hitTimer = null;

  /* ----------------------------- helpers ------------------------------ */
  const norm = (s) => s.replace(/\s+/g, " ").trim();
  const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const samePath = (a, b) =>
    a.replace(/\/$/, "").toLowerCase() === b.replace(/\/$/, "").toLowerCase();

  function appendMarked(el, text, terms) {
    if (!terms.length) {
      el.appendChild(document.createTextNode(text));
      return;
    }
    const re = new RegExp(
      "(" + terms.map(escapeRe).sort((a, b) => b.length - a.length).join("|") + ")",
      "gi"
    );
    text.split(re).forEach((part, i) => {
      if (!part) return;
      if (i % 2) {
        const m = document.createElement("mark");
        m.textContent = part;
        el.appendChild(m);
      } else {
        el.appendChild(document.createTextNode(part));
      }
    });
  }

  function snippet(text, terms) {
    const lower = text.toLowerCase();
    let at = -1;
    for (const t of terms) {
      const i = lower.indexOf(t);
      if (i !== -1 && (at === -1 || i < at)) at = i;
    }
    const start = Math.max(0, at - 50);
    const end = Math.min(text.length, start + 150);
    return (start > 0 ? "…" : "") + text.slice(start, end) + (end < text.length ? "…" : "");
  }

  /* ----------------------------- indexing ----------------------------- */
  function extract(html, url) {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const page = (doc.title || url).replace(/^ESSUGGEST\s*\|\s*/i, "").trim();

    // Chrome that repeats on every page, plus decorative/duplicate nodes
    // (aria-hidden removes the marquee copies and arrow dividers).
    doc
      .querySelectorAll("script,style,canvas,svg,video,footer,header,aside,nav,[aria-hidden='true']")
      .forEach((n) => n.remove());

    // <main> where a page has one, plus the title band (#dots-area) on the
    // policy pages. Skip roots nested inside another root.
    const roots = [...doc.querySelectorAll("main, #dots-area")].filter(
      (el, _, all) => !all.some((o) => o !== el && o.contains(el))
    );

    const out = [];
    roots.forEach((root) => {
      let heading = page;
      root.querySelectorAll(BLOCKS).forEach((el) => {
        const text = norm(el.textContent).replace(/\s*[▾▸]\s*$/, "");
        if (!text) return;
        const isHead = /^(H[1-4]|SUMMARY)$/.test(el.tagName);
        if (isHead) heading = text.replace(/^\d+\.\s*/, "");
        const idEl = el.closest("[id]");
        const anchor = idEl && !SKIP_IDS.has(idEl.id) ? "#" + idEl.id : "";
        out.push({ url, page, anchor, heading, text, isHead });
      });
    });
    return out;
  }

  function load() {
    if (loading) return loading;
    loading = Promise.allSettled(
      PAGES.map((url) =>
        fetch(url)
          .then((r) => {
            if (!r.ok) throw new Error(url + " " + r.status);
            return r.text();
          })
          .then((html) => extract(html, url))
      )
    ).then((results) => {
      const all = results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));

      // Drop text that shows up on 2+ pages (policy "Keep reading" cards,
      // "Questions about this policy?" boxes, etc.) so it doesn't flood results.
      const seen = new Map();
      all.forEach((e) => {
        if (!seen.has(e.text)) seen.set(e.text, new Set());
        seen.get(e.text).add(e.url);
      });

      index = all
        .filter((e) => seen.get(e.text).size < 2)
        .map((e) => ({ ...e, hay: (e.page + " " + e.heading + " " + e.text).toLowerCase() }));
    });
    return loading;
  }

  /* ------------------------------ ranking ----------------------------- */
  function search(q) {
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    const phrase = terms.join(" ");
    const scored = [];

    for (const e of index) {
      if (!terms.every((t) => e.hay.includes(t))) continue;
      const text = e.text.toLowerCase();
      const head = e.heading.toLowerCase();
      let score = e.isHead ? 4 : 0;
      if (text.includes(phrase)) score += 5;
      terms.forEach((t) => {
        if (text.includes(t)) score += 2;
        if (head.includes(t)) score += 1;
      });
      scored.push({ e, score });
    }

    scored.sort((a, b) => b.score - a.score);

    const perPage = {};
    const picked = [];
    for (const s of scored) {
      perPage[s.e.url] = (perPage[s.e.url] || 0) + 1;
      if (perPage[s.e.url] > MAX_PER_PAGE) continue;
      picked.push(s.e);
      if (picked.length === MAX_RESULTS) break;
    }
    return { terms, results: picked };
  }

  /* ------------------------------ rendering --------------------------- */
  function open() {
    panel.hidden = false;
    input.setAttribute("aria-expanded", "true");
  }

  function close() {
    panel.hidden = true;
    input.setAttribute("aria-expanded", "false");
    input.removeAttribute("aria-activedescendant");
    active = -1;
  }

  function showMessage(text) {
    panel.replaceChildren();
    const d = document.createElement("p");
    d.className = "site-search-empty";
    d.textContent = text;
    panel.appendChild(d);
    current = [];
    status.textContent = text;
    open();
  }

  function render({ terms, results }, q) {
    if (!results.length) {
      showMessage("No results for “" + q + "”. Try a different word.");
      return;
    }
    panel.replaceChildren();
    current = results;
    active = -1;

    results.forEach((e, i) => {
      const a = document.createElement("a");
      a.id = "site-search-opt-" + i;
      a.className = "site-search-item";
      a.setAttribute("role", "option");
      a.tabIndex = -1;
      a.href = e.url + e.anchor;

      const title = document.createElement("div");
      title.className = "site-search-title";
      const name = document.createElement("span");
      appendMarked(name, e.heading, terms);
      const pill = document.createElement("span");
      pill.className = "site-search-page";
      pill.textContent = e.page;
      title.append(name, pill);
      a.appendChild(title);

      if (!e.isHead) {
        const sn = document.createElement("p");
        sn.className = "site-search-snippet";
        appendMarked(sn, snippet(e.text, terms), terms);
        a.appendChild(sn);
      }

      a.addEventListener("click", (ev) => go(ev, e, terms));
      panel.appendChild(a);
    });

    status.textContent = results.length + (results.length === 1 ? " result" : " results");
    open();
  }

  function setActive(i) {
    const items = panel.querySelectorAll(".site-search-item");
    if (!items.length) return;
    active = (i + items.length) % items.length;
    items.forEach((el, n) => el.classList.toggle("is-active", n === active));
    input.setAttribute("aria-activedescendant", items[active].id);
    items[active].scrollIntoView({ block: "nearest" });
  }

  async function run() {
    const q = input.value.trim();
    if (q.length < MIN_QUERY) {
      close();
      return;
    }
    if (!index) {
      showMessage("Searching…");
      await load();
      if (input.value.trim() !== q) return; // a newer keystroke will re-run
    }
    render(search(q), q);
  }

  /* ----------------------- navigate + highlight ----------------------- */
  function clearHits() {
    clearTimeout(hitTimer);
    document.querySelectorAll("mark.search-hit").forEach((m) => {
      const p = m.parentNode;
      m.replaceWith(document.createTextNode(m.textContent));
      p.normalize();
    });
  }

  function applyHighlight({ sig, terms }) {
    const el = [...document.querySelectorAll(BLOCKS)].find(
      (n) => !n.closest("footer,header,aside,nav") && norm(n.textContent).includes(sig)
    );
    if (!el) return;

    clearHits();
    const details = el.closest("details");
    if (details) details.open = true;

    const re = new RegExp(
      "(" + terms.map(escapeRe).sort((a, b) => b.length - a.length).join("|") + ")",
      "gi"
    );
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);

    nodes.forEach((n) => {
      if (!re.test(n.nodeValue)) return;
      re.lastIndex = 0;
      const frag = document.createDocumentFragment();
      n.nodeValue.split(re).forEach((part, i) => {
        if (!part) return;
        if (i % 2) {
          const m = document.createElement("mark");
          m.className = "search-hit";
          m.textContent = part;
          frag.appendChild(m);
        } else {
          frag.appendChild(document.createTextNode(part));
        }
      });
      n.replaceWith(frag);
    });

    el.scrollIntoView({ block: "center" });
    hitTimer = setTimeout(() => {
      document.querySelectorAll("mark.search-hit").forEach((m) => m.classList.add("is-fading"));
      hitTimer = setTimeout(clearHits, 700);
    }, 6000);
  }

  function go(ev, entry, terms) {
    const payload = { sig: entry.text.slice(0, 60), terms };
    const target = new URL(entry.url, location.href);

    if (samePath(location.pathname, target.pathname)) {
      ev.preventDefault();
      close();
      history.replaceState(null, "", target.pathname + entry.anchor);
      applyHighlight(payload);
      return;
    }
    try {
      sessionStorage.setItem(HL_KEY, JSON.stringify(payload));
    } catch (_) {
      /* storage blocked: the link still opens the page, just without highlight */
    }
  }

  function applyPending() {
    let raw = null;
    try {
      raw = sessionStorage.getItem(HL_KEY);
      sessionStorage.removeItem(HL_KEY);
    } catch (_) {}
    if (!raw) return;
    try {
      // short delay so fonts/layout settle before we scroll
      setTimeout(() => applyHighlight(JSON.parse(raw)), 150);
    } catch (_) {}
  }

  if (document.readyState === "complete") applyPending();
  else window.addEventListener("load", applyPending);

  /* ------------------------------- events ----------------------------- */
  input.addEventListener("focus", load);
  input.addEventListener("input", run);
  input.addEventListener("click", () => {
    if (panel.hidden && input.value.trim().length >= MIN_QUERY) run();
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (panel.hidden) run();
      else setActive(active + 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!panel.hidden) setActive(active - 1);
    } else if (e.key === "Enter") {
      const items = panel.querySelectorAll(".site-search-item");
      if (items.length) {
        e.preventDefault();
        items[active >= 0 ? active : 0].click();
      }
    } else if (e.key === "Escape") {
      if (!panel.hidden) close();
      else input.blur();
    }
  });

  // Close when clicking elsewhere or tabbing out of the widget.
  document.addEventListener("pointerdown", (e) => {
    if (!wrap.contains(e.target)) close();
  });
  wrap.addEventListener("focusout", (e) => {
    if (e.relatedTarget && !wrap.contains(e.relatedTarget)) close();
  });

  // "/" focuses the search box (unless you're already typing somewhere).
  document.addEventListener("keydown", (e) => {
    if (e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey) return;
    const t = document.activeElement;
    if (t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable)) return;
    e.preventDefault();
    input.focus();
  });
})();