import type { Patient } from "@/types/patient";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!response.ok) {
    throw new Error(`API error ${response.status}: ${response.statusText}`);
  }
  return response.json() as Promise<T>;
}

export type PatientsResponse = {
  items: Patient[];
  total: number;
  page: number;
  pageSize: number;
};

type JsonServerPaginatedResponse = {
  data: Patient[];
  items: number;
  first?: number;
  prev?: number | null;
  next?: number | null;
  last?: number;
  pages?: number;
};

export type PatientCreateRequest = Omit<Patient, "id">;
export type PatientUpdateRequest = Partial<Omit<Patient, "id">>;

function normalizePatientsResponse(
  payload: PatientsResponse | JsonServerPaginatedResponse | Patient[],
  params?: { page?: number; pageSize?: number }
): PatientsResponse {
  if (Array.isArray(payload)) {
    return {
      items: payload,
      total: payload.length,
      page: params?.page ?? 1,
      pageSize: params?.pageSize ?? payload.length,
    };
  }
  if ("data" in payload && Array.isArray(payload.data)) {
    return {
      items: payload.data,
      total: payload.items,
      page: params?.page ?? payload.first ?? 1,
      pageSize: params?.pageSize ?? payload.data.length,
    };
  }
  if ("total" in payload && "page" in payload && "pageSize" in payload) {
    return payload;
  }
  throw new Error("Unexpected patients response shape");
}

export const patientsApi = {
  list: async (params?: {
    page?: number;
    pageSize?: number;
    search?: string;
    status?: string;
  }) => {
    const query = new URLSearchParams();
    if (params?.page != null) query.set("_page", String(params.page));
    if (params?.pageSize != null)
      query.set("_per_page", String(params.pageSize));
    if (params?.search) query.set("q", params.search);
    if (params?.status) query.set("status", params.status);
    const qs = query.toString();
    const payload = await request<
      PatientsResponse | JsonServerPaginatedResponse | Patient[]
    >(`/patients${qs ? `?${qs}` : ""}`);
    return normalizePatientsResponse(payload, params);
  },

  get: (id: string) => request<Patient>(`/patients/${id}`),

  create: (body: PatientCreateRequest) =>
    request<Patient>("/patients", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  update: (id: string, body: PatientUpdateRequest) =>
    request<Patient>(`/patients/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  remove: (id: string) =>
    request<void>(`/patients/${id}`, { method: "DELETE" }),
};
