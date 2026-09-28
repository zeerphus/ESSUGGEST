import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import {
  getFirestore,
  doc,
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

/* ---------- Loader settings (ldrs <l-mirage>) — same as Login.js ---------- */
// The <l-mirage> element is registered by the script tag in the HTML.
const LOADER_HTML = `<l-mirage size="50" speed="2.5" color="white"></l-mirage>`;
// Firebase can answer in ~100ms, which would make the loader flash and vanish.
// This keeps it visible for at least this long so the animation is actually seen.
const MIN_LOADING_MS = 800;
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function eye(e) {
  const wrapper = e.target.closest(".relative");
  const input = wrapper.querySelector("input");
  const eyeconS = e.target.closest("svg");

  const eyeClosed = `<path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />`;
  const eyeOpen = `<path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                     <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />`;

  if (input.type === "password") {
    input.type = "text";
    eyeconS.innerHTML = eyeClosed;
  } else {
    input.type = "password";
    eyeconS.innerHTML = eyeOpen;
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

function checkPassword(value) {
  const hasLength = value.length >= 8;
  const hasUpper = /[A-Z]/.test(value);
  const hasLower = /[a-z]/.test(value);
  const hasNumber = /[0-9]/.test(value);
  const hasSpecial = /[^A-Za-z0-9]/.test(value);
  
  setRule("len", hasLength);
  setRule("upper", hasUpper);
  setRule("lower", hasLower);
  setRule("num", hasNumber);
  setRule("special", hasSpecial);

  return hasLength && hasUpper && hasLower && hasNumber && hasSpecial;
}

function setRule(ruleName, passed) {
  const item = document.querySelector('#reqs li[data-rule="' + ruleName + '"]');
  if (!item) return;

  const dot = item.querySelector(".req-dot");

  if (passed) {
    item.classList.add("req-met");
    dot.classList.add("req-met");
  } else {
    item.classList.remove("req-met");
    dot.classList.remove("req-met");
  }
}

const passBox = document.getElementById("password");
const pass2Box = document.getElementById("password2");
const emailBox = document.getElementById("email");

passBox.addEventListener("input", function () {
  clearShake(passBox);
  checkPassword(passBox.value);
});

pass2Box.addEventListener("input", function () {
  clearShake(pass2Box);
});

emailBox.addEventListener("input", function () {
  clearShake(emailBox);
});

async function SignUp(e) {
  e.preventDefault();

  const message = document.getElementById("message");

  const emailVal = emailBox.value.trim();
  const passVal = passBox.value;
  const pass2Val = pass2Box.value;

  message.textContent = "";

  const emailOk =
    emailVal !== "" && emailVal.includes("@") && emailVal.includes(".");
  const passwordOk = checkPassword(passVal);
  const matchOk = pass2Val !== "" && pass2Val === passVal;

  if (!emailOk) {
    message.textContent = "Please enter a valid email";
    message.style.color = "Red";
    shake(emailBox);
    return;
  }

  if (!passwordOk) {
    message.textContent = "Password does not meet all requirements";
    message.style.color = "Red";
    shake(passBox);
    shake(eyeconS);
    return;
  }

  if (!matchOk) {
    message.textContent = "Passwords do not match";
    message.style.color = "Red";
    shake(pass2Box);
    shake(eyecon);
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
    submitBtn.setAttribute("aria-label", "Creating account");
    submitBtn.innerHTML = LOADER_HTML;
  }

  try {
    // --- Step 1: Create the Auth account ---
    const userCredential = await createUserWithEmailAndPassword(auth, emailVal, passVal);
    const user = userCredential.user;

    // --- Step 2: Create the matching Firestore profile doc ---
    // Doc id = uid, so login.js can look it up the same way
    await setDoc(doc(db, "users", user.uid), {
      email: user.email,
      createdAt: serverTimestamp(),
      lastLogin: serverTimestamp(),
    });

    // Loader finishes, THEN the result message appears
    await ensureMinLoading();

    message.textContent = "Account created successfully";
    message.style.color = "Green";
    if (submitBtn) {
      submitBtn.removeAttribute("aria-label");
      submitBtn.textContent = "Redirecting to login..."; // replaces the loader
    }

    setTimeout(() => {
      // File is named LogIn.html — casing must match exactly on Cloudflare
      window.location.href = "../auth/LogIn.html";
    }, 500);
  } catch (error) {
    // Loader finishes, THEN the error message appears
    await ensureMinLoading();

    message.style.color = "Red";
    switch (error.code) {
      case "auth/email-already-in-use":
        message.textContent = "That email is already registered";
        shake(emailBox);
        break;
      case "auth/invalid-email":
        message.textContent = "Please enter a valid email";
        shake(emailBox);
        break;
      case "auth/weak-password":
        message.textContent = "Password is too weak";
        shake(passBox);
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

// Expose to global scope so it works with onsubmit="SignUp(event)" in HTML
window.SignUp = SignUp;
window.eye = eye;