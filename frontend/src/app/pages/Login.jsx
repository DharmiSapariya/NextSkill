import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { Input, Button } from "../ui";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate(location.state?.from || "/app", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-6">
      <div className="w-full max-w-sm">
        <Link to="/" className="mx-auto block w-fit font-display text-2xl font-bold text-forest">
          NextSkill
        </Link>

        <div className="mt-8 rounded-2xl border border-forest/10 bg-white/60 p-8">
          <h1 className="font-display text-xl font-bold text-forest">Welcome back</h1>
          <p className="mt-1 text-sm text-forest/60">Log in to see your skill-gap reports.</p>

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
            <Input
              label="Email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
            <Input
              label="Password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />

            {error && <p className="text-xs font-medium text-red-600">{error}</p>}

            <Button type="submit" disabled={loading} className="mt-2 w-full">
              {loading ? "Logging in…" : "Log in"}
              {!loading && <ArrowRight className="h-4 w-4" />}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-forest/60">
          New to NextSkill?{" "}
          <Link to="/signup" className="font-semibold text-forest underline underline-offset-2">
            Create a free account
          </Link>
        </p>
      </div>
    </div>
  );
}
