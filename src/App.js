// src/App.js
import React, { useEffect, useState } from "react";

// Render backend root (no trailing slash)
const BASE_URL = "https://resume-enhancer-backend-1.onrender.com";

// Use absolute URLs as-is; otherwise prefix with backend base
const makeUrl = (u) => {
  if (!u) return "";
  const s = String(u);
  return (s.startsWith("http://") || s.startsWith("https://")) ? s : `${BASE_URL}${s}`;
};

export default function App() {
  const [resumeFile, setResumeFile] = useState(null);
  const [jobDescription, setJobDescription] = useState("");
  const [pdfUrl, setPdfUrl] = useState("");    // optional preview
  const [docxUrl, setDocxUrl] = useState("");  // download link
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  // Warm the backend (avoid cold start delay)
  useEffect(() => { fetch(`${BASE_URL}/`).catch(() => {}); }, []);

  const handleEnhance = async () => {
    setMsg("");
    setPdfUrl("");
    setDocxUrl("");

    if (!resumeFile) { alert("Please upload a .docx resume."); return; }
    if (!jobDescription.trim()) { alert("Please paste a job description."); return; }

    const formData = new FormData();
    formData.append("resume", resumeFile);
    formData.append("jobDescription", jobDescription.trim()); // backend accepts multiple keys

    try {
      setLoading(true);
      const res = await fetch(`${BASE_URL}/enhance`, { method: "POST", body: formData });

      let data;
      try {
        data = await res.json();
      } catch {
        const txt = await res.text();
        throw new Error(`Non-JSON response (HTTP ${res.status}): ${txt.slice(0,200)}`);
      }

      if (!res.ok || data.status !== "success") {
        throw new Error(data?.message || `HTTP ${res.status}`);
      }

      // Use URLs exactly as returned; avoid query strings on Word file
      if (data.pdf_url) setPdfUrl(makeUrl(data.pdf_url));
      setDocxUrl(makeUrl(data.docx_url));
      if (data.message) setMsg(data.message);
    } catch (err) {
      console.error(err);
      alert(`Enhance failed: ${err.message || "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 16 }}>
      <h1>AI Resume Enhance</h1>
      <p>Paste a job description and upload your <strong>.docx</strong> resume.</p>

      <textarea
        value={jobDescription}
        onChange={(e) => setJobDescription(e.target.value)}
        placeholder="Paste job description here"
        rows={10}
        style={{ width: "100%", fontFamily: "inherit" }}
      />

      <div style={{ marginTop: 12 }}>
        <input
          type="file"
          accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
        />
      </div>

      <div style={{ marginTop: 12 }}>
        <button onClick={handleEnhance} disabled={loading}>
          {loading ? "Enhancing..." : "Enhance Resume"}
        </button>
      </div>

      {msg && <p style={{ marginTop: 8, color: "#666" }}>{msg}</p>}

      {pdfUrl && (
        <>
          <h2 style={{ marginTop: 16 }}>Preview</h2>
          <iframe
            src={pdfUrl}
            title="Resume Preview"
            width="100%"
            height="600"
            style={{ border: "1px solid #ccc" }}
          />
        </>
      )}

      {docxUrl && (
        <p style={{ marginTop: 16 }}>
          <a href={docxUrl} download>Download Enhanced Resume (Word File)</a>
        </p>
      )}
    </div>
  );
}
