import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { LogOut, Menu, X } from "lucide-react";
import { NAV } from "./nav";
import { TopBar } from "../../components/TopBar";
import { useAuth } from "../../lib/auth";
import { t } from "../../lib/i18n";

export function SideMenuLayout() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false); // mobile drawer

  const sidebar = (
    <aside className="w-64 shrink-0 bg-surface border-r border-line flex flex-col h-full">
      <div className="h-16 flex items-center justify-between px-6 border-b border-line">
        <div><span className="text-primary text-2xl font-extrabold">Nafas</span><span className="mx-2 text-xs text-muted">{t("shell.admin")}</span></div>
        <button className="lg:hidden text-sub" onClick={() => setOpen(false)}><X size={20} /></button>
      </div>
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {NAV.map(({ to, label, icon: Icon, ready, phase }) => (
          <NavLink key={to} to={to} end={to === "/app"} onClick={() => setOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition ${
                isActive ? "bg-primary/15 text-primary" : ready ? "text-sub hover:text-white hover:bg-card" : "text-muted hover:bg-card/50"
              }`}>
            <Icon size={18} /><span className="flex-1">{t(label)}</span>
            {!ready && <span className="text-[10px] text-muted">{phase}</span>}
          </NavLink>
        ))}
      </nav>
      <button onClick={() => { logout(); navigate("/login"); }}
        className="m-3 flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-sub hover:text-white hover:bg-card transition">
        <LogOut size={18} /> {t("shell.logout")}
      </button>
    </aside>
  );

  return (
    <div className="flex h-screen bg-bg text-white overflow-hidden">
      {/* desktop sidebar */}
      <div className="hidden lg:flex">{sidebar}</div>

      {/* mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0">{sidebar}</div>
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <TopBar onMenu={() => setOpen(true)} />
        <main className="flex-1 overflow-y-auto p-5 sm:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
