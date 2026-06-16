function getRedirectTarget(fallback = "/") {
  const params = new URLSearchParams(window.location.search);
  const redirect = params.get("redirect");
  if (!redirect || !redirect.startsWith("/") || redirect.startsWith("//")) {
    return fallback;
  }
  return redirect;
}

function buildLoginUrl(redirect) {
  const url = new URL("/login", window.location.origin);
  if (redirect) url.searchParams.set("redirect", redirect);
  return `${url.pathname}${url.search}`;
}

function redirectToLogin(redirect) {
  const target = redirect || `${window.location.pathname}${window.location.search}`;
  window.location.href = buildLoginUrl(target);
}

function setFormFeedback(el, message, type = "error") {
  if (!el) return;
  el.textContent = message;
  el.className = `form-feedback form-feedback-${type}`;
  el.hidden = !message;
}

function initAuthTabs() {
  const tabs = document.querySelectorAll("[data-auth-tab]");
  const panels = document.querySelectorAll("[data-auth-panel]");
  if (!tabs.length) return;

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const name = tab.dataset.authTab;
      tabs.forEach((t) => t.classList.toggle("active", t.dataset.authTab === name));
      panels.forEach((panel) => {
        panel.hidden = panel.dataset.authPanel !== name;
      });
    });
  });
}

function initLoginPage() {
  const loginForm = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");
  const loginFeedback = document.getElementById("login-feedback");
  const registerFeedback = document.getElementById("register-feedback");
  const loginBtn = document.getElementById("login-submit-btn");
  const registerBtn = document.getElementById("register-submit-btn");

  initAuthTabs();

  (async () => {
    try {
      const user = await getCurrentUser();
      if (user) window.location.href = getRedirectTarget("/");
    } catch (_) {
      if (getStoredUser()) window.location.href = getRedirectTarget("/");
    }
  })();

  const params = new URLSearchParams(window.location.search);
  if (params.get("tab") === "register") {
    document.querySelector('[data-auth-tab="register"]')?.click();
  }

  loginForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("login-email")?.value.trim();
    const password = document.getElementById("login-password")?.value;

    if (!email || !password) {
      setFormFeedback(loginFeedback, "Please fill in all fields.");
      return;
    }

    if (loginBtn) {
      loginBtn.disabled = true;
      loginBtn.textContent = "Signing in…";
    }
    setFormFeedback(loginFeedback, "");

    try {
      await loginUser({ email, password });
      window.location.href = getRedirectTarget("/");
    } catch (err) {
      setFormFeedback(loginFeedback, err.message || "Sign in failed. Check your email and password.");
    } finally {
      if (loginBtn) {
        loginBtn.disabled = false;
        loginBtn.textContent = "Sign in";
      }
    }
  });

  registerForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("register-name")?.value.trim();
    const email = document.getElementById("register-email")?.value.trim();
    const password = document.getElementById("register-password")?.value;

    if (!name || !email || !password) {
      setFormFeedback(registerFeedback, "Please fill in all fields.");
      return;
    }
    if (password.length < 8) {
      setFormFeedback(registerFeedback, "Password must be at least 8 characters.");
      return;
    }

    if (registerBtn) {
      registerBtn.disabled = true;
      registerBtn.textContent = "Creating account…";
    }
    setFormFeedback(registerFeedback, "");

    try {
      const user = await registerUser({ name, email, password });
      if (user?.isEmailVerified || isPassrSuperAdmin(user)) {
        window.location.href = getRedirectTarget("/");
      } else {
        setFormFeedback(
          registerFeedback,
          "Account created. Check your email to verify your address, then sign in.",
          "success"
        );
        document.querySelector('[data-auth-tab="login"]')?.click();
      }
    } catch (err) {
      setFormFeedback(registerFeedback, err.message || "Registration failed. This email may already be in use.");
    } finally {
      if (registerBtn) {
        registerBtn.disabled = false;
        registerBtn.textContent = "Create account";
      }
    }
  });
}

function initForgotPasswordPage() {
  const form = document.getElementById("forgot-password-form");
  const feedback = document.getElementById("forgot-password-feedback");
  const submitBtn = document.getElementById("forgot-password-submit");

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("forgot-password-email")?.value.trim();
    if (!email) {
      setFormFeedback(feedback, "Enter the email address for your account.");
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Sending…";
    }
    setFormFeedback(feedback, "");

    try {
      const result = await requestPasswordReset(email);
      setFormFeedback(feedback, result.message || "If that email is registered, we sent a reset link.", "success");
      form.reset();
    } catch (err) {
      setFormFeedback(feedback, err.message || "Could not send reset email. Please try again.");
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Send reset link";
      }
    }
  });
}

function initResetPasswordPage() {
  const form = document.getElementById("reset-password-form");
  const feedback = document.getElementById("reset-password-feedback");
  const submitBtn = document.getElementById("reset-password-submit");
  const tokenInput = document.getElementById("reset-password-token");
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token") || "";

  if (tokenInput) tokenInput.value = token;

  if (!token) {
    setFormFeedback(feedback, "This reset link is invalid. Request a new one from the forgot password page.");
    if (submitBtn) submitBtn.disabled = true;
    return;
  }

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const password = document.getElementById("reset-password-new")?.value || "";
    const confirm = document.getElementById("reset-password-confirm")?.value || "";

    if (password.length < 8) {
      setFormFeedback(feedback, "Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setFormFeedback(feedback, "Passwords do not match.");
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Updating…";
    }
    setFormFeedback(feedback, "");

    try {
      const result = await resetPassword({ token, password });
      setFormFeedback(feedback, result.message || "Password updated.", "success");
      window.setTimeout(() => {
        window.location.href = buildLoginUrl("/profile");
      }, 1200);
    } catch (err) {
      setFormFeedback(feedback, err.message || "Could not reset password.");
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Update password";
      }
    }
  });
}

function initProfilePage() {
  const page = document.body.dataset.page;
  if (page !== "profile") return;
  loadProfilePage();
}

async function loadProfilePage() {
  const gate = document.getElementById("profile-gate");
  const content = document.getElementById("profile-content");
  let user = getStoredUser();

  try {
    user = await getCurrentUser();
  } catch (_) {
    if (!user) {
      redirectToLogin("/profile");
      return;
    }
  }

  if (!user) {
    redirectToLogin("/profile");
    return;
  }

  if (typeof populateProfileForm === "function") {
    populateProfileForm(user);
  }

  if (gate) gate.hidden = true;
  if (content) content.hidden = false;

  if (typeof updateAdminProfileSectionVisibility === "function") {
    updateAdminProfileSectionVisibility();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const page = document.body.dataset.page;
  if (page === "login") initLoginPage();
  else if (page === "forgot-password") initForgotPasswordPage();
  else if (page === "reset-password") initResetPasswordPage();
  else if (page === "profile") initProfilePage();
});
