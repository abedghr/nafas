import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Table, type Column } from "../base-components/Table";
import { useCountries, useCountryMutations } from "../hooks/countries";
import type { Country, CountryInput } from "../services/countries";
import { t } from "../lib/i18n";

const BLANK: CountryInput = {
  code: "", name: "", currency: "", phoneCode: "", language: "ar", locale: "", timezone: "", isActive: true,
};

export function Countries() {
  const { data, isLoading } = useCountries({ page: 1, perPage: 50 });
  const { create, update, remove } = useCountryMutations();
  const [form, setForm] = useState<CountryInput | null>(null);

  const columns: Column<Country>[] = [
    { key: "code", header: t("countries.colCode"), render: (c) => <span className="font-mono">{c.code}</span> },
    { key: "name", header: t("countries.colName") },
    { key: "currency", header: t("countries.colCurrency") },
    { key: "timezone", header: t("countries.colTimezone"), render: (c) => <span className="text-sub">{c.timezone}</span> },
    {
      key: "isActive", header: t("countries.colActive"),
      render: (c) => (
        <button
          onClick={() => update.mutate({ id: c.id, data: { isActive: !c.isActive } })}
          className={`px-2 py-1 rounded-lg text-xs ${c.isActive ? "bg-primary/15 text-primary" : "bg-card-alt text-muted"}`}
        >
          {c.isActive ? t("common.active") : t("common.inactive")}
        </button>
      ),
    },
    {
      key: "actions", header: "",
      render: (c) => (
        <button onClick={() => confirm(t("common.deleteConfirm", { name: c.name })) && remove.mutate(c.id)} className="text-muted hover:text-accent">
          <Trash2 size={16} />
        </button>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{t("countries.title")}</h1>
          <p className="text-sub text-sm">{t("countries.sub")}</p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={() => setForm(form ? null : BLANK)}>
          <Plus size={18} /> {t("countries.add")}
        </button>
      </div>

      {form && (
        <div className="card p-5 mb-6 grid grid-cols-2 lg:grid-cols-4 gap-3">
          {([
            ["code", "Code (JO)"], ["name", "Name"], ["currency", "Currency (JOD)"], ["phoneCode", "Phone (+962)"],
            ["language", "Language (ar)"], ["locale", "Locale (ar-JO)"], ["timezone", "Timezone (Asia/Amman)"],
          ] as const).map(([k, ph]) => (
            <input key={k} className="input" placeholder={ph} value={(form as any)[k]}
              onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
          ))}
          <button className="btn-primary col-span-2 lg:col-span-1"
            onClick={() => create.mutate(form, { onSuccess: () => setForm(null) })}>
            {create.isPending ? t("common.saving") : t("common.save")}
          </button>
        </div>
      )}

      <Table columns={columns} rows={data?.data ?? []} loading={isLoading} empty={t("countries.empty")} />
    </div>
  );
}
