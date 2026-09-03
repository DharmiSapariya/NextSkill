import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Trash2, ShieldCheck } from "lucide-react";
import * as api from "../../lib/api";
import { PageHeader, Card, Button, Input, Badge, LoadingState, ErrorState } from "../ui";
import { useToast } from "../../context/ToastContext";

const PAGE_SIZE = 20;

export default function AdminUsers() {
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get("q") || "";
  const page = parseInt(searchParams.get("page") || "0", 10);

  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [liveQuery, setLiveQuery] = useState(q);
  const debounceRef = useRef(null);

  const load = () => {
    setError(null);
    const params = { limit: PAGE_SIZE, offset: page * PAGE_SIZE };
    if (q) params.q = q;
    api.getAdminUsers(params).then(setData).catch((e) => setError(e.message));
  };

  useEffect(load, [q, page]);

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

  const toggleTier = async (u) => {
    setBusyId(u.id);
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
      setBusyId(null);
    }
  };

  const toggleAdmin = async (u) => {
    setBusyId(u.id);
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
      setBusyId(null);
    }
  };

  const handleDelete = async (u) => {
    if (!window.confirm(`Delete ${u.email}? This cannot be undone.`)) return;
    setBusyId(u.id);
    try {
      await api.deleteAdminUser(u.id);
      setData((prev) => ({ ...prev, results: prev.results.filter((x) => x.id !== u.id) }));
      toast.info(`${u.email} deleted`);
    } catch {
      toast.error("Couldn't delete that user");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <PageHeader kicker="Admin" title="Manage Users" description="Grant Pro access, admin rights, or remove an account." />

      <Card>
        <Input
          label="Search by email"
          placeholder="e.g. jane@ — filters live"
          value={liveQuery}
          onChange={(e) => handleLiveQuery(e.target.value)}
        />
      </Card>

      <div className="mt-6">
        {!data && !error && <LoadingState label="Loading users…" />}
        {error && <ErrorState message={error} />}

        {data && (
          <>
            <p className="mb-3 text-xs text-forest/50">{data.total.toLocaleString()} users</p>
            <div className="flex flex-col gap-2">
              {data.results.map((u, i) => (
                <motion.div
                  key={u.id}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.2, delay: Math.min(i, 10) * 0.025 }}
                >
                  <Card className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-forest">{u.email}</p>
                      <p className="text-xs text-forest/45">
                        {u.skill_count} skills · joined{" "}
                        {u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge tone={u.tier === "pro" ? "lime" : "forest"} className="capitalize">
                        {u.tier}
                      </Badge>
                      {u.is_admin && <Badge tone="periwinkle">Admin</Badge>}
                      <Button variant="secondary" size="sm" disabled={busyId === u.id} onClick={() => toggleTier(u)}>
                        {u.tier === "pro" ? "Downgrade" : "Upgrade"}
                      </Button>
                      <Button variant="ghost" size="sm" disabled={busyId === u.id} onClick={() => toggleAdmin(u)}>
                        <ShieldCheck className="h-3.5 w-3.5" /> {u.is_admin ? "Revoke admin" : "Make admin"}
                      </Button>
                      <Button variant="ghost" size="sm" disabled={busyId === u.id} onClick={() => handleDelete(u)}>
                        <Trash2 className="h-3.5 w-3.5 text-red-600" />
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              ))}
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
    </div>
  );
}
