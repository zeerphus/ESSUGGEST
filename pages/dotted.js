/**
 * ESSUGGEST — dotted.js
 * Page-level behaviour shared by every page that loads the dot grid:
 *   1. Magnetic dot-grid background canvas (#dots-canvas): bounce + click shockwave
 *   2. Shrink-on-scroll masthead (#site-header)
 *   3. Hero video controls (#hero-video: pause + mute + volume)
 *   4. Site search (utility bar)
 *   5. Scroll reveal (.scroll-reveal)
 *
 * Chat-only visual libraries live in orbs.js / metal.js and are loaded on
 * idle by chatbot.js, so they never block the first paint.
 */

/* =========================================================================
   1) MAGNETIC DOT BACKGROUND  (+ bounce + click shockwave)
   ---------------------------------------------------------------------
   All the original settings are unchanged: SPACING, BASE_RADIUS,
   MAX_RADIUS, BULGE_INFLUENCE, COLOR_INFLUENCE, MAX_PULL, colours. The target for each dot (where the cursor wants it, how big,
   how green) is computed exactly as before. Two things are new:

   BOUNCE: dots no longer snap onto their target (EASE = 1). Position and
   size now follow the target through a spring, so dots overshoot, wobble
   and settle, both when the cursor moves over them and when it leaves.
   Tune with SPRING (snappiness) and DAMPING (lower = less bounce, ~0.5
   is no bounce at all, 0.8+ is very springy).

   SHOCKWAVE: click or tap anywhere that isn't a link, button or input
   and a wave expands from that point. Dots shove outward as it passes,
   bounce back, and flash green. Only the dots move; no ring is drawn. Tune with WAVE_*.

   Same as before: canvas sized to #dots-area's scrollHeight, rebuilt on
   load / fonts.ready / ResizeObserver, loop sleeps when everything has
   settled, and prefers-reduced-motion gets a still grid.

   Performance: only rows near the viewport are simulated and drawn, and
   resting dots are batched into a single path.
========================================================================= */
(function magneticDots() {
  const area = document.getElementById("dots-area");
  const canvas = document.getElementById("dots-canvas");
  if (!area || !canvas) return;

  const ctx = canvas.getContext("2d");

  const prefersReducedMotion = window.matchMedia
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;

  // ---- original settings (unchanged) -------------------------------------
  const SPACING = 30;   // px between dots — lower = denser grid
  const BASE_RADIUS = 1.4;  // dot size at idle
  const MAX_RADIUS = 4;    // dot size when cursor is on it
  const BULGE_INFLUENCE = 220;  // px radius around cursor where dots grow/pull
  const COLOR_INFLUENCE = 120;  // px radius around cursor where dots tint green (smaller than bulge)
  const MAX_PULL = 16;   // max px a dot can be dragged toward cursor
  const EASE = 1;    // 0-1, speed of the size/colour intensity (1 = instant, as before)
  const SETTLE_EPSILON = 0.02; // below this, a dot's bulge/color are close enough to 0 to call it "at rest"
  const GLOW_RGB = [22, 163, 74]; // color of dots near the cursor
  const DOT_RGB = [180, 186, 196];   // RGB of resting dots (alpha set below)

  // ---- bounce ------------------------------------------------------------
  const SPRING = 0.18;   // pull toward the target each frame (higher = snappier)
  const DAMPING = 0.7;   // per-frame velocity kept at 60fps (lower = less bounce)

  // ---- shockwave ---------------------------------------------------------
  const WAVE_SPEED = 9;     // px per frame the ring travels
  const WAVE_MAX = 560;     // ring fades out and dies at this radius
  const WAVE_WIDTH = 50;    // thickness of the band that pushes dots
  const WAVE_POWER = 2.6;   // how hard dots get shoved
  const MAX_WAVES = 3;      // newest waves win if you click rapidly

  const TAU = Math.PI * 2;
  const VIEW_MARGIN = 80;

  // Precomputed colour steps, so we don't build a string per dot per frame.
  const STEPS = 24;
  const PALETTE = [];
  for (let i = 0; i < STEPS; i++) {
    const t = i / (STEPS - 1);
    const r = Math.round(DOT_RGB[0] + (GLOW_RGB[0] - DOT_RGB[0]) * t);
    const g = Math.round(DOT_RGB[1] + (GLOW_RGB[1] - DOT_RGB[1]) * t);
    const b = Math.round(DOT_RGB[2] + (GLOW_RGB[2] - DOT_RGB[2]) * t);
    PALETTE.push(`rgb(${r}, ${g}, ${b})`);
  }

  let dots = [];
  let cols = 0;
  let rows = 0;
  let width = 0;
  let height = 0;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  // Pointer in client coordinates, so scrolling under a still cursor keeps
  // working (the area-relative position is recomputed every frame).
  const pointer = { x: 0, y: 0, active: false };
  const waves = [];
  const moving = []; // reused every frame: dots that need individual drawing

  let rafId = null;
  let lastT = 0;
  // Region of the canvas cleared on the previous frame, so the full-page
  // canvas never has to be wiped in one go. See step().
  const lastClear = { top: 0, bottom: 0 };

  // Rounds the influence falloff into a soft hill instead of a linear cone.
  function smoothstep(edge0, edge1, x) {
    const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
  }

  function buildGrid() {
    // scrollHeight so the canvas covers every section, even below the fold.
    width = area.clientWidth;
    height = area.scrollHeight;
    if (width === 0 || height === 0) return;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    lastClear.top = lastClear.bottom = 0; // resizing the bitmap already cleared it

    cols = Math.ceil(width / SPACING) + 1;
    rows = Math.ceil(height / SPACING) + 1;

    dots = new Array(cols * rows);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const baseX = c * SPACING;
        const baseY = r * SPACING;
        dots[r * cols + c] = {
          baseX,
          baseY,
          x: baseX,
          y: baseY,
          vx: 0,   // spring velocity (position)
          vy: 0,
          r: BASE_RADIUS,
          vr: 0,   // spring velocity (size)
          z: 0,       // bulge intensity (size/pull)
          colorT: 0,  // color-tint intensity (smaller radius than z)
        };
      }
    }
  }

  function drawStillGrid() {
    // Reduced-motion path: every dot once at rest, no reactivity.
    ctx.clearRect(0, 0, width, height);
    lastClear.top = lastClear.bottom = 0;
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = PALETTE[0];
    ctx.beginPath();
    for (let i = 0; i < dots.length; i++) {
      const d = dots[i];
      ctx.moveTo(d.baseX + BASE_RADIUS, d.baseY);
      ctx.arc(d.baseX, d.baseY, BASE_RADIUS, 0, TAU);
    }
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  function step(now) {
    rafId = null;
    const dt = Math.min(2.5, (now - lastT) / 16.667 || 1);
    lastT = now;

    const rect = area.getBoundingClientRect();
    const px = pointer.x - rect.left;
    const py = pointer.y - rect.top;

    // advance + cull shockwaves
    for (let i = waves.length - 1; i >= 0; i--) {
      waves[i].r += WAVE_SPEED * dt;
      if (waves[i].r > WAVE_MAX) waves.splice(i, 1);
    }

    // only rows near the viewport
    const r0 = Math.max(0, Math.floor((-rect.top - VIEW_MARGIN) / SPACING));
    const r1 = Math.min(rows - 1, Math.ceil((-rect.top + window.innerHeight + VIEW_MARGIN) / SPACING));

    // Clear only the band we simulate, plus the band we cleared last frame.
    // The canvas spans the whole page (see buildGrid), so clearRect(0, 0,
    // width, height) meant wiping a multi-megabyte bitmap 60 times a second
    // to redraw a few hundred pixels of dots. Nothing is ever drawn outside
    // the simulated band, so these two slices cover every stale pixel.
    const bandTop = Math.max(0, -rect.top - VIEW_MARGIN);
    const bandBottom = Math.min(height, -rect.top + window.innerHeight + VIEW_MARGIN);
    if (lastClear.bottom > lastClear.top) {
      ctx.clearRect(0, lastClear.top, width, lastClear.bottom - lastClear.top);
    }
    ctx.clearRect(0, bandTop, width, Math.max(0, bandBottom - bandTop));
    lastClear.top = bandTop;
    lastClear.bottom = bandBottom;

    const damp = Math.pow(DAMPING, dt);
    const ease = Math.min(1, EASE * dt);
    moving.length = 0;

    // pass 1: update every dot, batch the resting ones into one path
    ctx.beginPath();
    for (let r = r0; r <= r1; r++) {
      const rowStart = r * cols;
      for (let c = 0; c < cols; c++) {
        const d = dots[rowStart + c];

        let targetX = d.baseX;
        let targetY = d.baseY;
        let targetR = BASE_RADIUS;
        let targetZ = 0;       // 0-1, how "raised" this dot is (bulge)
        let targetColorT = 0;  // 0-1, how tinted this dot is (color)

        if (pointer.active) {
          const dx = px - d.baseX;
          const dy = py - d.baseY;
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

        // shockwave: a moving band that shoves dots outward and flashes them
        for (let w = 0; w < waves.length; w++) {
          const wv = waves[w];
          const wx = d.baseX - wv.x;
          const wy = d.baseY - wv.y;
          const wd = Math.sqrt(wx * wx + wy * wy) || 0.001;
          const band = Math.abs(wd - wv.r);
          if (band < WAVE_WIDTH) {
            const f = 1 - band / WAVE_WIDTH;
            const life = 1 - wv.r / WAVE_MAX;
            const push = WAVE_POWER * f * f * life;
            d.vx += (wx / wd) * push * dt;
            d.vy += (wy / wd) * push * dt;
            const flash = f * life;
            if (flash > targetColorT) targetColorT = flash;
          }
        }

        // spring toward the target -> overshoot, wobble, settle (the bounce)
        d.vx = (d.vx + (targetX - d.x) * SPRING * dt) * damp;
        d.vy = (d.vy + (targetY - d.y) * SPRING * dt) * damp;
        d.vr = (d.vr + (targetR - d.r) * SPRING * dt) * damp;
        d.x += d.vx * dt;
        d.y += d.vy * dt;
        d.r += d.vr * dt;
        if (d.r < 0.4) d.r = 0.4;

        d.z += (targetZ - d.z) * ease;
        d.colorT += (targetColorT - d.colorT) * ease;

        const ox = d.x - d.baseX;
        const oy = d.y - d.baseY;
        const atRest =
          ox * ox + oy * oy < 0.0004 &&
          d.vx * d.vx + d.vy * d.vy < 0.0001 &&
          Math.abs(d.r - BASE_RADIUS) < 0.02 &&
          Math.abs(d.vr) < 0.01 &&
          d.z < SETTLE_EPSILON &&
          d.colorT < SETTLE_EPSILON;

        if (atRest) {
          d.x = d.baseX;
          d.y = d.baseY;
          d.vx = d.vy = d.vr = d.z = d.colorT = 0;
          d.r = BASE_RADIUS;
          ctx.moveTo(d.baseX + BASE_RADIUS, d.baseY);
          ctx.arc(d.baseX, d.baseY, BASE_RADIUS, 0, TAU);
        } else {
          moving.push(d);
        }
      }
    }
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = PALETTE[0];
    ctx.fill();

    // pass 2: moving / tinted dots
    for (let i = 0; i < moving.length; i++) {
      const d = moving[i];

      ctx.globalAlpha = 0.6 + 0.4 * d.colorT;
      ctx.fillStyle = PALETTE[Math.round(d.colorT * (STEPS - 1))];
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, TAU);
      ctx.fill();
    }

    ctx.globalAlpha = 1;

    // sleep once nothing is moving and the pointer isn't over the area
    if (moving.length === 0 && !pointer.active && waves.length === 0) return;
    rafId = requestAnimationFrame(step);
  }

  function wake() {
    // Restart the draw loop if it had stopped itself after settling.
    if (prefersReducedMotion || rafId) return;
    lastT = performance.now();
    rafId = requestAnimationFrame(step);
  }

  function setPointer(x, y) {
    pointer.x = x;
    pointer.y = y;
    pointer.active = true;
    wake();
  }

  function onMouseMove(e) {
    setPointer(e.clientX, e.clientY);
  }

  function onTouchMove(e) {
    if (!e.touches || !e.touches.length) return;
    setPointer(e.touches[0].clientX, e.touches[0].clientY);
  }

  function onLeave() {
    pointer.active = false;
    wake(); // let the dots spring back home
  }

  function onPointerDown(e) {
    // No shockwave when the click is meant for a control.
    if (e.target.closest && e.target.closest("a,button,input,select,textarea,summary,label,video,[role='listbox'], [data-chatbot]")) return;
    const rect = area.getBoundingClientRect();
    waves.push({ x: e.clientX - rect.left, y: e.clientY - rect.top, r: 0 });
    if (waves.length > MAX_WAVES) waves.shift();
    wake();
  }

  function start() {
    buildGrid();
    if (prefersReducedMotion) {
      drawStillGrid();
      return;
    }
    wake();
  }

  let resizeTimeout;
  function scheduleRebuild() {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      buildGrid();
      if (prefersReducedMotion) {
        drawStillGrid();
      } else {
        // buildGrid() replaced `dots`; force a frame so the canvas isn't blank.
        wake();
      }
    }, 120);
  }

  if (!prefersReducedMotion) {
    window.addEventListener("mousemove", onMouseMove, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onLeave);
    window.addEventListener("touchcancel", onLeave);
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("scroll", wake, { passive: true }); // draw newly visible rows
    document.addEventListener("mouseleave", onLeave);
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
   position and flips the class. animationLp.css turns the bar into a
   rounded, lightly frosted pill in that state.
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
   3) HERO VIDEO CONTROLS
   ---------------------------------------------------------------------
   Video autoplays muted + looped (browsers only allow autoplay when
   muted). Controls are play/pause, mute/unmute, and volume. Both the
   pause button and the volume slider count as a user gesture, so
   unmuting is allowed.
   Play/pause is not optional: WCAG 2.2.2 requires a way to stop
   content that moves for more than five seconds.
========================================================================= */
(function videoControls() {
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
    iconOn?.toggleAttribute("hidden", silent);
    iconOff?.toggleAttribute("hidden", !silent);
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

  // ---- play / pause ------------------------------------------------------
  const pauseBtn = document.getElementById("vc-pause");
  if (pauseBtn) {
    const playIcon  = pauseBtn.querySelector(".vc-icon-play");
    const pauseIcon = pauseBtn.querySelector(".vc-icon-pause");

    const renderPlay = () => {
      const paused = video.paused;
      playIcon?.toggleAttribute("hidden", !paused);
      pauseIcon?.toggleAttribute("hidden", paused);
      pauseBtn.setAttribute("aria-label", paused ? "Play video" : "Pause video");
    };

    pauseBtn.addEventListener("click", () => {
      if (video.paused) {
        const p = video.play();
        if (p && p.catch) p.catch(() => {});
      } else {
        video.pause();
      }
      renderPlay();
    });

    video.addEventListener("play", renderPlay);
    video.addEventListener("pause", renderPlay);
    renderPlay();
  }

  // Belt and braces for autoplay (e.g. if the tab loaded in the background)
  const p = video.play();
  if (p && p.catch) p.catch(() => {});

  render();
})();

/* =========================================================================
   4) SCROLL REVEAL
   ---------------------------------------------------------------------
   Progressive enhancement for .scroll-reveal. The CSS only hides these
   elements once `html.reveal-ready` exists, and that class is added here
   — so with JS off, reduced motion on, or an ancient browser, every
   element is simply visible. A safety timer reveals anything the
   observer missed (hidden tab, zero-height container) rather than
   leaving content permanently invisible.
========================================================================= */
(function scrollReveal() {
  const items = document.querySelectorAll(".scroll-reveal");
  if (!items.length) return;

  const reduce = window.matchMedia
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;
  if (reduce || !("IntersectionObserver" in window)) return;

  const root = document.documentElement;
  root.classList.add("reveal-ready");
  let observed = false;

  const revealAll = () => {
    items.forEach((el) => el.classList.add("is-revealed"));
  };

  const io = new IntersectionObserver(
    (entries) => {
      observed = true;
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-revealed");
        io.unobserve(entry.target);
      });
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
  );

  items.forEach((el) => io.observe(el));

  // Never let a failed observation hide content: if the observer produced no
  // callbacks at all (throttled tab, zero-height container), show everything.
  setTimeout(() => {
    if (!observed) revealAll();
  }, 2500);
})();

/* =========================================================================
   5) SITE SEARCH (utility bar)
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