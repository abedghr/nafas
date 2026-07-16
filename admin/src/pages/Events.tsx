import { useState } from "react";
import { Plus, Pencil, Trash2, Power } from "lucide-react";
import { useEvents, useEventMutations, useEventRegistrations, useEventRegMutations } from "../hooks/events";
import { useCountries } from "../hooks/countries";
import { useUsers } from "../hooks/users";
import { MapPicker } from "../base-components/MapPicker";
import { Section, ImageField } from "./Gyms";
import { ClassesSection } from "./GymProfile";
import { useGyms } from "../hooks/gyms";
import type { EventInput, AdminEvent } from "../services/events";
import { t } from "../lib/i18n";

const TYPES = ["tournament", "event", "challenge"];
const STATUSES = ["upcoming", "ongoing", "completed", "cancelled"];
const toLocal = (iso: string | null | undefined) => (iso ? iso.slice(0, 16) : "");
const toIso = (local: string) => (local ? new Date(local).toISOString() : null);
const fmt = (iso: string | null) => { if (!iso) return "—"; try { return new Date(iso).toLocaleString(); } catch { return "—"; } };
const fromCsv = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);

export function Events() {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"events" | "registrations">("events");
  const { data: events } = useEvents(search);
  const { remove, update } = useEventMutations();
  const [modal, setModal] = useState<{ initial: Partial<EventInput>; id?: string } | null>(null);
  const blank: Partial<EventInput> = { type: "tournament", status: "upcoming", name: "", description: "", venue: "", capacity: 0, tags: [], isActive: true, translations: { ar: {} } };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("events.title")}</h1>
        {tab === "events" && <button onClick={() => setModal({ initial: blank })} className="btn-primary flex items-center gap-2 px-4 py-2"><Plus size={16} /> {t("events.add")}</button>}
      </div>

      <div className="flex gap-2">
        {(["events", "registrations"] as const).map((tb) => (
          <button key={tb} onClick={() => setTab(tb)} className={`px-4 py-2 rounded-xl text-sm ${tab === tb ? "bg-primary text-white" : "border border-line text-sub"}`}>{t(`events.tab_${tb}`)}</button>
        ))}
      </div>

      {tab === "events" ? (
        <>
          <input className="input w-full max-w-sm" placeholder={t("events.search")} value={search} onChange={(e) => setSearch(e.target.value)} />
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="text-sub text-left border-b border-line"><tr>
                <th className="p-3">{t("events.name")}</th><th className="p-3">{t("events.type")}</th><th className="p-3">{t("events.date")}</th>
                <th className="p-3">{t("events.regs")}</th><th className="p-3">{t("events.status")}</th><th className="p-3"></th>
              </tr></thead>
              <tbody>
                {events?.map((e) => (
                  <tr key={e.id} className="border-b border-line/40">
                    <td className="p-3"><button onClick={() => setModal({ initial: { ...e } as any, id: e.id })} className="font-medium hover:text-primary text-left">{e.name}</button><div className="text-muted text-xs">{e.city}</div></td>
                    <td className="p-3">{t(`events.type_${e.type}`)}</td>
                    <td className="p-3 text-sub">{fmt(e.startsAt)}</td>
                    <td className="p-3">{e.registeredCount}{e.capacity ? `/${e.capacity}` : ""}</td>
                    <td className="p-3"><button onClick={() => update.mutate({ id: e.id, data: { isActive: !e.isActive } })} className={`px-2 py-0.5 rounded-lg text-xs flex items-center gap-1 ${e.isActive ? "bg-primary/15 text-primary" : "bg-accent/15 text-accent"}`}><Power size={11} /> {e.isActive ? t("events.active") : t("events.inactive")}</button></td>
                    <td className="p-3">
                      <div className="flex items-center gap-2 justify-end">
                        <button onClick={() => setModal({ initial: { ...e } as any, id: e.id })} className="text-sub hover:text-primary"><Pencil size={15} /></button>
                        <button onClick={() => confirm(t("common.deleteConfirm", { name: e.name })) && remove.mutate(e.id)} className="text-muted hover:text-accent"><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!events?.length && <tr><td colSpan={6} className="p-6 text-center text-muted">{t("events.empty")}</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      ) : <RegistrationsTab />}

      {modal && <EventModal initial={modal.initial} editingId={modal.id} onClose={() => setModal(null)} />}
    </div>
  );
}

function RegistrationsTab() {
  const { data: regs } = useEventRegistrations();
  const { setStatus } = useEventRegMutations();
  return (
    <div className="card overflow-hidden">
      <table className="w-full text-sm">
        <thead className="text-sub text-left border-b border-line"><tr>
          <th className="p-3">{t("events.registrant")}</th><th className="p-3">{t("events.name")}</th><th className="p-3">{t("events.contact")}</th><th className="p-3">{t("events.status")}</th><th className="p-3"></th>
        </tr></thead>
        <tbody>
          {regs?.map((r) => (
            <tr key={r.id} className="border-b border-line/40">
              <td className="p-3 font-medium">{r.userName}{r.note ? <div className="text-muted text-xs">{r.note}</div> : null}</td>
              <td className="p-3 text-sub">{r.eventName}</td>
              <td className="p-3 text-muted text-xs">{r.userPhone || r.userEmail || "—"}</td>
              <td className="p-3"><span className={`px-2 py-0.5 rounded-lg text-xs ${r.status === "confirmed" ? "bg-primary/15 text-primary" : r.status === "rejected" ? "bg-accent/15 text-accent" : "bg-card-alt text-sub"}`}>{t(`events.reg_${r.status}`)}</span></td>
              <td className="p-3">
                <div className="flex gap-2 justify-end">
                  {r.status !== "confirmed" && <button onClick={() => setStatus.mutate({ id: r.id, status: "confirmed" })} className="text-primary text-xs">{t("events.confirm")}</button>}
                  {r.status !== "rejected" && <button onClick={() => setStatus.mutate({ id: r.id, status: "rejected" })} className="text-muted hover:text-accent text-xs">{t("events.reject")}</button>}
                </div>
              </td>
            </tr>
          ))}
          {!regs?.length && <tr><td colSpan={5} className="p-6 text-center text-muted">{t("events.noRegs")}</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

export function EventModal({ initial, editingId, onClose }: { initial: Partial<EventInput>; editingId?: string; onClose: () => void }) {
  const { create, update } = useEventMutations();
  const { data: countries } = useCountries({ page: 1, perPage: 100 });
  const { data: users } = useUsers({ page: 1, perPage: 100 });
  const { data: gyms } = useGyms("");
  const [f, setF] = useState<Partial<EventInput>>(initial);
  const [err, setErr] = useState("");
  const ar = f.translations?.ar ?? {};
  const setAr = (patch: Partial<{ name: string; description: string; venue: string }>) => setF({ ...f, translations: { ...f.translations, ar: { ...ar, ...patch } } });
  const busy = create.isPending || update.isPending;

  const save = () => {
    if (!f.name?.trim()) { setErr(t("events.nameRequired")); return; }
    const done = () => onClose();
    const body = { ...f };
    if (editingId) update.mutate({ id: editingId, data: body }, { onSuccess: done, onError: () => setErr(t("common.error")) });
    else create.mutate(body, { onSuccess: done, onError: () => setErr(t("common.error")) });
  };

  return (
    <div className="fixed inset-0 bg-black/60 grid place-items-center z-50 p-4 overflow-y-auto" onClick={onClose}>
      <div className="card w-full max-w-2xl p-6 space-y-5 my-8" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold">{editingId ? t("events.editTitle") : t("events.add")}</h2>

        <Section title={t("gyms.basics")}>
          <div className="grid sm:grid-cols-2 gap-3">
            <input className="input" placeholder={t("events.name")} value={f.name ?? ""} onChange={(e) => setF({ ...f, name: e.target.value })} />
            <input className="input" placeholder={t("events.nameAr")} dir="rtl" value={ar.name ?? ""} onChange={(e) => setAr({ name: e.target.value })} />
            <select className="input" value={f.type ?? "tournament"} onChange={(e) => setF({ ...f, type: e.target.value })}>{TYPES.map((ty) => <option key={ty} value={ty}>{t(`events.type_${ty}`)}</option>)}</select>
            <input className="input" placeholder={t("events.category")} value={f.category ?? ""} onChange={(e) => setF({ ...f, category: e.target.value })} />
          </div>
          <textarea className="input w-full" rows={2} placeholder={t("events.description")} value={f.description ?? ""} onChange={(e) => setF({ ...f, description: e.target.value })} />
          <textarea className="input w-full" rows={2} dir="rtl" placeholder={t("events.descriptionAr")} value={ar.description ?? ""} onChange={(e) => setAr({ description: e.target.value })} />
        </Section>

        <Section title={t("events.media")}>
          <div className="flex gap-6 flex-wrap">
            <ImageField label={t("events.logo")} url={f.logoUrl} onChange={(u) => setF({ ...f, logoUrl: u })} aspect="1/1" />
            <ImageField label={t("events.cover")} url={f.coverUrl} onChange={(u) => setF({ ...f, coverUrl: u })} aspect="16/9" />
          </div>
        </Section>

        <Section title={t("events.schedule")}>
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="text-sub text-xs">{t("events.startsAt")}<input type="datetime-local" className="input w-full" value={toLocal(f.startsAt)} onChange={(e) => setF({ ...f, startsAt: toIso(e.target.value) })} /></label>
            <label className="text-sub text-xs">{t("events.endsAt")}<input type="datetime-local" className="input w-full" value={toLocal(f.endsAt)} onChange={(e) => setF({ ...f, endsAt: toIso(e.target.value) })} /></label>
            <input className="input" type="number" placeholder={t("events.capacity")} value={f.capacity ?? 0} onChange={(e) => setF({ ...f, capacity: Number(e.target.value) })} />
            <select className="input" value={f.status ?? "upcoming"} onChange={(e) => setF({ ...f, status: e.target.value })}>{STATUSES.map((s) => <option key={s} value={s}>{t(`events.status_${s}`)}</option>)}</select>
          </div>
        </Section>

        <Section title={t("events.location")}>
          <div className="grid sm:grid-cols-2 gap-3">
            <input className="input" placeholder={t("events.venue")} value={f.venue ?? ""} onChange={(e) => setF({ ...f, venue: e.target.value })} />
            <input className="input" dir="rtl" placeholder={t("events.venueAr")} value={ar.venue ?? ""} onChange={(e) => setAr({ venue: e.target.value })} />
            <select className="input" value={f.countryId ?? ""} onChange={(e) => setF({ ...f, countryId: e.target.value || null })}>
              <option value="">{t("events.country")}</option>
              {countries?.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input className="input" placeholder={t("events.city")} value={f.city ?? ""} onChange={(e) => setF({ ...f, city: e.target.value })} />
          </div>
          <MapPicker lat={f.lat} lng={f.lng} onChange={(lat, lng) => setF({ ...f, lat, lng })} />
        </Section>

        <Section title={t("events.details")}>
          <input className="input w-full" placeholder={t("events.tags")} value={(f.tags ?? []).join(", ")} onChange={(e) => setF({ ...f, tags: fromCsv(e.target.value) })} />
          <select className="input w-full" value={f.gymId ?? ""} onChange={(e) => setF({ ...f, gymId: e.target.value || null })}>
            <option value="">{t("events.noGym")}</option>
            {gyms?.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          <select className="input w-full" value={f.ownerId ?? ""} onChange={(e) => setF({ ...f, ownerId: e.target.value || null })}>
            <option value="">{t("events.organizer")}</option>
            {users?.data?.map((u) => <option key={u.id} value={u.id}>{u.name} · {u.email}</option>)}
          </select>
        </Section>

        {editingId && (
          <Section title={t("events.sessions")}>
            <ClassesSection eventId={editingId} />
          </Section>
        )}

        {err && <p className="text-accent text-sm">{err}</p>}
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-line text-sub">{t("common.cancel")}</button>
          <button onClick={save} disabled={busy} className="btn-primary px-5 py-2 disabled:opacity-50">{busy ? t("common.saving") : t("common.save")}</button>
        </div>
      </div>
    </div>
  );
}
