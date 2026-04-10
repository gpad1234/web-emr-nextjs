# MobileEMR

A dual-surface clinical workspace: a **Next.js 15 web app** for desk-based clinical work and an **Expo / React Native app** for mobile.

| Surface | Stack | Runs on |
|---|---|---|
| `web/` | Next.js 15 · Tremor · Tailwind · TanStack Query | Browser (desktop) |
| `mobile-emr/` | Expo 54 · React Native 0.81 · TanStack Query | iOS · Android · Expo Web |
| Backend (dev) | json-server · Faker.js seed | Both surfaces share `:3001` |

Live URL: **http://209.38.70.215**

---

## Quick start — local development

### Prerequisites

| Tool | Version | Install |
|---|---|---|
| Node.js | 20 LTS or 24 | https://nodejs.org |
| npm | 10+ | bundled with Node |
| Expo CLI | latest | `npm i -g expo-cli` (optional) |

### 1. Clone

```bash
git clone https://github.com/gpad1234/web-emr-nextjs.git
cd web-emr-nextjs
```

### 2. Start the shared backend

```bash
cd mobile-emr
npm install
npm run server          # seeds db.json then starts json-server on :3001
```

### 3. Start the web app

```bash
# new terminal
cd web
npm install --legacy-peer-deps   # required: Tremor v3 has a React 18 peer dep
npm run dev                      # → http://localhost:3000
```

### 4. Start the mobile app (optional)

```bash
# new terminal
cd mobile-emr
npm run ios       # iOS simulator
npm run android   # Android emulator
npm run web       # Expo web on :8081
```

Both apps read `NEXT_PUBLIC_API_URL` / `EXPO_PUBLIC_API_URL` for the backend URL (defaults to `http://localhost:3001`).

---

## Repository layout

```
web-emr-nextjs/
├── mobile-emr/          Expo + React Native application
│   ├── app/             Expo Router screens
│   ├── lib/             API client + React Query hooks
│   ├── types/           Patient interface (source of truth)
│   ├── server/          json-server config + Faker seed
│   └── docs/            Mobile tech spec + future vision
├── web/                 Next.js web application
│   ├── app/             App Router pages (/, /patients, /patients/new)
│   ├── components/      Sidebar, Providers
│   ├── lib/             API client + React Query hooks (mirrored)
│   ├── types/           Patient interface (mirrored)
│   └── docs/            Tech spec · Architecture · Deployment guide
└── README.md            ← you are here
```

---

## Deployment

See **[web/docs/DEPLOYMENT.md](web/docs/DEPLOYMENT.md)** for the full guide covering:

- Fresh droplet setup from scratch
- Re-deploying after code changes
- nginx configuration
- PM2 process management
- Troubleshooting runbook

The live server is a DigitalOcean droplet running Ubuntu 24.04 LTS at `209.38.70.215`.

---

## Further reading

| Document | Location |
|---|---|
| Web tech spec | [web/docs/TECH_SPEC.md](web/docs/TECH_SPEC.md) |
| System architecture | [web/docs/ARCHITECTURE.md](web/docs/ARCHITECTURE.md) |
| Web stack rationale | [web/docs/WEB_ARCHITECTURE.md](web/docs/WEB_ARCHITECTURE.md) |
| Mobile tech spec | [mobile-emr/docs/TECH_SPEC.md](mobile-emr/docs/TECH_SPEC.md) |
| Future vision / roadmap | [mobile-emr/docs/FUTURE_VISION.md](mobile-emr/docs/FUTURE_VISION.md) |
