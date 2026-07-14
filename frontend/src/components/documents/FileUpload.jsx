import { useCallback, useRef, useState } from "react";
import toast from "react-hot-toast";
import { documentAPI } from "../../api/services.js";

const ACCEPTED_TYPES = [
  "application/pdf",
  "text/plain",
  "text/markdown",
  "text/x-markdown",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/png",
  "image/jpeg",
  "image/webp",
];
const ACCEPTED_EXT = [".pdf", ".txt", ".md", ".docx", ".png", ".jpg", ".jpeg", ".webp"];
const IMAGE_EXT = [".png", ".jpg", ".jpeg", ".webp"];
const MAX_FILE_MB = 15;

function isImageFile(name = "") {
  const lower = name.toLowerCase();
  return IMAGE_EXT.some((ext) => lower.endsWith(ext));
}

function isPdfFile(name = "") {
  return name.toLowerCase().endsWith(".pdf");
}

function fileTypeLabel(name = "") {
  const lower = name.toLowerCase();
  if (lower.endsWith(".pdf"))  return "PDF";
  if (lower.endsWith(".docx")) return "DOC";
  if (lower.endsWith(".md"))   return "MD";
  if (lower.endsWith(".txt"))  return "TXT";
  if (isImageFile(lower)) return "IMG";
  return "FILE";
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function FileUpload({ onUploaded }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const validateFile = (f) => {
    const ext = "." + f.name.split(".").pop().toLowerCase();
    if (!ACCEPTED_TYPES.includes(f.type) && !ACCEPTED_EXT.includes(ext)) {
      toast.error("Only PDF, Word (.docx), TXT, Markdown, or photo files are supported.");
      return false;
    }
    if (f.size > MAX_FILE_MB * 1024 * 1024) {
      toast.error(`File must be under ${MAX_FILE_MB} MB.`);
      return false;
    }
    return true;
  };

  const pickFile = (f) => {
    if (!validateFile(f)) return;
    setFile(f);
    setTitle(f.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " "));
  };

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) pickFile(f);
  }, []);

  const handleUpload = async () => {
    if (!file) { toast.error("Please select a file first."); return; }
    if (!title.trim()) { toast.error("Please enter a title."); return; }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", title.trim());
    formData.append("subject", subject.trim() || "general");

    setUploading(true);
    setProgress(10);

    const ticker = setInterval(() => setProgress((p) => Math.min(p + 8, 85)), 400);

    try {
      const data = await documentAPI.upload(formData);
      clearInterval(ticker);
      setProgress(100);
      toast.success(
        data.extractionMethod === "ocr"
          ? `"${data.title}" added — ${data.chunkCount} chunks (read via OCR)`
          : `"${data.title}" added — ${data.chunkCount} chunks`
      );
      setTimeout(() => {
        setFile(null);
        setTitle("");
        setSubject("");
        setProgress(0);
        setUploading(false);
        onUploaded?.(data);
      }, 600);
    } catch (err) {
      clearInterval(ticker);
      setProgress(0);
      setUploading(false);
      toast.error(err.response?.data?.error ?? "Upload failed. Please try again.");
    }
  };

  const showOcrHint = file && (isImageFile(file.name) || isPdfFile(file.name));

  return (
    <div className="space-y-4">
      {}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => !file && inputRef.current?.click()}
        className="relative rounded-xl p-6 text-center transition-all duration-200"
        style={{
          border: dragging
            ? `1.5px dashed var(--amber-rule)`
            : file
            ? `1.5px dashed var(--rule-strong)`
            : `1.5px dashed var(--rule)`,
          background: dragging
            ? "var(--amber-dim)"
            : file
            ? "var(--surface-0)"
            : "transparent",
          cursor: file ? "default" : "pointer",
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_EXT.join(",")}
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) pickFile(f); }}
        />

        {file ? (
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {}
              <span
                className="text-xs font-mono font-semibold px-2 py-0.5 rounded flex-shrink-0"
                style={{
                  color: "var(--amber)",
                  background: "var(--amber-dim)",
                  border: "1px solid rgba(201,135,58,0.22)",
                }}
              >
                {fileTypeLabel(file.name)}
              </span>
              <div className="text-left min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: "var(--text-1)" }}>{file.name}</p>
                <p className="text-xs font-mono" style={{ color: "var(--text-3)", fontSize: "10px" }}>{formatBytes(file.size)}</p>
              </div>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); setFile(null); setTitle(""); setProgress(0); }}
              className="transition-colors flex-shrink-0 p-1 rounded-md"
              style={{ color: "var(--text-3)" }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "var(--red-text)"; e.currentTarget.style.background = "var(--red-dim)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-3)"; e.currentTarget.style.background = "transparent"; }}
              aria-label="Remove file"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        ) : (
          <div>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-6 h-6 mx-auto mb-2"
              style={{ color: "var(--text-3)" }}
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-sm" style={{ color: "var(--text-2)" }}>
              {dragging ? "Drop here" : "Drag & drop or click to upload"}
            </p>
            <p className="text-xs mt-1 font-mono" style={{ color: "var(--text-3)", fontSize: "10px" }}>
              PDF, DOCX, TXT, MD, or photo — up to {MAX_FILE_MB} MB
            </p>
          </div>
        )}
      </div>

      {}
      {file && (
        <div className="space-y-3">
          <div>
            <label
              className="block text-xs font-semibold mb-1.5 uppercase tracking-wide font-mono"
              style={{ color: "var(--text-3)" }}
            >
              Title *
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Chapter 3 — Newton's Laws"
              className="w-full px-4 py-2.5 rounded-lg text-sm glass-input"
              style={{ color: "var(--text-1)" }}
            />
          </div>
          <div>
            <label
              className="block text-xs font-semibold mb-1.5 uppercase tracking-wide font-mono"
              style={{ color: "var(--text-3)" }}
            >
              Subject (optional)
            </label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Physics, History, Biology…"
              className="w-full px-4 py-2.5 rounded-lg text-sm glass-input"
              style={{ color: "var(--text-1)" }}
            />
          </div>

          {showOcrHint && (
            <p
              className="text-xs rounded-lg px-3 py-2 flex items-start gap-1.5"
              style={{
                color: "var(--blue-info)",
                background: "var(--blue-dim)",
                border: "1px solid rgba(91,143,201,0.22)",
              }}
            >
              <span className="flex-shrink-0">↳</span>
              <span>
                {isImageFile(file.name)
                  ? "This photo will be read with OCR — clear, well-lit text works best."
                  : "If this PDF is a scan, it will be read automatically with OCR."}
              </span>
            </p>
          )}

          {uploading && (
            <div className="rounded-full h-0.5 overflow-hidden" style={{ background: "var(--rule)" }}>
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${progress}%`,
                  background: "var(--amber)",
                }}
              />
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={uploading}
            className="w-full py-2.5 rounded-lg btn-primary text-sm flex items-center justify-center gap-2"
          >
            {uploading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 rounded-full animate-spin" style={{ borderColor: "#1a1814", borderTopColor: "transparent" }} />
                {showOcrHint ? "Uploading & reading…" : "Uploading…"}
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Upload & Process
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
