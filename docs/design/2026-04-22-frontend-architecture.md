# Comprint Frontend — Architecture Design

**Date:** 2026-04-22
**Scope:** React + Vite + TypeScript app consuming the comprint-backend API (CRM, IMS, OMS, Procurement, WMS incl. refurb)
**Status:** Draft — baseline for implementation
**Related:** [../plans/2026-04-22-phase1-frontend-scaffold.md](../plans/2026-04-22-phase1-frontend-scaffold.md) · Sample UI reference: `/Users/amardaxini/projects/comprint/theme/`

---

## 1. Intent

Build a production frontend for the Comprint ERP. The existing theme repo (`comprint/theme`) is a **UI reference** — it contains design system components, pixel-matched pages, sample data, and routing patterns. This new frontend repo takes the essentials of the theme and reorganizes them for a real app that calls the FastAPI backend — no more mock data, real auth, real API errors, real state.

The frontend is **one app**, not a monorepo. Module boundaries are enforced by folder structure under `src/modules/`, mirroring the backend's module layout.

## 2. Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Build tool | Vite 5 | Fast dev server, native ESM, proven in the theme repo |
| Language | TypeScript 5 (strict) | Caught schema drift between frontend and backend is free |
| UI framework | React 18 | Matches theme repo |
| Routing | React Router 6 | Matches theme repo |
| Component primitives | shadcn/ui + Radix | Matches theme repo; unopinionated and extensible |
| Styling | Tailwind CSS + CSS variables | Matches theme repo's Comprint ERP design system |
| Forms + validation | React Hook Form + Zod | Zod for schema parity with backend Pydantic |
| Server state | TanStack Query v5 | Handles caching, retries, invalidation, suspense |
| Client state | Zustand (for cross-cutting UI state only) | Don't reach for Redux; most state is server state |
| API client | Generated from backend OpenAPI via `openapi-typescript-codegen` (or `oazapfts`) | Contract safety without hand-written types |
| Auth storage | HttpOnly refresh cookie + access token in memory | No tokens in localStorage — XSS-resistant |
| Dates + money | date-fns + dinero.js | Explicit, not ad-hoc |
| Tests — unit | Vitest | Vite-native, fast |
| Tests — component | React Testing Library | Standard |
| Tests — E2E | Playwright | Covers critical flows; runs against mocked backend + real backend in CI |
| Lint | ESLint + Prettier | Already configured in theme; replicate |

## 3. Project layout

```
comprint-frontend/
├── package.json
├── pnpm-lock.yaml             # or package-lock.json if sticking with npm
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── tailwind.config.ts
├── postcss.config.js
├── components.json            # shadcn/ui registry config
├── index.html
├── .env.example
├── .eslintrc.cjs
├── .prettierrc
├── .gitignore
├── README.md
├── public/
├── src/
│   ├── main.tsx               # React root, providers
│   ├── App.tsx                # top-level app shell + router
│   ├── app/
│   │   ├── router.tsx         # route definitions (mirrors module map)
│   │   ├── providers.tsx      # QueryClientProvider, AuthProvider, Toast provider
│   │   └── error-boundary.tsx
│   ├── shared/
│   │   ├── api/
│   │   │   ├── client.ts      # fetch wrapper with auth + envelope handling
│   │   │   ├── generated/     # openapi-generated types + endpoints (checked in)
│   │   │   ├── envelope.ts    # Envelope<T> type + error-envelope helpers
│   │   │   └── errors.ts      # ApiError class, status-code narrowing
│   │   ├── auth/
│   │   │   ├── AuthContext.tsx
│   │   │   ├── useAuth.ts
│   │   │   ├── RequireAuth.tsx
│   │   │   └── scopes.ts      # scope check helpers
│   │   ├── components/        # shadcn/ui primitives + app-level shared components
│   │   │   ├── ui/            # button, input, dialog, ... (shadcn)
│   │   │   ├── data-table/    # reusable table with pagination/filter/sort
│   │   │   ├── form-fields/   # text, select, date, number field wrappers
│   │   │   └── layout/        # AppShell, Sidebar, Header, Breadcrumbs
│   │   ├── hooks/             # useDebounce, useLocalStorage, usePagination, ...
│   │   ├── lib/
│   │   │   ├── date.ts
│   │   │   ├── money.ts
│   │   │   └── cn.ts
│   │   ├── design-system/     # tokens, theme CSS vars (ported from theme repo)
│   │   │   ├── tokens.css
│   │   │   └── index.ts
│   │   └── types/             # cross-module type augmentations (rare)
│   ├── modules/
│   │   ├── identity/
│   │   │   ├── api/hooks.ts   # useLogin, useRefresh, useCurrentUser
│   │   │   ├── pages/LoginPage.tsx
│   │   │   └── components/
│   │   ├── ims/
│   │   │   ├── api/
│   │   │   ├── pages/
│   │   │   │   ├── PartsListPage.tsx
│   │   │   │   ├── PartDetailPage.tsx
│   │   │   │   ├── CategoriesPage.tsx
│   │   │   │   ├── PricingPage.tsx
│   │   │   │   └── OEMsPage.tsx
│   │   │   └── components/
│   │   ├── crm/
│   │   │   ├── api/
│   │   │   ├── pages/
│   │   │   │   ├── LeadsPage.tsx
│   │   │   │   ├── LeadDetailPage.tsx
│   │   │   │   ├── RejectedLeadsPage.tsx
│   │   │   │   ├── DealsPage.tsx
│   │   │   │   ├── QuotesPage.tsx
│   │   │   │   ├── AccountsPage.tsx
│   │   │   │   ├── DemoRequestsPage.tsx
│   │   │   │   └── MaterialInquiriesPage.tsx
│   │   │   └── components/
│   │   ├── oms/
│   │   │   ├── api/
│   │   │   ├── pages/
│   │   │   │   ├── SalesOrdersPage.tsx
│   │   │   │   └── SalesOrderDetailPage.tsx
│   │   │   └── components/
│   │   ├── procurement/
│   │   │   ├── api/
│   │   │   ├── pages/
│   │   │   │   ├── VendorsPage.tsx
│   │   │   │   ├── PurchaseRequestsPage.tsx
│   │   │   │   ├── PurchaseOrdersPage.tsx
│   │   │   │   └── GRNMatchingPage.tsx
│   │   │   └── components/
│   │   └── wms/
│   │       ├── api/
│   │       ├── pages/
│   │       │   ├── WarehousesPage.tsx
│   │       │   ├── InwardBatchesPage.tsx
│   │       │   ├── DevicesPage.tsx
│   │       │   ├── StockSummaryPage.tsx
│   │       │   ├── FaultyStockPage.tsx
│   │       │   ├── DisassemblyWorkstationPage.tsx
│   │       │   ├── ReassemblyWorkstationPage.tsx
│   │       │   ├── DeviceLineagePage.tsx
│   │       │   ├── OutwardPage.tsx
│   │       │   └── ReturnsPage.tsx
│   │       └── components/
│   │           ├── DisassemblyOperationHeader.tsx
│   │           ├── ComponentScanRow.tsx
│   │           └── CompositionTree.tsx
│   └── styles/
│       ├── globals.css
│       └── tailwind.css
└── tests/
    ├── unit/                  # component/hook unit tests (Vitest)
    └── e2e/                   # Playwright flow tests
```

Layout rules:

- `modules/<name>/` structure mirrors the backend module. Route prefix matches: `/crm/leads` frontend page → `/api/v1/crm/leads` backend endpoint.
- Modules never import from each other. Cross-module needs go through `shared/`.
- `shared/components/ui/` holds shadcn primitives — don't modify these; style overrides go through the design-system tokens.
- Generated API code (`shared/api/generated/`) is checked into git — regenerated via a script when OpenAPI changes, PRs show the diff.

## 4. Key architectural choices

### 4.1 OpenAPI-first typed API client

The backend auto-publishes OpenAPI at `/api/v1/openapi.json`. A repo script pulls it at build/dev time and generates TypeScript types + fetch functions:

```bash
npm run gen:api      # fetches from local backend or a saved snapshot, generates shared/api/generated/
```

All API calls go through the generated client. No hand-rolled `fetch('/api/...')` strings. This kills schema drift at compile time.

### 4.2 Response envelope handling

Backend returns `{success, code, message, data, errors}`. The generated client doesn't know about the envelope shape out of the box, so a thin wrapper in `shared/api/client.ts`:

```ts
export async function unwrap<T>(promise: Promise<Envelope<T>>): Promise<T> {
  const env = await promise;
  if (!env.success || env.data == null) {
    throw new ApiError(env.code, env.message, env.errors);
  }
  return env.data;
}
```

Every TanStack Query query/mutation uses `unwrap()`. Errors are typed `ApiError` with the error-code string from the backend — forms can catch specific codes like `CHILD_ALREADY_INSTALLED` and render field-level errors.

### 4.3 TanStack Query keys — hierarchical

Query-key convention:

```ts
['wms', 'devices', deviceId] // detail
['wms', 'devices', { page, filters }] // list
['wms', 'composition', parentDeviceId] // sub-resource
['wms', 'stock', 'summary', { categoryId, sku, warehouseId }] // query-ish endpoint
```

Invalidations target the module prefix: after a disassembly completes, invalidate `['wms', 'devices']` + `['wms', 'composition']` + `['wms', 'stock']`. Module-scoped; never cross-module.

### 4.4 Auth + route guards

```tsx
<Route element={<RequireAuth />}>               // any authenticated user
  <Route path="/crm/leads" element={<LeadsPage />} />
  <Route element={<RequireScope module="wms" actions={["disassembly:complete"]} />}>
    <Route path="/wms/disassembly/:id" element={<DisassemblyWorkstationPage />} />
  </Route>
</Route>
```

Refresh flow: a long-running token refresher ticks every N minutes; the fetch wrapper catches 401, triggers refresh, retries once, logs out if refresh fails. Tokens never touch localStorage.

### 4.5 Forms: React Hook Form + Zod schemas aligned to backend

```ts
// Generated or hand-mirrored from the backend Pydantic model
export const createLeadSchema = z.object({
  name: z.string().min(2),
  company: z.string().min(2),
  email: z.string().email().optional(),
  priority: z.enum(['High', 'Medium', 'Low']),
  description: z.string().min(10),
  customer_type: z.enum(['End Customer', 'Channel Partner']).optional(),
});
export type CreateLeadInput = z.infer<typeof createLeadSchema>;
```

Form error surface:
1. Zod validation errors → field-level inline errors.
2. API 422 response → field-level errors by mapping `errors[].field` → form field.
3. API 4xx/5xx non-field → toast.

### 4.6 Design system ported from the theme repo

The theme repo has a pixel-matched Comprint ERP design system (per recent commits: "feat: pixel-match Comprint ERP design prototype"). Port `src/styles/` tokens + `tailwind.config.ts` + shadcn overrides directly. Don't redesign — the theme repo is the visual canonical.

Phase 1 task: copy and commit the design tokens, prove one shadcn primitive renders with Comprint styling.

### 4.7 Data tables — one reusable pattern

A `DataTable` component in `shared/components/data-table/` handles pagination (server-side), column sort, filter drawer, row selection, and empty/loading/error states. Every listing page wires to this — no ad-hoc tables.

```tsx
<DataTable<Lead>
  queryKey={['crm', 'leads', { filters }]}
  queryFn={(params) => api.crm.listLeads(params).then(unwrap)}
  columns={leadColumns}
  filters={leadFilters}
/>
```

This kills the "let me build yet another table from scratch" failure mode that plagues ERPs.

### 4.8 Refurb workstation UX (scanner-optimized pages)

Disassembly + reassembly pages are **scanner-optimized** — operator uses a barcode scanner as a keyboard. The pages:

- Put focus on a scan input automatically; scan → enter → `POST /extract` (or `/install`) → row flashes green → focus returns to input.
- Show the running list of extracted/installed children with strikeouts for undo.
- Idempotency-Key on every `POST` (the client generates one per row operation; if the network hiccups and the retry fires, backend short-circuits).
- No confirmation dialogs in the hot path — undo is always visible and one click.

## 5. Testing

- **Unit tests (Vitest):** hooks, envelope unwrap, error-class narrowing, form schema validation.
- **Component tests (Vitest + React Testing Library):** presentational components — render with fixtures, assert on output.
- **E2E tests (Playwright):** critical flows only — login, create lead → SO → approve, disassembly workstation happy path, refurb stock summary.
- E2E runs against a docker-compose'd backend in CI. Local dev can run against either a started backend or mocked API using MSW.

## 6. Out of scope (for frontend v1)

- Offline mode / service worker caching beyond the Vite default.
- Push notifications.
- Mobile-first redesign (app is desktop-first; responsive is "works" not "optimized").
- i18n (English only in v1; locale-agnostic date/money handling already in place so adding later is cheap).
- Advanced analytics dashboards (Phase 2 when backend reporting lands).

## 7. Relationship to the theme repo

The `comprint/theme` repo is the **visual and interaction prototype**. This frontend repo is the **production app**.

What to take from theme:
- Design tokens, Tailwind config, global CSS
- shadcn primitive customizations
- Layout components (AppShell, Sidebar)
- Page designs as visual reference
- Form + table UX patterns

What NOT to take:
- Mock data (`data/*.ts` in theme)
- Hard-coded state (most pages in theme hold state in `useState` — ours goes through TanStack Query)
- The top-level route structure — ours is cleaner (module-first)

A Phase 1 task is to do a one-time copy of the design system bits, then the theme repo can continue to be a design sandbox while this repo becomes the live app.

## 8. Document index for this repo

| Doc | Purpose |
|-----|---------|
| This doc — `design/2026-04-22-frontend-architecture.md` | Frontend architecture |
| `plans/2026-04-22-phase1-frontend-scaffold.md` | Scaffold plan (Vite init, design system port, API client, auth) |
| `plans/2026-04-22-modules-task-lists.md` | Per-module page/component task lists |

Sequence diagrams and backend specs live in the backend repo.
