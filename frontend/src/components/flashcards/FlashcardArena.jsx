
import { useState, useEffect, useCallback } from "react";
import { flashcardAPI } from "../../api/services.js";
import toast from "react-hot-toast";


const FLIP_CSS = `
  .fc-scene { perspective: 1200px; width: 100%; height: 100%; }
  .fc-inner { position: relative; width: 100%; height: 100%; transition: transform 0.5s cubic-bezier(0.4,0,0.2,1); transform-style: preserve-3d; }
  .fc-inner.flipped { transform: rotateY(180deg); }
  .fc-face { position: absolute; inset: 0; backface-visibility: hidden; -webkit-backface-visibility: hidden; }
  .fc-face.back { transform: rotateY(180deg); }
  @keyframes fcSlideIn { from { opacity:0; transform: translateX(40px); } to { opacity:1; transform: translateX(0); } }
  @keyframes fcSlideOut { from { opacity:1; } to { opacity:0; transform: translateX(-40px); } }
  .fc-enter { animation: fcSlideIn 0.28s ease forwards; }
  .fc-exit  { animation: fcSlideOut 0.2s ease forwards; }
`;

function injectCSS() {
  if (!document.getElementById("fc-styles")) {
    const s = document.createElement("style");
    s.id = "fc-styles";
    s.textContent = FLIP_CSS;
    document.head.appendChild(s);
  }
}

export default function FlashcardArena({ cards = [], onSessionEnd }) {
  const [idx, setIdx]             = useState(0);
  const [flipped, setFlipped]     = useState(false);
  const [anim, setAnim]           = useState("fc-enter");
  const [stats, setStats]         = useState({ Easy: 0, Medium: 0, Hard: 0 });
  const [loading, setLoading]     = useState(false);
  const [done, setDone]           = useState(false);

  useEffect(() => { injectCSS(); }, []);

  const card     = cards[idx];
  const progress = cards.length > 0 ? (idx / cards.length) * 100 : 0;

  const rate = useCallback(async (rating) => {
    if (loading || !card) return;
    setLoading(true);

    try {
      await flashcardAPI.review(card._id, rating);
    } catch {
      toast.error("Could not save rating. Please check your connection.");
    } finally {
      setLoading(false);
    }

    const newStats = { ...stats, [rating]: stats[rating] + 1 };
    setStats(newStats);

    if (idx + 1 >= cards.length) {
      setDone(true);
      onSessionEnd?.(newStats);
      return;
    }

    setAnim("fc-exit");
    setTimeout(() => {
      setIdx((i) => i + 1);
      setFlipped(false);
      setAnim("fc-enter");
    }, 200);
  }, [card, idx, cards.length, loading, stats, onSessionEnd]);

  useEffect(() => {
    const h = (e) => {
      if (done) return;
      if (e.code === "Space") { e.preventDefault(); setFlipped((f) => !f); }
      if (e.key === "1") rate("Hard");
      if (e.key === "2") rate("Medium");
      if (e.key === "3") rate("Easy");
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [done, rate]);

  if (done) return <SessionComplete stats={stats} total={cards.length} />;
  if (!card) return <div className="text-center py-20 text-slate-500">No cards to review right now.</div>;

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
   
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-slate-500">{idx + 1} / {cards.length}</span>
        <div className="flex gap-3 text-xs font-semibold">
          <span className="text-emerald-600">✓ {stats.Easy}</span>
          <span className="text-amber-500">~ {stats.Medium}</span>
          <span className="text-red-500">✗ {stats.Hard}</span>
        </div>
      </div>

     
      <div className="w-full h-1 bg-slate-200 rounded-full mb-6 overflow-hidden">
        <div className="h-full bg-violet-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
      </div>

      
      <div className="flex gap-1.5 mb-5">
        {[1,2,3,4,5].map((b) => (
          <div key={b} className={`h-1.5 flex-1 rounded-full ${b <= (card.boxNumber ?? 1) ? "bg-violet-500" : "bg-slate-200"}`} />
        ))}
      </div>

      
      <div className={`relative h-72 mb-6 ${anim}`}>
        <div className="fc-scene h-full">
          <div className={`fc-inner h-full ${flipped ? "flipped" : ""}`}>
            {/* Front */}
            <div className="fc-face">
              <CardFace label="QUESTION" labelColor="text-violet-500" content={card.front} tags={card.tags} onClick={() => setFlipped(true)} hint="Click or Space to reveal answer" />
            </div>
            {/* Back */}
            <div className="fc-face back">
              <CardFace label="ANSWER" labelColor="text-emerald-500" content={card.back} onClick={() => setFlipped(false)} hint="Rate how well you knew this" />
            </div>
          </div>
        </div>
      </div>

     
      <div className={`transition-all duration-300 ${flipped ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3 pointer-events-none"}`}>
        <p className="text-center text-xs text-slate-400 mb-3">How well did you know this?</p>
        <div className="grid grid-cols-3 gap-3">
          <RateBtn label="Hard"   sub="1" icon="🔴" cls="border-red-200 bg-red-50 hover:bg-red-100 text-red-700"       onClick={() => rate("Hard")}   disabled={loading} />
          <RateBtn label="Medium" sub="2" icon="🟡" cls="border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-700" onClick={() => rate("Medium")} disabled={loading} />
          <RateBtn label="Easy"   sub="3" icon="🟢" cls="border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700" onClick={() => rate("Easy")} disabled={loading} />
        </div>
      </div>

      {!flipped && <p className="text-center text-xs text-slate-400 mt-6">Tap card or press Space to flip</p>}
    </div>
  );
}

function CardFace({ label, labelColor, content, tags, onClick, hint }) {
  return (
    <div onClick={onClick} className="h-full bg-white rounded-2xl shadow-md border border-slate-200 p-7 flex flex-col cursor-pointer select-none active:scale-[0.99] transition-transform">
      <span className={`text-xs font-bold uppercase tracking-widest ${labelColor}`}>{label}</span>
      <p className="flex-1 flex items-center justify-center text-slate-800 text-base font-medium leading-relaxed text-center my-4">
        {content}
      </p>
      {tags?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 justify-center mt-1">
          {tags.map((t) => <span key={t} className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">#{t}</span>)}
        </div>
      )}
      <p className="text-xs text-slate-300 text-center mt-3">{hint}</p>
    </div>
  );
}

function RateBtn({ label, sub, icon, cls, onClick, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={`flex flex-col items-center gap-1 py-3 px-2 rounded-xl border-2 font-semibold text-sm transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${cls}`}>
      <span className="text-xl">{icon}</span>
      <span>{label}</span>
      <span className="text-xs opacity-60 font-mono">({sub})</span>
    </button>
  );
}

function SessionComplete({ stats, total }) {
  const mastery = total > 0 ? Math.round(((stats.Easy + stats.Medium * 0.5) / total) * 100) : 0;
  return (
    <div className="max-w-sm mx-auto px-4 py-8 text-center">
      <div className="bg-white rounded-2xl border border-slate-200 p-10 shadow-sm">
        <div className="text-5xl mb-4">🎓</div>
        <h2 className="text-2xl font-bold text-slate-800 mb-1">Session Complete!</h2>
        <p className="text-slate-500 text-sm mb-8">You reviewed {total} cards.</p>
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[["Easy", "text-emerald-600 bg-emerald-50", stats.Easy], ["Medium", "text-amber-600 bg-amber-50", stats.Medium], ["Hard", "text-red-600 bg-red-50", stats.Hard]].map(([l, c, v]) => (
            <div key={l} className={`rounded-xl px-3 py-3 ${c}`}>
              <div className="text-2xl font-black">{v}</div>
              <div className="text-xs font-medium opacity-80">{l}</div>
            </div>
          ))}
        </div>
        <div className="flex justify-between text-xs text-slate-400 font-medium mb-1">
          <span>Session Mastery</span><span>{mastery}%</span>
        </div>
        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-violet-500 rounded-full transition-all duration-1000" style={{ width: `${mastery}%` }} />
        </div>
      </div>
    </div>
  );
}
