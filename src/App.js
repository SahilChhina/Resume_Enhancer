import React, { useCallback, useEffect, useRef, useState } from "react";

const BASE_URL = (
  process.env.REACT_APP_BACKEND_URL ||
  "https://resume-enhancer-backend-1.onrender.com"
).replace(/\/$/, "");

const asBackendUrl = (u) => {
  if (!u) return "";
  const s = String(u);
  return s.startsWith("http") ? s : `${BASE_URL}${s}`;
};

const STAGES = [
  "Uploading resume",
  "Reading document",
  "Calling Claude",
  "Rewriting bullets",
  "Generating preview",
];

export default function App() {
  const [resumeFile, setResumeFile] = useState(null);
  const [jobDescription, setJobDescription] = useState("");
  const [pdfUrl, setPdfUrl] = useState("");
  const [docxUrl, setDocxUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [stageIdx, setStageIdx] = useState(0);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [dragging, setDragging] = useState(false);
  const [backendReady, setBackendReady] = useState(null);
  const inputRef = useRef(null);
  const stageTimer = useRef(null);

  // Warm the backend (free tier cold-start)
  useEffect(() => {
    fetch(`${BASE_URL}/`)
      .then((r) => r.json())
      .then((d) => setBackendReady(!!d.ai_configured))
      .catch(() => setBackendReady(false));
  }, []);

  useEffect(() => () => clearInterval(stageTimer.current), []);

  const acceptFile = (f) => {
    if (!f) return;
    if (!f.name.toLowerCase().endsWith(".docx")) {
      setError("Please upload a .docx file.");
      return;
    }
    setError("");
    setResumeFile(f);
  };

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    acceptFile(e.dataTransfer.files?.[0]);
  }, []);

  const handleEnhance = async () => {
    setError("");
    setMsg("");
    setPdfUrl("");
    setDocxUrl("");
    setStats(null);

    if (!resumeFile) return setError("Upload a .docx resume first.");
    if (!jobDescription.trim()) return setError("Paste the job description.");

    const formData = new FormData();
    formData.append("resume", resumeFile);
    formData.append("jobDescription", jobDescription.trim());

    setLoading(true);
    setStageIdx(0);
    stageTimer.current = setInterval(() => {
      setStageIdx((i) => (i < STAGES.length - 1 ? i + 1 : i));
    }, 4000);

    try {
      const res = await fetch(`${BASE_URL}/enhance`, {
        method: "POST",
        body: formData,
      });

      let data;
      const ct = res.headers.get("content-type") || "";
      if (ct.includes("application/json")) {
        data = await res.json();
      } else {
        const txt = await res.text();
        throw new Error(`HTTP ${res.status}: ${txt.slice(0, 200)}`);
      }

      if (!res.ok || data.status !== "success") {
        throw new Error(data?.message || `HTTP ${res.status}`);
      }

      setDocxUrl(asBackendUrl(data.docx_url));
      setPdfUrl(asBackendUrl(data.pdf_url));
      setMsg(data.message || "");
      setStats({
        applied: data.changes_applied,
        total: data.paragraphs_total,
      });
    } catch (err) {
      setError(err.message || "Enhancement failed.");
    } finally {
      clearInterval(stageTimer.current);
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-5xl mx-auto px-4 py-10">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 tracking-tight">
            AI Resume Enhancer
          </h1>
          <p className="text-slate-600 mt-2">
            Tailor your resume to a job description using Claude. Your existing experience,
            formatting, and dates are preserved — only the phrasing is sharpened.
          </p>
          {backendReady === false && (
            <div className="mt-3 text-sm bg-amber-50 border border-amber-200 text-amber-900 rounded px-3 py-2">
              Backend not ready (cold start or missing API key). First request may take ~30s.
            </div>
          )}
        </header>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Job Description */}
          <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Job Description
            </label>
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the full job description here…"
              rows={14}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
            />
            <p className="text-xs text-slate-500 mt-1">
              {jobDescription.length} characters
            </p>
          </section>

          {/* Resume Upload */}
          <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Resume (.docx)
            </label>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => inputRef.current?.click()}
              className={`cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition ${
                dragging
                  ? "border-indigo-500 bg-indigo-50"
                  : resumeFile
                  ? "border-emerald-400 bg-emerald-50"
                  : "border-slate-300 hover:border-slate-400 bg-slate-50"
              }`}
            >
              <input
                ref={inputRef}
                type="file"
                accept=".docx"
                onChange={(e) => acceptFile(e.target.files?.[0])}
                className="hidden"
              />
              {resumeFile ? (
                <div>
                  <div className="text-emerald-700 font-medium">{resumeFile.name}</div>
                  <div className="text-xs text-slate-500 mt-1">
                    {(resumeFile.size / 1024).toFixed(1)} KB — click to replace
                  </div>
                </div>
              ) : (
                <div>
                  <div className="text-slate-700 font-medium">
                    Drop your resume here, or click to browse
                  </div>
                  <div className="text-xs text-slate-500 mt-1">.docx only, max 20 MB</div>
                </div>
              )}
            </div>

            <button
              onClick={handleEnhance}
              disabled={loading || !resumeFile || !jobDescription.trim()}
              className="mt-5 w-full rounded-lg bg-indigo-600 text-white font-medium py-3 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition"
            >
              {loading ? "Enhancing…" : "Enhance Resume"}
            </button>

            {loading && (
              <div className="mt-4">
                <div className="text-sm text-slate-600 mb-2">{STAGES[stageIdx]}…</div>
                <div className="h-1.5 w-full bg-slate-200 rounded overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 transition-all duration-500"
                    style={{ width: `${((stageIdx + 1) / STAGES.length) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="mt-3 text-sm bg-red-50 border border-red-200 text-red-700 rounded px-3 py-2">
                {error}
              </div>
            )}
          </section>
        </div>

        {/* Results */}
        {(docxUrl || pdfUrl) && (
          <section className="mt-8 bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Enhanced Resume</h2>
                {stats && (
                  <p className="text-sm text-slate-500 mt-1">
                    Rewrote {stats.applied} of {stats.total} paragraphs.
                  </p>
                )}
                {msg && <p className="text-xs text-amber-700 mt-1">{msg}</p>}
              </div>
              {docxUrl && (
                <a
                  href={docxUrl}
                  download
                  className="rounded-lg bg-emerald-600 text-white font-medium px-4 py-2 hover:bg-emerald-700"
                >
                  Download .docx
                </a>
              )}
            </div>
            {pdfUrl ? (
              <iframe
                src={pdfUrl}
                title="Resume preview"
                className="w-full h-[800px] border border-slate-200 rounded"
              />
            ) : (
              <div className="text-sm text-slate-500 italic">
                PDF preview unavailable on this deployment. Download the .docx above.
              </div>
            )}
          </section>
        )}

        <footer className="mt-10 text-center text-xs text-slate-400">
          Built with Claude
        </footer>
      </div>
    </main>
  );
}
