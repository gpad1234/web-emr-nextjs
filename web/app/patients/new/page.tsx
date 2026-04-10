"use client";

import type { FlagSuggestion } from "@/app/api/suggest-flags/route";
import type { PatientCreateRequest } from "@/lib/api/patients";
import { useCreatePatient } from "@/lib/hooks/usePatients";
import type { PatientStatus, SexAtBirth } from "@/types/patient";
import {
    Button,
    Callout,
    Card,
    Divider,
    Grid,
    Select,
    SelectItem,
    Text,
    TextInput,
    Title,
} from "@tremor/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

const emptyForm: PatientCreateRequest = {
  mrn: "",
  firstName: "",
  lastName: "",
  dob: "",
  sexAtBirth: "unknown",
  status: "stable",
  primaryProvider: "",
  lastVisitAt: new Date().toISOString(),
  flags: [],
};

export default function AddPatientPage() {
  const router = useRouter();
  const { mutate: createPatient, isPending, isError, error } = useCreatePatient();
  const [form, setForm] = useState<PatientCreateRequest>(emptyForm);
  const [flagInput, setFlagInput] = useState("");
  const [suggestions, setSuggestions] = useState<FlagSuggestion[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);

  async function suggestFlags() {
    if (!form.firstName || !form.lastName || !form.dob || !form.status) {
      setSuggestError("Fill in first name, last name, date of birth and status before requesting suggestions.");
      return;
    }
    setSuggestError(null);
    setIsSuggesting(true);
    setSuggestions([]);
    try {
      const res = await fetch("/api/suggest-flags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          dob: form.dob,
          sexAtBirth: form.sexAtBirth,
          status: form.status,
          primaryProvider: form.primaryProvider,
          existingFlags: form.flags,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Unknown error");
      setSuggestions((data.suggestions as FlagSuggestion[]).filter(
        (s) => !form.flags.includes(s.flag)
      ));
    } catch (err) {
      setSuggestError(err instanceof Error ? err.message : "Could not fetch suggestions.");
    } finally {
      setIsSuggesting(false);
    }
  }

  function acceptSuggestion(flag: string) {
    if (!form.flags.includes(flag)) {
      set("flags", [...form.flags, flag]);
    }
    setSuggestions((prev) => prev.filter((s) => s.flag !== flag));
  }

  function dismissSuggestion(flag: string) {
    setSuggestions((prev) => prev.filter((s) => s.flag !== flag));
  }

  function set<K extends keyof PatientCreateRequest>(
    key: K,
    value: PatientCreateRequest[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function addFlag() {
    const trimmed = flagInput.trim();
    if (trimmed && !form.flags.includes(trimmed)) {
      set("flags", [...form.flags, trimmed]);
    }
    setFlagInput("");
  }

  function removeFlag(flag: string) {
    set("flags", form.flags.filter((f) => f !== flag));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    createPatient(
      { ...form, lastVisitAt: new Date().toISOString() },
      { onSuccess: () => router.push("/patients") }
    );
  }

  return (
    <div className="p-8 max-w-3xl">
      {/* Header */}
      <div className="mb-6">
        <Text className="text-slate-500 text-xs font-semibold uppercase tracking-widest mb-1">
          Patient Registry
        </Text>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Add New Patient</h1>
        <p className="text-slate-500 text-sm mt-1">
          All fields are required unless noted optional.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Identity */}
        <Card>
          <Title>Identity</Title>
          <Divider className="mt-2 mb-4" />
          <Grid numItemsMd={2} className="gap-4">
            <div>
              <Text className="text-slate-600 text-xs font-medium mb-1.5">First Name</Text>
              <TextInput
                placeholder="e.g. Maria"
                value={form.firstName}
                onValueChange={(v) => set("firstName", v)}
                required
              />
            </div>
            <div>
              <Text className="text-slate-600 text-xs font-medium mb-1.5">Last Name</Text>
              <TextInput
                placeholder="e.g. Gonzalez"
                value={form.lastName}
                onValueChange={(v) => set("lastName", v)}
                required
              />
            </div>
            <div>
              <Text className="text-slate-600 text-xs font-medium mb-1.5">Date of Birth</Text>
              <input
                type="date"
                value={form.dob}
                onChange={(e) => set("dob", e.target.value)}
                required
                className="w-full rounded-tremor-default border border-tremor-border bg-tremor-background text-tremor-default text-slate-800 px-3 py-2 text-sm shadow-tremor-input focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <Text className="text-slate-600 text-xs font-medium mb-1.5">Sex at Birth</Text>
              <Select
                value={form.sexAtBirth}
                onValueChange={(v) => set("sexAtBirth", v as SexAtBirth)}
              >
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="intersex">Intersex</SelectItem>
                <SelectItem value="unknown">Unknown / Not reported</SelectItem>
              </Select>
            </div>
          </Grid>
        </Card>

        {/* Clinical */}
        <Card>
          <Title>Clinical Details</Title>
          <Divider className="mt-2 mb-4" />
          <Grid numItemsMd={2} className="gap-4">
            <div>
              <Text className="text-slate-600 text-xs font-medium mb-1.5">MRN</Text>
              <TextInput
                placeholder="e.g. MRN-00482"
                value={form.mrn}
                onValueChange={(v) => set("mrn", v)}
                required
              />
            </div>
            <div>
              <Text className="text-slate-600 text-xs font-medium mb-1.5">Primary Provider</Text>
              <TextInput
                placeholder="e.g. Dr. Reyes"
                value={form.primaryProvider}
                onValueChange={(v) => set("primaryProvider", v)}
                required
              />
            </div>
            <div>
              <Text className="text-slate-600 text-xs font-medium mb-1.5">Admission Status</Text>
              <Select
                value={form.status}
                onValueChange={(v) => set("status", v as PatientStatus)}
              >
                <SelectItem value="stable">Stable</SelectItem>
                <SelectItem value="recovering">Recovering</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="discharged">Discharged</SelectItem>
              </Select>
            </div>
          </Grid>
        </Card>

        {/* Flags */}
        <Card>
          <div className="flex items-center justify-between">
            <Title>Clinical Flags <span className="text-slate-400 text-sm font-normal">(optional)</span></Title>
            <button
              type="button"
              onClick={suggestFlags}
              disabled={isSuggesting}
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md bg-violet-50 text-violet-700 border border-violet-200 hover:bg-violet-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSuggesting ? (
                <>
                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Thinking…
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.347.347A3.75 3.75 0 0112 15.75a3.75 3.75 0 01-2.797-1.253l-.347-.347z" />
                  </svg>
                  Suggest with AI
                </>
              )}
            </button>
          </div>
          <Divider className="mt-2 mb-4" />

          {/* AI suggestions */}
          {suggestError && (
            <p className="text-xs text-red-600 mb-3">{suggestError}</p>
          )}
          {suggestions.length > 0 && (
            <div className="mb-4 p-3 bg-violet-50 border border-violet-200 rounded-md">
              <p className="text-xs font-semibold text-violet-700 mb-2">AI suggestions — click to accept</p>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((s) => (
                  <div key={s.flag} className="group relative">
                    <span
                      className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 bg-white text-violet-700 border border-violet-300 rounded cursor-default"
                      title={s.reason}
                    >
                      <button
                        type="button"
                        onClick={() => acceptSuggestion(s.flag)}
                        className="hover:text-violet-900 transition-colors"
                        aria-label={`Accept suggestion: ${s.flag}`}
                      >
                        + {s.flag}
                      </button>
                      <button
                        type="button"
                        onClick={() => dismissSuggestion(s.flag)}
                        className="text-violet-400 hover:text-violet-700 transition-colors ml-0.5"
                        aria-label={`Dismiss suggestion: ${s.flag}`}
                      >
                        ×
                      </button>
                    </span>
                    {/* Reason tooltip */}
                    <div className="hidden group-hover:block absolute bottom-full left-0 mb-1.5 z-10 w-48 bg-slate-900 text-white text-xs rounded px-2 py-1.5 shadow-lg pointer-events-none">
                      {s.reason}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <TextInput
              className="flex-1"
              placeholder="e.g. Fall risk, DNR, Allergy: Penicillin"
              value={flagInput}
              onValueChange={setFlagInput}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addFlag();
                }
              }}
            />
            <Button
              type="button"
              variant="secondary"
              onClick={addFlag}
            >
              Add
            </Button>
          </div>
          {form.flags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {form.flags.map((flag) => (
                <span
                  key={flag}
                  className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded"
                >
                  {flag}
                  <button
                    type="button"
                    onClick={() => removeFlag(flag)}
                    className="text-amber-500 hover:text-amber-700 transition-colors"
                    aria-label={`Remove ${flag}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </Card>

        {/* Error */}
        {isError && (
          <Callout title="Could not save patient" color="red">
            {error instanceof Error ? error.message : "An unexpected error occurred."}
          </Callout>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 pt-1">
          <Button type="submit" loading={isPending} loadingText="Saving…">
            Save Patient
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
