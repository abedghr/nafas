import { useState } from "react";
import { Plus, Trash2, Pencil, X } from "lucide-react";
import { Table, type Column } from "../base-components/Table";
import { useFoods, useFoodMutations } from "../hooks/foods";
import { MEAL_TYPES, type Food, type FoodInput, type MealType } from "../services/foods";
import { t } from "../lib/i18n";

const blank = (): FoodInput => ({ name: "", protein: 0, carbs: 0, fat: 0, calories: 0, mealTypes: [], translations: { ar: {} } });
const MACROS = [["protein", "foods.protein"], ["carbs", "foods.carbs"], ["fat", "foods.fat"], ["calories", "foods.calories"]] as const;
const mealLabel = (mt: MealType) => t(`mealtag.${mt}`);

function FoodModal({ initial, editingId, onClose }: { initial: FoodInput; editingId?: string; onClose: () => void }) {
  const { create, update } = useFoodMutations();
  const [f, setF] = useState<FoodInput>(initial);
  const [err, setErr] = useState("");
  const ar = f.translations?.ar ?? {};

  const save = () => {
    setErr("");
    if (!f.name.trim()) return setErr(t("common.nameRequiredEn"));
    const opts = { onSuccess: onClose, onError: (e: any) => setErr(e.response?.data?.message || e.message) };
    if (editingId) update.mutate({ id: editingId, data: f }, opts);
    else create.mutate(f, opts);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 grid place-items-start justify-center overflow-y-auto py-10" onClick={onClose}>
      <div className="card w-[560px] max-w-[92vw] p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">{editingId ? t("foods.edit") : t("foods.new")}</h3>
          <button onClick={onClose} className="text-muted hover:text-white"><X size={20} /></button>
        </div>
        <div className="grid lg:grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-primary font-medium mb-1">{t("foods.englishDefault")}</div>
            <input className="input" placeholder={t("foods.namePh")} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          </div>
          <div dir="rtl">
            <div className="text-xs text-sub font-medium mb-1" dir="ltr">{t("foods.arabicOpt")}</div>
            <input className="input text-right" placeholder={t("foods.arNamePh")} value={ar.name ?? ""} onChange={(e) => setF({ ...f, translations: { ...f.translations, ar: { name: e.target.value } } })} />
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {MACROS.map(([k, label]) => (
            <div key={k}>
              <div className="text-sub text-xs mb-1">{t(label)}</div>
              <input className="input w-full" type="number" value={(f as any)[k]} onChange={(e) => setF({ ...f, [k]: Number(e.target.value) })} />
            </div>
          ))}
        </div>
        <div>
          <div className="text-sub text-xs mb-2">{t("foods.mealTypes")} <span className="text-muted">{t("foods.mealTypesHint")}</span></div>
          <div className="flex flex-wrap gap-2">
            {MEAL_TYPES.map((mt) => {
              const on = f.mealTypes.includes(mt);
              return (
                <button
                  key={mt}
                  type="button"
                  onClick={() => setF({ ...f, mealTypes: on ? f.mealTypes.filter((x) => x !== mt) : [...f.mealTypes, mt] })}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${on ? "bg-primary text-white border-primary" : "border-line text-sub hover:border-primary"}`}
                >
                  {mealLabel(mt)}
                </button>
              );
            })}
          </div>
        </div>
        {err && <p className="text-accent text-sm">{err}</p>}
        <div className="flex gap-2">
          <button className="btn-primary disabled:opacity-50" onClick={save} disabled={create.isPending || update.isPending}>
            {create.isPending || update.isPending ? t("common.saving") : t("foods.save")}
          </button>
          <button className="px-4 py-2.5 rounded-xl border border-line text-sub" onClick={onClose}>{t("common.cancel")}</button>
        </div>
      </div>
    </div>
  );
}

export function Foods() {
  const [search, setSearch] = useState("");
  const { data, isLoading } = useFoods(search);
  const { remove } = useFoodMutations();
  const [modal, setModal] = useState<{ initial: FoodInput; id?: string } | null>(null);

  const openEdit = (f: Food) =>
    setModal({ id: f.id, initial: { name: f.name, protein: f.protein, carbs: f.carbs, fat: f.fat, calories: f.calories, mealTypes: f.mealTypes ?? [], translations: { ar: f.translations?.ar ?? {} } } });

  const columns: Column<Food>[] = [
    { key: "name", header: t("foods.colFood"), render: (f) => <span className="font-medium">{f.name}</span> },
    { key: "macros", header: t("foods.colMacros"), render: (f) => <span className="text-sub text-xs">P {f.protein} · C {f.carbs} · F {f.fat}</span> },
    { key: "calories", header: t("foods.colCalories"), render: (f) => <span className="text-sub">{f.calories} kcal</span> },
    {
      key: "mealTypes", header: t("foods.colMealTypes"),
      render: (f) => (
        <div className="flex flex-wrap gap-1">
          {(f.mealTypes ?? []).map((mt) => (
            <span key={mt} className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-medium">{mealLabel(mt)}</span>
          ))}
        </div>
      ),
    },
    {
      key: "actions", header: "",
      render: (f) => (
        <div className="flex gap-3">
          <button onClick={() => openEdit(f)} className="text-muted hover:text-primary"><Pencil size={16} /></button>
          <button onClick={() => confirm(t("common.deleteConfirm", { name: f.name })) && remove.mutate(f.id)} className="text-muted hover:text-accent"><Trash2 size={16} /></button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{t("foods.title")}</h1>
          <p className="text-sub text-sm">{t("foods.sub", { count: data?.length ?? 0 })}</p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={() => setModal({ initial: blank() })}><Plus size={18} /> {t("foods.add")}</button>
      </div>
      <input className="input max-w-sm mb-4" placeholder={t("foods.searchPh")} value={search} onChange={(e) => setSearch(e.target.value)} />
      <Table columns={columns} rows={data ?? []} loading={isLoading} empty={t("foods.empty")} />
      {modal && <FoodModal initial={modal.initial} editingId={modal.id} onClose={() => setModal(null)} />}
    </div>
  );
}
