import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendEmailVerification,
  signOut,
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

// --- Firebase setup ---
const firebaseConfig = {
  apiKey: "AIzaSyCjPjZbYnaCLtSCFFc4N9_4_0mM7imJ3IY",
  authDomain: "essuggest-f523e.firebaseapp.com",
  projectId: "essuggest-f523e",
  storageBucket: "essuggest-f523e.firebasestorage.app",
  messagingSenderId: "1014289838492",
  appId: "1:1014289838492:web:a157157f53259c29f8d859",
  measurementId: "G-HD8PB202TN"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/* ---------- Loader settings (ldrs <l-mirage>) ---------- */
// The <l-mirage> element is registered by the script tag in the HTML.
const LOADER_HTML = `<l-mirage size="50" speed="2.5" color="white"></l-mirage>`;
// Firebase can answer in ~100ms, which would make the loader flash and vanish.
// This keeps it visible for at least this long so the animation is actually seen.
const MIN_LOADING_MS = 800;
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/* ---------- Password visibility toggle ---------- */
// Solar "eye-closed" icon (shown while the password is visible, click to hide)
const EYE_CLOSED = `<path d="M12 14.0001V16.5001M15.5872 13.3288L17 15.5001M8.41281 13.3288L7 15.5001M19 11.1289L20.5 12.6289M5 11.1289L3.5 12.6289" stroke="currentColor" stroke-linecap="round" style="color: var(--solar-secondary-color, currentColor); opacity: var(--solar-secondary-opacity, 0.5)"/><path d="M2 7C2 7 5 14 12 14C13.34 14 14.5334 13.7435 15.5872 13.3287C16.9547 12.7904 18.0872 11.9856 19 11.1288C21.0586 9.19661 22 7 22 7" stroke="currentColor" stroke-linecap="round"/>`;

// Solar "eye" icon (shown while the password is hidden, click to show)
const EYE_OPEN = `<path d="M3.27489 15.2957C2.42496 14.1915 2 13.6394 2 12C2 10.3606 2.42496 9.80853 3.27489 8.70433C4.97196 6.49956 7.81811 4 12 4C16.1819 4 19.028 6.49956 20.7251 8.70433C21.575 9.80853 22 10.3606 22 12C22 13.6394 21.575 14.1915 20.7251 15.2957C19.028 17.5004 16.1819 20 12 20C7.81811 20 4.97196 17.5004 3.27489 15.2957Z" stroke="currentColor" stroke-linecap="round" style="color: var(--solar-secondary-color, currentColor); opacity: var(--solar-secondary-opacity, 0.5)"/><path d="M15 12C15 13.6569 13.6569 15 12 15C10.3431 15 9 13.6569 9 12C9 10.3431 10.3431 9 12 9C13.6569 9 15 10.3431 15 12Z" stroke="currentColor" stroke-linecap="round"/>`;

function eye(e) {
  const wrapper = e.target.closest(".relative");
  const input = wrapper.querySelector("input");
  const icon = e.target.closest("svg");

  if (input.type === "password") {
    input.type = "text";
    icon.innerHTML = EYE_CLOSED;
  } else {
    input.type = "password";
    icon.innerHTML = EYE_OPEN;
  }
}

function shake(input) {
  input.classList.add("input-error", "input-shake");
  setTimeout(() => {
    input.classList.remove("input-shake");
  }, 400);
}

function clearShake(input) {
  input.classList.remove("input-error");
}

const emailBox = document.getElementById("email");
const passBox = document.getElementById("password");
const eyecon = document.getElementById("eyecon");

async function Login(e) {
  e.preventDefault();

  const getEmail = emailBox.value.trim();
  const getPass = passBox.value;
  const message = document.getElementById("message");

  message.textContent = "";

  if (getEmail === "" && getPass === "") {
    message.textContent = "Email and Password are required";
    message.style.color = "Red";
    shake(emailBox);
    shake(passBox);
    shake(eyecon);
    return;
  } else if (getEmail === "") {
    message.textContent = "Please enter your email";
    message.style.color = "Red";
    shake(emailBox);
    return;
  } else if (getPass === "") {
    message.textContent = "Please enter your password";
    message.style.color = "Red";
    shake(eyecon);
    shake(passBox);
    return;
  }

  const submitBtn = e.target.querySelector('button[type="submit"]');
  const originalBtnText = submitBtn ? submitBtn.textContent : "";

  // Show the loader inside the button (the message stays empty while loading)
  const startedAt = Date.now();
  const ensureMinLoading = () =>
    wait(Math.max(0, MIN_LOADING_MS - (Date.now() - startedAt)));

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.setAttribute("aria-label", "Logging in");
    submitBtn.innerHTML = LOADER_HTML;
  }

  try {
    const userCredential = await signInWithEmailAndPassword(auth, getEmail, getPass);
    const user = userCredential.user;
    const userRef = doc(db, "users", user.uid);

    if (!user.emailVerified) {
      await sendEmailVerification(user); // resend, so they're never stuck
      await signOut(auth);
      throw { code: "app/email-not-verified" };
    }

    // Only await the read — we need this data before redirecting
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      sessionStorage.setItem("userProfile", JSON.stringify(userSnap.data()));
    } else {
      console.log("No Firestore profile found for this user yet.");
    }

    // Fire-and-forget: don't make the user wait on this write
    setDoc(userRef, { lastLogin: serverTimestamp() }, { merge: true })
      .catch((err) => console.log("lastLogin update failed:", err));

    // Loader finishes, THEN the result message appears
    await ensureMinLoading();

    message.textContent = "Login Successful";
    message.style.color = "Green";
    if (submitBtn) {
      submitBtn.removeAttribute("aria-label");
      submitBtn.textContent = "Redirecting..."; // replaces the loader
    }

    setTimeout(() => {
      window.location.href = "/app/main.html";
    }, 300);
  } catch (error) {
    // Loader finishes, THEN the error message appears
    await ensureMinLoading();

    message.style.color = "Red";
    switch (error.code) {
      case "app/email-not-verified":
        message.textContent = "Please verify your email first.";
        break;
      case "auth/invalid-email":
        message.textContent = "Please enter your email";
        shake(emailBox);
        break;
      case "auth/user-not-found":
      case "auth/invalid-credential":
        message.textContent = "Incorrect Email or Password";
        shake(emailBox);
        shake(passBox);
        shake(eyecon);
        break;
      case "auth/wrong-password":
        message.textContent = "Incorrect Email or Password";
        shake(passBox);
        shake(eyecon);
        break;
      case "auth/too-many-requests":
        message.textContent = "Too many attempts. Try again later";
        break;
      default:
        message.textContent = "Something went wrong: " + error.message;
        console.log(error);
    }
    if (submitBtn) {
      submitBtn.removeAttribute("aria-label");
      submitBtn.textContent = originalBtnText; // replaces the loader
    }
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
}

/* ---------- Continue with Google ---------- */
const googleBtn = document.getElementById("googleBtn");
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

async function googleLogin() {
  const message = document.getElementById("message");
  const originalHTML = googleBtn.innerHTML;
  message.textContent = "";

  googleBtn.disabled = true;
  googleBtn.innerHTML = `<l-mirage size="50" speed="2.5" color="#16a34a"></l-mirage>`;

  try {
    // Must be called directly from the click handler, or the browser blocks the popup
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    const userRef = doc(db, "users", user.uid);

    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      // Existing user: behaves like your normal login
      sessionStorage.setItem("userProfile", JSON.stringify(userSnap.data()));
      setDoc(userRef, { lastLogin: serverTimestamp() }, { merge: true })
        .catch((err) => console.log("lastLogin update failed:", err));
    } else {
      // First time with Google: this is the "sign up"
      const profile = {
        name: user.displayName || "",
        email: user.email,
        photoURL: user.photoURL || "",
        provider: "google",
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
      };
      await setDoc(userRef, profile);
      sessionStorage.setItem("userProfile", JSON.stringify({
        ...profile,
        createdAt: null,
        lastLogin: null,
      }));
    }

    message.textContent = "Login Successful";
    message.style.color = "Green";
    googleBtn.textContent = "Redirecting...";
    setTimeout(() => (window.location.href = "/app/main.html"), 300);
  } catch (error) {
    message.style.color = "Red";
    switch (error.code) {
      case "auth/popup-closed-by-user":
      case "auth/cancelled-popup-request":
        message.textContent = ""; // user just closed it, no error needed
        break;
      case "auth/popup-blocked":
        message.textContent = "Popup blocked. Please allow popups and try again";
        break;
      case "auth/account-exists-with-different-credential":
        message.textContent = "An account with this email already exists";
        break;
      case "auth/network-request-failed":
        message.textContent = "Network error. Check your connection";
        break;
      default:
        message.textContent = "Google sign-in failed: " + error.message;
        console.log(error);
    }
    googleBtn.innerHTML = originalHTML;
    googleBtn.disabled = false;
  }
}

googleBtn.addEventListener("click", googleLogin);

emailBox.addEventListener("input", function () {
  clearShake(emailBox);
});
passBox.addEventListener("input", function () {
  clearShake(passBox);
});

window.Login = Login;
window.eye = eye;

/* ---------- Video volume control ---------- */
const bgVideo = document.getElementById("bgVideo");
const muteBtn = document.getElementById("muteBtn");
const volIcon = document.getElementById("volIcon");
const volumeSlider = document.getElementById("volumeSlider");

const ICON_MUTED = `<path stroke-linecap="round" stroke-linejoin="round" d="M17.25 9.75 19.5 12m0 0 2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6 4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />`;
const ICON_SOUND = `<path stroke-linecap="round" stroke-linejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />`;

let lastVolume = 0.5; // volume restored when the user un-mutes

function syncVolumeUI() {
  const silent = bgVideo.muted || bgVideo.volume === 0;
  volIcon.innerHTML = silent ? ICON_MUTED : ICON_SOUND;
  volumeSlider.value = silent ? 0 : bgVideo.volume;
  muteBtn.setAttribute("aria-label", silent ? "Unmute video" : "Mute video");
}

if (bgVideo && muteBtn && volumeSlider) {
  bgVideo.volume = lastVolume;

  muteBtn.addEventListener("click", () => {
    if (bgVideo.muted || bgVideo.volume === 0) {
      bgVideo.muted = false;
      bgVideo.volume = lastVolume;
    } else {
      lastVolume = bgVideo.volume;
      bgVideo.muted = true;
    }
    syncVolumeUI();
  });

  volumeSlider.addEventListener("input", () => {
    const v = parseFloat(volumeSlider.value);
    bgVideo.volume = v;
    bgVideo.muted = v === 0;
    if (v > 0) lastVolume = v;
    syncVolumeUI();
  });

  syncVolumeUI();
}