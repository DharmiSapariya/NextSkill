import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, Plus, Save, KeyRound, Trash2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import * as api from "../../lib/api";
import { PageHeader, Card, Button, Input, Badge } from "../ui";
import Autocomplete from "../Autocomplete";
import { colorFor } from "../../lib/skillCategories";
import { useToast } from "../../context/ToastContext";

function SkillsCard() {
  const { user, refreshUser } = useAuth();
  const toast = useToast();
  const [skills, setSkills] = useState(user?.skills || []);
  const [input, setInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const addSkill = (value) => {
    const s = (value ?? input).trim();
    if (s && !skills.some((existing) => existing.toLowerCase() === s.toLowerCase())) setSkills([...skills, s]);
    setInput("");
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
      <h2 className="font-display text-base font-bold text-forest">Your skills</h2>
      <p className="mt-1 text-sm text-forest/55">Used as the default profile for reports, match score, and salary prediction.</p>

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

      <div className="mt-3 flex gap-2">
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

      <Button size="sm" onClick={handleSave} disabled={saving} className="mt-4">
        <Save className="h-3.5 w-3.5" /> {saving ? "Saving…" : saved ? "Saved" : "Save skills"}
      </Button>
    </Card>
  );
}

function PasswordCard() {
  const toast = useToast();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

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
        <Input
          label="Current password"
          type="password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          required
        />
        <Input
          label="New password"
          type="password"
          minLength={8}
          value={next}
          onChange={(e) => setNext(e.target.value)}
          required
        />
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

function DangerZoneCard() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [password, setPassword] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleDelete = async (e) => {
    e.preventDefault();
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
          {error && <p className="text-xs font-medium text-red-600">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" variant="danger" size="sm" disabled={loading}>
              {loading ? "Deleting…" : "Permanently delete"}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setConfirming(false)}>
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

      <div className="flex flex-col gap-6">
        <Card>
          <h2 className="font-display text-base font-bold text-forest">Profile</h2>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-forest/70">
            <span>{user?.email}</span>
            <Badge className="capitalize">{user?.tier} plan</Badge>
            {user?.is_admin && <Badge tone="lime">Admin</Badge>}
          </div>
        </Card>

        <SkillsCard />
        <PasswordCard />
        <DangerZoneCard />
      </div>
    </div>
  );
}
