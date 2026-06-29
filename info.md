# ZribbleOS — Full-Stack Handover Document
## State: Backend Wired, Bugs Found, Fixes Not Yet Applied

> **For the incoming Claude:** Read this entirely before touching any code. This document is the single source of truth for the current state of ZribbleOS. It explains what the system is, how every file works (frontend and backend), the database schema, and — most importantly — a complete, file-by-file list of every gap/bug found in a full code review, with a concrete fix plan for each. The previous handover doc (titled "ZribbleOS — Backend Handover Document") covered Phase 1 (build the backend). This document covers Phase 2 (the backend now exists and is wired to the frontend, but the wiring has real bugs — your job is to fix them).
>
> Do not re-architect anything. Do not re-derive the schema from scratch. Everything you need is below. Jump straight to **Section 7 (Bug Registry)** if you just want the punch list, but read Sections 1–6 first so you understand *why* each bug happened — almost all of them trace back to a handful of root causes (see Section 8).

---

## 1. What Is This Project?

**ZribbleOS** (UI branded as **ZribbleOS — Sales Pipeline**) is an internal operations dashboard for **Zribble**, a digital marketing agency in India. It manages:

- Client contracts (which agency service a client bought, for how much, for how long)
- Recurring renewal payments (each contract renews every N months at a fixed amount)
- Payment collection tracking (full / partial / promised-but-not-yet-paid / overdue / waived)
- Salesperson ("executive") performance and portfolio breakdowns
- Onboarding payments (the upfront payment when a contract is first signed, separate from renewals)
- Role-based access for super admins, the accounts team, and 6 salespeople with two permission tiers

The system was built **frontend-first** against an entirely in-memory mock dataset (178 real client contracts hand-converted into a TypeScript array). The backend was added afterward by the same single contributor, working across several sessions over a few days, without any design doc or PR review process. That history matters: it explains most of the bugs in Section 7 — they are not random; they are exactly the kind of seams that appear when a UI built for mock data gets retrofitted onto a real API one component at a time, and a couple of components never got their final wiring pass.

---

## 2. Tech Stack & Deployment

| Layer | Stack |
|---|---|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS v3, Recharts v2, lucide-react, @tanstack/react-query v5, SheetJS (xlsx) for export |
| Backend | Node.js + Express, TypeScript, Prisma ORM, PostgreSQL, JWT (jsonwebtoken), bcrypt, cookie-parser, cors |
| Frontend hosting | Vercel |
| Backend hosting | Railway (Postgres plugin + Node service) |
| Repo structure | Monorepo: `/frontend` and `/backend` at the root, single git history (see Section 9) |

**Environment variable wiring:**
- Frontend: `NEXT_PUBLIC_API_URL` → points at the Railway backend URL. Changing this requires zero code changes.
- Backend: `DATABASE_URL` (auto-injected by Railway Postgres), `JWT_SECRET` (64-char hex), `FRONTEND_URL` (used for CORS origin), `NODE_ENV`, `PORT` (auto-set by Railway).

**Local dev expectation (per `backend/env.example`):** `FRONTEND_URL="http://localhost:3000"`, `NODE_ENV="development"`. This matters — see Bug #5, it's currently broken for this exact setup.

---

## 3. Database Schema (Prisma) — Current, Live, Matches Migration Exactly

File: `backend/prisma/schema.prisma`. One migration exists: `backend/prisma/migrations/20260626042155_init/migration.sql`. I diffed the migration SQL against the schema field-by-field — **they are in sync, no drift.** Do not regenerate a migration unless you actually change the schema.

```prisma
enum UserRole { super_admin accounts_team employee }
enum EmployeeMode { view view_edit }
enum PaymentStatus { pending partial collected overdue waived }
enum GSTStatus { Y N }
enum ContractStatus { active stopped }
enum PaymentType { onboarding renewal }

model User {
  id, name, email (unique), passwordHash, role, mode?, salesperson?, createdAt, createdBy
}

model Contract {
  id, salesperson, clientName, product, accountManager, contractId?,
  profiles, gstStatus, dealValue, contractTermMonths, firstRenewalDate (String, ISO date),
  contractStatus (default active), createdAt, updatedAt
  → renewalMonths[], payments[], promises[], priceOverrides[], contractEdits[], onboarding? (1:1)
}

model RenewalMonth {
  id, contractId, year, month, amount, overriddenAmount?, status (default pending)
  @@unique([contractId, year, month])
  → contract (FK, cascade delete)
  // NOTE: There is deliberately NO `payments Payment[]` relation here. Payment links
  // to Contract only. To find payments for a specific renewal month, query
  // Payment WHERE contractId = X AND renewalYear = Y AND renewalMonth = M.
  // This was a deliberate fix from the original schema draft (Prisma rejected a
  // compound FK from Payment to RenewalMonth as ambiguous). Keep it this way.
}

model Payment {
  id, contractId, renewalYear, renewalMonth, amount, paidOn (String date),
  notes?, recordedBy (userId string), type (default renewal), createdAt
  → contract (FK, cascade delete)
}

model Promise {
  id, contractId, clientName, salesperson, renewalYear, renewalMonth,
  paidAmount, remainingAmount, promisedDate (String date), notes?, createdAt
  → contract (FK, cascade delete)
}

model ClientNote {
  id, clientName, text, createdAt, createdBy
  // NOTE: not linked to Contract by FK — linked only by clientName string.
  // This is intentional: notes are per-client, and a client can have multiple
  // contracts (multiple services). A clientName can also be free-typed on the
  // new-entry form, so there's no hard guarantee of referential integrity here.
}

model OnboardingPayment {
  id, contractId (unique, 1:1), clientName, salesperson,
  status (String, not enum — values used in practice: "collected"|"partial"|"not_collected"),
  amountCollected, paidOn, notes?
  → contract (FK, cascade delete)
}

model PriceOverride {
  id, contractId, fromYear, fromMonth, newAmount, createdAt
  → contract (FK, cascade delete)
  // Applying an override updates RenewalMonth.overriddenAmount for every
  // RenewalMonth row >= fromYear/fromMonth for that contract (see overrides.ts).
}

model ContractEdit {
  id, contractId, changes (Json), previousValues (Json), editedAt, editedBy
  → contract (FK, cascade delete)
  // Audit trail of PATCH /contracts/:id edits.
}
```

**Seed data** (`backend/prisma/seed.ts`): 8 users (1 super_admin, 1 accounts_team, 6 employees — 3 with `view_edit` mode, 3 with `view` mode) + 178 real contracts copied verbatim from the original `frontend/src/lib/mock-data.ts`, expanded into `RenewalMonth` rows (one row per non-zero monthly value across a 30-month window, Jul-2026 → Dec-2028). All renewal statuses seed as `pending`. **Do not put `prisma db seed` in the build/deploy command** — it will fail on the `@@unique([contractId, year, month])` constraint on redeploy. Run it once manually: `railway run npx prisma db seed`.

**Seeded login credentials** (also documented in `frontend/src/app/login/page.tsx` as on-screen demo hints):

| Email | Password | Role | Mode |
|---|---|---|---|
| admin@zribble.com | admin123 | super_admin | — |
| accounts@zribble.com | accounts123 | accounts_team | — |
| aftab@zribble.com | aftab123 | employee | view_edit |
| sarvesh@zribble.com | sarvesh123 | employee | view_edit |
| firoz@zribble.com | firoz123 | employee | view_edit |
| idris@zribble.com | idris123 | employee | view |
| prajay@zribble.com | prajay123 | employee | view |
| vinay@zribble.com | vinay123 | employee | view |

---

## 4. Backend — File-by-File

```
backend/
├── .env.example          ← BROKEN: contains only the literal character "r". Ignore/delete.
├── env.example            ← the REAL template. See Section 2 for contents.
├── railway.toml           ← build/deploy config for Railway (nixpacks)
├── package.json
├── tsconfig.json
├── prisma/
│   ├── schema.prisma      ← Section 3 above
│   ├── seed.ts            ← seeds 8 users + 178 contracts + renewal months
│   └── migrations/20260626042155_init/migration.sql
└── src/
    ├── index.ts
    ├── lib/prisma.ts
    ├── middleware/
    │   ├── auth.ts
    │   └── role.ts
    └── routes/
        ├── auth.ts
        ├── contracts.ts
        ├── renewals.ts
        ├── payments.ts
        ├── promises.ts
        ├── notes.ts
        ├── onboarding.ts
        ├── overrides.ts
        ├── dashboard.ts
        └── users.ts
```

### `src/index.ts`
Express app setup. CORS configured with `origin: process.env.FRONTEND_URL, credentials: true` (correctly — never wildcards `*` since credentials require an exact origin). Mounts `cookie-parser`, `express.json()`, a `/health` check, then every route module under its prefix (`/auth`, `/contracts`, `/renewals`, `/payments`, `/promises`, `/notes`, `/onboarding`, `/price-overrides`, `/dashboard`, `/users`). Ends with a generic error-handling middleware that logs and returns 500. Compiles clean, runs clean. No bugs found here.

### `src/lib/prisma.ts`
Standard singleton Prisma client export. Nothing notable.

### `src/middleware/auth.ts`
Exports `authenticate(req, res, next)`. Reads `req.cookies.token`, verifies with `jsonwebtoken.verify(token, JWT_SECRET)`, attaches the decoded payload (`{ userId, role, mode?, salesperson? }`) to `req.user`. Returns 401 if missing or invalid. Also declares the `AuthUser` interface and extends the global Express `Request` type. No bugs — this side of auth is fine. The bug is in how the cookie is *set* (see `routes/auth.ts` below and Bug #5).

### `src/middleware/role.ts`
Three exports:
- `requireRole(...roles)` — 403 unless `req.user.role` is in the allowed list. Used by `users.ts` (super_admin only).
- `requireMode(...modes)` — for employees only, checks `req.user.mode`; non-employees always pass. **Defined but currently unused anywhere in the route files** — not a bug, just dead/unused-but-harmless utility, flag for cleanup only.
- `canWrite` — the workhorse: allows `super_admin` OR (`employee` AND `mode === "view_edit"`). Explicitly **excludes `accounts_team` from all writes.** Used on every mutating route (contracts POST/PATCH, payments, promises, notes, onboarding, overrides). This matches the documented permission matrix exactly (`accounts_team` can see everything but never write).

### `src/routes/auth.ts`
- `POST /auth/login` — looks up user by email, bcrypt-compares password (uses a constant-time dummy-hash compare on user-not-found to avoid timing leaks on email enumeration — nice touch, no bug there), signs a 7-day JWT, and sets it as a cookie via:
  ```ts
  res.cookie("token", token, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  ```
  **🔴 This is Bug #5 — see Section 7.** `secure: true` means the browser will only store/send this cookie over HTTPS. `env.example` explicitly sets up `http://localhost:3000` / `NODE_ENV=development` for local dev, where this cookie will silently never persist. Login returns 200 with a `user` object, so it visually looks like it worked, but every subsequent request has no cookie and gets 401'd by `authenticate`. Git history shows two consecutive commits titled "trying to fix auth" — this is almost certainly what they were fighting.
- `POST /auth/logout` — clears the cookie with matching options. Fine once the bug above is fixed (the clear options need to match whatever the fixed `secure`/`sameSite` values become).
- `GET /auth/me` — returns the current user from the JWT payload's `userId`, re-fetched fresh from DB (so role/mode changes take effect without re-login). Fine.

### `src/routes/contracts.ts`
- `GET /contracts/salespersons` — **must be (and is) registered before `/:id`** so Express doesn't treat "salespersons" as a contract ID. Returns distinct salesperson names; employees always get just their own name. Correct.
- `GET /contracts` — returns all contracts (filtered to `salesperson = req.user.salesperson` for employees), each with `renewalMonths[]`, `payments[]` (full list, not scoped to a renewal month), `promises[]`, and `onboarding` included via Prisma `include`. **This is important: the backend DOES send back the contract's full payment list.** The bug that throws this away is purely on the frontend side (Bug #4).
- `GET /contracts/:id` — single contract, same includes plus `contractEdits[]`. 403 if an employee requests a contract that isn't theirs.
- `POST /contracts` — creates a contract. Employees are forced onto their own `salesperson` name (`effectiveSalesperson`) regardless of what's in the request body — a nice server-side guard against an employee creating a contract under someone else's name. Accepts an optional `renewalSchedule: {year, month, amount}[]` and bulk-creates the matching `RenewalMonth` rows (`status: "pending"`), filtering out any zero-amount entries. `canWrite`-gated.
- `PATCH /contracts/:id` — generic field-level edit. Whitelists editable fields (`clientName, product, accountManager, contractId, profiles, gstStatus, dealValue, contractTermMonths, firstRenewalDate`), diffs against current values, and — in one transaction — applies the update AND writes a `ContractEdit` audit row capturing `changes` + `previousValues`. `canWrite`-gated, employee-ownership-checked.
- `PATCH /contracts/:id/status` — sets `contractStatus` to `"active"` or `"stopped"`. `canWrite`-gated, ownership-checked. **The frontend writes to this endpoint correctly but never reads it back to restore UI state — see Bug #6.**

### `src/routes/renewals.ts`
- `GET /renewals?year=&month=&salesperson=` — returns `RenewalMonth` rows filtered by year/month and (for employees) forced to their own salesperson, each including its parent contract and that contract's payments **scoped to the matching renewal year/month** (`payments: { where: year && month ? {...} : {} }`). This is the "correct" pattern for attaching payments to a renewal month — note this for the fix to Bug #4, because this route already demonstrates the right Prisma query shape.
- `GET /renewals/summary?salesperson=` — aggregates `RenewalMonth` (grouped by year/month/status, summed) and `Payment` (grouped by year/month, summed, `type: "renewal"` only) and merges them into a clean `{ year, month, expected, collected, pending, partial, overdue, waived }[]` array. This is genuinely the *most correct* aggregation in the whole backend for "how much did we actually collect this month" because it sources `collected` from the real `Payment` table, not from `RenewalMonth.status`. **The frontend hook for this (`useRenewalSummary`) exists but is never called anywhere — see Bug #9.** Wiring a dashboard widget to this endpoint instead of recomputing from `useContracts()` would also sidestep Bug #4 entirely for that widget.
- `PATCH /renewals/:contractId/:year/:month/status` — manual status override (e.g., force to `overdue` or `waived`). Validates the status enum, checks contract exists and ownership, then updates. `canWrite`-gated. No path-collision with `/summary` (different segment counts) — verified, not a routing bug.

### `src/routes/payments.ts`
- `POST /payments` — records a `Payment` row, then (if `type` is `renewal` or omitted) calls the local helper `recalcRenewalStatus(contractId, year, month)`, which sums all renewal-type payments for that contract/year/month, compares against `overriddenAmount ?? amount`, and sets the `RenewalMonth.status` to `pending` (0 paid), `partial` (some but not enough), or `collected` (enough or more) — **but explicitly skips recalculation if the current status is `overdue` or `waived`**, treating those as intentional manual overrides that a payment shouldn't silently clear. This is correct, deliberate behavior, not a bug.
- `DELETE /payments/:id` — deletes a payment and re-runs the same recalculation (only for `type: "renewal"` payments — deleting an onboarding payment doesn't touch renewal status, correctly). Ownership-checked, `canWrite`-gated.
- **This endpoint is fully correct and ready to use. The frontend simply isn't calling it from most of the places it should — see Bugs #2 and #3.**

### `src/routes/promises.ts`
`GET /` (own-scoped for employees), `POST /` (creates a promise, defaults `clientName`/`salesperson` from the parent contract if not supplied), `DELETE /:id` (ownership-checked). All `canWrite`-gated except the GET. Matches the frontend's `usePromises`/`useCreatePromise`/`useDeletePromise` hooks exactly in shape. **`useDeletePromise` exists on the frontend but no UI button calls it — see Bug #8.**

### `src/routes/notes.ts`
`GET /:clientName` (decodes the URI param, returns notes for that client name, newest first), `POST /` (`canWrite`-gated, requires `clientName` + `text`). Simple, correct, matches `useNotes`/`useCreateNote`.

### `src/routes/onboarding.ts`
`GET /:clientName` (404 if none exists — note this is `findFirst` keyed by clientName, not contractId, even though the DB unique constraint is on `contractId`; if a client has multiple contracts only one onboarding record will ever be findable by this route, which is consistent with the product's "one onboarding payment per client" mental model but worth knowing), `POST /` (upserts by `contractId`, `canWrite`-gated). Matches `useOnboarding`/`useUpsertOnboarding`.

### `src/routes/overrides.ts`
`POST /` — creates a `PriceOverride` row and, in the same transaction, updates `overriddenAmount` on every `RenewalMonth` for that contract from `fromYear`/`fromMonth` onward (inclusive). `canWrite`-gated, ownership-checked. Matches `useCreatePriceOverride`. No bugs.

### `src/routes/dashboard.ts`
`GET /stats` — single efficient endpoint computing: total/active/stopped contract counts, total active deal value, renewal counts+amounts grouped by status, total collected (sum of all `renewal`-type payments), upcoming renewals for the next 3 calendar months (`pending`/`partial` only, capped at 20), and (for non-employees only) a per-salesperson breakdown of active contract count + deal value. All scoped to the employee's own salesperson when applicable. **This is a well-built, purpose-made aggregation endpoint that the frontend dashboard does not use at all — see Bug #9.** Every dashboard widget instead independently recomputes from `useContracts()`, which means they inherit Bug #4 (and do more client-side work than necessary).

### `src/routes/users.ts`
Mounted with `router.use(requireRole("super_admin"))` at the top — the **entire** router is super-admin-only, not just individual routes. `GET /` (list, omits `passwordHash`), `POST /` (create, validates required fields, checks email uniqueness, bcrypt-hashes the password, records `createdBy`), `PATCH /:id` (partial update, re-checks email uniqueness if changing it, re-hashes password only if a new one is supplied), `DELETE /:id` (blocks self-deletion). **All four endpoints are correctly built and tested-clean. Only `GET /` is ever called from the frontend — see Bug #7.**

---

## 5. Frontend — File-by-File

```
frontend/
├── next.config.mjs, postcss.config.mjs, tailwind.config.ts, tsconfig.json
├── src/
│   ├── app/
│   │   ├── layout.tsx           ← root layout: QueryProvider > AuthProvider > ClientProvider > AppShell
│   │   ├── page.tsx              ← redirects "/" → "/dashboard"
│   │   ├── globals.css
│   │   ├── login/page.tsx
│   │   ├── dashboard/page.tsx
│   │   ├── renewals/page.tsx
│   │   ├── payments/page.tsx
│   │   ├── clients/page.tsx
│   │   ├── salesperson/page.tsx + SalespersonContent.tsx
│   │   ├── new-entry/page.tsx
│   │   ├── insights/page.tsx
│   │   └── settings/page.tsx
│   ├── components/
│   │   ├── layout/      (AppShell, Sidebar, Topbar, PageWrapper)
│   │   ├── dashboard/    (StatCards, RevenueChart, PipelineDonut, SalespersonTable, UpcomingRenewals)
│   │   ├── renewals/     (MonthPicker, RenewalCalendar, RenewalTable, PaymentModal)
│   │   ├── payments/     (PaymentHistory, OutstandingLedger)
│   │   ├── clients/      (ClientList, ClientCard, ClientDetailModal, ClientLink)
│   │   ├── salesperson/  (ExecSelector, ExecStats, ExecChart, ExecContractTable)
│   │   └── ui/           (Button, Input, Select, Card, Modal, Table, Badge, Misc)
│   ├── lib/
│   │   ├── api.ts              ← all backend fetch hooks (React Query)
│   │   ├── client-context.tsx  ← global app state + mutation orchestration
│   │   ├── auth-context.tsx    ← session state + permission checks
│   │   ├── QueryProvider.tsx
│   │   ├── export.ts           ← Excel export, self-contained, no backend dependency
│   │   ├── range-utils.ts
│   │   ├── utils.ts
│   │   └── mock-data.ts        ← DEAD CODE, no longer imported anywhere, safe to delete
│   └── types/index.ts
```

### `src/app/layout.tsx`
Wraps the whole app in `QueryProvider` → `AuthProvider` → `ClientProvider` → `AppShell`. Loads Inter + JetBrains Mono via `next/font/google`. No bugs.

### `src/components/layout/AppShell.tsx`
Client-side route guard. `PUBLIC_PATHS = ["/login"]`. On every navigation: if not loading and no user and not on a public path → redirect to `/login`; if there's a user and we're on `/login` → redirect to `/dashboard`. Shows a centered spinner while `isLoading`. **This logic is correct, but it is entirely dependent on `useAuth()`'s `user` state, which depends on the `/auth/me` cookie check succeeding — so Bug #5 (cookie) will manifest here as "login appears to succeed, then immediately bounces back to /login."** No independent bug in this file.

### `src/components/layout/Sidebar.tsx`
Renders nav grouped into Overview / Management / Actions, plus conditionally-shown Insights (`canPerform("view_all")`) and Settings (`canPerform("view_settings")`) sections, plus a per-salesperson quick-link list filtered to `canPerform("view_all") || user.salesperson === name`.
**🟡 Bug-adjacent finding:** the `SALESPEOPLE` array used for the quick-link account counts (`{ name: "Aftab", accounts: 73 }`, etc.) is **hardcoded** and not derived from `useContracts()`. These numbers will drift from reality as contracts are added/stopped. Not in the main Bug Registry numbering since it's cosmetic, but listed in Section 7's minor-issues table.
**🟡 Also note:** "New Entry" is listed unconditionally in `NAV_ITEMS` with no `canPerform("add_client")` check — ties into Bug #10.

### `src/components/layout/Topbar.tsx`, `PageWrapper.tsx`
Pure presentational layout chrome. No data fetching, no bugs.

### `src/app/login/page.tsx`
Plain controlled form, calls `useAuth().login(email, password)`, redirects to `/dashboard` on success. Shows the 3 demo credential rows as on-screen hints (matches seed data exactly). No bugs.

### `src/lib/auth-context.tsx`
`AuthProvider` holds `user`, `isLoading`. On mount, calls `GET /auth/me` with `credentials: "include"`; sets `user` if it returns 200. `login()` POSTs to `/auth/login`. `logout()` POSTs to `/auth/logout` then clears local `user` state. `canPerform(action)` is a single switch statement implementing the permission matrix:

| Action | super_admin | accounts_team | employee/view | employee/view_edit |
|---|---|---|---|---|
| view_all | ✅ | ✅ | ❌ | ❌ |
| record_payment | ✅ | ❌ | ❌ | ✅ |
| add_client | ✅ | ❌ | ❌ | ✅ |
| edit_client | ✅ | ❌ | ❌ | ✅ |
| stop_client | ✅ | ❌ | ❌ | ✅ |
| export_excel | ✅ | ❌ | ❌ | ❌ |
| view_settings | ✅ | ❌ | ❌ | ❌ |
| manage_users | ✅ | ❌ | ❌ | ❌ |

This matches the backend's `canWrite` logic and the Settings page's on-screen Permission Matrix exactly. **The function itself has no bug — the bug is that several components never call it (Bug #10).**

### `src/lib/api.ts`
Central React Query hook layer. One `apiFetch<T>()` wrapper (adds `credentials: "include"`, JSON headers, throws on non-2xx). Exports:

| Hook | Endpoint | Notes |
|---|---|---|
| `useContracts()` | `GET /contracts` | **🔴 Bug #4 lives here** — maps `renewalMonths` → `renewalSchedule` but hardcodes `payments: []` on every entry instead of attaching the contract's real `payments[]` filtered by year/month. |
| `useCreateContract()` | `POST /contracts` | Correct. |
| `usePatchContract()` | `PATCH /contracts/:id` | Correct. |
| `usePatchContractStatus()` | `PATCH /contracts/:id/status` | Correct (write side only — nothing reads it back, Bug #6). |
| `useRecordPayment()` | `POST /payments` | Correct, but several call sites never invoke it (Bugs #2, #3). |
| `useCreatePromise()` / `usePromises()` | `/promises` | Correct. |
| `useNotes()` / `useCreateNote()` | `/notes` | Correct. |
| `useOnboarding()` / `useUpsertOnboarding()` | `/onboarding` | Correct, but never reached for *new* clients (Bug #1). |
| `useCreatePriceOverride()` | `POST /price-overrides` | Correct. |
| `useDashboardStats()` | `GET /dashboard/stats` | **Defined, fully correct, never called anywhere (Bug #9).** |
| `useSalespersons()` | `GET /contracts/salespersons` | Correct. |
| `useUpdateRenewalStatus()` | `PATCH /renewals/:id/:y/:m/status` | Correct. |
| `useRenewalSummary()` | `GET /renewals/summary` | **Defined, fully correct, never called anywhere (Bug #9).** |
| `useDeletePayment()` | `DELETE /payments/:id` | **Defined, correct, no UI calls it (Bug #8).** |
| `useDeletePromise()` | `DELETE /promises/:id` | **Defined, correct, no UI calls it (Bug #8).** |

### `src/lib/client-context.tsx`
`ClientProvider` is the orchestration layer between UI actions and the `api.ts` mutation hooks, plus some local-only UI state. Holds:
- `selectedContracts` / `open` — drives the `ClientDetailModal` (rendered once here, controlled via `openClient()`).
- `stoppedClients` / `stoppedContracts` (local `Set<string>`, **never initialized from `contract.contractStatus` — this is Bug #6**). `stopClient`/`reactivateClient`/`stopContract`/`reactivateContract` correctly call `patchStatusMutation` (backend write works); `isClientStopped`/`isContractStopped` only ever read the local Set (backend read is missing).
- `promises`, `notes`, `onboardingPayments` — local optimistic-update arrays, each paired with a real mutation call (`addPromise` → `createPromiseMutation.mutate`, `addNote` → `createNoteMutation.mutate`, `addOnboardingPayment` → `upsertOnboardingMutation.mutate`). These three functions are correctly wired end-to-end.
- `priceOverrides` (local cache of overrides, paired with `createOverrideMutation` inside `recordPayment`).
- `recordPayment(data)` — the **correct, fully-wired** way to record a payment: handles attached promises, handles a price override if cascading, and finally calls `recordPaymentMutation.mutate(...)` against `POST /payments`. **This function is exactly what should be called from every "Save Payment" flow, and currently is not, in 3 of 4 places — see Bugs #2 and #3.**
- `editContract` → `patchContractMutation.mutate`. Correct.
- `addContract(contract)` → `createContractMutation.mutate({...contract, renewalSchedule: ...})`. **Correct and fully wired** — proven by its use in `ClientDetailModal`'s "Add Service" flow. **Bug #1 is that `new-entry/page.tsx` never calls this function at all.**
- Contains one leftover comment artifact: `// REPLACE with:` directly above the `renewalSchedule` line inside `addContract` — harmless but should be cleaned up (Section 7 minor issues).

### `src/lib/QueryProvider.tsx`
Standard React Query `QueryClientProvider` wrapper. No bugs.

### `src/lib/export.ts`
`exportSalespersonExcel(exec, contracts)` — pure client-side function building an `.xlsx` via SheetJS from whatever `Contract[]` it's handed (header row of all 30 month columns + totals row). No backend dependency, doesn't touch the broken `payments` field, no bugs.

### `src/lib/range-utils.ts`
`DateRange` type + `rangeFromMonths(n)` helper for the dashboard's "last N months" selector. No bugs.

### `src/lib/utils.ts`
`cn()` (clsx+tailwind-merge), `formatCurrency`/`formatCurrencyFull`/`formatDate`, `getMonthLabel`/`getMonthShort`, `statusColor`/`statusLabel`, `SALESPERSON_COLORS` map, `MONTH_COLS` (the canonical 30-month column list, must match the seed script's identical constant), `parseMonthCol`, `effectiveAmount`. No bugs — these are the shared primitives almost every component imports.

### `src/lib/mock-data.ts`
**Dead code.** Confirmed via repo-wide grep: nothing imports from this file anymore. It still defines `SALES_SUMMARY`, `MONTHLY_TOTALS`, `UPCOMING_RENEWALS`, `DASHBOARD_STATS` typed against the *old* shapes in `types/index.ts` (`SalesSummary`, `MonthlyTotal`, `UpcomingRenewal`, and a `DashboardStats` interface that is a **different, incompatible shape** from the one actually used — `api.ts` defines and exports its own local `DashboardStats` that shadows it wherever it matters). Safe to delete this file and the four now-orphaned types in `types/index.ts` in the same pass.

### `src/types/index.ts`
All shared TypeScript interfaces. `Contract`, `RenewalMonth` (has `payments: Payment[]` — the type contract says this should be populated; `api.ts`'s mapper currently violates that, which is exactly Bug #4), `Payment`, `ClientNote`, `OnboardingPayment`, `NewContractForm`, `ContractEdit`. Also still contains the **dead** `SalesSummary`/`MonthlyTotal`/`DashboardStats`/`UpcomingRenewal` types (only consumed by the dead `mock-data.ts`). Contains one leftover literal instructional comment — `// ── ADD THESE to src/types/index.ts ──` — directly above the `ContractEdit` interface; harmless copy-paste residue, clean it up when touching this file.

### `src/app/dashboard/page.tsx` + `components/dashboard/*`
`StatCards`, `RevenueChart`, `PipelineDonut`, `SalespersonTable`, `UpcomingRenewals` — every one of these independently calls `useContracts()` and recomputes its own aggregates client-side, rather than using `useDashboardStats()` (Bug #9). `RevenueChart` specifically reads `(r as any).payments` to compute the "Collected" series for `partial`-status months — this is where Bug #4 visibly manifests as undercounted revenue on the chart for any partially-paid renewal. `StatCards`/`PipelineDonut`/`SalespersonTable`/`UpcomingRenewals` don't touch `.payments` and are unaffected by Bug #4, but still don't use the purpose-built `/dashboard/stats` endpoint.

### `src/app/renewals/page.tsx` + `components/renewals/*`
- `MonthPicker.tsx` — sidebar mini-calendar-by-month with an Expected/Collected/Pending summary; reads `(r as any).payments` for the partial-status math → inherits Bug #4.
- `RenewalCalendar.tsx` — full month grid. Groups renewals by day (using `firstRenewalDate`, with a deterministic pseudo-spread fallback — `parseInt(c.id.replace(/\D/g, "").slice(-4) || "1") % 28 + 1` — for contracts whose actual renewal date doesn't fall in the displayed month; this is a cosmetic distribution heuristic, not a bug). Also groups promises by `promisedDate`. Click a day → `DayDetail` overlay. Does not touch `.payments`, unaffected by Bug #4.
- `RenewalTable.tsx` — flat table view of the same data, sums `r.renewal.payments` for a "collected" column → inherits Bug #4. Calls `onMarkPayment(contractId, year, month)` (passed down from the page) to open `PaymentModal` — itself does not persist anything.
- `PaymentModal.tsx` — shared modal used from 4 different pages (Renewals, Clients, Payments, Salesperson). Pulls the live contract via `useContracts()`, computes `paidSoFar = renewal.payments.reduce(...)` (**always 0 due to Bug #4**), shows a live partial/full preview, and on save calls **only** the `onSave` prop passed in by the parent — it does **not** call any mutation itself. This means its correctness is 100% dependent on what each page does with that callback. **This is the structural root of Bugs #2 and #3** — `PaymentModal` itself is "innocent" (it's a dumb, reusable presentational component by design), but 3 of its 4 call sites wire `onSave` to something that doesn't persist.
- `renewals/page.tsx`'s `handlePaymentSave(data)` — only handles `data.promise` (calls `addPromise`); **never calls `recordPayment(data)`**. This is **Bug #2**. Also hardcodes 8 fake `SEED_PROMISES` (contract IDs `c001`–`c008`, which don't exist in the real seeded DB) permanently merged into the real `contextPromises` list — cosmetic/data-hygiene issue, listed in Section 7 minor issues.

### `src/app/payments/page.tsx` + `components/payments/*`
- `payments/page.tsx`'s `handlePaymentSave(data)` is `console.log("Payment saved:", data)` — **does not persist anything, not even a promise.** This is **Bug #3a**.
- `PaymentHistory.tsx` — full ledger with search/sort/filter, expandable rows showing individual payments per renewal month (`r.payments.map(...)`) — **always renders "No individual payments recorded yet" due to Bug #4**, even when real payments exist in the DB.
- `OutstandingLedger.tsx` — unpaid/partial renewals grouped by exec; also reads `(r as any).payments` for the partial math → inherits Bug #4. Calls `onMarkPayment` up to the page, which is the same broken `console.log` path.

### `src/app/clients/page.tsx` + `components/clients/*`
- `clients/page.tsx`'s `PaymentModal` `onSave` is also `(data) => console.log("Payment saved:", data)` — **Bug #3b**, identical pattern to the Payments page.
- `ClientList.tsx` — search/filter/sort grid-or-list view over `useContracts()`, grouped by `clientName`. Clean, no bugs of its own; `stoppedClients?.(name)` prop comes from `isClientStopped` (context), which inherits Bug #6.
- `ClientCard.tsx` — grid card. **Hardcodes `const now = { year: 2026, month: 7 }`** to compute "Next renewal" — this will become silently wrong once real time passes July 2026; should use `new Date()` instead. Listed in Section 7 minor issues.
- `ClientLink.tsx` — small reusable "clickable client name" used everywhere (tables, calendars, insights). Opens the detail modal via context; shows a "Stopped" badge via `isClientStopped` → inherits Bug #6.
- `ClientDetailModal.tsx` (902 lines, the biggest single component) — tabs/sections for: contract list with per-contract Edit/Stop/Reactivate, an "Add Service" form (correctly wired to `addContract`, proving the pattern works), a "Record Payment" inline form (calls `recordPayment` from context directly — **this one is correctly wired**, unlike the standalone `PaymentModal` call sites), notes (correctly wired to `addNote`), and edit history display (`getContractEdits`). **None of the action buttons in this file — Edit Services, Stop, Add Service, the inline payment form — check `canPerform(...)` before rendering.** This is **Bug #10's second half** (the first half is `new-entry` having no check at all). The backend's `canWrite` middleware is the only actual enforcement right now; a view-only employee who clicks these buttons will get a 403 from the API, not a disabled/hidden button beforehand.

### `src/app/new-entry/page.tsx`
4-step wizard (Client Info → Contract → Financials → Review). Computes a live `renewalPreview` schedule client-side from `firstRenewalDate` + `dealValue` + `contractTermMonths` (correct logic, used only for the live preview — the actual schedule sent to the backend on creation should be the same shape). **`handleSubmit()` is Bug #1**: it does `await new Promise(r => setTimeout(r, 1000))` (a literal leftover mock-data-era fake-latency simulator), generates a fake local ID `c-new-${Date.now()}`, and then calls `addOnboardingPayment` / `addPromise` / `addClientNote` (note: NOT `addContract`) against that fake, nonexistent contract ID. Also: **no `canPerform("add_client")` check anywhere in this file** — the second half of Bug #10. Also uses the Tailwind `gray-*` palette instead of the app's customized `slate-*` palette (visual inconsistency, Section 7 minor issues) and references `text-accent-blue` / `bg-accent-blue` / `border-accent-blue` classes that **do not exist in `tailwind.config.ts`** (Bug, listed as #12) — those elements render with no color.

### `src/app/insights/page.tsx`
Self-contained analytics view (product frequency, AM pipeline, exec breakdown, multi-service-client overlap, with month-range and multi-select filters) computed entirely client-side from `useContracts()`. Read-only — doesn't write anything back, doesn't touch `.payments`. Correctly self-guards with `if (!canPerform("view_all")) return <AccessRestricted/>`-style block (verified present at line ~226) — this is the right pattern that `new-entry` and `ClientDetailModal` should be copying.

### `src/app/salesperson/page.tsx` + `SalespersonContent.tsx`
Split into a `Suspense`-wrapping `page.tsx` + the actual `SalespersonContent.tsx` specifically to avoid a Next.js build hang caused by `useSearchParams()` at the page root (**do not merge these back into one file** — this was a deliberate, documented fix in the original handover doc, and it's still correct). Per-exec stats/chart/contract table, Excel export (correctly `canPerform("export_excel")`-gated), exec selector (correctly `canPerform("view_all")`-gated). **Its `PaymentModal` `onSave` is also `(data) => console.log("Payment saved:", data)`** — **Bug #3c**, the third occurrence of the same broken pattern.

### `src/app/settings/page.tsx`
The only page that **does not** use the `lib/api.ts` / React Query pattern — it does a raw `fetch(`${API}/users`, { credentials: "include" })` directly inside a `useEffect`. Functionally it works (lists all users, role badges, mode badges), and correctly self-guards with `canPerform("view_settings")`. But it **only reads** — there is no Add User / Edit User / Delete User UI anywhere, despite the backend's `users.ts` having full CRUD ready (Bug #7). The page footer even says "User management connected to live backend" — true for reads only. Also renders a static hardcoded Permission Matrix table (the same one reproduced in Section 5 above) — that part is just documentation-as-UI, not data-driven, and is fine as-is.

### `src/components/salesperson/*` (ExecSelector, ExecStats, ExecChart, ExecContractTable)
All consume `useContracts()` directly, filtered by the selected exec. None touch `.payments`, so none inherit Bug #4. No bugs found.

### `src/components/ui/*` (Button, Input, Select, Card, Modal, Table, Badge, Misc)
Small, clean, presentational primitives. `Modal.tsx` handles Escape-to-close, click-outside-to-close, body-scroll-lock, and a `footer` slot — reused everywhere correctly. Confirmed via a full production `next build` that every Tailwind class resolves except the `accent-blue` family (Bug #12) — i.e., these primitives themselves introduce zero missing-style issues; the gap is isolated to direct `accent-blue` usages in `new-entry/page.tsx` and `payments/page.tsx`.

---

## 6. Build Verification (Already Done — Don't Re-litigate This)

Both halves were independently installed and built from a clean state during this review:

- **Backend:** `npm install`, `npx tsc --noEmit` → **0 errors**. `npm run build` → succeeds, produces `dist/`.
- **Frontend:** `npx tsc --noEmit` → 0 errors (the only "error" was a `next/font/google`-style CSS side-effect import warning that's an artifact of running raw `tsc` outside Next's pipeline, not a real issue). A full `next build` (with Google Fonts network access stubbed out, since the sandbox used for this review blocks that domain — **this stub was reverted after the test, it is not present in the actual codebase**) → **`✓ Compiled successfully`**, type-checking and linting passed, all 11 routes statically generated with no errors.

**Conclusion: every bug in Section 7 is a logic/wiring bug, not a syntax or type error.** A compiler will never catch these. This is exactly why they survived to this point — and exactly why the fix for each one is "make this function call that other function/endpoint," not "fix a typo."

---

## 7. Bug Registry — Complete List, File-by-File, With Fix Plans

### 🔴 Critical (breaks core functionality)

#### Bug #1 — "Add New Client" never creates a contract
- **File:** `frontend/src/app/new-entry/page.tsx`, function `handleSubmit()` (around line 185–236)
- **What's wrong:** Generates a fake local ID (`c-new-${Date.now()}`), never calls `addContract()` from `useClient()`. Only calls `addOnboardingPayment`, `addPromise`, `addClientNote` — all three POST against a contract ID that will never exist in the database, so the backend will 404 on all three (or, worse, silently fail in ways masked by `.catch()` handling upstream — verify this doesn't swallow errors silently when fixing).
- **Fix plan:**
  1. Destructure `addContract` from `useClient()` alongside the existing three.
  2. Build the actual `Contract` payload from `form` + the already-computed `renewalPreview` (the live preview calculator already produces the exact `{year, month, amount}[]` shape `addContract`/`useCreateContract` expects as `renewalSchedule`).
  3. Call `addContract(newContract)` **first**, get back (or generate, matching the existing `ClientDetailModal`-style pattern) the contract id to use for the subsequent onboarding/promise/note calls — note `createContractMutation` is fire-and-forget against the optimistic local ID today (see how `ClientDetailModal.handleAddService` does it) so you may need to either (a) await the real mutation and use its resolved `id`, or (b) match the existing optimistic pattern exactly and accept that onboarding/promise/note will reference the optimistic ID until the query cache refreshes — **decide and document which**, since the backend will reject onboarding/promise records that reference a contract ID that doesn't exist in Postgres yet if the contract creation hasn't actually committed first. Recommend awaiting `createContractMutation.mutateAsync(...)` directly in this file rather than the fire-and-forget `addContract` helper, specifically because this flow needs the resolved server-side ID before the dependent records can be created.
  4. Add the missing `canPerform("add_client")` guard while you're in this file (see Bug #10).

#### Bug #2 — Recording a payment from the Renewals page only saves the promise
- **File:** `frontend/src/app/renewals/page.tsx`, function `handlePaymentSave()`
- **What's wrong:** Only calls `addPromise(...)` when `data.promise` exists; never calls `recordPayment(data)` from `useClient()`. The actual `POST /payments` call never happens from this page.
- **Fix plan:** Add `const { recordPayment } = useClient();` (or destructure alongside the existing `addPromise`), and call `recordPayment(data)` unconditionally at the top of `handlePaymentSave`, keeping the existing promise-handling logic — actually, `recordPayment` (in `client-context.tsx`) **already handles the promise internally** if you pass the full `data` object including `data.promises` — check the exact shape `PaymentModal` emits (`data.promise`, singular) against what `recordPayment` expects (`data.promises`, plural array) before wiring this, since there's a naming mismatch between the two that needs reconciling as part of this fix (see also the parallel fix needed in Bugs #3a/#3b/#3c — all four `PaymentModal` consumers should converge on calling `recordPayment(data)` directly with a single consistent shape).
- **Bonus cleanup while here:** delete the hardcoded `SEED_PROMISES` array (8 fake entries with contract IDs `c001`–`c008` that don't exist in the seeded DB) and rely entirely on `contextPromises` from the real backend.

#### Bug #3 — Recording a payment from Clients, Payments, and Salesperson pages does nothing
- **Files:**
  - `frontend/src/app/clients/page.tsx` — `onSave={(data) => console.log("Payment saved:", data)}` (Bug #3a)
  - `frontend/src/app/payments/page.tsx` — `function handlePaymentSave(data) { console.log("Payment saved:", data); }` (Bug #3b)
  - `frontend/src/app/salesperson/SalespersonContent.tsx` — `onSave={(data) => console.log("Payment saved:", data)}` (Bug #3c)
- **What's wrong:** All three pages render `<PaymentModal onSave={...} />` with a callback that only logs to the console. No backend call happens at all — not even the promise (unlike Bug #2, which at least saves the promise).
- **Fix plan:** Identical to Bug #2's fix, applied in three places: import `useClient()`'s `recordPayment`, replace the `console.log` callback with a real `handlePaymentSave(data) { recordPayment(data); setPaymentTarget(null); }`-style function (match the existing local pattern of each file, e.g. `clients/page.tsx` already has `openPayment`/`paymentTarget` state — just swap the inline arrow function for a named handler that calls `recordPayment`). **Do this fix in the same pass as Bug #2 so all four call sites converge on one consistent shape/contract for what `onSave` should do** — strongly consider lifting a single shared `handlePaymentSave` helper (e.g. into a hook or into `client-context.tsx` itself) so there's only one implementation to maintain instead of four near-duplicates.

#### Bug #4 — `useContracts()` always discards payment history
- **File:** `frontend/src/lib/api.ts`, function `useContracts()` (lines ~30–50)
- **What's wrong:** The mapper that converts backend `renewalMonths` → frontend `renewalSchedule` hardcodes `payments: []` on every entry, even though the backend's `GET /contracts` response includes the contract's full `payments[]` array (see `backend/src/routes/contracts.ts`, the `include: { payments: ... } ` clause). This silently breaks "Paid So Far" / "Outstanding" math in at least 7 places: `PaymentModal.tsx`, `RenewalTable.tsx`, `MonthPicker.tsx`, `OutstandingLedger.tsx`, `PaymentHistory.tsx`, `ClientDetailModal.tsx`, `RevenueChart.tsx`. Partial payments will generally display as ₹0 collected wherever this matters.
- **Fix plan:** In the `data.map((c) => ...)` mapper, instead of `payments: []`, filter `c.payments` (the contract-level array the backend already sends) down to the ones matching `p.renewalYear === r.year && p.renewalMonth === r.month` for each renewal month row, e.g.:
  ```ts
  renewalSchedule: (c.renewalMonths ?? []).map((r: any) => ({
    contractId: c.id,
    year: r.year,
    month: r.month,
    amount: r.overriddenAmount ?? r.amount,
    status: r.status,
    payments: (c.payments ?? []).filter(
      (p: any) => p.renewalYear === r.year && p.renewalMonth === r.month
    ),
  })),
  ```
  This is a one-function, surgical fix that resolves the symptom everywhere simultaneously, since every consumer already correctly reads `r.payments` — they just never received real data. **Verify `backend/src/routes/contracts.ts`'s `GET /contracts` and `GET /contracts/:id` both still `include: { payments: ... }` at the contract level** (they do, as of this review) before relying on `c.payments` being present client-side.

#### Bug #5 — Auth cookie breaks local HTTP development
- **File:** `backend/src/routes/auth.ts`, `POST /auth/login` (the `res.cookie("token", ...)` call)
- **What's wrong:** `secure: true, sameSite: "none"` is hardcoded regardless of environment. This requires HTTPS. `backend/env.example` explicitly documents `FRONTEND_URL="http://localhost:3000"` / `NODE_ENV="development"` as the expected local setup, where this cookie will never be stored/sent by the browser. Login looks successful (200, `user` returned) but every subsequent request is unauthenticated, eventually manifesting in the frontend as an infinite redirect-to-`/login` loop (see `AppShell.tsx`'s guard logic). This is almost certainly the exact problem behind the two consecutive "trying to fix auth" git commits.
- **Fix plan:** Make the cookie options environment-aware:
  ```ts
  const isProd = process.env.NODE_ENV === "production";
  res.cookie("token", token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  ```
  Apply the identical conditional to the `clearCookie(...)` options in `POST /auth/logout` — cookie-clearing options must match the original `secure`/`sameSite` values or the browser won't actually clear it. Confirm in Railway's production env that `NODE_ENV=production` is actually set (per Section 2's documented env vars) so the `secure: true, sameSite: "none"` path still applies correctly there, since frontend (Vercel) and backend (Railway) are different origins in production and genuinely need `sameSite: "none"` + HTTPS for the cross-site cookie to work.

#### Bug #6 — Stopped/active status doesn't persist across page refresh
- **File:** `frontend/src/lib/client-context.tsx` (the `stoppedClients`/`stoppedContracts` `useState<Set<string>>(new Set())` declarations, and `isClientStopped`/`isContractStopped`)
- **What's wrong:** These are local-only React state, always initialized empty, and never seeded from `contract.contractStatus`, which the backend already persists and returns on every `GET /contracts` call. The write path (`stopClient`/`stopContract` → `patchStatusMutation`) works correctly. The read path does not consult the source of truth at all. Symptom: every contract/client shows as "Active" on page load regardless of real DB state, until manually toggled again in that session — and toggling something the backend already has as `stopped` will desync further.
- **Fix plan:** Derive stopped-state from `useContracts()`'s data instead of (or in addition to) local `Set`s. Two viable approaches:
  1. **Simplest:** Change `isClientStopped`/`isContractStopped` to check `contract.contractStatus === "stopped"` directly against the live React Query cache (via `qc.getQueryData<Contract[]>(["contracts"])`, the same pattern already used elsewhere in this file for `openClient`), falling back to the local `Set` only for optimistic just-clicked state before the query refetches/invalidates. This avoids a state-sync `useEffect` entirely.
  2. **Alternative:** On `useContracts()` data arriving, sync a `useEffect` that rebuilds `stoppedClients`/`stoppedContracts` from `contractStatus` fields, merging with (not overwriting) anything currently set optimistically.
  Approach 1 is recommended — it's fewer moving parts and the codebase already leans on reading the query cache directly in this file.

### 🟡 Moderate (incomplete or inconsistent, not breaking but should be finished)

#### Bug #7 — User management is read-only in the UI
- **File:** `frontend/src/app/settings/page.tsx`
- **What's wrong:** Backend (`backend/src/routes/users.ts`) has full `POST /users`, `PATCH /users/:id`, `DELETE /users/:id`, all working and tested clean. The Settings page only does `GET /users` and lists results — no Add/Edit/Delete UI exists.
- **Fix plan:** Add an "Add User" button + form (name, email, password, role, mode, salesperson — matching `users.ts`'s `POST /users` body shape exactly), per-row Edit (reuse the same form, prefilled, hitting `PATCH /users/:id`) and Delete (confirm dialog, hitting `DELETE /users/:id`, remembering the backend already blocks self-deletion server-side). While doing this, also migrate this page off raw `fetch()` onto the `lib/api.ts` / React Query pattern used everywhere else (add `useUsers()`, `useCreateUser()`, `useUpdateUser()`, `useDeleteUser()` hooks to `api.ts` first) — this is the one page in the whole frontend that doesn't follow the established data-fetching convention.

#### Bug #8 — Delete payment / delete promise have no UI
- **Files:** No specific file is "wrong" — the gap is the *absence* of a call site. Hooks already exist and are correct: `useDeletePayment()` and `useDeletePromise()` in `frontend/src/lib/api.ts`.
- **Fix plan:** Add a delete affordance (small trash icon button, with a confirm step) in the two places this is most needed: (1) `PaymentHistory.tsx`'s expanded-row payment list (once Bug #4 is fixed and real payments actually render there), calling `useDeletePayment().mutate(payment.id)`; (2) wherever promises are listed for a client/contract (e.g., inside `ClientDetailModal.tsx` or the renewal calendar's `DayDetail`), calling `useDeletePromise().mutate(promise.id)`. Remember both mutations should `invalidateQueries(["contracts"])` (already configured in `api.ts`) so the UI reflects the deletion immediately.

#### Bug #9 — `useDashboardStats()` and `useRenewalSummary()` are fully built and never called
- **Files:** Defined in `frontend/src/lib/api.ts`; should be consumed by `frontend/src/components/dashboard/*` and possibly `frontend/src/components/renewals/MonthPicker.tsx` respectively.
- **What's wrong:** Both backend endpoints (`GET /dashboard/stats`, `GET /renewals/summary`) are well-built, efficient, server-side aggregations — `renewals/summary` in particular sources its `collected` figure from the real `Payment` table, completely sidestepping Bug #4. Neither is used. Every dashboard widget instead independently recomputes from the full `useContracts()` payload client-side.
- **Fix plan:** This is a larger refactor than the others, optional relative to the critical bugs, but worth doing for both correctness and performance:
  1. Swap `StatCards.tsx` to consume `useDashboardStats()` directly instead of recomputing totals from `useContracts()`.
  2. Swap `UpcomingRenewals.tsx` to use `dashboardStats.upcomingRenewals` instead of its own client-side "next 3 months" filter.
  3. Swap `SalespersonTable.tsx` to use `dashboardStats.salesBreakdown` (already permission-scoped server-side).
  4. For `RevenueChart.tsx` and `MonthPicker.tsx`'s "Collected" figures specifically, consider switching to `useRenewalSummary()` instead of fixing Bug #4 and continuing to recompute client-side — `renewals/summary` is the more architecturally correct source for "money actually collected per month" since it's driven by the `Payment` table directly, not by inferring from `RenewalMonth.status`.
  5. `PipelineDonut.tsx` may be fine to leave as-is if its breakdown (e.g., by status or by product) doesn't have a server-side equivalent — check before changing.

#### Bug #10 — No frontend permission gating on New Entry or ClientDetailModal actions
- **Files:** `frontend/src/app/new-entry/page.tsx` (entire page, no `canPerform` check at all); `frontend/src/components/clients/ClientDetailModal.tsx` (Edit Services / Stop / Reactivate / Add Service / Record Payment buttons, none gated)
- **What's wrong:** The backend's `canWrite` middleware is the only actual enforcement today. A `view`-mode employee (e.g., Idris, Prajay, or Vinay per the seed data) can navigate to `/new-entry` directly, fill out the entire 4-step wizard, and only discover they're blocked when the final submit 403s (and that's *after* Bug #1 is fixed — right now it would silently "succeed" with a fake local ID and never even hit the backend to be blocked). Similarly, every action button inside `ClientDetailModal` renders unconditionally regardless of role/mode.
- **Fix plan:**
  1. In `new-entry/page.tsx`, add the same pattern already used correctly in `settings/page.tsx` and `insights/page.tsx`: `const { canPerform } = useAuth(); if (!canPerform("add_client")) return <AccessRestrictedBlock />;` near the top of the component, before rendering the wizard.
  2. In `Sidebar.tsx`, wrap the "New Entry" nav item in the same `canPerform("add_client")` conditional already used for Insights/Settings, so users who can't use the page don't see it in the nav at all.
  3. In `ClientDetailModal.tsx`, wrap each action button's render with the matching permission: "Edit Services" / per-contract Edit / per-contract Stop / "Add Service" → `canPerform("edit_client")` or `canPerform("stop_client")` as appropriate (match against the Permission Matrix in Section 5); the inline "Record Payment" form trigger → `canPerform("record_payment")`. Either hide the buttons entirely or render them disabled with a tooltip explaining why — match whatever pattern the rest of the app prefers (check if there's a precedent elsewhere; if not, hiding is the simpler/safer default).

### 🟢 Minor / cosmetic (cleanup, not urgent, but listed so nothing gets lost)

#### Bug #11 — Hardcoded sidebar account counts
- **File:** `frontend/src/components/layout/Sidebar.tsx`, `SALESPEOPLE` constant
- **Fix:** Derive `accounts` count per salesperson from `useContracts()` (count of active contracts where `c.salesperson === name`) instead of the hardcoded `{ name: "Aftab", accounts: 73 }`-style array.

#### Bug #12 — `accent-blue` Tailwind class used but never defined
- **Files:** `frontend/src/app/new-entry/page.tsx` (step indicator, "Auto-calculated Schedule" callout), `frontend/src/app/payments/page.tsx` (active tab styling)
- **Fix:** Either add `blue: "#..."` to the `accent` color object in `frontend/tailwind.config.ts` (alongside the existing `green`/`amber`/`red`/`cyan`/`purple`), or swap these usages to an existing accent color (likely `accent` DEFAULT/indigo, or `accent-cyan`) for visual consistency with the rest of the app. Recommend adding the color rather than removing the usages, since it's clearly intended to exist (the naming convention matches the other 5 semantic accent colors exactly).

#### Bug #13 — `new-entry` page uses the `gray-*` palette instead of `slate-*`
- **File:** `frontend/src/app/new-entry/page.tsx`
- **Fix:** Find/replace `text-gray-`, `bg-gray-`, `border-gray-` → the equivalent `slate-` shades used everywhere else in the app, for visual consistency. Low priority, purely cosmetic, ~42 occurrences in this one file.

#### Bug #14 — Duplicate/broken backend env file
- **File:** `backend/.env.example` (contains only the literal character `r`)
- **Fix:** Delete it. `backend/env.example` (no leading dot) is the real, correct template and should be the only one kept. Possibly rename to `.env.example` (with the dot) to match the conventional name, and update any docs/scripts that might reference the no-dot filename — check `railway.toml` and `package.json` for any reference first (none found as of this review, so renaming should be safe).

#### Bug #15 — Leftover instructional/refactor comments shipped in code
- **Files:** `frontend/src/lib/client-context.tsx` (`// REPLACE with:` comment directly above the `renewalSchedule` line inside `addContract`); `frontend/src/types/index.ts` (`// ── ADD THESE to src/types/index.ts ──` comment directly above the `ContractEdit` interface)
- **Fix:** Just delete both comments — they're harmless residue from a previous editing pass (likely a copy-paste from an AI-assisted edit instruction that was followed but not cleaned up afterward) and serve no purpose in the shipped code.

#### Bug #16 — Dead code: `mock-data.ts` and its orphaned types
- **Files:** `frontend/src/lib/mock-data.ts` (entire file, ~300 lines); `frontend/src/types/index.ts`'s `SalesSummary`, `MonthlyTotal`, `DashboardStats` (the old/unused one), `UpcomingRenewal` interfaces
- **Fix:** Confirmed via repo-wide grep that nothing imports from `mock-data.ts` anymore except `mock-data.ts` importing those 4 types from `types/index.ts` for its own (also unused) constants. Safe to delete the file and the 4 orphaned type definitions in the same commit. Double-check with a fresh grep immediately before deleting, in case something changed between this review and when you act on it.

#### Bug #17 — Hardcoded fake promises mixed into real data
- **File:** `frontend/src/app/renewals/page.tsx`, `SEED_PROMISES` constant (8 entries, contract IDs `c001`–`c008`)
- **Fix:** Already covered as a "bonus cleanup" under Bug #2's fix plan — delete this constant and rely entirely on `contextPromises` (the real `usePromises()` data) once payments are correctly wired.

#### Bug #18 — Settings page bypasses the established data-fetching pattern
- **File:** `frontend/src/app/settings/page.tsx`
- **Fix:** Already covered under Bug #7's fix plan — migrate the raw `fetch()` call onto `lib/api.ts` hooks alongside adding the missing CRUD UI.

#### Bug #19 — `ClientCard.tsx` hardcodes "today" as July 2026
- **File:** `frontend/src/components/clients/ClientCard.tsx`, line ~14: `const now = {year:2026,month:7};`
- **Fix:** Replace with `const today = new Date(); const now = { year: today.getFullYear(), month: today.getMonth() + 1 };` so "Next renewal" stays accurate as real time advances past July 2026. Low urgency today, will silently produce wrong results later if not fixed.

---

## 8. Root-Cause Patterns (Read This Before Fixing Bugs One-by-One)

Almost everything in Section 7 traces back to four root causes. Understanding these will make the fixes faster and help you avoid introducing the same class of bug while fixing another one:

1. **`PaymentModal.tsx` is a "dumb" shared component by design** — it computes the right data shape and hands it to an `onSave` callback, but does not persist anything itself. This is a reasonable architectural choice (one modal, four call sites, each free to decide what "save" means) — but it means **the correctness of payment recording lives entirely in 4 separate parent-page implementations**, and only 1 of the 4 (`ClientDetailModal`'s *inline* form, which is a *different* component from `PaymentModal`) got fully wired. Bugs #2 and #3 are really "the same bug, 4 times." Fix them together, ideally by converging on one shared handler (see Bug #2/#3's fix plan) so this can't drift apart again.

2. **The mock-data era left several "fake latency + fake ID" patterns that were never swapped for real mutations.** `new-entry/page.tsx`'s `await new Promise(r => setTimeout(r, 1000))` and `c-new-${Date.now()}` ID are direct leftovers from when this page only ever wrote to in-memory React state. Bug #1 is this pattern simply never being swapped out. (Note: the *same* fake-ID pattern appears in `ClientDetailModal.handleAddService` too, but there it's just used for the optimistic local object *before* immediately calling the real `addContract` mutation — that's the correct version of this pattern. `new-entry` has the fake ID but never makes the real call.)

3. **Local React state was introduced for instant-feedback UX (optimistic updates) and, in a few cases, never got a corresponding "hydrate from server data" step.** Bug #6 (stopped status) is the clearest example: the write-then-locally-reflect half was built, the read-from-server half wasn't. Same root cause is worth double-checking anywhere else you see a local `useState<Set<...>>` or similar paired with a mutation in `client-context.tsx` — if you find another one without a corresponding read from `useContracts()`'s cache, it's likely the same class of bug even if it's not in this registry.

4. **The backend grew two complete data-access paths for some data — one efficient/aggregated (`/dashboard/stats`, `/renewals/summary`), one inefficient/recomputed (raw `useContracts()` + client-side `.reduce()` everywhere)** — and the frontend, having been built mock-data-first against the raw shape, never went back to swap in the more efficient backend aggregations once they existed. This isn't broken, just unfinished/wasteful, and it's also why Bug #4 (missing payments data) has such a wide blast radius — if more widgets used `/renewals/summary` instead of recomputing from `useContracts()`, fewer of them would have been sensitive to that bug in the first place.

---

## 9. Git History Context (For Reference)

Single contributor (`MustafaT52`), commits in chronological order relevant to this handover:
```
first commit
second commit
did majpr changes
added filters
chore: monorepo restructure — frontend/ + backend/
fix: move prisma migrate to start command
fix: cast Json fields to any for Prisma compatibility
feat: add initial prisma migrations
connecting frontend to backedn        ← auth-context.tsx rewritten to real API
connecting frontend to backedn        ← settings/page.tsx wired (read-only, see Bug #7)
adding promise to new client          ← new-entry/page.tsx — TWO large commits, still ended up with Bug #1
wired backedn with dashborad          ← api.ts, client-context.tsx, dashboard components wired
trying to fix auth                    ← backend/src/routes/auth.ts cookie tweak
trying to fix auth                    ← frontend/src/lib/api.ts cookie/credentials tweak
```
The two "trying to fix auth" commits, both touching cookie-related code without a clear resolution, are the strongest direct evidence pointing at Bug #5. The two "adding promise to new client" commits on `new-entry/page.tsx` (175 and 254 lines changed respectively — large rewrites) are consistent with a page that got a lot of attention but never got a final pass connecting it to `addContract`.

---

## 10. Suggested Fix Order

Not mandatory, but a sensible sequence that minimizes rework (e.g., fix the data layer before the things that depend on it):

1. **Bug #5** (auth cookie) — unblocks actually testing everything else locally; do this first.
2. **Bug #4** (`useContracts()` payments mapping) — fixes the data layer that 7+ components depend on, before touching those components.
3. **Bug #6** (stopped status persistence) — independent, small, safe to do alongside #4.
4. **Bugs #2 + #3** (payment save wiring, all 4 call sites) — do together, converge on one handler.
5. **Bug #1** (new-entry contract creation) — depends conceptually on understanding the `addContract`/`createContractMutation` pattern, which you'll already have touched while fixing #2/#3's sibling `ClientDetailModal` code.
6. **Bug #10** (permission gating) — natural to add while you're already inside `new-entry/page.tsx` (Bug #1) and `ClientDetailModal.tsx` (Bugs #2/#3's correct sibling).
7. **Bugs #7, #8, #9** (incomplete features) — larger, more optional, do after the critical path is solid and tested.
8. **Bugs #11–#19** (minor/cosmetic) — sweep these up whenever convenient, several are one-line fixes inside files you'll already be in for other reasons (e.g., #13 and #19 are both inside files touched by #1/#10).

After each fix, re-run the same verification used in Section 6 (`tsc --noEmit` on both sides, `next build` on the frontend) to confirm nothing regressed, since that verification is cheap and already proven to catch real issues (it caught the missing `accent-blue` class indirectly, by virtue of the build succeeding despite it — meaning a clean build is necessary but **not sufficient** to prove a fix is complete; always also manually trace the logic path for whichever bug you just fixed, the way this document does, since these bugs are explicitly the kind that compile cleanly while still being wrong).

---

*Document prepared: June 2026. Covers the post-backend-integration state of ZribbleOS, reviewed file-by-file across both `frontend/` and `backend/`, cross-checked against a clean `tsc`/`next build` on both halves. Supersedes nothing in the original "ZribbleOS — Backend Handover Document" (Phase 1) — that document's schema and endpoint list are still accurate and unchanged; this document picks up from "the backend now exists and is wired" and catalogs what's still wrong with the wiring.*


---

## 11. QA Checklist Cross-Reference (Read Before Calling Anything "Done")

There is a manual QA checklist in circulation for this project (Auth & User Management, Accounts Team, Employee View/Edit roles, Renewals, Payments, Dashboard, Salesperson, Insights, and a "Data Persistence" section). Every single item on that checklist was traced against the Bug Registry above. The result: **nothing on that checklist exposes a bug not already listed in Section 7** — but the checklist requires a different, larger mandatory set than the `🔴 Critical` label alone implies. Do not stop at fixing only the 6 bugs labeled `🔴 Critical`.

**The mandatory set for that checklist to pass in full is 8 bugs, not 6:**

| Bug | Label in Section 7 | Why it's mandatory for the checklist |
|---|---|---|
| #1 | 🔴 Critical | "New entry → refresh → contract exists," partial-payment-promise on new entry, "promise appears on calendar" |
| #2 | 🔴 Critical | Renewals page "record payment → status turns Collected/Partial" |
| #3 | 🔴 Critical | Payments/Clients/Salesperson pages "payment just recorded appears here" |
| #4 | 🔴 Critical | Payment ledger showing individual payments, dashboard "collected" accuracy, "partial reflects in month's stats" |
| #5 | 🔴 Critical | Every "Login as X" step depends on the session actually persisting |
| #6 | 🔴 Critical | "Stop client → refresh → still stopped" |
| **#7** | 🟡 Moderate | The checklist explicitly tests **Create / Edit / Delete employee user** — this requires the Add/Edit/Delete UI to actually be *built*, not just patched. Treat as required, not optional, for this checklist. |
| **#10** | 🟡 Moderate | The checklist explicitly tests **"verify no new entry button"** for view-only employees, and implicitly expects edit/stop/record-payment buttons to be appropriately gated for view-only roles inside the client detail view. Treat as required, not optional, for this checklist. |

**Practical instruction:** when working through Section 10's suggested fix order, do not deprioritize #7 and #10 to "later, optional" just because they're labeled 🟡 Moderate elsewhere in this document. For the purpose of passing the known QA checklist, they sit alongside the 6 🔴 Critical bugs as a single mandatory set of 8. Bugs #8, #9, and #11–#19 are not exercised by the checklist and can genuinely wait.

Everything else on the checklist (Accounts Team section, Insights gating, Salesperson export, calendar/table toggle, edit/stop/reactivate client, adding notes, recording renewal-level promises) already passes today, pre-fix, with no changes needed.

---

*Document prepared: June 2026. Covers the post-backend-integration state of ZribbleOS, reviewed file-by-file across both `frontend/` and `backend/`, cross-checked against a clean `tsc`/`next build` on both halves, and cross-referenced line-by-line against a separate manual QA checklist in circulation for this project (Section 11). Supersedes nothing in the original "ZribbleOS — Backend Handover Document" (Phase 1) — that document's schema and endpoint list are still accurate and unchanged; this document picks up from "the backend now exists and is wired" and catalogs what's still wrong with the wiring.*