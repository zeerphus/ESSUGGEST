import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
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
function eye(e) {
  const wrapper = e.target.closest(".relative");
  const input = wrapper.querySelector("input");
  const eyecon = e.target.closest("svg");

  const eyeClosed = `<path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />`;
  const eyeOpen = `<path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                     <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />`;

  if (input.type === "password") {
    input.type = "text";
    eyecon.innerHTML = eyeClosed;
  } else {
    input.type = "password";
    eyecon.innerHTML = eyeOpen;
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
      window.location.href = "../main.html";
    }, 300);
  } catch (error) {
    // Loader finishes, THEN the error message appears
    await ensureMinLoading();

    message.style.color = "Red";
    switch (error.code) {
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

emailBox.addEventListener("input", function () {
  clearShake(emailBox);
});
passBox.addEventListener("input", function () {
  clearShake(passBox);
});

window.Login = Login;
window.eye = eye;