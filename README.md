# Smart Lorry Marketplace

A marketplace for renting commercial lorries, matching return-trip loads, and pooling shared
cargo — built as a phased monorepo (Node/Express API, FastAPI matching service, React web app).

**Status: Phase 0 (scaffold) + Phase 1 (auth, roles, vehicle/driver CRUD) are built.** See
[Phase status](#phase-status) below for exactly what works today and what's stubbed for later
phases.

## Repo layout

```
smart-lorry-marketplace/
├── apps/web/                 # React 18 + Vite + TypeScript + TanStack Query
├── services/api/             # Express + TypeScript + Prisma
├── services/ai-matching/     # FastAPI (skeleton now; logic lands in Phase 4-5)
├── packages/shared/          # Zod schemas, enums, DTO types shared by api + web
└── docker-compose.yml        # postgres+postgis, redis, api, ai-matching
```

## Prerequisites

- Node.js 20+
- Python 3.12+ (only needed if running `services/ai-matching` outside Docker)
- PostgreSQL 16 with the **PostGIS** extension available (a local install, or Docker)
- Internet access to `registry.npmjs.org` and `binaries.prisma.sh` for the first `npm install`
  / `prisma generate` (see [A note on how this was verified](#a-note-on-how-this-was-verified)
  if you're running this in a network-restricted environment)

## Quick start (local, no Docker)

```bash
# 1. Install all workspace dependencies
npm install

# 2. Build the shared package (api and web both import it)
npm run build:shared

# 3. Set up the database
createdb smart_lorry_marketplace
psql -d smart_lorry_marketplace -c 'CREATE EXTENSION IF NOT EXISTS postgis;'

cp services/api/.env.example services/api/.env
# edit services/api/.env — at minimum set JWT_ACCESS_SECRET / JWT_REFRESH_SECRET
# (openssl rand -hex 32) and DATABASE_URL if it differs from the default

cd services/api
npx prisma generate
npx prisma migrate deploy   # applies the Phase 1 migration already in prisma/migrations/
cd ../..

# 4. Run the API and web app (separate terminals)
npm run dev:api    # http://localhost:4000  — docs at /api/docs
npm run dev:web    # http://localhost:5173
```

## Quick start (Docker)

```bash
cp services/api/.env.example services/api/.env
cp services/ai-matching/.env.example services/ai-matching/.env
# fill in services/api/.env as above

docker compose up --build
```

## Tests

```bash
# requires a running Postgres+PostGIS reachable via DATABASE_URL
# (defaults to smart_lorry_marketplace_test on localhost — see services/api/tests/setup.ts)
npm run test:api
```

The test suite covers the Phase 1 deliverable gate end-to-end: register an owner, add a
vehicle, link a driver, toggle availability, and view the driver's public profile as a
customer — plus role-gating and refresh-token rotation/reuse-detection for auth.

## Phase status

**Phase 0 — scaffold.** Monorepo, Docker Compose, CI skeleton, shared types package. Done.

**Phase 1 — auth, roles, vehicle/driver CRUD.** Done:
- JWT access + rotating refresh tokens, bcrypt password hashing, role middleware
  (`customer | owner | driver | admin`)
- `users`, `vehicles`, `drivers`, `driver_availability` tables, with PostGIS
  `geography(Point,4326)` for vehicle location (raw-SQL helpers in `src/utils/geo.ts`, since
  Prisma can't model PostGIS types natively)
- Full route set from the phase plan, plus one addition: `GET /users/lookup` (owner-only) so
  the web UI can resolve a driver's account by email before linking them — the original route
  table didn't include a user-search endpoint, and linking a driver isn't usable without one
- Web: login/register (with role selection), an owner dashboard for the fleet (add/edit
  vehicles, cycle status, assign a driver) and for drivers (link a driver, see roster), and a
  driver's public profile view

**Phases 2–7** (rental booking, return-trip matching, shared pooling, recommendations, KYC/admin,
notifications/deploy) are **not built yet** — only placeholder files exist where the original
plan calls for them (`src/pricing/pricingEngine.ts`, `src/ws/trackingGateway.ts`,
`app/routers/route_optimizer.py`, `app/routers/recommendations.py`), each with a comment
describing what goes there. Pick up at Phase 2 by following the same migration → routes →
service layer → tests → web UI workflow used for Phase 1.

## A note on how this was verified

This project was built and checked in a sandboxed environment with a restricted network
allowlist that **did not include `binaries.prisma.sh`** — the CDN Prisma's CLI uses to download
its query/schema-engine binaries. That's specific to this sandbox, not a real-world constraint;
on a normal machine `npm install` and `npx prisma generate` will fetch those binaries
automatically and everything below applies as-is.

To still verify the schema and application logic without that, this was done instead:

- A real PostgreSQL 16 + PostGIS instance was installed and run locally. The migration in
  `services/api/prisma/migrations/20260620000000_phase1_init/` was applied directly via `psql`
  and exercised by hand: inserting rows, round-tripping a vehicle's GPS location through
  `ST_MakePoint`/`ST_AsGeoJSON`-style functions, and confirming foreign-key behavior (deleting a
  vehicle sets the assigned driver's `vehicle_id` to `NULL`; deleting an owner cascades to their
  vehicles and drivers) — all matched the schema's intent.
- `services/api`'s TypeScript was type-checked directly. Every error that remained was
  traceable to the Prisma client not being generated (e.g. `Prisma.PrismaClientKnownRequestError`
  not existing yet) — none were logic bugs in the application code itself.
- `packages/shared` builds clean.
- `apps/web` type-checks and produces a clean production build (`vite build`).
- `services/ai-matching`'s FastAPI app was installed, imported, started, and its `/health`
  endpoint was hit successfully.

What this means in practice: once you run `npx prisma generate` on a machine with normal
internet access, the Prisma Client types resolve and the few remaining generic types in
`vehicle.service.ts` (`Vehicle & { driver: ... }`) will be checked against the real generated
types rather than placeholders. Run `npm run test:api` after that to confirm the full
register → add vehicle → link driver → toggle availability flow end-to-end — it's expected to
pass, but it's worth your own confirmation since it wasn't possible to run it here.

## API docs

Once `services/api` is running, OpenAPI docs (generated from JSDoc comments on each route) are
served at `http://localhost:4000/api/docs`.

## Design notes worth knowing about

- **Password hashing uses `bcryptjs`, not `bcrypt`.** `bcrypt` needs native compilation, which
  failed in the sandbox's restricted network (no access to `nodejs.org` for build headers).
  `bcryptjs` is a pure-JS, same-API drop-in — fine for this project's scale, but if you want
  native `bcrypt`'s performance edge in production, swapping it back is a one-file change
  (`src/utils/password.ts`) plus a `package.json` dependency swap.
- **Refresh tokens rotate.** Each `/auth/refresh` call revokes the presented token and issues a
  new one; reusing a revoked token is rejected. Tokens are stored hashed (SHA-256), never raw.
- **`GET /users/lookup`** is scoped tightly (owner-only, exact email/phone match, returns only
  `{id, name}`) specifically so it can't double as a general user directory.
