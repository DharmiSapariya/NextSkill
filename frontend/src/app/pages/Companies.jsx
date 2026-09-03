import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Building2, Trophy, PieChart } from "lucide-react";
import * as api from "../../lib/api";
import { PageHeader, Card, Button, LoadingState, ErrorState, EmptyState, InfoHint } from "../ui";
import Autocomplete from "../Autocomplete";

const PAGE_SIZE = 20;
const RANK_ACCENTS = ["var(--lime)", "var(--periwinkle)", "var(--coral)", "var(--sky)", "var(--amber)", "var(--violet)"];

function RankBadge({ rank }) {
  return (
    <span
      className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-display text-sm font-bold text-forest"
      style={{ backgroundColor: RANK_ACCENTS[rank - 1] || "rgba(20,38,28,0.06)" }}
    >
      {rank === 1 && (
        <Trophy className="absolute -right-1.5 -top-1.5 h-3.5 w-3.5 rounded-full bg-cream p-0.5 text-forest shadow-sm" />
      )}
      {rank}
    </span>
  );
}

// Circular "share of the top 6" ring — honest because it's scoped explicitly
// to the top-companies set shown right below it, never implied to be a
// platform-wide market share.
function ConcentrationRing({ pct, leader }) {
  const value = Math.max(0, Math.min(100, pct));
  const circumference = 2 * Math.PI * 34;
  const offset = circumference - (value / 100) * circumference;
  return (
    <Card className="flex items-center gap-4">
      <div className="relative flex h-20 w-20 shrink-0 items-center justify-center">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
          <circle cx="50" cy="50" r="34" fill="none" stroke="rgba(20,38,28,0.08)" strokeWidth="9" />
          <motion.circle
            cx="50"
            cy="50"
            r="34"
            fill="none"
            stroke="var(--coral)"
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </svg>
        <span className="absolute font-display text-lg font-bold text-forest">{value.toFixed(0)}%</span>
      </div>
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 font-kicker text-[11px] uppercase tracking-widest text-forest/45">
          <PieChart className="h-3 w-3" /> Top-6 concentration
        </p>
        <p className="mt-1 text-sm leading-snug text-forest/60">
          <span className="font-semibold capitalize text-forest">{leader}</span> alone accounts for {value.toFixed(0)}% of
          postings among the top 6 companies shown below.
        </p>
      </div>
    </Card>
  );
}

export default function Companies() {
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get("q") || "";
  const page = parseInt(searchParams.get("page") || "0", 10);

  const [liveQuery, setLiveQuery] = useState(q);
  const debounceRef = useRef(null);

  const [top, setTop] = useState(null);
  const [list, setList] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.getTopCompanies(6).then((res) => setTop(res.results)).catch(() => {});
  }, []);

  useEffect(() => {
    setList(null);
    setError(null);
    const params = { limit: PAGE_SIZE, offset: page * PAGE_SIZE };
    if (q) params.q = q;
    api.getCompanies(params).then(setList).catch((e) => setError(e.message));
  }, [q, page]);

  const updateQuery = (value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set("q", value);
    else next.delete("q");
    next.delete("page");
    setSearchParams(next);
  };

  const handleLiveChange = (value) => {
    setLiveQuery(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => updateQuery(value), 220);
  };

  const goToPage = (p) => {
    const next = new URLSearchParams(searchParams);
    next.set("page", p);
    setSearchParams(next);
  };

  const topMax = top && top.length > 0 ? Math.max(...top.map((c) => c.postings)) : 1;
  const topTotal = top ? top.reduce((sum, c) => sum + c.postings, 0) || 1 : 1;
  const leaderSharePct = top && top.length > 0 ? (top[0].postings / topTotal) * 100 : 0;

  const listMax = list && list.results.length > 0 ? Math.max(...list.results.map((c) => c.postings)) : 1;

  return (
    <div>
      <PageHeader kicker="Explore" title="Companies" description="Who's actually hiring, ranked by how many postings we've seen from them." />

      <div className="mb-8 flex flex-wrap items-center justify-between gap-6 overflow-hidden rounded-2xl border border-forest/10 bg-sky/25 px-6 py-6 sm:px-8">
        <div>
          <span className="font-kicker text-xs uppercase tracking-widest text-forest/50">Live hiring signal</span>
          <p className="mt-2 max-w-xl font-display text-xl font-bold text-forest sm:text-2xl">
            {list ? `${list.total.toLocaleString()} companies` : "Companies"} with real postings we've ingested — every count
            below reflects postings actually seen, not estimates.
          </p>
        </div>
        <img src="/illustrations/17n.png" alt="" className="hidden h-28 w-28 shrink-0 object-contain sm:block" />
      </div>

      {top && top.length > 0 && (
        <div className="mb-8">
          <div className="mb-3 flex items-center gap-2 text-forest/70">
            <Trophy className="h-4 w-4" />
            <h2 className="font-display text-lg font-bold text-forest">Top companies</h2>
            <InfoHint text="Ranked purely by how many postings we've ingested from each — not a paid or curated list." />
          </div>

          <div className="mb-4">
            <ConcentrationRing pct={leaderSharePct} leader={top[0].company} />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {top.map((c, i) => (
              <motion.div
                key={c.company}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: i * 0.04 }}
                whileHover={{ y: -3 }}
              >
                <Card className="flex flex-col gap-3 transition-colors hover:border-forest/25">
                  <div className="flex items-center gap-3">
                    <RankBadge rank={i + 1} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-forest">{c.company}</p>
                      <p className="text-xs text-forest/50">{c.postings.toLocaleString()} postings</p>
                    </div>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-forest/8">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: RANK_ACCENTS[i] || "var(--periwinkle)" }}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.max(4, (c.postings / topMax) * 100)}%` }}
                      transition={{ duration: 0.8, ease: "easeOut", delay: i * 0.04 }}
                    />
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      <Card>
        <Autocomplete
          label="Search companies"
          placeholder="e.g. Acme — start typing"
          value={liveQuery}
          onChange={handleLiveChange}
          onSelect={(name) => {
            setLiveQuery(name);
            updateQuery(name);
          }}
          getOptions={(query) =>
            api.getCompanies({ q: query, limit: 8 }).then((res) => res.results.map((c) => c.company))
          }
        />
      </Card>

      <div className="mt-6">
        {!list && !error && <LoadingState label="Loading companies…" />}
        {error && <ErrorState message={error} />}

        {list && list.results.length === 0 && (
          <EmptyState title="No companies found" description="Try a different search term." />
        )}

        {list && list.results.length > 0 && (
          <>
            <p className="mb-3 text-xs text-forest/50">{list.total.toLocaleString()} companies</p>
            <div className="flex flex-col gap-2">
              {list.results.map((c, i) => (
                <motion.div
                  key={c.company}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: Math.min(i, 10) * 0.025 }}
                >
                  <Card className="flex flex-col gap-2 py-3 transition-colors hover:border-forest/25">
                    <div className="flex items-center justify-between gap-3">
                      <span className="flex min-w-0 items-center gap-2 text-sm font-medium text-forest">
                        <Building2 className="h-4 w-4 shrink-0 text-forest/40" />
                        <span className="truncate">{c.company}</span>
                      </span>
                      <span className="shrink-0 text-xs text-forest/50">{c.postings.toLocaleString()} postings</span>
                    </div>
                    <div className="h-1 overflow-hidden rounded-full bg-forest/8">
                      <motion.div
                        className="h-full rounded-full bg-sky"
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.max(4, (c.postings / listMax) * 100)}%` }}
                        transition={{ duration: 0.6, ease: "easeOut", delay: Math.min(i, 10) * 0.025 }}
                      />
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
                Page {page + 1} of {Math.max(1, Math.ceil(list.total / PAGE_SIZE))}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={(page + 1) * PAGE_SIZE >= list.total}
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
