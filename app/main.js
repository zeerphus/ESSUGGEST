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

  const avatarColors = ["bg-orange-600", "bg-amber-500", "bg-green-500", "bg-teal-600", "bg-blue-600", "bg-rose-500"];
  function colorFor(name) {
    let hash = 0;
    const str = name || "";
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    return avatarColors[Math.abs(hash) % avatarColors.length];
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
          <div class="w-11 h-11 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-white font-bold text-base sm:text-lg shrink-0 ${colorFor(p.name)}">${initials(p.name)}</div>
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
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path d="M12 19V5M5 12l7-7 7 7"/></svg>${p.up}
        </div>
        <div class="flex items-center gap-1 bg-gray-100 rounded-full px-3 py-1.5 text-xs font-semibold text-gray-500 font-dm">
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12l7 7 7-7"/></svg>${p.down}
        </div>
        <div class="flex items-center gap-1 bg-gray-100 rounded-full px-3 py-1.5 text-xs font-semibold text-gray-500 font-dm">
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg>${p.comments}
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
 * signed in, instead of a hardcoded placeholder name.
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
  const LOGIN_PAGE = "../auth/login.html";

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