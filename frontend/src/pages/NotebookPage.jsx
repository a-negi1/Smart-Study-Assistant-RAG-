import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { documentAPI, notebookAPI, quizAPI, flashcardAPI } from "../api/services.js";
import QuizEngine from "../components/quiz/QuizEngine.jsx";
import FlashcardArena from "../components/flashcards/FlashcardArena.jsx";

function useVoiceInput(onResult) {
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);

  const supported =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  const toggle = useCallback(() => {
    if (!supported) {
      toast.error("Voice input is not supported in this browser. Try Chrome or Edge.");
      return;
    }

    if (listening) {
      recognitionRef.current?.stop();
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;

    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = (e) => {
      setListening(false);
      if (e.error !== "aborted") toast.error(`Voice error: ${e.error}`);
    };
    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      onResult(transcript);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [listening, supported, onResult]);

  return { listening, toggle, supported };
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

function MessageBubble({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      {}
      <div
        className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 font-mono text-xs font-bold"
        style={isUser ? {
          background: "var(--amber-dim)",
          border: "1px solid rgba(201,135,58,0.30)",
          color: "var(--amber)",
        } : {
          background: "var(--surface-2)",
          border: "1px solid var(--rule-strong)",
          color: "var(--text-3)",
        }}
      >
        {isUser ? "U" : "AI"}
      </div>
      {}
      <div
        className={`max-w-[75%] rounded-xl px-4 py-3 text-sm leading-relaxed ${isUser ? "rounded-tr-sm" : "rounded-tl-sm"}`}
        style={isUser ? {
          background: "rgba(201,135,58,0.13)",
          border: "1px solid rgba(201,135,58,0.24)",
          color: "var(--text-1)",
        } : {
          background: "var(--surface-1)",
          border: "1px solid var(--rule)",
          color: "var(--text-2)",
        }}
      >
        {msg.content.split("\n").map((line, i) => (
          <span key={i}>{line}{i < msg.content.split("\n").length - 1 && <br />}</span>
        ))}
        {msg.createdAt && (
          <div
            className="text-xs mt-1.5 font-mono"
            style={{ color: isUser ? "rgba(201,135,58,0.55)" : "var(--text-3)", fontSize: "10px" }}
          >
            {formatTime(msg.createdAt)}
          </div>
        )}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-3">
      <div
        className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 font-mono text-xs font-bold"
        style={{ background: "var(--surface-2)", border: "1px solid var(--rule-strong)", color: "var(--text-3)" }}
      >
        AI
      </div>
      <div
        className="rounded-xl rounded-tl-sm px-4 py-3"
        style={{ background: "var(--surface-1)", border: "1px solid var(--rule)" }}
      >
        <div className="flex gap-1.5 items-center h-4">
          <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "var(--text-3)", animationDelay: "0ms" }} />
          <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "var(--text-3)", animationDelay: "150ms" }} />
          <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "var(--text-3)", animationDelay: "300ms" }} />
        </div>
      </div>
    </div>
  );
}

function StudioAction({ icon, label, onClick, loading, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className="source-item flex items-center gap-3 w-full py-2.5 pr-3 rounded-r-lg text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed"
      style={{ color: "var(--text-2)" }}
      onMouseEnter={(e) => {
        if (!disabled && !loading) {
          e.currentTarget.style.color = "var(--text-1)";
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = "var(--text-2)";
      }}
    >
      <span className="text-sm flex-shrink-0" style={{ color: "var(--text-3)" }}>{icon}</span>
      <span className="flex-1 text-left">{label}</span>
      {loading ? (
        <span
          className="w-3.5 h-3.5 border-2 rounded-full animate-spin"
          style={{ borderColor: "var(--amber)", borderTopColor: "transparent" }}
        />
      ) : (
        <svg className="w-3.5 h-3.5" style={{ color: "var(--text-3)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      )}
    </button>
  );
}

function VoiceInputBar({ docId, message, setMessage, sending, handleSend, inputRef, doc }) {
  const handleVoiceResult = useCallback(
    (transcript) => {
      setMessage((prev) => (prev ? prev + " " + transcript : transcript));
      inputRef.current?.focus();
    },
    [setMessage, inputRef]
  );

  const { listening, toggle, supported } = useVoiceInput(handleVoiceResult);

  return (
    <div
      className="px-4 py-3 flex-shrink-0"
      style={{ background: "var(--surface-0)", borderTop: "1px solid var(--rule)" }}
    >
      {listening && (
        <div
          className="flex items-center gap-2 px-3 py-1.5 mb-2 rounded-lg text-xs font-mono animate-fadeIn"
          style={{
            background: "rgba(201,135,58,0.08)",
            border: "1px solid rgba(201,135,58,0.25)",
            color: "var(--amber)",
          }}
        >
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{
              background: "var(--amber)",
              boxShadow: "0 0 0 0 rgba(201,135,58,0.6)",
              animation: "mic-pulse 1.2s ease infinite",
            }}
          />
          Listening… speak now
        </div>
      )}
      <div className={`flex gap-2 items-end ${!docId ? "opacity-40 pointer-events-none" : ""}`}>
        <div className="flex-1 relative">
          <textarea
            ref={inputRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask about this document…"
            rows={1}
            className="w-full px-4 py-3 rounded-xl text-sm glass-input resize-none max-h-32 leading-relaxed"
            style={{ minHeight: "44px" }}
          />
        </div>

        {}
        <div className="flex items-center gap-2 mb-1">
          <span
            className="text-xs font-mono px-2 py-1 rounded-md"
            style={{
              color: "var(--text-3)",
              background: "var(--surface-1)",
              border: "1px solid var(--rule)",
              fontSize: "10px",
            }}
          >
            {doc?.chunkCount ?? 0}
          </span>
        </div>

        {}
        {supported && (
          <button
            id="voice-input-btn"
            onClick={toggle}
            title={listening ? "Stop recording" : "Start voice input"}
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all"
            style={
              listening
                ? {
                    background: "rgba(201,135,58,0.18)",
                    border: "1px solid rgba(201,135,58,0.45)",
                    color: "var(--amber)",
                  }
                : {
                    background: "var(--surface-1)",
                    border: "1px solid var(--rule-strong)",
                    color: "var(--text-3)",
                  }
            }
            aria-label={listening ? "Stop voice input" : "Start voice input"}
          >
            {listening ? (

              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
            ) : (

              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="2" width="6" height="12" rx="3" />
                <path d="M5 10a7 7 0 0014 0" />
                <line x1="12" y1="19" x2="12" y2="22" />
                <line x1="8" y1="22" x2="16" y2="22" />
              </svg>
            )}
          </button>
        )}

        {}
        <button
          onClick={handleSend}
          disabled={sending || !message.trim()}
          className="w-9 h-9 rounded-xl btn-primary flex items-center justify-center flex-shrink-0 disabled:opacity-40"
          aria-label="Send message"
        >
          {sending ? (
            <span
              className="w-3.5 h-3.5 border-2 rounded-full animate-spin"
              style={{ borderColor: "#1a1814", borderTopColor: "transparent" }}
            />
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}

export default function NotebookPage() {
  const { docId }  = useParams();
  const navigate   = useNavigate();


  const [doc, setDoc]               = useState(null);
  const [docLoading, setDocLoading] = useState(true);
  const [docs, setDocs]             = useState([]);
  const [conversation, setConversation] = useState(null);
  const [convLoading, setConvLoading]   = useState(false);
  const [message, setMessage]       = useState("");
  const [sending, setSending]       = useState(false);
  const [clearing, setClearing]     = useState(false);


  const [studioView, setStudioView]     = useState("menu");
  const [quiz, setQuiz]                 = useState(null);
  const [quizGenerating, setQuizGenerating] = useState(false);
  const [difficulty, setDifficulty]     = useState("medium");
  const [flashcardCards, setFlashcardCards] = useState([]);
  const [fcGenerating, setFcGenerating] = useState(false);


  const [showSources, setShowSources] = useState(false);
  const [showStudio, setShowStudio]   = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef       = useRef(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => { scrollToBottom(); }, [conversation?.messages?.length, sending, scrollToBottom]);


  useEffect(() => {
    documentAPI.list()
      .then((d) => {
        setDocs(d.documents ?? []);
        if (docId) {
          const found = (d.documents ?? []).find((x) => x._id === docId);
          setDoc(found ?? null);
        }
      })
      .catch(() => toast.error("Could not load documents."))
      .finally(() => setDocLoading(false));
  }, [docId]);


  useEffect(() => {
    if (!docId) return;
    setConvLoading(true);
    setStudioView("menu");
    setQuiz(null);
    setFlashcardCards([]);
    notebookAPI.getConversation(docId)
      .then((d) => setConversation(d.conversation))
      .catch(() => toast.error("Could not load notebook."))
      .finally(() => setConvLoading(false));
  }, [docId]);


  const handleSend = async () => {
    const text = message.trim();
    if (!text || sending || !docId) return;
    const optimisticMsg = { role: "user", content: text, createdAt: new Date().toISOString() };
    setConversation((prev) => ({
      ...prev,
      messages: [...(prev?.messages ?? []), optimisticMsg],
    }));
    setMessage("");
    setSending(true);
    try {
      const data = await notebookAPI.chat(docId, text);
      const aiMsg = { role: "assistant", content: data.reply, createdAt: new Date().toISOString() };
      setConversation((prev) => ({
        ...prev,
        messages: [...(prev?.messages ?? []).slice(0, -1), optimisticMsg, aiMsg],
      }));
    } catch (err) {
      toast.error(err.response?.data?.error ?? "Failed to get a response.");
      setConversation((prev) => ({ ...prev, messages: (prev?.messages ?? []).slice(0, -1) }));
      setMessage(text);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleClear = async () => {
    if (!conversation?._id) return;
    if (!window.confirm("Clear this conversation? All messages will be deleted.")) return;
    setClearing(true);
    try {
      await notebookAPI.clearConversation(conversation._id);
      setConversation((prev) => ({ ...prev, messages: [] }));
      toast.success("Conversation cleared.");
    } catch {
      toast.error("Failed to clear conversation.");
    } finally {
      setClearing(false);
    }
  };


  const handleGenerateQuiz = async () => {
    if (!docId) return;
    setQuizGenerating(true);
    try {
      const data = await quizAPI.generate({ documentId: docId, difficulty });
      setQuiz(data);
      setStudioView("quiz");
    } catch (err) {
      toast.error(err.response?.data?.error ?? "Failed to generate quiz.");
    } finally {
      setQuizGenerating(false);
    }
  };


  const handleGenerateFlashcards = async () => {
    if (!docId) return;
    setFcGenerating(true);
    try {
      const data = await flashcardAPI.generate({ documentId: docId, deckTitle: doc?.title });
      setFlashcardCards(data.flashcards ?? []);
      setStudioView("flashcards-study");
      toast.success(`Generated ${data.cardCount} flashcards!`);
    } catch (err) {
      toast.error(err.response?.data?.error ?? "Generation failed.");
    } finally {
      setFcGenerating(false);
    }
  };


  const sendHint = async (text) => {
    if (!text || sending || !docId) return;
    const optimisticMsg = { role: "user", content: text, createdAt: new Date().toISOString() };
    setConversation((prev) => ({
      ...prev,
      messages: [...(prev?.messages ?? []), optimisticMsg],
    }));
    setMessage("");
    setSending(true);
    try {
      const data = await notebookAPI.chat(docId, text);
      const aiMsg = { role: "assistant", content: data.reply, createdAt: new Date().toISOString() };
      setConversation((prev) => ({
        ...prev,
        messages: [...(prev?.messages ?? []).slice(0, -1), optimisticMsg, aiMsg],
      }));
    } catch (err) {
      toast.error(err.response?.data?.error ?? "Failed to get a response.");
      setConversation((prev) => ({ ...prev, messages: (prev?.messages ?? []).slice(0, -1) }));
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };


  if (!docId) {
    return (
      <div className="flex-1 flex items-center justify-center p-8" style={{ background: "var(--surface-1)" }}>
        <div className="text-center max-w-xs animate-fadeIn empty-ruled px-8 py-10">
          <p
            className="text-sm mb-5"
            style={{ color: "var(--text-2)", fontFamily: "'Lora', serif" }}
          >
            Open a notebook to begin.
          </p>
          <button
            onClick={() => navigate("/dashboard")}
            className="text-sm font-medium px-4 py-2 rounded-lg btn-ghost"
            style={{ color: "var(--text-2)" }}
          >
            Go to My Notebooks
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden">
      {}
      {showSources && (
        <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={() => setShowSources(false)} />
      )}
      {showStudio && (
        <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={() => setShowStudio(false)} />
      )}

      {}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-30 w-60 flex flex-col flex-shrink-0 transform transition-transform duration-250 ${showSources ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
        style={{ background: "var(--surface-0)", borderRight: "1px solid var(--rule)" }}
      >
        <div className="px-4 py-4" style={{ borderBottom: "1px solid var(--rule)" }}>
          <p
            className="text-xs font-semibold uppercase tracking-widest font-mono mb-3"
            style={{ color: "var(--text-3)" }}
          >
            Sources
          </p>
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2 text-xs transition-colors"
            style={{ color: "var(--text-3)" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "var(--amber)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-3)"; }}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add a source
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {docLoading ? (
            <div className="space-y-1 px-2">
              {[1,2,3].map((i) => <div key={i} className="h-10 rounded-md animate-shimmer mx-1" />)}
            </div>
          ) : docs.length === 0 ? (

            <div className="empty-ruled mx-3 mt-4">
              <p className="text-xs relative z-10" style={{ color: "var(--text-3)", fontFamily: "'Lora', serif" }}>
                No sources yet.
              </p>
            </div>
          ) : (
            <div className="space-y-0.5 px-1">
              {docs.map((d) => (
                <button
                  key={d._id}
                  onClick={() => { navigate(`/notebook/${d._id}`); setShowSources(false); }}
                  className={`source-item w-full text-left py-2.5 pr-3 rounded-r-md flex items-start gap-2.5 ${
                    docId === d._id ? "active" : ""
                  }`}
                  style={{ color: docId === d._id ? "var(--amber)" : "var(--text-2)" }}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate leading-tight">{d.title}</p>
                    <p
                      className="text-xs truncate capitalize mt-0.5 font-mono"
                      style={{ color: "var(--text-3)", fontSize: "10px" }}
                    >
                      {d.subject} · {d.chunkCount}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </aside>

      {}
      <div
        className="flex-1 flex flex-col min-w-0"
        style={{ background: "var(--surface-1)" }}
      >
        {}
        <header
          className="px-4 py-3 flex items-center gap-3 flex-shrink-0"
          style={{ background: "var(--surface-0)", borderBottom: "1px solid var(--rule)" }}
        >
          <button
            onClick={() => setShowSources(true)}
            className="lg:hidden p-1.5 rounded-md transition-all"
            style={{ color: "var(--text-2)", border: "1px solid var(--rule)" }}
            aria-label="Open sources"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {doc ? (
            <>
              <div className="flex-1 min-w-0">
                <h1
                  className="text-sm font-semibold truncate"
                  style={{ color: "var(--text-1)", fontFamily: "'Lora', serif" }}
                >
                  {doc.title}
                </h1>
                <p className="text-xs font-mono capitalize" style={{ color: "var(--text-3)", fontSize: "10px" }}>
                  {doc.subject} · {doc.chunkCount} chunks
                </p>
              </div>
              {conversation?.messages?.length > 0 && (
                <button
                  onClick={handleClear}
                  disabled={clearing}
                  className="text-xs px-3 py-1.5 rounded-md transition-colors disabled:opacity-50"
                  style={{ color: "var(--text-3)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = "var(--red-text)"; e.currentTarget.style.background = "var(--red-dim)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-3)"; e.currentTarget.style.background = "transparent"; }}
                >
                  {clearing ? "Clearing…" : "Clear chat"}
                </button>
              )}
            </>
          ) : (
            <h1 className="text-sm font-medium" style={{ color: "var(--text-3)" }}>Chat</h1>
          )}

          <button
            onClick={() => setShowStudio(true)}
            className="lg:hidden p-1.5 rounded-md transition-all"
            style={{ color: "var(--text-2)", border: "1px solid var(--rule)" }}
            aria-label="Open studio"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </button>
        </header>

        {}
        <div className="flex-1 overflow-y-auto px-5 py-6 space-y-5">
          {convLoading ? (
            <div className="flex items-center justify-center h-full">
              <div
                className="w-5 h-5 border-2 rounded-full animate-spin"
                style={{ borderColor: "var(--rule-strong)", borderTopColor: "var(--amber)" }}
              />
            </div>
          ) : !conversation || conversation.messages.length === 0 ? (

            <div className="flex flex-col items-center justify-center h-full text-center px-8">
              <div className="empty-ruled w-full max-w-xs mb-6">
                <p
                  className="text-sm relative z-10"
                  style={{ color: "var(--text-2)", fontFamily: "'Lora', serif" }}
                >
                  Ask anything about{" "}
                  <span style={{ color: "var(--text-1)" }}>{doc?.title || "this document"}</span>.
                </p>
              </div>
              <div className="space-y-2 w-full max-w-xs">
                {[
                  "Summarise the key points",
                  "What are the main concepts?",
                  "Give me 3 practice questions",
                ].map((hint) => (
                  <button
                    key={hint}
                    onClick={() => sendHint(hint)}
                    className="text-xs text-left w-full px-4 py-2.5 rounded-lg transition-all"
                    style={{
                      color: "var(--text-2)",
                      border: "1px solid var(--rule)",
                      background: "var(--surface-0)",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--amber-rule)"; e.currentTarget.style.color = "var(--text-1)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--rule)"; e.currentTarget.style.color = "var(--text-2)"; }}
                  >
                    {hint}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {conversation.messages.map((msg, i) => (
                <MessageBubble key={i} msg={msg} />
              ))}
              {sending && <TypingIndicator />}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>

        {}
        <VoiceInputBar
          docId={docId}
          message={message}
          setMessage={setMessage}
          sending={sending}
          handleSend={handleSend}
          inputRef={inputRef}
          doc={doc}
        />
      </div>

      {}
      <aside
        className={`fixed lg:static inset-y-0 right-0 z-30 w-72 flex flex-col flex-shrink-0 transform transition-transform duration-250 ${showStudio ? "translate-x-0" : "translate-x-full lg:translate-x-0"}`}
        style={{ background: "var(--surface-0)", borderLeft: "1px solid var(--rule)" }}
      >
        <div
          className="px-4 py-4 flex items-center justify-between"
          style={{ borderBottom: "1px solid var(--rule)" }}
        >
          <p
            className="text-xs font-semibold uppercase tracking-widest font-mono"
            style={{ color: "var(--text-3)" }}
          >
            Studio
          </p>
          {studioView !== "menu" && (
            <button
              onClick={() => { setStudioView("menu"); setQuiz(null); }}
              className="text-xs transition-colors"
              style={{ color: "var(--text-3)" }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text-1)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-3)"; }}
            >
              ← Back
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {}
          {studioView === "menu" && (
            <div className="py-2 px-1 space-y-0.5">
              <StudioAction icon="✎" label="Generate Quiz" onClick={() => setStudioView("quiz-setup")} />
              <StudioAction icon="⊞" label="Generate Flashcards" onClick={() => setStudioView("flashcards-setup")} />
              <StudioAction icon="◈" label="Analytics" onClick={() => navigate("/analytics")} />

              {}
              <div
                className="mx-3 mt-5 p-4 rounded-lg empty-ruled"
                style={{ border: "1px solid var(--rule)" }}
              >
                <p className="text-xs relative z-10" style={{ color: "var(--text-3)", fontFamily: "'Lora', serif" }}>
                  Generate a quiz or flashcards from the open source.
                </p>
              </div>
            </div>
          )}

          {}
          {studioView === "quiz-setup" && (
            <div className="p-4 space-y-4 animate-fadeIn">
              <div>
                <h4
                  className="text-sm font-semibold mb-1"
                  style={{ color: "var(--text-1)", fontFamily: "'Lora', serif" }}
                >
                  Quiz
                </h4>
                <p className="text-xs" style={{ color: "var(--text-3)" }}>5 multiple-choice questions from your document.</p>
              </div>
              <div>
                <label className="block text-xs font-semibold font-mono mb-2 uppercase tracking-wider" style={{ color: "var(--text-3)" }}>Difficulty</label>
                <div className="flex gap-2">
                  {["easy", "medium", "hard"].map((d) => (
                    <button
                      key={d}
                      onClick={() => setDifficulty(d)}
                      className={`flex-1 py-1.5 rounded-md text-xs font-medium border transition-all capitalize ${
                        difficulty === d
                          ? d === "easy"
                            ? "border-transparent text-ink-DEFAULT"
                            : d === "medium"
                              ? "border-transparent text-ink-DEFAULT"
                              : "border-transparent text-ink-DEFAULT"
                          : "text-text-3 hover:border-rule-strong"
                      }`}
                      style={difficulty === d ? {
                        background: d === "easy" ? "var(--green)" : d === "medium" ? "var(--amber)" : "var(--red)",
                        color: "#1a1814",
                        borderColor: "transparent",
                      } : {
                        background: "transparent",
                        border: "1px solid var(--rule-strong)",
                        color: "var(--text-3)",
                      }}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={handleGenerateQuiz}
                disabled={quizGenerating}
                className="w-full py-2 rounded-lg btn-primary text-sm flex items-center justify-center gap-2"
              >
                {quizGenerating ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 rounded-full animate-spin" style={{ borderColor: "#1a1814", borderTopColor: "transparent" }} />
                    Generating…
                  </>
                ) : (
                  "Generate Quiz"
                )}
              </button>
            </div>
          )}

          {}
          {studioView === "quiz" && quiz && (
            <div className="animate-fadeIn">
              <QuizEngine
                quizId={quiz.quizId}
                questions={quiz.questions}
                onComplete={() => {}}
                compact
              />
            </div>
          )}

          {}
          {studioView === "flashcards-setup" && (
            <div className="p-4 space-y-4 animate-fadeIn">
              <div>
                <h4
                  className="text-sm font-semibold mb-1"
                  style={{ color: "var(--text-1)", fontFamily: "'Lora', serif" }}
                >
                  Flashcards
                </h4>
                <p className="text-xs" style={{ color: "var(--text-3)" }}>Top 10 concepts extracted from your document.</p>
              </div>
              <button
                onClick={handleGenerateFlashcards}
                disabled={fcGenerating}
                className="w-full py-2 rounded-lg btn-primary text-sm flex items-center justify-center gap-2"
              >
                {fcGenerating ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 rounded-full animate-spin" style={{ borderColor: "#1a1814", borderTopColor: "transparent" }} />
                    Generating…
                  </>
                ) : (
                  "Generate Flashcards"
                )}
              </button>
            </div>
          )}

          {}
          {studioView === "flashcards-study" && flashcardCards.length > 0 && (
            <div className="animate-fadeIn">
              <FlashcardArena
                cards={flashcardCards}
                onSessionEnd={() => setStudioView("menu")}
                compact
              />
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
