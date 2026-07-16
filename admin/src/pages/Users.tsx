import { useState } from "react";
import { Table, type Column } from "../base-components/Table";
import { useUsers, useUpdateUser } from "../hooks/users";
import type { AdminUser } from "../services/users";
import { t } from "../lib/i18n";

export function Users() {
  const [search, setSearch] = useState("");
  const { data, isLoading } = useUsers({ page: 1, perPage: 50, search: search || undefined });
  const updateUser = useUpdateUser();

  const columns: Column<AdminUser>[] = [
    {
      key: "name", header: t("users.colUser"),
      render: (u) => (
        <div>
          <div className="font-medium">{u.name}</div>
          <div className="text-muted text-xs">@{u.username} · {u.email}</div>
        </div>
      ),
    },
    {
      key: "role", header: t("users.colRole"),
      render: (u) => (
        <select
          value={u.role}
          onChange={(e) => updateUser.mutate({ id: u.id, data: { role: e.target.value as AdminUser["role"] } })}
          className="bg-bg border border-line rounded-lg px-2 py-1 text-xs"
        >
          {["athlete", "coach", "admin"].map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      ),
    },
    {
      key: "status", header: t("users.colStatus"),
      render: (u) => (
        <button
          onClick={() => updateUser.mutate({ id: u.id, data: { status: u.status === "active" ? "suspended" : "active" } })}
          className={`px-2 py-1 rounded-lg text-xs ${u.status === "active" ? "bg-primary/15 text-primary" : "bg-accent/15 text-accent"}`}
        >
          {u.status}
        </button>
      ),
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">{t("users.title")}</h1>
      <p className="text-sub text-sm mb-6">{t("users.sub")}</p>
      <input className="input max-w-sm mb-4" placeholder={t("users.searchPh")}
        value={search} onChange={(e) => setSearch(e.target.value)} />
      <Table columns={columns} rows={data?.data ?? []} loading={isLoading} empty={t("users.empty")} />
    </div>
  );
}
