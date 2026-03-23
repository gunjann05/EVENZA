// ---------------- FIREBASE IMPORTS ----------------
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.11/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/9.6.11/firebase-auth.js";

// ---------------- FIREBASE CONFIG ----------------
// 🔥 Replace these values with YOUR Firebase config
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_BUCKET",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// ----------- LOGIN BUTTON HANDLER -----------
document.getElementById("loginBtn").addEventListener("click", () => {
  const email = document.getElementById("loginEmail").value;
  const pass = document.getElementById("loginPass").value;

  signInWithEmailAndPassword(auth, email, pass)
    .then(() => {
      alert("Login Successful!");

      // Redirect to your existing Admin Page
      window.location.href = "admin_dashboard.html"; 
    })
    .catch((error) => {
      alert("Login Failed: " + error.message);
    });
});
