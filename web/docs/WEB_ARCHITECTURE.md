# Web Architecture: Next.js + Tremor

## Why a separate web layer?

The Expo / React Native app is the right tool for native mobile. But React Native for Web — the current web target — makes a fundamental tradeoff: it transpiles mobile primitives to DOM elements. The result is HTML built for the lowest common denominator of three platforms. You lose:

- **CSS-native layout** — no CSS Grid, no sticky headers, no scroll-anchoring
- **Accessible tables** — `FlatList` renders `<div>` rows, not `<table>`/`<tr>`
- **Keyboard-first interaction** — focus management and tab order are non-standard
- **Web performance primitives** — no streaming SSR, no partial hydration, no cached server components

Clinical web interfaces are data-dense and keyboard-driven. They are used on large monitors by clinicians who do not want to tap — they want to scan, filter, and act fast. That use case deserves a dedicated web stack.

---

## Stack choices and why each is open source

### Next.js 15 (App Router)
- License: MIT
- Server components + React 19 give zero-JS rendering for static shell; client components hydrate only where needed
- File-based routing maps cleanly to EMR navigation (dashboard, patients, patients/:id)
- Built-in image optimisation and font loading improve perceived performance on large displays

### Tremor v3
- License: Apache 2.0
- Composable, headless-ready component library built specifically for dashboards and analytics
- Ships KPI cards (`Card`, `Metric`, `BadgeDelta`), data tables (`Table`, `TableBody` etc.), charts (`AreaChart`, `BarChart`), and form primitives (`TextInput`, `Select`) — all the building blocks of a clinical workspace
- Components render real semantic HTML: `<table>`, `<th>`, `<td>` — screen-reader and keyboard accessible by default
- Zero proprietary abstractions; every component is overridable with Tailwind utilities

### Tailwind CSS v3
- License: MIT
- Utility-first keeps all design decisions co-located with markup — no context-switching between CSS and TSX
- Tremor's theming hooks (brand/background/content color tokens) drop directly into the Tailwind config
- PurgeCSS integration means the production bundle ships only the classes actually used

### TanStack Query v5
- License: MIT
- Already used in the Expo app; the same `usePatients` / `useCreatePatient` hooks work here unchanged
- Stale-while-revalidate keeps patient data fresh without manual polling
- Optimistic updates are trivial to layer on when real-time status changes matter

---

## Shared code

```
new-mobile-emr/
├── mobile-emr/               # Expo + React Native (existing)
│   ├── types/patient.ts      ← source of truth
│   └── lib/
│       ├── api/patients.ts   ← source of truth
│       └── hooks/usePatients.ts
└── web/                      # Next.js (new)
    ├── types/patient.ts      ← mirrored
    └── lib/
        ├── api/patients.ts   ← mirrored (NEXT_PUBLIC_API_URL instead of EXPO_PUBLIC_API_URL)
        └── hooks/usePatients.ts ← mirrored
```

Both apps point at the same json-server backend during development. The API contract and type system are identical. When a real backend exists, both apps update in one place.

**Next step:** extract `types/` and `lib/api/` into a root-level `packages/shared` npm workspace package. Both apps import from `@emr/shared`. That removes the mirroring entirely.

---

## What this unlocks

| Capability | Expo for Web | Next.js + Tremor |
|---|---|---|
| Semantic HTML tables | No (`<div>`) | Yes (`<table>`) |
| Server-side rendering | No | Yes |
| Keyboard navigation | Partial | Full |
| Dense data layouts | Layout workarounds required | Native CSS Grid |
| Accessible charts | No | Yes (Tremor / Recharts) |
| Form validation UX | Custom | Native + Callout feedback |
| Bundle size (web) | Ships RN runtime | Ships only used CSS |
