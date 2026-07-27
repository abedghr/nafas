// Weight unit display/input. All weights are STORED in kg (canonical); this only
// converts for display and for reading user input back to kg. ponytail: 1-decimal
// rounding on display — plate-level precision isn't needed for a tracking app.
export type WeightUnit = 'kg' | 'lb';

const LB_PER_KG = 2.2046226218;

// kg (stored) → number shown in the user's unit
export function toDisplayWeight(kg: number, unit: WeightUnit): number {
  if (!kg) return kg || 0;
  return unit === 'lb' ? Math.round(kg * LB_PER_KG * 10) / 10 : kg;
}

// user-entered number (in their unit) → kg for storage
export function fromDisplayWeight(value: number, unit: WeightUnit): number {
  if (!value) return value || 0;
  return unit === 'lb' ? Math.round((value / LB_PER_KG) * 100) / 100 : value;
}

// display string for a stored kg value, without the unit label (empty for 0/undefined)
export function fmtWeight(kg: number | undefined, unit: WeightUnit): string {
  if (!kg) return '';
  const v = toDisplayWeight(kg, unit);
  return Number.isInteger(v) ? String(v) : String(v);
}

export function unitLabel(unit: WeightUnit): string {
  return unit === 'lb' ? 'lb' : 'kg';
}
