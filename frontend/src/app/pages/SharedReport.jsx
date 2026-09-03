import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import * as api from "../../lib/api";
import { LoadingState, ErrorState, Card, Badge } from "../ui";

function DemandBar({ pct }) {
  return (
    <div className="h-2 flex-1 rounded-full bg-forest/8">
      <div className="h-full rounded-full bg-periwinkle" style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  );
}

export default function SharedReport() {
  const { token } = useParams();
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.getSharedReport(token).then(setReport).catch((e) => setError(e.message));
  }, [token]);

  return (
    <div className="min-h-screen bg-cream px-6 py-16">
      <div className="mx-auto max-w-3xl">
        <Link to="/" className="font-display text-2xl font-bold text-forest">
          NextSkill
        </Link>

        {error && (
          <div className="mt-10">
            <ErrorState message="This shared report link is invalid or has been revoked." />
          </div>
        )}
        {!report && !error && <LoadingState label="Loading shared report…" />}

        {report && (
          <div className="mt-8">
            <span className="font-kicker text-xs uppercase tracking-widest text-forest/50">
              Shared skill-gap report
            </span>
            <h1 className="mt-1 font-display text-3xl font-bold capitalize text-forest">{report.resolved_role}</h1>
            <p className="mt-2 text-sm text-forest/55">
              Shared on{" "}
              {new Date(report.shared_at).toLocaleDateString(undefined, {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>

            <div className="mt-5 flex items-center gap-2 text-sm text-forest/70">
              <CheckCircle2 className="h-4 w-4" />
              Skills at the time: {report.skills_at_time.join(", ") || "None listed"}
            </div>

            <div className="mt-8 flex flex-col gap-4">
              {report.recommendations.map((rec) => (
                <Card key={rec.skill}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="font-display text-base font-bold text-forest">{rec.skill}</h3>
                    {rec.market_demand_pct != null && <Badge tone="lime">{rec.market_demand_pct}% of postings</Badge>}
                  </div>
                  {rec.market_demand_pct != null && (
                    <div className="mt-3 flex items-center gap-3">
                      <DemandBar pct={rec.market_demand_pct} />
                      <span className="w-32 shrink-0 text-xs text-forest/60">
                        {rec.postings_mentioning_it?.toLocaleString()} postings
                      </span>
                    </div>
                  )}
                  {rec.evidence?.length > 0 && (
                    <ul className="mt-4 flex flex-col gap-2 border-t border-forest/10 pt-4">
                      {rec.evidence.map((job, i) => (
                        <li key={i} className="text-sm text-forest/70">
                          <span className="font-semibold text-forest">{job.title}</span>
                          {job.company && <> · {job.company}</>} · {job.location}
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              ))}
            </div>

            <p className="mt-10 text-center text-xs text-forest/45">
              <Link to="/signup" className="underline underline-offset-2">
                Get your own free skill-gap report
              </Link>{" "}
              on NextSkill.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
