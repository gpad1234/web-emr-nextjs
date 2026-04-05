# MobileEMR — System Architecture

## 1. Overview

MobileEMR is a **dual-surface clinical workspace**: a native mobile app for bedside and on-the-go workflows, and a dedicated web app for desk-based, keyboard-driven clinical work. Both surfaces share a single synthetic development backend and an identical type system.

```
┌─────────────────────────────────────────────────────────────────────┐
│                          new-mobile-emr/                            │
│                                                                     │
│   ┌───────────────────────────┐   ┌───────────────────────────┐    │
│   │      mobile-emr/          │   │         web/              │    │
│   │  Expo 54 · React Native   │   │  Next.js 15 · App Router  │    │
│   │  iOS / Android / Expo Web │   │  Desktop browser          │    │
│   └────────────┬──────────────┘   └────────────┬──────────────┘    │
│                │                               │                    │
│     types/patient.ts (mirrored)    types/patient.ts                 │
│     lib/api/patients.ts (mirrored) lib/api/patients.ts              │
│     lib/hooks/usePatients.ts       lib/hooks/usePatients.ts         │
│                │                               │                    │
│                └──────────────┬────────────────┘                    │
│                               ▼                                     │
│                  ┌────────────────────────┐                         │
│                  │  json-server :3001     │                         │
│                  │  server/db.json        │  (local dev only)       │
│                  │  Faker.js seed data    │                         │
│                  └────────────────────────┘                         │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Monorepo Layout

```
new-mobile-emr/
├── mobile-emr/              # Expo + React Native application
│   ├── app/                 # Expo Router screens + layouts
│   ├── components/          # Shared RN components
│   ├── constants/           # Design tokens (Colors)
│   ├── lib/                 # api client + React Query hooks
│   ├── types/               # Patient interface (source of truth)
│   ├── server/              # json-server config + Faker seed
│   └── docs/                # Mobile tech spec + future vision
│
├── web/                     # Next.js 15 web application
│   ├── app/                 # App Router pages + layouts
│   ├── components/          # Sidebar, Providers
│   ├── lib/                 # api client + React Query hooks (mirrored)
│   ├── types/               # Patient interface (mirrored from mobile)
│   └── docs/                # Web tech spec + architecture (this file)
│
└── (planned) packages/
    └── shared/              # Future: extracted shared package (@emr/shared)
        ├── types/           # Single source of truth
        └── lib/             # Shared api client + hooks
```

**Current state:** `types/` and `lib/` exist in both apps with identical content (the only difference is `NEXT_PUBLIC_API_URL` vs `EXPO_PUBLIC_API_URL` in the api client). These are kept in sync manually until the `packages/shared` workspace is introduced.

---

## 3. Layered Architecture

Each app follows the same four-layer model:

```
┌──────────────────────────────────────┐
│  Presentation layer                  │  Pages / Screens
│  (app/ in both Next.js & Expo)       │
├──────────────────────────────────────┤
│  Component layer                     │  Tremor (web) · custom RN (mobile)
│  (components/)                       │
├──────────────────────────────────────┤
│  State / cache layer                 │  TanStack Query hooks
│  (lib/hooks/)                        │  In-memory cache, optimistic updates
├──────────────────────────────────────┤
│  Transport layer                     │  fetch-based typed client
│  (lib/api/)                          │  Response normaliser
└──────────────────────────────────────┘
         │
         ▼ HTTP (JSON)
┌──────────────────────────────────────┐
│  Backend                             │  json-server (dev)
│                                      │  Real service (future)
└──────────────────────────────────────┘
```

---

## 4. Web Application Architecture

### 4.1 Request/render lifecycle

```
Browser request
     │
     ▼
Next.js App Router
     │
     ├─ Server Component (RootLayout)
     │   ├─ Renders static HTML shell: <html>, <body>, <Sidebar>
     │   └─ Streams into browser; no client JS for layout itself
     │
     └─ Client Component ("use client") — Dashboard / Patients / AddPatient
         ├─ Hydrates in browser
         ├─ Mounts TanStack Query client (via <Providers>)
         └─ Fires usePatients() → fetch → json-server → normalise → render
```

### 4.2 Component hierarchy

```
RootLayout (Server Component)
└── <Providers>  (QueryClientProvider — client boundary)
    └── <div class="flex min-h-screen">
        ├── <Sidebar />  (client — usePathname for active link)
        └── <main>
            ├── DashboardPage         /
            ├── PatientsPage          /patients
            └── AddPatientPage        /patients/new
```

### 4.3 Data flow — read path

```
PatientsPage
  └── usePatients({ search, status })
        └── TanStack Query
              ├── cache hit → return stale data, revalidate in background
              └── cache miss → patientsApi.list(params)
                    └── fetch GET /patients?q=…&status=…
                          └── json-server
                                └── normalizePatientsResponse()
                                      └── { items, total, page, pageSize }
```

### 4.4 Data flow — write path

```
AddPatientPage (form submit)
  └── useCreatePatient().mutate(body)
        └── patientsApi.create(body)
              └── fetch POST /patients
                    └── json-server → 201 Created
                          └── queryClient.invalidateQueries(["patients"])
                                └── usePatients() re-fetches
                                      └── router.push("/patients")
```

---

## 5. Mobile Application Architecture

### 5.1 Navigation structure

```
Expo Router (file-based)
└── app/
    ├── _layout.tsx           Root layout (Stack)
    ├── modal.tsx             Modal route
    └── (tabs)/
        ├── _layout.tsx       Tab navigator — Dashboard tab + Patients tab
        ├── index.tsx         Re-exports Dashboard (required by Expo Router)
        ├── Dashboard.tsx     Tab 1
        ├── PatientList.tsx   Tab 2
        └── AddPatient.tsx    Hidden route (no tab bar entry)
```

### 5.2 Data flow

Identical to the web read/write path above. The hooks and API client are structurally the same; only the env variable name differs.

---

## 6. Shared Domain Model

The `Patient` interface is the single canonical data type across both surfaces. All API contracts, UI rendering, and form validation derive from it.

```
Patient
├── id              string          UUID assigned by backend
├── mrn             string          Medical record number (human-readable unique)
├── firstName       string
├── lastName        string
├── dob             string          ISO 8601 date (YYYY-MM-DD)
├── sexAtBirth      SexAtBirth      female | male | intersex | unknown
├── status          PatientStatus   stable | critical | recovering | discharged
├── primaryProvider string          Free-text provider name (FK in future)
├── lastVisitAt     string          ISO 8601 datetime
└── flags           string[]        Free-text clinical flags
```

**FHIR alignment note:** The field naming and value sets are designed to map cleanly onto the FHIR R4 `Patient` resource. `dob` → `birthDate`, `sexAtBirth` → `gender` extension, `mrn` → `identifier[use=usual]`, `status` → `extension[clinical-status]`. Full FHIR serialization is a Phase C deliverable.

---

## 7. Backend (Development)

| Property | Value |
|---|---|
| Runtime | json-server 1.0.0-beta |
| Port | 3001 |
| Data file | `mobile-emr/server/db.json` |
| Seed script | `mobile-emr/server/seed.ts` (Faker.js) |
| Pagination | `?_page=N&_per_page=N` |
| Search | `?q=<fulltext>` |
| Filter | `?status=<value>` |

Both apps point at the same server. The JSON file is regenerated on each `npm run server:seed` call — development data is ephemeral.

---

## 8. Styling Architecture

### Web

```
Tailwind CSS (utility tokens)
     ↓ applied to
Tremor components (semantic composables)
     ↓ overridden / extended with
Tailwind utility classes on wrapper <div>s
```

**Design tokens in use:**

| Token | Value | Usage |
|---|---|---|
| Sidebar background | `slate-900` | Trust / clinical seriousness |
| Active nav item | `blue-600` | Primary brand action |
| Page background | `slate-50` | Low-fatigue neutral |
| Critical status | `red-*` | Danger signal |
| Recovering status | `amber-*` | Caution signal |
| Stable status | `emerald-*` | Safe signal |
| Discharged status | `slate-*` | Inactive / complete |

### Mobile

React Native StyleSheet / inline styles. Design token alignment with the web palette is planned but not yet enforced — a shared token package is the right delivery vehicle.

---

## 9. Security Boundaries

| Control | Status |
|---|---|
| Authentication | Not implemented (Phase B) |
| Route guards | Not implemented (Phase B) |
| HTTPS in transit | Dev: HTTP. Prod: TLS enforced at infrastructure level |
| PHI in logs | No patient data is logged at app level |
| Input sanitisation | All form values are controlled React state; no dangerouslySetInnerHTML |
| API URL | Sourced from env var; not hard-coded or committed |
| Dependency CVEs | Manual review; automated scanning planned for CI (Phase B) |

---

## 10. Planned Architectural Migrations

### 10.1 Shared package extraction  (Phase A)

Convert the monorepo to an npm workspace and extract shared code:

```
packages/
└── shared/
    ├── package.json    { "name": "@emr/shared" }
    ├── types/
    │   └── patient.ts  ← single source of truth
    └── lib/
        └── api/
            └── patients.ts   ← env-var-agnostic base client
```

Both apps import `@emr/shared`. The env-specific base URL is injected at runtime via a configuration parameter rather than a build-time env var, making the package portable.

### 10.2 RSC data fetching  (Phase B)

Move the patient list query out of a client component into an async Server Component:

```tsx
// app/patients/page.tsx — Server Component
export default async function PatientsPage() {
  const data = await patientsApi.list();   // runs on server, no client JS
  return <PatientsTable initialData={data} />;
}

// components/PatientsTable.tsx — Client Component
// Receives initialData as RSC payload; TanStack Query uses it as placeholder
```

Benefits: faster initial paint, no loading spinner for the initial render, SEO-ready HTML.

### 10.3 Real backend integration  (Phase C)

Replace json-server with a production API service:

```
web / mobile
   └── @emr/shared lib/api/patients.ts
         └── fetch → HTTPS → EMR API Gateway
                               ├── Auth service (JWT / session)
                               ├── Patient service
                               ├── Task service
                               └── Visit service
```

The `patientsApi` shape (list / get / create / update / remove) becomes the stable interface contract. The internals of each function change; callers (hooks, pages) do not.

### 10.4 Authentication layer  (Phase B)

```
Request → Next.js Middleware (auth check)
               ├── Unauthenticated → redirect /login
               └── Authenticated  → forward to route handler
```

Session token stored in HttpOnly cookie. Refresh handled server-side. Role claims decoded in middleware and propagated via React context to gating components.

---

## 11. Decision Log

| Date | Decision | Rationale |
|---|---|---|
| 2026-04 | Separate Next.js app instead of Expo for Web | CSS Grid, semantic HTML tables, SSR, keyboard UX — see `WEB_ARCHITECTURE.md` |
| 2026-04 | Tremor v3 as component library | Semantic HTML, clinical dashboard composables (KPI cards, charts, tables), Apache 2.0 licence |
| 2026-04 | TanStack Query for client cache | Already used in mobile; shared mental model, mature stale-while-revalidate |
| 2026-04 | Mirror types and lib instead of shared package | Lower setup cost for prototyping; shared package is the planned next step |
| 2026-04 | json-server as dev backend | Zero setup, runs alongside mobile app, same data for both surfaces |
