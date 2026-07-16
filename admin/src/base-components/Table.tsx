import type { ReactNode } from "react";

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
}

export function Table<T extends { id: string }>({
  columns,
  rows,
  loading,
  empty = "No records.",
}: {
  columns: Column<T>[];
  rows: T[];
  loading?: boolean;
  empty?: string;
}) {
  return (
    <div className="card overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-muted border-b border-line">
            {columns.map((c) => (
              <th key={c.key} className="px-4 py-3 font-medium">{c.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={columns.length} className="px-4 py-8 text-center text-muted">Loading…</td></tr>
          ) : rows.length === 0 ? (
            <tr><td colSpan={columns.length} className="px-4 py-8 text-center text-muted">{empty}</td></tr>
          ) : (
            rows.map((row) => (
              <tr key={row.id} className="border-b border-line/50 hover:bg-card-alt/40">
                {columns.map((c) => (
                  <td key={c.key} className="px-4 py-3">
                    {c.render ? c.render(row) : (row as any)[c.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
