import { db } from "../auth/firebase.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

const STAFF_ACCESS_DOC = doc(db, "config", "staffAccess");

const form = document.getElementById("staff-access-form");
const usernameInput = document.getElementById("staff-username");
const passcodeInput = document.getElementById("staff-passcode");
const messageEl = document.getElementById("message");
const submitBtn = document.getElementById("submit");

function setMessage(text, isError = true) {
  messageEl.textContent = text;
  messageEl.classList.toggle("text-red-600", isError);
  messageEl.classList.toggle("text-green-600", !isError);
}

function setLoading(isLoading) {
  submitBtn.disabled = isLoading;
  submitBtn.textContent = isLoading ? "Checking..." : "Log In";
}

async function sha256Hex(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  setMessage("");

  const username = usernameInput.value.trim();
  const passcode = passcodeInput.value.trim();
  if (!username || !passcode) return setMessage("Please enter both a username and a passcode.");

  setLoading(true);
  try {
    const snap = await getDoc(STAFF_ACCESS_DOC);
    if (!snap.exists()) return setMessage("Staff access is not configured. Contact the administrator.");

    const data = snap.data();
    const passcodeHash = await sha256Hex(passcode);
    console.log("stored:", data.username, data.passcodeHash);
    console.log("typed:", username, passcodeHash);

    if (data.username === username && data.passcodeHash === passcodeHash) {
      setMessage("Access granted. Redirecting...", false);
      window.location.href="/auth/supadD.html"
    } else {
      setMessage("That username or passcode doesn't look right. Try again.");
    }
  } catch (err) {
    console.error("Staff access check failed:", err);
    setMessage("Something went wrong. Please try again.");
  } finally {
    setLoading(false);
  }
});