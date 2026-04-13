# Web Architecture: Next.js + Tremor

## Current State

The web application is a dedicated Next.js App Router frontend using Tremor as the dashboard and data-visualization UI layer. It is designed for desktop-first clinical workflows where clinicians need high-density tables, filters, KPI cards, and fast keyboard-friendly navigation.

This is not React Native Web. The web app is a separate implementation in the web folder, optimized for browser semantics and operational dashboards.

---

## Core Stack

### Next.js 15 App Router
- Routing and layouts are file-based under app
- Server and client components are composed per page
- API routes under app/api provide server-side integration points for AI features
- Build output is served with next start under PM2

### Tremor Dashboard Components
- Primary UI library for data-dense views
- Used for KPI cards, metric panels, status badges, tables, charts, inputs, and selects
- Provides the visual and interaction foundation for:
    - Dashboard page
    - Patient list page
    - Add patient workflow

### Tailwind CSS
- Utility styling and responsive layout control
- Shared design tokens and consistent spacing/color system across Tremor components

### TanStack Query
- Data fetching and caching for patient resources
- Hook-based API access via lib/hooks and lib/api

---

## App Structure

```text
web/
    app/
        layout.tsx                  # app shell + sidebar layout
        page.tsx                    # dashboard
        patients/
            page.tsx                  # patient registry + filters + AI acuity scoring
            new/page.tsx              # add patient form + AI flag suggestions
        api/
            suggest-flags/route.ts    # AI flag suggestions
            acuity-score/route.ts     # AI ESI-like triage scoring
            census-insights/route.ts  # AI ward-level pattern insights
    components/
        Sidebar.tsx                 # responsive nav with mobile hamburger
    lib/
        api/patients.ts             # REST client
        hooks/usePatients.ts        # query hooks
    types/patient.ts              # web patient domain model
```

---

## Runtime Flow

### Standard patient data
1. Browser loads Next.js pages
2. Client hooks call patient REST endpoints under /api
3. Nginx forwards /api to json-server on port 3001
4. Responses are cached and managed by TanStack Query

### AI-enhanced workflows
1. User triggers AI action from a page button
2. Browser sends POST to Next.js API route:
     - /api/suggest-flags
     - /api/acuity-score
     - /api/census-insights
3. Nginx routes these three paths to Next.js on port 3000
4. Next.js route calls OpenAI server-side using OPENAI_API_KEY
5. Structured JSON is returned to the browser and rendered in Tremor UI blocks

All AI writes are user-mediated. The AI suggests, but clinicians decide what to accept.

---

## Deployment Topology

- Next.js web app runs on port 3000 via PM2 process emr-web
- json-server API runs on port 3001 via PM2 process emr-api
- Nginx is the edge reverse proxy on port 80
- Route split at Nginx:
    - /api/suggest-flags, /api/acuity-score, /api/census-insights to Next.js
    - /api/ to json-server
    - / to Next.js

This split allows the web app to keep the existing json-server REST backend while adding secure server-side AI endpoints in Next.js.

---

## Why Next.js + Tremor Fits This EMR

- Semantic tables and dense list views for patient census operations
- Ready-made dashboard primitives with low implementation overhead
- Clear separation between client data fetching and server-side AI execution
- Fast iteration path from prototype to production without changing architecture
