import { useState, useEffect } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, Cell,
} from "recharts";
import { analyticsAPI } from "../../api/services.js";

const C = {
  primary: "#c9873a",
  success: "#5c9a74",
  warning: "#b8aa8e",
  danger:  "#b85c5c",
  radar:   "#c9873a",
};
const DIFF_COLORS = { Easy: C.success, Medium: "#c9873a", Hard: C.danger };

const LineTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div
      className="rounded-lg shadow-lg p-3 text-xs font-mono"
      style={{
        background: "#1e1b17",
        border: "1px solid rgba(232,223,200,0.13)",
        boxShadow: "0 4px 20px rgba(0,0,0,0.60)",
      }}
    >
      <p className="font-semibold mb-1" style={{ color: "#e8dfc8", fontFamily: "'DM Sans', sans-serif" }}>{d?.label}</p>
      <p className="font-bold text-base" style={{ color: "#c9873a" }}>{d?.averageScore ?? "—"}%</p>
      <p style={{ color: "#786b56" }}>{d?.attempts} attempt{d?.attempts !== 1 ? "s" : ""}</p>
    </div>
  );
};

export default function AnalyticsDashboard() {
  const [period, setPeriod]   = useState(30);
  const [progress, setProgress] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    setError(null);

    Promise.all([analyticsAPI.getProgress(period), analyticsAPI.getSummary()])
      .then(([prog, sum]) => { setProgress(prog); setSummary(sum); })
      .catch((e) => { if (e.name !== "AbortError") setError(e.message); })
      .finally(() => setLoading(false));

    return () => ctrl.abort();
  }, [period]);

  if (loading) return <Skeleton />;
  if (error) return (
    <div className="flex-1 overflow-y-auto p-8 text-center text-sm" style={{ color: "var(--red-text)" }}>
      {error}
    </div>
  );

  const { lineData = [], radarData = [], difficultyData = [] } = progress ?? {};
  const { quizzes = {}, flashcards = {}, streak = {} } = summary ?? {};

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6" style={{ background: "var(--surface-1)" }}>

      {}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-xl font-semibold"
            style={{ color: "var(--text-1)", fontFamily: "'Lora', serif" }}
          >
            Analytics
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-3)" }}>
            Your quiz and flashcard performance
          </p>
        </div>

        {}
        <div
          className="flex gap-0.5 p-1 rounded-lg"
          style={{ background: "var(--surface-0)", border: "1px solid var(--rule)" }}
        >
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setPeriod(d)}
              className="text-xs font-mono px-3 py-1.5 rounded-md transition-all"
              style={period === d
                ? { background: "var(--amber-dim)", color: "var(--amber)", border: "1px solid rgba(201,135,58,0.25)" }
                : { color: "var(--text-3)", border: "1px solid transparent" }
              }
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Avg Score"       value={`${quizzes.overallAverage ?? 0}%`}      sub={`${quizzes.passRate ?? 0}% pass rate`}              accent="var(--amber)" />
        <StatCard label="Quizzes Taken"   value={quizzes.totalAttempts ?? 0}               sub="total attempts"                                     accent="var(--blue-info)" />
        <StatCard label="Cards Mastered"  value={`${flashcards.masteryPercent ?? 0}%`}     sub={`${flashcards.mastered ?? 0}/${flashcards.total ?? 0} cards`} accent="var(--green-text)" />
        <StatCard label="Study Streak"    value={streak.currentStreak ?? 0}                sub={`${streak.label ?? "days"} in a row`}               accent="var(--amber)" />
      </div>

      {}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {}
        <div
          className="lg:col-span-2 rounded-xl p-5"
          style={{ background: "var(--surface-0)", border: "1px solid var(--rule)" }}
        >
          <h2 className="text-xs font-semibold uppercase tracking-wider font-mono mb-0.5" style={{ color: "var(--text-3)" }}>Score Over Time</h2>
          <p className="text-xs mb-4" style={{ color: "var(--text-3)" }}>Daily average — last {period} days</p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={lineData} margin={{ top: 4, right: 16, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(232,223,200,0.06)" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "#786b56", fontFamily: "'JetBrains Mono', monospace" }}
                tickLine={false} axisLine={false}
                interval={Math.floor(lineData.length / 6)}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 10, fill: "#786b56", fontFamily: "'JetBrains Mono', monospace" }}
                tickLine={false} axisLine={false}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip content={<LineTooltip />} />
              <Line
                type="monotone"
                dataKey="averageScore"
                stroke={C.primary}
                strokeWidth={2}
                dot={(p) => p.payload.averageScore == null
                  ? null
                  : <circle key={p.cx} cx={p.cx} cy={p.cy} r={3} fill={C.primary} stroke="#1e1b17" strokeWidth={2} />
                }
                activeDot={{ r: 5, fill: C.primary }}
                connectNulls={false}
                name="Avg Score"
              />
              <Legend
                wrapperStyle={{ fontSize: 10, paddingTop: 10, fontFamily: "'JetBrains Mono', monospace" }}
                formatter={(v) => <span style={{ color: "#786b56" }}>{v}</span>}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {}
        <div
          className="rounded-xl p-5"
          style={{ background: "var(--surface-0)", border: "1px solid var(--rule)" }}
        >
          <h2 className="text-xs font-semibold uppercase tracking-wider font-mono mb-0.5" style={{ color: "var(--text-3)" }}>Subject Mastery</h2>
          <p className="text-xs mb-3" style={{ color: "var(--text-3)" }}>Average score per topic</p>
          {radarData.length === 0
            ? (
              <div
                className="flex items-center justify-center h-40 text-xs text-center px-4 empty-ruled"
                style={{ color: "var(--text-3)", fontFamily: "'Lora', serif" }}
              >
                Complete quizzes across subjects to see your radar.
              </div>
            )
            : (
              <ResponsiveContainer width="100%" height={200}>
                <RadarChart data={radarData} margin={{ top: 8, right: 24, left: 24, bottom: 8 }}>
                  <PolarGrid stroke="rgba(232,223,200,0.07)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: "#786b56", fontFamily: "'JetBrains Mono', monospace" }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9, fill: "#786b56" }} axisLine={false} tickCount={4} />
                  <Radar dataKey="score" stroke={C.radar} fill={C.radar} fillOpacity={0.12} strokeWidth={1.5} />
                  <Tooltip
                    formatter={(v, _, p) => [`${v}% (${p.payload.attempts} attempts)`, "Score"]}
                    contentStyle={{
                      fontSize: 11,
                      borderRadius: 8,
                      background: "#1e1b17",
                      border: "1px solid rgba(232,223,200,0.13)",
                      color: "#e8dfc8",
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            )
          }
        </div>
      </div>

      {}
      <div
        className="rounded-xl p-5"
        style={{ background: "var(--surface-0)", border: "1px solid var(--rule)" }}
      >
        <h2 className="text-xs font-semibold uppercase tracking-wider font-mono mb-0.5" style={{ color: "var(--text-3)" }}>By Difficulty</h2>
        <p className="text-xs mb-4" style={{ color: "var(--text-3)" }}>Average score across Easy, Medium, Hard</p>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={difficultyData} margin={{ top: 4, right: 16, left: -16, bottom: 0 }} barSize={40}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(232,223,200,0.06)" vertical={false} />
            <XAxis
              dataKey="difficulty"
              tick={{ fontSize: 11, fill: "#b8aa8e", fontFamily: "'JetBrains Mono', monospace" }}
              tickLine={false} axisLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 10, fill: "#786b56", fontFamily: "'JetBrains Mono', monospace" }}
              tickLine={false} axisLine={false}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip
              formatter={(v) => [`${v}%`, "Avg Score"]}
              contentStyle={{
                fontSize: 11,
                borderRadius: 8,
                background: "#1e1b17",
                border: "1px solid rgba(232,223,200,0.13)",
                color: "#e8dfc8",
                fontFamily: "'JetBrains Mono', monospace",
              }}
            />
            <Bar dataKey="averageScore" radius={[4, 4, 0, 0]}>
              {difficultyData.map((e) => <Cell key={e.difficulty} fill={DIFF_COLORS[e.difficulty] ?? C.primary} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {}
      {(flashcards.dueNow ?? 0) > 0 && (
        <div
          className="rounded-xl p-4 flex items-center justify-between"
          style={{
            background: "var(--amber-dim)",
            border: "1px solid rgba(201,135,58,0.25)",
          }}
        >
          <div>
            <p className="text-sm font-medium" style={{ color: "var(--amber)" }}>
              {flashcards.dueNow} flashcard{flashcards.dueNow !== 1 ? "s" : ""} due for review
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-3)" }}>
              Spend 5 minutes reviewing to keep your streak.
            </p>
          </div>
          <a
            href="/flashcards"
            className="px-4 py-2 rounded-lg btn-primary text-sm flex-shrink-0"
          >
            Review
          </a>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, sub, accent }) {
  return (
    <div
      className="rounded-xl p-4"
      style={{ background: "var(--surface-0)", border: "1px solid var(--rule)" }}
    >
      <p
        className="text-xs font-mono uppercase tracking-wider mb-2"
        style={{ color: "var(--text-3)" }}
      >
        {label}
      </p>
      <div
        className="text-xl font-bold font-mono mb-1"
        style={{ color: accent ?? "var(--text-1)" }}
      >
        {value}
      </div>
      <div className="text-xs font-mono" style={{ color: "var(--text-3)", fontSize: "10px" }}>{sub}</div>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6" style={{ background: "var(--surface-1)" }}>
      <div className="h-7 w-40 rounded-lg animate-shimmer" />
      <div className="grid grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <div key={i} className="h-20 rounded-xl animate-shimmer" />)}
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 h-64 rounded-xl animate-shimmer" />
        <div className="h-64 rounded-xl animate-shimmer" />
      </div>
      <div className="h-44 rounded-xl animate-shimmer" />
    </div>
  );
}
