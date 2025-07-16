import React, { useState } from "react";

function App() {
  const [jobDescription, setJobDescription] = useState("");
  const [resumeFile, setResumeFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!jobDescription || !resumeFile) {
      alert("Both resume and job description are required.");
      return;
    }

    const formData = new FormData();
    formData.append("job_description", jobDescription);
    formData.append("resume", resumeFile);

    setLoading(true);

    try {
      const res = await fetch("https://resume-enhancer-backend-rui4.onrender.com/enhance", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");

      const blob = await res.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      setDownloadUrl(objectUrl);
      setPreviewUrl("https://resume-enhancer-backend-rui4.onrender.com/preview");

    } catch (err) {
      console.error("Upload failed:", err);
      alert("Error uploading: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white px-6 py-10 font-sans">
      <header className="flex items-center justify-between mb-12">
        <div className="flex items-center gap-3">
          <img
            src={`${process.env.PUBLIC_URL}/logo.png`}
            alt="logo"
            className="w-12 h-18 object-contain"
          />
          <h1 className="text-2xl font-bold text-gray-800">
            AI <span className="text-green-600 font-semibold">Resume</span> Enhance
          </h1>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <div>
          <h2 className="text-4xl font-bold mb-4">
            Tailor your <span className="text-green-600 font-semibold">resume</span> to any job
          </h2>
          <p className="text-gray-600 mb-6">
            Paste a job description and upload your{" "}
            <span className="text-green-600 font-semibold">resume</span>. Our AI will rewrite your
            skills section to match.
          </p>

          <textarea
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Paste job description here..."
            className="w-full h-48 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
          ></textarea>

          <button
            onClick={handleSubmit}
            className="mt-4 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold"
            disabled={loading}
          >
            {loading ? "Enhancing..." : "Enhance Resume"}
          </button>

          {downloadUrl && (
            <div className="flex flex-col mt-4 gap-3">
              <a
                href={downloadUrl}
                download="enhanced_resume.docx"
                className="bg-white border border-green-600 text-green-600 hover:bg-green-50 px-6 py-2 rounded-lg font-medium text-center"
              >
                Download Enhanced Resume (Word File)
              </a>
              <a
                href="https://resume-enhancer-backend-rui4.onrender.com/preview"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white border border-green-600 text-green-600 hover:bg-green-50 px-6 py-2 rounded-lg font-medium text-center"
              >
                Download Enhanced Resume (PDF)
              </a>
            </div>
          )}
        </div>

        <div className="flex flex-col items-center justify-center border border-dashed border-gray-400 p-6 rounded-lg w-full">
          {!resumeFile ? (
            <>
              <input
                type="file"
                accept=".docx"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    setResumeFile(file);
                  }
                }}
                className="mb-4"
              />
              <p className="text-gray-500 text-center">
                Upload your{" "}
                <span className="text-green-600 font-semibold">resume</span> (.docx)
              </p>
            </>
          ) : previewUrl ? (
            <iframe
              src={previewUrl}
              title="Resume Preview"
              className="w-full h-[700px] border rounded-md shadow-lg"
            />
          ) : (
            <div className="text-center">
              <p className="text-green-700 text-lg font-semibold mb-2">✅ Resume Selected</p>
              <p className="text-gray-800">{resumeFile.name}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
