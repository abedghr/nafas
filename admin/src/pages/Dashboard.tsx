import { Users, Globe, Dumbbell, Apple } from "lucide-react";
import { t } from "../lib/i18n";

const STATS = [
  { label: "nav.users", value: "—", icon: Users, phase: "F1" },
  { label: "nav.countries", value: "—", icon: Globe, phase: "F2" },
  { label: "nav.exercises", value: "—", icon: Dumbbell, phase: "F3" },
  { label: "nav.foods", value: "—", icon: Apple, phase: "F4" },
];

export function Dashboard() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">{t("dash.title")}</h1>
      <p className="text-sub text-sm mb-8">{t("dash.sub")}</p>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STATS.map(({ label, value, icon: Icon, phase }) => (
          <div key={label} className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary grid place-items-center">
                <Icon size={20} />
              </div>
              <span className="text-[10px] text-muted">{phase}</span>
            </div>
            <div className="text-2xl font-bold">{value}</div>
            <div className="text-sub text-sm">{t(label)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
