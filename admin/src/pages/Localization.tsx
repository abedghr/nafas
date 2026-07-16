import { useState } from "react";
import { useAllLabels, useUpsertLabel } from "../hooks/labels";
import { t } from "../lib/i18n";

const GROUPS = [
  { key: "measurement_type", label: "l10n.grpMeasurement" },
  { key: "set_type", label: "l10n.grpSet" },
  { key: "body_target", label: "l10n.grpBody" },
  { key: "meal_type", label: "l10n.grpMeal" },
];
const LOCALES = ["en", "ar"]; // extend as languages are added

export function Localization() {
  const [grp, setGrp] = useState("body_target");
  const { data, isLoading } = useAllLabels();
  const upsert = useUpsertLabel();
  const [draft, setDraft] = useState<Record<string, string>>({}); // `${key}:${locale}` → value

  const keys = data?.[grp] ? Object.keys(data[grp]).sort() : [];
  const val = (key: string, loc: string) => draft[`${key}:${loc}`] ?? data?.[grp]?.[key]?.[loc] ?? "";

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">{t("l10n.title")}</h1>
      <p className="text-sub text-sm mb-6">{t("l10n.sub")}</p>

      <div className="flex gap-2 mb-5">
        {GROUPS.map((g) => (
          <button key={g.key} onClick={() => setGrp(g.key)}
            className={`px-3 py-1.5 rounded-lg text-sm ${grp === g.key ? "bg-primary/15 text-primary" : "bg-card text-sub hover:text-white"}`}>
            {t(g.label)}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted border-b border-line">
              <th className="px-4 py-3 font-medium w-48">{t("l10n.colKey")}</th>
              {LOCALES.map((l) => <th key={l} className="px-4 py-3 font-medium">{l.toUpperCase()}</th>)}
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-muted">{t("common.loading")}</td></tr>
            ) : keys.map((key) => {
              const dirty = LOCALES.some((l) => draft[`${key}:${l}`] !== undefined);
              return (
                <tr key={key} className="border-b border-line/50">
                  <td className="px-4 py-2 font-mono text-xs text-sub">{key}</td>
                  {LOCALES.map((l) => (
                    <td key={l} className="px-4 py-2">
                      <input
                        className="input w-full" dir={l === "ar" ? "rtl" : "ltr"}
                        value={val(key, l)}
                        onChange={(e) => setDraft({ ...draft, [`${key}:${l}`]: e.target.value })}
                      />
                    </td>
                  ))}
                  <td className="px-4 py-2">
                    <button
                      disabled={!dirty || upsert.isPending}
                      onClick={async () => {
                        for (const l of LOCALES) {
                          const v = draft[`${key}:${l}`];
                          if (v !== undefined) await upsert.mutateAsync({ grp, key, locale: l, value: v });
                        }
                        setDraft((d) => { const n = { ...d }; LOCALES.forEach((l) => delete n[`${key}:${l}`]); return n; });
                      }}
                      className="btn-primary text-xs px-3 py-1.5 disabled:opacity-40">{t("common.save")}</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
