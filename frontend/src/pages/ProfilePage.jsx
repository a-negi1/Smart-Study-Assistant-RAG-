
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
    <div className="flex-1 overflow-y-auto p-6 max-w-lg">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Profile Settings</h1>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
        
        <div className="flex items-center gap-4 pb-5 border-b border-slate-100">
          <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-md shadow-indigo-200">
            <span className="text-xl font-bold text-white">{initials}</span>
          </div>
          <div>
            <p className="font-bold text-slate-800">{user?.name}</p>
            <p className="text-sm text-slate-400">{user?.email}</p>
            <span className="inline-block text-xs bg-indigo-50 text-indigo-600 font-semibold px-2 py-0.5 rounded-full mt-1 capitalize">
              {user?.role}
            </span>
          </div>
        </div>

        
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name</label>
          <input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
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
            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
          />
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 active:scale-[0.98] transition-all disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
