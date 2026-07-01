
import { useState, useEffect } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, Cell,
} from "recharts";
import { analyticsAPI } from "../../api/services.js";

const C = { primary: "#6366f1", success: "#10b981", warning: "#f59e0b", danger: "#ef4444", radar: "#8b5cf6" };
const DIFF_COLORS = { Easy: C.success, Medium: C.warning, Hard: C.danger };

const LineTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-xs">
      <p className="font-semibold text-slate-700 mb-1">{d?.label}</p>
      <p className="text-indigo-600 font-bold text-base">{d?.averageScore ?? "—"}%</p>
      <p className="text-slate-400">{d?.attempts} attempt{d?.attempts !== 1 ? "s" : ""}</p>
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
  if (error) return <div className="flex-1 overflow-y-auto p-8 text-center text-red-500">{error}</div>;

  const { lineData = [], radarData = [], difficultyData = [] } = progress ?? {};
  const { quizzes = {}, flashcards = {}, streak = {} } = summary ?? {};

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Performance Analytics</h1>
          <p className="text-slate-500 text-sm mt-0.5">Track your mastery progress over time.</p>
        </div>
        <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1">
          {[7, 30, 90].map((d) => (
            <button key={d} onClick={() => setPeriod(d)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${period === d ? "bg-indigo-600 text-white" : "text-slate-500 hover:bg-slate-50"}`}>
              {d}d
            </button>
          ))}
        </div>
      </div>

      
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Overall Average" value={`${quizzes.overallAverage ?? 0}%`} sub={`${quizzes.passRate ?? 0}% pass rate`} icon="🎯" color="text-indigo-600" />
        <StatCard label="Quizzes Taken"   value={quizzes.totalAttempts ?? 0}          sub="Total attempts"                           icon="📝" color="text-sky-600" />
        <StatCard label="Cards Mastered"  value={`${flashcards.masteryPercent ?? 0}%`} sub={`${flashcards.mastered}/${flashcards.total} cards`} icon="🃏" color="text-violet-600" />
        <StatCard label="Study Streak"    value={streak.currentStreak ?? 0}            sub={`${streak.label ?? "days"} in a row`}    icon="🔥" color="text-orange-500" />
      </div>

  
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-700 mb-1">Score Over Time</h2>
          <p className="text-xs text-slate-400 mb-5">Daily average — last {period} days</p>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={lineData} margin={{ top: 4, right: 16, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} interval={Math.floor(lineData.length / 6)} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
              <Tooltip content={<LineTooltip />} />
              <Line type="monotone" dataKey="averageScore" stroke={C.primary} strokeWidth={2.5} dot={(p) => p.payload.averageScore == null ? null : <circle key={p.cx} cx={p.cx} cy={p.cy} r={3} fill={C.primary} stroke="white" strokeWidth={2} />} activeDot={{ r: 6 }} connectNulls={false} name="Avg Score" />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 12 }} formatter={(v) => <span style={{ color: "#64748b" }}>{v}</span>} />
            </LineChart>
          </ResponsiveContainer>
        </div>

       
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-700 mb-1">Subject Mastery</h2>
          <p className="text-xs text-slate-400 mb-3">Average score per topic</p>
          {radarData.length === 0
            ? <div className="flex items-center justify-center h-40 text-xs text-slate-400 text-center px-4">Complete quizzes across subjects to see your radar.</div>
            : <ResponsiveContainer width="100%" height={220}>
                <RadarChart data={radarData} margin={{ top: 8, right: 24, left: 24, bottom: 8 }}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: "#64748b" }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9, fill: "#cbd5e1" }} axisLine={false} tickCount={4} />
                  <Radar dataKey="score" stroke={C.radar} fill={C.radar} fillOpacity={0.18} strokeWidth={2} />
                  <Tooltip formatter={(v, _, p) => [`${v}% (${p.payload.attempts} attempts)`, "Score"]} contentStyle={{ fontSize: 12, borderRadius: 12, border: "1px solid #e2e8f0" }} />
                </RadarChart>
              </ResponsiveContainer>
          }
        </div>
      </div>

      
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-700 mb-1">Performance by Difficulty</h2>
        <p className="text-xs text-slate-400 mb-5">How you score across Easy, Medium, Hard quizzes</p>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={difficultyData} margin={{ top: 4, right: 16, left: -16, bottom: 0 }} barSize={48}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="difficulty" tick={{ fontSize: 12, fill: "#64748b", fontWeight: 600 }} tickLine={false} axisLine={false} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
            <Tooltip formatter={(v) => [`${v}%`, "Avg Score"]} contentStyle={{ fontSize: 12, borderRadius: 10, border: "1px solid #e2e8f0" }} />
            <Bar dataKey="averageScore" radius={[8, 8, 0, 0]}>
              {difficultyData.map((e) => <Cell key={e.difficulty} fill={DIFF_COLORS[e.difficulty] ?? C.primary} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

    
      {(flashcards.dueNow ?? 0) > 0 && (
        <div className="bg-violet-50 border border-violet-200 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-violet-800">🃏 {flashcards.dueNow} flashcard{flashcards.dueNow !== 1 ? "s" : ""} due for review</p>
            <p className="text-xs text-violet-500 mt-0.5">Keep your streak — spend 5 minutes reviewing now.</p>
          </div>
          <a href="/flashcards" className="px-4 py-2 bg-violet-600 text-white text-sm font-semibold rounded-xl hover:bg-violet-700 transition-colors flex-shrink-0">Review Now</a>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, sub, icon, color }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</span>
        <span className="text-xl">{icon}</span>
      </div>
      <div className={`text-2xl font-black ${color}`}>{value}</div>
      <div className="text-xs text-slate-400 mt-1">{sub}</div>
    </div>
  );
}

function Skeleton() {
  const B = ({ cls }) => <div className={`bg-slate-200 rounded-xl animate-pulse ${cls}`} />;
  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <B cls="h-8 w-48" />
      <div className="grid grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <B key={i} cls="h-24" />)}</div>
      <div className="grid grid-cols-3 gap-6"><B cls="col-span-2 h-72" /><B cls="h-72" /></div>
      <B cls="h-48" />
    </div>
  );
}
