import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ChevronLeft, Star, Pencil, BadgeCheck, Sparkles, Users as UsersIcon, Award } from "lucide-react";
import { useCoach, useCoachMutations, useBookings } from "../hooks/coaches";
import { CoachModal } from "./Coaches";
import { t } from "../lib/i18n";

export function CoachProfile() {
  const { id = "" } = useParams();
  const { data: c, isLoading } = useCoach(id);
  const { update } = useCoachMutations();
  const { data: bookings } = useBookings();
  const [editing, setEditing] = useState(false);

  if (isLoading || !c) return <div className="text-sub">{t("common.loading")}</div>;
  const mine = (bookings ?? []).filter((b) => b.coachId === c.id).slice(0, 5);
  const vbadge = c.verificationStatus === "verified" ? "bg-primary/15 text-primary" : c.verificationStatus === "rejected" ? "bg-accent/15 text-accent" : "bg-card-alt text-sub";

  return (
    <div className="space-y-6">
      <Link to="/app/coaches" className="inline-flex items-center gap-1 text-sub hover:text-white text-sm"><ChevronLeft size={16} /> {t("gyms.back")}</Link>

      <div className="card overflow-hidden">
        <div className="h-36 bg-card-alt">{c.coverUrl && <img src={c.coverUrl} className="w-full h-full object-cover" />}</div>
        <div className="px-5 pb-5 pt-3 flex items-end gap-4">
          <div className="relative z-10 w-24 h-24 -mt-14 rounded-full overflow-hidden border-4 border-surface bg-primary/15 grid place-items-center shrink-0 shadow-lg">
            {c.avatarUrl ? <img src={c.avatarUrl} className="w-full h-full object-cover" /> : <UsersIcon size={28} className="text-primary" />}
          </div>
          <div className="min-w-0 pb-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold truncate">{c.name}</h1>
              {c.isFeatured && <span className="flex items-center gap-1 text-primary text-xs"><Sparkles size={13} /> {t("coach.featured")}</span>}
              <span className={`px-2 py-0.5 rounded-lg text-xs ${vbadge}`}>{t(`coach.${c.verificationStatus}`)}</span>
            </div>
            <div className="text-sub text-sm mt-1">{c.headline}</div>
            <div className="text-sub text-sm flex items-center gap-4 mt-1 flex-wrap">
              <span className="flex items-center gap-1"><Star size={13} className="text-primary" /> {c.rating} ({c.reviewsCount})</span>
              <span className="flex items-center gap-1"><UsersIcon size={13} /> {c.clientsCount}</span>
              {c.pricePerSession && <span className="text-primary font-medium">{c.pricePerSession.amount} {c.pricePerSession.currency}</span>}
            </div>
          </div>
        </div>
      </div>

      <div className="card p-4">
        <div className="text-xs font-semibold text-primary uppercase tracking-wide mb-3">{t("gyms.quickActions")}</div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => update.mutate({ id: c.id, data: { verificationStatus: c.verificationStatus === "verified" ? "pending" : "verified" } })} disabled={update.isPending}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm border border-primary/40 text-primary"><BadgeCheck size={15} /> {t("coach.verify")}</button>
          <button onClick={() => update.mutate({ id: c.id, data: { isFeatured: !c.isFeatured } })} disabled={update.isPending}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm border border-line text-sub hover:text-white"><Sparkles size={15} /> {c.isFeatured ? t("coach.unfeature") : t("coach.feature")}</button>
          <button onClick={() => setEditing(true)} className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm border border-line text-sub hover:text-white"><Pencil size={15} /> {t("gyms.editFull")}</button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card p-5 space-y-3">
          <div className="text-xs font-semibold text-primary uppercase tracking-wide">{t("coach.about")}</div>
          {c.bio && <p className="text-sub text-sm leading-relaxed">{c.bio}</p>}
          {c.specialty.length > 0 && <div className="flex flex-wrap gap-1.5">{c.specialty.map((s) => <span key={s} className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px]">{s}</span>)}</div>}
          {c.certifications.length > 0 && (
            <div className="space-y-1 pt-1">
              {c.certifications.map((cert) => <div key={cert} className="flex items-center gap-2 text-sm text-sub"><Award size={13} className="text-primary" /> {cert}</div>)}
            </div>
          )}
        </div>

        <div className="card p-5">
          <div className="text-xs font-semibold text-primary uppercase tracking-wide mb-3">{t("coach.recentBookings")}</div>
          {mine.length === 0 ? <p className="text-muted text-sm">{t("coach.bEmpty")}</p> : (
            <div className="space-y-2">
              {mine.map((b) => (
                <div key={b.id} className="flex items-center justify-between text-sm border-b border-line/40 pb-2">
                  <div><div className="font-medium">{b.clientName}</div><div className="text-muted text-xs">{b.date || "—"}</div></div>
                  <span className={`px-2 py-0.5 rounded-lg text-xs ${b.status === "approved" ? "bg-primary/15 text-primary" : b.status === "rejected" ? "bg-accent/15 text-accent" : "bg-card-alt text-sub"}`}>{t(`gyms.${b.status}`)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {editing && <CoachModal coach={c} onClose={() => setEditing(false)} />}
    </div>
  );
}
