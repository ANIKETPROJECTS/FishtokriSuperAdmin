# FishTokri Admin — Workspace

## Overview

pnpm monorepo. Express 5 + MongoDB backend, React 19 + Vite 7 + TailwindCSS 4 frontend. Single-command startup via `scripts/dev.sh`.

---

## Startup

**Workflow:** `artifacts/fishtokri-admin: web`
**Command:** `cd /home/runner/workspace && bash scripts/dev.sh`

`dev.sh` sequence:
1. Starts API server in background: `PORT=8080 pnpm run dev` (from `artifacts/api-server`)
2. Polls `GET localhost:8080/api/healthz` until healthy
3. Starts Vite frontend: `PORT=5000 BASE_PATH=/ pnpm run dev` (from `artifacts/fishtokri-admin`)

Preview served at port **5000**. Vite proxies `/api/*` → `localhost:8080`.

---

## Required Secret

| Name | Description |
|------|-------------|
| `MONGODB_URI` | MongoDB Atlas connection string. DB name overridden to `fishtokri_admin`. |

---

## Login

| Field | Value |
|-------|-------|
| Email | `admin@fishtokri.com` |
| Password | `FishTokri@Admin2024` |
| Role | Master Admin |

---

## Project Structure

```
artifacts/
  api-server/           Express 5 API server (port 8080)
    src/
      app.ts            Express setup (cors, pino, json)
      index.ts          Server entry — connectDB() then listen()
      db/
        index.ts        Mongoose connectDB()
        models/         Mongoose models (SuperHub, SubHub, HubUser)
      routes/
        index.ts        Mounts all routers
        health.ts       GET /api/healthz
        auth.ts         POST /api/auth/login (JWT)
        super-hubs.ts   CRUD + toggle-status
        sub-hubs.ts     CRUD + toggle-status (nested under super-hubs)
        users.ts        CRUD + toggle-status
        stats.ts        GET /api/stats/summary

  fishtokri-admin/      React + Vite frontend (port 5000)
    src/
      main.tsx          React entry
      App.tsx           Wouter router + protected routes + role auth
      index.css         TailwindCSS v4 config + CSS custom properties
      pages/
        role-select.tsx     Role selection landing page
        login.tsx           Login form
        dashboard.tsx       Stats overview
        super-hubs/         Super Hub list + detail pages
        sub-hubs/           Sub Hub pages
        admin-users/        Admin Users table
        coming-soon.tsx     Placeholder for future sections

lib/
  api-client-react/     React Query hooks + fetch client (used by frontend)
  api-zod/              Zod schemas from OpenAPI spec (used by API server health route)
  db/                   Drizzle/PostgreSQL template package — NOT used, safe to ignore
  api-spec/             OpenAPI spec used to generate api-client-react + api-zod

scripts/
  dev.sh                Unified startup script (API → Vite)
  post-merge.sh         Post-merge hook: runs pnpm install
```

---

## Database

- **Type**: MongoDB (Mongoose)
- **Database name**: `fishtokri_admin`
- **Collections**: `super_hubs`, `sub_hubs`, `hub_users`

### Hub Hierarchy
- **Super Hubs** — city level (e.g. Mumbai, Pune, Navi Mumbai)
- **Sub Hubs** — locality level under a super hub (e.g. Thane, Airoli, Vashi)
- Sub hubs store pincodes as a string array field

---

## API Routes

```
GET  /api/healthz
POST /api/auth/login

GET    /api/super-hubs
POST   /api/super-hubs
GET    /api/super-hubs/:id
PUT    /api/super-hubs/:id
DELETE /api/super-hubs/:id
PATCH  /api/super-hubs/:id/toggle-status
GET    /api/super-hubs/:id/sub-hubs
POST   /api/super-hubs/:id/sub-hubs

PUT    /api/sub-hubs/:id
DELETE /api/sub-hubs/:id
PATCH  /api/sub-hubs/:id/toggle-status

GET    /api/users
POST   /api/users
PUT    /api/users/:id
DELETE /api/users/:id
PATCH  /api/users/:id/toggle-status

GET    /api/stats/summary
```

---

## Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 24 |
| Package manager | pnpm workspaces |
| Language | TypeScript 5.9 |
| API framework | Express 5 |
| Database | MongoDB via Mongoose |
| Frontend | React 19 |
| Bundler | Vite 7 |
| Styling | TailwindCSS 4 |
| State / data | TanStack React Query 5 |
| Routing | Wouter |
| Auth | JWT (jsonwebtoken) |
| Validation | Zod |
