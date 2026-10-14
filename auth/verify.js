import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  sendEmailVerification,
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCjPjZbYnaCLtSCFFc4N9_4_0mM7imJ3IY",
  authDomain: "essuggest-f523e.firebaseapp.com",
  projectId: "essuggest-f523e",
  storageBucket: "essuggest-f523e.firebasestorage.app",
  messagingSenderId: "1014289838492",
  appId: "1:1014289838492:web:a157157f53259c29f8d859",
  measurementId: "G-HD8PB202TN",
};
const auth = getAuth(initializeApp(firebaseConfig));

/* ------------------------------------------------------------------
   SETTINGS
------------------------------------------------------------------- */
const LOGIN_URL = "/auth/LogIn.html"; // where to go if nobody is signed in
const NEXT_URL = "/auth/LogIn.html";  // where to go once the email is verified
const COOLDOWN = 60;                  // seconds between resends
const POLL_MS = 5000;                 // how often to quietly re-check verification
const CHECK_LABEL = "Verify Email";   // must match the button text in verify.html

/* ------------------------------------------------------------------
   ELEMENTS
------------------------------------------------------------------- */
const $ = (id) => document.getElementById(id);
const emailEl = $("sent-email");
const note = $("sent-note");
const resendBtn = $("resendBtn");
const checkBtn = $("checkBtn");

let verified = false;
let cooldownTimer = null;
let pollTimer = null;

/* ------------------------------------------------------------------
   UI HELPERS
------------------------------------------------------------------- */
function showNote(text, ok) {
  note.textContent = text;
  note.classList.toggle("is-ok", !!ok);
  note.classList.toggle("is-err", !ok && !!text);
}

function startCooldown(seconds) {
  clearInterval(cooldownTimer);
  let left = seconds;
  if (left <= 0) {
    resendBtn.disabled = false;
    resendBtn.textContent = "Resend email";
    return;
  }
  resendBtn.disabled = true;
  resendBtn.textContent = `Resend email (${left}s)`;
  cooldownTimer = setInterval(() => {
    left--;
    if (left <= 0) {
      clearInterval(cooldownTimer);
      resendBtn.disabled = false;
      resendBtn.textContent = "Resend email";
    } else {
      resendBtn.textContent = `Resend email (${left}s)`;
    }
  }, 1000);
}

function remainingCooldown() {
  // The first email was sent just before landing here. Remember when, so a refresh doesn't reset the timer.
  let sentAt = Number(sessionStorage.getItem("verifySentAt"));
  if (!sentAt) {
    sentAt = Date.now();
    sessionStorage.setItem("verifySentAt", String(sentAt));
  }
  return Math.max(0, COOLDOWN - Math.floor((Date.now() - sentAt) / 1000));
}

/* ------------------------------------------------------------------
   VERIFIED
------------------------------------------------------------------- */
function onVerified() {
  if (verified) return;
  verified = true;
  clearInterval(pollTimer);
  clearInterval(cooldownTimer);

  $("ve-title").textContent = "Email verified!";
  $("ve-lede").textContent = "You're all set. Taking you to log in…";
  showNote("", true);

  const s2 = $("step-2");
  const s3 = $("step-3");
  s2.classList.replace("is-now", "is-done");
  s2.removeAttribute("aria-current");
  $("step-2-dot").innerHTML =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  s3.classList.add("is-now");
  s3.setAttribute("aria-current", "step");

  checkBtn.disabled = true;
  resendBtn.disabled = true;
  checkBtn.textContent = "Verified";

  setTimeout(() => (window.location.href = NEXT_URL), 2400);
}

async function checkVerified(manual) {
  const user = auth.currentUser;
  if (!user || verified) return false;

  if (manual) {
    checkBtn.disabled = true;
    checkBtn.textContent = "Checking…";
    showNote("", true);
  }

  try {
    await user.reload();
  } catch (_) {
    if (manual) {
      showNote("Couldn't check right now. Please try again", false);
      checkBtn.disabled = false;
      checkBtn.textContent = CHECK_LABEL;
    }
    return false;
  }

  if (user.emailVerified) {
    onVerified();
    return true;
  }

  if (manual) {
    showNote("Not verified yet. Click the link in your email first", false);
    checkBtn.disabled = false;
    checkBtn.textContent = CHECK_LABEL;
  }
  return false;
}

/* ------------------------------------------------------------------
   EVENTS
------------------------------------------------------------------- */
checkBtn.addEventListener("click", () => checkVerified(true));

resendBtn.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return;

  showNote("", true);
  resendBtn.disabled = true;

  try {
    await sendEmailVerification(user, {
      url: window.location.origin + NEXT_URL,
    });
    sessionStorage.setItem("verifySentAt", String(Date.now()));
    showNote("Email sent again. Check your inbox", true);
    startCooldown(COOLDOWN);
  } catch (error) {
    showNote(
      error.code === "auth/too-many-requests"
        ? "Too many attempts. Try again later"
        : "Couldn't resend. Please try again",
      false
    );
    resendBtn.disabled = false;
  }
});

// quietly re-check when the student comes back from their inbox tab
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) checkVerified(false);
});

/* ------------------------------------------------------------------
   START
------------------------------------------------------------------- */
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = LOGIN_URL; // not signed in, nothing to verify
    return;
  }
  if (user.emailVerified) {
    onVerified();
    return;
  }
  emailEl.textContent = user.email || "";
  startCooldown(remainingCooldown());
  clearInterval(pollTimer);
  pollTimer = setInterval(() => checkVerified(false), POLL_MS);
});