import { useState, useEffect } from "react";
import { Plus, Trash2, Pencil, X } from "lucide-react";
import { Table, type Column } from "../base-components/Table";
import { useExercises, useExerciseMeta, useExerciseMutations } from "../hooks/exercises";
import { useAllLabels } from "../hooks/labels";
import { labelOf } from "../services/labels";
import { getExercise, type Exercise, type ExerciseInput, type BodyTarget } from "../services/exercises";
import { getLang } from "../lib/axios";
import { t } from "../lib/i18n";

const MEASUREMENTS = ["reps", "time_hold", "distance_duration"] as const;
const blank = (): ExerciseInput => ({ name: "", description: "", measurementType: "reps", bodyTargets: [], workoutTypeIds: [], translations: { ar: {} } });

function ExerciseModal({ initial, editingId, initialTypeNames, onClose }: { initial: ExerciseInput; editingId?: string; initialTypeNames?: string[]; onClose: () => void }) {
  const { data: meta } = useExerciseMeta();
  const { data: labels } = useAllLabels();
  const { create, update } = useExerciseMutations();
  const [f, setF] = useState<ExerciseInput>(initial);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (editingId && meta && initialTypeNames?.length && f.workoutTypeIds.length === 0) {
      const ids = meta.workoutTypes.filter((t) => initialTypeNames.includes(t.name)).map((t) => t.id);
      if (ids.length) setF((p) => ({ ...p, workoutTypeIds: ids }));
    }
  }, [meta]); // eslint-disable-line

  const ar = f.translations?.ar ?? {};
  const setAr = (patch: Partial<{ name: string; description: string }>) =>
    setF({ ...f, translations: { ...f.translations, ar: { ...ar, ...patch } } });

  const targetTotal = f.bodyTargets.reduce((s, t) => s + (t.percentage || 0), 0);
  const targetsValid = f.bodyTargets.length === 0 || targetTotal === 100;
  const setTarget = (i: number, patch: Partial<BodyTarget>) =>
    setF({ ...f, bodyTargets: f.bodyTargets.map((t, idx) => (idx === i ? { ...t, ...patch } : t)) });

  const save = () => {
    setErr("");
    if (!f.name.trim()) return setErr(t("common.nameRequiredEn"));
    if (f.bodyTargets.length && targetTotal !== 100) return setErr(t("ex.sumError", { total: targetTotal }));
    const opts = { onSuccess: onClose, onError: (e: any) => setErr(e.response?.data?.message || e.message) };
    if (editingId) update.mutate({ id: editingId, data: f }, opts);
    else create.mutate(f, opts);
  };

  const bt = (key: string) => labelOf(labels, "body_target", key, "en");

  return (
    <div className="fixed inset-0 z-50 bg-black/60 grid place-items-start justify-center overflow-y-auto py-10" onClick={onClose}>
      <div className="card w-[720px] max-w-[92vw] p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">{editingId ? t("ex.edit") : t("ex.new")}</h3>
          <button onClick={onClose} className="text-muted hover:text-white"><X size={20} /></button>
        </div>

        {/* English (default) + Arabic, side by side */}
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="text-xs text-primary font-medium">{t("ex.englishDefault")}</div>
            <input className="input" placeholder={t("ex.namePh")} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
            <textarea className="input w-full resize-y leading-relaxed" rows={4} placeholder={t("ex.descPh")} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
          </div>
          <div className="space-y-2" dir="rtl">
            <div className="text-xs text-sub font-medium" dir="ltr">{t("ex.arabicOpt")}</div>
            <input className="input text-right" placeholder="الاسم" value={ar.name ?? ""} onChange={(e) => setAr({ name: e.target.value })} />
            <textarea className="input w-full resize-y leading-relaxed text-right" rows={4} placeholder="الوصف" value={ar.description ?? ""} onChange={(e) => setAr({ description: e.target.value })} />
          </div>
        </div>

        <div className="grid lg:grid-cols-4 gap-3 items-end">
          <div className="lg:col-span-1">
            <div className="text-sub text-xs mb-1">{t("ex.measurement")}</div>
            <select className="input w-full" value={f.measurementType} onChange={(e) => setF({ ...f, measurementType: e.target.value as any })}>
              {MEASUREMENTS.map((m) => <option key={m} value={m}>{labelOf(labels, "measurement_type", m, getLang())}</option>)}
            </select>
          </div>
        </div>

        <div>
          <div className="text-sub text-xs mb-2">{t("ex.workoutTypes")}</div>
          <div className="flex flex-wrap gap-2">
            {meta?.workoutTypes.map((t) => {
              const on = f.workoutTypeIds.includes(t.id);
              return (
                <button key={t.id} onClick={() => setF({ ...f, workoutTypeIds: on ? f.workoutTypeIds.filter((x) => x !== t.id) : [...f.workoutTypeIds, t.id] })}
                  className={`px-2.5 py-1 rounded-lg text-xs border ${on ? "bg-primary/15 text-primary border-primary/40" : "bg-card-alt text-sub border-line"}`}>{t.name}</button>
              );
            })}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="text-sub text-xs">{t("ex.muscleTargets")} · <span className={targetsValid ? "text-primary" : "text-accent"}>{targetTotal}%</span>{!targetsValid && <span className="text-accent">{t("ex.mustEqual")}</span>}</div>
            <button onClick={() => setF({ ...f, bodyTargets: [...f.bodyTargets, { bodyTarget: meta?.bodyTargets[0] ?? "chest", percentage: 0 }] })} className="text-primary text-xs flex items-center gap-1"><Plus size={14} /> {t("ex.addTarget")}</button>
          </div>
          <div className="space-y-2">
            {f.bodyTargets.map((t, i) => (
              <div key={i} className="flex gap-2 items-center">
                <select className="input flex-1" value={t.bodyTarget} onChange={(e) => setTarget(i, { bodyTarget: e.target.value })}>
                  {meta?.bodyTargets.map((b) => <option key={b} value={b}>{bt(b)}</option>)}
                </select>
                <input className="input w-24" type="number" value={t.percentage} onChange={(e) => setTarget(i, { percentage: Number(e.target.value) })} placeholder="%" />
                <button onClick={() => setF({ ...f, bodyTargets: f.bodyTargets.filter((_, idx) => idx !== i) })} className="text-muted hover:text-accent"><Trash2 size={16} /></button>
              </div>
            ))}
          </div>
        </div>

        {err && <p className="text-accent text-sm">{err}</p>}
        <div className="flex gap-2">
          <button className="btn-primary disabled:opacity-50" onClick={save} disabled={!targetsValid || create.isPending || update.isPending}>
            {create.isPending || update.isPending ? t("common.saving") : t("ex.save")}
          </button>
          <button className="px-4 py-2.5 rounded-xl border border-line text-sub" onClick={onClose}>{t("common.cancel")}</button>
        </div>
      </div>
    </div>
  );
}

export function Exercises() {
  const [search, setSearch] = useState("");
  const { data, isLoading } = useExercises(search);
  const { data: labels } = useAllLabels();
  const { remove } = useExerciseMutations();
  const [modal, setModal] = useState<{ initial: ExerciseInput; id?: string; typeNames?: string[] } | null>(null);
  const lang = getLang();

  const openEdit = async (e: Exercise) => {
    const full = await getExercise(e.id); // includes translations
    setModal({
      id: e.id, typeNames: e.workoutTypes,
      initial: {
        name: full.name, description: full.description, measurementType: full.measurementType,
        bodyTargets: full.bodyTargets, workoutTypeIds: [],
        translations: { ar: full.translations?.ar ?? {} },
      },
    });
  };

  const columns: Column<Exercise>[] = [
    { key: "name", header: t("ex.colExercise"), render: (e) => (<div><div className="font-medium">{e.name}</div><div className="text-muted text-xs">{e.workoutTypes.join(" · ") || "—"}</div></div>) },
    { key: "measurementType", header: t("ex.colMeasure"), render: (e) => <span className="text-sub text-xs">{labelOf(labels, "measurement_type", e.measurementType, lang)}</span> },
    { key: "bodyTargets", header: t("ex.colTargets"), render: (e) => (<div className="flex flex-wrap gap-1 max-w-md">{e.bodyTargets.map((t) => <span key={t.bodyTarget} className="px-1.5 py-0.5 rounded bg-card-alt text-[11px] text-sub">{labelOf(labels, "body_target", t.bodyTarget, lang)} {t.percentage}%</span>)}</div>) },
    {
      key: "actions", header: "",
      render: (e) => (
        <div className="flex gap-3">
          <button onClick={() => openEdit(e)} className="text-muted hover:text-primary"><Pencil size={16} /></button>
          <button onClick={() => confirm(t("common.deleteConfirm", { name: e.name })) && remove.mutate(e.id)} className="text-muted hover:text-accent"><Trash2 size={16} /></button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{t("ex.title")}</h1>
          <p className="text-sub text-sm">{t("ex.sub", { count: data?.length ?? 0 })}</p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={() => setModal({ initial: blank() })}><Plus size={18} /> {t("ex.add")}</button>
      </div>
      <input className="input max-w-sm mb-4" placeholder={t("ex.searchPh")} value={search} onChange={(e) => setSearch(e.target.value)} />
      <Table columns={columns} rows={data ?? []} loading={isLoading} empty={t("ex.empty")} />
      {modal && <ExerciseModal initial={modal.initial} editingId={modal.id} initialTypeNames={modal.typeNames} onClose={() => setModal(null)} />}
    </div>
  );
}
