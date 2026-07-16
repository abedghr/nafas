import { Search, Bell, ChevronDown, Menu } from "lucide-react";
import { getLang, setLang } from "../lib/axios";
import { t, applyDir } from "../lib/i18n";

export function TopBar({ onMenu }: { onMenu?: () => void }) {
  const lang = getLang();
  const switchLang = (l: string) => {
    if (l === lang) return;
    setLang(l);
    applyDir(l);     // flip direction immediately
    location.reload(); // re-run queries + re-render UI in the new language
  };

  return (
    <header className="h-16 border-b border-line bg-surface/60 backdrop-blur flex items-center gap-3 px-4 sm:px-6 sticky top-0 z-10">
      <button className="lg:hidden text-sub" onClick={onMenu}><Menu size={22} /></button>
      <div className="flex items-center gap-2 flex-1 min-w-0 max-w-md">
        <Search size={18} className="text-muted shrink-0" />
        <input placeholder={t("shell.searchPh")} className="bg-transparent outline-none text-sm flex-1 min-w-0 placeholder-muted" />
      </div>

      {/* Language switcher (drives the x-lang header) */}
      <div className="flex items-center rounded-lg border border-line overflow-hidden text-xs">
        {["en", "ar"].map((l) => (
          <button key={l} onClick={() => switchLang(l)}
            className={`px-2.5 py-1 ${lang === l ? "bg-primary/20 text-primary" : "text-sub hover:text-white"}`}>
            {l.toUpperCase()}
          </button>
        ))}
      </div>

      <button className="text-sub hover:text-white transition"><Bell size={18} /></button>
      <div className="flex items-center gap-2 pl-3 border-l border-line">
        <div className="w-8 h-8 rounded-full bg-primary/20 text-primary grid place-items-center text-sm font-semibold">A</div>
        <span className="text-sm text-sub">{t("shell.adminUser")}</span>
        <ChevronDown size={16} className="text-muted" />
      </div>
    </header>
  );
}
