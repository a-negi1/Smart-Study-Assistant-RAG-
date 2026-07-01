
import { useState, useEffect, useRef, useCallback } from "react";
import { quizAPI } from "../../api/services.js";
import toast from "react-hot-toast";

const LABEL_COLORS = {
  A: "bg-violet-100 text-violet-800 border-violet-200",
  B: "bg-sky-100 text-sky-800 border-sky-200",
  C: "bg-amber-100 text-amber-800 border-amber-200",
  D: "bg-rose-100 text-rose-800 border-rose-200",
};

export default function QuizEngine({ quizId, questions = [], onComplete }) {
  const [index, setIndex]       = useState(0);
  const [selected, setSelected] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [answers, setAnswers]   = useState([]);
  const [phase, setPhase]       = useState("quiz"); // quiz | submitting | results
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
    } catch (err) {
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

  if (phase === "submitting") {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-500 font-medium">Calculating your score…</p>
      </div>
    );
  }

  if (phase === "results") return <QuizResults results={results} />;
  if (!current) return null;

  const isCorrect = revealed && selected === current.correctAnswer;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-slate-500">
          Question {index + 1} / {questions.length}
        </span>
        <span className="font-mono text-sm text-slate-400 bg-white px-3 py-1 rounded-full border border-slate-200">
          ⏱ {String(Math.floor(elapsed / 60)).padStart(2, "0")}:{String(elapsed % 60).padStart(2, "0")}
        </span>
      </div>

      
      <div className="w-full h-1.5 bg-slate-200 rounded-full mb-8 overflow-hidden">
        <div className="h-full bg-indigo-500 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>

     
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 mb-4">
        {current.topic && (
          <span className="inline-block text-xs font-semibold uppercase tracking-wider text-indigo-500 bg-indigo-50 px-2.5 py-1 rounded-full mb-4">
            {current.topic}
          </span>
        )}
        <h2 className="text-lg font-semibold text-slate-800 leading-relaxed mb-6">
          {current.questionText}
        </h2>

        <div className="space-y-3">
          {current.options.map((opt) => {
            let cls = "border-gray-200 bg-white hover:border-indigo-400 hover:bg-indigo-50";
            if (revealed) {
              if (opt.label === current.correctAnswer)                     cls = "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-300";
              else if (opt.label === selected)                             cls = "border-red-400 bg-red-50 ring-2 ring-red-300";
              else                                                         cls = "border-gray-100 bg-gray-50 opacity-50";
            } else if (opt.label === selected) {
              cls = "border-indigo-500 bg-indigo-50 ring-2 ring-indigo-300";
            }

            return (
              <button
                key={opt.label}
                onClick={() => !revealed && setSelected(opt.label)}
                disabled={revealed}
                className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all duration-150 cursor-pointer disabled:cursor-default ${cls}`}
              >
                <span className={`flex-shrink-0 w-7 h-7 rounded-lg border text-xs font-bold flex items-center justify-center ${LABEL_COLORS[opt.label]}`}>
                  {opt.label}
                </span>
                <span className="text-sm text-slate-700 font-medium">{opt.text}</span>
                {revealed && opt.label === current.correctAnswer && <span className="ml-auto text-emerald-500">✓</span>}
                {revealed && opt.label === selected && opt.label !== current.correctAnswer && <span className="ml-auto text-red-400">✗</span>}
              </button>
            );
          })}
        </div>
      </div>

    
      {revealed && (
        <div className={`rounded-xl p-4 mb-4 border-l-4 text-sm leading-relaxed ${isCorrect ? "bg-emerald-50 border-emerald-400 text-emerald-800" : "bg-red-50 border-red-400 text-red-800"}`}>
          <span className="font-semibold">{isCorrect ? "✓ Correct! " : "✗ Not quite. "}</span>
          {current.explanation}
        </div>
      )}

     
      <div className="flex justify-end gap-3">
        {!revealed ? (
          <button
            onClick={confirm}
            disabled={!selected}
            className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Check Answer
          </button>
        ) : (
          <button
            onClick={advance}
            className="px-6 py-3 bg-slate-800 text-white font-semibold rounded-xl hover:bg-slate-900 active:scale-95 transition-all"
          >
            {index + 1 < questions.length ? "Next →" : "See Results"}
          </button>
        )}
      </div>
      <p className="text-center text-xs text-slate-400 mt-4">Press A/B/C/D to select · Enter to confirm</p>
    </div>
  );
}

function QuizResults({ results }) {
  const { score, totalQuestions, percentageScore, passed, breakdown = [] } = results ?? {};
  const gradeColor = percentageScore >= 80 ? "text-emerald-600" : percentageScore >= 60 ? "text-amber-500" : "text-red-500";

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-sm">
        <div className={`text-6xl font-black mb-2 ${gradeColor}`}>{percentageScore}%</div>
        <p className="text-slate-500 text-sm mb-2">{score} / {totalQuestions} correct</p>
        <span className={`inline-block text-sm font-semibold px-4 py-1.5 rounded-full ${passed ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
          {passed ? "🎉 Passed" : "📚 Keep Studying"}
        </span>
      </div>

      <div className="space-y-3">
        {breakdown.map((item, i) => (
          <div key={i} className={`bg-white rounded-xl border p-4 ${item.isCorrect ? "border-emerald-200" : "border-red-200"}`}>
            <div className="flex items-start gap-3">
              <span className="text-lg">{item.isCorrect ? "✅" : "❌"}</span>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-700 mb-1">{item.questionText}</p>
                <p className="text-xs text-slate-500">
                  Your answer: <span className={item.isCorrect ? "text-emerald-600 font-semibold" : "text-red-500 font-semibold"}>{item.studentSelectedAnswer ?? "—"}</span>
                  {!item.isCorrect && <> · Correct: <span className="text-emerald-600 font-semibold">{item.correctAnswer}</span></>}
                </p>
                {item.explanation && <p className="text-xs text-slate-400 mt-1 italic">{item.explanation}</p>}
              </div>
              <span className="text-xs text-slate-400 flex-shrink-0">{item.timeTaken}s</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
