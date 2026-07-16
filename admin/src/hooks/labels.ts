import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LABELS_KEY, getAllLabels, upsertLabel } from "../services/labels";

export const useAllLabels = (grp?: string) =>
  useQuery({ queryKey: [LABELS_KEY, grp ?? "all"], queryFn: () => getAllLabels(grp), staleTime: 5 * 60_000 });

export const useUpsertLabel = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: upsertLabel,
    onSuccess: () => qc.invalidateQueries({ queryKey: [LABELS_KEY] }),
  });
};
