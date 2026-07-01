
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import FlashcardArena from "../components/flashcards/FlashcardArena.jsx";
import { flashcardAPI, documentAPI } from "../api/services.js";

export default function FlashcardsPage() {
  const [searchParams] = useSearchParams();
  const preselectedDoc = searchParams.get("doc");

  const [view, setView]           = useState("menu"); 
  const [dueCards, setDueCards]   = useState([]);
  const [docs,     setDocs]       = useState([]);
  const [docsLoading, setDocsLoading] = useState(true);
  const [documentId,  setDocumentId]  = useState(preselectedDoc ?? "");
  const [deckTitle, setDeckTitle] = useState("");
  const [loading,   setLoading]   = useState(false);

  useEffect(() => {
    flashcardAPI.getDue().then((d) => setDueCards(d.cards ?? [])).catch(() => {});
    documentAPI.list()
      .then((d) => setDocs(d.documents ?? []))
      .catch(() => {})
      .finally(() => setDocsLoading(false));
  }, []);

  
  useEffect(() => {
    if (preselectedDoc) setView("generate");
  }, [preselectedDoc]);

  const selectedDoc = docs.find((d) => d._id === documentId);

  const handleGenerate = async () => {
    if (!documentId) {
      toast.error("Please select a document.");
      return;
    }
    setLoading(true);
    try {
      const data = await flashcardAPI.generate({
        documentId,
        deckTitle: deckTitle.trim() || undefined,
      });
      setDueCards(data.flashcards ?? []);
      setView("study");
      toast.success(`Generated ${data.cardCount} flashcards!`);
    } catch (err) {
      toast.error(err.response?.data?.error ?? "Generation failed.");
    } finally {
      setLoading(false);
    }
  };

 
  if (view === "study") {
    return (
      <div>
        <div className="px-4 pt-6 max-w-lg mx-auto">
          <button
            onClick={() => setView("menu")}
            className="text-sm text-indigo-600 hover:underline mb-4 block"
          >
            ← Back
          </button>
        </div>
        <FlashcardArena cards={dueCards} onSessionEnd={() => setView("menu")} />
      </div>
    );
  }

 
  if (view === "generate") {
    return (
      <div className="p-6 max-w-lg">
        <button
          onClick={() => setView("menu")}
          className="text-sm text-indigo-600 hover:underline mb-6 block"
        >
          ← Back
        </button>
        <h1 className="text-2xl font-bold text-slate-800 mb-1">Generate Flashcards</h1>
        <p className="text-slate-500 text-sm mb-6">
          Select a document and AI will extract the top 10 concepts.
        </p>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
       
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
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Deck Title <span className="text-slate-400">(optional)</span>
            </label>
            <input
              value={deckTitle}
              onChange={(e) => setDeckTitle(e.target.value)}
              placeholder={selectedDoc ? selectedDoc.title : "e.g. Chapter 4: Normalisation"}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
            />
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading || !documentId}
            className="w-full py-3 bg-violet-600 text-white font-semibold rounded-xl hover:bg-violet-700 active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Generating…
              </>
            ) : (
              "Generate Flashcards ✨"
            )}
          </button>
        </div>
      </div>
    );
  }

 
  return (
    <div className="flex-1 overflow-y-auto p-6">
      <h1 className="text-2xl font-bold text-slate-800 mb-1">Flashcards</h1>
      <p className="text-slate-500 text-sm mb-8">Spaced repetition powered by the Leitner system.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-lg">
        <button
          onClick={() => setView("study")}
          disabled={dueCards.length === 0}
          className="bg-violet-600 text-white rounded-2xl p-6 text-left hover:bg-violet-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm shadow-violet-200"
        >
          <span className="text-3xl block mb-3">📚</span>
          <p className="font-bold text-lg">Study Due Cards</p>
          <p className="text-violet-200 text-sm mt-1">
            {dueCards.length} card{dueCards.length !== 1 ? "s" : ""} due for review
          </p>
        </button>

        <button
          onClick={() => setView("generate")}
          className="bg-white border border-slate-200 rounded-2xl p-6 text-left hover:border-violet-300 hover:shadow-md transition-all"
        >
          <span className="text-3xl block mb-3">✨</span>
          <p className="font-bold text-lg text-slate-800">Generate New Deck</p>
          <p className="text-slate-500 text-sm mt-1">Let AI create flashcards from your document.</p>
        </button>
      </div>
    </div>
  );
}
