import React, { useEffect, useState } from "react";

const BASE_URL = "https://resume-enhancer-backend-rui4.onrender.com";

export default function App() {
  const [resumeFile, setResumeFile] = useState(null);
  const [jobDescription, setJobDescription] = useState("");
  const [pdfUrl, setPdfUrl] = useState("");   // preview (optional)
  const [docxUrl, setDocxUrl] = useState(""); // download
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  // Wake server (avoid cold start)
  useEffect(() => { fetch(`${BASE_URL}/`).catch(()=>{}); }, []);

  const handleEnhance = async () => {
    setMsg("");
    setPdfUrl("");
    setDocxUrl("");

    if (!resumeFile) { alert("Please upload a resume."); return; }
    if (!jobDescription.trim()) { alert("Please paste a job description."); return; }

    const formData = new FormData();
    formData.append("resume", resumeFile);
    // IMPORTANT: backend expects camelCase; but it also accepts snake_case now
    formData.append("jobDescription", jobDescription.trim());

    try {
      setLoading(true);

      const res = await fetch(`${BASE_URL}/enhance`, {
        method: "POST",
        body: formData,
      });

      let data;
      try {
        data = await res.json();
      } catch {
        const txt = await res.text();
        throw new Error(`Non-JSON response (HTTP ${res.status}): ${txt.slice(0,200)}`);
      }

      if (res.ok && data.status === "success") {
        const ts = Date.now();
        if (data.pdf_url) setPdfUrl(`${BASE_URL}${data.pdf_url}?ts=${ts}`); // only if present
        setDocxUrl(`${BASE_URL}${data.docx_url}?ts=${ts}`);
        if (data.message) setMsg(data.message);
      } else {
        throw new Error(data?.message || `HTTP ${res.status}`);
      }
    } catch (err) {
      console.error(err);
      alert(`Upload failed: ${err.message || "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>AI Resume Enhance</h1>

      <textarea
        value={jobDescription}
        onChange={(e) => setJobDescription(e.target.value)}
        placeholder="Paste job description here"
        rows={10}
        style={{ width: "90%" }}
      />

      <br />
      <input type="file" accept=".docx" onChange={(e) => setResumeFile(e.target.files[0])} />
      <br />
      <button onClick={handleEnhance} disabled={loading}>
        {loading ? "Enhancing..." : "Enhance Resume"}
      </button>

      {msg && <p style={{marginTop:8}}>{msg}</p>}

      {/* Only render PDF preview if backend provided it */}
      {pdfUrl && (
        <>
          <h2>Preview</h2>
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
        <p style={{ marginTop: 12 }}>
          <a href={docxUrl} download>Download Enhanced Resume (Word File)</a>
        </p>
      )}
    </div>
  );
}
