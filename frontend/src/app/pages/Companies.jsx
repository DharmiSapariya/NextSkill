import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Building2, Trophy } from "lucide-react";
import * as api from "../../lib/api";
import { PageHeader, Card, Button, Input, LoadingState, ErrorState, EmptyState } from "../ui";

const PAGE_SIZE = 20;

export default function Companies() {
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get("q") || "";
  const page = parseInt(searchParams.get("page") || "0", 10);

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

  const goToPage = (p) => {
    const next = new URLSearchParams(searchParams);
    next.set("page", p);
    setSearchParams(next);
  };

  return (
    <div>
      <PageHeader kicker="Explore" title="Companies" description="Who's actually hiring, ranked by how many postings we've seen from them." />

      {top && top.length > 0 && (
        <div className="mb-8">
          <div className="mb-3 flex items-center gap-2 text-forest/70">
            <Trophy className="h-4 w-4" />
            <h2 className="font-display text-lg font-bold text-forest">Top companies</h2>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {top.map((c, i) => (
              <Card key={c.company} className="flex items-center gap-3">
                <span className="font-display text-lg font-bold text-forest/30">{i + 1}</span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-forest">{c.company}</p>
                  <p className="text-xs text-forest/50">{c.postings.toLocaleString()} postings</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      <Card>
        <Input
          label="Search companies"
          placeholder="e.g. Acme"
          defaultValue={q}
          onBlur={(e) => updateQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && updateQuery(e.target.value)}
        />
      </Card>

      <div className="mt-6">
        {!list && !error && <LoadingState label="Loading companies…" />}
        {error && <ErrorState message={error} />}

        {list && list.results.length === 0 && <EmptyState title="No companies found" />}

        {list && list.results.length > 0 && (
          <>
            <p className="mb-3 text-xs text-forest/50">{list.total.toLocaleString()} companies</p>
            <div className="flex flex-col gap-2">
              {list.results.map((c) => (
                <Card key={c.company} className="flex items-center justify-between gap-3 py-3">
                  <span className="flex items-center gap-2 text-sm font-medium text-forest">
                    <Building2 className="h-4 w-4 text-forest/40" /> {c.company}
                  </span>
                  <span className="text-xs text-forest/50">{c.postings.toLocaleString()} postings</span>
                </Card>
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
