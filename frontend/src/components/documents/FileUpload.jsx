

import { useCallback, useRef, useState } from "react";
import toast from "react-hot-toast";
import { documentAPI } from "../../api/services.js";

const ACCEPTED_TYPES = [
  "application/pdf",
  "text/plain",
  "text/markdown",
  "text/x-markdown",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
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

function fileIcon(name = "") {
  const lower = name.toLowerCase();
  if (lower.endsWith(".pdf")) return "📄";
  if (lower.endsWith(".docx")) return "📘";
  if (isImageFile(lower)) return "🖼️";
  return "📝";
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
      toast.error("Only PDF, Word (.docx), TXT, Markdown, or photo (PNG/JPG/WEBP) files are supported.");
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
    if (!title.trim()) { toast.error("Please enter a title for this document."); return; }

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
          ? `"${data.title}" uploaded — ${data.chunkCount} chunks (read via OCR) 🔍`
          : `"${data.title}" uploaded — ${data.chunkCount} chunks created!`
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

      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => !file && inputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200
          ${file
            ? "border-indigo-400 bg-indigo-50 cursor-default"
            : dragging
              ? "border-indigo-500 bg-indigo-50 scale-[1.01]"
              : "border-slate-300 hover:border-indigo-400 hover:bg-slate-50"
          }
        `}
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
              <span className="text-3xl flex-shrink-0">{fileIcon(file.name)}</span>
              <div className="text-left min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">{file.name}</p>
                <p className="text-xs text-slate-500">{formatBytes(file.size)}</p>
              </div>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); setFile(null); setTitle(""); setProgress(0); }}
              className="text-slate-400 hover:text-red-500 transition-colors flex-shrink-0 p-1 rounded-lg hover:bg-red-50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        ) : (
          <div>
            <div className="w-12 h-12 mx-auto mb-3 bg-indigo-100 rounded-2xl flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <p className="text-sm font-medium text-slate-700">
              {dragging ? "Drop your file here" : "Drag & drop or click to upload"}
            </p>
            <p className="text-xs text-slate-400 mt-1">PDF, Word, TXT, Markdown, or photo — up to {MAX_FILE_MB} MB</p>
          </div>
        )}
      </div>


      {file && (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
              Document Title *
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Chapter 3 — Newton's Laws"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
              Subject (optional)
            </label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Physics, History, Biology"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
            />
          </div>


          {showOcrHint && (
            <p className="text-xs text-sky-700 bg-sky-50 border border-sky-100 rounded-xl px-3 py-2 flex items-start gap-1.5">
              <span className="flex-shrink-0">🔍</span>
              <span>
                {isImageFile(file.name)
                  ? "This photo will be read with OCR — clear, well-lit text works best."
                  : "If this PDF turns out to be a scan, we'll automatically read it with OCR — that can take a little longer."}
              </span>
            </p>
          )}


          {uploading && (
            <div className="rounded-full bg-slate-100 h-1.5 overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={uploading}
            className="w-full py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {uploading ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {showOcrHint ? "Uploading & reading…" : "Uploading…"}
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Upload &amp; Process
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
