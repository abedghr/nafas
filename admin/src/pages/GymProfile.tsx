import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ChevronLeft, Star, Pencil, Power, MapPin, Phone, Clock, Users as UsersIcon, Plus, Trash2, Dumbbell, MessageSquare, Shield } from "lucide-react";
import { useGym, useGymMutations, useGymRequests, useClasses, useClassMutations, useGymReviews, useReviewMutations, useGymTeam, useTeamMutations } from "../hooks/gyms";
import { useFacilities } from "../hooks/facilities";
import { useCoaches } from "../hooks/coaches";
import { useUsers } from "../hooks/users";
import { useCountries } from "../hooks/countries";
import { GymModal } from "./Gyms";
import type { GymInput, ClassInput, GymClassRow } from "../services/gyms";
import { t } from "../lib/i18n";

const WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

function TeamSection({ gymId }: { gymId: string }) {
  const { data: team } = useGymTeam(gymId);
  const { data: users } = useUsers({ page: 1, perPage: 200 });
  const { add, remove } = useTeamMutations(gymId);
  const [pick, setPick] = useState("");
  const memberIds = new Set([team?.owner?.id, ...(team?.members ?? []).map((m) => m.userId)].filter(Boolean));
  const candidates = (users?.data ?? []).filter((u) => !memberIds.has(u.id));
  return (
    <div className="card p-5">
      <div className="text-xs font-semibold text-primary uppercase tracking-wide flex items-center gap-2 mb-3"><Shield size={14} /> {t("gyms.team")}</div>
      <div className="space-y-2 mb-4">
        {team?.owner && (
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">{team.owner.name} <span className="text-muted text-xs">{team.owner.email}</span></span>
            <span className="px-2 py-0.5 rounded-lg text-xs bg-primary/15 text-primary">{t("gyms.roleOwner")}</span>
          </div>
        )}
        {(team?.members ?? []).map((m) => (
          <div key={m.id} className="flex items-center justify-between text-sm">
            <span className="font-medium">{m.name} <span className="text-muted text-xs">{m.email}</span></span>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-lg text-xs bg-card-alt text-sub">{t("gyms.roleManager")}</span>
              <button onClick={() => remove.mutate(m.id!)} className="text-muted hover:text-accent"><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
        {!team?.owner && !(team?.members?.length) && <p className="text-muted text-sm">{t("gyms.noTeam")}</p>}
      </div>
      <div className="flex gap-2">
        <select className="input flex-1" value={pick} onChange={(e) => setPick(e.target.value)}>
          <option value="">{t("gyms.addManager")}</option>
          {candidates.map((u) => <option key={u.id} value={u.id}>{u.name} · {u.email}</option>)}
        </select>
        <button onClick={() => { if (pick) { add.mutate(pick); setPick(""); } }} disabled={!pick || add.isPending} className="btn-primary text-xs px-3 disabled:opacity-50"><Plus size={15} /></button>
      </div>
    </div>
  );
}

function ReviewsSection({ gymId }: { gymId: string }) {
  const { data: reviews } = useGymReviews(gymId);
  const { remove } = useReviewMutations(gymId);
  return (
    <div className="card p-5">
      <div className="text-xs font-semibold text-primary uppercase tracking-wide flex items-center gap-2 mb-3"><MessageSquare size={14} /> {t("gyms.reviews")}</div>
      {reviews && reviews.length > 0 ? (
        <div className="space-y-3">
          {reviews.map((r) => (
            <div key={r.id} className="flex items-start justify-between gap-3 border-b border-line/40 pb-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{r.userName ?? "—"}</span>
                  <span className="flex items-center gap-0.5 text-primary text-xs">
                    {Array.from({ length: 5 }).map((_, i) => <Star key={i} size={11} className={i < r.rating ? "fill-primary text-primary" : "text-line"} />)}
                  </span>
                </div>
                {r.comment && <p className="text-sub text-sm mt-1">{r.comment}</p>}
              </div>
              <button onClick={() => confirm(t("gyms.deleteReviewConfirm")) && remove.mutate(r.id)} className="text-muted hover:text-accent shrink-0"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      ) : <p className="text-muted text-sm">{t("gyms.noReviews")}</p>}
    </div>
  );
}

export function ClassesSection({ gymId, eventId }: { gymId?: string; eventId?: string }) {
  const scopeKey = eventId ?? gymId ?? "";
  const { data: classes } = useClasses({ gymId, eventId });
  const { data: coaches } = useCoaches("");
  const { create, update, remove } = useClassMutations(scopeKey);
  const [draft, setDraft] = useState<Partial<ClassInput> | null>(null);
  const coachName = (id: string | null) => coaches?.find((c) => c.id === id)?.name ?? "—";

  const blank: Partial<ClassInput> = { gymId: gymId ?? null, eventId: eventId ?? null, title: "", description: "", coachId: null, dayOfWeek: "mon", startTime: "18:00", duration: "60 min", capacity: 15, isActive: true, translations: { ar: {} } };
  const save = () => {
    if (!draft?.title?.trim()) return;
    const done = () => setDraft(null);
    if ((draft as GymClassRow).id) update.mutate({ id: (draft as GymClassRow).id, data: draft }, { onSuccess: done });
    else create.mutate(draft, { onSuccess: done });
  };
  const setAr = (patch: { title?: string }) => setDraft((d) => ({ ...d, translations: { ...d?.translations, ar: { ...(d?.translations?.ar ?? {}), ...patch } } }));
  const busy = create.isPending || update.isPending;

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs font-semibold text-primary uppercase tracking-wide flex items-center gap-2"><Dumbbell size={14} /> {t("gyms.classes")}</div>
        {!draft && <button onClick={() => setDraft(blank)} className="flex items-center gap-1.5 text-sm text-sub hover:text-primary"><Plus size={14} /> {t("gyms.addClass")}</button>}
      </div>

      {draft && (
        <div className="mb-4 space-y-2 rounded-xl border border-line p-3">
          <div className="grid sm:grid-cols-2 gap-2">
            <input className="input" placeholder={t("gyms.classTitle")} value={draft.title ?? ""} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
            <input className="input" placeholder={t("gyms.classTitleAr")} dir="rtl" value={draft.translations?.ar?.title ?? ""} onChange={(e) => setAr({ title: e.target.value })} />
            <select className="input" value={draft.coachId ?? ""} onChange={(e) => setDraft({ ...draft, coachId: e.target.value || null })}>
              <option value="">{t("gyms.noCoach")}</option>
              {coaches?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select className="input" value={draft.dayOfWeek ?? ""} onChange={(e) => setDraft({ ...draft, dayOfWeek: e.target.value || null })}>
              {WEEKDAYS.map((d) => <option key={d} value={d}>{t(`weekdays.${d}`)}</option>)}
            </select>
            <input className="input" placeholder={t("gyms.classTime")} value={draft.startTime ?? ""} onChange={(e) => setDraft({ ...draft, startTime: e.target.value })} />
            <input className="input" placeholder={t("gyms.classDuration")} value={draft.duration ?? ""} onChange={(e) => setDraft({ ...draft, duration: e.target.value })} />
            <input className="input" type="number" placeholder={t("gyms.classCapacity")} value={draft.capacity ?? 0} onChange={(e) => setDraft({ ...draft, capacity: Number(e.target.value) })} />
          </div>
          <div className="flex gap-2">
            <button onClick={save} disabled={busy} className="btn-primary text-xs px-3 py-1.5 disabled:opacity-50">{busy ? t("common.saving") : t("common.save")}</button>
            <button onClick={() => setDraft(null)} className="px-3 py-1.5 rounded-lg border border-line text-sub text-xs">{t("common.cancel")}</button>
          </div>
        </div>
      )}

      {classes && classes.length > 0 ? (
        <div className="space-y-2">
          {classes.map((c) => (
            <div key={c.id} className="flex items-center justify-between text-sm border-b border-line/40 pb-2">
              <div>
                <div className="font-medium">{c.title}</div>
                <div className="text-muted text-xs">{[c.dayOfWeek && t(`weekdays.${c.dayOfWeek}`), c.startTime, c.duration, coachName(c.coachId), c.capacity ? `${t("gyms.cap")} ${c.capacity}` : null].filter(Boolean).join(" · ")}</div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => setDraft({ ...c })} className="text-sub hover:text-primary"><Pencil size={14} /></button>
                <button onClick={() => confirm(t("common.deleteConfirm", { name: c.title })) && remove.mutate(c.id)} className="text-muted hover:text-accent"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      ) : !draft && <p className="text-muted text-sm">{t("gyms.noClasses")}</p>}
    </div>
  );
}

export function GymProfile() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { data: gym, isLoading } = useGym(id);
  const { data: facilities } = useFacilities();
  const { data: countries } = useCountries({ page: 1, perPage: 100 });
  const { data: requests } = useGymRequests();
  const { update, remove } = useGymMutations();
  const [editing, setEditing] = useState(false);
  const [editFac, setEditFac] = useState(false);
  const [draftFac, setDraftFac] = useState<string[]>([]);

  if (isLoading || !gym) return <div className="text-sub">{t("common.loading")}</div>;

  const countryName = countries?.data?.find((c) => c.id === gym.countryId)?.name ?? "—";
  const facIds = gym.facilityIds ?? [];
  const gymRequests = (requests ?? []).filter((r) => r.gymId === gym.id).slice(0, 5);

  const toggleStatus = () => update.mutate({ id: gym.id, data: { isActive: !gym.isActive } });
  const startEditFac = () => { setDraftFac(facIds); setEditFac(true); };
  const toggleDraft = (fid: string) => setDraftFac((d) => d.includes(fid) ? d.filter((x) => x !== fid) : [...d, fid]);
  const saveFac = () => update.mutate({ id: gym.id, data: { facilityIds: draftFac } }, { onSuccess: () => setEditFac(false) });

  const editInitial: Partial<GymInput> = { ...(gym as any), translations: { ar: gym.translations?.ar ?? {} } };

  return (
    <div className="space-y-6">
      <Link to="/app/gyms" className="inline-flex items-center gap-1 text-sub hover:text-white text-sm"><ChevronLeft size={16} /> {t("gyms.back")}</Link>

      {/* header */}
      <div className="card overflow-hidden">
        <div className="h-36 bg-card-alt">
          {gym.coverUrl && <img src={gym.coverUrl} className="w-full h-full object-cover" />}
        </div>
        <div className="px-5 pb-5 pt-3 flex items-end gap-4">
          <div className="relative z-10 w-24 h-24 -mt-14 rounded-full overflow-hidden border-4 border-surface bg-primary/15 grid place-items-center shrink-0 shadow-lg">
            {gym.logoUrl ? <img src={gym.logoUrl} className="w-full h-full object-cover" /> : <UsersIcon size={30} className="text-primary" />}
          </div>
          <div className="min-w-0 pb-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold truncate">{gym.name}</h1>
              <span className={`px-2 py-0.5 rounded-lg text-xs shrink-0 ${gym.isActive ? "bg-primary/15 text-primary" : "bg-accent/15 text-accent"}`}>
                {gym.isActive ? t("gyms.statusActive") : t("gyms.statusInactive")}
              </span>
            </div>
            <div className="text-sub text-sm flex items-center gap-4 mt-1 flex-wrap">
              <span className="flex items-center gap-1"><MapPin size={13} /> {gym.city || gym.address} · {countryName}</span>
              <span className="flex items-center gap-1"><Star size={13} className="text-primary" /> {gym.rating}</span>
              <span className="flex items-center gap-1"><UsersIcon size={13} /> {gym.memberCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* quick actions */}
      <div className="card p-4">
        <div className="text-xs font-semibold text-primary uppercase tracking-wide mb-3">{t("gyms.quickActions")}</div>
        <div className="flex flex-wrap gap-2">
          <button onClick={toggleStatus} disabled={update.isPending}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm border ${gym.isActive ? "border-accent/40 text-accent" : "border-primary/40 text-primary"}`}>
            <Power size={15} /> {gym.isActive ? t("gyms.deactivate") : t("gyms.activate")}
          </button>
          <button onClick={() => setEditing(true)} className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm border border-line text-sub hover:text-white">
            <Pencil size={15} /> {t("gyms.editFull")}
          </button>
          <button onClick={() => confirm(t("common.deleteConfirm", { name: gym.name })) && remove.mutate(gym.id, { onSuccess: () => navigate("/app/gyms") })}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm border border-line text-muted hover:text-accent">
            {t("common.delete")}
          </button>
        </div>
      </div>

      {/* facilities — view, then Edit → toggle → Save */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-semibold text-primary uppercase tracking-wide">{t("gyms.quickFacilities")}</div>
          {!editFac ? (
            <button onClick={startEditFac} className="flex items-center gap-1.5 text-sm text-sub hover:text-primary"><Pencil size={14} /> {t("gyms.editBtn")}</button>
          ) : (
            <div className="flex gap-2">
              <button onClick={saveFac} disabled={update.isPending} className="btn-primary text-xs px-3 py-1.5 disabled:opacity-50">{update.isPending ? t("common.saving") : t("common.save")}</button>
              <button onClick={() => setEditFac(false)} className="px-3 py-1.5 rounded-lg border border-line text-sub text-xs">{t("common.cancel")}</button>
            </div>
          )}
        </div>
        {editFac ? (
          <div className="flex flex-wrap gap-2">
            {facilities?.map((fac) => {
              const on = draftFac.includes(fac.id);
              return (
                <button key={fac.id} onClick={() => toggleDraft(fac.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${on ? "bg-primary text-white border-primary" : "border-line text-sub hover:border-primary"}`}>
                  {fac.title}
                </button>
              );
            })}
          </div>
        ) : (
          (gym.facilities && gym.facilities.length > 0) ? (
            <div className="flex flex-wrap gap-2">
              {gym.facilities.map((fac) => (
                <span key={fac.id} className="px-3 py-1.5 rounded-full text-xs font-medium bg-primary/10 text-primary">{fac.title}</span>
              ))}
            </div>
          ) : <p className="text-muted text-sm">{t("gyms.noFacilities")}</p>
        )}
      </div>

      {/* classes management */}
      <ClassesSection gymId={gym.id} />

      {/* team */}
      <TeamSection gymId={gym.id} />

      {/* reviews moderation */}
      <ReviewsSection gymId={gym.id} />

      <div className="grid lg:grid-cols-2 gap-6">
        {/* about + details */}
        <div className="card p-5 space-y-3">
          <div className="text-xs font-semibold text-primary uppercase tracking-wide">{t("gyms.about")}</div>
          {gym.description && <p className="text-sub text-sm leading-relaxed">{gym.description}</p>}
          <div className="space-y-2 text-sm">
            {gym.workingHours && <div className="flex items-center gap-2 text-sub"><Clock size={14} /> {gym.workingHours}</div>}
            {gym.phone && <div className="flex items-center gap-2 text-sub"><Phone size={14} /> {gym.phone}</div>}
          </div>
          {!!gym.subscriptions?.length && (
            <div className="pt-2">
              <div className="text-sub text-xs mb-2">{t("gyms.subscriptions")}</div>
              <div className="space-y-1.5">
                {gym.subscriptions.map((s) => (
                  <div key={s.name} className="flex justify-between text-sm">
                    <span>{s.name}</span><span className="text-primary font-medium">{s.price.amount} {s.price.currency}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* recent requests */}
        <div className="card p-5">
          <div className="text-xs font-semibold text-primary uppercase tracking-wide mb-3">{t("gyms.recentRequests")}</div>
          {gymRequests.length === 0 ? <p className="text-muted text-sm">{t("gyms.reqEmpty")}</p> : (
            <div className="space-y-2">
              {gymRequests.map((r) => (
                <div key={r.id} className="flex items-center justify-between text-sm border-b border-line/40 pb-2">
                  <div><div className="font-medium">{r.userName}</div><div className="text-muted text-xs">{r.plan || "—"}</div></div>
                  <span className={`px-2 py-0.5 rounded-lg text-xs ${r.status === "approved" ? "bg-primary/15 text-primary" : r.status === "rejected" ? "bg-accent/15 text-accent" : "bg-card-alt text-sub"}`}>{t(`gyms.${r.status}`)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {editing && <GymModal initial={editInitial} editingId={gym.id} onClose={() => setEditing(false)} />}
    </div>
  );
}
