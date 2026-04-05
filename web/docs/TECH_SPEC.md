# Web Clinical Workspace — Technical Specification

## 1. Purpose

This document describes the technical baseline for the **web layer** of the MobileEMR system. It covers the stack, page inventory, data contracts, non-functional requirements, and the near-term implementation plan. It is the companion document to `WEB_ARCHITECTURE.md` (which argues *why* this stack was chosen) and to the mobile app's `TECH_SPEC.md`.

---

## 2. Product Scope

The web layer is a dedicated, keyboard-first clinical workspace optimised for large-display, pointer-driven environments (desktop browser, large tablet).

**In scope — current baseline:**
- Dashboard with live-computed patient metrics, weekly admissions chart, focus-area alerts, and day timeline.
- Patient Registry with server-side search, status filter, sortable table, and inline navigation.
- Add Patient form with full field validation and mutation feedback.
- Fixed sidebar navigation with route-aware active state.

**Out of scope for current baseline:**
- Authentication and session management.
- Patient detail / chart view.
- Real-time updates, push notifications.
- HIPAA/security hardening for production deployment.
- Offline mode (web primary use-case is assumed to be connected).

---

## 3. Stack

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js (App Router) | ^15.3 |
| UI runtime | React | ^19.1 |
| Component library | Tremor | ^3.18 |
| Styling | Tailwind CSS | ^3.4 |
| Data fetching / cache | TanStack Query | ^5.96 |
| Language | TypeScript | ^5.9 |
| Local backend (dev) | json-server | 1.0.0-beta (shared with mobile) |

### 3.1 Rendering strategy

- **Server Components** are used for the root layout and any static shell that carries no client state.
- **Client Components** (`"use client"`) are used for all pages and interactive children. This mirrors the current Expo/React Native mental model and keeps the migration path clear. Introducing RSC data-fetching for patient queries is a planned next step (see §8).
- **No SSG / ISR** is applied while the backend is local json-server; this will change when a real API is introduced.

---

## 4. App Structure

```
web/
├── app/
│   ├── layout.tsx            # Root layout — RootLayout wraps Providers + Sidebar + <main>
│   ├── globals.css           # Tailwind base / global resets
│   ├── page.tsx              # Dashboard — route "/"
│   └── patients/
│       ├── page.tsx          # Patient Registry — route "/patients"
│       └── new/
│           └── page.tsx      # Add Patient — route "/patients/new"
├── components/
│   ├── Sidebar.tsx           # Fixed 240px left nav; route-aware active link
│   └── providers.tsx         # TanStack QueryClientProvider
├── lib/
│   ├── api/
│   │   └── patients.ts       # Typed fetch client + response normaliser
│   └── hooks/
│       └── usePatients.ts    # usePatients / usePatient / useCreatePatient / useUpdatePatient / useDeletePatient
├── types/
│   └── patient.ts            # Patient interface, PatientStatus, SexAtBirth
├── docs/
│   ├── WEB_ARCHITECTURE.md   # Stack rationale
│   ├── TECH_SPEC.md          # ← this file
│   └── ARCHITECTURE.md       # System-level architecture
└── package.json
```

---

## 5. Pages

### 5.1 Dashboard  (`/`)

**Purpose:** Give a clinician situational awareness at the start of a shift — census metrics, recent alerts, upcoming schedule.

**Data sources:**
- `usePatients()` — live patient count, critical/recovering/stable breakdown.
- `weeklyAdmissions` — static local array (placeholder; will be replaced by a metrics endpoint).
- `focusAreas`, `timeline` — static local arrays (placeholder; will come from task/event APIs).

**Key UI regions:**
| Region | Component | Notes |
|---|---|---|
| Page header | Custom `<div>` | Shows unit, date, Add Patient CTA |
| Critical alert banner | Tremor `Callout` | Conditional — only when `critical > 0` |
| KPI cards | Tremor `Card` + `Metric` + `BadgeDelta` | Total, Critical, Recovering, Stable |
| Admissions chart | Tremor `AreaChart` | 7-day rolling; static data for now |
| Focus areas | Tremor `List` / `ListItem` | Colour-coded priority items |
| Day timeline | Custom card row | Time, title, owner, upcoming badge |

### 5.2 Patient Registry  (`/patients`)

**Purpose:** Full census browse with filtering — the go-to view for a coordinator or charge nurse.

**Data sources:**
- `usePatients({ search, status })` — server-side search via `?q=` and `?status=` query params passed to json-server.

**Key UI regions:**
| Region | Component | Notes |
|---|---|---|
| Page header | Custom `<div>` | Shows live patient count, Add Patient CTA |
| Search input | Tremor `TextInput` | Debounced via controlled state; triggers re-query |
| Status filter | Tremor `Select` + `SelectItem` | all / stable / critical / recovering / discharged |
| Patient table | Tremor `Table` family | Semantic `<table>` with `<th>` / `<td>` |
| Status badge | Tremor `Badge` | Colour-mapped per `PatientStatus` |
| Row actions | Next.js `<Link>` | Placeholder href — detail page not yet built |

**Status → colour mapping:**

```ts
const statusColor: Record<PatientStatus, "red" | "amber" | "emerald" | "slate"> = {
  critical:   "red",
  recovering: "amber",
  stable:     "emerald",
  discharged: "slate",
};
```

### 5.3 Add Patient  (`/patients/new`)

**Purpose:** Register a new patient into the system.

**Fields:**

| Field | Type | Validation |
|---|---|---|
| MRN | `string` | Required |
| First name | `string` | Required |
| Last name | `string` | Required |
| Date of birth | `date` | Required, ISO format |
| Sex at birth | `SexAtBirth` enum | Required |
| Status | `PatientStatus` enum | Required, defaults to `stable` |
| Primary provider | `string` | Required |
| Flags | `string[]` | Optional; add/remove chip flow |

**Mutation:** `useCreatePatient()` → `POST /patients`. On success, navigates to `/patients`.

**Error handling:** Tremor `Callout` rendered if `isError` is true on the mutation.

---

## 6. Components

### 6.1 Sidebar

- Fixed position, `w-60`, `bg-slate-900`.
- **Wordmark** section: blue icon + "MobileEMR / Clinical Workspace".
- **Nav** section: icon + label links — Dashboard, Patients, Add Patient.
- Active link: `bg-blue-600 text-white`; inactive: `text-slate-400 hover:bg-slate-800`.
- Active detection: exact match on `"/"`, `startsWith` on all other hrefs.

### 6.2 Providers

Thin `"use client"` wrapper that mounts `QueryClientProvider` with a`QueryClient` configured at default settings. The client is created once via `useState` to avoid re-instantiation on hot reload.

---

## 7. Data Layer

### 7.1 API client  (`lib/api/patients.ts`)

| Function | Method | Path | Notes |
|---|---|---|---|
| `patientsApi.list(params)` | `GET` | `/patients` | Normalises three json-server response shapes |
| `patientsApi.get(id)` | `GET` | `/patients/:id` | Returns `Patient` |
| `patientsApi.create(body)` | `POST` | `/patients` | Body: `PatientCreateRequest` |
| `patientsApi.update(id, body)` | `PATCH` | `/patients/:id` | Body: `PatientUpdateRequest` |
| `patientsApi.remove(id)` | `DELETE` | `/patients/:id` | Returns `{}` |

**Base URL:** `NEXT_PUBLIC_API_URL` env var, falling back to `http://localhost:3001`.

**Response normaliser:** `normalizePatientsResponse` handles three shapes:
1. Raw `Patient[]` array.
2. json-server paginated `{ data, items, pages, ... }`.
3. Canonical `{ items, total, page, pageSize }`.

### 7.2 React Query hooks  (`lib/hooks/usePatients.ts`)

| Hook | Query key | Purpose |
|---|---|---|
| `usePatients(params?)` | `["patients", "list", params]` | Patient list with optional search & status filter |
| `usePatient(id)` | `["patients", "detail", id]` | Single patient; disabled when id is empty |
| `useCreatePatient()` | n/a (mutation) | POST → invalidates `["patients"]` |
| `useUpdatePatient(id)` | n/a (mutation) | PATCH → invalidates list + detail |
| `useDeletePatient()` | n/a (mutation) | DELETE → invalidates `["patients"]` |

### 7.3 Type system  (`types/patient.ts`)

```ts
type PatientStatus = "stable" | "critical" | "recovering" | "discharged";
type SexAtBirth    = "female" | "male" | "intersex" | "unknown";

interface Patient {
  id:              string;
  mrn:             string;
  firstName:       string;
  lastName:        string;
  dob:             string;   // ISO date
  sexAtBirth:      SexAtBirth;
  status:          PatientStatus;
  primaryProvider: string;
  lastVisitAt:     string;   // ISO datetime
  flags:           string[];
}
```

`PatientCreateRequest = Omit<Patient, "id">`.  
`PatientUpdateRequest = Partial<Omit<Patient, "id">>`.

---

## 8. Non-Functional Requirements

| Category | Requirement |
|---|---|
| **Accessibility** | All Tremor table components use semantic `<table>` / `<th>` / `<td>`. Interactive elements have accessible labels. Minimum WCAG 2.1 AA contrast. Keyboard navigable sidebar and table rows. |
| **Performance** | No unnecessary client JS for static shell (root layout is a Server Component). Patient list uses server-side pagination — target <200 ms TTFB on local dev. |
| **Type safety** | `strict: true` TypeScript. No `any` in production code paths. |
| **Security** | No credentials stored client-side. API base URL sourced from env var, not hard-coded. All user-supplied form inputs are controlled values — no dangerouslySetInnerHTML. |
| **Cross-browser** | Chrome / Edge 120+, Safari 17+, Firefox 125+. No IE11 support. |

---

## 9. Environment Variables

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | No | `http://localhost:3001` | json-server (dev) or real API (prod) base URL |

---

## 10. Development Setup

```bash
# Start the shared json-server backend (from mobile-emr dir)
cd mobile-emr && npm run server

# Start the Next.js dev server
cd web && npm run dev        # → http://localhost:3000
```

---

## 11. Near-Term Roadmap

| Priority | Item | Notes |
|---|---|---|
| P0 | **Patient detail page** (`/patients/:id`) | Full chart header, flags, visit summary |
| P0 | **Authentication** | Session-based or JWT; guards all routes |
| P1 | **Extract shared package** | `packages/shared` — types + API client shared between web and mobile |
| P1 | **RSC data fetching** | Move `usePatients` to async Server Components for SSR + progressive enhancement |
| P1 | **Dashboard metrics endpoint** | Replace static `weeklyAdmissions` / `focusAreas` with live API data |
| P2 | **Inline table row editing** | Quick status / provider update without leaving the list |
| P2 | **Accessibility audit** | Full keyboard navigation pass; ARIA roles on custom widgets |
| P2 | **Error boundary wrapping** | Page-level error boundaries with clinical-safe fallback UI |
| P3 | **Real backend integration** | Replace json-server with a typed service layer (REST or GraphQL) |
