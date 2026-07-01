

import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { documentAPI, notebookAPI } from "../api/services.js";


function formatTime(iso) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}


function EmptyChat({ docTitle }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8">
      <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center mb-5 shadow-lg shadow-indigo-200">
        <span className="text-4xl">🤖</span>
      </div>
      <h3 className="text-lg font-bold text-slate-800 mb-2">
        Ready to explore <span className="text-indigo-600">{docTitle}</span>
      </h3>
      <p className="text-slate-400 text-sm max-w-xs mb-6">
        Ask me anything about this document — concepts, summaries, explanations, or practice questions.
      </p>
      <div className="space-y-2 w-full max-w-xs">
        {[
          "Summarise the key points of this document",
          "What are the main concepts explained here?",
          "Give me 3 practice questions from this material",
        ].map((hint) => (
          <div key={hint} className="text-xs text-indigo-600 bg-indigo-50 rounded-xl px-4 py-2.5 text-left cursor-default border border-indigo-100">
            "{hint}"
          </div>
        ))}
      </div>
    </div>
  );
}

function MessageBubble({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
     
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold shadow-sm
        ${isUser ? "bg-indigo-600 text-white" : "bg-gradient-to-br from-violet-500 to-indigo-600 text-white"}`}>
        {isUser ? "U" : "🤖"}
      </div>

     
      <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm
        ${isUser
          ? "bg-indigo-600 text-white rounded-tr-sm"
          : "bg-white text-slate-700 border border-slate-100 rounded-tl-sm"
        }`}>
        {msg.content.split("\n").map((line, i) => (
          <span key={i}>{line}{i < msg.content.split("\n").length - 1 && <br />}</span>
        ))}
        {msg.createdAt && (
          <div className={`text-xs mt-1.5 ${isUser ? "text-indigo-200" : "text-slate-400"}`}>
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
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0 text-sm shadow-sm">
        🤖
      </div>
      <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
        <div className="flex gap-1 items-center h-4">
          <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:0ms]" />
          <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:150ms]" />
          <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}


export default function NotebookPage() {
  const [searchParams] = useSearchParams();
  const initialDocId   = searchParams.get("doc");

  const [docs,          setDocs]          = useState([]);
  const [docsLoading,   setDocsLoading]   = useState(true);
  const [selectedDocId, setSelectedDocId] = useState(initialDocId ?? null);
  const [conversation,  setConversation]  = useState(null);
  const [convLoading,   setConvLoading]   = useState(false);
  const [message,       setMessage]       = useState("");
  const [sending,       setSending]       = useState(false);
  const [clearing,      setClearing]      = useState(false);
  const [sidebarOpen,   setSidebarOpen]   = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef       = useRef(null);

  
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => { scrollToBottom(); }, [conversation?.messages?.length, sending, scrollToBottom]);

 
  useEffect(() => {
    documentAPI.list()
      .then((d) => setDocs(d.documents ?? []))
      .catch(() => toast.error("Could not load documents."))
      .finally(() => setDocsLoading(false));
  }, []);


  useEffect(() => {
    if (!selectedDocId) return;
    setConvLoading(true);
    notebookAPI.getConversation(selectedDocId)
      .then((d) => setConversation(d.conversation))
      .catch(() => toast.error("Could not load notebook."))
      .finally(() => setConvLoading(false));
  }, [selectedDocId]);

  const handleSend = async () => {
    const text = message.trim();
    if (!text || sending || !selectedDocId) return;

   
    const optimisticMsg = { role: "user", content: text, createdAt: new Date().toISOString() };
    setConversation((prev) => ({
      ...prev,
      messages: [...(prev?.messages ?? []), optimisticMsg],
    }));
    setMessage("");
    setSending(true);

    try {
      const data = await notebookAPI.chat(selectedDocId, text);
      const aiMsg = { role: "assistant", content: data.reply, createdAt: new Date().toISOString() };
      setConversation((prev) => ({
        ...prev,
        messages: [...(prev?.messages ?? []).slice(0, -1), optimisticMsg, aiMsg],
      }));
    } catch (err) {
      toast.error(err.response?.data?.error ?? "Failed to get a response. Please try again.");
   
      setConversation((prev) => ({
        ...prev,
        messages: (prev?.messages ?? []).slice(0, -1),
      }));
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

  const selectedDoc = docs.find((d) => d._id === selectedDocId);

  return (
    <div className="flex h-full overflow-hidden">

    
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-30
        w-72 bg-slate-900 flex flex-col flex-shrink-0
        transform transition-transform duration-300
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}>
        
        <div className="px-5 py-5 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg">
              <span className="text-lg">🤖</span>
            </div>
            <div>
              <p className="font-bold text-white text-sm leading-none">LM Notebook</p>
              <p className="text-xs text-slate-400 mt-0.5">AI-powered study chat</p>
            </div>
          </div>
        </div>

        
        <div className="flex-1 overflow-y-auto px-3 py-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-2 mb-3">
            Your Documents
          </p>

          {docsLoading ? (
            <div className="space-y-2">
              {[1,2,3].map((i) => (
                <div key={i} className="h-14 bg-slate-800 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : docs.length === 0 ? (
            <div className="text-center py-8">
              <span className="text-3xl">📂</span>
              <p className="text-xs text-slate-500 mt-2">No documents uploaded yet.</p>
              <a href="/documents" className="text-xs text-indigo-400 hover:text-indigo-300 mt-1 block">
                Go to Documents →
              </a>
            </div>
          ) : (
            <div className="space-y-1">
              {docs.map((doc) => (
                <button
                  key={doc._id}
                  onClick={() => { setSelectedDocId(doc._id); setSidebarOpen(false); }}
                  className={`w-full text-left px-3 py-3 rounded-xl transition-all group ${
                    selectedDocId === doc._id
                      ? "bg-indigo-600 text-white"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-base flex-shrink-0">
                      {doc.fileName?.endsWith(".pdf") ? "📄" : "📝"}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{doc.title}</p>
                      <p className={`text-xs truncate capitalize mt-0.5 ${
                        selectedDocId === doc._id ? "text-indigo-200" : "text-slate-500 group-hover:text-slate-400"
                      }`}>
                        {doc.subject} · {doc.chunkCount} chunks
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        
        <div className="px-4 py-4 border-t border-slate-700">
          <a
            href="/documents"
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all text-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Upload a document
          </a>
        </div>
      </aside>

      
      <div className="flex-1 flex flex-col min-w-0 bg-slate-50">

        
        <header className="bg-white border-b border-slate-200 px-5 py-4 flex items-center gap-4 flex-shrink-0">
          
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg hover:bg-slate-100 text-slate-600"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {selectedDoc ? (
            <>
              <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
                <span className="text-lg">{selectedDoc.fileName?.endsWith(".pdf") ? "📄" : "📝"}</span>
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-sm font-bold text-slate-800 truncate">{selectedDoc.title}</h1>
                <p className="text-xs text-slate-400 capitalize">{selectedDoc.subject} · {selectedDoc.chunkCount} chunks</p>
              </div>
              {conversation?.messages?.length > 0 && (
                <button
                  onClick={handleClear}
                  disabled={clearing}
                  className="text-xs text-slate-400 hover:text-red-500 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  {clearing ? "Clearing…" : "Clear chat"}
                </button>
              )}
            </>
          ) : (
            <h1 className="text-sm font-bold text-slate-800">
              🤖 LM Notebook — Select a document to start chatting
            </h1>
          )}
        </header>

        
        <div className="flex-1 overflow-y-auto px-5 py-6 space-y-5">
          {!selectedDocId ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-8">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center mb-5 shadow-lg shadow-indigo-200">
                <span className="text-4xl">🤖</span>
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">Select a document</h3>
              <p className="text-slate-400 text-sm max-w-xs">
                Choose a document from the left panel to start an AI-powered chat about its content.
              </p>
            </div>
          ) : convLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : conversation?.messages?.length === 0 ? (
            <EmptyChat docTitle={selectedDoc?.title ?? "this document"} />
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

        
        <div className="bg-white border-t border-slate-200 px-5 py-4 flex-shrink-0">
          <div className={`flex gap-3 items-end ${!selectedDocId ? "opacity-40 pointer-events-none" : ""}`}>
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
                placeholder="Ask anything about this document… (Enter to send)"
                rows={1}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm resize-none outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all max-h-32 leading-relaxed"
                style={{ minHeight: "48px" }}
              />
            </div>
            <button
              onClick={handleSend}
              disabled={sending || !message.trim()}
              className="w-12 h-12 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center flex-shrink-0 shadow-md shadow-indigo-200"
            >
              {sending ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                </svg>
              )}
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-2 text-center">
            AI answers are grounded on your document. Press <kbd className="px-1 py-0.5 bg-slate-100 rounded text-slate-600 text-[10px]">Shift+Enter</kbd> for new line.
          </p>
        </div>
      </div>
    </div>
  );
}
