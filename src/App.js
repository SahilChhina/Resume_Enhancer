import React, { useEffect, useState } from "react";

const BASE_URL = "https://resume-enhancer-backend-rui4.onrender.com";

export default function App() {
  const [resumeFile, setResumeFile] = useState(null);
  const [jobDescription, setJobDescription] = useState("");
  const [pdfUrl, setPdfUrl] = useState("");
  const [docxUrl, setDocxUrl] = useState("");
  const [loading, setLoading] = useState(false);

  // Wake the Render server to avoid cold-start delay
  useEffect(() => {
    fetch(`${BASE_URL}/`).catch(() => {});
  }, []);

  const handleEnhance = async () => {
    if (!resumeFile || !jobDescription.trim()) {
      alert("Please upload a resume and paste a job description.");
      return;
    }

    const formData = new FormData();
    formData.append("resume", resumeFile);
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
        throw new Error(`Non-JSON response (HTTP ${res.status}): ${txt.slice(0, 200)}`);
      }

      if (res.ok && data.status === "success") {
        const ts = Date.now();
        if (data.pdf_url) setPdfUrl(`${BASE_URL}${data.pdf_url}?ts=${ts}`);
        setDocxUrl(`${BASE_URL}${data.docx_url}?ts=${ts}`);
      } else {
        throw new Error(data?.message || `HTTP ${res.status}`);
      }
    } catch (error) {
      console.error("Error uploading:", error);
      alert("Upload failed: " + (error.message || "Unknown error"));
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

      {pdfUrl && (
        <>
          <h2>Preview</h2>
          <iframe
            src={pdfUrl}
            title="Resume Preview"
            width="100%"
            height="600px"
            style={{ border: "1px solid #ccc" }}
          />
        </>
      )}

      {docxUrl && (
        <p>
          <a href={docxUrl} download>
            Download Enhanced Resume (Word File)
          </a>
        </p>
      )}
    </div>
  );
}
