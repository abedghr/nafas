import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2, Pencil, X, Star, Upload, Check, Ban, Eye, Power, Camera } from "lucide-react";
import { Table, type Column } from "../base-components/Table";
import { MapPicker } from "../base-components/MapPicker";
import { useGyms, useGymMutations, useGymRequests, useGymRequestMutations } from "../hooks/gyms";
import { useCountries } from "../hooks/countries";
import { useUsers } from "../hooks/users";
import { useFacilities } from "../hooks/facilities";
import { useCoaches } from "../hooks/coaches";
import { uploadImage, type Gym, type GymInput, type Subscription, type GymRequest, type DaySchedule, type GymClass } from "../services/gyms";
import { t } from "../lib/i18n";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// ensure all 7 days exist (preserving any saved data) so the editor always shows a full week
const fullWeek = (sched?: DaySchedule[]): DaySchedule[] =>
  DAYS.map((day) => sched?.find((s) => s.day === day) ?? { day, open: "", close: "", closed: false, classes: [] });

function ScheduleEditor({ value, onChange }: { value?: DaySchedule[]; onChange: (s: DaySchedule[]) => void }) {
  const week = fullWeek(value);
  const setDay = (i: number, patch: Partial<DaySchedule>) => onChange(week.map((d, idx) => (idx === i ? { ...d, ...patch } : d)));
  const setClass = (di: number, ci: number, patch: Partial<GymClass>) =>
    setDay(di, { classes: week[di].classes.map((c, idx) => (idx === ci ? { ...c, ...patch } : c)) });
  return (
    <div className="space-y-2">
      {week.map((d, di) => (
        <div key={d.day} className="rounded-xl border border-line p-3 space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-medium w-24 text-sm">{d.day}</span>
            {d.closed ? (
              <span className="text-muted text-xs flex-1">{t("gyms.closed")}</span>
            ) : (
              <div className="flex items-center gap-2 flex-1">
                <input className="input w-28" placeholder={t("gyms.open")} value={d.open ?? ""} onChange={(e) => setDay(di, { open: e.target.value })} />
                <span className="text-muted">–</span>
                <input className="input w-28" placeholder={t("gyms.close")} value={d.close ?? ""} onChange={(e) => setDay(di, { close: e.target.value })} />
              </div>
            )}
            <label className="flex items-center gap-1.5 text-xs text-sub">
              <input type="checkbox" checked={!!d.closed} onChange={(e) => setDay(di, { closed: e.target.checked })} /> {t("gyms.closed")}
            </label>
          </div>
          {!d.closed && (
            <div className="space-y-1.5 pl-2 border-l-2 border-line/60">
              {d.classes.map((c, ci) => (
                <div key={ci} className="flex gap-2 items-center">
                  <input className="input flex-1" placeholder={t("gyms.className")} value={c.name} onChange={(e) => setClass(di, ci, { name: e.target.value })} />
                  <input className="input w-24" placeholder={t("gyms.classTime")} value={c.time} onChange={(e) => setClass(di, ci, { time: e.target.value })} />
                  <input className="input w-24" placeholder={t("gyms.classDuration")} value={c.duration} onChange={(e) => setClass(di, ci, { duration: e.target.value })} />
                  <input className="input w-32" placeholder={t("gyms.classCoach")} value={c.coach ?? ""} onChange={(e) => setClass(di, ci, { coach: e.target.value })} />
                  <button onClick={() => setDay(di, { classes: d.classes.filter((_, idx) => idx !== ci) })} className="text-muted hover:text-accent"><Trash2 size={15} /></button>
                </div>
              ))}
              <button onClick={() => setDay(di, { classes: [...d.classes, { name: "", time: "", duration: "", coach: "" }] })} className="text-primary text-xs flex items-center gap-1"><Plus size={13} /> {t("gyms.addClass")}</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

const blank = (): Partial<GymInput> => ({
  name: "", description: "", address: "", city: "", countryId: null, ownerId: null, logoUrl: null, coverUrl: null,
  lat: null, lng: null, rating: 0, phone: "", workingHours: "", memberCount: 0, types: [], facilityIds: [],
  subscriptions: [], isActive: true, translations: { ar: {} },
});
const csv = (a?: string[]) => (a ?? []).join(", ");
const fromCsv = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);
export const Section = ({ title, children }: { title: string; children: any }) => (
  <div className="space-y-3">
    <div className="text-xs font-semibold text-primary uppercase tracking-wide">{title}</div>
    {children}
  </div>
);

export function ImageField({ label, hint, url, onChange, aspect }: { label: string; hint?: string; url?: string | null; onChange: (u: string | null) => void; aspect: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const pick = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    try { onChange(await uploadImage(file)); } catch { /* ignore */ }
    setBusy(false);
  };
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline gap-2">
        <span className="text-sub text-xs font-medium">{label}</span>
        {hint && <span className="text-muted text-[10px]">{hint}</span>}
      </div>
      <div className={`relative group ${aspect} rounded-xl overflow-hidden border border-line bg-black/30 grid place-items-center cursor-pointer transition hover:border-primary/50`} onClick={() => ref.current?.click()}>
        {url ? <img src={url} className="w-full h-full object-contain" /> : (
          <div className="flex flex-col items-center gap-1 text-muted">
            <Upload size={18} /><span className="text-[11px]">{t("gyms.upload")}</span>
          </div>
        )}
        {/* hover: change */}
        {url && (
          <div className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 transition flex flex-col items-center justify-center gap-1">
            <Camera size={18} className="text-white" />
            <span className="text-[11px] text-white">{t("gyms.change")}</span>
          </div>
        )}
        {/* remove — reveal on hover */}
        {url && (
          <button type="button" onClick={(e) => { e.stopPropagation(); onChange(null); }}
            className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/70 hover:bg-accent opacity-0 group-hover:opacity-100 transition grid place-items-center text-white">
            <X size={13} />
          </button>
        )}
        {busy && <div className="absolute inset-0 bg-black/60 grid place-items-center text-xs text-white">{t("gyms.uploading")}</div>}
      </div>
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
    </div>
  );
}

export function GymModal({ initial, editingId, onClose }: { initial: Partial<GymInput>; editingId?: string; onClose: () => void }) {
  const { create, update } = useGymMutations();
  const { data: countries } = useCountries({ page: 1, perPage: 100 });
  const { data: users } = useUsers({ page: 1, perPage: 100 });
  const { data: facilities } = useFacilities();
  const { data: coaches } = useCoaches("");
  const [f, setF] = useState<Partial<GymInput>>(initial);
  const facilityIds = f.facilityIds ?? [];
  const toggleFacility = (id: string) => setF({ ...f, facilityIds: facilityIds.includes(id) ? facilityIds.filter((x) => x !== id) : [...facilityIds, id] });
  const [err, setErr] = useState("");
  const ar = f.translations?.ar ?? {};
  const setAr = (patch: Partial<{ name: string; description: string }>) => setF({ ...f, translations: { ...f.translations, ar: { ...ar, ...patch } } });
  const subs = f.subscriptions ?? [];
  const setSub = (i: number, patch: Partial<Subscription>) => setF({ ...f, subscriptions: subs.map((s, idx) => (idx === i ? { ...s, ...patch } : s)) });

  const save = () => {
    setErr("");
    if (!f.name?.trim()) return setErr(t("common.nameRequiredEn"));
    const opts = { onSuccess: onClose, onError: (e: any) => setErr(e.response?.data?.message || e.message) };
    if (editingId) update.mutate({ id: editingId, data: f }, opts); else create.mutate(f, opts);
  };
  const field = (label: string, key: keyof GymInput, type: "text" | "number" = "text") => (
    <div>
      <div className="text-sub text-xs mb-1">{label}</div>
      <input className="input w-full" type={type} value={(f as any)[key] ?? ""}
        onChange={(e) => setF({ ...f, [key]: type === "number" ? Number(e.target.value) : e.target.value })} />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/60 grid place-items-start justify-center overflow-y-auto py-10" onClick={onClose}>
      <div className="card w-[760px] max-w-[94vw] p-6 space-y-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">{editingId ? t("gyms.edit") : t("gyms.new")}</h3>
          <button onClick={onClose} className="text-muted hover:text-white"><X size={20} /></button>
        </div>

        <Section title={t("gyms.basics")}>
          <div className="grid lg:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="text-xs text-primary font-medium">English (default)</div>
              <input className="input" placeholder="Name" value={f.name ?? ""} onChange={(e) => setF({ ...f, name: e.target.value })} />
              <textarea className="input w-full resize-y" rows={3} placeholder={t("gyms.description")} value={f.description ?? ""} onChange={(e) => setF({ ...f, description: e.target.value })} />
            </div>
            <div className="space-y-2" dir="rtl">
              <div className="text-xs text-sub font-medium" dir="ltr">العربية</div>
              <input className="input text-right" placeholder="الاسم" value={ar.name ?? ""} onChange={(e) => setAr({ name: e.target.value })} />
              <textarea className="input w-full resize-y text-right" rows={3} placeholder="الوصف" value={ar.description ?? ""} onChange={(e) => setAr({ description: e.target.value })} />
            </div>
          </div>
        </Section>

        <Section title={t("gyms.media")}>
          <div className="flex flex-wrap gap-5 items-start">
            <ImageField label={t("gyms.logo")} hint="1:1" url={f.logoUrl} onChange={(u) => setF({ ...f, logoUrl: u })} aspect="w-[120px] h-[120px]" />
            <ImageField label={t("gyms.cover")} hint="16:9" url={f.coverUrl} onChange={(u) => setF({ ...f, coverUrl: u })} aspect="w-full max-w-[400px] aspect-video" />
          </div>
        </Section>

        <Section title={t("gyms.location")}>
          <MapPicker lat={f.lat} lng={f.lng} onChange={(lat, lng) => setF({ ...f, lat, lng })} />
          <div className="text-muted text-xs">{t("gyms.pickOnMap")}</div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <div className="text-sub text-xs mb-1">{t("gyms.country")}</div>
              <select className="input w-full" value={f.countryId ?? ""} onChange={(e) => setF({ ...f, countryId: e.target.value || null })}>
                <option value="">—</option>
                {countries?.data?.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.currency})</option>)}
              </select>
            </div>
            {field(t("gyms.city"), "city")}
            {field(t("gyms.lat"), "lat", "number")}
            {field(t("gyms.lng"), "lng", "number")}
            <div className="col-span-2 lg:col-span-4">{field(t("gyms.address"), "address")}</div>
          </div>
        </Section>

        <Section title={t("gyms.details")}>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {field(t("gyms.rating"), "rating", "number")}
            {field(t("gyms.phone"), "phone")}
            {field("WhatsApp", "whatsapp")}
            {field(t("gyms.hours"), "workingHours")}
            {field(t("gyms.members"), "memberCount", "number")}
          </div>
          <div>
            <div className="text-sub text-xs mb-1">{t("gyms.types")}</div>
            <input className="input w-full" value={csv(f.types)} onChange={(e) => setF({ ...f, types: fromCsv(e.target.value) })} />
          </div>
          <div>
            <div className="text-sub text-xs mb-2">{t("gyms.facilities")}</div>
            <div className="flex flex-wrap gap-2">
              {facilities?.map((fac) => {
                const on = facilityIds.includes(fac.id);
                return (
                  <button key={fac.id} type="button" onClick={() => toggleFacility(fac.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${on ? "bg-primary text-white border-primary" : "border-line text-sub hover:border-primary"}`}>
                    {fac.title}
                  </button>
                );
              })}
            </div>
          </div>
        </Section>

        <Section title={t("gyms.subscriptions")}>
          <div className="space-y-2">
            {subs.map((s, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input className="input flex-1" placeholder={t("gyms.subName")} value={s.name} onChange={(e) => setSub(i, { name: e.target.value })} />
                <input className="input w-24" type="number" placeholder={t("gyms.subAmount")} value={s.price.amount} onChange={(e) => setSub(i, { price: { ...s.price, amount: Number(e.target.value) } })} />
                <input className="input w-20" placeholder={t("gyms.subCurrency")} value={s.price.currency} onChange={(e) => setSub(i, { price: { ...s.price, currency: e.target.value.toUpperCase() } })} />
                <button onClick={() => setF({ ...f, subscriptions: subs.filter((_, idx) => idx !== i) })} className="text-muted hover:text-accent"><Trash2 size={16} /></button>
              </div>
            ))}
            <button onClick={() => setF({ ...f, subscriptions: [...subs, { name: "", price: { amount: 0, currency: "JOD" } }] })} className="text-primary text-xs flex items-center gap-1"><Plus size={14} /> {t("gyms.addSub")}</button>
          </div>
        </Section>

        <Section title={t("gyms.schedule")}>
          <ScheduleEditor value={f.schedule} onChange={(s) => setF({ ...f, schedule: s })} />
        </Section>

        <Section title={t("gyms.owner")}>
          <div className="grid lg:grid-cols-2 gap-3">
            <div>
              <div className="text-sub text-xs mb-1">{t("gyms.owner")}</div>
              <select className="input w-full" value={f.ownerId ?? ""} onChange={(e) => setF({ ...f, ownerId: e.target.value || null })}>
                <option value="">{t("gyms.noOwner")}</option>
                {users?.data?.map((u) => <option key={u.id} value={u.id}>{u.name} · {u.email}</option>)}
              </select>
            </div>
            <div>
              <div className="text-sub text-xs mb-1">{t("gyms.headCoach")}</div>
              <select className="input w-full" value={f.headCoachId ?? ""} onChange={(e) => setF({ ...f, headCoachId: e.target.value || null })}>
                <option value="">—</option>
                {coaches?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
        </Section>

        <label className="flex items-center gap-2 text-sm text-sub">
          <input type="checkbox" checked={f.isActive ?? true} onChange={(e) => setF({ ...f, isActive: e.target.checked })} /> {t("gyms.active")}
        </label>

        {err && <p className="text-accent text-sm">{err}</p>}
        <div className="flex gap-2">
          <button className="btn-primary disabled:opacity-50" onClick={save} disabled={create.isPending || update.isPending}>
            {create.isPending || update.isPending ? t("common.saving") : t("gyms.save")}
          </button>
          <button className="px-4 py-2.5 rounded-xl border border-line text-sub" onClick={onClose}>{t("common.cancel")}</button>
        </div>
      </div>
    </div>
  );
}

function RequestsView() {
  const { data, isLoading } = useGymRequests();
  const { setStatus } = useGymRequestMutations();
  const badge = (s: string) => s === "approved" ? "bg-primary/15 text-primary" : s === "rejected" ? "bg-accent/15 text-accent" : "bg-card-alt text-sub";
  const columns: Column<GymRequest>[] = [
    { key: "user", header: t("gyms.reqUser"), render: (r) => (<div><div className="font-medium">{r.userName}</div><div className="text-muted text-xs">{r.userPhone || r.userEmail}</div></div>) },
    { key: "gym", header: t("gyms.reqGym"), render: (r) => <span className="text-sub">{r.gymName}</span> },
    { key: "plan", header: t("gyms.reqPlan"), render: (r) => <span className="text-sub text-xs">{r.plan || "—"}</span> },
    { key: "status", header: t("gyms.reqStatus"), render: (r) => <span className={`px-2 py-1 rounded-lg text-xs ${badge(r.status)}`}>{t(`gyms.${r.status}`)}</span> },
    {
      key: "actions", header: "",
      render: (r) => r.status === "pending" ? (
        <div className="flex gap-2">
          <button onClick={() => setStatus.mutate({ id: r.id, status: "approved" })} className="text-muted hover:text-primary" title={t("gyms.approve")}><Check size={16} /></button>
          <button onClick={() => setStatus.mutate({ id: r.id, status: "rejected" })} className="text-muted hover:text-accent" title={t("gyms.reject")}><Ban size={16} /></button>
        </div>
      ) : null,
    },
  ];
  return <Table columns={columns} rows={data ?? []} loading={isLoading} empty={t("gyms.reqEmpty")} />;
}

export function Gyms() {
  const [tab, setTab] = useState<"gyms" | "requests">("gyms");
  const [search, setSearch] = useState("");
  const { data, isLoading } = useGyms(search);
  const { data: countries } = useCountries({ page: 1, perPage: 100 });
  const { remove, update } = useGymMutations();
  const navigate = useNavigate();
  const [modal, setModal] = useState<{ initial: Partial<GymInput>; id?: string } | null>(null);
  const countryName = (id: string | null) => countries?.data?.find((c) => c.id === id)?.name ?? "—";
  const openEdit = (g: Gym) => setModal({ id: g.id, initial: { ...g, translations: { ar: g.translations?.ar ?? {} } } });

  const columns: Column<Gym>[] = [
    { key: "name", header: t("gyms.colGym"), render: (g) => (
      <button onClick={() => navigate(`/app/gyms/${g.id}`)} className="flex items-center gap-3 text-left hover:opacity-80">
        {g.logoUrl ? <img src={g.logoUrl} className="w-9 h-9 rounded-lg object-cover" /> : <div className="w-9 h-9 rounded-lg bg-primary/10" />}
        <div><div className="font-medium">{g.name}</div><div className="text-muted text-xs">{g.city || g.address}</div></div>
      </button>
    ) },
    { key: "country", header: t("gyms.colCountry"), render: (g) => <span className="text-sub text-sm">{countryName(g.countryId)}</span> },
    { key: "rating", header: t("gyms.colRating"), render: (g) => <span className="text-sub text-xs flex items-center gap-1"><Star size={12} className="text-primary" /> {g.rating}</span> },
    { key: "subs", header: t("gyms.colSubs"), render: (g) => g.subscriptions[0] ? <span className="text-sub text-xs">{g.subscriptions[0].price.amount} {g.subscriptions[0].price.currency}</span> : <span className="text-muted">—</span> },
    {
      key: "status", header: t("gyms.reqStatus"),
      render: (g) => (
        <button onClick={() => update.mutate({ id: g.id, data: { isActive: !g.isActive } })}
          className={`px-2 py-1 rounded-lg text-xs flex items-center gap-1 ${g.isActive ? "bg-primary/15 text-primary" : "bg-accent/15 text-accent"}`}>
          <Power size={12} /> {g.isActive ? t("gyms.statusActive") : t("gyms.statusInactive")}
        </button>
      ),
    },
    {
      key: "actions", header: "",
      render: (g) => (
        <div className="flex gap-3">
          <button onClick={() => navigate(`/app/gyms/${g.id}`)} className="text-muted hover:text-primary"><Eye size={16} /></button>
          <button onClick={() => openEdit(g)} className="text-muted hover:text-primary"><Pencil size={16} /></button>
          <button onClick={() => confirm(t("common.deleteConfirm", { name: g.name })) && remove.mutate(g.id)} className="text-muted hover:text-accent"><Trash2 size={16} /></button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{t("gyms.title")}</h1>
          <p className="text-sub text-sm">{t("gyms.sub", { count: data?.length ?? 0 })}</p>
        </div>
        {tab === "gyms" && <button className="btn-primary flex items-center gap-2" onClick={() => setModal({ initial: blank() })}><Plus size={18} /> {t("gyms.add")}</button>}
      </div>

      <div className="flex gap-2 mb-5">
        {(["gyms", "requests"] as const).map((tb) => (
          <button key={tb} onClick={() => setTab(tb)} className={`px-3 py-1.5 rounded-lg text-sm ${tab === tb ? "bg-primary/15 text-primary" : "bg-card text-sub hover:text-white"}`}>
            {t(tb === "gyms" ? "gyms.tabGyms" : "gyms.tabRequests")}
          </button>
        ))}
      </div>

      {tab === "gyms" ? (
        <>
          <input className="input max-w-sm mb-4" placeholder={t("gyms.searchPh")} value={search} onChange={(e) => setSearch(e.target.value)} />
          <Table columns={columns} rows={data ?? []} loading={isLoading} empty={t("gyms.empty")} />
        </>
      ) : <RequestsView />}

      {modal && <GymModal initial={modal.initial} editingId={modal.id} onClose={() => setModal(null)} />}
    </div>
  );
}
