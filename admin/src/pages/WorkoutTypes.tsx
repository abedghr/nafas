import { useState } from "react";
import { Plus, Trash2, Pencil, X } from "lucide-react";
import { Table, type Column } from "../base-components/Table";
import { useWorkoutTypes, useWorkoutTypeMutations } from "../hooks/workoutTypes";
import type { WorkoutType, WorkoutTypeInput } from "../services/workoutTypes";

const blank = (): WorkoutTypeInput => ({ name: "", description: "", translations: { ar: {} } });

function WorkoutTypeModal({ initial, editingId, onClose }: { initial: WorkoutTypeInput; editingId?: string; onClose: () => void }) {
  const { create, update } = useWorkoutTypeMutations();
  const [f, setF] = useState<WorkoutTypeInput>(initial);
  const [err, setErr] = useState("");
  const ar = f.translations?.ar ?? {};
  const setAr = (patch: Partial<{ name: string; description: string }>) =>
    setF({ ...f, translations: { ...f.translations, ar: { ...ar, ...patch } } });

  const save = () => {
    setErr("");
    if (!f.name.trim()) return setErr("English name is required");
    const opts = { onSuccess: onClose, onError: (e: any) => setErr(e.response?.data?.message || e.message) };
    if (editingId) update.mutate({ id: editingId, data: f }, opts); else create.mutate(f, opts);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 grid place-items-start justify-center overflow-y-auto py-10" onClick={onClose}>
      <div className="card w-[560px] max-w-[92vw] p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">{editingId ? "Edit training type" : "New training type"}</h3>
          <button onClick={onClose} className="text-muted hover:text-white"><X size={20} /></button>
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="text-xs text-primary font-medium">English (default)</div>
            <input className="input w-full" placeholder="Name (e.g. Push Day)" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
            <textarea className="input w-full resize-y" rows={3} placeholder="Description" value={f.description ?? ""} onChange={(e) => setF({ ...f, description: e.target.value })} />
          </div>
          <div className="space-y-2" dir="rtl">
            <div className="text-xs text-sub font-medium" dir="ltr">العربية</div>
            <input className="input w-full text-right" placeholder="الاسم" value={ar.name ?? ""} onChange={(e) => setAr({ name: e.target.value })} />
            <textarea className="input w-full resize-y text-right" rows={3} placeholder="الوصف" value={ar.description ?? ""} onChange={(e) => setAr({ description: e.target.value })} />
          </div>
        </div>

        {err && <p className="text-accent text-sm">{err}</p>}
        <div className="flex gap-2">
          <button className="btn-primary disabled:opacity-50" onClick={save} disabled={create.isPending || update.isPending}>
            {create.isPending || update.isPending ? "Saving…" : "Save"}
          </button>
          <button className="px-4 py-2.5 rounded-xl border border-line text-sub" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

export function WorkoutTypes() {
  const { data, isLoading } = useWorkoutTypes();
  const { remove } = useWorkoutTypeMutations();
  const [modal, setModal] = useState<{ initial: WorkoutTypeInput; id?: string } | null>(null);
  const openEdit = (wt: WorkoutType) =>
    setModal({ id: wt.id, initial: { name: wt.name, description: wt.description, translations: { ar: wt.translations?.ar ?? {} } } });

  const columns: Column<WorkoutType>[] = [
    { key: "name", header: "Type", render: (wt) => (
      <div>
        <div className="font-medium">{wt.name}</div>
        {wt.description ? <div className="text-muted text-xs max-w-md truncate">{wt.description}</div> : null}
      </div>
    ) },
    { key: "exerciseCount", header: "Exercises", render: (wt) => <span className="text-sub">{wt.exerciseCount ?? 0}</span> },
    {
      key: "actions", header: "",
      render: (wt) => (
        <div className="flex gap-3">
          <button onClick={() => openEdit(wt)} className="text-muted hover:text-primary"><Pencil size={16} /></button>
          <button onClick={() => confirm(`Delete "${wt.name}"? Exercises stay; only their link to this type is removed.`) && remove.mutate(wt.id)} className="text-muted hover:text-accent"><Trash2 size={16} /></button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Training Types</h1>
          <p className="text-sub text-sm">{data?.length ?? 0} types · shown in the app's "What are you training?"</p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={() => setModal({ initial: blank() })}><Plus size={18} /> Add type</button>
      </div>
      <Table columns={columns} rows={data ?? []} loading={isLoading} empty="No training types yet" />
      {modal && <WorkoutTypeModal initial={modal.initial} editingId={modal.id} onClose={() => setModal(null)} />}
    </div>
  );
}
