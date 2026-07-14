import { useState, useEffect, useRef, useCallback } from "react";
import { quizAPI } from "../../api/services.js";
import toast from "react-hot-toast";

const LABEL_STYLES = {
  A: { bg: "rgba(201,135,58,0.12)",  border: "rgba(201,135,58,0.28)",  color: "#c9873a" },
  B: { bg: "rgba(91,143,201,0.12)",  border: "rgba(91,143,201,0.28)",  color: "#5b8fc9" },
  C: { bg: "rgba(143,170,110,0.12)", border: "rgba(143,170,110,0.28)", color: "#8faa6e" },
  D: { bg: "rgba(184,92,92,0.12)",   border: "rgba(184,92,92,0.28)",   color: "#b85c5c" },
};

export default function QuizEngine({ quizId, questions = [], onComplete, compact = false }) {
  const [index, setIndex]       = useState(0);
  const [selected, setSelected] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [answers, setAnswers]   = useState([]);
  const [phase, setPhase]       = useState("quiz");
  const [results, setResults]   = useState(null);
  const [elapsed, setElapsed]   = useState(0);
  const [startedAt]             = useState(() => new Date().toISOString());
  const timerRef                = useRef(null);

  const current  = questions[index];
  const progress = (index / questions.length) * 100;

  useEffect(() => {
    setElapsed(0);
    timerRef.current = setInterval(() => setElapsed((t) => t + 1), 1000);
    return () => clearInterval(timerRef.current);
  }, [index]);

  const confirm = useCallback(() => {
    if (!selected) return;
    clearInterval(timerRef.current);
    setRevealed(true);
  }, [selected]);

  const advance = useCallback(() => {
    const record = {
      questionId:            current._id ?? String(index),
      studentSelectedAnswer: selected,
      timeTaken:             elapsed,
    };
    const newAnswers = [...answers, record];
    setAnswers(newAnswers);

    if (index + 1 < questions.length) {
      setIndex((i) => i + 1);
      setSelected(null);
      setRevealed(false);
    } else {
      submit(newAnswers);
    }
  }, [answers, current, elapsed, index, questions.length, selected]);

  const submit = async (finalAnswers) => {
    setPhase("submitting");
    try {
      const data = await quizAPI.submitAttempt(quizId, { answers: finalAnswers, startedAt });
      setResults(data);
      setPhase("results");
      onComplete?.(data);
    } catch {
      toast.error("Failed to submit quiz. Please try again.");
      setPhase("quiz");
    }
  };

  useEffect(() => {
    const handler = (e) => {
      if (phase !== "quiz") return;
      const map = { KeyA: "A", KeyB: "B", KeyC: "C", KeyD: "D" };
      if (map[e.code] && !revealed) setSelected(map[e.code]);
      if (e.code === "Enter") revealed ? advance() : confirm();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [phase, revealed, advance, confirm]);

  const px = compact ? "px-4 py-4" : "max-w-2xl mx-auto px-4 py-8";


  if (phase === "submitting") {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <div
          className="w-10 h-10 border-2 rounded-full animate-spin"
          style={{ borderColor: "var(--rule-strong)", borderTopColor: "var(--amber)" }}
        />
        <p className="text-sm font-mono" style={{ color: "var(--text-3)" }}>
          Calculating your score…
        </p>
      </div>
    );
  }

  if (phase === "results") return <QuizResults results={results} compact={compact} />;
  if (!current) return null;

  const isCorrect = revealed && selected === current.correctAnswer;

  return (
    <div className={px}>
      {}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-mono" style={{ color: "var(--text-3)" }}>
          {index + 1} / {questions.length}
        </span>
        <span
          className="font-mono text-xs px-2 py-0.5 rounded-md"
          style={{
            color: "var(--text-2)",
            background: "var(--surface-2)",
            border: "1px solid var(--rule-strong)",
          }}
        >
          {String(Math.floor(elapsed / 60)).padStart(2, "0")}:{String(elapsed % 60).padStart(2, "0")}
        </span>
      </div>

      {}
      <div className="w-full h-0.5 rounded-full mb-5 overflow-hidden" style={{ background: "var(--rule)" }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${progress}%`,
            background: "var(--amber)",
          }}
        />
      </div>

      {}
      <div
        className="rounded-xl p-5 mb-4"
        style={{
          background: "var(--surface-1)",
          border: "1px solid var(--rule)",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        {current.topic && (
          <span
            className="inline-block text-xs font-mono font-semibold uppercase tracking-wider px-2 py-0.5 rounded mb-3"
            style={{
              color: "var(--amber)",
              background: "var(--amber-dim)",
              border: "1px solid rgba(201,135,58,0.22)",
            }}
          >
            {current.topic}
          </span>
        )}
        <h2 className="text-sm font-semibold leading-relaxed mb-4" style={{ color: "var(--text-1)", fontFamily: "'Lora', serif" }}>
          {current.questionText}
        </h2>

        <div className="space-y-2.5">
          {current.options.map((opt) => {
            let bg      = "var(--surface-2)";
            let border  = "var(--rule)";
            let opacity = 1;

            if (revealed) {
              if (opt.label === current.correctAnswer) {
                bg = "var(--green-dim)"; border = "rgba(92,154,116,0.40)";
              } else if (opt.label === selected) {
                bg = "var(--red-dim)"; border = "rgba(184,92,92,0.40)";
              } else {
                opacity = 0.35;
              }
            } else if (opt.label === selected) {
              bg = "var(--amber-dim)"; border = "var(--amber-rule)";
            }

            return (
              <button
                key={opt.label}
                onClick={() => !revealed && setSelected(opt.label)}
                disabled={revealed}
                className="w-full flex items-center gap-3 p-3.5 rounded-xl text-left transition-all duration-150 cursor-pointer disabled:cursor-default"
                style={{ background: bg, border: `1px solid ${border}`, opacity }}
              >
                {}
                <span
                  className="flex-shrink-0 w-7 h-7 rounded-lg border text-xs font-bold flex items-center justify-center"
                  style={{
                    background: LABEL_STYLES[opt.label]?.bg,
                    border: `1px solid ${LABEL_STYLES[opt.label]?.border}`,
                    color: LABEL_STYLES[opt.label]?.color,
                  }}
                >
                  {opt.label}
                </span>
                <span className="text-sm" style={{ color: "var(--text-1)" }}>{opt.text}</span>
                {revealed && opt.label === current.correctAnswer && (
                  <span className="ml-auto font-mono text-xs" style={{ color: "var(--green-text)" }}>✓</span>
                )}
                {revealed && opt.label === selected && opt.label !== current.correctAnswer && (
                  <span className="ml-auto font-mono text-xs" style={{ color: "var(--red-text)" }}>✗</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {}
      {revealed && (
        <div
          className="rounded-lg p-3.5 mb-4 text-sm leading-relaxed border-l-2"
          style={{
            background: isCorrect ? "var(--green-dim)" : "var(--red-dim)",
            borderLeftColor: isCorrect ? "var(--green)" : "var(--red)",
            color: isCorrect ? "var(--green-text)" : "var(--red-text)",
          }}
        >
          <span className="font-semibold font-mono text-xs">{isCorrect ? "CORRECT  " : "INCORRECT  "}</span>
          <span style={{ color: "var(--text-2)" }}>{current.explanation}</span>
        </div>
      )}

      {}
      <div className="flex justify-end gap-3">
        {!revealed ? (
          <button
            onClick={confirm}
            disabled={!selected}
            className="px-5 py-2.5 rounded-xl btn-glow text-sm disabled:opacity-40"
          >
            Check Answer
          </button>
        ) : (
          <button
            onClick={advance}
            className="px-5 py-2 rounded-lg text-sm font-medium transition-all btn-ghost"
          >
            {index + 1 < questions.length ? "Next →" : "See Results"}
          </button>
        )}
      </div>
      {!compact && (
        <p className="text-center text-xs mt-4 font-mono" style={{ color: "var(--text-3)" }}>
          A / B / C / D to select · Enter to confirm
        </p>
      )}
    </div>
  );
}

function QuizResults({ results, compact }) {
  const { score, totalQuestions, percentageScore, passed, breakdown = [] } = results ?? {};
  const px = compact ? "px-4 py-4" : "max-w-2xl mx-auto px-4 py-8";

  const gradeColor = percentageScore >= 80 ? "var(--green-text)" : percentageScore >= 60 ? "var(--amber)" : "var(--red-text)";

  return (
    <div className={`${px} space-y-4`}>
      {}
      <div
        className="rounded-xl p-7 text-center"
        style={{
          background: "var(--surface-1)",
          border: "1px solid var(--rule)",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <div
          className="text-4xl font-bold mb-2 font-mono"
          style={{ color: gradeColor }}
        >
          {percentageScore}%
        </div>
        <p className="text-sm mb-3 font-mono" style={{ color: "var(--text-3)" }}>
          {score} / {totalQuestions} correct
        </p>
        <span
          className="inline-block text-xs font-mono font-semibold px-3 py-1 rounded"
          style={{
            background: passed ? "var(--green-dim)" : "var(--red-dim)",
            border: `1px solid ${passed ? "rgba(92,154,116,0.35)" : "rgba(184,92,92,0.35)"}`,
            color: passed ? "var(--green-text)" : "var(--red-text)",
          }}
        >
          {passed ? "PASSED" : "KEEP STUDYING"}
        </span>
      </div>

      {}
      <div className="space-y-2">
        {breakdown.map((item, i) => (
          <div
            key={i}
            className="rounded-lg p-3"
            style={{
              background: "var(--surface-1)",
              border: `1px solid ${item.isCorrect ? "rgba(92,154,116,0.22)" : "rgba(184,92,92,0.22)"}`,
            }}
          >
            <div className="flex items-start gap-3">
              <span className="font-mono text-xs flex-shrink-0 mt-0.5" style={{ color: item.isCorrect ? "var(--green-text)" : "var(--red-text)" }}>{item.isCorrect ? "✓" : "✗"}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm mb-1" style={{ color: "var(--text-1)" }}>{item.questionText}</p>
                <p className="text-xs font-mono" style={{ color: "var(--text-3)", fontSize: "10px" }}>
                  Your answer:{" "}
                  <span
                    className="font-semibold"
                    style={{ color: item.isCorrect ? "var(--green-text)" : "var(--red-text)" }}
                  >
                    {item.studentSelectedAnswer ?? "—"}
                  </span>
                  {!item.isCorrect && (
                    <>
                      {" · Correct: "}
                      <span className="font-semibold" style={{ color: "var(--green-text)" }}>
                        {item.correctAnswer}
                      </span>
                    </>
                  )}
                </p>
                {item.explanation && (
                  <p className="text-xs mt-1" style={{ color: "var(--text-3)" }}>
                    {item.explanation}
                  </p>
                )}
              </div>
              <span className="text-xs font-mono flex-shrink-0" style={{ color: "var(--text-3)", fontSize: "10px" }}>
                {item.timeTaken}s
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
