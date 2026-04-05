"use client";

import {
    PatientCreateRequest,
    patientsApi,
    PatientUpdateRequest,
} from "@/lib/api/patients";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const patientKeys = {
  all: ["patients"] as const,
  list: (params?: object) => [...patientKeys.all, "list", params] as const,
  detail: (id: string) => [...patientKeys.all, "detail", id] as const,
};

export function usePatients(params?: { search?: string; status?: string }) {
  return useQuery({
    queryKey: patientKeys.list(params),
    queryFn: () => patientsApi.list(params),
  });
}

export function usePatient(id: string) {
  return useQuery({
    queryKey: patientKeys.detail(id),
    queryFn: () => patientsApi.get(id),
    enabled: !!id,
  });
}

export function useCreatePatient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: PatientCreateRequest) => patientsApi.create(body),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: patientKeys.all }),
  });
}

export function useUpdatePatient(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: PatientUpdateRequest) => patientsApi.update(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: patientKeys.all });
      queryClient.invalidateQueries({ queryKey: patientKeys.detail(id) });
    },
  });
}

export function useDeletePatient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => patientsApi.remove(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: patientKeys.all }),
  });
}
