
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function DashboardPage() {
  const { user } = useAuth();
  const hour     = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const cards = [
    {
      to: "/quiz",
      icon: "📝",
      label: "Generate Quiz",
      desc: "Test your knowledge with AI-generated MCQs.",
      color: "bg-indigo-50 border-indigo-200",
    },
    {
      to: "/flashcards",
      icon: "🃏",
      label: "Study Flashcards",
      desc: "Review your decks with spaced repetition.",
      color: "bg-violet-50 border-violet-200",
    },
    {
      to: "/notebook",
      icon: "🤖",
      label: "LM Notebook",
      desc: "Chat with AI about your uploaded documents.",
      color: "bg-sky-50 border-sky-200",
    },
    {
      to: "/documents",
      icon: "📁",
      label: "My Documents",
      desc: "Upload PDFs and text files to power your study tools.",
      color: "bg-emerald-50 border-emerald-200",
    },
    {
      to: "/analytics",
      icon: "📊",
      label: "View Progress",
      desc: "Track your scores and subject mastery over time.",
      color: "bg-amber-50 border-amber-200",
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">
          {greeting}, {user?.name?.split(" ")[0]}! 👋
        </h1>
        <p className="text-slate-500 text-sm mt-1">Ready to study smarter today?</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {cards.map(({ to, icon, label, desc, color }) => (
          <Link
            key={to}
            to={to}
            className={`rounded-2xl border p-6 hover:shadow-md transition-all group ${color}`}
          >
            <span className="text-3xl mb-4 block">{icon}</span>
            <h2 className="text-base font-bold text-slate-800 mb-1 group-hover:text-indigo-600 transition-colors">
              {label}
            </h2>
            <p className="text-sm text-slate-500">{desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
