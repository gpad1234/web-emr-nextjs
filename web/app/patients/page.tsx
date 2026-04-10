"use client";

import { usePatients } from "@/lib/hooks/usePatients";
import type { Patient, PatientStatus } from "@/types/patient";
import type { AcuityResult } from "@/app/api/acuity-score/route";
import {
    Badge,
    Card,
    Flex,
    Select,
    SelectItem,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeaderCell,
    TableRow,
    Text,
    TextInput,
    Title,
} from "@tremor/react";
import Link from "next/link";
import { useState, useCallback } from "react";

const statusColor: Record<PatientStatus, "red" | "amber" | "emerald" | "slate"> = {
  critical: "red",
  recovering: "amber",
  stable: "emerald",
  discharged: "slate",
};

const acuityStyle: Record<number, { label: string; className: string }> = {
  1: { label: "1", className: "bg-red-600 text-white" },
  2: { label: "2", className: "bg-orange-500 text-white" },
  3: { label: "3", className: "bg-yellow-400 text-slate-900" },
  4: { label: "4", className: "bg-blue-100 text-blue-800" },
  5: { label: "5", className: "bg-slate-100 text-slate-500" },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function age(dob: string) {
  const diff = Date.now() - new Date(dob).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}

export default function PatientsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [acuityMap, setAcuityMap] = useState<Record<string, AcuityResult>>({});
  const [isScoring, setIsScoring] = useState(false);
  const [scoringError, setScoringError] = useState<string | null>(null);

  const { data, isLoading, isError } = usePatients({
    search: search || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
  });

  const patients = data?.items ?? [];

  const scoreAcuity = useCallback(async () => {
    if (patients.length === 0) return;
    setIsScoring(true);
    setScoringError(null);
    try {
      const res = await fetch("/api/acuity-score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patients }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      const map: Record<string, AcuityResult> = {};
      for (const r of (json.results as AcuityResult[])) map[r.patientId] = r;
      setAcuityMap(map);
    } catch (e: unknown) {
      setScoringError(e instanceof Error ? e.message : "Scoring failed");
    } finally {
      setIsScoring(false);
    }
  }, [patients]);

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Text className="text-slate-500 text-xs font-semibold uppercase tracking-widest mb-1">
            Patient Registry
          </Text>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">All Patients</h1>
          {!isLoading && (
            <p className="text-slate-500 text-sm mt-1">
              {data?.total ?? 0} patients on census
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={scoreAcuity}
            disabled={isScoring || isLoading || patients.length === 0}
            className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-md bg-violet-50 text-violet-700 border border-violet-200 hover:bg-violet-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isScoring ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Scoring…
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.347.347A3.75 3.75 0 0112 15.75a3.75 3.75 0 01-2.797-1.253l-.347-.347z" />
                </svg>
                Score Acuity
              </>
            )}
          </button>
          <Link
            href="/patients/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Patient
          </Link>
        </div>
      </div>
      {scoringError && (
        <p className="text-xs text-red-600">{scoringError}</p>
      )}

      {/* Filters */}
      <Flex className="gap-3" justifyContent="start">
        <TextInput
          className="max-w-xs"
          placeholder="Search by name or MRN…"
          value={search}
          onValueChange={setSearch}
          icon={() => (
            <svg className="w-4 h-4 text-slate-400 ml-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          )}
        />
        <Select
          className="max-w-[160px]"
          value={statusFilter}
          onValueChange={setStatusFilter}
        >
          <SelectItem value="all">All statuses</SelectItem>
          <SelectItem value="critical">Critical</SelectItem>
          <SelectItem value="recovering">Recovering</SelectItem>
          <SelectItem value="stable">Stable</SelectItem>
          <SelectItem value="discharged">Discharged</SelectItem>
        </Select>
      </Flex>

      {/* Table */}
      <Card className="p-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <Title>Patient List</Title>
        </div>

        {isError && (
          <div className="px-6 py-8 text-center">
            <p className="text-red-500 text-sm font-medium">Unable to load patients.</p>
            <p className="text-slate-400 text-xs mt-1">Check that json-server is running on port 3001.</p>
          </div>
        )}

        {isLoading && (
          <div className="px-6 py-8 text-center">
            <p className="text-slate-400 text-sm animate-pulse">Loading patients…</p>
          </div>
        )}

        {!isLoading && !isError && (
          <Table>
            <TableHead>
              <TableRow className="bg-slate-50">
                <TableHeaderCell className="text-xs uppercase tracking-wide text-slate-500 font-semibold">
                  Patient
                </TableHeaderCell>
                <TableHeaderCell className="text-xs uppercase tracking-wide text-slate-500 font-semibold">
                  MRN
                </TableHeaderCell>
                <TableHeaderCell className="text-xs uppercase tracking-wide text-slate-500 font-semibold">
                  Age / Sex
                </TableHeaderCell>
                <TableHeaderCell className="text-xs uppercase tracking-wide text-slate-500 font-semibold">
                  Status
                </TableHeaderCell>
                <TableHeaderCell className="text-xs uppercase tracking-wide text-slate-500 font-semibold">
                  Provider
                </TableHeaderCell>
                <TableHeaderCell className="text-xs uppercase tracking-wide text-slate-500 font-semibold">
                  Last Visit
                </TableHeaderCell>
                <TableHeaderCell className="text-xs uppercase tracking-wide text-slate-500 font-semibold">
                  Flags
                </TableHeaderCell>
                {Object.keys(acuityMap).length > 0 && (
                  <TableHeaderCell className="text-xs uppercase tracking-wide text-slate-500 font-semibold">
                    Acuity
                  </TableHeaderCell>
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {patients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-slate-400 py-10 text-sm">
                    No patients match your search.
                  </TableCell>
                </TableRow>
              ) : (
                patients.map((patient) => (
                  <TableRow
                    key={patient.id}
                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <TableCell>
                      <p className="font-semibold text-slate-900 text-sm">
                        {patient.lastName}, {patient.firstName}
                      </p>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        {patient.mrn}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-slate-700">
                        {age(patient.dob)} y · {patient.sexAtBirth.charAt(0).toUpperCase()}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge color={statusColor[patient.status]} size="sm">
                        {patient.status.charAt(0).toUpperCase() + patient.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-slate-600">{patient.primaryProvider}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-slate-500 tabular-nums">
                        {formatDate(patient.lastVisitAt)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {patient.flags.slice(0, 3).map((flag) => (
                          <span
                            key={flag}
                            className="text-[10px] font-medium px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded"
                          >
                            {flag}
                          </span>
                        ))}
                        {patient.flags.length > 3 && (
                          <span className="text-[10px] text-slate-400">
                            +{patient.flags.length - 3}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    {Object.keys(acuityMap).length > 0 && (
                      <TableCell>
                        {acuityMap[patient.id] ? (
                          <div className="group relative inline-block">
                            <span
                              className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${acuityStyle[acuityMap[patient.id].score]?.className ?? ""}`}
                            >
                              {acuityMap[patient.id].score}
                            </span>
                            <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-10 w-52 bg-slate-900 text-white text-xs rounded px-2 py-1.5 shadow-lg pointer-events-none">
                              {acuityMap[patient.id].rationale}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
