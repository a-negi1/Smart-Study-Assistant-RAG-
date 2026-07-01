
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import QuizEngine from "../components/quiz/QuizEngine.jsx";
import { quizAPI, documentAPI } from "../api/services.js";

export default function QuizPage() {
  const [searchParams]  = useSearchParams();
  const preselectedDoc  = searchParams.get("doc");

  const [docs,       setDocs]       = useState([]);
  const [docsLoading,setDocsLoading]= useState(true);
  const [documentId, setDocumentId] = useState(preselectedDoc ?? "");
  const [difficulty, setDifficulty] = useState("medium");
  const [quiz,       setQuiz]       = useState(null);
  const [generating, setGenerating] = useState(false);

  
  useEffect(() => {
    documentAPI.list()
      .then((d) => setDocs(d.documents ?? []))
      .catch(() => {})
      .finally(() => setDocsLoading(false));
  }, []);

  const selectedDoc = docs.find((d) => d._id === documentId);

  const handleGenerate = async () => {
    if (!documentId) {
      toast.error("Please select a document first.");
      return;
    }
    setGenerating(true);
    try {
      const data = await quizAPI.generate({ documentId, difficulty });
      setQuiz(data);
    } catch (err) {
      toast.error(err.response?.data?.error ?? "Failed to generate quiz.");
    } finally {
      setGenerating(false);
    }
  };

  if (quiz) {
    return (
      <div>
        <div className="flex items-center gap-4 px-4 pt-6 pb-2 max-w-2xl mx-auto">
          <button onClick={() => setQuiz(null)} className="text-sm text-indigo-600 hover:underline">
            ← Back
          </button>
          <h1 className="text-lg font-bold text-slate-800 truncate">{quiz.title}</h1>
        </div>
        <QuizEngine quizId={quiz.quizId} questions={quiz.questions} onComplete={() => {}} />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-lg">
      <h1 className="text-2xl font-bold text-slate-800 mb-1">Generate a Quiz</h1>
      <p className="text-slate-500 text-sm mb-8">
        AI will create 5 MCQs from your uploaded document.
      </p>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">

        
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Select Document
          </label>
          {docsLoading ? (
            <div className="h-11 bg-slate-100 rounded-xl animate-pulse" />
          ) : docs.length === 0 ? (
            <div className="px-4 py-3 rounded-xl border border-dashed border-slate-300 text-sm text-slate-500 text-center">
              No documents yet.{" "}
              <a href="/documents" className="text-indigo-600 hover:underline font-medium">
                Upload one →
              </a>
            </div>
          ) : (
            <select
              value={documentId}
              onChange={(e) => setDocumentId(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all bg-white appearance-none cursor-pointer"
            >
              <option value="">— Choose a document —</option>
              {docs.map((doc) => (
                <option key={doc._id} value={doc._id}>
                  {doc.title} ({doc.subject})
                </option>
              ))}
            </select>
          )}

         
          {selectedDoc && (
            <div className="mt-2 flex items-center gap-2 text-xs text-slate-500 bg-slate-50 rounded-xl px-3 py-2">
              <span>{selectedDoc.fileName?.endsWith(".pdf") ? "📄" : "📝"}</span>
              <span className="font-medium text-slate-700">{selectedDoc.title}</span>
              <span>·</span>
              <span>{selectedDoc.chunkCount} chunks</span>
            </div>
          )}
        </div>

        
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Difficulty</label>
          <div className="flex gap-2">
            {["easy", "medium", "hard"].map((d) => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold border-2 transition-all capitalize
                  ${
                    difficulty === d
                      ? d === "easy"
                        ? "bg-emerald-50 border-emerald-400 text-emerald-700"
                        : d === "medium"
                        ? "bg-amber-50 border-amber-400 text-amber-700"
                        : "bg-red-50 border-red-400 text-red-700"
                      : "border-slate-200 text-slate-500 hover:border-slate-300"
                  }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={generating || !documentId}
          className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {generating ? (
            <>
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Generating…
            </>
          ) : (
            "Generate Quiz ✨"
          )}
        </button>

        {docs.length > 0 && (
          <p className="text-xs text-slate-400 text-center">
            Need to upload a new file?{" "}
            <a href="/documents" className="text-indigo-500 hover:underline">
              Go to Documents →
            </a>
          </p>
        )}
      </div>
    </div>
  );
}
