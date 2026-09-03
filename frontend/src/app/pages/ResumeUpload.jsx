import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { FileUp, UploadCloud, ArrowRight, CheckCircle2, FileText, X, Sparkles } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import * as api from "../../lib/api";
import { PageHeader, Card, Button, LoadingState } from "../ui";
import { useToast } from "../../context/ToastContext";
import { colorFor } from "../../lib/skillCategories";

const MAX_SIZE_MB = 5;
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// The shared api.js client uses fetch(), which has no upload-progress event —
// this one call is worth its own XHR so the progress bar reflects real bytes
// sent, not a fake timer.
function uploadResumeWithProgress(file, onProgress) {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append("file", file);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_URL}/auth/me/resume`);
    const token = api.getToken();
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      let data = null;
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        /* non-JSON error body */
      }
      if (xhr.status >= 200 && xhr.status < 300) resolve(data);
      else reject(new Error(data?.detail || `Upload failed (${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.send(form);
  });
}

function fileKind(filename) {
  const ext = (filename || "").split(".").pop().toLowerCase();
  if (ext === "pdf") return { label: "PDF", color: "var(--coral)" };
  if (ext === "docx") return { label: "DOCX", color: "var(--sky)" };
  return { label: ext.toUpperCase(), color: "var(--periwinkle)" };
}

function SkillChip({ skill, highlight }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium text-forest"
      style={{ backgroundColor: colorFor(skill), opacity: highlight ? 0.95 : 0.55 }}
    >
      {highlight && <Sparkles className="h-3 w-3" />}
      {skill}
    </span>
  );
}

export default function ResumeUpload() {
  const { user, refreshUser } = useAuth();
  const toast = useToast();
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [previousSkills, setPreviousSkills] = useState([]);

  const pickFile = (f) => {
    setError(null);
    setResult(null);
    if (!f) return;
    if (f.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`File too large — max ${MAX_SIZE_MB}MB.`);
      return;
    }
    const ext = f.name.split(".").pop().toLowerCase();
    if (!["pdf", "docx"].includes(ext)) {
      setError("Only PDF or DOCX files are supported.");
      return;
    }
    setFile(f);
  };

  const clearFile = () => {
    setFile(null);
    setResult(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setProgress(0);
    setPreviousSkills(user?.skills || []);
    try {
      const data = await uploadResumeWithProgress(file, setProgress);
      setResult(data);
      refreshUser();
      toast.success(
        data.skills_found_in_resume.length > 0
          ? `Found ${data.skills_found_in_resume.length} skill${data.skills_found_in_resume.length === 1 ? "" : "s"} and merged them in`
          : "Resume parsed — no tracked skills detected"
      );
    } catch (err) {
      setError(err.message);
      toast.error(err.message || "Couldn't parse that resume");
    } finally {
      setLoading(false);
    }
  };

  const kind = file ? fileKind(file.name) : null;
  const previousLower = previousSkills.map((s) => s.toLowerCase());
  const newlyAdded = result ? result.skills_found_in_resume.filter((s) => !previousLower.includes(s.toLowerCase())) : [];
  const alreadyHad = result ? result.skills_found_in_resume.filter((s) => previousLower.includes(s.toLowerCase())) : [];

  return (
    <div>
      <PageHeader
        kicker="Analyze"
        title="Resume Upload"
        description="Upload a PDF or DOCX resume and we'll auto-parse the skills it finds into your profile."
      />

      <div className="mb-8 flex flex-wrap items-center justify-between gap-6 overflow-hidden rounded-2xl border border-forest/10 bg-coral/20 px-6 py-6 sm:px-8">
        <div>
          <span className="font-kicker text-xs uppercase tracking-widest text-forest/50">One-time setup</span>
          <p className="mt-2 max-w-xl font-display text-xl font-bold text-forest sm:text-2xl">
            Skip typing your skills one by one — we'll pull them straight from your resume.
          </p>
        </div>
        <img src="/illustrations/6n.png" alt="" className="hidden h-28 w-28 shrink-0 object-contain sm:block" />
      </div>

      <Card>
        <motion.div
          animate={dragging ? { scale: 1.015 } : { scale: 1 }}
          transition={{ duration: 0.15 }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            pickFile(e.dataTransfer.files?.[0]);
          }}
          onClick={() => !file && inputRef.current?.click()}
          className={`flex flex-col items-center gap-3 rounded-xl border-2 border-dashed px-6 py-14 text-center transition-colors ${
            dragging ? "border-forest/50 bg-forest/5" : "border-forest/20"
          } ${!file ? "cursor-pointer hover:border-forest/35" : ""}`}
        >
          {file ? (
            <>
              <span
                className="flex h-12 w-12 items-center justify-center rounded-xl text-xs font-bold text-forest"
                style={{ backgroundColor: kind.color, opacity: 0.85 }}
              >
                <FileText className="h-6 w-6" />
              </span>
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-forest">{file.name}</p>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearFile();
                  }}
                  className="text-forest/40 hover:text-forest"
                  aria-label="Remove file"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="text-xs text-forest/50">
                {kind.label} · {(file.size / 1024).toFixed(0)} KB
              </p>
            </>
          ) : (
            <>
              <UploadCloud className="h-8 w-8 text-forest/50" />
              <div>
                <p className="text-sm font-semibold text-forest">Drop your resume here, or click to browse</p>
                <p className="mt-1 text-xs text-forest/50">PDF or DOCX, up to {MAX_SIZE_MB}MB</p>
              </div>
            </>
          )}
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.docx"
            className="hidden"
            onChange={(e) => pickFile(e.target.files?.[0])}
          />
        </motion.div>

        {error && <p className="mt-4 text-sm font-medium text-red-600">{error}</p>}

        {loading && (
          <div className="mt-4">
            <div className="h-1.5 overflow-hidden rounded-full bg-forest/8">
              <motion.div
                className="h-full rounded-full bg-coral"
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.2 }}
              />
            </div>
            <p className="mt-1 text-xs text-forest/45">{progress < 100 ? `Uploading… ${progress}%` : "Parsing…"}</p>
          </div>
        )}

        <Button onClick={handleUpload} disabled={!file || loading} className="mt-5 w-full sm:w-auto">
          <FileUp className="h-4 w-4" />
          {loading ? "Parsing resume…" : "Upload & Parse"}
        </Button>
      </Card>

      {loading && progress >= 100 && <LoadingState label="Reading your resume…" />}

      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-8"
          >
            <Card>
              <div className="flex items-center gap-2 text-forest">
                <CheckCircle2 className="h-5 w-5" />
                <h2 className="font-display text-base font-bold">Resume parsed</h2>
              </div>

              {result.skills_found_in_resume.length > 0 ? (
                <>
                  <p className="mt-2 text-sm text-forest/60">
                    Found {result.skills_found_in_resume.length} skill
                    {result.skills_found_in_resume.length === 1 ? "" : "s"} in this resume —{" "}
                    <span className="font-semibold text-forest">{newlyAdded.length} new</span> to your profile
                    {alreadyHad.length > 0 && `, ${alreadyHad.length} you already had`}.
                  </p>

                  {newlyAdded.length > 0 && (
                    <div className="mt-4">
                      <span className="font-kicker text-[11px] uppercase tracking-widest text-forest/40">Newly added</span>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {newlyAdded.map((s) => (
                          <SkillChip key={s} skill={s} highlight />
                        ))}
                      </div>
                    </div>
                  )}

                  {alreadyHad.length > 0 && (
                    <div className="mt-4">
                      <span className="font-kicker text-[11px] uppercase tracking-widest text-forest/40">Already in your profile</span>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {alreadyHad.map((s) => (
                          <SkillChip key={s} skill={s} />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p className="mt-2 text-sm text-forest/60">
                  We couldn't confidently detect any tracked skills in this resume.
                </p>
              )}

              <div className="mt-6 border-t border-forest/10 pt-5">
                <span className="font-kicker text-[11px] uppercase tracking-widest text-forest/40">
                  Your full profile now ({result.skills.length})
                </span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {result.skills.map((s) => (
                    <SkillChip key={s} skill={s} />
                  ))}
                </div>
              </div>

              <Button as={Link} to="/app/report" variant="secondary" size="sm" className="mt-6">
                Run a skill-gap report with these skills <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
