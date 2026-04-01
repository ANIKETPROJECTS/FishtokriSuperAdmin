# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## FishTokri Admin

A full-stack Super Admin dashboard for managing FishTokri's seafood delivery distribution network.

### Hub Hierarchy
- **Super Hubs** — city-level hubs (e.g., Mumbai, Pune, Navi Mumbai)
- **Sub Hubs** — locality-level hubs under a super hub (e.g., Thane, Airoli, Vashi)
- **Service areas** — pincodes stored as JSONB arrays on each sub hub

### Features
- JWT authentication (Super Admin: admin@fishtokri.com / FishTokri@Admin2024)
- Super Hub CRUD with image support (pollinations.ai URLs)
- Sub Hub CRUD nested under super hubs (with pincode tag management)
- Admin Users table with role-based assignment (super_admin / super_hub / sub_hub)
- Dashboard with live stats (total/active hubs, pincodes, users)
- Toggle Active/Inactive for hubs and users
- Coming Soon pages for Pincodes, Customers, Coupons sections
- Real seed data: Mumbai (5 sub hubs), Pune (4 sub hubs), Navi Mumbai (3 sub hubs), 25 pincodes, 6 users

### Artifacts
- `artifacts/fishtokri-admin` — React + Vite frontend (preview at /)
- `artifacts/api-server` — Express API server (port 8080, preview at /api)

### Database
- MongoDB via Mongoose
- Database name: `fishtokri_admin` (on the fishtokricluster Atlas instance)
- Collections: `super_hubs`, `sub_hubs` (ref → super_hubs, pincodes as string array), `hub_users`
- Connection: Uses MONGODB_URI secret with db overridden to fishtokri_admin

### Login
- Email: admin@fishtokri.com
- Password: FishTokri@Admin2024

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod, `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec at `lib/api-spec/openapi.yaml`)
- **Build**: esbuild
- **Frontend**: React + Vite + TailwindCSS + React Query

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/          # Express API server
│   └── fishtokri-admin/     # React + Vite admin dashboard
├── lib/
│   ├── api-spec/            # OpenAPI spec + Orval codegen config
│   ├── api-client-react/    # Generated React Query hooks
│   ├── api-zod/             # Generated Zod schemas from OpenAPI
│   └── db/                  # Drizzle ORM schema + DB connection
├── scripts/                 # Utility scripts
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## API Routes

- `GET /api/healthz` — health check
- `POST /api/auth/login` — JWT login
- `GET/POST /api/super-hubs` — list / create super hubs
- `GET/PUT/DELETE /api/super-hubs/:id` — get / update / delete super hub
- `PATCH /api/super-hubs/:id/toggle-status` — toggle active/inactive
- `GET /api/super-hubs/:id/sub-hubs` — list sub hubs for a super hub
- `POST /api/super-hubs/:id/sub-hubs` — create sub hub under super hub
- `PUT/DELETE /api/sub-hubs/:id` — update / delete sub hub
- `PATCH /api/sub-hubs/:id/toggle-status` — toggle active/inactive
- `GET/POST /api/users` — list / create hub users
- `PUT/DELETE /api/users/:id` — update / delete user
- `PATCH /api/users/:id/toggle-status` — toggle active/inactive
- `GET /api/stats/summary` — dashboard statistics

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references. Always typecheck from root: `pnpm run typecheck`.

## Packages

### `artifacts/api-server` (`@workspace/api-server`)
Express 5 API server. Routes in `src/routes/`. Uses `@workspace/db` for persistence.

### `artifacts/fishtokri-admin` (`@workspace/fishtokri-admin`)
React + Vite frontend. Pages: dashboard, hubs, admin-users, coming-soon, login. Uses `@workspace/api-client-react` hooks.

### `lib/db` (`@workspace/db`)
Drizzle ORM with PostgreSQL. Schema: `super_hubs`, `sub_hubs`, `hub_users`.

### `lib/api-spec` (`@workspace/api-spec`)
OpenAPI 3.1 spec + Orval config. Run codegen: `pnpm --filter @workspace/api-spec run codegen`

### `lib/api-client-react` (`@workspace/api-client-react`)
Generated React Query hooks from OpenAPI spec.

### `lib/api-zod` (`@workspace/api-zod`)
Generated Zod schemas from OpenAPI spec.
