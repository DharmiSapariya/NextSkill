import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { Input, Button } from "../ui";

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    try {
      await signup(email, password);
      navigate("/app", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen grid-cols-1 bg-cream lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-lime p-10 lg:flex">
        <Sparkles className="pointer-events-none absolute right-10 top-10 h-7 w-7 -rotate-12 text-forest/50" />
        <Link to="/" className="font-display text-2xl font-bold text-forest">
          NextSkill
        </Link>
        <div>
          <img src="/illustrations/8n.png" alt="" className="w-64 max-w-full" />
          <p className="mt-6 max-w-xs font-display text-2xl font-bold leading-tight text-forest">
            Free forever for individuals — no credit card required.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <Link to="/" className="mx-auto block w-fit font-display text-2xl font-bold text-forest lg:hidden">
            NextSkill
          </Link>

          <div className="mt-8 rounded-2xl border border-forest/10 bg-white/60 p-8 lg:mt-0">
            <h1 className="font-display text-xl font-bold text-forest">Create your free account</h1>
            <p className="mt-1 text-sm text-forest/60">
              Free forever for individuals — no credit card required.
            </p>

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
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
              />

              {error && <p className="text-xs font-medium text-red-600">{error}</p>}

              <Button type="submit" disabled={loading} className="mt-2 w-full">
                {loading ? "Creating account…" : "Get Your Free Skill Report"}
                {!loading && <ArrowRight className="h-4 w-4" />}
              </Button>
            </form>
          </div>

          <p className="mt-6 text-center text-sm text-forest/60">
            Already have an account?{" "}
            <Link to="/login" className="font-semibold text-forest underline underline-offset-2">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
