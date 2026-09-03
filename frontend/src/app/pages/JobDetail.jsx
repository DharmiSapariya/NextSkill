import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  MapPin,
  Bookmark,
  BookmarkCheck,
  CheckCircle2,
  XCircle,
  Link2,
  Target,
  ListChecks,
} from "lucide-react";
import * as api from "../../lib/api";
import { PageHeader, Card, Button, Badge, LoadingState, ErrorState } from "../ui";
import { useToast } from "../../context/ToastContext";
import { colorFor } from "../../lib/skillCategories";

const TAG_COLORS = ["var(--periwinkle)", "var(--lime)", "var(--coral)", "var(--sky)", "var(--amber)", "var(--violet)"];

function tagColor(value) {
  let hash = 0;
  for (let i = 0; i < value.length; i++) hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  return TAG_COLORS[hash % TAG_COLORS.length];
}

// Same ring language as Match & Salary's score ring — a user seeing 82% here
// and 82% there should read them as the same kind of number.
function MatchRing({ pct }) {
  const value = pct ?? 0;
  const circumference = 2 * Math.PI * 42;
  const offset = circumference - (value / 100) * circumference;
  return (
    <div className="relative flex h-28 w-28 shrink-0 items-center justify-center">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(20,38,28,0.08)" strokeWidth="10" />
        <motion.circle
          cx="50"
          cy="50"
          r="42"
          fill="none"
          stroke={value >= 60 ? "var(--lime)" : value >= 30 ? "var(--amber)" : "var(--coral)"}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </svg>
      <span className="absolute font-display text-2xl font-bold text-forest">{pct != null ? `${pct}%` : "—"}</span>
    </div>
  );
}

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

  const copyLink = () => {
    navigator.clipboard?.writeText(window.location.href);
    toast.success("Link copied");
  };

  if (error) return <ErrorState message={error} />;
  if (!job) return <LoadingState label="Loading posting…" />;

  const matchedCount = match?.matched_skills.length ?? 0;
  const requiredCount = match?.required_skills.length ?? 0;
  const matchedSharePct = requiredCount > 0 ? (matchedCount / requiredCount) * 100 : 0;

  return (
    <div>
      <Link to="/app/jobs" className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-forest/60 hover:text-forest">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Jobs
      </Link>

      <PageHeader
        title={job.title}
        description={[job.company, job.location].filter(Boolean).join(" · ")}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={copyLink}>
              <Link2 className="h-4 w-4" /> Copy link
            </Button>
            <Button variant={saved ? "secondary" : "primary"} onClick={toggleSave} disabled={savingState}>
              {saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
              {saved ? "Saved" : "Save job"}
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_340px]">
        <Card>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {job.category && (
              <span
                className="rounded-full px-2.5 py-1 font-semibold text-forest"
                style={{ backgroundColor: tagColor(job.category), opacity: 0.85 }}
              >
                {job.category}
              </span>
            )}
            {job.source && <Badge>via {job.source}</Badge>}
            {job.location && (
              <span className="flex items-center gap-1 text-forest/50">
                <MapPin className="h-3 w-3" /> {job.location}
              </span>
            )}
          </div>
          <div className="mt-4 whitespace-pre-line text-sm leading-relaxed text-forest/75">
            {job.description || "No description available for this posting."}
          </div>

          {match && requiredCount > 0 && (
            <div className="mt-6 border-t border-forest/10 pt-5">
              <div className="mb-2 flex items-center gap-2 text-forest/70">
                <ListChecks className="h-4 w-4" />
                <span className="font-kicker text-xs uppercase tracking-widest">Required skills</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {match.required_skills.map((s) => {
                  const isMatched = match.matched_skills.includes(s);
                  return (
                    <span
                      key={s}
                      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium text-forest"
                      style={{ backgroundColor: colorFor(s), opacity: isMatched ? 0.9 : 0.35 }}
                    >
                      {isMatched ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                      {s}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </Card>

        {match && (
          <Card className="h-fit">
            <div className="flex items-center gap-2 text-forest/70">
              <Target className="h-4 w-4" />
              <span className="font-kicker text-xs uppercase tracking-widest">Your match</span>
            </div>

            {match.match_pct == null ? (
              <p className="mt-3 text-sm text-forest/60">No parsed skills for this posting yet.</p>
            ) : (
              <>
                <div className="mt-4 flex items-center gap-4">
                  <MatchRing pct={match.match_pct} />
                  <div>
                    <p className="text-sm text-forest/70">
                      <span className="font-bold text-forest">{matchedCount}</span> of{" "}
                      <span className="font-bold text-forest">{requiredCount}</span> required skills
                    </p>
                    <p className="mt-1 text-xs text-forest/45">based on your saved skill profile</p>
                  </div>
                </div>

                <div className="mt-4 h-2 overflow-hidden rounded-full bg-forest/8">
                  <motion.div
                    className="h-full rounded-full bg-lime"
                    initial={{ width: 0 }}
                    animate={{ width: `${matchedSharePct}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                  />
                </div>

                <div className="mt-5 flex flex-col gap-2">
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

                {match.missing_skills.length > 0 && (
                  <Button
                    as={Link}
                    to={`/app/report?role=${encodeURIComponent(job.title)}`}
                    variant="secondary"
                    size="sm"
                    className="mt-5 w-full"
                  >
                    Close these gaps <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                )}
              </>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
