# PayCore — Payroll & HR Management System

India-compliant, multi-tenant payroll & HR platform. Single **Next.js (App Router)** app with a strict **layered architecture** inside it, MongoDB/Mongoose, and a hand-built UI component library (no shadcn/Radix/Lucide).

> Status: **Foundation (Phase 1)** complete — tooling, auth, RBAC, audit trail, custom UI kit, app shell, and the Employee module end-to-end. Modules 4–14 (attendance → payroll → tax → statutory → payslips → …) build on these primitives.

## Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 15 (App Router) + TypeScript + React 19 |
| Data | MongoDB + Mongoose |
| Auth | Custom JWT (access + refresh, httpOnly cookies) + bcrypt |
| State | Zustand |
| Forms | React Hook Form + Zod (schemas shared client/server) |
| UI | Custom components in `src/components/ui` |
| Icons | `@phosphor-icons/react` |
| Animation | `motion` |
| Tables/Files | exceljs + papaparse |
| Tooling | ESLint + Prettier + Husky + lint-staged + commitlint |

## Architecture

```
Route Handler (HTTP)  →  Service (business rules)  →  Repository (DB access)  →  Mongoose Model
   src/app/api/v1            src/server/services         src/server/repositories      src/models
```

Cross-cutting concerns are wrappers/helpers, not scattered logic:

- **Auth + RBAC + errors** — `withRoute(handler, { permission: 'employees:edit' })` in `src/server/middlewares/with-route.ts`
- **Audit trail** — `recordAudit()` + `computeDiff()` (`src/lib/audit`), one row per create/update/delete
- **Multi-tenant + soft delete** — every query scoped by `companyId`, `isDeleted` filtered, in `BaseRepository`
- **Field encryption** — PAN/Aadhaar/bank account encrypted at rest (AES-256-GCM), masked in responses (`src/lib/utils/crypto.ts`)
- **Edge route protection** — `src/middleware.ts` gates pages by JWT validity

## Getting started

```bash
# 1. Install
npm install

# 2. Configure — copy and fill in (MONGODB_URI, generate secrets with `openssl rand -base64 48`)
cp .env.example .env

# 3. Seed a company, system roles, a SuperAdmin login, and sample data
npm run seed

# 4. Run
npm run dev      # http://localhost:3000
```

Default login after seeding (override in `.env`): `admin@paycore.local` / `ChangeMe@123`.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` / `start` | Production build / serve |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run seed` | Idempotent DB seed |

## API convention

Every module follows the same shape under `/api/v1`:

```
GET    /api/v1/{module}?page=&limit=&search=&sortBy=&sortDir=&[filters]
GET    /api/v1/{module}/:id
POST   /api/v1/{module}
PUT    /api/v1/{module}/:id
DELETE /api/v1/{module}/:id            # soft delete
POST   /api/v1/{module}/import         # CSV/XLSX upload + validation report
GET    /api/v1/{module}/export?format= # csv | xlsx
GET    /api/v1/{module}/template       # import template
GET    /api/v1/{module}/:id/audit-log
```

Responses use one envelope: `{ success, data, meta? }` or `{ success: false, error }`.

## Roles & permissions

System roles: **SuperAdmin, Admin, HR, Manager, Employee**. Permissions are `module:action`
strings (e.g. `payroll:approve`) defined in `src/lib/rbac/permissions.ts` — the single source of
truth for both route guards and the (future) Roles UI.

## Project layout

```
src/
  app/                # routes: (auth)/login, (protected)/*, api/v1/*
  components/ui/      # hand-built primitives (Button, Table, Modal, Toast, …)
  components/layout/  # Sidebar, Topbar, AppShell, PageHeader
  components/modules/ # feature components (StatCard, employees/*)
  lib/                # api client, auth, audit, rbac, validators, utils
  server/             # controllers→services→repositories→middlewares
  models/             # Mongoose schemas (+ shared base fields)
  store/ hooks/ config/ scripts/ types/
```
