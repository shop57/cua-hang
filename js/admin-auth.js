/**
 * ADMIN AUTH GATE
 * ------------------------------------------------------------------
 * Shows the login screen until Firebase confirms the visitor is
 * signed in with the admin account; only then does it reveal
 * #adminApp and run initAdmin() (from admin.js). Real access control
 * still happens on the server via Firestore Security Rules — this
 * file just controls what the browser shows and calls.
 * ------------------------------------------------------------------
 */

function showLoginScreen() {
  document.getElementById("loginScreen").style.display = "block";
  document.getElementById("adminApp").style.display = "none";
  document.getElementById("logoutBtn").style.display = "none";
}

function showAdminApp() {
  document.getElementById("loginScreen").style.display = "none";
  document.getElementById("adminApp").style.display = "block";
  document.getElementById("logoutBtn").style.display = "inline-flex";
}

let adminAppInitialized = false;

function initAdminAuth() {
  const form = document.getElementById("loginForm");
  const errorEl = document.getElementById("loginError");
  const submitBtn = document.getElementById("loginSubmitBtn");

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    errorEl.style.display = "none";
    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;
    submitBtn.disabled = true;
    submitBtn.textContent = "Đang đăng nhập...";

    window.auth.signInWithEmailAndPassword(email, password)
      .catch((err) => {
        errorEl.textContent = "Email hoặc mật khẩu không đúng.";
        errorEl.style.display = "block";
        console.error("Admin login failed:", err);
      })
      .finally(() => {
        submitBtn.disabled = false;
        submitBtn.textContent = "Đăng nhập";
      });
  });

  document.getElementById("logoutBtn").addEventListener("click", () => {
    window.auth.signOut();
  });

  window.auth.onAuthStateChanged((user) => {
    if (user) {
      showAdminApp();
      window.OrderStore.subscribe();
      if (!adminAppInitialized) {
        adminAppInitialized = true;
        window.initAdmin();
      }
    } else {
      showLoginScreen();
    }
  });
}

document.addEventListener("DOMContentLoaded", initAdminAuth);
