import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { apiGet } from "../lib/api";
import FeatureHeader from "./shared/FeatureHeader";
import Card from "./shared/Card";
import { EmptyState, ErrorState, LoadingState } from "./shared/RequestState";

const PAGE_SIZE = 15;

function TopCompaniesLeaderboard() {
  const [state, setState] = useState({ status: "loading", results: [] });

  useEffect(() => {
    apiGet("/companies/top", { params: { limit: 8 } }).then(({ ok, data }) => {
      setState(ok ? { status: "ready", results: data.results } : { status: "error", results: [] });
    });
  }, []);

  if (state.status === "loading") return <LoadingState label="Ranking companies…" />;
  if (state.status === "error") return <ErrorState message="Couldn't load the leaderboard." />;

  const max = Math.max(...state.results.map((r) => r.postings), 1);

  return (
    <ul className="flex flex-col gap-3">
      {state.results.map((company, index) => (
        <li key={company.company} className="flex items-center gap-3">
          <span className="w-5 shrink-0 font-display text-sm font-bold text-forest/40">{index + 1}</span>
          <div className="flex-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-charcoal">{company.company}</span>
              <span className="font-sans text-xs text-charcoal/50">{company.postings} postings</span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-forest/8">
              <div
                className="h-full rounded-full bg-lime"
                style={{ width: `${Math.max(6, (company.postings / max) * 100)}%` }}
              />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

function CompanyDirectory() {
  const [q, setQ] = useState("");
  const [offset, setOffset] = useState(0);
  const [state, setState] = useState({ status: "loading", data: null, error: null });

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading", data: null, error: null });
    apiGet("/companies", { params: { q, limit: PAGE_SIZE, offset } }).then(({ ok, data }) => {
      if (cancelled) return;
      if (ok) setState({ status: "ready", data, error: null });
      else setState({ status: "error", data: null, error: data?.detail || "Couldn't load companies." });
    });
    return () => {
      cancelled = true;
    };
  }, [q, offset]);

  const results = state.data?.results ?? [];
  const total = state.data?.total ?? 0;

  return (
    <div>
      <label className="relative flex items-center">
        <Search className="pointer-events-none absolute left-3 h-4 w-4 text-charcoal/40" />
        <input
          value={q}
          onChange={(e) => {
            setOffset(0);
            setQ(e.target.value);
          }}
          placeholder="Search companies by name"
          className="w-full rounded-xl border border-forest/15 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-forest/40"
        />
      </label>

      <div className="mt-4">
        {state.status === "loading" && <LoadingState label="Searching…" />}
        {state.status === "error" && <ErrorState message={state.error} />}
        {state.status === "ready" && results.length === 0 && <EmptyState message="No companies match that search." />}
        {state.status === "ready" && results.length > 0 && (
          <>
            <p className="mb-3 font-sans text-xs text-charcoal/40">{total.toLocaleString()} companies</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {results.map((company) => (
                <div
                  key={company.company}
                  className="flex items-center justify-between rounded-xl border border-forest/10 bg-white px-4 py-3"
                >
                  <span className="font-sans text-sm font-medium text-charcoal">{company.company}</span>
                  <span className="font-sans text-xs text-charcoal/50">{company.postings} postings</span>
                </div>
              ))}
            </div>
            <div className="mt-6 flex items-center justify-between font-sans text-sm">
              <button
                disabled={offset === 0}
                onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                className="font-semibold text-forest disabled:opacity-30"
              >
                ← Previous
              </button>
              <button
                disabled={offset + PAGE_SIZE >= total}
                onClick={() => setOffset(offset + PAGE_SIZE)}
                className="font-semibold text-forest disabled:opacity-30"
              >
                Next →
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function Companies() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-12 sm:py-16">
      <FeatureHeader
        eyebrow="Who's hiring"
        title="Companies"
        subtitle="Ranked by real posting volume — not a paid placement in sight."
        illustration="/illustrations/companies.png"
      />

      <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_1.3fr]">
        <Card eyebrow="Leaderboard" title="Top hiring companies right now" tone="lime">
          <TopCompaniesLeaderboard />
        </Card>
        <Card eyebrow="Directory" title="Browse every company" tone="periwinkle">
          <CompanyDirectory />
        </Card>
      </div>
    </section>
  );
}
