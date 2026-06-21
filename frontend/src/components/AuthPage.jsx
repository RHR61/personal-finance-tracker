import React, { useState } from "react";
import { LockKeyhole, LogIn, UserPlus } from "lucide-react";

export default function AuthPage({ error, onLogin, onRegister }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({
    username: "",
    identifier: "",
    password: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isRegistering = mode === "register";

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      if (isRegistering) {
        await onRegister({
          username: form.username,
          email: form.identifier,
          password: form.password,
        });
      } else {
        await onLogin({ identifier: form.identifier, password: form.password });
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="auth-mark">
          <LockKeyhole aria-hidden="true" size={24} />
        </div>
        <p>Personal Finance Tracker</p>
        <h1>{isRegistering ? "Create your account" : "Welcome back"}</h1>

        <div className="auth-tabs" aria-label="Authentication mode">
          <button
            className={!isRegistering ? "active" : ""}
            onClick={() => setMode("login")}
            type="button"
          >
            Login
          </button>
          <button
            className={isRegistering ? "active" : ""}
            onClick={() => setMode("register")}
            type="button"
          >
            Register
          </button>
        </div>

        {error ? <div className="error-banner">{error}</div> : null}

        <form className="auth-form" onSubmit={handleSubmit}>
          {isRegistering ? (
            <label>
              Username
              <input
                minLength="3"
                name="username"
                onChange={updateField}
                placeholder="rashi"
                required
                type="text"
                value={form.username}
              />
            </label>
          ) : null}

          <label>
            {isRegistering ? "Email" : "Username or email"}
            <input
              name="identifier"
              onChange={updateField}
              placeholder={isRegistering ? "you@example.com" : "rashi or you@example.com"}
              required
              type={isRegistering ? "email" : "text"}
              value={form.identifier}
            />
          </label>

          <label>
            Password
            <input
              maxLength="128"
              minLength="8"
              name="password"
              onChange={updateField}
              placeholder="At least 8 characters"
              required
              type="password"
              value={form.password}
            />
          </label>

          <button className="primary-button" disabled={isSubmitting} type="submit">
            {isRegistering ? <UserPlus aria-hidden="true" size={18} /> : <LogIn aria-hidden="true" size={18} />}
            {isSubmitting ? "Working..." : isRegistering ? "Create account" : "Login"}
          </button>
        </form>
      </section>
    </main>
  );
}
