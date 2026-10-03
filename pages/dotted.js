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