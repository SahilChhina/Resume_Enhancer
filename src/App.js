import React, { useCallback, useEffect, useRef, useState } from "react";

const BASE_URL = (
  process.env.REACT_APP_BACKEND_URL ||
  "https://resumeenhancerbackend-production.up.railway.app"
).replace(/\/$/, "");

const asBackendUrl = (u) => {
  if (!u) return "";
  const s = String(u);
  return s.startsWith("http") ? s : `${BASE_URL}${s}`;
};

const STAGES = [
  { label: "Uploading resume", pct: 15 },
  { label: "Reading document", pct: 30 },
  { label: "Calling Claude AI", pct: 55 },
  { label: "Rewriting bullets", pct: 80 },
  { label: "Generating preview", pct: 95 },
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
      setError("Only .docx files are supported.");
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

  const reset = () => {
    setError("");
    setMsg("");
    setPdfUrl("");
    setDocxUrl("");
    setStats(null);
  };

  const handleEnhance = async () => {
    reset();
    if (!resumeFile) return setError("Upload a .docx resume first.");
    if (!jobDescription.trim()) return setError("Paste a job description.");

    const formData = new FormData();
    formData.append("resume", resumeFile);
    formData.append("jobDescription", jobDescription.trim());

    setLoading(true);
    setStageIdx(0);
    stageTimer.current = setInterval(() => {
      setStageIdx((i) => (i < STAGES.length - 1 ? i + 1 : i));
    }, 4500);

    try {
      const res = await fetch(`${BASE_URL}/enhance`, { method: "POST", body: formData });
      let data;
      const ct = res.headers.get("content-type") || "";
      if (ct.includes("application/json")) {
        data = await res.json();
      } else {
        const txt = await res.text();
        throw new Error(`HTTP ${res.status}: ${txt.slice(0, 200)}`);
      }
      if (!res.ok || data.status !== "success") throw new Error(data?.message || `HTTP ${res.status}`);
      setDocxUrl(asBackendUrl(data.docx_url));
      setPdfUrl(asBackendUrl(data.pdf_url));
      setMsg(data.message || "");
      setStats({ applied: data.changes_applied, total: data.paragraphs_total });
    } catch (err) {
      setError(err.message || "Enhancement failed.");
    } finally {
      clearInterval(stageTimer.current);
      setLoading(false);
    }
  };

  const canSubmit = !loading && !!resumeFile && !!jobDescription.trim();
  const stage = STAGES[stageIdx];

  return (
    <div className="min-h-screen bg-slate-950 text-white">

      {/* Hero */}
      <header className="border-b border-slate-800 bg-slate-950">
        <div className="max-w-4xl mx-auto px-6 py-10">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs font-semibold tracking-widest text-indigo-400 uppercase">Powered by Claude</span>
          </div>
          <h1 className="text-5xl font-bold tracking-tight text-white">AI Resume Enhancer</h1>
          <p className="mt-3 text-slate-400 text-lg max-w-2xl">
            Paste a job description, upload your resume — Claude rewrites your bullets to match the role
            while keeping your formatting, fonts, and facts intact.
          </p>
          {backendReady === false && (
            <div className="mt-4 inline-flex items-center gap-2 text-sm bg-amber-950 border border-amber-800 text-amber-300 rounded-lg px-4 py-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              Backend warming up — first request may take ~30s
            </div>
          )}
          {backendReady === true && (
            <div className="mt-4 inline-flex items-center gap-2 text-sm text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              Backend ready
            </div>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10 space-y-6">

        {/* Step 1 — Job Description */}
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="w-7 h-7 rounded-full bg-indigo-600 text-white text-sm font-bold flex items-center justify-center flex-shrink-0">1</span>
            <h2 className="text-lg font-semibold text-white">Paste the Job Description</h2>
          </div>
          <textarea
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Paste the full job description here…"
            rows={10}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
          />
          <p className="text-xs text-slate-500 mt-2">{jobDescription.length} characters</p>
        </section>

        {/* Step 2 — Upload */}
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="w-7 h-7 rounded-full bg-indigo-600 text-white text-sm font-bold flex items-center justify-center flex-shrink-0">2</span>
            <h2 className="text-lg font-semibold text-white">Upload Your Resume</h2>
          </div>

          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            className={`cursor-pointer rounded-xl border-2 border-dashed p-10 text-center transition-all ${
              dragging
                ? "border-indigo-400 bg-indigo-950"
                : resumeFile
                ? "border-emerald-500 bg-emerald-950"
                : "border-slate-700 hover:border-slate-500 bg-slate-800"
            }`}
          >
            <input ref={inputRef} type="file" accept=".docx" onChange={(e) => acceptFile(e.target.files?.[0])} className="hidden" />
            {resumeFile ? (
              <div>
                <div className="text-2xl mb-2">✓</div>
                <div className="text-emerald-300 font-medium">{resumeFile.name}</div>
                <div className="text-slate-400 text-sm mt-1">{(resumeFile.size / 1024).toFixed(1)} KB — click to replace</div>
              </div>
            ) : (
              <div>
                <div className="text-3xl mb-3 text-slate-500">↑</div>
                <div className="text-slate-300 font-medium">Drop your resume here, or click to browse</div>
                <div className="text-slate-500 text-sm mt-1">.docx only · max 20 MB</div>
              </div>
            )}
          </div>

          {error && (
            <div className="mt-3 text-sm bg-red-950 border border-red-800 text-red-300 rounded-lg px-4 py-3">
              {error}
            </div>
          )}
        </section>

        {/* Step 3 — Enhance */}
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="w-7 h-7 rounded-full bg-indigo-600 text-white text-sm font-bold flex items-center justify-center flex-shrink-0">3</span>
            <h2 className="text-lg font-semibold text-white">Enhance</h2>
          </div>

          <button
            onClick={handleEnhance}
            disabled={!canSubmit}
            className="w-full rounded-xl py-4 font-semibold text-base transition-all bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed"
          >
            {loading ? "Enhancing…" : "Enhance Resume"}
          </button>

          {loading && (
            <div className="mt-5">
              <div className="flex justify-between text-xs text-slate-400 mb-2">
                <span>{stage.label}…</span>
                <span>{stage.pct}%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full transition-all duration-700"
                  style={{ width: `${stage.pct}%` }}
                />
              </div>
            </div>
          )}
        </section>

        {/* Results */}
        {(docxUrl || pdfUrl) && (
          <section className="bg-slate-900 border border-emerald-800 rounded-2xl p-6">
            <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
              <div>
                <h2 className="text-xl font-bold text-white">Enhanced Resume</h2>
                {stats && (
                  <p className="text-slate-400 text-sm mt-1">
                    Claude rewrote <span className="text-emerald-400 font-medium">{stats.applied}</span> of {stats.total} paragraphs.
                  </p>
                )}
                {msg && <p className="text-amber-400 text-xs mt-1">{msg}</p>}
              </div>
              {docxUrl && (
                <a
                  href={docxUrl}
                  download
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-5 py-3 transition-all"
                >
                  ↓ Download .docx
                </a>
              )}
            </div>
            {pdfUrl ? (
              <iframe
                src={pdfUrl}
                title="Resume preview"
                className="w-full h-[850px] rounded-xl border border-slate-700"
              />
            ) : (
              <div className="text-center py-10 text-slate-500 text-sm border border-slate-800 rounded-xl">
                PDF preview unavailable on this deployment — download the .docx above.
              </div>
            )}
          </section>
        )}
      </main>

      <footer className="border-t border-slate-800 mt-10">
        <div className="max-w-4xl mx-auto px-6 py-5 flex items-center justify-between text-xs text-slate-600">
          <span>AI Resume Enhancer</span>
          <span>Built with Claude</span>
        </div>
      </footer>
    </div>
  );
}
