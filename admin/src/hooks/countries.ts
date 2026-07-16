import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  COUNTRIES_KEY, listCountries, createCountry, updateCountry, deleteCountry,
  type CountryInput,
} from "../services/countries";
import type { PaginationRequest } from "../types/api";

export const useCountries = (params: PaginationRequest) =>
  useQuery({ queryKey: [COUNTRIES_KEY, params], queryFn: () => listCountries(params) });

export const useCountryMutations = () => {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: [COUNTRIES_KEY] });
  return {
    create: useMutation({ mutationFn: (d: CountryInput) => createCountry(d), onSuccess: invalidate }),
    update: useMutation({
      mutationFn: ({ id, data }: { id: string; data: Partial<CountryInput> }) => updateCountry(id, data),
      onSuccess: invalidate,
    }),
    remove: useMutation({ mutationFn: (id: string) => deleteCountry(id), onSuccess: invalidate }),
  };
};
