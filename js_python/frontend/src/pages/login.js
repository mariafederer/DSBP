const API_BASE = "";
const loginForm = document.getElementById("login-form");
const errorEl = document.getElementById("login-error");
const existingToken = localStorage.getItem("kanban_token");

if (existingToken) {
  window.location.href = "/";
}

function showError(message) {
  if (!errorEl) return;
  errorEl.textContent = message;
  errorEl.classList.remove("hidden");
}

function clearError() {
  if (!errorEl) return;
  errorEl.textContent = "";
  errorEl.classList.add("hidden");
}

async function handleLogin(event) {
  event.preventDefault();
  clearError();
  if (!loginForm) {
    return;
  }
  const formData = new FormData(loginForm);
  const usernameValue = formData.get("username");
  const passwordValue = formData.get("password");
  const payload = {
    username: usernameValue ? String(usernameValue).trim() : "",
    password: passwordValue ? String(passwordValue) : "",
  };

  if (!payload.username || !payload.password) {
    showError("Please enter your username and password.");
    return;
  }

  const submitButton = loginForm.querySelector("button[type='submit']");
  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = "Signing in...";
  }

  try {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const raw = await response.text();
      let message = raw;
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.detail) && parsed.detail.length) {
          message = parsed.detail[0].msg || message;
        } else if (parsed.detail) {
          message = parsed.detail;
        }
      } catch (error) {
        /* ignore parse error */
      }
      throw new Error(message || "Unable to sign in with those details.");
    }

    const data = await response.json();
    localStorage.setItem("kanban_token", data.access_token);
    window.location.href = "/";
  } catch (error) {
    showError(error.message);
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = "Log in";
    }
  }
}

if (loginForm) {
  loginForm.addEventListener("submit", handleLogin);
}
