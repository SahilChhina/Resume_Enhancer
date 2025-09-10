import React, { useState } from "react";

export default function App() {
  const [resumeFile, setResumeFile] = useState(null);
  const [jobDescription, setJobDescription] = useState("");
  const [pdfUrl, setPdfUrl] = useState("");
  const [docxUrl, setDocxUrl] = useState("");

  const handleEnhance = async () => {
    if (!resumeFile || !jobDescription) {
      alert("Please upload a resume and paste a job description.");
      return;
    }

    const formData = new FormData();
    formData.append("resume", resumeFile);
    formData.append("jobDescription", jobDescription); // ✅ Must match Flask backend

    try {
      const res = await fetch("https://resume-enhancer-backend-rui4.onrender.com/enhance", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (res.ok && data.status === "success") {
        setPdfUrl("https://resume-enhancer-backend-rui4.onrender.com" + data.pdf_url + "?ts=" + Date.now());
        setDocxUrl("https://resume-enhancer-backend-rui4.onrender.com" + data.docx_url);
      } else {
        alert("Enhancement failed: " + (data.message || "Unknown error"));
      }
    } catch (error) {
      console.error("Error uploading:", error);
      alert("Upload failed: " + error.message);
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
      <button onClick={handleEnhance}>Enhance Resume</button>

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
          <br />
          <a href={docxUrl} download>
            Download Enhanced Resume (Word File)
          </a>
        </>
      )}
    </div>
  );
}
