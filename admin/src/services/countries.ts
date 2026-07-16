import axios from "../lib/axios";
import type { ListResponse, PaginationRequest } from "../types/api";

export interface Country {
  id: string;
  code: string;
  name: string;
  currency: string;
  phoneCode: string;
  language: string;
  locale: string;
  timezone: string;
  isActive: boolean;
}

export type CountryInput = Omit<Country, "id">;

export const COUNTRIES_KEY = "countries";

export const listCountries = (params: PaginationRequest) =>
  axios.get<ListResponse<Country>>("/countries", { params }).then((r) => r.data);

export const createCountry = (data: CountryInput) =>
  axios.post<Country>("/countries", data).then((r) => r.data);

export const updateCountry = (id: string, data: Partial<CountryInput>) =>
  axios.patch<Country>(`/countries/${id}`, data).then((r) => r.data);

export const deleteCountry = (id: string) => axios.delete(`/countries/${id}`);
