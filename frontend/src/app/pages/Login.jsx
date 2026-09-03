import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Sparkles, Eye, EyeOff, FileSearch, DollarSign, TrendingUp } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { Input, Button } from "../ui";

const TAGLINES = [
  "Every recommendation traces back to a real job posting.",
  "See exactly which skills close your gap — and why.",
  "Salary ranges pulled from real postings, not guesses.",
  "Track how skill demand shifts over time.",
];

const FEATURES = [
  { icon: FileSearch, label: "Evidence-backed" },
  { icon: DollarSign, label: "Real salary data" },
  { icon: TrendingUp, label: "Demand trends" },
];

function FloatingCircle({ size, top, left, delay, color }) {
  return (
    <motion.span
      className="pointer-events-none absolute rounded-full"
      style={{ width: size, height: size, top, left, backgroundColor: color, opacity: 0.35 }}
      animate={{ y: [0, -14, 0], x: [0, 8, 0] }}
      transition={{ duration: 7 + delay, repeat: Infinity, ease: "easeInOut", delay }}
    />
  );
}

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [taglineIndex, setTaglineIndex] = useState(0);
  const [shake, setShake] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTaglineIndex((i) => (i + 1) % TAGLINES.length), 3800);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate(location.state?.from || "/app", { replace: true });
    } catch (err) {
      setError(err.message);
      setShake((n) => n + 1);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen grid-cols-1 bg-cream lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-periwinkle p-10 lg:flex">
        <FloatingCircle size={140} top="-40px" left="-40px" delay={0} color="var(--lime)" />
        <FloatingCircle size={90} top="60%" left="80%" delay={1.2} color="var(--coral)" />
        <FloatingCircle size={60} top="20%" left="70%" delay={2.4} color="var(--cream)" />
        <Sparkles className="pointer-events-none absolute right-10 top-10 h-7 w-7 -rotate-12 text-lime" />

        <Link to="/" className="relative font-display text-2xl font-bold text-forest">
          NextSkill
        </Link>

        <div className="relative">
          <motion.img
            src="/illustrations/11n.png"
            alt=""
            className="w-64 max-w-full"
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          />

          <div className="mt-6 h-20 max-w-xs">
            <AnimatePresence mode="wait">
              <motion.p
                key={taglineIndex}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4 }}
                className="font-display text-2xl font-bold leading-tight text-forest"
              >
                {TAGLINES[taglineIndex]}
              </motion.p>
            </AnimatePresence>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {FEATURES.map((f) => (
              <span
                key={f.label}
                className="flex items-center gap-1.5 rounded-full bg-white/50 px-3 py-1.5 text-xs font-semibold text-forest"
              >
                <f.icon className="h-3.5 w-3.5" /> {f.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <Link to="/" className="mx-auto block w-fit font-display text-2xl font-bold text-forest lg:hidden">
            NextSkill
          </Link>

          <motion.div
            key={shake}
            initial={{ opacity: 0, y: 12 }}
            animate={shake > 0 ? { opacity: 1, y: 0, x: [0, -8, 8, -6, 6, 0] } : { opacity: 1, y: 0 }}
            transition={{ duration: shake > 0 ? 0.4 : 0.3 }}
            className="mt-8 rounded-2xl border border-forest/10 bg-white/60 p-8 lg:mt-0"
          >
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

              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-forest/70">Password</span>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="h-11 w-full rounded-xl border border-forest/15 bg-white px-4 pr-11 text-sm text-forest outline-none transition-colors placeholder:text-forest/35 focus:border-forest/40"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-forest/40 hover:text-forest/70"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </label>

              <AnimatePresence>
                {error && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="text-xs font-medium text-red-600"
                  >
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>

              <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
                <Button type="submit" disabled={loading} className="mt-2 w-full">
                  {loading ? "Logging in…" : "Log in"}
                  {!loading && <ArrowRight className="h-4 w-4" />}
                </Button>
              </motion.div>
            </form>
          </motion.div>

          <p className="mt-6 text-center text-sm text-forest/60">
            New to NextSkill?{" "}
            <Link to="/signup" className="font-semibold text-forest underline underline-offset-2">
              Create a free account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
