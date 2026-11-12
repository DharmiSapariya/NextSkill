import { postingDate, sourceLabel } from "../lib/marketMetadata";

export default function MarketMetadata({ data, scope }) {
  return (
    <details className="my-4 rounded-xl border border-forest/15 px-4 py-3 text-sm text-ink/80">
      <summary className="cursor-pointer font-semibold text-ink">Data sources and coverage</summary>
      <div className="mt-3 space-y-2">
        <p>{scope}</p>
        {data ? (
          <>
            <p>{data.posting_count.toLocaleString()} stored posting records · {data.dated_posting_count.toLocaleString()} with posting dates</p>
            <p>Latest recorded posting date: {postingDate(data.latest_posted_date)}</p>
            {data.latest_posting_older_than_notice === true && (
              <p>The latest dated posting is more than {data.posting_age_notice_days} days old.</p>
            )}
            {data.sources.length ? (
              <ul className="flex flex-wrap gap-x-4 gap-y-1">
                {data.sources.map(({ source, posting_count: count }) => (
                  <li key={source ?? ""}>{sourceLabel(source)}: {count.toLocaleString()}</li>
                ))}
              </ul>
            ) : <p>No source observations in this selection.</p>}
            <p>
              {data.location_text_count.toLocaleString()} records have location text.
              {" "}{data.remote_location_text_count.toLocaleString()} mention “remote” in that text.
            </p>
          </>
        ) : <p>Source counts and posting dates are unavailable.</p>}
        <p>Collection time and expiry aren’t recorded. Counts use stored IDs, so reposts can represent the same opening.</p>
        <p>Location text does not verify country coverage or India eligibility. Seniority labels are inferred from titles where available.</p>
      </div>
    </details>
  );
}
