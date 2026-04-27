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

## Required Secrets

| Name | Description |
|------|-------------|
| `MONGODB_URI` | MongoDB Atlas connection string. DB name overridden to `fishtokri_admin`. |
| `SESSION_SECRET` | JWT signing secret used by the API authentication routes. |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name used by image uploads. |
| `CLOUDINARY_API_KEY` | Cloudinary API key used by image uploads. |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret used by image uploads. |

Sensitive runtime values are read from Replit Secrets/environment variables. Imported hardcoded service credentials were removed from the PM2 ecosystem config during migration.

---

## Login

| Field | Value |
|-------|-------|
| Email | `admin@fishtokri.com` |
| Password | `FishTokri@Admin2024` |
| Role | Master Admin |

---

## Role-Based Section Access

All admin roles (`master_admin`, `super_hub`, `sub_hub`) share the **same UI shell**
(same sidebar component, same routes, same page components). Each role just sees
the subset of sections allotted to it. Delivery Person has its own dedicated UI.

| Section | Route(s) | Master Admin | Super Hub | Sub Hub |
|---------|----------|:-:|:-:|:-:|
| Dashboard | `/dashboard` | ✓ | ✓ | ✓ |
| Hubs | `/hubs`, `/hubs/:id` | ✓ | ✓ | – |
| Orders | `/orders`, `/orders/new`, `/orders/edit/:id` | ✓ | ✓ | ✓ |
| Vendor Management | `/vendor-management`, `/vendors`, `/vendor-invoices`, `/vendor-items`, `/vendor-categories`, `/stock-adjustment`, `/vendor-statement/:id` | ✓ | ✓ | – |
| Inventory Management | `/inventory`, `/inventory/products`, `/inventory/history`, `/inventory/adjustment` | ✓ | ✓ | ✓ |
| Banking | `/banking`, `/banking/accounts`, `/banking/receipts`, `/banking/payments` | ✓ | ✓ | – |
| Customers | `/customers` | ✓ | ✓ | ✓ |
| Admin Users | `/admin-users` | ✓ | – | – |
| Sub Hub Menu | `/sub-hub-menu/:id` (and `/menu` shortcut for sub_hub) | ✓ | ✓ | ✓ |

Legacy routes (`/super-hub-dashboard`, `/sub-hub-dashboard`, `/my-hubs`,
`/my-sub-hubs`, `/my-hub/:id`, `/my-sub-hub/:id`) redirect to their unified
equivalents. Login + role-select redirect every admin role to `/dashboard`
(delivery to `/delivery-dashboard`). Route role-checking is centralized in
`App.tsx` via `<ProtectedRoute allowedRoles=[...] />`. Sidebar nav filtering
lives in `components/layout.tsx` (`superHubAllowedHrefs` / `subHubAllowedHrefs`).

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
        dashboard.tsx       Unified admin dashboard (Master Admin + Super Hub + Sub Hub)
        super-hubs/         Super Hub list + detail pages
        sub-hubs/           Sub Hub pages
        admin-users/        Admin Users table
        delivery-dashboard.tsx  Delivery Person dashboard (mirrors Master Admin style:
                                today/week/month/lifetime delivered, status bar chart,
                                recent orders, monthly trend area chart, hub coverage)
        my-deliveries.tsx       Delivery Person Orders page (Active + History tabs)
        delivery-hubs.tsx       Delivery Person hubs page (assigned super/sub hubs)
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
- **Collections**: `super_hubs`, `sub_hubs`, `hub_users`, `vendor_item_categories`, `vendor_items`, `vendor_purchases`

### Hub Hierarchy
- **Super Hubs** — city level (e.g. Mumbai, Pune, Navi Mumbai)
- **Sub Hubs** — locality level under a super hub (e.g. Thane, Airoli, Vashi)
- Sub hubs store pincodes as a string array field

## Vendor Purchases

- Vendor "Buy" opens a full-page purchase entry flow in `artifacts/fishtokri-admin/src/pages/vendors.tsx`.
- Vendor Management overview lives at `/vendor-management` in `artifacts/fishtokri-admin/src/pages/vendor-management-overview.tsx` and summarizes vendor, purchase, category, item, and inventory analytics.
- The sidebar now labels the vendor area as "Vendor Management" with a "Vendor" subsection linking to the original vendors page.
- Vendor Items are managed separately at `/vendor-items` in `artifacts/fishtokri-admin/src/pages/vendor-items.tsx`.
- Vendor Items now use an inventory-style table UI and store richer attributes: item code/SKU, item type, purchase price, selling price, opening stock, current stock, and unit.
- Vendor Items use master DB collections `vendor_item_categories` and `vendor_items` for raw materials, uncut food items, packaging, and equipment purchased from vendors.
- Vendor Categories now show only categories created in Vendor Management. They can optionally store `linkedSubHubCategoryNames` to connect a vendor category (for example, Raw Chicken) to one or more sub-hub menu categories (for example, Chicken plus Eggs).
- Vendor Items displays linked categories as sub-hub products using product-style columns for every linked sub-hub category, while unlinked categories such as Electronics or Equipment continue to use normal vendor item inventory columns.
- Stock Adjustment requires selecting a Super Hub and Sub Hub before item selection. It uses the same linked-category logic as Vendor Items, filters linked products to the selected sub hub, stores the hub context on each adjustment, and saves quantity changes back to that sub-hub product.
- Each sub-hub product has a `batches[]` array (batchNumber, quantity, shelfLifeDays, receivedDate, expiryDate, notes). The total `quantity` field is always recomputed as the sum of batch quantities. Stock adjustments are batch-centric: "Add Batch" pushes a new batch with shelf life or explicit expiry; "Reduce" consumes from existing batches FIFO (earliest expiry first). Order deductions/restorations also flow through batches FIFO. Inventory pages show next-expiry per product, expanding to list all batches with color-coded expiry urgency.
- Seeded vendor categories include Chicken, Cleaning Material, Dry Fish, Eggs, Electronics, Equipments, Fish And Seafood, FROZEN FOODS, Mutton, Pomfret, Prawns, Ready to Cook, Services, and Spices, plus existing Raw Chicken and Whole Fish. Food categories with matching sub-hub menu categories are linked; vendor-only categories have sample inventory items.
- The purchase flow requires selecting a destination Super Hub and Sub Hub for tracking, but purchased items are selected only from existing Vendor Item categories and Vendor Items.
- Vendor purchases no longer create, update, or load customer-facing sub-hub menu products.
- Purchase item records store the selected `vendorItemId` and `vendorItemCategoryId` along with batch quantity, shelf life, unit, cost/unit, expiry date, and total price.

---

## Sub-Hub DB Schema (per sub-hub MongoDB DB e.g. "Thane")

Each sub-hub connects to its own MongoDB database (name stored in `SubHub.dbName`).
Collections and key fields as of latest sync with Thane DB:

- **products**: `name`, `description`, `category`, `subCategory`, `price`, `originalPrice`, `discountPct`, `unit`, `weight`, `grossWeight`, `netWeight`, `pieces`, `serves`, `quantity`, `status`, `isArchived`, `imageUrl`, `limitedStockNote`, `couponIds[]`, `sectionId[]`, `recipes[]`
- **categories**: `name`, `slug`, `description`, `image`, `subCategories[]`, `isActive`, `sortOrder`
- **combos**: `name`, `description`, `fullDescription`, `serves`, `weight`, `discountedPrice`, `originalPrice`, `discount`, `imageUrl`, `includes[{label}]`, `tags[]`, `isActive`, `sortOrder`
- **coupons**: `code`, `title`, `description`, `color`, `type`, `discountValue`, `minOrderAmount`, `maxUsage`, `applicableCategories[]`, `isFirstTimeOnly`, `isActive`, `expiresAt`
- **carousels**: `title`, `image`, `link`, `isActive`, `sortOrder`
- **sections**: `name`, `isActive`, `sortOrder`
- **pincodes**: `pincode`, `area`, `city`, `isActive`
- **timeslots**: `label`, `startTime`, `endTime`, `isInstant`, `extraCharge`, `isActive`, `sortOrder`

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

GET    /api/orders                       # list/filter/paginate; supports ?assignedTo=ID
GET    /api/orders/stats                 # global per-status counts
GET    /api/orders/delivery-stats        # scoped stats for one delivery person (?assignedTo=ID)

GET    /api/vendors/analytics/summary

# Per-sub-hub menu routes (artifacts/api-server/src/routes/sub-hub-menu.ts)
GET  /api/sub-hubs/:id/menu/stats
GET|POST        /api/sub-hubs/:id/menu/products
PUT|DELETE      /api/sub-hubs/:id/menu/products/:productId
GET|POST        /api/sub-hubs/:id/menu/categories
PUT|DELETE      /api/sub-hubs/:id/menu/categories/:categoryId
GET|POST        /api/sub-hubs/:id/menu/combos
PUT|DELETE      /api/sub-hubs/:id/menu/combos/:comboId
GET|POST        /api/sub-hubs/:id/menu/coupons
PUT|DELETE      /api/sub-hubs/:id/menu/coupons/:couponId
GET|POST        /api/sub-hubs/:id/menu/carousels
PUT|DELETE      /api/sub-hubs/:id/menu/carousels/:carouselId
GET|POST        /api/sub-hubs/:id/menu/sections
PUT|DELETE      /api/sub-hubs/:id/menu/sections/:sectionId
GET|POST        /api/sub-hubs/:id/menu/pincodes
PUT|DELETE      /api/sub-hubs/:id/menu/pincodes/:pincodeId
GET|POST        /api/sub-hubs/:id/menu/timeslots
PUT|DELETE      /api/sub-hubs/:id/menu/timeslots/:timeslotId
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
