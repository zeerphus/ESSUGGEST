/**
 * ESSUGGEST — team-gallery.js (aboutus.html only)
 * Makes the "The team behind ESSUGGEST" cards interactive without
 * changing their layout: hover zoom on the photo, and clicking a card
 * (or pressing Enter on its photo) opens a small viewer with a larger
 * photo, name, role, prev/next and close.
 *
 * Hook: put data-team-gallery on the flex container that holds the cards.
 * Each card needs an <img> and two <p> (name first, role second).
 * Add a member in the HTML and it's picked up automatically.
 *
 * Viewer controls: ← / → keys, Esc, swipe on touch, click outside to close.
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
      };
    })
    .filter(Boolean);
  if (!members.length) return;

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
    '<img class="team-dialog-photo" alt="" />' +
    '<button type="button" class="team-btn team-close" aria-label="Close">' + svg(ICON.close) + "</button>" +
    '<button type="button" class="team-btn team-prev" aria-label="Previous member">' + svg(ICON.prev) + "</button>" +
    '<button type="button" class="team-btn team-next" aria-label="Next member">' + svg(ICON.next) + "</button>" +
    "</div>" +
    '<div class="team-dialog-caption" aria-live="polite">' +
    '<div id="team-dialog-name" class="team-dialog-name"></div>' +
    '<div class="team-dialog-role"></div>' +
    '<div class="team-dialog-count"></div>' +
    "</div></div>";
  document.body.appendChild(dlg);

  const photo = dlg.querySelector(".team-dialog-photo");
  const nameEl = dlg.querySelector(".team-dialog-name");
  const roleEl = dlg.querySelector(".team-dialog-role");
  const countEl = dlg.querySelector(".team-dialog-count");
  const media = dlg.querySelector(".team-dialog-media");
  const prevBtn = dlg.querySelector(".team-prev");
  const nextBtn = dlg.querySelector(".team-next");

  let current = 0;
  let opener = null;

  function show(i) {
    current = (i + members.length) % members.length;
    const m = members[current];
    photo.src = m.img.currentSrc || m.img.src;
    photo.alt = m.img.alt;
    nameEl.textContent = m.name;
    roleEl.textContent = m.role;
    countEl.textContent = current + 1 + " of " + members.length;
  }

  function open(i, from) {
    opener = from;
    show(i);
    if (!dlg.open) dlg.showModal();
  }

  const step = (d) => show(current + d);

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
    m.card.classList.add("team-card", "card-float");

    // wrap the photo in a button so it's reachable by keyboard
    const holder = m.img.parentElement;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "team-photo-btn";
    btn.setAttribute("aria-label", "View larger photo of " + m.name);
    holder.appendChild(btn);
    btn.appendChild(m.img);

    // whole card is clickable; the button handles Enter/Space for keyboard users
    m.card.addEventListener("click", () => open(i, btn));
  });
})();