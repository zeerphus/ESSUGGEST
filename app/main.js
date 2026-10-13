/**
 * ESSUGGEST — Avatar colors
 * =========================================================================
 * One color per user, picked from their name. The same name always gets the
 * same color (no flicker between reloads, and a user looks the same in the
 * feed and in the sidebar). Every color is dark enough for white initials
 * and comes from the brand palette (greens, a deeper red, a dark gold) plus
 * a few matching accents.
 *
 * Use window.essuAvatarColor(name) anywhere you draw an avatar.
 */
const AVATAR_COLORS = [
  "#16A34A", // green-600
  "#15803D", // green-700
  "#166534", // green-800
  "#B91C1C", // deep red (darker take on #E22214)
  "#A16207", // dark gold (darker take on #f7ea7a)
  "#0F766E", // teal
  "#4D7C0F", // olive green
  "#9A3412", // burnt orange
];

window.essuAvatarColor = function (name) {
  let hash = 0;
  const str = (name || "").toLowerCase();
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

/**
 * ESSUGGEST — Feed (UI only)
 * =========================================================================
 * Renders the sample suggestions below into #feedContainer. No database
 * reads or writes. The three dots on each card are just an icon.
 */
(function suggestFeed() {
  const feedContainer = document.getElementById("feedContainer");
  if (!feedContainer) return;

  // ---- SAMPLE DATA (UI only) ----------------------------------------------
  const POSTS = [
    { name: "SkittleJam24", category: "Utilities", title: "Mabaho CR sa Comlab ang panghe !", text: "dapat pati cr isama sa classwork", up: 290, down: 13, comments: 78, posted: "Thu, Oct. 01, 2026 | 9:28 AM", own: true },
    { name: "Anonymous", category: "Facilities", title: "Add more electric fans in Room 204", text: "The room gets really hot in the afternoon, especially during long lab sessions.", up: 142, down: 6, comments: 31, posted: "Mon, Sep. 28, 2026 | 2:05 PM", own: false },
    { name: "BlueMango08", category: "Academics", title: "Extend library hours during exams", text: "Opening until 8 PM during exam week would help students who have no quiet place to study at home.", up: 205, down: 9, comments: 44, posted: "Fri, Sep. 25, 2026 | 10:40 AM", own: false },
  ];

  const SKELETON_MS = 600; // how long the loading shimmer shows; 0 to skip

  function initials(name) {
    if (!name) return "AN";
    return name.trim().split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str || "";
    return div.innerHTML;
  }

  function cardHtml(p) {
    return `
      <div class="flex items-start justify-between gap-2">
        <div class="flex items-center gap-3 sm:gap-4 min-w-0">
          <div class="w-11 h-11 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-white font-bold text-base sm:text-lg shrink-0" style="background-color:${window.essuAvatarColor(p.name)}">${initials(p.name)}</div>
          <div class="min-w-0">
            <p class="font-semibold text-base sm:text-lg leading-tight font-inter truncate">${escapeHtml(p.name)}</p>
            <p class="text-[11px] sm:text-xs text-gray-400 leading-tight mt-1 font-dm">Posted ${escapeHtml(p.posted)}</p>
          </div>
        </div>

        <span class="shrink-0 text-gray-300" aria-hidden="true">
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>
        </span>
      </div>

      <span class="inline-block max-w-full truncate align-top mt-3 text-xs font-medium px-2.5 py-1 rounded-full bg-green-50 text-green-700 font-jakarta">${escapeHtml(p.category)}</span>

      <h2 class="font-display font-700 text-base sm:text-lg mt-2.5 font-inter font-black break-words">${escapeHtml(p.title)}</h2>
      <p class="text-sm leading-relaxed mt-1.5 text-gray-500 font-dm break-words">${escapeHtml(p.text)}</p>

      <div class="flex items-center gap-2 mt-4">
        <div class="flex items-center gap-1 bg-green-50 rounded-full px-3 py-1.5 text-xs font-semibold text-green-700 font-dm">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke-width="1.5" class="solar solar-arrow-to-top-right-outline w-4 h-4"><path fill-rule="evenodd" clip-rule="evenodd" d="M6.46967 10.0303C6.17678 9.73744 6.17678 9.26256 6.46967 8.96967L11.4697 3.96967C11.7626 3.67678 12.2374 3.67678 12.5303 3.96967L17.5303 8.96967C17.8232 9.26256 17.8232 9.73744 17.5303 10.0303C17.2374 10.3232 16.7626 10.3232 16.4697 10.0303L12.75 6.31066L12.75 14.5C12.75 15.2133 12.9702 16.3 13.6087 17.1868C14.2196 18.0353 15.2444 18.75 17 18.75C17.4142 18.75 17.75 19.0858 17.75 19.5C17.75 19.9142 17.4142 20.25 17 20.25C14.7556 20.25 13.2804 19.298 12.3913 18.0632C11.5298 16.8667 11.25 15.4534 11.25 14.5L11.25 6.31066L7.53033 10.0303C7.23744 10.3232 6.76256 10.3232 6.46967 10.0303Z" fill="currentColor"/></svg>${p.up}
        </div>
        <div class="flex items-center gap-1 bg-gray-100 rounded-full px-3 py-1.5 text-xs font-semibold text-gray-500 font-dm">
          <svg xmlns="http://www.w3.org/2000/svg"  viewBox="0 0 24 24" fill="none" stroke-width="1.5" class="solar solar-arrow-to-down-left-outline w-4 h-4"><path fill-rule="evenodd" clip-rule="evenodd" d="M17.5303 13.9697C17.8232 14.2626 17.8232 14.7374 17.5303 15.0303L12.5303 20.0303C12.2374 20.3232 11.7626 20.3232 11.4697 20.0303L6.46967 15.0303C6.17678 14.7374 6.17678 14.2626 6.46967 13.9697C6.76256 13.6768 7.23744 13.6768 7.53033 13.9697L11.25 17.6893L11.25 9.5C11.25 8.78668 11.0298 7.70001 10.3913 6.81323C9.7804 5.96468 8.75556 5.25 7 5.25C6.58579 5.25 6.25 4.91421 6.25 4.5C6.25 4.08579 6.58579 3.75 7 3.75C9.24444 3.75 10.7196 4.70198 11.6087 5.93677C12.4702 7.13332 12.75 8.54665 12.75 9.5L12.75 17.6893L16.4697 13.9697C16.7626 13.6768 17.2374 13.6768 17.5303 13.9697Z" fill="currentColor"/></svg>${p.down}
        </div>
        <div class="flex items-center gap-1 bg-gray-100 rounded-full px-3 py-1.5 text-xs font-semibold text-gray-500 font-dm">
          <svg xmlns="http://www.w3.org/2000/svg"  viewBox="0 0 24 24" fill="none" stroke-width="1.5" class="solar solar-chat-round-outline w-4 h-4"><path fill-rule="evenodd" clip-rule="evenodd" d="M22.75 12C22.75 6.06294 17.9371 1.25 12 1.25C6.06294 1.25 1.25 6.06294 1.25 12C1.25 13.7183 1.65371 15.3445 2.37213 16.7869C2.47933 17.0021 2.50208 17.2219 2.4526 17.4068L1.857 19.6328C1.44927 21.1566 2.84337 22.5507 4.3672 22.143L6.59324 21.5474C6.77814 21.4979 6.99791 21.5207 7.21315 21.6279C8.65553 22.3463 10.2817 22.75 12 22.75C17.9371 22.75 22.75 17.9371 22.75 12ZM12 2.75C17.1086 2.75 21.25 6.89137 21.25 12C21.25 17.1086 17.1086 21.25 12 21.25C10.5189 21.25 9.12121 20.9025 7.88191 20.2852C7.38451 20.0375 6.78973 19.9421 6.20553 20.0984L3.97949 20.694C3.57066 20.8034 3.19663 20.4293 3.30602 20.0205L3.90163 17.7945C4.05794 17.2103 3.96254 16.6155 3.7148 16.1181C3.09752 14.8788 2.75 13.4811 2.75 12C2.75 6.89137 6.89137 2.75 12 2.75Z" fill="currentColor"/></svg>${p.comments}
        </div>
      </div>`;
  }

  function renderFeed() {
    feedContainer.innerHTML = "";
    POSTS.forEach((p) => {
      const article = document.createElement("article");
      article.className = "bg-white rounded-2xl border p-4 sm:p-5 hover:shadow-md transition border-gray-200";
      article.innerHTML = cardHtml(p);
      feedContainer.appendChild(article);
    });
  }

  window.setTimeout(renderFeed, SKELETON_MS);
})();

/**
 * ESSUGGEST — Sidebar profile
 * =========================================================================
 * Fills in #profile-name / #profile-avatar with whoever is actually
 * signed in, instead of a hardcoded placeholder name. The avatar color is
 * picked from the name (see window.essuAvatarColor at the top of this file).
 */
(function suggestProfile() {
  const nameEl = document.getElementById("profile-name");
  const avatarEl = document.getElementById("profile-avatar");
  if (!nameEl || !avatarEl) return;

  init();

  async function init() {
    const { auth } = await import("../auth/firebase.js");
    const { onAuthStateChanged } = await import(
      "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js"
    );

    onAuthStateChanged(auth, (user) => {
      const name =
        (user && (user.displayName || user.email)) ||
        sessionStorage.getItem("username") ||
        "Guest";

      nameEl.textContent = name;
      avatarEl.textContent = initials(name);

      // Inline style beats the placeholder bg-[#a63f3f] class in the HTML.
      const color = window.essuAvatarColor(name);
      avatarEl.style.backgroundColor = color;

      // Same user, same color on the Profile panel avatar.
      const panelAvatar = document.getElementById("profile-panel-avatar");
      if (panelAvatar) panelAvatar.style.backgroundColor = color;

      const emailEl = document.getElementById("profile-email");
      if (emailEl) emailEl.textContent = (user && user.email) || "";
    });
  }

  function initials(name) {
    if (!name) return "?";
    return name.trim().split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  }
})();

/**
 * ESSUGGEST — Navigation menu
 * =========================================================================
 * Dropdown opened by the settings button in the header.
 * Shows the signed-in user, and handles Log out / Log in.
 */
(function navMenu() {
  const wrap = document.getElementById("nav-menu-wrap");
  const toggle = document.getElementById("nav-toggle");
  const menu = document.getElementById("nav-menu");
  if (!wrap || !toggle || !menu) return;

  // Where to send people after logging out (your login/landing page).
  const LOGIN_PAGE = "/auth/LogIn.html";

  const nameEl = document.getElementById("nav-user-name");
  const emailEl = document.getElementById("nav-user-email");
  const logoutBtn = document.getElementById("nav-logout");
  const loginLink = document.getElementById("nav-login");

  function openMenu() {
    menu.classList.remove("hidden");
    toggle.setAttribute("aria-expanded", "true");
  }

  function closeMenu() {
    menu.classList.add("hidden");
    toggle.setAttribute("aria-expanded", "false");
  }

  toggle.addEventListener("click", () => {
    menu.classList.contains("hidden") ? openMenu() : closeMenu();
  });

  // Close on outside click / Esc
  document.addEventListener("click", (e) => {
    if (!wrap.contains(e.target)) closeMenu();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMenu();
  });

  // Close after choosing a link
  menu.querySelectorAll("a").forEach((a) => a.addEventListener("click", closeMenu));

  init();

  async function init() {
    const { auth } = await import("../auth/firebase.js");
    const { onAuthStateChanged, signOut } = await import(
      "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js"
    );

    onAuthStateChanged(auth, (user) => {
      nameEl.textContent =
        (user && (user.displayName || user.email)) ||
        sessionStorage.getItem("username") ||
        "Guest";
      emailEl.textContent = (user && user.email) || "";

      logoutBtn.classList.toggle("hidden", !user);
      loginLink.classList.toggle("hidden", !!user);
    });

    logoutBtn.addEventListener("click", async () => {
      logoutBtn.disabled = true;
      logoutBtn.textContent = "Logging out...";
      try {
        await signOut(auth);
        sessionStorage.clear();
        window.location.href = LOGIN_PAGE;
      } catch (err) {
        console.error("Logout failed:", err);
        logoutBtn.disabled = false;
        logoutBtn.textContent = "Log out";
        alert("Could not log out. Please try again.");
      }
    });
  }
})();

/**
 * ESSUGGEST — Dark mode toggle
 * =========================================================================
 * Two buttons share this logic (both have the .theme-toggle class):
 *   #theme-toggle-nav   in the top bar, tablet + desktop (sm and up)
 *   #theme-toggle-menu  in the settings dropdown, phones only
 * The new theme spreads out from whichever button was clicked as a growing
 * circle (View Transitions API). Falls back to an instant swap on browsers
 * without it, or when the user prefers reduced motion. The choice is saved
 * in localStorage; the tiny script in <head> of the HTML applies it before
 * first paint.
 */
(function themeToggle() {
  const KEY = "essuggest-theme";
  const root = document.documentElement;
  const buttons = document.querySelectorAll(".theme-toggle");
  if (!buttons.length) return;

  const isDark = () => root.classList.contains("dark");
  const sync = () =>
    buttons.forEach((b) => b.setAttribute("aria-checked", String(isDark())));

  function apply(dark) {
    root.classList.toggle("dark", dark);
    try { localStorage.setItem(KEY, dark ? "dark" : "light"); } catch (e) {}
    sync();
  }

  function toggleFrom(btn) {
    const next = !isDark();
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!document.startViewTransition || reduce) {
      apply(next);
      return;
    }

    // Spread from the clicked button (the switch pill, if the button has one)
    const origin = btn.querySelector(".theme-switch") || btn;
    const r = origin.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    const radius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );

    const transition = document.startViewTransition(() => apply(next));
    transition.ready.then(() => {
      root.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: 600, easing: "ease-in-out", pseudoElement: "::view-transition-new(root)" }
      );
    });
  }

  buttons.forEach((b) => b.addEventListener("click", () => toggleFrom(b)));
  sync();
})();
