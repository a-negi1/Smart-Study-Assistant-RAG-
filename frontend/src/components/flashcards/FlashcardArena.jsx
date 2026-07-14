import { useState, useEffect, useCallback } from "react";
import { flashcardAPI } from "../../api/services.js";
import toast from "react-hot-toast";

const FLIP_CSS = `
  .fc-scene { perspective: 1200px; width: 100%; height: 100%; }
  .fc-inner { position: relative; width: 100%; height: 100%; transition: transform 0.52s cubic-bezier(0.4,0,0.2,1); transform-style: preserve-3d; }
  .fc-inner.flipped { transform: rotateY(180deg); }
  .fc-face { position: absolute; inset: 0; backface-visibility: hidden; -webkit-backface-visibility: hidden; }
  .fc-face.back { transform: rotateY(180deg); }
  @keyframes fcSlideIn  { from { opacity:0; transform: translateX(40px);  } to { opacity:1; transform: translateX(0); } }
  @keyframes fcSlideOut { from { opacity:1; transform: translateX(0); }    to { opacity:0; transform: translateX(-40px); } }
  .fc-enter { animation: fcSlideIn  0.28s ease forwards; }
  .fc-exit  { animation: fcSlideOut 0.20s ease forwards; }
`;

function injectCSS() {
  if (!document.getElementById("fc-styles")) {
    const s = document.createElement("style");
    s.id = "fc-styles";
    s.textContent = FLIP_CSS;
    document.head.appendChild(s);
  }
}

function CardFace({ label, labelColor, content, tags, onClick, hint }) {
  return (
    <div
      onClick={onClick}
      className="h-full flex flex-col cursor-pointer select-none active:scale-[0.99] transition-transform rounded-xl p-5"
      style={{
        background: "var(--surface-1)",
        border: "1px solid var(--rule-strong)",
        boxShadow: "var(--shadow-md)",
      }}
    >
      <span
        className="text-xs font-mono font-semibold uppercase tracking-widest"
        style={{ color: labelColor }}
      >
        {label}
      </span>
      <p
        className="flex-1 flex items-center justify-center text-sm leading-relaxed text-center my-4"
        style={{ color: "var(--text-1)", fontFamily: "'Lora', serif" }}
      >
        {content}
      </p>
      {tags?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 justify-center mt-1">
          {tags.map((t) => (
            <span
              key={t}
              className="text-xs px-2 py-0.5 rounded font-mono"
              style={{
                background: "var(--surface-2)",
                border: "1px solid var(--rule-strong)",
                color: "var(--text-3)",
                fontSize: "10px",
              }}
            >
              #{t}
            </span>
          ))}
        </div>
      )}
      <p className="text-xs text-center mt-3 font-mono" style={{ color: "var(--text-3)", fontSize: "10px" }}>{hint}</p>
    </div>
  );
}

function RateBtn({ label, sub, bgColor, borderColor, textColor, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex flex-col items-center gap-1 py-2.5 px-2 rounded-lg font-semibold text-xs transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
      style={{
        background: bgColor,
        border: `1px solid ${borderColor}`,
        color: textColor,
      }}
    >
      <span>{label}</span>
      <span className="text-[10px] opacity-60 font-mono">({sub})</span>
    </button>
  );
}

function SessionComplete({ stats, total, compact }) {
  const mastery = total > 0 ? Math.round(((stats.Easy + stats.Medium * 0.5) / total) * 100) : 0;
  const px = compact ? "px-4 py-4" : "max-w-sm mx-auto px-4 py-8";
  return (
    <div className={`${px} text-center`}>
      <div
        className="rounded-xl p-7"
        style={{
          background: "var(--surface-1)",
          border: "1px solid var(--rule)",
          boxShadow: "var(--shadow-md)",
        }}
      >
        {}
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4"
          style={{ background: "var(--green-dim)", border: "1px solid rgba(92,154,116,0.30)" }}
        >
          <span className="text-sm font-mono font-bold" style={{ color: "var(--green-text)" }}>✓</span>
        </div>

        <h2
          className="text-base font-semibold mb-1"
          style={{ color: "var(--text-1)", fontFamily: "'Lora', serif" }}
        >
          Session complete
        </h2>
        <p className="text-sm mb-5" style={{ color: "var(--text-3)" }}>
          You reviewed {total} card{total !== 1 ? "s" : ""}.
        </p>

        <div className="grid grid-cols-3 gap-2 mb-5">
          {[
            ["Easy",   "var(--green-dim)",  "rgba(92,154,116,0.35)",  "var(--green-text)",  stats.Easy],
            ["Medium", "var(--amber-dim)",   "rgba(201,135,58,0.35)",  "var(--amber)",       stats.Medium],
            ["Hard",   "var(--red-dim)",     "rgba(184,92,92,0.35)",   "var(--red-text)",    stats.Hard],
          ].map(([l, bg, border, color, v]) => (
            <div key={l} className="rounded-lg px-2 py-2.5" style={{ background: bg, border: `1px solid ${border}` }}>
              <div className="text-xl font-bold font-mono" style={{ color }}>{v}</div>
              <div className="text-xs font-mono mt-0.5" style={{ color, opacity: 0.75, fontSize: "10px" }}>{l}</div>
            </div>
          ))}
        </div>

        <div className="flex justify-between text-xs font-mono mb-1.5" style={{ color: "var(--text-3)", fontSize: "10px" }}>
          <span>Session Mastery</span>
          <span style={{ color: "var(--amber)" }}>{mastery}%</span>
        </div>
        <div className="w-full h-0.5 rounded-full overflow-hidden" style={{ background: "var(--rule)" }}>
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{
              width: `${mastery}%`,
              background: "var(--amber)",
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default function FlashcardArena({ cards = [], onSessionEnd, compact = false }) {
  const [idx, setIdx]         = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [anim, setAnim]       = useState("fc-enter");
  const [stats, setStats]     = useState({ Easy: 0, Medium: 0, Hard: 0 });
  const [loading, setLoading] = useState(false);
  const [done, setDone]       = useState(false);

  useEffect(() => { injectCSS(); }, []);

  const card     = cards[idx];
  const progress = cards.length > 0 ? (idx / cards.length) * 100 : 0;

  const rate = useCallback(async (rating) => {
    if (loading || !card) return;
    setLoading(true);
    try { await flashcardAPI.review(card._id, rating); }
    catch { toast.error("Could not save rating."); }
    finally { setLoading(false); }

    const newStats = { ...stats, [rating]: stats[rating] + 1 };
    setStats(newStats);

    if (idx + 1 >= cards.length) {
      setDone(true);
      onSessionEnd?.(newStats);
      return;
    }
    setAnim("fc-exit");
    setTimeout(() => { setIdx((i) => i + 1); setFlipped(false); setAnim("fc-enter"); }, 200);
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

  const px = compact ? "px-4 py-4" : "max-w-lg mx-auto px-4 py-8";

  if (done) return <SessionComplete stats={stats} total={cards.length} compact={compact} />;
  if (!card) return (
    <div className="text-center py-20 text-sm font-mono" style={{ color: "var(--text-3)" }}>
      No cards to review right now.
    </div>
  );

  return (
    <div className={px}>
      {}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-mono" style={{ color: "var(--text-3)" }}>
          {idx + 1} / {cards.length}
        </span>
        <div className="flex gap-3 text-xs font-mono">
          <span style={{ color: "var(--green-text)" }}>✓ {stats.Easy}</span>
          <span style={{ color: "var(--amber)" }}>~ {stats.Medium}</span>
          <span style={{ color: "var(--red-text)" }}>✗ {stats.Hard}</span>
        </div>
      </div>

      {}
      <div className="w-full h-0.5 rounded-full mb-4 overflow-hidden" style={{ background: "var(--rule)" }}>
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${progress}%`,
            background: "var(--amber)",
          }}
        />
      </div>

      {}
      <div className="flex gap-1 mb-4">
        {[1, 2, 3, 4, 5].map((b) => (
          <div
            key={b}
            className="h-0.5 flex-1 rounded-full transition-all duration-300"
            style={{
              background: b <= (card.boxNumber ?? 1) ? "var(--amber)" : "var(--rule)",
            }}
          />
        ))}
      </div>

      {}
      <div className={`relative ${compact ? "h-56" : "h-72"} mb-5 ${anim}`}>
        <div className="fc-scene h-full">
          <div className={`fc-inner h-full ${flipped ? "flipped" : ""}`}>
            <div className="fc-face">
              <CardFace
                label="Question"
                labelColor="var(--amber)"
                content={card.front}
                tags={card.tags}
                onClick={() => setFlipped(true)}
                hint="Click or Space to reveal"
              />
            </div>
            <div className="fc-face back">
              <CardFace
                label="Answer"
                labelColor="var(--green-text)"
                content={card.back}
                onClick={() => setFlipped(false)}
                hint="Rate how well you knew this"
              />
            </div>
          </div>
        </div>
      </div>

      {}
      <div className={`transition-all duration-300 ${flipped ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3 pointer-events-none"}`}>
        <p className="text-center text-xs mb-3 font-mono" style={{ color: "var(--text-3)", fontSize: "10px" }}>
          How well did you know this? (1 / 2 / 3)
        </p>
        <div className="grid grid-cols-3 gap-2">
          <RateBtn
            label="Hard" sub="1"
            bgColor="var(--red-dim)" borderColor="rgba(184,92,92,0.28)" textColor="var(--red-text)"
            onClick={() => rate("Hard")} disabled={loading}
          />
          <RateBtn
            label="Medium" sub="2"
            bgColor="var(--amber-dim)" borderColor="rgba(201,135,58,0.28)" textColor="var(--amber)"
            onClick={() => rate("Medium")} disabled={loading}
          />
          <RateBtn
            label="Easy" sub="3"
            bgColor="var(--green-dim)" borderColor="rgba(92,154,116,0.28)" textColor="var(--green-text)"
            onClick={() => rate("Easy")} disabled={loading}
          />
        </div>
      </div>

      {!flipped && !compact && (
        <p className="text-center text-xs mt-6 font-mono" style={{ color: "var(--text-3)", fontSize: "10px" }}>
          Tap card or press Space to flip
        </p>
      )}
    </div>
  );
}
