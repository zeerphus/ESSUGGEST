/**
 * ESSUGGEST — Teamgallery.js (aboutus.html only)
 *
 * Hook: put data-team-gallery on the flex container that holds the cards.
 * Each card needs an <img> and two <p> (name first, role second), plus an
 * optional data-about attribute: that text is the contribution description
 * shown in the viewer. Add a member in the HTML and it's picked up.
 *
 * - Cards tilt toward the cursor with a soft light (mouse only)
 * - Click a card (or Enter on its photo) to open the viewer
 * - Viewer: larger photo, name, role, contribution, prev / next / close
 *   (← / → keys, Home / End, Esc, swipe, click outside to close)
 */
(function teamGallery() {
  const grid = document.querySelector("[data-team-gallery]");
  if (!grid || typeof HTMLDialogElement === "undefined") return;

  const members = [...grid.children]
    .map((card) => {
      const img = card.querySelector("img");
      const lines = card.querySelectorAll("p");
      if (!img || lines.length < 2) return null;
      return {
        card,
        img,
        name: lines[0].textContent.trim(),
        role: lines[1].textContent.trim(),
        about: (card.dataset.about || "").trim(),
      };
    })
    .filter(Boolean);
  if (!members.length) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  /* ------------------------------ viewer ------------------------------ */
  const ICON = {
    close: '<path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />',
    prev: '<path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />',
    next: '<path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />',
  };
  const svg = (p) =>
    '<svg aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">' +
    p +
    "</svg>";

  const dlg = document.createElement("dialog");
  dlg.className = "team-dialog font-dm";
  dlg.setAttribute("aria-labelledby", "team-dialog-name");
  dlg.innerHTML =
    '<div class="team-dialog-card">' +
    '<div class="team-dialog-media">' +
    '<img class="team-dialog-photo" alt="" draggable="false" />' +
    '<button type="button" class="team-btn team-close" aria-label="Close">' + svg(ICON.close) + "</button>" +
    '<button type="button" class="team-btn team-prev" aria-label="Previous member">' + svg(ICON.prev) + "</button>" +
    '<button type="button" class="team-btn team-next" aria-label="Next member">' + svg(ICON.next) + "</button>" +
    "</div>" +
    '<div class="team-dialog-caption" aria-live="polite">' +
    '<div id="team-dialog-name" class="team-dialog-name"></div>' +
    '<div class="team-dialog-role"></div>' +
    '<p class="team-dialog-about"></p>' +
    "</div></div>";
  document.body.appendChild(dlg);

  const photo = dlg.querySelector(".team-dialog-photo");
  const nameEl = dlg.querySelector(".team-dialog-name");
  const roleEl = dlg.querySelector(".team-dialog-role");
  const aboutEl = dlg.querySelector(".team-dialog-about");
  const captionEl = dlg.querySelector(".team-dialog-caption");
  const media = dlg.querySelector(".team-dialog-media");
  const prevBtn = dlg.querySelector(".team-prev");
  const nextBtn = dlg.querySelector(".team-next");

  let current = 0;
  let opener = null;

  function slide(el, dir, axis) {
    if (reduceMotion || !dir || !el.animate) return;
    const from = axis === "x" ? "translateX(" + dir * 36 + "px)" : "translateY(" + dir * 10 + "px)";
    el.animate(
      [{ opacity: 0, transform: from }, { opacity: 1, transform: "none" }],
      { duration: 320, easing: "cubic-bezier(0.16, 1, 0.3, 1)" }
    );
  }

  function show(i, dir) {
    current = (i + members.length) % members.length;
    const m = members[current];
    photo.src = m.img.currentSrc || m.img.src;
    photo.alt = m.img.alt;
    nameEl.textContent = m.name;
    roleEl.textContent = m.role;
    aboutEl.textContent = m.about;
    aboutEl.hidden = !m.about;
    slide(photo, dir, "x");
    slide(captionEl, dir, "y");
  }

  function open(i, from) {
    opener = from;
    show(i, 0);
    if (!dlg.open) dlg.showModal();
  }

  const step = (d) => show(current + d, d);

  if (members.length < 2) {
    prevBtn.hidden = true;
    nextBtn.hidden = true;
  }

  prevBtn.addEventListener("click", () => step(-1));
  nextBtn.addEventListener("click", () => step(1));
  dlg.querySelector(".team-close").addEventListener("click", () => dlg.close());

  // click on the dimmed backdrop (the <dialog> itself) closes
  dlg.addEventListener("click", (e) => {
    if (e.target === dlg) dlg.close();
  });

  dlg.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") step(-1);
    else if (e.key === "ArrowRight") step(1);
    else if (e.key === "Home") show(0, -1);
    else if (e.key === "End") show(members.length - 1, 1);
  });

  // swipe left/right on touch screens
  let startX = null;
  media.addEventListener("pointerdown", (e) => {
    startX = e.clientX;
  });
  media.addEventListener("pointerup", (e) => {
    if (startX === null) return;
    const dx = e.clientX - startX;
    startX = null;
    if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
  });

  dlg.addEventListener("close", () => {
    if (opener && opener.focus) opener.focus();
  });

  /* ------------------------------ cards ------------------------------- */
  members.forEach((m, i) => {
    const card = m.card;
    card.classList.add("team-card", "card-float");

    // inner wrapper takes the tilt, so it never fights the scroll-reveal
    // transform that lives on the card itself
    const tilt = document.createElement("div");
    tilt.className = "team-tilt";
    while (card.firstChild) tilt.appendChild(card.firstChild);
    card.appendChild(tilt);

    // wrap the photo in a button so it's reachable by keyboard
    const holder = m.img.parentElement;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "team-photo-btn";
    btn.setAttribute("aria-label", "View details for " + m.name);
    holder.appendChild(btn);
    btn.appendChild(m.img);

    // whole card is clickable; the button handles Enter/Space for keyboard users
    card.addEventListener("click", () => open(i, btn));

    // tilt toward the cursor, with a light that follows it
    if (finePointer && !reduceMotion) {
      card.addEventListener("pointermove", (e) => {
        if (e.pointerType !== "mouse") return;
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width;
        const y = (e.clientY - r.top) / r.height;
        card.style.setProperty("--ry", ((x - 0.5) * 8).toFixed(2) + "deg");
        card.style.setProperty("--rx", ((0.5 - y) * 8).toFixed(2) + "deg");
        card.style.setProperty("--mx", (x * 100).toFixed(1) + "%");
        card.style.setProperty("--my", (y * 100).toFixed(1) + "%");
        card.classList.add("is-tilting");
      });
      card.addEventListener("pointerleave", () => {
        card.classList.remove("is-tilting");
        card.style.removeProperty("--rx");
        card.style.removeProperty("--ry");
      });
    }
  });
})();