import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";

function IconNotebooks() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  );
}

function IconAnalytics() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
}

function IconProfile() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

function IconLogout() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  );
}

function IconMenu() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

const NAV_ITEMS = [
  { to: "/dashboard", Icon: IconNotebooks, label: "My Notebooks" },
  { to: "/analytics", Icon: IconAnalytics,  label: "Analytics"    },
  { to: "/profile",   Icon: IconProfile,    label: "Profile"      },
];

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate         = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--ink)" }}>
      {}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 lg:hidden"
          style={{ background: "rgba(17,15,13,0.72)" }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-30
          w-60 flex flex-col sidebar-panel
          transform transition-transform duration-250 ease-in-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        {}
        <div
          className="flex items-center gap-3 px-5 py-5"
          style={{ borderBottom: "1px solid var(--rule)" }}
        >
          {}
          <div>
            <p
              className="font-semibold text-sm leading-none tracking-tight"
              style={{ fontFamily: "'Lora', serif", color: "var(--text-1)" }}
            >
              ScholarSync
            </p>
            <p
              className="text-xs mt-0.5 font-mono"
              style={{ color: "var(--text-3)", letterSpacing: "0.04em" }}
            >
              source synthesis
            </p>
          </div>
        </div>

        {}
        <div className="px-4 pt-5 pb-2">
          <p
            className="text-xs font-semibold uppercase tracking-widest font-mono"
            style={{ color: "var(--text-3)" }}
          >
            Navigate
          </p>
        </div>

        {}
        <nav className="flex-1 px-2 pb-4 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(({ to, Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `source-item flex items-center gap-3 py-2.5 pr-3 rounded-r-lg text-sm font-medium transition-all ${
                  isActive ? "active" : ""
                }`
              }
              style={({ isActive }) => ({
                color: isActive ? "var(--amber)" : "var(--text-2)",
              })}
            >
              <Icon />
              {label}
            </NavLink>
          ))}
        </nav>

        {}
        <div className="px-3 pb-4" style={{ borderTop: "1px solid var(--rule)" }}>
          <div
            className="flex items-center gap-3 px-3 py-2.5 mt-3 rounded-lg"
            style={{ background: "var(--surface-1)", border: "1px solid var(--rule)" }}
          >
            {}
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: "var(--surface-2)", border: "1px solid var(--rule-strong)" }}
            >
              {user?.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-full h-full rounded-lg object-cover" />
              ) : (
                <span
                  className="text-xs font-bold font-mono"
                  style={{ color: "var(--amber)" }}
                >
                  {initials}
                </span>
              )}
            </div>
            {}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate" style={{ color: "var(--text-1)" }}>{user?.name}</p>
              <p className="text-xs truncate font-mono" style={{ color: "var(--text-3)", fontSize: "10px" }}>{user?.email}</p>
            </div>
            {}
            <button
              onClick={handleLogout}
              title="Sign out"
              className="p-1.5 rounded-md transition-all flex-shrink-0"
              style={{ color: "var(--text-3)" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "var(--red-text)";
                e.currentTarget.style.background = "var(--red-dim)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--text-3)";
                e.currentTarget.style.background = "transparent";
              }}
            >
              <IconLogout />
            </button>
          </div>

          {}
          <div className="watermark mt-3">
            <span className="watermark-name">ADHEESH NEGI</span>
            <span style={{ width: 2, height: 2, borderRadius: "50%", background: "var(--text-3)", display: "inline-block", opacity: 0.5 }} />
            <span>© {new Date().getFullYear()}</span>
          </div>
        </div>
      </aside>

      {}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {}
        <header
          className="lg:hidden flex items-center justify-between px-4 py-3"
          style={{
            background: "var(--surface-0)",
            borderBottom: "1px solid var(--rule)",
          }}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg transition-all"
            style={{ color: "var(--text-2)", border: "1px solid var(--rule)" }}
            aria-label="Open navigation"
          >
            <IconMenu />
          </button>

          <p
            className="font-semibold text-sm"
            style={{ fontFamily: "'Lora', serif", color: "var(--text-1)" }}
          >
            Smart Study
          </p>

          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "var(--surface-2)", border: "1px solid var(--rule-strong)" }}
          >
            <span className="text-xs font-bold font-mono" style={{ color: "var(--amber)" }}>{initials}</span>
          </div>
        </header>

        <main className="flex-1 flex flex-col overflow-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
