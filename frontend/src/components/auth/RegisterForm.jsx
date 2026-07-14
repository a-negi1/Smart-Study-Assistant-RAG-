import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";

function EyeIcon({ open }) {
  return open ? (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}

function strengthScore(pw) {
  let s = 0;
  if (pw.length >= 8)           s++;
  if (/[A-Z]/.test(pw))         s++;
  if (/\d/.test(pw))            s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return s;
}

const STRENGTH_LABELS = ["", "Weak", "Fair", "Good", "Strong"];
const STRENGTH_FILLS  = ["", "#b85c5c", "#c9873a", "#8faa6e", "#5c9a74"];
const STRENGTH_TEXT   = [
  "",
  "var(--red-text)",
  "var(--amber)",
  "#8faa6e",
  "var(--green-text)",
];

export default function RegisterForm() {
  const { register } = useAuth();
  const navigate     = useNavigate();

  const [form, setForm]         = useState({ name: "", email: "", password: "" });
  const [errors, setErrors]     = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const pwStrength = strengthScore(form.password);

  const validate = () => {
    const e = {};
    if (!form.name.trim() || form.name.length < 2) e.name     = "Name must be at least 2 characters.";
    if (!/^\S+@\S+\.\S+$/.test(form.email))        e.email    = "Enter a valid email address.";
    if (form.password.length < 8)                   e.password = "Password must be at least 8 characters.";
    else if (!/\d/.test(form.password))             e.password = "Password must contain at least one number.";
    return e;
  };

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setErrors((er) => ({ ...er, [e.target.name]: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length) { setErrors(validationErrors); return; }
    setSubmitting(true);
    const result = await register(form);
    setSubmitting(false);
    if (result.success) navigate("/dashboard");
  };

  return (
    <div className="auth-bg min-h-screen flex flex-col items-center justify-center p-4">

      {}
      <div className="w-full max-w-[420px] animate-fadeInScale relative z-10">
        <div className="auth-card px-8 pt-8 pb-7">

          {}
          <div className="flex flex-col items-center mb-8">
            <p
              className="text-2xl font-semibold tracking-tight mb-1"
              style={{ fontFamily: "'Lora', serif", color: "var(--text-1)" }}
            >
              Smart Study
            </p>
            <p className="text-sm" style={{ color: "var(--text-3)" }}>
              Create your account
            </p>
          </div>

          {}
          <form id="register-form" onSubmit={handleSubmit} noValidate className="space-y-4">

            {}
            <div>
              <label
                className="block text-xs font-semibold mb-1.5 uppercase tracking-widest font-mono"
                style={{ color: "var(--text-3)" }}
              >
                Full Name
              </label>
              <div className="relative">
                <input
                  id="reg-name"
                  type="text"
                  name="name"
                  placeholder="Jane Smith"
                  value={form.name}
                  onChange={handleChange}
                  autoComplete="name"
                  className={`auth-input pr-10 ${errors.name ? "error" : ""}`}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--text-3)" }}>
                  <UserIcon />
                </span>
              </div>
              {errors.name && (
                <p className="text-xs mt-1.5 flex items-center gap-1" style={{ color: "var(--red-text)" }}>
                  <span>⚠</span> {errors.name}
                </p>
              )}
            </div>

            {}
            <div>
              <label
                className="block text-xs font-semibold mb-1.5 uppercase tracking-widest font-mono"
                style={{ color: "var(--text-3)" }}
              >
                Email
              </label>
              <div className="relative">
                <input
                  id="reg-email"
                  type="email"
                  name="email"
                  placeholder="jane@university.edu"
                  value={form.email}
                  onChange={handleChange}
                  autoComplete="email"
                  className={`auth-input pr-10 ${errors.email ? "error" : ""}`}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--text-3)" }}>
                  <MailIcon />
                </span>
              </div>
              {errors.email && (
                <p className="text-xs mt-1.5 flex items-center gap-1" style={{ color: "var(--red-text)" }}>
                  <span>⚠</span> {errors.email}
                </p>
              )}
            </div>

            {}
            <div>
              <label
                className="block text-xs font-semibold mb-1.5 uppercase tracking-widest font-mono"
                style={{ color: "var(--text-3)" }}
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="reg-password"
                  type={showPass ? "text" : "password"}
                  name="password"
                  placeholder="Min. 8 characters with a number"
                  value={form.password}
                  onChange={handleChange}
                  autoComplete="new-password"
                  className={`auth-input pr-10 ${errors.password ? "error" : ""}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: "var(--text-3)" }}
                  tabIndex={-1}
                  aria-label={showPass ? "Hide password" : "Show password"}
                >
                  <EyeIcon open={showPass} />
                </button>
              </div>
              {errors.password && (
                <p className="text-xs mt-1.5 flex items-center gap-1" style={{ color: "var(--red-text)" }}>
                  <span>⚠</span> {errors.password}
                </p>
              )}

              {}
              {form.password.length > 0 && (
                <div className="mt-2.5">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((n) => (
                      <div
                        key={n}
                        className="h-0.5 flex-1 rounded-full transition-all duration-300"
                        style={{
                          background: n <= pwStrength
                            ? STRENGTH_FILLS[pwStrength]
                            : "var(--rule-strong)",
                        }}
                      />
                    ))}
                  </div>
                  <p className="text-xs mt-1 font-mono font-medium" style={{ color: STRENGTH_TEXT[pwStrength] }}>
                    {STRENGTH_LABELS[pwStrength]}
                  </p>
                </div>
              )}
            </div>

            {}
            <button
              id="register-submit"
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-xl btn-primary text-sm font-semibold flex items-center justify-center gap-2 mt-1"
            >
              {submitting ? (
                <>
                  <span className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: "#1a1814", borderTopColor: "transparent" }} />
                  Creating account…
                </>
              ) : (
                "Create Account →"
              )}
            </button>
          </form>

          {}
          <p className="text-center text-sm mt-5" style={{ color: "var(--text-3)" }}>
            Already have an account?{" "}
            <Link
              to="/login"
              className="font-semibold transition-colors"
              style={{ color: "var(--amber)" }}
            >
              Sign in
            </Link>
          </p>
        </div>

        {}
        <div className="watermark mt-4">
          <span>© {new Date().getFullYear()}</span>
          <span style={{ width: 2, height: 2, borderRadius: "50%", background: "var(--text-3)", display: "inline-block", opacity: 0.5 }} />
          <span className="watermark-name">ADHEESH NEGI</span>
        </div>
      </div>
    </div>
  );
}
