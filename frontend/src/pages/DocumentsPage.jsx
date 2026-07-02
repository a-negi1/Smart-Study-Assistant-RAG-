

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { documentAPI } from "../api/services.js";
import FileUpload from "../components/documents/FileUpload.jsx";

function formatDate(iso) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function formatBytes(chars) {
  if (!chars) return "";
  if (chars < 1000) return `${chars} chars`;
  return `~${(chars / 1000).toFixed(1)}k chars`;
}

const IMAGE_EXT = [".png", ".jpg", ".jpeg", ".webp"];

function fileIcon(fileName = "") {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".pdf")) return "📄";
  if (lower.endsWith(".docx")) return "📘";
  if (IMAGE_EXT.some((ext) => lower.endsWith(ext))) return "🖼️";
  return "📝";
}

const SUBJECT_COLORS = {
  physics: "bg-blue-100 text-blue-700",
  chemistry: "bg-purple-100 text-purple-700",
  biology: "bg-green-100 text-green-700",
  history: "bg-amber-100 text-amber-700",
  math: "bg-red-100 text-red-700",
  mathematics: "bg-red-100 text-red-700",
  english: "bg-pink-100 text-pink-700",
  general: "bg-slate-100 text-slate-600",
};

function subjectColor(subject) {
  return SUBJECT_COLORS[subject?.toLowerCase()] ?? "bg-indigo-100 text-indigo-700";
}

export default function DocumentsPage() {
  const navigate = useNavigate();
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const fetchDocs = useCallback(async () => {
    try {
      const data = await documentAPI.list();
      setDocs(data.documents ?? []);
    } catch {
      toast.error("Failed to load documents.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  const handleUploaded = (newDoc) => {
    setShowUpload(false);
    setDocs((prev) => [newDoc, ...prev]);
  };

  const handleDelete = async (docId, title) => {
    if (!window.confirm(`Delete "${title}"? This will also remove its quiz, flashcard data, and notebook chat.`)) return;
    setDeleting(docId);
    try {
      await documentAPI.delete(docId);
      setDocs((prev) => prev.filter((d) => d._id !== docId));
      toast.success("Document deleted.");
    } catch {
      toast.error("Failed to delete document.");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-5xl">

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">My Documents</h1>
          <p className="text-slate-500 text-sm mt-1">
            Upload PDFs, Word docs, or photos to power quizzes, flashcards, and notebook chats.
          </p>
        </div>
        <button
          onClick={() => setShowUpload(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 active:scale-[0.98] transition-all shadow-md shadow-indigo-200"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Upload File
        </button>
      </div>


      {showUpload && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-[fadeIn_0.2s_ease]">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-slate-800">Upload a Document</h2>
              <button
                onClick={() => setShowUpload(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            <FileUpload onUploaded={handleUploaded} />
          </div>
        </div>
      )}


      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5 animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-3/4 mb-3" />
              <div className="h-3 bg-slate-100 rounded w-1/2 mb-2" />
              <div className="h-3 bg-slate-100 rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : docs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center mb-5">
            <span className="text-4xl">📂</span>
          </div>
          <h2 className="text-lg font-bold text-slate-800 mb-2">No documents yet</h2>
          <p className="text-slate-400 text-sm max-w-xs mb-6">
            Upload your first PDF, Word doc, or photo to start generating quizzes, flashcards, and AI notebook chats.
          </p>
          <button
            onClick={() => setShowUpload(true)}
            className="px-6 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-all"
          >
            Upload your first document
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {docs.map((doc) => (
            <div
              key={doc._id}
              className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md hover:border-indigo-200 transition-all group flex flex-col"
            >

              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-100 transition-colors">
                  <span className="text-xl">{fileIcon(doc.fileName)}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold text-slate-800 truncate leading-tight">{doc.title}</h3>
                  <p className="text-xs text-slate-400 truncate mt-0.5">{doc.fileName}</p>
                </div>
              </div>


              <div className="flex items-center gap-2 flex-wrap mb-4">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${subjectColor(doc.subject)}`}>
                  {doc.subject}
                </span>
                <span className="text-xs text-slate-400">{doc.chunkCount} chunks</span>
                {doc.charCount > 0 && (
                  <span className="text-xs text-slate-400">{formatBytes(doc.charCount)}</span>
                )}
                {doc.extractionMethod === "ocr" && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-sky-100 text-sky-700" title="Text was read using OCR">
                    🔍 OCR
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-400 mb-4">Uploaded {formatDate(doc.createdAt)}</p>


              <div className="mt-auto grid grid-cols-3 gap-1.5">
                <button
                  onClick={() => navigate(`/notebook?doc=${doc._id}`)}
                  className="flex flex-col items-center gap-1 py-2 rounded-xl bg-violet-50 hover:bg-violet-100 text-violet-700 transition-colors text-xs font-medium"
                >
                  <span>🤖</span> Notebook
                </button>
                <button
                  onClick={() => navigate(`/quiz?doc=${doc._id}`)}
                  className="flex flex-col items-center gap-1 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-colors text-xs font-medium"
                >
                  <span>📝</span> Quiz
                </button>
                <button
                  onClick={() => navigate(`/flashcards?doc=${doc._id}`)}
                  className="flex flex-col items-center gap-1 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors text-xs font-medium"
                >
                  <span>🃏</span> Cards
                </button>
              </div>


              <button
                onClick={() => handleDelete(doc._id, doc.title)}
                disabled={deleting === doc._id}
                className="mt-2 w-full py-1.5 text-xs text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors disabled:opacity-50"
              >
                {deleting === doc._id ? "Deleting…" : "Delete document"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
