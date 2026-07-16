# Analytix

Plateforme SaaS d'analyse d'audience et de comportement en temps réel (projet 4A TL, S2 2025-2026). Un SDK s'installe sur le site client, l'API ingère et agrège les événements, le dashboard affiche les stats et intègre un support avec messagerie et appels vidéo.

## Stack

| Couche | Techno |
| --- | --- |
| API | Node.js 24, Express 5, TypeScript, MongoDB (Mongoose 8), Zod |
| Auth | JWT (access + refresh), argon2, cookies httpOnly |
| Temps réel | Server-Sent Events (SSE) |
| Visio support | WebRTC (signaling via l'API) |
| Dashboard | Next.js 16, React 19, TypeScript, Tailwind CSS 4, next-intl |
| SDK navigateur | TypeScript, bundle esbuild (`packages/sdk-frontend`) |
| SDK serveur | TypeScript (`packages/sdk-backend`) |
| Partagé | `@m1s2/shared` (types / schémas Zod) |
| Outillage | ESLint, Prettier, Vitest, GitHub Actions |

## Structure

Monorepo npm workspaces :

```
M1S2/
├── apps/
│   ├── api/                 # API REST + SSE
│   └── dashboard/           # Interface Next.js
├── packages/
│   ├── shared/              # Types et schémas partagés
│   ├── sdk-frontend/        # Script de tracking côté navigateur
│   └── sdk-backend/         # Helpers côté serveur
├── docs/
└── .github/workflows/
```

API (`apps/api/src`) :

```
config/          # env, MongoDB
models/
middlewares/
modules/         # auth, admin, tracking, conversations, team, …
realtime/        # SSE
scripts/         # seed admin, etc.
server.ts
```

## Installation

```bash
git clone https://github.com/NoanWasTaken/M1S2.git
cd M1S2
npm install
cp apps/api/.env.example apps/api/.env
```

Renseigner `apps/api/.env` (valeurs partagées par l'équipe pour le cluster Atlas et les secrets).

Variables principales :

| Variable | Rôle |
| --- | --- |
| `PORT` | Port API (`4000`) |
| `MONGODB_URI` | URI MongoDB |
| `JWT_ACCESS_SECRET` | Secret access token |
| `JWT_REFRESH_SECRET` | Secret refresh token |
| `APP_SECRET_ENC_KEY` | Chiffrement des APP_SECRET |
| `CORS_DASHBOARD_ORIGIN` | Origine dashboard (`http://localhost:3000`) |
| `NODE_ENV` | `development` / `production` |

Côté dashboard, définir `NEXT_PUBLIC_API_URL` (ex. `http://localhost:4000`) si besoin.

## Lancer

```bash
# API — http://localhost:4000
npm run dev --workspace apps/api

# Dashboard — http://localhost:3000
npm run dev --workspace apps/dashboard
```

Healthcheck API : `GET /health` → `{"status":"ok"}`.

Compte admin de seed :

```bash
npm run seed:admin --workspace apps/api
```

(`ADMIN_EMAIL` / `ADMIN_PASSWORD` optionnels dans le `.env`.)

## Scripts

| Commande | Effet |
| --- | --- |
| `npm install` | Dépendances du monorepo |
| `npm run dev --workspace apps/api` | API en watch |
| `npm run dev --workspace apps/dashboard` | Dashboard Next |
| `npm run seed:admin --workspace apps/api` | Crée l'admin |
| `npm run build` | Build de tous les workspaces |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |

## Git

- `main` : stable, via PR depuis `dev`
- `dev` : intégration
- `feature/…` : une branche par sujet, PR vers `dev`
