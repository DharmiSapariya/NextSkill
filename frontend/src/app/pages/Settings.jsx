import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Save, KeyRound, Trash2, Eye, EyeOff, RotateCcw, Crown, Check, Layers } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import * as api from "../../lib/api";
import { PageHeader, Card, Button, Input, Badge } from "../ui";
import Autocomplete from "../Autocomplete";
import { colorFor, categoryFor, CATEGORY_COLORS } from "../../lib/skillCategories";
import { useToast } from "../../context/ToastContext";

const TIER_FEATURES = [
  { label: "Report history kept", free: "20 most recent", pro: "100 most recent" },
  { label: "Evidence postings per gap skill", free: "3", pro: "10" },
];

function SkillMix({ skills }) {
  if (skills.length === 0) return null;
  const counts = {};
  skills.forEach((s) => {
    const cat = categoryFor(s);
    counts[cat] = (counts[cat] || 0) + 1;
  });
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const total = skills.length;

  return (
    <div className="mt-4">
      <div className="flex h-2 overflow-hidden rounded-full bg-forest/8">
        {entries.map(([cat, n]) => (
          <motion.div
            key={cat}
            initial={{ width: 0 }}
            animate={{ width: `${(n / total) * 100}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            style={{ backgroundColor: CATEGORY_COLORS[cat] || CATEGORY_COLORS.Other }}
          />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-forest/50">
        {entries.map(([cat, n]) => (
          <span key={cat} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[cat] || CATEGORY_COLORS.Other }} />
            {cat} · {n}
          </span>
        ))}
      </div>
    </div>
  );
}

function SkillsCard() {
  const { user, refreshUser } = useAuth();
  const toast = useToast();
  const [skills, setSkills] = useState(user?.skills || []);
  const [input, setInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const isDirty = useMemo(() => {
    const a = [...skills].map((s) => s.toLowerCase()).sort();
    const b = [...(user?.skills || [])].map((s) => s.toLowerCase()).sort();
    return JSON.stringify(a) !== JSON.stringify(b);
  }, [skills, user?.skills]);

  const addSkill = (value) => {
    const s = (value ?? input).trim();
    if (s && !skills.some((existing) => existing.toLowerCase() === s.toLowerCase())) setSkills([...skills, s]);
    setInput("");
  };

  const discard = () => {
    setSkills(user?.skills || []);
  };

  const skillOptions = (query) =>
    api
      .getSkills({ q: query, limit: 8 })
      .then((res) => res.results.map((s) => s.name).filter((n) => !skills.some((s) => s.toLowerCase() === n.toLowerCase())))
      .catch(() => []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await api.updateMySkills(skills);
      await refreshUser();
      setSaved(true);
      toast.success(`Saved ${skills.length} skill${skills.length === 1 ? "" : "s"} to your profile`);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      toast.error("Couldn't save your skills — try again");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 font-display text-base font-bold text-forest">
            <Layers className="h-4 w-4" /> Your skills
          </h2>
          <p className="mt-1 text-sm text-forest/55">Used as the default profile for reports, match score, and salary prediction.</p>
        </div>
        <AnimatePresence>
          {isDirty && (
            <motion.span
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="rounded-full bg-amber/50 px-2.5 py-1 text-[11px] font-semibold text-forest"
            >
              Unsaved changes
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {skills.map((s) => (
          <span
            key={s}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-forest"
            style={{ backgroundColor: colorFor(s), opacity: 0.9 }}
          >
            {s}
            <button type="button" onClick={() => setSkills(skills.filter((x) => x !== s))} className="text-forest/50 hover:text-forest">
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        ))}
        {skills.length === 0 && <span className="text-sm text-forest/40">No skills yet.</span>}
      </div>

      <SkillMix skills={skills} />

      <div className="mt-4 flex gap-2">
        <Autocomplete
          className="flex-1"
          value={input}
          onChange={setInput}
          onSelect={(s) => addSkill(s)}
          onEnter={() => addSkill()}
          getOptions={skillOptions}
          placeholder="Add a skill and press Enter"
          inputClassName="h-10"
        />
        <Button type="button" variant="secondary" size="sm" onClick={() => addSkill()}>
          <Plus className="h-4 w-4" /> Add
        </Button>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <Button size="sm" onClick={handleSave} disabled={saving || !isDirty} className="disabled:opacity-40">
          <Save className="h-3.5 w-3.5" /> {saving ? "Saving…" : saved ? "Saved" : "Save skills"}
        </Button>
        {isDirty && (
          <Button size="sm" variant="ghost" onClick={discard} disabled={saving}>
            <RotateCcw className="h-3.5 w-3.5" /> Discard changes
          </Button>
        )}
      </div>
    </Card>
  );
}

function passwordStrength(pw) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return Math.min(score, 4);
}

const STRENGTH_LABELS = ["Too short", "Weak", "Okay", "Good", "Strong"];
const STRENGTH_COLORS = ["rgba(20,38,28,0.12)", "var(--coral)", "var(--amber)", "var(--sky)", "var(--lime)"];

function PasswordCard() {
  const toast = useToast();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const strength = passwordStrength(next);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus(null);
    setLoading(true);
    try {
      await api.changePassword(current, next);
      setStatus({ ok: true, message: "Password updated." });
      toast.success("Password updated");
      setCurrent("");
      setNext("");
    } catch (err) {
      setStatus({ ok: false, message: err.message });
      toast.error(err.message || "Couldn't update password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <h2 className="flex items-center gap-2 font-display text-base font-bold text-forest">
        <KeyRound className="h-4 w-4" /> Change password
      </h2>
      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3 sm:max-w-sm">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-forest/70">Current password</span>
          <div className="relative">
            <input
              type={showCurrent ? "text" : "password"}
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              required
              className="h-11 w-full rounded-xl border border-forest/15 bg-white px-4 pr-11 text-sm text-forest outline-none focus:border-forest/40"
            />
            <button
              type="button"
              onClick={() => setShowCurrent((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-forest/40 hover:text-forest/70"
              aria-label={showCurrent ? "Hide password" : "Show password"}
            >
              {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-forest/70">New password</span>
          <div className="relative">
            <input
              type={showNext ? "text" : "password"}
              minLength={8}
              value={next}
              onChange={(e) => setNext(e.target.value)}
              required
              className="h-11 w-full rounded-xl border border-forest/15 bg-white px-4 pr-11 text-sm text-forest outline-none focus:border-forest/40"
            />
            <button
              type="button"
              onClick={() => setShowNext((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-forest/40 hover:text-forest/70"
              aria-label={showNext ? "Hide password" : "Show password"}
            >
              {showNext ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {next.length > 0 && (
            <div>
              <div className="mt-1 flex gap-1">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-1.5 flex-1 rounded-full transition-colors"
                    style={{ backgroundColor: i < strength ? STRENGTH_COLORS[strength] : "rgba(20,38,28,0.08)" }}
                  />
                ))}
              </div>
              <p className="mt-1 text-[11px] text-forest/45">{STRENGTH_LABELS[strength]}</p>
            </div>
          )}
        </label>

        {status && (
          <p className={`text-xs font-medium ${status.ok ? "text-emerald-700" : "text-red-600"}`}>{status.message}</p>
        )}
        <Button type="submit" size="sm" disabled={loading} className="self-start">
          {loading ? "Updating…" : "Update password"}
        </Button>
      </form>
    </Card>
  );
}

function PlanCard({ user }) {
  const isPro = user?.tier === "pro";
  return (
    <Card>
      <div className="flex items-center gap-2 text-forest/70">
        <Crown className="h-4 w-4" />
        <span className="font-kicker text-xs uppercase tracking-widest">Plan</span>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <span className="font-display text-lg font-bold capitalize text-forest">{user?.tier ?? "free"}</span>
        {isPro && <Badge tone="lime">Active</Badge>}
        {user?.is_admin && <Badge tone="periwinkle">Admin</Badge>}
      </div>

      <div className="mt-4 flex flex-col divide-y divide-forest/10">
        {TIER_FEATURES.map((f) => (
          <div key={f.label} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
            <span className="text-sm text-forest/70">{f.label}</span>
            <span className="flex items-center gap-1.5 text-sm font-semibold text-forest">
              <Check className="h-3.5 w-3.5 text-forest/40" />
              {isPro ? f.pro : f.free}
            </span>
          </div>
        ))}
      </div>
      {!isPro && (
        <p className="mt-4 text-xs text-forest/45">
          Pro accounts keep more report history and see more evidence postings per gap skill. Ask an admin to upgrade your account.
        </p>
      )}
    </Card>
  );
}

function DangerZoneCard() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const canDelete = password.length > 0 && confirmText.trim().toUpperCase() === "DELETE";

  const handleDelete = async (e) => {
    e.preventDefault();
    if (!canDelete) return;
    setLoading(true);
    setError(null);
    try {
      await api.deleteAccount(password);
      logout();
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-red-200 bg-red-50/50">
      <h2 className="font-display text-base font-bold text-red-700">Delete account</h2>
      <p className="mt-1 text-sm text-red-700/70">
        Permanently deletes your account, history, and any published report links. This cannot be undone.
      </p>

      {!confirming ? (
        <Button variant="danger" size="sm" onClick={() => setConfirming(true)} className="mt-4">
          <Trash2 className="h-3.5 w-3.5" /> Delete my account
        </Button>
      ) : (
        <form onSubmit={handleDelete} className="mt-4 flex flex-col gap-3 sm:max-w-sm">
          <Input
            label="Confirm your password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Input
            label='Type "DELETE" to confirm'
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            required
          />
          {error && <p className="text-xs font-medium text-red-600">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" variant="danger" size="sm" disabled={loading || !canDelete}>
              {loading ? "Deleting…" : "Permanently delete"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setConfirming(false);
                setPassword("");
                setConfirmText("");
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}

export default function Settings() {
  const { user } = useAuth();

  return (
    <div>
      <PageHeader kicker="Account" title="Settings" description="Manage your profile, skills, and account." />

      <div className="mb-8 flex flex-wrap items-center justify-between gap-6 overflow-hidden rounded-2xl border border-forest/10 bg-amber/20 px-6 py-6 sm:px-8">
        <div>
          <span className="font-kicker text-xs uppercase tracking-widest text-forest/50">Account</span>
          <p className="mt-2 max-w-xl font-display text-xl font-bold text-forest sm:text-2xl">
            {user?.email ? `Signed in as ${user.email}` : "Manage your account"} — {user?.skills?.length ?? 0} skill
            {user?.skills?.length === 1 ? "" : "s"} on file.
          </p>
        </div>
        <img src="/illustrations/16n.png" alt="" className="hidden h-28 w-28 shrink-0 object-contain sm:block" />
      </div>

      <div className="flex flex-col gap-6">
        <SkillsCard />
        <PlanCard user={user} />
        <PasswordCard />
        <DangerZoneCard />
      </div>
    </div>
  );
}
