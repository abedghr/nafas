// Group a log's exercises so consecutive movements sharing a comboId collapse into
// one combo block (they were performed as one back-to-back combo set). Order preserved.
export type ComboGroup<T> =
  | { combo: false; ex: T }
  | { combo: true; comboId: string; label: string; unbroken: boolean; members: T[] };

export function groupByCombo<T extends { comboId?: string; comboLabel?: string; comboUnbroken?: boolean }>(
  exercises: T[],
): ComboGroup<T>[] {
  const out: ComboGroup<T>[] = [];
  for (const ex of exercises) {
    if (ex.comboId) {
      const last = out[out.length - 1];
      if (last && last.combo && last.comboId === ex.comboId) { last.members.push(ex); continue; }
      out.push({ combo: true, comboId: ex.comboId, label: ex.comboLabel || '', unbroken: !!ex.comboUnbroken, members: [ex] });
    } else {
      out.push({ combo: false, ex });
    }
  }
  return out;
}
