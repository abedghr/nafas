import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Pencil, X, Star, Eye, BadgeCheck, Sparkles, Check, Ban } from "lucide-react";
import { Table, type Column } from "../base-components/Table";
import { Section, ImageField } from "./Gyms";
import { useGyms } from "../hooks/gyms";
import { useCoaches, useCoachMutations, useBookings, useBookingMutations } from "../hooks/coaches";
import type { Coach, CoachInput, Booking } from "../services/coaches";
import { t } from "../lib/i18n";

const csv = (a?: string[]) => (a ?? []).join(", ");
const fromCsv = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);

export function CoachModal({ coach, onClose }: { coach: Coach; onClose: () => void }) {
  const { update } = useCoachMutations();
  const { data: gymsList } = useGyms("");
  const [f, setF] = useState<CoachInput>({
    headline: coach.headline, bio: coach.bio, specialty: coach.specialty, certifications: coach.certifications,
    yearsExperience: coach.yearsExperience, pricePerSession: coach.pricePerSession, rating: coach.rating,
    reviewsCount: coach.reviewsCount, clientsCount: coach.clientsCount, coverUrl: coach.coverUrl, gymId: coach.gymId,
    whatsapp: coach.whatsapp, isFeatured: coach.isFeatured, verificationStatus: coach.verificationStatus, socialLinks: coach.socialLinks,
  });
  const [err, setErr] = useState("");
  const price = f.pricePerSession ?? { amount: 0, currency: "JOD" };
  const save = () => {
    const opts = { onSuccess: onClose, onError: (e: any) => setErr(e.response?.data?.message || e.message) };
    update.mutate({ id: coach.id, data: f }, opts);
  };
  const num = (label: string, key: keyof CoachInput) => (
    <div><div className="text-sub text-xs mb-1">{label}</div>
      <input className="input w-full" type="number" value={(f as any)[key] ?? 0} onChange={(e) => setF({ ...f, [key]: Number(e.target.value) })} /></div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/60 grid place-items-start justify-center overflow-y-auto py-10" onClick={onClose}>
      <div className="card w-[680px] max-w-[94vw] p-6 space-y-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">{t("coach.edit")} · {coach.name}</h3>
          <button onClick={onClose} className="text-muted hover:text-white"><X size={20} /></button>
        </div>

        <Section title={t("coach.about")}>
          <div><div className="text-sub text-xs mb-1">{t("coach.headline")}</div>
            <input className="input w-full" value={f.headline ?? ""} onChange={(e) => setF({ ...f, headline: e.target.value })} /></div>
          <div><div className="text-sub text-xs mb-1">{t("coach.bio")}</div>
            <textarea className="input w-full resize-y" rows={3} value={f.bio ?? ""} onChange={(e) => setF({ ...f, bio: e.target.value })} /></div>
          <div className="grid lg:grid-cols-2 gap-3">
            <div><div className="text-sub text-xs mb-1">{t("coach.specialty")}</div>
              <input className="input w-full" value={csv(f.specialty)} onChange={(e) => setF({ ...f, specialty: fromCsv(e.target.value) })} /></div>
            <div><div className="text-sub text-xs mb-1">{t("coach.certs")}</div>
              <input className="input w-full" value={csv(f.certifications)} onChange={(e) => setF({ ...f, certifications: fromCsv(e.target.value) })} /></div>
          </div>
        </Section>

        <Section title={t("gyms.media")}>
          <ImageField label={t("coach.cover")} hint="16:9" url={f.coverUrl} onChange={(u) => setF({ ...f, coverUrl: u })} aspect="w-full max-w-[400px] aspect-video" />
        </Section>

        <Section title={t("gyms.details")}>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {num(t("coach.experience"), "yearsExperience")}
            {num(t("coach.rating"), "rating")}
            {num(t("coach.reviews"), "reviewsCount")}
            {num(t("coach.clients"), "clientsCount")}
          </div>
          <div className="flex items-end gap-2">
            <div className="flex-1"><div className="text-sub text-xs mb-1">{t("coach.price")} ({t("coach.amount")})</div>
              <input className="input w-full" type="number" value={price.amount} onChange={(e) => setF({ ...f, pricePerSession: { ...price, amount: Number(e.target.value) } })} /></div>
            <div className="w-24"><div className="text-sub text-xs mb-1">{t("coach.currency")}</div>
              <input className="input w-full" value={price.currency} onChange={(e) => setF({ ...f, pricePerSession: { ...price, currency: e.target.value.toUpperCase() } })} /></div>
          </div>
          <div className="grid lg:grid-cols-2 gap-3">
            <div><div className="text-sub text-xs mb-1">{t("nav.gyms")}</div>
              <select className="input w-full" value={f.gymId ?? ""} onChange={(e) => setF({ ...f, gymId: e.target.value || null })}>
                <option value="">—</option>
                {gymsList?.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select></div>
            <div><div className="text-sub text-xs mb-1">WhatsApp</div>
              <input className="input w-full" value={f.whatsapp ?? ""} onChange={(e) => setF({ ...f, whatsapp: e.target.value })} placeholder="+962…" /></div>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <div><div className="text-sub text-xs mb-1">{t("coach.verification")}</div>
              <select className="input" value={f.verificationStatus} onChange={(e) => setF({ ...f, verificationStatus: e.target.value as any })}>
                <option value="pending">{t("coach.pending")}</option>
                <option value="verified">{t("coach.verified")}</option>
                <option value="rejected">{t("coach.rejected")}</option>
              </select></div>
            <label className="flex items-center gap-2 text-sm text-sub mt-5">
              <input type="checkbox" checked={!!f.isFeatured} onChange={(e) => setF({ ...f, isFeatured: e.target.checked })} /> {t("coach.featured")}
            </label>
          </div>
        </Section>

        {err && <p className="text-accent text-sm">{err}</p>}
        <div className="flex gap-2">
          <button className="btn-primary disabled:opacity-50" onClick={save} disabled={update.isPending}>{update.isPending ? t("common.saving") : t("coach.save")}</button>
          <button className="px-4 py-2.5 rounded-xl border border-line text-sub" onClick={onClose}>{t("common.cancel")}</button>
        </div>
      </div>
    </div>
  );
}

function BookingsView() {
  const { data, isLoading } = useBookings();
  const { setStatus } = useBookingMutations();
  const badge = (s: string) => s === "approved" ? "bg-primary/15 text-primary" : s === "rejected" ? "bg-accent/15 text-accent" : "bg-card-alt text-sub";
  const columns: Column<Booking>[] = [
    { key: "client", header: t("coach.bClient"), render: (b) => (<div><div className="font-medium">{b.clientName}</div><div className="text-muted text-xs">{b.clientEmail}</div></div>) },
    { key: "coach", header: t("coach.bCoach"), render: (b) => <span className="text-sub">{b.coachName}</span> },
    { key: "when", header: t("coach.bWhen"), render: (b) => <span className="text-sub text-xs">{b.date || "—"}</span> },
    { key: "status", header: t("gyms.reqStatus"), render: (b) => <span className={`px-2 py-1 rounded-lg text-xs ${badge(b.status)}`}>{t(`gyms.${b.status}`)}</span> },
    { key: "actions", header: "", render: (b) => b.status === "pending" ? (
      <div className="flex gap-2">
        <button onClick={() => setStatus.mutate({ id: b.id, status: "approved" })} className="text-muted hover:text-primary"><Check size={16} /></button>
        <button onClick={() => setStatus.mutate({ id: b.id, status: "rejected" })} className="text-muted hover:text-accent"><Ban size={16} /></button>
      </div>
    ) : null },
  ];
  return <Table columns={columns} rows={data ?? []} loading={isLoading} empty={t("coach.bEmpty")} />;
}

export function Coaches() {
  const [tab, setTab] = useState<"list" | "bookings">("list");
  const [search, setSearch] = useState("");
  const { data, isLoading } = useCoaches(search);
  const { update } = useCoachMutations();
  const navigate = useNavigate();
  const [modal, setModal] = useState<Coach | null>(null);
  const vbadge = (s: string) => s === "verified" ? "bg-primary/15 text-primary" : s === "rejected" ? "bg-accent/15 text-accent" : "bg-card-alt text-sub";

  const columns: Column<Coach>[] = [
    { key: "name", header: t("coach.col"), render: (c) => (
      <button onClick={() => navigate(`/app/coaches/${c.id}`)} className="flex items-center gap-3 text-left hover:opacity-80">
        {c.avatarUrl ? <img src={c.avatarUrl} className="w-9 h-9 rounded-full object-cover" /> : <div className="w-9 h-9 rounded-full bg-primary/10" />}
        <div><div className="font-medium flex items-center gap-1">{c.name}{c.isFeatured && <Sparkles size={12} className="text-primary" />}</div><div className="text-muted text-xs">{c.headline || c.specialty.join(", ")}</div></div>
      </button>
    ) },
    { key: "price", header: t("coach.price"), render: (c) => c.pricePerSession ? <span className="text-sub text-xs">{c.pricePerSession.amount} {c.pricePerSession.currency}</span> : <span className="text-muted">—</span> },
    { key: "rating", header: t("coach.rating"), render: (c) => <span className="text-sub text-xs flex items-center gap-1"><Star size={12} className="text-primary" /> {c.rating}</span> },
    { key: "verif", header: t("coach.verification"), render: (c) => <span className={`px-2 py-1 rounded-lg text-xs ${vbadge(c.verificationStatus)}`}>{t(`coach.${c.verificationStatus}`)}</span> },
    { key: "actions", header: "", render: (c) => (
      <div className="flex gap-3">
        <button onClick={() => update.mutate({ id: c.id, data: { verificationStatus: c.verificationStatus === "verified" ? "pending" : "verified" } })} className="text-muted hover:text-primary" title={t("coach.verify")}><BadgeCheck size={16} /></button>
        <button onClick={() => navigate(`/app/coaches/${c.id}`)} className="text-muted hover:text-primary"><Eye size={16} /></button>
        <button onClick={() => setModal(c)} className="text-muted hover:text-primary"><Pencil size={16} /></button>
      </div>
    ) },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{t("coach.title")}</h1>
        <p className="text-sub text-sm">{t("coach.sub", { count: data?.length ?? 0 })}</p>
      </div>
      <div className="flex gap-2 mb-5">
        {(["list", "bookings"] as const).map((tb) => (
          <button key={tb} onClick={() => setTab(tb)} className={`px-3 py-1.5 rounded-lg text-sm ${tab === tb ? "bg-primary/15 text-primary" : "bg-card text-sub hover:text-white"}`}>
            {t(tb === "list" ? "coach.tabList" : "coach.tabBookings")}
          </button>
        ))}
      </div>
      {tab === "list" ? (
        <>
          <input className="input max-w-sm mb-4" placeholder={t("coach.searchPh")} value={search} onChange={(e) => setSearch(e.target.value)} />
          <Table columns={columns} rows={data ?? []} loading={isLoading} empty={t("coach.empty")} />
        </>
      ) : <BookingsView />}
      {modal && <CoachModal coach={modal} onClose={() => setModal(null)} />}
    </div>
  );
}
