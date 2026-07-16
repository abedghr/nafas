// Mirrors the backend's typed responses (core/http.ts).
export interface PageMeta {
  page: number;
  perPage: number;
  total: number;
}

export interface ListResponse<T> {
  data: T[];
  meta: PageMeta;
}

export interface PaginationRequest {
  page?: number;
  perPage?: number;
  search?: string;
  orderBy?: string;
  orderDirection?: "asc" | "desc";
}

export interface ApiErrorBody {
  code: string;
  message: string;
  details?: unknown;
}
