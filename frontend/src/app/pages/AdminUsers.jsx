import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpDown,
  Trash2,
  ShieldCheck,
  Crown,
  Users,
  AlertTriangle,
  X,
} from "lucide-react";
import * as api from "../../lib/api";
import { PageHeader, Card, Button, Input, Badge, LoadingState, ErrorState, EmptyState } from "../ui";
import { useToast } from "../../context/ToastContext";

const PAGE_SIZE = 20;

const FILTERS = [
  { key: "all", label: "All" },
  { key: "pro", label: "Pro" },
  { key: "free", label: "Free" },
  { key: "admin", label: "Admins" },
];

const AVATAR_COLORS = ["var(--periwinkle)", "var(--lime)", "var(--coral)", "var(--sky)", "var(--amber)", "var(--violet)"];

function avatarColor(email) {
  let hash = 0;
  for (let i = 0; i < email.length; i++) hash = (hash * 31 + email.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function initials(email) {
  const name = (email || "?").split("@")[0];
  return name.slice(0, 2).toUpperCase();
}

function timeAgo(dateString) {
  if (!dateString) return "—";
  const diffMs = Date.now() - new Date(dateString).getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays <= 0) return "today";
  if (diffDays === 1) return "yesterday";
  if (diffDays < 30) return `${diffDays}d ago`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths}mo ago`;
  return `${Math.floor(diffMonths / 12)}y ago`;
}

function Avatar({ email }) {
  return (
    <span
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-forest"
      style={{ backgroundColor: avatarColor(email) }}
    >
      {initials(email)}
    </span>
  );
}

function SortHeader({ label, active, dir, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1 text-[11px] font-semibold uppercase tracking-widest transition-colors ${
        active ? "text-forest" : "text-forest/40 hover:text-forest/70"
      }`}
    >
      {label}
      <ArrowUpDown className={`h-3 w-3 transition-transform ${active && dir === "asc" ? "rotate-180" : ""}`} />
    </button>
  );
}

// Replaces window.confirm — bulk/destructive actions get a real dialog, and
// deleting more than one account requires typing DELETE so a stray click
// can't wipe out a batch of users.
function ConfirmDialog({ open, title, message, confirmLabel, requireTypedConfirm, loading, onConfirm, onCancel }) {
  const [typed, setTyped] = useState("");
  useEffect(() => {
    if (open) setTyped("");
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-forest/40 px-4 backdrop-blur-sm"
          onClick={onCancel}
        >
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl border border-forest/10 bg-cream p-6 shadow-[0_24px_60px_-20px_rgba(20,38,28,0.5)]"
          >
            <div className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              <h3 className="font-display text-base font-bold text-forest">{title}</h3>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-forest/65">{message}</p>

            {requireTypedConfirm && (
              <div className="mt-4">
                <label className="text-xs font-semibold text-forest/60">Type DELETE to confirm</label>
                <input
                  autoFocus
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  className="mt-1.5 h-10 w-full rounded-xl border border-forest/15 bg-white px-3 text-sm text-forest outline-none focus:border-red-400"
                />
              </div>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={onCancel} disabled={loading}>
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={onConfirm}
                disabled={loading || (requireTypedConfirm && typed.trim().toUpperCase() !== "DELETE")}
              >
                {loading ? "Working…" : confirmLabel}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function AdminUsers() {
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get("q") || "";
  const page = parseInt(searchParams.get("page") || "0", 10);

  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [busyIds, setBusyIds] = useState(() => new Set());
  const [liveQuery, setLiveQuery] = useState(q);
  const debounceRef = useRef(null);

  const [filterTone, setFilterTone] = useState("all");
  const [sortKey, setSortKey] = useState("joined");
  const [sortDir, setSortDir] = useState("desc");
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [confirmState, setConfirmState] = useState(null); // { users: [...] }
  const [confirmLoading, setConfirmLoading] = useState(false);

  const load = () => {
    setError(null);
    const params = { limit: PAGE_SIZE, offset: page * PAGE_SIZE };
    if (q) params.q = q;
    api.getAdminUsers(params).then(setData).catch((e) => setError(e.message));
  };

  useEffect(load, [q, page]);
  useEffect(() => {
    setSelectedIds(new Set());
  }, [q, page]);

  const setBusy = (id, on) => {
    setBusyIds((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const updateQuery = (value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set("q", value);
    else next.delete("q");
    next.delete("page");
    setSearchParams(next);
  };

  const goToPage = (p) => {
    const next = new URLSearchParams(searchParams);
    next.set("page", p);
    setSearchParams(next);
  };

  const handleLiveQuery = (value) => {
    setLiveQuery(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => updateQuery(value), 250);
  };

  const visibleUsers = useMemo(() => {
    if (!data) return [];
    let rows = data.results;
    if (filterTone === "pro") rows = rows.filter((u) => u.tier === "pro");
    else if (filterTone === "free") rows = rows.filter((u) => u.tier !== "pro");
    else if (filterTone === "admin") rows = rows.filter((u) => u.is_admin);

    rows = [...rows].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "joined") cmp = new Date(a.created_at || 0) - new Date(b.created_at || 0);
      else if (sortKey === "skills") cmp = a.skill_count - b.skill_count;
      return sortDir === "asc" ? cmp : -cmp;
    });
    return rows;
  }, [data, filterTone, sortKey, sortDir]);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allVisibleSelected = visibleUsers.length > 0 && visibleUsers.every((u) => selectedIds.has(u.id));
  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) visibleUsers.forEach((u) => next.delete(u.id));
      else visibleUsers.forEach((u) => next.add(u.id));
      return next;
    });
  };

  const selectedUsers = data ? data.results.filter((u) => selectedIds.has(u.id)) : [];

  const toggleTier = async (u) => {
    setBusy(u.id, true);
    try {
      const updated = await api.updateAdminUser(u.id, { tier: u.tier === "pro" ? "free" : "pro" });
      setData((prev) => ({
        ...prev,
        results: prev.results.map((x) => (x.id === u.id ? { ...x, ...updated } : x)),
      }));
      toast.success(`${u.email} is now on ${updated.tier === "pro" ? "Pro" : "Free"}`);
    } catch {
      toast.error("Couldn't update that user's plan");
    } finally {
      setBusy(u.id, false);
    }
  };

  const toggleAdmin = async (u) => {
    setBusy(u.id, true);
    try {
      const updated = await api.updateAdminUser(u.id, { is_admin: !u.is_admin });
      setData((prev) => ({
        ...prev,
        results: prev.results.map((x) => (x.id === u.id ? { ...x, ...updated } : x)),
      }));
      toast.success(updated.is_admin ? `${u.email} is now an admin` : `Admin access revoked for ${u.email}`);
    } catch {
      toast.error("Couldn't update admin access");
    } finally {
      setBusy(u.id, false);
    }
  };

  const bulkSetTier = async (tier) => {
    const users = selectedUsers.filter((u) => u.tier !== tier);
    if (users.length === 0) return;
    const ids = users.map((u) => u.id);
    ids.forEach((id) => setBusy(id, true));
    try {
      const results = await Promise.allSettled(users.map((u) => api.updateAdminUser(u.id, { tier })));
      setData((prev) => ({
        ...prev,
        results: prev.results.map((x) => {
          const idx = ids.indexOf(x.id);
          if (idx === -1) return x;
          return results[idx].status === "fulfilled" ? { ...x, ...results[idx].value } : x;
        }),
      }));
      const succeeded = results.filter((r) => r.status === "fulfilled").length;
      toast.success(`${succeeded} of ${users.length} users moved to ${tier === "pro" ? "Pro" : "Free"}`);
    } finally {
      ids.forEach((id) => setBusy(id, false));
    }
  };

  const requestDelete = (users) => setConfirmState({ users });

  const performDelete = async () => {
    if (!confirmState) return;
    const { users } = confirmState;
    const ids = users.map((u) => u.id);
    setConfirmLoading(true);
    ids.forEach((id) => setBusy(id, true));
    try {
      await Promise.all(ids.map((id) => api.deleteAdminUser(id)));
      setData((prev) => ({
        ...prev,
        total: Math.max(0, prev.total - ids.length),
        results: prev.results.filter((x) => !ids.includes(x.id)),
      }));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      });
      toast.info(users.length === 1 ? `${users[0].email} deleted` : `${users.length} users deleted`);
      setConfirmState(null);
    } catch {
      toast.error("Couldn't delete — try again");
    } finally {
      ids.forEach((id) => setBusy(id, false));
      setConfirmLoading(false);
    }
  };

  const proOnPage = data ? data.results.filter((u) => u.tier === "pro").length : 0;
  const adminsOnPage = data ? data.results.filter((u) => u.is_admin).length : 0;

  return (
    <div>
      <PageHeader kicker="Admin" title="Manage Users" description="Grant Pro access, admin rights, or remove an account." />

      {data && (
        <div className="mb-6 flex flex-wrap gap-3">
          <span className="flex items-center gap-2 rounded-full border border-forest/10 bg-white/60 px-3.5 py-1.5 text-xs font-semibold text-forest">
            <Users className="h-3.5 w-3.5 text-forest/50" /> {data.total.toLocaleString()} total users
          </span>
          <span className="flex items-center gap-2 rounded-full border border-forest/10 bg-lime/25 px-3.5 py-1.5 text-xs font-semibold text-forest">
            <Crown className="h-3.5 w-3.5 text-forest/60" /> {proOnPage} Pro on this page
          </span>
          <span className="flex items-center gap-2 rounded-full border border-forest/10 bg-periwinkle/35 px-3.5 py-1.5 text-xs font-semibold text-forest">
            <ShieldCheck className="h-3.5 w-3.5 text-forest/60" /> {adminsOnPage} admin{adminsOnPage === 1 ? "" : "s"} on this page
          </span>
        </div>
      )}

      <Card className="flex flex-col gap-4">
        <Input
          label="Search by email"
          placeholder="e.g. jane@ — filters live"
          value={liveQuery}
          onChange={(e) => handleLiveQuery(e.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilterTone(f.key)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                filterTone === f.key ? "bg-forest text-cream" : "bg-forest/6 text-forest/60 hover:bg-forest/12"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </Card>

      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-4 overflow-hidden"
          >
            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-forest/15 bg-forest px-4 py-3 text-cream">
              <span className="text-sm font-semibold">{selectedIds.size} selected</span>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="secondary" size="sm" className="border-cream/30 text-cream hover:bg-cream/10" onClick={() => bulkSetTier("pro")}>
                  <Crown className="h-3.5 w-3.5" /> Upgrade to Pro
                </Button>
                <Button variant="secondary" size="sm" className="border-cream/30 text-cream hover:bg-cream/10" onClick={() => bulkSetTier("free")}>
                  Downgrade to Free
                </Button>
                <Button variant="secondary" size="sm" className="border-red-300/40 text-red-200 hover:bg-red-500/10" onClick={() => requestDelete(selectedUsers)}>
                  <Trash2 className="h-3.5 w-3.5" /> Delete selected
                </Button>
              </div>
              <button
                type="button"
                onClick={() => setSelectedIds(new Set())}
                className="ml-auto flex items-center gap-1 text-xs text-cream/70 hover:text-cream"
              >
                <X className="h-3.5 w-3.5" /> Clear
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-6">
        {!data && !error && <LoadingState label="Loading users…" />}
        {error && <ErrorState message={error} onRetry={load} />}

        {data && (
          <>
            <div className="mb-2 flex items-center gap-4 px-1">
              <input
                type="checkbox"
                checked={allVisibleSelected}
                onChange={toggleSelectAll}
                className="h-4 w-4 cursor-pointer rounded accent-forest"
                aria-label="Select all visible users"
              />
              <SortHeader label="Joined" active={sortKey === "joined"} dir={sortDir} onClick={() => toggleSort("joined")} />
              <SortHeader label="Skills" active={sortKey === "skills"} dir={sortDir} onClick={() => toggleSort("skills")} />
              <span className="ml-auto text-xs text-forest/50">
                {visibleUsers.length} of {data.results.length} shown
              </span>
            </div>

            {visibleUsers.length === 0 && (
              <EmptyState
                title="No users match this filter"
                description="Try a different filter or search term."
                action={
                  <Button size="sm" variant="secondary" onClick={() => setFilterTone("all")}>
                    Clear filter
                  </Button>
                }
              />
            )}

            <div className="flex flex-col gap-2">
              {visibleUsers.map((u, i) => {
                const busy = busyIds.has(u.id);
                return (
                  <motion.div
                    key={u.id}
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -12 }}
                    transition={{ duration: 0.2, delay: Math.min(i, 10) * 0.025 }}
                  >
                    <Card
                      className={`flex flex-wrap items-center gap-3 py-3 transition-colors ${
                        selectedIds.has(u.id) ? "border-forest/30 bg-forest/5" : ""
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.has(u.id)}
                        onChange={() => toggleSelect(u.id)}
                        className="h-4 w-4 shrink-0 cursor-pointer rounded accent-forest"
                        aria-label={`Select ${u.email}`}
                      />
                      <Avatar email={u.email} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-forest">{u.email}</p>
                        <p className="text-xs text-forest/45" title={u.created_at ? new Date(u.created_at).toLocaleString() : ""}>
                          {u.skill_count} skill{u.skill_count === 1 ? "" : "s"} · joined {timeAgo(u.created_at)}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={u.tier === "pro" ? "lime" : "forest"} className="capitalize">
                          {u.tier}
                        </Badge>
                        {u.is_admin && (
                          <Badge tone="periwinkle" className="flex items-center gap-1">
                            <Crown className="h-3 w-3" /> Admin
                          </Badge>
                        )}
                        <Button variant="secondary" size="sm" disabled={busy} onClick={() => toggleTier(u)}>
                          {u.tier === "pro" ? "Downgrade" : "Upgrade"}
                        </Button>
                        <Button variant="ghost" size="sm" disabled={busy} onClick={() => toggleAdmin(u)}>
                          <ShieldCheck className="h-3.5 w-3.5" /> {u.is_admin ? "Revoke admin" : "Make admin"}
                        </Button>
                        <Button variant="ghost" size="sm" disabled={busy} onClick={() => requestDelete([u])}>
                          <Trash2 className="h-3.5 w-3.5 text-red-600" />
                        </Button>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </div>

            <div className="mt-6 flex items-center justify-between">
              <Button variant="secondary" size="sm" disabled={page === 0} onClick={() => goToPage(page - 1)}>
                <ArrowLeft className="h-3.5 w-3.5" /> Previous
              </Button>
              <span className="text-xs text-forest/50">
                Page {page + 1} of {Math.max(1, Math.ceil(data.total / PAGE_SIZE))}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={(page + 1) * PAGE_SIZE >= data.total}
                onClick={() => goToPage(page + 1)}
              >
                Next <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </>
        )}
      </div>

      <ConfirmDialog
        open={!!confirmState}
        title={confirmState?.users.length === 1 ? "Delete this user?" : `Delete ${confirmState?.users.length ?? 0} users?`}
        message={
          confirmState?.users.length === 1
            ? `${confirmState.users[0].email} will be permanently deleted, along with their history and any shared report links. This cannot be undone.`
            : `${confirmState?.users.length ?? 0} accounts will be permanently deleted, along with their history and shared report links. This cannot be undone.`
        }
        confirmLabel={confirmState?.users.length === 1 ? "Delete user" : "Delete users"}
        requireTypedConfirm={(confirmState?.users.length ?? 0) > 1}
        loading={confirmLoading}
        onConfirm={performDelete}
        onCancel={() => setConfirmState(null)}
      />
    </div>
  );
}
