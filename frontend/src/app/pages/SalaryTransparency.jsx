import { DollarSign } from "lucide-react";
import { postingDate, sourceLabel } from "../../lib/marketMetadata";
import { Card } from "../ui";

export default function SalaryTransparency({ salary, error }) {
  const metadata = salary?.estimate_metadata;
  return (
    <Card>
      <h3 className="flex items-center gap-2 font-kicker text-xs uppercase tracking-widest text-ink">
        <DollarSign className="h-4 w-4" aria-hidden="true" /> Salary estimate
      </h3>
      {error && <p role="alert" className="mt-3 text-sm text-ink/80">{error}</p>}
      {salary && (
        <div className="mt-3 space-y-2 text-sm text-ink/80">
          <p className="font-semibold text-ink">Salary amount withheld. Currency and pay period are unverified.</p>
          <p>Matched model bucket: {salary.matched_role_bucket}. The model does not adjust for location or experience.</p>
          <p>Dataset observations: {metadata?.observation_count?.toLocaleString() ?? "Unavailable"}.</p>
          <p>Observations in matched bucket: {metadata?.role_observation_count?.toLocaleString() ?? "Unavailable"}.</p>
          {metadata?.role_observation_count === 0 && <p>No salary observations in the matched bucket.</p>}
          {metadata?.role_observation_count > 0 && metadata.role_observation_count < 30 && (
            <p>Small role sample. Fewer than 30 eligible observations are available in this bucket.</p>
          )}
          <p>Latest posting date in model dataset: {postingDate(metadata?.latest_posted_date)}. Collection date: unavailable.</p>
          {metadata?.latest_posting_older_than_notice === true && (
            <p>The latest dated salary observation is more than {metadata.posting_age_notice_days} days old.</p>
          )}
          <p>Model fitting observations: {metadata?.trained_on?.toLocaleString() ?? "Unavailable"}.</p>
          <p>Model trained: {postingDate(metadata?.trained_at)}.</p>
          <p>
            Sources: {metadata?.sources?.length
              ? metadata.sources.map((row) => `${sourceLabel(row.source)} (${row.posting_count.toLocaleString()})`).join(", ")
              : "Unavailable"}.
          </p>
          {metadata?.methodology && <p>{metadata.methodology}</p>}
          <p>A model estimate does not represent an employer offer or guaranteed pay.</p>
        </div>
      )}
    </Card>
  );
}
