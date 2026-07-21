import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "";

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

function MailIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4" />
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853" />
      <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05" />
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335" />
    </svg>
  );
}

export default function LoginForm() {
  const { login, loginWithGoogle } = useAuth();
  const navigate   = useNavigate();
  const location   = useLocation();
  const redirectTo = location.state?.from?.pathname ?? "/dashboard";
  const googleBtnRef = useRef(null);

  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !window.google) return;
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleGoogleCallback,
      auto_select: false,
      cancel_on_tap_outside: true,
    });
    if (googleBtnRef.current) {
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: "filled_black",
        size: "large",
        shape: "pill",
        width: googleBtnRef.current.offsetWidth || 320,
        logo_alignment: "center",
      });
    }

  }, []);

  const handleGoogleCallback = async (response) => {
    setGoogleLoading(true);
    const result = await loginWithGoogle(response.credential);
    setGoogleLoading(false);
    if (result.success) navigate(redirectTo, { replace: true });
  };

  const validate = () => {
    const e = {};
    if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = "Enter a valid email address.";
    if (!form.password) e.password = "Password is required.";
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
    const result = await login(form);
    setSubmitting(false);
    if (result.success) navigate(redirectTo, { replace: true });
  };

  return (
    <div className="auth-bg min-h-screen flex flex-col items-center justify-center p-4">

      { }
      <div className="w-full max-w-[400px] animate-fadeInScale relative z-10">
        <div className="auth-card px-8 pt-8 pb-7">

          { }
          <div className="flex flex-col items-center mb-8">
            <p
              className="text-2xl font-semibold tracking-tight mb-1"
              style={{ fontFamily: "'Lora', serif", color: "var(--text-1)" }}
            >
              ScholarSync
            </p>
            <p className="text-sm" style={{ color: "var(--text-3)" }}>
              Sign in to continue
            </p>
          </div>

          { }
          <form onSubmit={handleSubmit} noValidate className="space-y-4">

            { }
            <div>
              <label
                className="block text-xs font-semibold mb-1.5 uppercase tracking-widest font-mono"
                style={{ color: "var(--text-3)" }}
              >
                Email
              </label>
              <div className="relative">
                <input
                  id="login-email"
                  type="email"
                  name="email"
                  placeholder="you@example.com"
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

            { }
            <div>
              <label
                className="block text-xs font-semibold mb-1.5 uppercase tracking-widest font-mono"
                style={{ color: "var(--text-3)" }}
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPass ? "text" : "password"}
                  name="password"
                  placeholder="Min. 8 characters"
                  value={form.password}
                  onChange={handleChange}
                  autoComplete="current-password"
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
            </div>

            { }
            <button
              id="login-submit"
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-xl btn-primary text-sm font-semibold flex items-center justify-center gap-2 mt-1"
            >
              {submitting ? (
                <>
                  <span className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: "#1a1814", borderTopColor: "transparent" }} />
                  Signing in…
                </>
              ) : (
                "Sign in →"
              )}
            </button>
          </form>

          { }
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px" style={{ background: "var(--rule)" }} />
            <span className="text-xs font-mono" style={{ color: "var(--text-3)" }}>or</span>
            <div className="flex-1 h-px" style={{ background: "var(--rule)" }} />
          </div>

          { }
          {GOOGLE_CLIENT_ID ? (
            <div className="w-full overflow-hidden rounded-xl" ref={googleBtnRef} />
          ) : (
            <button
              id="google-signin-btn"
              type="button"
              disabled={googleLoading}
              onClick={() => alert("Set VITE_GOOGLE_CLIENT_ID in your .env file to enable Google sign-in.")}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl text-sm font-medium transition-all"
              style={{
                background: "var(--surface-0)",
                border: "1px solid var(--rule-strong)",
                color: "var(--text-2)",
              }}
            >
              {googleLoading ? (
                <span className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: "var(--text-3)", borderTopColor: "transparent" }} />
              ) : <GoogleIcon />}
              {googleLoading ? "Signing in…" : "Continue with Google"}
            </button>
          )}

          { }
          <p className="text-center text-sm mt-5" style={{ color: "var(--text-3)" }}>
            No account?{" "}
            <Link
              to="/register"
              className="font-semibold transition-colors"
              style={{ color: "var(--amber)" }}
            >
              Create one
            </Link>
          </p>
        </div>

        { }
        <div className="watermark mt-4">
          <span>© {new Date().getFullYear()}</span>
          <span style={{ width: 2, height: 2, borderRadius: "50%", background: "var(--text-3)", display: "inline-block", opacity: 0.5 }} />
          <span className="watermark-name">ADHEESH NEGI</span>
        </div>
      </div>
    </div>
  );
}
