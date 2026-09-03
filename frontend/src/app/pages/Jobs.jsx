import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { MapPin, ArrowRight, ArrowLeft } from "lucide-react";
import * as api from "../../lib/api";
import { PageHeader, Card, Button, Input, Badge, LoadingState, ErrorState, EmptyState } from "../ui";

const SENIORITY_OPTIONS = ["junior", "mid", "senior", "unspecified"];
const PAGE_SIZE = 20;

export default function Jobs() {
  const [searchParams, setSearchParams] = useSearchParams();
  const role = searchParams.get("role") || "";
  const location = searchParams.get("location") || "";
  const seniority = searchParams.get("seniority") || "";
  const page = parseInt(searchParams.get("page") || "0", 10);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const params = { limit: PAGE_SIZE, offset: page * PAGE_SIZE };
    if (role) params.role = role;
    if (location) params.location = location;
    if (seniority) params.seniority = seniority;

    api
      .getJobs(params)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [role, location, seniority, page]);

  const updateParam = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
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
      <PageHeader kicker="Explore" title="Jobs" description="Browse real postings we've ingested." />

      <Card className="flex flex-wrap items-end gap-4">
        <div className="min-w-[200px] flex-1">
          <Input
            label="Role keyword"
            placeholder="e.g. Data Analyst"
            defaultValue={role}
            onBlur={(e) => updateParam("role", e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && updateParam("role", e.target.value)}
          />
        </div>
        <div className="min-w-[200px] flex-1">
          <Input
            label="Location keyword"
            placeholder="e.g. Remote"
            defaultValue={location}
            onBlur={(e) => updateParam("location", e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && updateParam("location", e.target.value)}
          />
        </div>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-forest/70">Seniority</span>
          <select
            value={seniority}
            onChange={(e) => updateParam("seniority", e.target.value)}
            className="h-11 rounded-xl border border-forest/15 bg-white px-3 text-sm text-forest outline-none focus:border-forest/40"
          >
            <option value="">Any</option>
            {SENIORITY_OPTIONS.map((s) => (
              <option key={s} value={s} className="capitalize">
                {s}
              </option>
            ))}
          </select>
        </label>
      </Card>

      <div className="mt-6">
        {loading && <LoadingState label="Loading postings…" />}
        {error && <ErrorState message={error} />}

        {data && data.results.length === 0 && (
          <EmptyState title="No postings match those filters" description="Try broadening your search." />
        )}

        {data && data.results.length > 0 && (
          <>
            <p className="mb-3 text-xs text-forest/50">{data.total.toLocaleString()} postings found</p>
            <div className="flex flex-col gap-3">
              {data.results.map((job) => (
                <Link key={job.id} to={`/app/jobs/${job.id}`}>
                  <Card className="flex flex-wrap items-center justify-between gap-3 transition-colors hover:border-forest/25">
                    <div>
                      <h3 className="font-display text-base font-bold text-forest">{job.title}</h3>
                      <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-forest/55">
                        {job.company && <span>{job.company}</span>}
                        {job.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> {job.location}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {job.seniority && job.seniority !== "unspecified" && (
                        <Badge className="capitalize">{job.seniority}</Badge>
                      )}
                      <ArrowRight className="h-4 w-4 text-forest/40" />
                    </div>
                  </Card>
                </Link>
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
