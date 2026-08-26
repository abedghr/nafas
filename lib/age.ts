// whole years between a birth date (ISO / YYYY-MM-DD) and today. null if unparseable/invalid.
export function ageFromISO(iso?: string | null): number | null {
  if (!iso) return null;
  const b = new Date(iso);
  if (isNaN(b.getTime())) return null;
  const now = new Date();
  let a = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) a--;
  return a >= 0 && a < 130 ? a : null;
}
