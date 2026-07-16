import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FACILITIES_KEY, listFacilities, createFacility, updateFacility, deleteFacility, type FacilityInput } from "../services/facilities";

export const useFacilities = () => useQuery({ queryKey: [FACILITIES_KEY], queryFn: listFacilities });

export const useFacilityMutations = () => {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: [FACILITIES_KEY] });
  return {
    create: useMutation({ mutationFn: (d: FacilityInput) => createFacility(d), onSuccess: invalidate }),
    update: useMutation({ mutationFn: ({ id, data }: { id: string; data: Partial<FacilityInput> }) => updateFacility(id, data), onSuccess: invalidate }),
    remove: useMutation({ mutationFn: (id: string) => deleteFacility(id), onSuccess: invalidate }),
  };
};
