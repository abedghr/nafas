import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2, Pencil, X, Star, Eye, Power, Check, Ban } from "lucide-react";
import { Table, type Column } from "../base-components/Table";
import { MapPicker } from "../base-components/MapPicker";
import { Section, ImageField } from "./Gyms";
import { useRestaurants, useRestaurantMutations, useReservations, useReservationMutations } from "../hooks/restaurants";
import { useCountries } from "../hooks/countries";
import { useUsers } from "../hooks/users";
import type { Restaurant, RestaurantInput, MenuItem, Reservation } from "../services/restaurants";
import { t } from "../lib/i18n";

const blank = (): Partial<RestaurantInput> => ({
  name: "", description: "", address: "", city: "", countryId: null, ownerId: null, logoUrl: null, coverUrl: null,
  lat: null, lng: null, rating: 0, phone: "", workingHours: "", priceRange: "$$", cuisines: [], menu: [],
  isActive: true, translations: { ar: {} },
});
const csv = (a?: string[]) => (a ?? []).join(", ");
const fromCsv = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);

export function RestaurantModal({ initial, editingId, onClose }: { initial: Partial<RestaurantInput>; editingId?: string; onClose: () => void }) {
  const { create, update } = useRestaurantMutations();
  const { data: countries } = useCountries({ page: 1, perPage: 100 });
  const { data: users } = useUsers({ page: 1, perPage: 100 });
  const [f, setF] = useState<Partial<RestaurantInput>>(initial);
  const [err, setErr] = useState("");
  const ar = f.translations?.ar ?? {};
  const setAr = (patch: Partial<{ name: string; description: string }>) => setF({ ...f, translations: { ...f.translations, ar: { ...ar, ...patch } } });
  const menu = f.menu ?? [];
  const setItem = (i: number, patch: Partial<MenuItem>) => setF({ ...f, menu: menu.map((m, idx) => (idx === i ? { ...m, ...patch } : m)) });

  const save = () => {
    setErr("");
    if (!f.name?.trim()) return setErr(t("common.nameRequiredEn"));
    const opts = { onSuccess: onClose, onError: (e: any) => setErr(e.response?.data?.message || e.message) };
    if (editingId) update.mutate({ id: editingId, data: f }, opts); else create.mutate(f, opts);
  };
  const field = (label: string, key: keyof RestaurantInput, type: "text" | "number" = "text") => (
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
          <h3 className="text-lg font-semibold">{editingId ? t("rest.edit") : t("rest.new")}</h3>
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
            {field(t("gyms.hours"), "workingHours")}
            {field(t("rest.priceRange"), "priceRange")}
          </div>
          <div>
            <div className="text-sub text-xs mb-1">{t("rest.cuisines")}</div>
            <input className="input w-full" value={csv(f.cuisines)} onChange={(e) => setF({ ...f, cuisines: fromCsv(e.target.value) })} />
          </div>
        </Section>

        <Section title={t("rest.menu")}>
          <div className="space-y-2">
            {menu.map((m, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input className="input flex-1" placeholder={t("rest.itemName")} value={m.name} onChange={(e) => setItem(i, { name: e.target.value })} />
                <input className="input flex-1" placeholder={t("rest.itemDesc")} value={m.description ?? ""} onChange={(e) => setItem(i, { description: e.target.value })} />
                <input className="input w-20" type="number" placeholder={t("rest.itemPrice")} value={m.price.amount} onChange={(e) => setItem(i, { price: { ...m.price, amount: Number(e.target.value) } })} />
                <input className="input w-16" placeholder={t("rest.itemCurrency")} value={m.price.currency} onChange={(e) => setItem(i, { price: { ...m.price, currency: e.target.value.toUpperCase() } })} />
                <input className="input w-20" type="number" placeholder={t("rest.itemCalories")} value={m.calories ?? ""} onChange={(e) => setItem(i, { calories: Number(e.target.value) })} />
                <button onClick={() => setF({ ...f, menu: menu.filter((_, idx) => idx !== i) })} className="text-muted hover:text-accent"><Trash2 size={16} /></button>
              </div>
            ))}
            <button onClick={() => setF({ ...f, menu: [...menu, { name: "", price: { amount: 0, currency: "JOD" } }] })} className="text-primary text-xs flex items-center gap-1"><Plus size={14} /> {t("rest.addItem")}</button>
          </div>
        </Section>

        <Section title={t("gyms.owner")}>
          <select className="input w-full lg:w-1/2" value={f.ownerId ?? ""} onChange={(e) => setF({ ...f, ownerId: e.target.value || null })}>
            <option value="">{t("gyms.noOwner")}</option>
            {users?.data?.map((u) => <option key={u.id} value={u.id}>{u.name} · {u.email}</option>)}
          </select>
        </Section>

        <label className="flex items-center gap-2 text-sm text-sub">
          <input type="checkbox" checked={f.isActive ?? true} onChange={(e) => setF({ ...f, isActive: e.target.checked })} /> {t("gyms.active")}
        </label>

        {err && <p className="text-accent text-sm">{err}</p>}
        <div className="flex gap-2">
          <button className="btn-primary disabled:opacity-50" onClick={save} disabled={create.isPending || update.isPending}>
            {create.isPending || update.isPending ? t("common.saving") : t("rest.save")}
          </button>
          <button className="px-4 py-2.5 rounded-xl border border-line text-sub" onClick={onClose}>{t("common.cancel")}</button>
        </div>
      </div>
    </div>
  );
}

function ReservationsView() {
  const { data, isLoading } = useReservations();
  const { setStatus } = useReservationMutations();
  const badge = (s: string) => s === "approved" ? "bg-primary/15 text-primary" : s === "rejected" ? "bg-accent/15 text-accent" : "bg-card-alt text-sub";
  const columns: Column<Reservation>[] = [
    { key: "user", header: t("gyms.reqUser"), render: (r) => (<div><div className="font-medium">{r.userName}</div><div className="text-muted text-xs">{r.userEmail}</div></div>) },
    { key: "rest", header: t("rest.colRestaurant"), render: (r) => <span className="text-sub">{r.restaurantName}</span> },
    { key: "when", header: t("rest.resWhen"), render: (r) => <span className="text-sub text-xs">{r.date || "—"}</span> },
    { key: "party", header: t("rest.resParty"), render: (r) => <span className="text-sub text-xs">{r.partySize}</span> },
    { key: "status", header: t("gyms.reqStatus"), render: (r) => <span className={`px-2 py-1 rounded-lg text-xs ${badge(r.status)}`}>{t(`gyms.${r.status}`)}</span> },
    {
      key: "actions", header: "",
      render: (r) => r.status === "pending" ? (
        <div className="flex gap-2">
          <button onClick={() => setStatus.mutate({ id: r.id, status: "approved" })} className="text-muted hover:text-primary"><Check size={16} /></button>
          <button onClick={() => setStatus.mutate({ id: r.id, status: "rejected" })} className="text-muted hover:text-accent"><Ban size={16} /></button>
        </div>
      ) : null,
    },
  ];
  return <Table columns={columns} rows={data ?? []} loading={isLoading} empty={t("rest.resEmpty")} />;
}

export function Restaurants() {
  const [tab, setTab] = useState<"list" | "reservations">("list");
  const [search, setSearch] = useState("");
  const { data, isLoading } = useRestaurants(search);
  const { data: countries } = useCountries({ page: 1, perPage: 100 });
  const { remove, update } = useRestaurantMutations();
  const navigate = useNavigate();
  const [modal, setModal] = useState<{ initial: Partial<RestaurantInput>; id?: string } | null>(null);
  const countryName = (id: string | null) => countries?.data?.find((c) => c.id === id)?.name ?? "—";
  const openEdit = (r: Restaurant) => setModal({ id: r.id, initial: { ...r, translations: { ar: r.translations?.ar ?? {} } } });

  const columns: Column<Restaurant>[] = [
    { key: "name", header: t("rest.colRestaurant"), render: (r) => (
      <button onClick={() => navigate(`/app/restaurants/${r.id}`)} className="flex items-center gap-3 text-left hover:opacity-80">
        {r.logoUrl ? <img src={r.logoUrl} className="w-9 h-9 rounded-lg object-cover" /> : <div className="w-9 h-9 rounded-lg bg-primary/10" />}
        <div><div className="font-medium">{r.name}</div><div className="text-muted text-xs">{r.city || r.address}</div></div>
      </button>
    ) },
    { key: "country", header: t("gyms.colCountry"), render: (r) => <span className="text-sub text-sm">{countryName(r.countryId)}</span> },
    { key: "rating", header: t("gyms.colRating"), render: (r) => <span className="text-sub text-xs flex items-center gap-1"><Star size={12} className="text-primary" /> {r.rating}</span> },
    { key: "price", header: t("rest.colPrice"), render: (r) => <span className="text-sub text-xs">{r.priceRange || "—"}</span> },
    {
      key: "status", header: t("gyms.reqStatus"),
      render: (r) => (
        <button onClick={() => update.mutate({ id: r.id, data: { isActive: !r.isActive } })}
          className={`px-2 py-1 rounded-lg text-xs flex items-center gap-1 ${r.isActive ? "bg-primary/15 text-primary" : "bg-accent/15 text-accent"}`}>
          <Power size={12} /> {r.isActive ? t("gyms.statusActive") : t("gyms.statusInactive")}
        </button>
      ),
    },
    {
      key: "actions", header: "",
      render: (r) => (
        <div className="flex gap-3">
          <button onClick={() => navigate(`/app/restaurants/${r.id}`)} className="text-muted hover:text-primary"><Eye size={16} /></button>
          <button onClick={() => openEdit(r)} className="text-muted hover:text-primary"><Pencil size={16} /></button>
          <button onClick={() => confirm(t("common.deleteConfirm", { name: r.name })) && remove.mutate(r.id)} className="text-muted hover:text-accent"><Trash2 size={16} /></button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{t("rest.title")}</h1>
          <p className="text-sub text-sm">{t("rest.sub", { count: data?.length ?? 0 })}</p>
        </div>
        {tab === "list" && <button className="btn-primary flex items-center gap-2" onClick={() => setModal({ initial: blank() })}><Plus size={18} /> {t("rest.add")}</button>}
      </div>

      <div className="flex gap-2 mb-5">
        {(["list", "reservations"] as const).map((tb) => (
          <button key={tb} onClick={() => setTab(tb)} className={`px-3 py-1.5 rounded-lg text-sm ${tab === tb ? "bg-primary/15 text-primary" : "bg-card text-sub hover:text-white"}`}>
            {t(tb === "list" ? "rest.tabList" : "rest.tabReservations")}
          </button>
        ))}
      </div>

      {tab === "list" ? (
        <>
          <input className="input max-w-sm mb-4" placeholder={t("rest.searchPh")} value={search} onChange={(e) => setSearch(e.target.value)} />
          <Table columns={columns} rows={data ?? []} loading={isLoading} empty={t("rest.empty")} />
        </>
      ) : <ReservationsView />}

      {modal && <RestaurantModal initial={modal.initial} editingId={modal.id} onClose={() => setModal(null)} />}
    </div>
  );
}
