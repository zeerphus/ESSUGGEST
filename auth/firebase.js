  // Import the functions you need from the SDKs you need
  import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
  import { getAuth } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
  import { getFirestore } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";
  import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-analytics.js";
  // TODO: Add SDKs for Firebase products that you want to use
  // https://firebase.google.com/docs/web/setup#available-libraries

  // Your web app's Firebase configuration
  // For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCjPjZbYnaCLtSCFFc4N9_4_0mM7imJ3IY",
  authDomain: "essuggest-f523e.firebaseapp.com",
  databaseURL: "https://essuggest-f523e-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "essuggest-f523e",
  storageBucket: "essuggest-f523e.firebasestorage.app",
  messagingSenderId: "1014289838492",
  appId: "1:1014289838492:web:a157157f53259c29f8d859",
  measurementId: "G-HD8PB202TN"
};

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  export const auth = getAuth(app);
  export const db = getFirestore(app); 
  const analytics = getAnalytics(app);
