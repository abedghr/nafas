import axios from "../lib/axios";

// { grp: { key: { locale: value } } }
export type LabelMap = Record<string, Record<string, Record<string, string>>>;

export const LABELS_KEY = "labels";

export const getAllLabels = (grp?: string) =>
  axios.get<LabelMap>("/labels", { params: { grp } }).then((r) => r.data);

export const upsertLabel = (body: { grp: string; key: string; locale: string; value: string }) =>
  axios.put("/labels", body);

// resolve a label for display: requested lang → English → raw key
export const labelOf = (m: LabelMap | undefined, grp: string, key: string, lang: string) =>
  m?.[grp]?.[key]?.[lang] || m?.[grp]?.[key]?.["en"] || key;
