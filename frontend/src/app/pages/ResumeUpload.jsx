import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { FileUp, UploadCloud, ArrowRight, CheckCircle2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import * as api from "../../lib/api";
import { PageHeader, Card, Button, Badge, LoadingState } from "../ui";

const MAX_SIZE_MB = 5;

export default function ResumeUpload() {
  const { refreshUser } = useAuth();
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const pickFile = (f) => {
    setError(null);
    setResult(null);
    if (!f) return;
    if (f.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`File too large — max ${MAX_SIZE_MB}MB.`);
      return;
    }
    setFile(f);
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.uploadResume(file);
      setResult(data);
      refreshUser();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader
        kicker="Analyze"
        title="Resume Upload"
        description="Upload a PDF or DOCX resume and we'll auto-parse the skills it finds into your profile."
      />

      <Card>
        <div
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
          onClick={() => inputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed px-6 py-14 text-center transition-colors ${
            dragging ? "border-forest/50 bg-forest/5" : "border-forest/20 hover:border-forest/35"
          }`}
        >
          <UploadCloud className="h-8 w-8 text-forest/50" />
          <div>
            <p className="text-sm font-semibold text-forest">
              {file ? file.name : "Drop your resume here, or click to browse"}
            </p>
            <p className="mt-1 text-xs text-forest/50">PDF or DOCX, up to {MAX_SIZE_MB}MB</p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.docx"
            className="hidden"
            onChange={(e) => pickFile(e.target.files?.[0])}
          />
        </div>

        {error && <p className="mt-4 text-sm font-medium text-red-600">{error}</p>}

        <Button onClick={handleUpload} disabled={!file || loading} className="mt-5 w-full sm:w-auto">
          <FileUp className="h-4 w-4" />
          {loading ? "Parsing resume…" : "Upload & Parse"}
        </Button>
      </Card>

      {loading && <LoadingState label="Reading your resume…" />}

      {result && (
        <div className="mt-8">
          <Card>
            <div className="flex items-center gap-2 text-forest">
              <CheckCircle2 className="h-5 w-5" />
              <h2 className="font-display text-base font-bold">Resume parsed</h2>
            </div>

            {result.skills_found_in_resume.length > 0 ? (
              <>
                <p className="mt-2 text-sm text-forest/60">
                  Found {result.skills_found_in_resume.length} skill
                  {result.skills_found_in_resume.length === 1 ? "" : "s"} and merged them into your profile.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {result.skills_found_in_resume.map((s) => (
                    <Badge key={s} tone="lime">
                      {s}
                    </Badge>
                  ))}
                </div>
              </>
            ) : (
              <p className="mt-2 text-sm text-forest/60">
                We couldn't confidently detect any tracked skills in this resume.
              </p>
            )}

            <div className="mt-6 border-t border-forest/10 pt-5">
              <span className="font-kicker text-[11px] uppercase tracking-widest text-forest/40">
                Your full profile now
              </span>
              <div className="mt-2 flex flex-wrap gap-2">
                {result.skills.map((s) => (
                  <Badge key={s}>{s}</Badge>
                ))}
              </div>
            </div>

            <Button as={Link} to="/app/report" variant="secondary" size="sm" className="mt-6">
              Run a skill-gap report with these skills <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Card>
        </div>
      )}
    </div>
  );
}
