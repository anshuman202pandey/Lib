(function () {
  "use strict";

  const form = document.querySelector("#login-form");
  const registrationInput = document.querySelector("#registration-number");
  const passwordInput = document.querySelector("#password");
  const passwordToggle = document.querySelector("#password-toggle");
  const counter = document.querySelector("#registration-counter");
  const feedback = document.querySelector("#login-feedback");
  const submitButton = document.querySelector("#login-submit");

  if (
    !form ||
    !registrationInput ||
    !passwordInput ||
    !passwordToggle ||
    !counter ||
    !feedback ||
    !submitButton
  )
    return;

  function setFeedback(message = "") {
    feedback.textContent = message;
  }

  function validateRegistration() {
    const isValid = /^\d{10}$/.test(registrationInput.value);
    registrationInput.setAttribute(
      "aria-invalid",
      String(!isValid && registrationInput.value.length > 0),
    );
    return isValid;
  }

  function updateRegistrationInput() {
    registrationInput.value = registrationInput.value
      .replace(/\D/g, "")
      .slice(0, 10);
    counter.textContent = `${registrationInput.value.length} / 10`;
    counter.classList.toggle(
      "is-complete",
      registrationInput.value.length === 10,
    );
    validateRegistration();
    setFeedback();
  }

  registrationInput.addEventListener("input", updateRegistrationInput);
  passwordInput.addEventListener("input", () => {
    passwordInput.setAttribute("aria-invalid", "false");
    setFeedback();
  });

  passwordToggle.addEventListener("click", () => {
    const showPassword = passwordInput.type === "password";
    passwordInput.type = showPassword ? "text" : "password";
    passwordToggle.textContent = showPassword ? "Hide" : "Show";
    passwordToggle.setAttribute("aria-pressed", String(showPassword));
    passwordInput.focus();
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const registrationNumber = registrationInput.value;

    if (!validateRegistration()) {
      setFeedback("Enter a registration number with exactly 10 digits.");
      registrationInput.focus();
      return;
    }

    if (!passwordInput.value.trim()) {
      passwordInput.setAttribute("aria-invalid", "true");
      setFeedback("Enter a password to continue.");
      passwordInput.focus();
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "Signing you in…";
    setFeedback("");
    LibraryData.setSession(registrationNumber);
    window.location.href = "libsys.html";
  });

  if (LibraryData.getSession()) {
    window.location.replace("libsys.html");
  }
})();
