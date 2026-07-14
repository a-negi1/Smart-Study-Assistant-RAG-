import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { documentAPI } from "../api/services.js";
import FileUpload from "../components/documents/FileUpload.jsx";
import toast from "react-hot-toast";

function fileInitial(name = "") {
  const lower = name.toLowerCase();
  if (lower.endsWith(".pdf"))  return "PDF";
  if (lower.endsWith(".docx")) return "DOC";
  if (lower.endsWith(".md"))   return "MD";
  if (lower.endsWith(".txt"))  return "TXT";
  if (lower.match(/\.(png|jpg|jpeg|webp)$/)) return "IMG";
  return "DOC";
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function SkeletonCard() {
  return (
    <div
      className="h-44 rounded-xl animate-shimmer"
      style={{
        border: "1px solid var(--rule)",
      }}
    />
  );
}

export default function DashboardPage() {
  const { user }   = useAuth();
  const navigate   = useNavigate();
  const [docs, setDocs]             = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchDocs = useCallback(async () => {
    try {
      const data = await documentAPI.list();
      setDocs(data.documents ?? []);
    } catch {
      toast.error("Failed to load notebooks.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  const handleUploaded = (newDoc) => {
    setShowUpload(false);
    setDocs((prev) => [newDoc, ...prev]);
    toast.success(`"${newDoc.title}" added.`);
  };

  const handleDelete = async (docId, title) => {
    if (!window.confirm(`Delete "${title}"? This will also remove its quiz, flashcard data, and notebook chat.`)) return;
    try {
      await documentAPI.delete(docId);
      setDocs((prev) => prev.filter((d) => d._id !== docId));
      toast.success("Notebook deleted.");
    } catch {
      toast.error("Failed to delete notebook.");
    }
  };

  const filtered = docs.filter((d) =>
    d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.subject?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const hour     = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="flex-1 overflow-y-auto p-6" style={{ background: "var(--surface-1)" }}>

      {}
      <div className="mb-7 animate-fadeUp">
        <h1
          className="text-xl font-semibold"
          style={{ color: "var(--text-1)", fontFamily: "'Lora', serif" }}
        >
          {greeting}, {user?.name?.split(" ")[0]}
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-3)" }}>
          {docs.length > 0 ? `${docs.length} notebook${docs.length !== 1 ? "s" : ""}` : "No notebooks yet"}
        </p>
      </div>

      {}
      <div className="flex items-center gap-3 mb-6 flex-wrap animate-fadeUp" style={{ animationDelay: "0.05s" }}>
        {}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
            style={{ color: "var(--text-3)" }}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notebooks…"
            className="w-full pl-9 pr-4 py-2 rounded-lg text-sm glass-input"
            style={{ color: "var(--text-1)" }}
          />
        </div>

        <button
          onClick={() => setShowUpload(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg btn-primary text-sm"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add notebook
        </button>
      </div>

      {}
      {showUpload && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(17,15,13,0.80)" }}
        >
          <div
            className="w-full max-w-md p-6 rounded-xl animate-fadeInScale"
            style={{
              background: "var(--surface-1)",
              border: "1px solid var(--rule-strong)",
              boxShadow: "var(--shadow-lg)",
            }}
          >
            <div className="flex items-center justify-between mb-5">
              <h2
                className="text-base font-semibold"
                style={{ color: "var(--text-1)", fontFamily: "'Lora', serif" }}
              >
                Add a Notebook
              </h2>
              <button
                onClick={() => setShowUpload(false)}
                className="p-1.5 rounded-md transition-all"
                style={{ color: "var(--text-3)", border: "1px solid var(--rule)" }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text-1)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-3)"; }}
                aria-label="Close"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            <p className="text-sm mb-4" style={{ color: "var(--text-3)" }}>
              Upload a document. It will be indexed for chat, quizzes, and flashcards.
            </p>
            <FileUpload onUploaded={handleUploaded} />
          </div>
        </div>
      )}

      {}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
        </div>
      ) : filtered.length === 0 && docs.length === 0 ? (


        <div className="flex flex-col items-center justify-center py-20 text-center animate-fadeUp">
          <div
            className="w-full max-w-xs mb-6 empty-ruled"
            style={{ border: "1px solid var(--rule)", borderRadius: "var(--radius-lg)" }}
          >
            <p
              className="text-sm relative z-10"
              style={{ color: "var(--text-2)", fontFamily: "'Lora', serif" }}
            >
              Drop a document here to begin.
            </p>
          </div>
          <button
            onClick={() => setShowUpload(true)}
            className="px-5 py-2 rounded-lg btn-primary text-sm"
          >
            Add your first notebook
          </button>
        </div>

      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">

          {}
          <button
            onClick={() => setShowUpload(true)}
            className="flex flex-col items-center justify-center min-h-[160px] rounded-xl transition-all group text-left"
            style={{
              border: "1.5px dashed var(--rule-strong)",
              background: "transparent",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--amber-rule)";
              e.currentTarget.style.background = "var(--amber-dim)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--rule-strong)";
              e.currentTarget.style.background = "transparent";
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-5 mb-2 transition-colors"
              style={{ color: "var(--text-3)" }}
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
            </svg>
            <p className="text-xs" style={{ color: "var(--text-3)" }}>Add notebook</p>
          </button>

          {}
          {filtered.map((doc) => {
            const initLabel = fileInitial(doc.fileName ?? "");
            return (
              <div
                key={doc._id}
                className="notebook-card flex flex-col min-h-[160px] p-4 group relative cursor-pointer rounded-xl"
                style={{
                  background: "var(--surface-0)",
                  border: "1px solid var(--rule)",
                  borderLeft: "3px solid transparent",
                }}
                onClick={() => navigate(`/notebook/${doc._id}`)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderLeftColor = "var(--amber)";
                  e.currentTarget.style.background = "var(--surface-2)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderLeftColor = "transparent";
                  e.currentTarget.style.background = "var(--surface-0)";
                }}
              >
                {}
                <span
                  className="text-xs font-mono font-semibold mb-3 inline-block px-1.5 py-0.5 rounded"
                  style={{
                    color: "var(--amber)",
                    background: "var(--amber-dim)",
                    border: "1px solid rgba(201,135,58,0.22)",
                    letterSpacing: "0.05em",
                  }}
                >
                  {initLabel}
                </span>

                {}
                <h3
                  className="text-sm font-semibold leading-snug mb-1 line-clamp-2"
                  style={{ color: "var(--text-1)" }}
                >
                  {doc.title}
                </h3>

                {}
                {doc.subject && (
                  <p className="text-xs font-mono capitalize mt-0.5" style={{ color: "var(--text-3)", fontSize: "10px" }}>
                    {doc.subject}
                  </p>
                )}

                {}
                <p
                  className="text-xs mt-auto pt-3 font-mono"
                  style={{ color: "var(--text-3)", fontSize: "10px" }}
                >
                  {formatDate(doc.createdAt)} · {doc.chunkCount} chunk{doc.chunkCount !== 1 ? "s" : ""}
                </p>

                {}
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(doc._id, doc.title); }}
                  className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-1 rounded-md transition-all"
                  title="Delete notebook"
                  style={{ color: "var(--text-3)" }}
                  onMouseEnter={(e) => {
                    e.stopPropagation();
                    e.currentTarget.style.background = "var(--red-dim)";
                    e.currentTarget.style.color = "var(--red-text)";
                  }}
                  onMouseLeave={(e) => {
                    e.stopPropagation();
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "var(--text-3)";
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 6a1 1 0 011 1v6a1 1 0 11-2 0V7a1 1 0 011-1z" />
                    <path fillRule="evenodd" d="M4 5a2 2 0 012-2h8a2 2 0 012 2v1h2a1 1 0 110 2h-1v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8H2a1 1 0 010-2h2V5zm2 0h8v1H6V5zm-1 3v8h10V8H5z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
