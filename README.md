# Smart Lorry Marketplace

Monorepo for a geo-aware lorry rental, return-trip matching, and shared cargo pooling platform.

## Stack

| Layer | Technology |
|-------|------------|
| Web | React 18 + Vite + TypeScript + TanStack Query |
| API | Node.js + Express + TypeScript + Prisma |
| AI | Python FastAPI (route optimization, recommendations) |
| Database | PostgreSQL 16 + PostGIS |
| Cache / WS | Redis + Socket.io |
| Maps | Google Maps |
| Payments | Razorpay (mock adapter in dev) |

## Repository layout

```
smart-lorry-marketplace/
├── apps/web/              # React web app
├── services/api/          # Express API
├── services/ai-matching/  # FastAPI microservice
├── packages/shared/       # Zod schemas & shared types
└── docker-compose.yml     # Local dev stack
```

## Prerequisites

- Node.js 20+
- Docker & Docker Compose
- Python 3.11+ (for local AI service dev)

## Quick start

```bash
# 1. Install dependencies
npm install

# 2. Start infrastructure (Postgres + PostGIS, Redis)
npm run docker:up

# 3. Copy env files and configure secrets
cp services/api/.env.example services/api/.env
cp apps/web/.env.example apps/web/.env

# 4. Run database migrations
npm run db:migrate

# 5. Start API + web (or use Docker for full stack)
npm run dev:api   # http://localhost:3001
npm run dev:web   # http://localhost:5173
```

API docs: http://localhost:3001/api/v1/docs

## Development phases

| Phase | Scope | Status |
|-------|-------|--------|
| 0 | Monorepo scaffold, Docker, CI | ✅ |
| 1 | Auth, roles, vehicle/driver CRUD | 🚧 |
| 2 | Module 1: Lorry rental E2E | ⏳ |
| 3 | Return-trip marketplace | ⏳ |
| 4 | Shared cargo pooling + FastAPI | ⏳ |
| 5 | AI recommendations | ⏳ |
| 6 | KYC + admin dashboard | ⏳ |
| 7 | Notifications + deployment | ⏳ |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start API + web concurrently |
| `npm run docker:up` | Start Postgres, Redis, API, AI services |
| `npm run db:migrate` | Apply Prisma migrations |
| `npm run test` | Run all workspace tests |
| `npm run lint` | Lint all workspaces |

## Environment variables

See `services/api/.env.example` and `apps/web/.env.example` for required configuration.

**Never commit** `.env` files or production secrets. `ENCRYPTION_KEY` must be a 64-char hex string for AES-256-GCM.
