import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, MapPin, Bookmark, BookmarkCheck, CheckCircle2, XCircle } from "lucide-react";
import * as api from "../../lib/api";
import { PageHeader, Card, Button, Badge, LoadingState, ErrorState } from "../ui";
import { useToast } from "../../context/ToastContext";

export default function JobDetail() {
  const { id } = useParams();
  const toast = useToast();
  const [job, setJob] = useState(null);
  const [match, setMatch] = useState(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);
  const [savingState, setSavingState] = useState(false);

  useEffect(() => {
    setJob(null);
    setMatch(null);
    setError(null);
    api.getJob(id).then(setJob).catch((e) => setError(e.message));
    api.getJobMatch(id).then(setMatch).catch(() => {});
    api
      .getSavedJobs({ limit: 100 })
      .then((res) => setSaved(res.results.some((j) => String(j.job_id) === String(id))))
      .catch(() => {});
  }, [id]);

  const toggleSave = async () => {
    setSavingState(true);
    try {
      if (saved) {
        await api.unsaveJob(id);
        setSaved(false);
        toast.info("Removed from saved jobs");
      } else {
        await api.saveJob(id);
        setSaved(true);
        toast.success("Saved — find it under Saved Jobs");
      }
    } catch {
      toast.error("Couldn't update saved status — try again");
    } finally {
      setSavingState(false);
    }
  };

  if (error) return <ErrorState message={error} />;
  if (!job) return <LoadingState label="Loading posting…" />;

  return (
    <div>
      <Link to="/app/jobs" className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-forest/60 hover:text-forest">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Jobs
      </Link>

      <PageHeader
        title={job.title}
        description={[job.company, job.location].filter(Boolean).join(" · ")}
        actions={
          <Button variant={saved ? "secondary" : "primary"} onClick={toggleSave} disabled={savingState}>
            {saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
            {saved ? "Saved" : "Save job"}
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_320px]">
        <Card>
          <div className="flex flex-wrap gap-2 text-xs text-forest/50">
            {job.category && <Badge>{job.category}</Badge>}
            {job.source && <Badge>via {job.source}</Badge>}
            {job.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {job.location}
              </span>
            )}
          </div>
          <div className="mt-4 whitespace-pre-line text-sm leading-relaxed text-forest/75">
            {job.description || "No description available for this posting."}
          </div>
        </Card>

        {match && (
          <Card className="h-fit">
            <span className="font-kicker text-[11px] uppercase tracking-widest text-forest/40">Your match</span>
            {match.match_pct == null ? (
              <p className="mt-3 text-sm text-forest/60">No parsed skills for this posting yet.</p>
            ) : (
              <>
                <p className="mt-2 font-display text-2xl font-bold text-forest">{match.match_pct}%</p>
                <div className="mt-4 flex flex-col gap-2">
                  {match.matched_skills.map((s) => (
                    <span key={s} className="flex items-center gap-2 text-sm text-forest/75">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-forest/50" /> {s}
                    </span>
                  ))}
                  {match.missing_skills.map((s) => (
                    <span key={s} className="flex items-center gap-2 text-sm text-forest/40">
                      <XCircle className="h-3.5 w-3.5 shrink-0 text-forest/25" /> {s}
                    </span>
                  ))}
                </div>
              </>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
