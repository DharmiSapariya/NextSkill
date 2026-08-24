import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiPost } from "../lib/api";
import { useAuth } from "../lib/AuthContext";

export default function Login() {
  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const { login, isLoggedIn } = useAuth();
  const navigate = useNavigate();

  if (isLoggedIn) {
    navigate("/account");
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const path = mode === "login" ? "/auth/login" : "/auth/signup";
    const { ok, status, data } = await apiPost(path, { email, password });
    setSubmitting(false);
    if (ok) {
      login(data.access_token);
      navigate("/account");
    } else {
      setError(
        status === 429
          ? "Too many attempts — wait a minute and try again."
          : data?.detail || "Something went wrong."
      );
    }
  }

  return (
    <section className="mx-auto max-w-sm px-6 py-24">
      <h1 className="text-2xl font-bold text-ink">
        {mode === "login" ? "Log in" : "Sign up"}
      </h1>

      <div className="mt-4 flex gap-4 text-sm">
        <button
          className={mode === "login" ? "font-semibold text-primary" : "text-ink/50"}
          onClick={() => setMode("login")}
        >
          Log in
        </button>
        <button
          className={mode === "signup" ? "font-semibold text-primary" : "text-ink/50"}
          onClick={() => setMode("signup")}
        >
          Sign up
        </button>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3">
        <input
          type="email"
          required
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded border border-black/20 px-3 py-2"
        />
        <input
          type="password"
          required
          minLength={8}
          maxLength={72}
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded border border-black/20 px-3 py-2"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-primary px-4 py-2 font-semibold text-white disabled:opacity-50"
        >
          {submitting ? "Please wait…" : mode === "login" ? "Log in" : "Sign up"}
        </button>
      </form>
    </section>
  );
}
