import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ChevronLeft, Star, Pencil, Power, MapPin, Phone, Clock, UtensilsCrossed } from "lucide-react";
import { useRestaurant, useRestaurantMutations, useReservations } from "../hooks/restaurants";
import { useCountries } from "../hooks/countries";
import { RestaurantModal } from "./Restaurants";
import type { RestaurantInput } from "../services/restaurants";
import { t } from "../lib/i18n";

export function RestaurantProfile() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { data: r, isLoading } = useRestaurant(id);
  const { data: countries } = useCountries({ page: 1, perPage: 100 });
  const { data: reservations } = useReservations();
  const { update, remove } = useRestaurantMutations();
  const [editing, setEditing] = useState(false);

  if (isLoading || !r) return <div className="text-sub">{t("common.loading")}</div>;

  const countryName = countries?.data?.find((c) => c.id === r.countryId)?.name ?? "—";
  const resForThis = (reservations ?? []).filter((x) => x.restaurantId === r.id).slice(0, 5);
  const toggleStatus = () => update.mutate({ id: r.id, data: { isActive: !r.isActive } });
  const editInitial: Partial<RestaurantInput> = { ...(r as any), translations: { ar: r.translations?.ar ?? {} } };

  return (
    <div className="space-y-6">
      <Link to="/app/restaurants" className="inline-flex items-center gap-1 text-sub hover:text-white text-sm"><ChevronLeft size={16} /> {t("gyms.back")}</Link>

      <div className="card overflow-hidden">
        <div className="h-36 bg-card-alt">{r.coverUrl && <img src={r.coverUrl} className="w-full h-full object-cover" />}</div>
        <div className="px-5 pb-5 pt-3 flex items-end gap-4">
          <div className="relative z-10 w-24 h-24 -mt-14 rounded-full overflow-hidden border-4 border-surface bg-primary/15 grid place-items-center shrink-0 shadow-lg">
            {r.logoUrl ? <img src={r.logoUrl} className="w-full h-full object-cover" /> : <UtensilsCrossed size={28} className="text-primary" />}
          </div>
          <div className="min-w-0 pb-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold truncate">{r.name}</h1>
              <span className={`px-2 py-0.5 rounded-lg text-xs shrink-0 ${r.isActive ? "bg-primary/15 text-primary" : "bg-accent/15 text-accent"}`}>
                {r.isActive ? t("gyms.statusActive") : t("gyms.statusInactive")}
              </span>
            </div>
            <div className="text-sub text-sm flex items-center gap-4 mt-1 flex-wrap">
              <span className="flex items-center gap-1"><MapPin size={13} /> {r.city || r.address} · {countryName}</span>
              <span className="flex items-center gap-1"><Star size={13} className="text-primary" /> {r.rating}</span>
              {r.priceRange && <span>{r.priceRange}</span>}
            </div>
          </div>
        </div>
      </div>

      <div className="card p-4">
        <div className="text-xs font-semibold text-primary uppercase tracking-wide mb-3">{t("gyms.quickActions")}</div>
        <div className="flex flex-wrap gap-2">
          <button onClick={toggleStatus} disabled={update.isPending}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm border ${r.isActive ? "border-accent/40 text-accent" : "border-primary/40 text-primary"}`}>
            <Power size={15} /> {r.isActive ? t("gyms.deactivate") : t("gyms.activate")}
          </button>
          <button onClick={() => setEditing(true)} className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm border border-line text-sub hover:text-white">
            <Pencil size={15} /> {t("gyms.editFull")}
          </button>
          <button onClick={() => confirm(t("common.deleteConfirm", { name: r.name })) && remove.mutate(r.id, { onSuccess: () => navigate("/app/restaurants") })}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm border border-line text-muted hover:text-accent">{t("common.delete")}</button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card p-5 space-y-3">
          <div className="text-xs font-semibold text-primary uppercase tracking-wide">{t("gyms.about")}</div>
          {r.description && <p className="text-sub text-sm leading-relaxed">{r.description}</p>}
          <div className="space-y-2 text-sm">
            {r.workingHours && <div className="flex items-center gap-2 text-sub"><Clock size={14} /> {r.workingHours}</div>}
            {r.phone && <div className="flex items-center gap-2 text-sub"><Phone size={14} /> {r.phone}</div>}
          </div>
          {!!r.menu?.length && (
            <div className="pt-2">
              <div className="text-sub text-xs mb-2">{t("rest.menu")}</div>
              <div className="space-y-1.5">
                {r.menu.map((m, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="truncate">{m.name}{m.calories ? <span className="text-muted text-xs"> · {m.calories} kcal</span> : null}</span>
                    <span className="text-primary font-medium shrink-0">{m.price.amount} {m.price.currency}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="card p-5">
          <div className="text-xs font-semibold text-primary uppercase tracking-wide mb-3">{t("rest.recentReservations")}</div>
          {resForThis.length === 0 ? <p className="text-muted text-sm">{t("rest.resEmpty")}</p> : (
            <div className="space-y-2">
              {resForThis.map((x) => (
                <div key={x.id} className="flex items-center justify-between text-sm border-b border-line/40 pb-2">
                  <div><div className="font-medium">{x.userName}</div><div className="text-muted text-xs">{x.date || "—"} · {x.partySize}</div></div>
                  <span className={`px-2 py-0.5 rounded-lg text-xs ${x.status === "approved" ? "bg-primary/15 text-primary" : x.status === "rejected" ? "bg-accent/15 text-accent" : "bg-card-alt text-sub"}`}>{t(`gyms.${x.status}`)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {editing && <RestaurantModal initial={editInitial} editingId={r.id} onClose={() => setEditing(false)} />}
    </div>
  );
}
