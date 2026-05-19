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

  const handleEnhance = async () => {
    setError(""); setMsg(""); setPdfUrl(""); setDocxUrl(""); setStats(null);
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
      if ((res.headers.get("content-type") || "").includes("application/json")) {
        data = await res.json();
      } else {
        throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
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
    <div className="min-h-screen bg-gray-50">

      {/* Nav */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-green-600 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            </div>
            <span className="font-semibold text-gray-900">ResumeAI</span>
          </div>
          <span className="text-xs text-gray-400">Powered by Claude</span>
        </div>
      </nav>

      {/* Hero */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-6 py-12">
          <div className="max-w-2xl">
            <span className="inline-block text-xs font-semibold text-green-700 bg-green-50 border border-green-200 rounded-full px-3 py-1 mb-4">
              AI-Powered · No data stored
            </span>
            <h1 className="text-4xl font-bold text-gray-900 leading-tight">
              Tailor your resume to<br />any job in seconds
            </h1>
            <p className="mt-3 text-gray-500 text-lg">
              Paste a job description, upload your .docx — Claude rewrites your bullets to match
              the role while keeping your formatting and facts intact.
            </p>
            {backendReady === false && (
              <div className="mt-4 inline-flex items-center gap-2 text-sm bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-3 py-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse flex-shrink-0" />
                Backend warming up — first request may take ~30s
              </div>
            )}
            {backendReady === true && (
              <div className="mt-4 inline-flex items-center gap-2 text-sm text-green-700">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
                Ready
              </div>
            )}
          </div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-5">

        <div className="grid md:grid-cols-2 gap-5">
          {/* Job Description */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-6 h-6 rounded-full bg-green-600 text-white text-xs font-bold flex items-center justify-center">1</span>
              <h2 className="font-semibold text-gray-800">Job Description</h2>
            </div>
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the full job description here…"
              rows={12}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
            />
            <p className="text-xs text-gray-400 mt-2">{jobDescription.length} characters</p>
          </div>

          {/* Upload + Action */}
          <div className="flex flex-col gap-5">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex-1">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-6 h-6 rounded-full bg-green-600 text-white text-xs font-bold flex items-center justify-center">2</span>
                <h2 className="font-semibold text-gray-800">Your Resume</h2>
              </div>
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                onClick={() => inputRef.current?.click()}
                className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-all ${
                  dragging
                    ? "border-green-400 bg-green-50"
                    : resumeFile
                    ? "border-green-400 bg-green-50"
                    : "border-gray-300 hover:border-green-400 hover:bg-green-50"
                }`}
              >
                <input ref={inputRef} type="file" accept=".docx" onChange={(e) => acceptFile(e.target.files?.[0])} className="hidden" />
                {resumeFile ? (
                  <div>
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-2">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div className="text-green-700 font-medium text-sm">{resumeFile.name}</div>
                    <div className="text-gray-400 text-xs mt-1">{(resumeFile.size / 1024).toFixed(1)} KB · click to replace</div>
                  </div>
                ) : (
                  <div>
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-2">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                    </div>
                    <div className="text-gray-600 font-medium text-sm">Drop your resume here</div>
                    <div className="text-gray-400 text-xs mt-1">.docx only · max 20 MB</div>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-6 h-6 rounded-full bg-green-600 text-white text-xs font-bold flex items-center justify-center">3</span>
                <h2 className="font-semibold text-gray-800">Enhance</h2>
              </div>
              <button
                onClick={handleEnhance}
                disabled={!canSubmit}
                className="w-full rounded-xl py-3.5 font-semibold text-sm transition-all bg-green-600 hover:bg-green-700 text-white disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? "Enhancing…" : "Enhance Resume"}
              </button>

              {loading && (
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                    <span>{stage.label}…</span>
                    <span>{stage.pct}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full transition-all duration-700"
                      style={{ width: `${stage.pct}%` }}
                    />
                  </div>
                </div>
              )}

              {error && (
                <div className="mt-3 text-sm bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2">
                  {error}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Results */}
        {(docxUrl || pdfUrl) && (
          <div className="bg-white rounded-2xl border border-green-200 shadow-sm p-6">
            <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Enhanced Resume</h2>
                {stats && (
                  <p className="text-gray-500 text-sm mt-1">
                    Claude rewrote <span className="text-green-600 font-semibold">{stats.applied}</span> of {stats.total} paragraphs.
                  </p>
                )}
                {msg && <p className="text-amber-600 text-xs mt-1">{msg}</p>}
              </div>
              {docxUrl && (
                <a
                  href={docxUrl}
                  download
                  className="inline-flex items-center gap-2 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold text-sm px-5 py-2.5 transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download .docx
                </a>
              )}
            </div>
            {pdfUrl ? (
              <iframe src={pdfUrl} title="Resume preview" className="w-full h-[850px] rounded-xl border border-gray-200" />
            ) : (
              <div className="text-center py-10 text-gray-400 text-sm border border-gray-100 rounded-xl bg-gray-50">
                PDF preview unavailable — download the .docx above.
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="border-t border-gray-200 mt-10 bg-white">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between text-xs text-gray-400">
          <span>ResumeAI</span>
          <span>Built with Claude</span>
        </div>
      </footer>
    </div>
  );
}
