import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import FlashcardArena from "../components/flashcards/FlashcardArena.jsx";
import { flashcardAPI } from "../api/services.js";

export default function FlashcardsPage() {
  const [searchParams] = useSearchParams();
  const navigate        = useNavigate();
  const preselectedDoc  = searchParams.get("doc");

  const [dueCards, setDueCards] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [studying, setStudying] = useState(false);


  useEffect(() => {
    if (preselectedDoc) navigate(`/notebook/${preselectedDoc}`, { replace: true });
  }, [preselectedDoc, navigate]);


  useEffect(() => {
    flashcardAPI.getDue()
      .then((d) => setDueCards(d.cards ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);


  if (studying && dueCards.length > 0) {
    return (
      <div className="flex-1 overflow-y-auto" style={{ background: "var(--surface-1)" }}>
        <div className="px-4 pt-6 max-w-lg mx-auto">
          <button
            onClick={() => setStudying(false)}
            className="text-sm font-medium mb-4 block transition-colors"
            style={{ color: "var(--amber)" }}
          >
            ← Back
          </button>
        </div>
        <FlashcardArena cards={dueCards} onSessionEnd={() => setStudying(false)} />
      </div>
    );
  }

  return (
    <div
      className="flex-1 flex items-center justify-center p-8"
      style={{ background: "var(--surface-1)" }}
    >
      <div className="text-center max-w-xs animate-fadeIn">

        {}
        <div
          className="w-14 h-14 flex items-center justify-center mx-auto mb-4 rounded-xl"
          style={{
            background: "var(--surface-0)",
            border: "1px solid var(--rule-strong)",
          }}
        >
          <span
            className="text-xs font-mono font-semibold"
            style={{ color: "var(--amber)" }}
          >
            FC
          </span>
        </div>

        <h2
          className="text-lg font-semibold mb-2"
          style={{ color: "var(--text-1)", fontFamily: "'Lora', serif" }}
        >
          Flashcards
        </h2>

        {loading ? (
          <div
            className="w-5 h-5 border-2 rounded-full animate-spin mx-auto mt-4"
            style={{ borderColor: "var(--rule-strong)", borderTopColor: "var(--amber)" }}
          />
        ) : dueCards.length > 0 ? (
          <>
            <p className="text-sm mb-4" style={{ color: "var(--text-2)" }}>
              You have{" "}
              <span className="font-mono font-semibold" style={{ color: "var(--amber)" }}>
                {dueCards.length}
              </span>{" "}
              card{dueCards.length !== 1 ? "s" : ""} due for review.
            </p>

            {}
            <div
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-5 text-xs font-mono font-semibold"
              style={{
                background: "var(--green-dim)",
                border: "1px solid rgba(92,154,116,0.28)",
                color: "var(--green-text)",
              }}
            >
              {dueCards.length} due today
            </div>

            <div className="space-y-2">
              <button
                onClick={() => setStudying(true)}
                className="w-full px-6 py-2.5 rounded-lg btn-primary text-sm"
              >
                Study Due Cards
              </button>
              <p className="text-xs font-mono" style={{ color: "var(--text-3)", fontSize: "10px" }}>
                Or open a notebook to generate new flashcards.
              </p>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm mb-5" style={{ color: "var(--text-2)" }}>
              Open a notebook to generate flashcards from your documents.
            </p>
            <button
              onClick={() => navigate("/dashboard")}
              className="px-6 py-2.5 rounded-lg btn-primary text-sm"
            >
              Go to My Notebooks
            </button>
          </>
        )}
      </div>
    </div>
  );
}
