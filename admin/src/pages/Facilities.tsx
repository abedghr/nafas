import { useState, useRef } from "react";
import { Plus, Trash2, Pencil, X, Upload } from "lucide-react";
import { Table, type Column } from "../base-components/Table";
import { useFacilities, useFacilityMutations } from "../hooks/facilities";
import { uploadImage } from "../services/gyms";
import type { Facility, FacilityInput } from "../services/facilities";
import { t } from "../lib/i18n";

const blank = (): FacilityInput => ({ icon: "checkmark-circle-outline", logoUrl: null, title: "", description: "", translations: { ar: {} } });

function FacilityModal({ initial, editingId, onClose }: { initial: FacilityInput; editingId?: string; onClose: () => void }) {
  const { create, update } = useFacilityMutations();
  const [f, setF] = useState<FacilityInput>(initial);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  const ar = f.translations?.ar ?? {};
  const setAr = (patch: Partial<{ title: string; description: string }>) => setF({ ...f, translations: { ...f.translations, ar: { ...ar, ...patch } } });

  const pickLogo = async (file?: File) => { if (!file) return; setBusy(true); try { setF({ ...f, logoUrl: await uploadImage(file) }); } catch {} setBusy(false); };
  const save = () => {
    setErr("");
    if (!f.title.trim()) return setErr(t("common.nameRequiredEn"));
    const opts = { onSuccess: onClose, onError: (e: any) => setErr(e.response?.data?.message || e.message) };
    if (editingId) update.mutate({ id: editingId, data: f }, opts); else create.mutate(f, opts);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 grid place-items-start justify-center overflow-y-auto py-10" onClick={onClose}>
      <div className="card w-[560px] max-w-[92vw] p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">{editingId ? t("fac.edit") : t("fac.new")}</h3>
          <button onClick={onClose} className="text-muted hover:text-white"><X size={20} /></button>
        </div>

        <div className="flex gap-4">
          <div>
            <div className="text-sub text-xs mb-1">{t("fac.logo")}</div>
            <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-line bg-card-alt grid place-items-center cursor-pointer" onClick={() => ref.current?.click()}>
              {f.logoUrl ? <img src={f.logoUrl} className="w-full h-full object-cover" /> : <Upload size={18} className="text-muted" />}
              {busy && <div className="absolute inset-0 bg-black/50 grid place-items-center text-[10px] text-white">…</div>}
            </div>
            <input ref={ref} type="file" accept="image/*" className="hidden" onChange={(e) => pickLogo(e.target.files?.[0])} />
          </div>
          <div className="flex-1">
            <div className="text-sub text-xs mb-1">{t("fac.icon")}</div>
            <input className="input w-full" placeholder="e.g. water-outline" value={f.icon} onChange={(e) => setF({ ...f, icon: e.target.value })} />
            <div className="text-muted text-[11px] mt-1">Ionicons name (fallback when no logo).</div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="text-xs text-primary font-medium">English (default)</div>
            <input className="input" placeholder={t("fac.name")} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
            <textarea className="input w-full resize-y" rows={3} placeholder={t("fac.desc")} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
          </div>
          <div className="space-y-2" dir="rtl">
            <div className="text-xs text-sub font-medium" dir="ltr">العربية</div>
            <input className="input text-right" placeholder="العنوان" value={ar.title ?? ""} onChange={(e) => setAr({ title: e.target.value })} />
            <textarea className="input w-full resize-y text-right" rows={3} placeholder="الوصف" value={ar.description ?? ""} onChange={(e) => setAr({ description: e.target.value })} />
          </div>
        </div>

        {err && <p className="text-accent text-sm">{err}</p>}
        <div className="flex gap-2">
          <button className="btn-primary disabled:opacity-50" onClick={save} disabled={create.isPending || update.isPending}>
            {create.isPending || update.isPending ? t("common.saving") : t("fac.save")}
          </button>
          <button className="px-4 py-2.5 rounded-xl border border-line text-sub" onClick={onClose}>{t("common.cancel")}</button>
        </div>
      </div>
    </div>
  );
}

export function Facilities() {
  const { data, isLoading } = useFacilities();
  const { remove } = useFacilityMutations();
  const [modal, setModal] = useState<{ initial: FacilityInput; id?: string } | null>(null);
  const openEdit = (fac: Facility) => setModal({ id: fac.id, initial: { icon: fac.icon, logoUrl: fac.logoUrl, title: fac.title, description: fac.description, translations: { ar: fac.translations?.ar ?? {} } } });

  const columns: Column<Facility>[] = [
    { key: "title", header: t("fac.col"), render: (fac) => (
      <div className="flex items-center gap-3">
        {fac.logoUrl ? <img src={fac.logoUrl} className="w-8 h-8 rounded-lg object-cover" /> : <div className="w-8 h-8 rounded-lg bg-primary/10 grid place-items-center text-[10px] text-primary">{fac.icon.split("-")[0].slice(0, 3)}</div>}
        <div><div className="font-medium">{fac.title}</div><div className="text-muted text-xs max-w-xs truncate">{fac.description}</div></div>
      </div>
    ) },
    {
      key: "actions", header: "",
      render: (fac) => (
        <div className="flex gap-3">
          <button onClick={() => openEdit(fac)} className="text-muted hover:text-primary"><Pencil size={16} /></button>
          <button onClick={() => confirm(t("common.deleteConfirm", { name: fac.title })) && remove.mutate(fac.id)} className="text-muted hover:text-accent"><Trash2 size={16} /></button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{t("fac.title")}</h1>
          <p className="text-sub text-sm">{t("fac.sub", { count: data?.length ?? 0 })}</p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={() => setModal({ initial: blank() })}><Plus size={18} /> {t("fac.add")}</button>
      </div>
      <Table columns={columns} rows={data ?? []} loading={isLoading} empty={t("fac.empty")} />
      {modal && <FacilityModal initial={modal.initial} editingId={modal.id} onClose={() => setModal(null)} />}
    </div>
  );
}
