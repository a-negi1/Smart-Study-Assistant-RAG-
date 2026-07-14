import { useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext.jsx";
import { authAPI } from "../api/services.js";

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({
    name: user?.name ?? "",
    studyGoalMinutesPerDay: user?.studyGoalMinutesPerDay ?? 30,
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { user: updated } = await authAPI.updateProfile(form);
      updateUser(updated);
      toast.success("Profile updated!");
    } catch {
      toast.error("Failed to save profile.");
    } finally {
      setSaving(false);
    }
  };

  const initials = user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-lg" style={{ background: "var(--surface-1)" }}>
      {}
      <div className="mb-6 animate-fadeUp">
        <h1
          className="text-xl font-semibold"
          style={{ color: "var(--text-1)", fontFamily: "'Lora', serif" }}
        >
          Profile
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-3)" }}>
          Manage your account and study preferences.
        </p>
      </div>

      <div
        className="rounded-xl p-5 space-y-5 animate-fadeUp"
        style={{
          background: "var(--surface-0)",
          border: "1px solid var(--rule)",
          boxShadow: "var(--shadow-sm)",
          animationDelay: "0.05s",
        }}
      >
        {}
        <div
          className="flex items-center gap-4 pb-5"
          style={{ borderBottom: "1px solid var(--rule)" }}
        >
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: "var(--surface-2)",
              border: "1px solid var(--rule-strong)",
            }}
          >
            <span
              className="text-sm font-bold font-mono"
              style={{ color: "var(--amber)" }}
            >
              {initials}
            </span>
          </div>
          <div>
            <p className="font-semibold text-sm" style={{ color: "var(--text-1)" }}>{user?.name}</p>
            <p className="text-xs font-mono mt-0.5" style={{ color: "var(--text-3)", fontSize: "10px" }}>{user?.email}</p>
            <span
              className="inline-block text-xs font-mono font-semibold px-2 py-0.5 rounded mt-1 capitalize"
              style={{
                background: "var(--amber-dim)",
                border: "1px solid rgba(201,135,58,0.22)",
                color: "var(--amber)",
              }}
            >
              {user?.role}
            </span>
          </div>
        </div>

        {}
        <div>
          <label
            className="block text-xs font-semibold mb-1.5 uppercase tracking-wider font-mono"
            style={{ color: "var(--text-3)" }}
          >
            Full Name
          </label>
          <input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="w-full px-4 py-2.5 rounded-lg text-sm glass-input"
            style={{ color: "var(--text-1)" }}
          />
        </div>

        {}
        <div>
          <label
            className="block text-xs font-semibold mb-1.5 uppercase tracking-wider font-mono"
            style={{ color: "var(--text-3)" }}
          >
            Daily Study Goal (minutes)
          </label>
          <input
            type="number"
            min={5}
            max={480}
            value={form.studyGoalMinutesPerDay}
            onChange={(e) =>
              setForm((f) => ({ ...f, studyGoalMinutesPerDay: parseInt(e.target.value, 10) || 5 }))
            }
            className="w-full px-4 py-2.5 rounded-lg text-sm glass-input"
            style={{ color: "var(--text-1)" }}
          />
          <p className="text-xs mt-1.5 font-mono" style={{ color: "var(--text-3)", fontSize: "10px" }}>
            Recommended: 30–60 minutes per session
          </p>
        </div>

        {}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3 rounded-xl btn-glow text-sm font-semibold flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Saving…
            </>
          ) : (
            "Save Changes"
          )}
        </button>
      </div>
    </div>
  );
}
