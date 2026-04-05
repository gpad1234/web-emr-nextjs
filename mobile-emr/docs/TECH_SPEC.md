# Mobile EMR - Technical Specification

## 1. Purpose
This document defines the current technical baseline and near-term implementation plan for the Mobile EMR app. It is intended to guide day-to-day development decisions, improve consistency, and reduce ambiguity as features are added.

## 2. Product Scope
The application is an Expo + React Native client for clinical workflows.
Current scope includes:
- Dashboard view with summary stats and action buttons.
- Patient list view with search and status-aware patient cards.
- Add patient form with local mutation flow.
- Tab-based navigation between primary views.
- Local synthetic backend powered by json-server for development.

Out of scope for current baseline:
- Production backend integration and hosted persistent storage.
- Authentication and authorization.
- HIPAA/security hardening for production deployment.

## 3. Current Architecture
### 3.1 Stack
- Runtime: React 19 + React Native 0.81.
- App framework: Expo SDK 54.
- Routing: Expo Router.
- Navigation: React Navigation (via Expo Router tabs).
- Language: TypeScript.
- Data fetching/cache: React Query.
- Local backend: json-server + Faker.js synthetic seed data.

### 3.2 App Structure
- app/(tabs)/Dashboard.tsx: Dashboard UI and quick actions.
- app/(tabs)/PatientList.tsx: Patient list with search/filter.
- app/(tabs)/AddPatient.tsx: Add patient form with create mutation.
- app/(tabs)/_layout.tsx: Tab navigator configuration.
- app/(tabs)/index.tsx: Default tab route — re-exports Dashboard (required by Expo Router for the index slot).
- app/(tabs)/two.tsx: Replaced with a redirect to "/" — no longer shown in the tab bar.
- types/patient.ts: Typed Patient interface and PatientStatus/SexAtBirth enums.
- lib/api/patients.ts: Typed patient API client and response normalization.
- lib/hooks/usePatients.ts: React Query hooks for patient list/detail/create/update/delete.
- server/seed.ts: Synthetic patient generator using Faker.js.
- server/db.json: Generated local patient dataset for json-server.

### 3.3 Data State (Current)
Patient data is loaded through `usePatients` / `useCreatePatient` React Query hooks.

- Primary local backend: `json-server` on `http://localhost:3001` using generated synthetic data.
- Fallback mode: local in-memory patient array remains in `PatientList.tsx` when the API is unavailable.
- Dashboard metrics are still static and not yet backed by the API.

## 4. Functional Requirements
### 4.1 Dashboard
- Display summary cards for patient-related metrics.
- Show focus areas and timeline panels.
- Provide quick actions:
  - Add patient (navigates to `AddPatient`).
  - View all patients (navigates to `PatientList`).

### 4.2 Patient List
- Display all available patients in a scrollable list.
- Support free-text search by patient name and status.
- Each row includes patient name, MRN, DOB, provider, status, and optional flags.
- Rows should be visually distinct and readable on mobile.

### 4.3 Add Patient
- Capture first name, last name, DOB, MRN, primary provider, sex at birth, and status.
- Submit through the patient create mutation.
- Return the user to the previous screen after successful submission.

### 4.4 Navigation
- Bottom tab navigation includes Dashboard and Patients.
- Add Patient is registered as a hidden route and is not shown in the tab bar.
- Navigation transitions must work on iOS, Android, and web targets supported by Expo.

## 5. Non-Functional Requirements
- Performance: patient list should render smoothly up to 500 items using FlatList.
- Maintainability: feature screens should keep UI logic local and move reusable logic into shared modules when repeated.
- Accessibility: minimum touch target size 44x44 points and reasonable text contrast.
- Cross-platform: no platform-specific behavior without guards.

## 6. Data Model
Patient (implemented in types/patient.ts)

> Migration complete: PatientList now uses the typed Patient interface with `firstName`/`lastName`. Dummy data seeded with MRN, DOB, provider, and flags.

- id: string
- mrn: string
- firstName: string
- lastName: string
- dob: string (ISO date)
- sexAtBirth: 'female' | 'male' | 'intersex' | 'unknown'
- status: 'stable' | 'critical' | 'recovering' | 'discharged'
- primaryProvider: string
- lastVisitAt: string (ISO datetime)
- flags: string[]

## 7. API Contract (Draft)
These contracts are placeholders for backend integration.

Local development note:
- `json-server` currently serves `GET /patients` either as a raw array or a paginated `{ data, items, ... }` shape depending on query params.
- `lib/api/patients.ts` normalizes those responses into `{ items, total, page, pageSize }` for the app.

- GET /patients
  - Query: page, pageSize, search, status
  - Response: { items: Patient[], total: number, page: number, pageSize: number }

- GET /patients/:id
  - Response: Patient

- POST /patients
  - Body: PatientCreateRequest
  - Response: Patient

- PATCH /patients/:id
  - Body: PatientUpdateRequest (partial fields)
  - Response: Patient

- DELETE /patients/:id
  - Response: 204 No Content

## 8. State Management Plan
Current:
- Local UI state is managed with `useState`.
- Server state is managed with React Query.
- Patient API access is centralized in `lib/api/patients.ts`.

Next:
- Remove fallback patient arrays once local API stability is acceptable.
- Add API-backed dashboard aggregates.
- Introduce optimistic updates where useful.

## 9. Security and Compliance Plan
Current app is a prototype. For production readiness:
- Enforce authenticated sessions and role-based authorization.
- Encrypt PHI in transit and at rest.
- Add audit logging for record access and edits.
- Ensure session timeout and secure token handling.

## 10. Testing Strategy
- Unit tests for utility functions and data transforms.
- Component tests for Dashboard and PatientList rendering.
- Smoke tests for route navigation between tabs.

Initial quality gates:
- TypeScript compile with zero type errors.
- Basic screen rendering tests pass.

## 11. Implementation Plan

### Step 1 — Clean up placeholder tabs ✅
- `two.tsx` replaced with a redirect to `/`; removed from the tab bar in `_layout.tsx`.

### Step 2 — Typed Patient model ✅
- `types/patient.ts` created with `Patient`, `PatientStatus`, and `SexAtBirth` types.
- `PatientList.tsx` migrated from flat `name`/`age` fields to the full typed model.

### Step 3 — Search and filter on PatientList ✅
- `TextInput` search bar added above the patient `FlatList`.
- Filters live by full name and status using local `useState`.

### Step 4 — AddPatient route ✅
- `app/(tabs)/AddPatient.tsx` created with a form: firstName, lastName, dob, mrn, sexAtBirth, status, primaryProvider.
- Registered as a hidden tab (`tabBarButton: () => <View />`) in `_layout.tsx`.
- Dashboard "Add patient" button updated to use `useRouter` + `router.push('/(tabs)/AddPatient')`.
- Dashboard "View all patients" button also migrated to `router.push`.

### Step 5 — React Query + API layer ✅
- `@tanstack/react-query` installed.
- `lib/api/patients.ts` created with typed fetch wrappers for GET / POST / PATCH / DELETE.
- `lib/hooks/usePatients.ts` created with `usePatients`, `usePatient`, `useCreatePatient`, `useUpdatePatient`, `useDeletePatient`.
- `app/_layout.tsx` wrapped with `QueryClientProvider`.
- `PatientList` uses `usePatients` with graceful fallback to local data when no backend is available.
- `AddPatient` uses `useCreatePatient` mutation; falls back gracefully on API error.

### Step 5a — Local Development Backend ✅
- `json-server`, `tsx`, and `@faker-js/faker` installed as dev dependencies.
- `server/seed.ts` generates synthetic patient records into `server/db.json`.
- `npm run server` seeds and starts the local API on port `3001`.
- `.env` points `EXPO_PUBLIC_API_URL` to `http://localhost:3001` for local development.

### Step 6 — Auth, roles, and session security ⏸ Deferred
- Deferred until a real backend is connected and `EXPO_PUBLIC_API_URL` is live.
- Will cover: authenticated sessions, role-based authorization, secure token handling, session timeout, audit logging.

## 12. Open Issues
- No production backend connected yet — local development uses `json-server` and synthetic data.
- Dashboard stat counts are still static — wire to API aggregate endpoint in next iteration.
- No domain-level validation for patient form inputs (DOB format, MRN uniqueness).
- Auth and session security remain outstanding (Step 6 / Phase B).

## 13. Local Development
- Start local API: `npm run server`
- Start Expo dev server: `npx expo start --port 8081`
- Web target: `http://localhost:8081`
- Local patients endpoint: `http://localhost:3001/patients`
