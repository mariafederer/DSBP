const API_BASE = "";
const registerForm = document.getElementById("register-form");
const errorEl = document.getElementById("register-error");

if (localStorage.getItem("kanban_token")) {
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

async function handleRegister(event) {
  event.preventDefault();
  clearError();

  if (!registerForm) {
    return;
  }

  const formData = new FormData(registerForm);
  const usernameValue = formData.get("username");
  const emailValue = formData.get("email");
  const passwordValue = formData.get("password");
  const payload = {
    username: usernameValue ? String(usernameValue).trim() : "",
    email: emailValue ? String(emailValue).trim() : "",
    password: passwordValue ? String(passwordValue) : "",
  };

  if (!payload.username || !payload.email || !payload.password) {
    showError("Please fill in all fields.");
    return;
  }

  const submitButton = registerForm.querySelector("button[type='submit']");
  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = "Creating account...";
  }

  try {
    const response = await fetch(`${API_BASE}/auth/register`, {
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
      throw new Error(message || "Unable to create your account right now.");
    }

    alert("Registration successful! You can now sign in.");
    window.location.href = "/login";
  } catch (error) {
    showError(error.message);
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = "Sign up";
    }
  }
}

if (registerForm) {
  registerForm.addEventListener("submit", handleRegister);
}
