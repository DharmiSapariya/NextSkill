import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { MapPin, BookmarkX } from "lucide-react";
import * as api from "../../lib/api";
import { PageHeader, Card, Button, LoadingState, ErrorState, EmptyState } from "../ui";
import { useToast } from "../../context/ToastContext";

export default function SavedJobs() {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [removingId, setRemovingId] = useState(null);

  const load = () => {
    setError(null);
    api
      .getSavedJobs({ limit: 100 })
      .then(setData)
      .catch((e) => setError(e.message));
  };

  useEffect(load, []);

  const handleUnsave = async (jobId) => {
    setRemovingId(jobId);
    try {
      await api.unsaveJob(jobId);
      setData((prev) => ({ ...prev, results: prev.results.filter((j) => j.job_id !== jobId) }));
      toast.info("Removed from saved jobs");
    } catch {
      toast.error("Couldn't remove that job — try again");
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div>
      <PageHeader kicker="Explore" title="Saved Jobs" description="Postings you've bookmarked for later." />

      {error && <ErrorState message={error} onRetry={load} />}
      {!data && !error && <LoadingState label="Loading your saved jobs…" />}

      {data && data.results.length === 0 && (
        <EmptyState
          title="No saved jobs yet"
          description="Bookmark postings from the Jobs page to keep track of ones you're interested in."
          action={
            <Button as={Link} to="/app/jobs" size="sm" className="mt-2">
              Browse Jobs
            </Button>
          }
        />
      )}

      {data && data.results.length > 0 && (
        <div className="flex flex-col gap-3">
          {data.results.map((job, i) => (
            <motion.div
              key={job.job_id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.25, delay: Math.min(i, 8) * 0.03 }}
            >
              <Card className="flex flex-wrap items-center justify-between gap-3">
                <Link to={`/app/jobs/${job.job_id}`} className="min-w-0 flex-1">
                  <h3 className="font-display text-base font-bold text-forest">{job.title || "Untitled posting"}</h3>
                  <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-forest/55">
                    {job.company && <span>{job.company}</span>}
                    {job.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {job.location}
                      </span>
                    )}
                    <span>Saved {new Date(job.saved_at).toLocaleDateString()}</span>
                  </p>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleUnsave(job.job_id)}
                  disabled={removingId === job.job_id}
                >
                  <BookmarkX className="h-4 w-4" /> Remove
                </Button>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
