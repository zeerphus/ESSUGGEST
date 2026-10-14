/**
 * ESSUGGEST — mascot.js  (3D edition)
 * "Sugi", the living suggestion box. Real 3D built from CSS 3D transforms
 * (stacked slices + planes). No images, no libraries, no WebGL.
 *
 *   const m = EssuMascot.create({ mood: "happy", size: 48 });
 *   parent.appendChild(m);
 *   m.setMood("thinking");        // "happy" | "thinking" | "confused"
 *
 * Same API as the old 2D mascot, so chatbot.js works unchanged.
 * Extra moods you can set yourself: "sleepy" | "dizzy" | "wow" | "joy" | "yawn".
 * Extra methods on the element: hop(), spin(), wave(), celebrate(),
 * sleep(), wake(), destroy().
 *
 * What Sugi does
 *   - Turns its whole body toward your cursor (spring physics, with
 *     squash & stretch) and the eyes slide a little further than the head.
 *   - Hover: waves and hops; stay hovering and it grins and sends hearts.
 *   - Click / tap: hop + spin with a star burst. Spam-click 5x and it
 *     gets dizzy (spiral eyes, orbiting stars).
 *   - Press and hold: squishes down, springs back on release.
 *   - Idle 3s+: looks around, then keeps herself busy: waves, double-hops,
 *     spins, dances, stretches, yawns, peeks up at her paper, throws
 *     sparkles (a new one every few seconds, never the same twice in a row).
 *     Idle ~22s: falls asleep (snot bubble and z's). Move the mouse and
 *     she wakes up startled.
 *   - Mood changes: shakes its head when confused, pops a ta-da with
 *     sparkles when "thinking" turns back to "happy".
 *   - Turn it around (click-spin) and the back has a little label.
 *   - Respects prefers-reduced-motion.
 *
 * Colors are the ESSUGGEST brand: green-600/700/800 and yellow #f7ea7a.
 */
(function () {
  "use strict";

  const NS = "http://www.w3.org/2000/svg";
  const C = {
    body: "#16A34A",
    bodyDark: "#15803D",
    deep: "#166534",
    ink: "#052e16",
    yellow: "#f7ea7a",
    yellowDark: "#e3d25c",
    blush: "#ffc2cc",
    tongue: "#fb7185",
    red: "#E22214",
  };

  const MOODS = ["happy", "thinking", "confused"];
  const EXTRA = ["sleepy", "dizzy", "wow", "joy", "yawn"];
  const ALL = MOODS.concat(EXTRA);

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const rand = (a, b) => a + Math.random() * (b - a);
  const now = () => performance.now() / 1000;
  const reduced = () => !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);

  /* ------------------------------------------------------------------
     STYLES (injected once so this file is drop-in)
  ------------------------------------------------------------------- */
  const CSS = `
.essu-mascot3d{position:relative;display:block;flex-shrink:0;--s:.48;--bd:0s;
  user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent}
.essu-mascot3d *{box-sizing:border-box}
.essu-bot-logo .essu-mascot3d{width:100%!important;height:100%!important}
.m3-scaler{position:absolute;left:0;top:0;width:100px;height:100px;transform-origin:0 0;
  /* shrink to 82% and nudge so the whole character (paper to feet) sits centred inside a round badge */
  transform:translate(calc(var(--s)*9px),calc(var(--s)*8px)) scale(calc(var(--s)*.82))}
.m3-scene{position:absolute;left:0;top:0;width:100px;height:100px;perspective:340px;perspective-origin:50% 45%}
.m3-shadow{position:absolute;left:18px;top:91px;width:64px;height:11px;border-radius:50%;
  background:rgba(5,46,22,.28);filter:blur(1.6px)}
.m3-p{position:absolute;left:0;top:0;width:0;height:0;transform-style:preserve-3d}
.m3-stage{left:50px;top:50px;transform-origin:0 30px 0;will-change:transform}
.m3-squash{transform-origin:0 40px 0}
.m3-slice,.m3-disc,.m3-plane{position:absolute}
.m3-plane{backface-visibility:hidden;-webkit-backface-visibility:hidden}
.m3-faceplane svg,.m3-fxplane svg{display:block;overflow:visible}
.m3-fxplane,.m3-faceplane{pointer-events:none}

.m3-blink{transform-box:fill-box;transform-origin:center;
  animation:m3-blink 4.6s ease-in-out infinite;animation-delay:var(--bd)}
@keyframes m3-blink{0%,93%,100%{transform:scaleY(1)}96.5%{transform:scaleY(.12)}}

.m3-dots circle{animation:m3-pulse 1.2s ease-in-out infinite}
.m3-dots circle:nth-child(2){animation-delay:.2s}
.m3-dots circle:nth-child(3){animation-delay:.4s}
@keyframes m3-pulse{0%,100%{opacity:.3}50%{opacity:1}}

.m3-q{transform-origin:85px 19px;animation:m3-wob 1.5s ease-in-out infinite}
@keyframes m3-wob{0%,100%{transform:rotate(-9deg)}50%{transform:rotate(11deg)}}

.m3-z{animation:m3-float 2.6s ease-in-out infinite;opacity:0}
.m3-z:nth-child(2){animation-delay:.8s}
.m3-z:nth-child(3){animation-delay:1.6s}
@keyframes m3-float{0%{opacity:0;transform:translate(0,5px)}25%{opacity:1}100%{opacity:0;transform:translate(7px,-11px)}}

.m3-orbit{animation:m3-spin 1.1s linear infinite}
.m3-spiral{transform-box:fill-box;transform-origin:center;animation:m3-spin .7s linear infinite}
@keyframes m3-spin{to{transform:rotate(360deg)}}

.m3-bubble{transform-box:fill-box;transform-origin:left center;animation:m3-bub 2.8s ease-in-out infinite}
@keyframes m3-bub{0%,100%{transform:scale(.35)}55%{transform:scale(1.15)}70%{transform:scale(1)}}

@media (prefers-reduced-motion:reduce){
  .essu-mascot3d *{animation:none!important}
}`;

  function injectCSS() {
    if (document.getElementById("essu-mascot3d-css")) return;
    const s = document.createElement("style");
    s.id = "essu-mascot3d-css";
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  /* ------------------------------------------------------------------
     FACES  (drawn on a flat plane floating just in front of the body;
     coordinates match the original 2D art, viewBox 14 32 72 58)
  ------------------------------------------------------------------- */
  const eye = (cx, cy, rx, ry) =>
    `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${C.ink}"/>` +
    `<circle cx="${cx + 2}" cy="${cy - 3}" r="2.1" fill="#fff"/>` +
    `<circle cx="${cx - 1.4}" cy="${cy + 3}" r="1" fill="#fff" opacity=".8"/>`;

  const eyes = (o) => {
    const y = (o && o.y) || 57, rx = (o && o.rx) || 5.5, ry = (o && o.ry) || 7;
    return `<g class="m3-look" data-f="1"><g class="m3-blink">${eye(36, y, rx, ry)}${eye(64, y, rx, ry)}</g></g>`;
  };
  const stroke = (d, w) =>
    `<path d="${d}" stroke="${C.ink}" stroke-width="${w || 2.4}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
  const spiral = (cx, cy) =>
    `<path class="m3-spiral" d="M${cx} ${cy} a1.5 1.5 0 0 1 3 0 a3 3 0 0 1 -6 0 a4.5 4.5 0 0 1 9 0 a6 6 0 0 1 -12 0" stroke="${C.ink}" stroke-width="1.6" fill="none" stroke-linecap="round"/>`;

  const FACES = {
    happy:
      eyes() +
      `<g class="m3-look" data-f=".5">
        <path d="M42 68 Q50 83 58 68 Z" fill="${C.ink}" stroke="${C.ink}" stroke-width="2" stroke-linejoin="round"/>
        <path d="M45.5 75.5 Q50 80.5 54.5 75.5 Q50 72.5 45.5 75.5Z" fill="${C.tongue}"/></g>`,

    joy:
      `<g class="m3-look" data-f="1">${stroke("M30 60 Q36 51 42 60", 2.8)}${stroke("M58 60 Q64 51 70 60", 2.8)}</g>` +
      `<g class="m3-look" data-f=".5">
        <path d="M39 66.5 Q50 90 61 66.5 Z" fill="${C.ink}" stroke="${C.ink}" stroke-width="2" stroke-linejoin="round"/>
        <path d="M43.5 78 Q50 86 56.5 78 Q50 73.5 43.5 78Z" fill="${C.tongue}"/></g>`,

    thinking:
      `<g transform="translate(1.6 -2.6)">${eyes()}</g>` +
      `<g class="m3-look" data-f=".5"><ellipse cx="54" cy="72" rx="3" ry="3.6" fill="${C.ink}"/></g>`,

    confused:
      `<g class="m3-look" data-f="1"><g class="m3-blink">
        <ellipse cx="36" cy="58" rx="5.5" ry="7" fill="${C.ink}"/>
        <ellipse cx="64" cy="58.5" rx="4.6" ry="6" fill="${C.ink}"/>
        <circle cx="38" cy="55" r="2.1" fill="#fff"/><circle cx="65.8" cy="56" r="1.8" fill="#fff"/></g></g>` +
      `<g class="m3-look" data-f=".7">${stroke("M29 47 Q36 42 43 45.5", 2.2)}${stroke("M58 49.5 L70 46", 2.2)}</g>` +
      `<g class="m3-look" data-f=".5">${stroke("M41 73 Q45.5 67.5 50 73 T59 73", 2.5)}</g>`,

    wow:
      `<g class="m3-look" data-f="1"><g class="m3-blink">${eye(36, 56, 6.4, 8.4)}${eye(64, 56, 6.4, 8.4)}</g></g>` +
      `<g class="m3-look" data-f=".7">${stroke("M28 44 Q36 38 44 44", 2.2)}${stroke("M56 44 Q64 38 72 44", 2.2)}</g>` +
      `<g class="m3-look" data-f=".5"><ellipse cx="50" cy="74" rx="4.4" ry="5.4" fill="${C.ink}"/>
        <ellipse cx="50" cy="76.5" rx="2.4" ry="2" fill="${C.tongue}"/></g>`,

    sleepy:
      `<g class="m3-look" data-f=".3">${stroke("M30 58 Q36 64 42 58", 2.6)}${stroke("M58 58 Q64 64 70 58", 2.6)}</g>` +
      `<g class="m3-look" data-f=".3">${stroke("M46 73 Q50 76 54 73", 2.2)}
        <circle class="m3-bubble" cx="55.5" cy="74" r="4.2" fill="#dcfce7" fill-opacity=".85" stroke="#fff" stroke-width=".8"/></g>`,

    yawn:
      `<g class="m3-look" data-f=".3">${stroke("M31 53.5 L41 58 L31 62.5", 2.6)}${stroke("M69 53.5 L59 58 L69 62.5", 2.6)}</g>` +
      `<g class="m3-look" data-f=".4"><ellipse cx="50" cy="73" rx="5.4" ry="7" fill="${C.ink}"/>
        <ellipse cx="50" cy="77.5" rx="3.4" ry="2.6" fill="${C.tongue}"/></g>`,

    dizzy:
      `<g class="m3-look" data-f=".2">${spiral(36, 57)}${spiral(64, 57)}</g>` +
      `<g class="m3-look" data-f=".3">${stroke("M39 74 q2.8 -4.5 5.6 0 t5.6 0 t5.6 0 t5.6 0", 2.4)}</g>`,
  };

  const HEART = "M0 3.2C-4.6 0 -4.6 -4 -2.4 -4.4C-1 -4.6 0 -3.6 0 -2.6C0 -3.6 1 -4.6 2.4 -4.4C4.6 -4 4.6 0 0 3.2Z";
  const STAR = "M0 -5L1.5 -1.5L5 -1.2L2.3 1L3.2 4.8L0 2.8L-3.2 4.8L-2.3 1L-5 -1.2L-1.5 -1.5Z";

  const zText = (x, y, s, extra) =>
    `<text class="m3-z" x="${x}" y="${y}" font-size="${s}" font-weight="800" font-family="Poppins, Arial, sans-serif" fill="${C.deep}" stroke="#fff" stroke-width=".9" paint-order="stroke" ${extra || ""}>z</text>`;

  const FX = {
    thinking:
      `<g class="m3-dots">
        <circle cx="79" cy="14" r="1.8" fill="${C.yellow}" stroke="${C.deep}" stroke-width="1"/>
        <circle cx="86" cy="9" r="2.5" fill="${C.yellow}" stroke="${C.deep}" stroke-width="1"/>
        <circle cx="94" cy="5" r="3.2" fill="${C.yellow}" stroke="${C.deep}" stroke-width="1"/></g>`,
    confused:
      `<g class="m3-q"><text x="85" y="19" font-size="19" font-weight="800" font-family="Poppins, Arial, sans-serif" fill="${C.deep}" text-anchor="middle" transform="rotate(14 85 19)">?</text></g>`,
    sleepy: zText(76, 24, 10) + zText(83, 15, 13) + zText(91, 6, 16),
    dizzy:
      `<g transform="translate(50 15) scale(1 .38)"><g class="m3-orbit">
        <circle cx="22" cy="0" r="3.6" fill="${C.yellow}" stroke="${C.deep}" stroke-width="1"/>
        <circle cx="-11" cy="19" r="3.6" fill="${C.yellow}" stroke="${C.deep}" stroke-width="1"/>
        <circle cx="-11" cy="-19" r="3.6" fill="${C.yellow}" stroke="${C.deep}" stroke-width="1"/></g></g>`,
  };

  /* ------------------------------------------------------------------
     3D BUILD HELPERS
  ------------------------------------------------------------------- */
  const hex = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const mix = (a, b, t) => {
    const A = hex(a), B = hex(b);
    return `rgb(${A.map((v, i) => Math.round(lerp(v, B[i], t))).join(",")})`;
  };

  function div(cls, css) {
    const d = document.createElement("div");
    d.className = cls;
    if (css) d.style.cssText = css;
    return d;
  }
  const grp = (x, y, z, rot) => {
    const g = div("m3-p");
    g.style.transform = `translate3d(${x}px,${y}px,${z}px)${rot ? " " + rot : ""}`;
    return g;
  };
  const plane = (w, h, css) =>
    div("m3-plane", `left:${-w / 2}px;top:${-h / 2}px;width:${w}px;height:${h}px;${css || ""}`);

  // A rounded box made of many rounded-rect slices stacked along Z.
  function slices(w, h, r, d, n, bg, extra) {
    const g = div("m3-p");
    for (let i = 0; i < n; i++) {
      const t = n > 1 ? i / (n - 1) : 1;
      g.appendChild(
        div("m3-slice",
          `left:${-w / 2}px;top:${-h / 2}px;width:${w}px;height:${h}px;border-radius:${r}px;` +
          `transform:translateZ(${((t - 0.5) * d).toFixed(2)}px);${bg(t)}${extra || ""}`)
      );
    }
    return g;
  }

  // A cheap 3D blob: three ellipses crossed around the vertical axis.
  function blob(w, h, color) {
    const g = div("m3-p");
    for (let i = 0; i < 3; i++) {
      g.appendChild(div("m3-disc",
        `left:${-w / 2}px;top:${-h / 2}px;width:${w}px;height:${h}px;border-radius:50%;background:${color};transform:rotateY(${i * 60}deg)`));
    }
    return g;
  }

  const BW = 72, BH = 58, BD = 50, BY = 11;

  function build(mood, size) {
    const host = div("essu-mascot3d");
    host.setAttribute("aria-hidden", "true");
    host.style.width = host.style.height = size + "px";
    host.style.setProperty("--s", size / 100);
    host.style.setProperty("--bd", (-rand(0, 4.5)).toFixed(2) + "s");

    const scaler = div("m3-scaler");
    const shadow = div("m3-shadow");
    const scene = div("m3-scene");
    const stage = div("m3-stage m3-p");
    const squash = div("m3-squash m3-p");

    /* feet */
    const feet = [-16, 16].map((x) => {
      const g = grp(x, 41, 12);
      g.appendChild(blob(21, 11, C.deep));
      return g;
    });

    /* arms (pivot at the shoulder, JS swings them) */
    const mkArm = () => {
      const pivot = div("m3-p");
      const hang = grp(0, 9, 0);
      hang.appendChild(blob(12, 20, C.bodyDark));
      pivot.appendChild(hang);
      return pivot;
    };
    const armR = mkArm(), armL = mkArm();

    /* body */
    const body = grp(0, BY, 0);
    body.appendChild(slices(BW, BH, 22, BD, 16, (t) => `background:${mix("#0f7a37", C.body, t * t)};`));
    const front = body.firstChild.lastChild;
    front.style.cssText +=
      `background-color:${C.body};background-image:radial-gradient(circle at 50% 50%,rgba(255,255,255,.42) 0,rgba(255,255,255,0) 55%);` +
      "background-size:150% 150%;background-repeat:no-repeat;background-position:50% 30%;";

    /* side badges + back label */
    const badgeSvg =
      `<svg viewBox="-7 -7 14 14" width="14" height="14"><circle r="6.4" fill="${C.yellow}" stroke="${C.yellowDark}" stroke-width="1"/>` +
      `<path d="${HEART}" fill="${C.red}" transform="scale(.9)"/></svg>`;
    [[36.7, "rotateY(90deg)"], [-36.7, "rotateY(-90deg)"]].forEach(([x, rot]) => {
      const g = grp(x, BY, 0, rot);
      const p = plane(14, 14);
      p.innerHTML = badgeSvg;
      g.appendChild(p);
      body.appendChild(g);
    });
    const back = grp(0, BY + 2, -BD / 2 - 0.8, "rotateY(180deg)");
    back.appendChild(
      plane(48, 17,
        `background:${C.yellow};border-radius:6px;box-shadow:inset 0 -2px 0 ${C.yellowDark};color:${C.deep};` +
        "font:800 8px/17px Poppins,Arial,sans-serif;letter-spacing:.06em;text-align:center;")
    ).textContent = "SUGGEST";
    body.appendChild(back);

    /* lid */
    const lid = grp(0, -21, 0);
    lid.appendChild(
      slices(82, 18, 4, 58, 10, (t) => `background:${mix("#cbb842", C.yellow, t * t)};`, `box-shadow:inset 0 -2.4px 0 ${C.yellowDark};`)
    );
    // Top of the lid: sized to the flat part between the rounded corners and sunk onto the
    // slices, so it reads as the lid's top face and never floats above it as a thin line.
    const lidTop = grp(0, -29.9, 0, "rotateX(90deg)");
    const lidPlane = plane(74, 58, `background:linear-gradient(#e6d553,${C.yellow});`);
    lidPlane.appendChild(div("", `position:absolute;left:15px;top:25.5px;width:44px;height:7px;border-radius:4px;background:${C.deep};box-shadow:inset 0 1.5px 0 rgba(0,0,0,.35)`));
    lidTop.appendChild(lidPlane);
    lid.appendChild(lidTop);

    /* paper poking out of the slot */
    const paper = div("m3-p");
    const paperFront = plane(26, 30,
      "background:#fff;border:1.2px solid #bbf7d0;border-radius:4px;");
    paperFront.innerHTML =
      `<svg viewBox="0 0 26 30" width="24" height="28" style="display:block"><g transform="translate(13 10) scale(1.35)"><path d="${HEART}" fill="${C.red}"/></g>` +
      `<path d="M5 21h16M5 25.5h10" stroke="#bbf7d0" stroke-width="2" stroke-linecap="round"/></svg>`;
    const paperBack = plane(26, 30, "background:#fff;border:1.2px solid #bbf7d0;border-radius:4px;transform:rotateY(180deg)");
    paperBack.innerHTML =
      `<svg viewBox="0 0 26 30" width="24" height="28" style="display:block"><path d="M5 8h16M5 13h16M5 18h10" stroke="#bbf7d0" stroke-width="2" stroke-linecap="round"/></svg>`;
    paper.append(paperFront, paperBack);

    /* face plane */
    const faceHolder = grp(0, BY, BD / 2 + 1.4);
    const facePlane = div("m3-plane m3-faceplane", `left:${-BW / 2}px;top:${-BH / 2}px;width:${BW}px;height:${BH}px`);
    facePlane.innerHTML =
      `<svg viewBox="14 32 72 58" width="${BW}" height="${BH}" xmlns="${NS}">
        <path d="M24 47 Q21.5 56 24 65" stroke="#fff" stroke-opacity=".38" stroke-width="4" fill="none" stroke-linecap="round"/>
        <ellipse cx="24.5" cy="70" rx="6" ry="4" fill="${C.blush}" opacity=".95"/>
        <ellipse cx="75.5" cy="70" rx="6" ry="4" fill="${C.blush}" opacity=".95"/>
        ${Object.keys(FACES).map((n) => `<g class="m3-fg" data-mood="${n}" display="none">${FACES[n]}</g>`).join("")}
      </svg>`;
    faceHolder.appendChild(facePlane);

    /* fx plane (thought dots, "?", z's, stars, particles) floats further forward */
    const fxHolder = grp(0, 0, 36);
    const fxPlane = div("m3-plane m3-fxplane", "left:-50px;top:-50px;width:100px;height:100px");
    fxPlane.innerHTML =
      `<svg viewBox="0 0 100 100" width="100" height="100" xmlns="${NS}">
        ${Object.keys(FX).map((n) => `<g class="m3-fxg" data-for="${n}" display="none">${FX[n]}</g>`).join("")}
        <g class="m3-parts"></g>
      </svg>`;
    fxHolder.appendChild(fxPlane);

    squash.append(...feet, body, armR, armL, lid, paper, faceHolder);
    stage.append(squash, fxHolder);
    scene.appendChild(stage);
    scaler.append(shadow, scene);
    host.appendChild(scaler);

    const M = {
      host, stage, squash, shadow, front, paper, armR, armL,
      faces: [...facePlane.querySelectorAll(".m3-fg")],
      fxs: [...fxPlane.querySelectorAll(".m3-fxg")],
      looks: [...facePlane.querySelectorAll(".m3-look")].map((el) => [el, parseFloat(el.getAttribute("data-f")) || 1]),
      parts: fxPlane.querySelector(".m3-parts"),
      pl: [],
      mood, face: "", seed: rand(0, 6.28),
      // springs
      yaw: 0, yv: 0, pitch: 0, pv: 0, roll: 0, rv: 0,
      p: 0, sv2: 0, pt: 0, // spin angle / velocity / target
      hop: 0, hv: 0, s: 0, sv: 0,
      ex: 0, ey: 0, aR: -8, aL: 8, ga: 0, gv: 0, lift: 0,
      // state
      hover: false, pressed: false, sleeping: false, bound: false,
      waveUntil: 0, wowUntil: 0, dizzyUntil: 0, heartT: 1, clicks: [], spinDir: -1,
      act: null, lastAct: "", nextIdle: 0,
    };
    return M;
  }

  /* ------------------------------------------------------------------
     BEHAVIOUR
  ------------------------------------------------------------------- */
  const instances = new Set();
  const pointer = { x: innerWidth / 2, y: innerHeight / 2, t: now() };
  let raf = 0, last = 0, listening = false;

  function setFace(M, name) {
    M.faces.forEach((g) => g.setAttribute("display", g.getAttribute("data-mood") === name ? "inline" : "none"));
    M.fxs.forEach((g) => g.setAttribute("display", g.getAttribute("data-for") === name ? "inline" : "none"));
  }

  function faceFor(M, t) {
    if (t < M.dizzyUntil) return "dizzy";
    if (t < M.wowUntil) return "wow";
    if (M.act && M.act.face && M.mood === "happy" && !M.hover) return M.act.face;
    if (M.sleeping) return "sleepy";
    if (M.mood === "happy" && M.hover) return "joy";
    return M.mood;
  }

  function hop(M, v) {
    if (reduced()) return;
    if (M.hop < 1) M.hv = v;
  }
  function spin(M, dir) {
    if (reduced()) return;
    M.pt += 360 * (dir || 1);
  }
  function wake(M) {
    if (!M.sleeping) return;
    const t = now();
    M.sleeping = false;
    M.wowUntil = t + 0.9;
    hop(M, 125);
  }
  function emit(M, type, n, o) {
    if (reduced()) return;
    o = o || {};
    for (let i = 0; i < n; i++) {
      const el = document.createElementNS(NS, "path");
      el.setAttribute("d", type === "heart" ? HEART : STAR);
      el.setAttribute("fill", type === "heart" ? C.red : C.yellow);
      if (type === "star") {
        el.setAttribute("stroke", C.deep);
        el.setAttribute("stroke-width", ".7");
        el.setAttribute("stroke-linejoin", "round");
      }
      M.parts.appendChild(el);
      M.pl.push({
        el, type,
        x: 50 + rand(-16, 16), y: o.y || rand(12, 24),
        vx: o.still ? rand(-6, 6) : rand(-42, 42),
        vy: o.still ? rand(-26, -16) : rand(-85, -45),
        g: o.still ? 0 : 130,
        life: 1, rate: o.still ? 0.55 : 1.15,
        s: type === "heart" ? rand(1.1, 1.6) : rand(.8, 1.3), rot: rand(-30, 30), vr: rand(-120, 120),
      });
    }
  }
  function updateParticles(M, dt) {
    for (let i = M.pl.length - 1; i >= 0; i--) {
      const p = M.pl[i];
      p.life -= dt * p.rate;
      if (p.life <= 0) { p.el.remove(); M.pl.splice(i, 1); continue; }
      p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
      p.el.setAttribute("transform", `translate(${p.x.toFixed(2)} ${p.y.toFixed(2)}) rotate(${p.rot.toFixed(1)}) scale(${p.s.toFixed(2)})`);
      p.el.setAttribute("opacity", Math.min(1, p.life * 2.2).toFixed(2));
    }
  }

  /* ------------------------------------------------------------------
     IDLE ACTIONS
     When nobody is touching the page, Sugi picks something to do every few
     seconds so she never just stands there. Moving the mouse cancels it.
  ------------------------------------------------------------------- */
  const IDLE = [
    { name: "wave",    dur: 1.8 },
    { name: "hophop",  dur: 1.7, face: "joy" },
    { name: "spin",    dur: 1.8 },
    { name: "dance",   dur: 2.8, face: "joy" },
    { name: "stretch", dur: 2.5, face: "yawn" },
    { name: "yawn",    dur: 2.0, face: "yawn" },
    { name: "peek",    dur: 2.3 },
    { name: "sparkle", dur: 1.9, face: "wow" },
  ];

  function startIdle(M, t) {
    let def;
    do { def = IDLE[Math.floor(Math.random() * IDLE.length)]; } while (def.name === M.lastAct);
    M.lastAct = def.name;
    M.act = Object.assign({ t0: t, beat: -1, h2: false, h3: false }, def);
    if (def.name === "wave") M.waveUntil = t + 1.6;
    else if (def.name === "hophop") hop(M, 125);
    else if (def.name === "spin") { hop(M, 100); M.spinDir *= -1; spin(M, M.spinDir); }
    else if (def.name === "sparkle") { hop(M, 90); emit(M, "star", 5); }
  }

  // Returns overrides for this frame (yaw/pitch/roll in degrees, eyes, arms, stretch, paper lift).
  function idleFx(M, act, a) {
    const p = clamp(a / act.dur, 0, 1), e = Math.sin(Math.PI * p), o = {};
    switch (act.name) {
      case "dance": {
        o.roll = Math.sin(a * 9) * 9; o.yaw = Math.sin(a * 4.5) * 20; o.pitch = 0;
        o.aR = -55 + Math.sin(a * 9) * 32; o.aL = 55 + Math.sin(a * 9 + Math.PI) * 32;
        o.ex = Math.sin(a * 4.5) * 2; o.ey = 0;
        const beat = Math.floor(a / 0.34);
        if (beat !== act.beat) { act.beat = beat; hop(M, 55); }
        break;
      }
      case "stretch":
        o.aR = -160 * e; o.aL = 160 * e; o.stretch = 0.12 * e; o.pitch = 14 * e; o.yaw = 0; o.ex = 0; o.ey = -2 * e;
        break;
      case "yawn":
        o.pitch = 10 * e; o.yaw = 0; o.stretch = 0.05 * e; o.aR = -20 * e; o.aL = 20 * e; o.ex = 0; o.ey = 0;
        break;
      case "peek": // looks up at the paper on her own head, then fusses with it
        o.pitch = 24 * e; o.yaw = 0; o.ex = 0; o.ey = -3 * e; o.lift = 5 * e + Math.sin(a * 16) * 1.1 * e;
        break;
      case "hophop":
        if (!act.h2 && a > 0.6) { act.h2 = true; hop(M, 125); }
        if (!act.h3 && a > 1.15) { act.h3 = true; hop(M, 105); }
        o.aR = -35; o.aL = 35;
        break;
      case "sparkle":
        o.aR = -125 * e; o.aL = 125 * e;
        break;
    }
    return o;
  }

  function onClick(M) {
    const t = now();
    wake(M);
    M.clicks = M.clicks.filter((x) => t - x < 2.2);
    M.clicks.push(t);
    if (M.clicks.length >= 5) {
      M.clicks.length = 0;
      M.dizzyUntil = t + 2.6;
      M.yv += 650;
      hop(M, 150);
      emit(M, "star", 6);
    } else {
      hop(M, 150);
      M.spinDir *= -1;
      spin(M, M.spinDir);
      emit(M, "star", 4);
    }
  }

  function bind(M) {
    M.bound = true;
    const tg = M.host.closest("button,a") || M.host;
    const on = (type, fn) => { tg.addEventListener(type, fn); (M.off = M.off || []).push(() => tg.removeEventListener(type, fn)); };
    on("pointerenter", () => {
      M.hover = true; M.heartT = 1.1;
      M.waveUntil = now() + 1.4;
      hop(M, 75);
    });
    on("pointerleave", () => { M.hover = false; M.pressed = false; });
    on("pointerdown", () => { M.pressed = true; wake(M); });
    on("click", () => onClick(M));
    on("focus", () => { M.waveUntil = now() + 1.2; });
  }

  function step(M, dt, t) {
    const host = M.host;
    if (!host.isConnected) return;
    const r = host.getBoundingClientRect();
    if (!r.width || !r.height) return; // panel closed / display:none
    if (!M.bound) bind(M);

    const rm = reduced();
    const idle = t - pointer.t;

    /* sleep timer */
    if (!M.sleeping && M.mood === "happy" && idle > 22 && !rm) M.sleeping = true;

    const face = faceFor(M, t);
    if (face !== M.face) { M.face = face; setFace(M, face); }

    /* where is the cursor relative to Sugi? */
    const cx = r.left + r.width / 2, cy = r.top + r.height * 0.45;
    const dx = pointer.x - cx, dy = pointer.y - cy;
    const nx = clamp(dx / 260, -1, 1), ny = clamp(dy / 260, -1, 1);
    // Looking down is limited so we never stare straight onto the lid's top face
    // (it read as a floating square); looking up is free.
    let tYaw = nx * 44, tPitch = clamp(-ny * 26, -9, 26), tRoll = nx * 2.5;
    let tEx = clamp(dx / 180, -1, 1) * 3.4, tEy = clamp(dy / 180, -1, 1) * 2.6;

    /* wander when nobody is moving the mouse */
    if (idle > 3 && !M.sleeping && !rm) {
      const w = clamp((idle - 3) / 1.5, 0, 1);
      tYaw = lerp(tYaw, Math.sin(t * 0.7 + M.seed) * 24, w);
      tPitch = lerp(tPitch, Math.sin(t * 0.5 + M.seed * 2) * 7, w);
      tEx = lerp(tEx, Math.sin(t * 1.1 + M.seed) * 2.6, w);
      tEy = lerp(tEy, Math.sin(t * 0.8 + 1) * 1.6, w);
    }

    /* mood overrides */
    if (face === "thinking") { tYaw = lerp(tYaw, 24, 0.75); tPitch = lerp(tPitch, 15, 0.75); tRoll = -6; tEx = 2.6; tEy = -3; }
    else if (face === "confused") { tRoll = 8; tYaw += Math.sin(t * 2.4) * 7; tEx *= 0.5; }
    else if (face === "sleepy") { tYaw = Math.sin(t * 0.6 + M.seed) * 5; tPitch = -17; tRoll = 3; tEx = tEy = 0; }
    else if (face === "dizzy") { tYaw = Math.sin(t * 7) * 30; tPitch = Math.sin(t * 5) * 8; tRoll = Math.sin(t * 4.3) * 9; tEx = tEy = 0; }
    else if (face === "wow") { tPitch += 8; }
    /* idle actions */
    let ov = null;
    if (M.act) {
      const a = t - M.act.t0;
      if (a > M.act.dur || idle < 2.5 || M.mood !== "happy" || M.sleeping || M.hover || t < M.dizzyUntil) {
        M.act = null; M.nextIdle = t + rand(3.5, 6.5);
      } else ov = idleFx(M, M.act, a);
    } else if (idle < 3) {
      M.nextIdle = 0;
    } else if (!M.sleeping && M.mood === "happy" && !M.hover && !rm && t >= M.dizzyUntil) {
      if (!M.nextIdle) M.nextIdle = t + rand(1, 3);
      else if (t >= M.nextIdle) startIdle(M, t);
    }
    if (ov) {
      if (ov.yaw !== undefined) tYaw = ov.yaw;
      if (ov.pitch !== undefined) tPitch = ov.pitch;
      if (ov.roll !== undefined) tRoll = ov.roll;
      if (ov.ex !== undefined) tEx = ov.ex;
      if (ov.ey !== undefined) tEy = ov.ey;
    }
    if (rm) { tYaw *= 0.6; tPitch *= 0.6; }

    /* springs: head turn */
    const k = rm ? 400 : 140, c = rm ? 40 : 15;
    M.yv += (k * (tYaw - M.yaw) - c * M.yv) * dt; M.yaw += M.yv * dt;
    M.pv += (k * (tPitch - M.pitch) - c * M.pv) * dt; M.pitch += M.pv * dt;
    M.rv += (120 * (tRoll - M.roll) - 13 * M.rv) * dt; M.roll += M.rv * dt;

    /* spin (click) */
    M.sv2 += (80 * (M.pt - M.p) - 11 * M.sv2) * dt; M.p += M.sv2 * dt;
    if (Math.abs(M.pt - M.p) < 0.4 && Math.abs(M.sv2) < 2 && Math.abs(M.pt) >= 360) {
      const d = 360 * Math.round(M.pt / 360);
      M.pt -= d; M.p -= d;
    }
    const vtot = M.yv + M.sv2;

    /* hop + squash & stretch */
    if (M.hop > 0 || M.hv !== 0) {
      M.hv -= 560 * dt;
      M.hop += M.hv * dt;
      if (M.hop <= 0) {
        if (M.hv < -40) M.sv = -clamp(-M.hv / 50, 0.8, 2.6);
        M.hop = 0; M.hv = 0;
      }
    }
    const sTarget = M.pressed ? -0.14 : 0;
    M.sv += (260 * (sTarget - M.s) - 15 * M.sv) * dt; M.s += M.sv * dt;
    const breath = M.sleeping ? Math.sin(t * 1.1) * 0.03 : Math.sin(t * 2.2 + M.seed) * 0.012;
    const stretch = clamp(M.hv / 900, -0.04, 0.12) + ((ov && ov.stretch) || 0);
    const sy = 1 + M.s + stretch + (rm ? 0 : breath);
    const sx = 1 - (sy - 1) * 0.55;

    /* eyes */
    const e = Math.min(1, dt * 12);
    M.ex += (tEx - M.ex) * e; M.ey += (tEy - M.ey) * e;
    for (let i = 0; i < M.looks.length; i++) {
      const [el, f] = M.looks[i];
      el.style.transform = `translate(${(M.ex * f).toFixed(2)}px,${(M.ey * f).toFixed(2)}px)`;
    }

    /* arms */
    let aR = -8 + Math.sin(t * 1.7 + M.seed) * 2, aL = 8 - Math.sin(t * 1.7 + 1 + M.seed) * 2;
    const flare = Math.min(55, Math.abs(vtot) * 0.07);
    aR -= flare; aL += flare;
    if (face === "confused") { aR -= 42 + Math.sin(t * 9) * 5; aL += 42 + Math.sin(t * 9 + 1) * 5; }
    else if (face === "wow") { aR = -135 + Math.sin(t * 12) * 8; aL = 135 - Math.sin(t * 12 + 1) * 8; }
    else if (face === "dizzy") { aR = -50 + Math.sin(t * 6) * 40; aL = 50 + Math.sin(t * 6 + 2) * 40; }
    else if (face === "sleepy") { aR = -3; aL = 3; }
    else if (face === "joy" && t < M.waveUntil && !rm) { aR = -(140 + Math.sin(t * 16) * 22); }
    else if (t < M.waveUntil && !rm) { aR = -(140 + Math.sin(t * 16) * 22); }
    if (ov && ov.aR !== undefined) { aR = ov.aR; aL = ov.aL; }
    const ae = Math.min(1, dt * 14);
    M.aR += (aR - M.aR) * ae; M.aL += (aL - M.aL) * ae;
    M.armR.style.transform = `translate3d(37px,3px,0) rotateZ(${M.aR.toFixed(1)}deg)`;
    M.armL.style.transform = `translate3d(-37px,3px,0) rotateZ(${M.aL.toFixed(1)}deg)`;

    /* paper: floppy secondary motion + pops up when thinking / wow */
    const liftT = (face === "thinking" ? 3 + Math.sin(t * 6) * 1.4 : face === "wow" ? 6 : 0) + clamp(-M.hv * 0.03, -2, 4) + ((ov && ov.lift) || 0);
    M.lift += (liftT - M.lift) * Math.min(1, dt * 10);
    M.gv += (-170 * M.ga - 9 * M.gv - vtot * 0.045) * dt; M.ga = clamp(M.ga + M.gv * dt, -40, 40);
    M.paper.style.transform =
      `translate3d(0,${(-32 - M.lift).toFixed(2)}px,0) rotateZ(${(-6 + M.ga).toFixed(1)}deg) rotateY(${(rm ? 0 : Math.sin(t * 1.3 + M.seed) * 12).toFixed(1)}deg)`;

    /* hearts while being petted */
    if (face === "joy") {
      M.heartT -= dt;
      if (M.heartT <= 0) { M.heartT = rand(0.7, 1.1); emit(M, "heart", 1, { still: true, y: 26 }); }
    }
    updateParticles(M, dt);

    /* write the 3D transform */
    const roll = M.roll + clamp(vtot * 0.012, -12, 12);
    M.stage.style.transform =
      `translate3d(0,${(-M.hop).toFixed(2)}px,0) rotateX(${M.pitch.toFixed(2)}deg) rotateY(${(M.yaw + M.p).toFixed(2)}deg) rotateZ(${roll.toFixed(2)}deg)`;
    M.squash.style.transform = `scale3d(${sx.toFixed(4)},${sy.toFixed(4)},${sx.toFixed(4)})`;
    M.shadow.style.transform = `scale(${(1 - M.hop * 0.025).toFixed(3)})`;
    M.shadow.style.opacity = (0.95 - M.hop * 0.03).toFixed(2);

    /* light stays put while Sugi turns: slide the glint across the front */
    const hx = clamp(50 - (M.yaw + M.p) * 1.1, 0, 100);
    const hy = clamp(30 + M.pitch * 1.2, 0, 100);
    M.front.style.backgroundPosition = `${hx.toFixed(1)}% ${hy.toFixed(1)}%`;
  }

  function frame(ts) {
    raf = requestAnimationFrame(frame);
    const t = ts / 1000;
    const dt = Math.min(1 / 30, t - last);
    last = t;
    if (dt <= 0) return;
    instances.forEach((M) => step(M, dt, t));
  }

  function start() {
    if (!listening) {
      listening = true;
      window.addEventListener("pointermove", (e) => {
        pointer.x = e.clientX; pointer.y = e.clientY; pointer.t = now();
        instances.forEach((M) => { if (M.sleeping) wake(M); });
      }, { passive: true });
      window.addEventListener("pointerup", () => instances.forEach((M) => (M.pressed = false)), { passive: true });
      document.addEventListener("visibilitychange", () => {
        cancelAnimationFrame(raf);
        raf = 0;
        if (!document.hidden && instances.size) { last = performance.now() / 1000; raf = requestAnimationFrame(frame); }
      });
    }
    if (!raf && !document.hidden) { last = performance.now() / 1000; raf = requestAnimationFrame(frame); }
  }

  /* ------------------------------------------------------------------
     PUBLIC API
  ------------------------------------------------------------------- */
  function create(options) {
    options = options || {};
    injectCSS();
    const mood = ALL.includes(options.mood) ? options.mood : "happy";
    const size = options.size || 48;
    const M = build(mood, size);
    const host = M.host;
    host.setAttribute("data-mood", mood);

    if ("ResizeObserver" in window) {
      new ResizeObserver(() => {
        const w = host.clientWidth;
        if (w) host.style.setProperty("--s", w / 100);
      }).observe(host);
    }

    host.setMood = (next) => {
      if (!ALL.includes(next) || M.mood === next) return;
      const prev = M.mood;
      M.mood = next;
      host.setAttribute("data-mood", next);
      if (next !== "happy") M.sleeping = false;
      if (prev === "thinking" && next === "happy") {
        hop(M, 160); M.waveUntil = now() + 1.2; emit(M, "star", 6); emit(M, "heart", 2);
      } else if (next === "confused") {
        M.yv += (Math.random() < 0.5 ? -1 : 1) * 420;
      } else if (next === "thinking") {
        hop(M, 70);
      }
    };
    host.hop = () => hop(M, 150);
    host.spin = () => { M.spinDir *= -1; spin(M, M.spinDir); };
    host.wave = () => { M.waveUntil = now() + 1.6; };
    host.celebrate = () => { hop(M, 170); spin(M, 1); M.waveUntil = now() + 1.4; emit(M, "star", 7); emit(M, "heart", 3); };
    host.sleep = () => { if (M.mood === "happy") M.sleeping = true; };
    host.wake = () => wake(M);
    host.destroy = () => {
      (M.off || []).forEach((f) => f());
      instances.delete(M);
      host.remove();
    };

    instances.add(M);
    start();
    return host;
  }

  window.EssuMascot = { create, moods: ALL.slice() };
})();