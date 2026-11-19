# ERP Frontend Engineering Guidelines (AI-Ready)

> Single source of truth for building a **modular, permission-driven, DRY ERP frontend** that consumes a backend REST API.
> Any AI/engineer following this document MUST produce code that obeys these rules. **Rules are MUST, not SHOULD.**

---

## 1. Core Philosophy

1. **Write once, use everywhere.** If logic appears 2+ times → extract into a hook/util/component.
2. **One responsibility per file.** A file = a function / component / hook / type.
3. **Permissions gate everything.** No route, page, button, column, action, or menu item renders without a permission check.
4. **Modules are isolated.** Module A must NOT import from Module B's internals — only from `shared/` or via the module's published `index.ts`.
5. **Types first.** No `any`. Every API response, prop, store slice, and form is typed.
6. **Config over code.** Menus, routes, table columns, form fields, filters → defined as data, not JSX.
7. **Backend is the source of truth.** Frontend never trusts itself for permissions, validation, or business rules — it only mirrors the backend for UX.

---

## 2. Standard Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router) **or** Vite + React 18 |
| Language | TypeScript (`strict: true`) |
| Styling | Tailwind CSS + shadcn/ui (Radix primitives) |
| Server state | TanStack Query (React Query) |
| Client state | Zustand |
| Forms | React Hook Form + Zod |
| HTTP | Axios — **one** instance with interceptors |
| Tables | TanStack Table |
| Icons | lucide-react |
| Dates | date-fns |
| i18n | i18next |
| Testing | Vitest + Testing Library + Playwright |

---

## 3. Folder Structure (mandatory)

```
src/
├── app/                          # Next.js routes (or routes/ for Vite)
│   └── (modules)/
│       ├── hr/
│       ├── finance/
│       ├── inventory/
│       └── crm/
│
├── modules/                      # Feature modules — fully self-contained
│   ├── hr/
│   │   ├── api/                  # API service files (use shared http)
│   │   │   └── employees.api.ts
│   │   ├── components/           # module-only components
│   │   ├── hooks/                # module-only hooks (useEmployees, etc.)
│   │   ├── pages/                # page-level components
│   │   ├── schemas/              # Zod schemas
│   │   ├── store/                # module Zustand stores (UI state only)
│   │   ├── types/                # module types
│   │   ├── config/               # column configs, filter configs, etc.
│   │   ├── permissions.ts        # permission keys for this module
│   │   ├── routes.ts             # route + sidebar config
│   │   └── index.ts              # PUBLIC API of the module
│   ├── finance/
│   └── ...
│
├── shared/                       # Cross-module reusable code
│   ├── api/
│   │   ├── httpClient.ts         # the ONLY axios instance
│   │   ├── endpoints.ts          # central endpoint registry
│   │   └── queryClient.ts        # TanStack Query client
│   ├── components/
│   │   ├── ui/                   # shadcn primitives (Button, Input...)
│   │   ├── data/                 # DataTable, FormBuilder, FilterBar
│   │   ├── layout/               # AppShell, Sidebar, Topbar, PageHeader
│   │   └── feedback/             # Toast, Modal, ConfirmDialog
│   ├── hooks/                    # useDebounce, useDisclosure, etc.
│   ├── auth/                     # auth store, session, token storage
│   ├── rbac/                     # permission engine
│   │   ├── PermissionGuard.tsx
│   │   ├── usePermission.ts
│   │   └── can.ts
│   ├── lib/                      # pure utilities (formatters, validators, logger)
│   ├── config/                   # env, app config, feature flags
│   ├── constants/                # see §16 — pagination, api, ui
│   ├── types/                    # global types (User, ApiResponse<T>...)
│   └── styles/
│
├── providers/                    # AppProviders composer
└── tests/
```

**Import rules:**
- A file in `modules/hr/` may import from `shared/*` and `modules/hr/*`. **Never** from `modules/finance/*`.
- A module's external surface is `modules/<name>/index.ts`. Anything not exported there is private.
- `shared/` knows nothing about modules.

---

## 4. Module System

Each module is a self-contained mini-app.

```ts
// modules/hr/index.ts
export { hrRoutes } from "./routes";
export { hrPermissions } from "./permissions";
export { hrSidebar } from "./sidebar";
```

```ts
// modules/hr/permissions.ts
export const hrPermissions = {
  EMPLOYEE_VIEW:   "hr.employee.view",
  EMPLOYEE_CREATE: "hr.employee.create",
  EMPLOYEE_UPDATE: "hr.employee.update",
  EMPLOYEE_DELETE: "hr.employee.delete",
  PAYROLL_VIEW:    "hr.payroll.view",
} as const;

export type HrPermission = typeof hrPermissions[keyof typeof hrPermissions];
```

Permission keys follow `<module>.<resource>.<action>`. Always.

---

## 5. Frontend RBAC (consume permissions from backend)

> The frontend does **not** define permissions. It receives them from the backend on login and uses them only to **show/hide UI** for a smoother UX. The backend remains the security boundary.

### 5.1 Auth contract from backend

On login / `/me` call, the backend MUST return:

```ts
type AuthUser = {
  id: string;
  name: string;
  email: string;
  roles: string[];          // for display only
  permissions: string[];    // <-- the only thing frontend gates UI on
};
```

Store it in the auth store (Zustand, persisted).

### 5.2 The permission check

```ts
// shared/rbac/can.ts
export function can(userPerms: string[], required: string | string[]): boolean {
  if (!required) return true;
  const list = Array.isArray(required) ? required : [required];
  return list.every(p => userPerms.includes(p));
}
```

```ts
// shared/rbac/usePermission.ts
import { useAuthStore } from "@/shared/auth/authStore";
import { can } from "./can";

export const usePermission = () => {
  const permissions = useAuthStore(s => s.user?.permissions ?? []);
  return {
    can:    (req: string | string[]) => can(permissions, req),
    canAny: (req: string[])          => req.some(p => permissions.includes(p)),
  };
};
```

### 5.3 The guard component (use for ALL conditional UI)

```tsx
// shared/rbac/PermissionGuard.tsx
export const PermissionGuard = ({
  required,
  fallback = null,
  children,
}: {
  required: string | string[];
  fallback?: ReactNode;
  children: ReactNode;
}) => {
  const { can } = usePermission();
  return can(required) ? <>{children}</> : <>{fallback}</>;
};
```

### 5.4 Where to enforce

| Layer | How |
|---|---|
| **Route** | Route config has a `permission` field; resolver redirects to `/403` if unmet |
| **Sidebar / menu** | Filter items by permission before rendering |
| **Page** | Wrap top-level in `<PermissionGuard required={...} fallback={<NoAccess/>}>` |
| **Buttons / actions** | Wrap in `<PermissionGuard>` |
| **Table columns** | Filter columns array using `can()` |
| **API calls** | The backend re-validates. Frontend never trusts itself. |

**Forbidden:** `if (user.role === "admin")`. Always check **permissions**, never roles.

---

## 6. Centralized API Layer (THE most important rule)

> If you write `axios.get(...)` or `fetch(...)` outside `modules/<x>/api/` or `shared/api/`, you have done it wrong. No exceptions, no `useEffect + fetch`, no duplicated request code anywhere.

### 6.1 The single HTTP client

```ts
// shared/api/httpClient.ts
import axios, { AxiosError } from "axios";
import { useAuthStore } from "@/shared/auth/authStore";
import { toast } from "@/shared/components/feedback/toast";
import { API } from "@/shared/constants";

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL, // or process.env.NEXT_PUBLIC_API_URL
  timeout: API.TIMEOUT_MS,
  headers: { "Content-Type": "application/json" },
});

http.interceptors.request.use((cfg) => {
  const token = useAuthStore.getState().token;
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

http.interceptors.response.use(
  (res) => res.data, // unwrap data so callers get the payload directly
  (err: AxiosError<{ message?: string; errors?: Record<string, string[]> }>) => {
    const status = err.response?.status;
    const msg = err.response?.data?.message;

    if (status === 401) useAuthStore.getState().logout();
    else if (status === 403) toast.error("You don't have permission");
    else if (status && status >= 500) toast.error("Server error. Try again.");
    else if (msg) toast.error(msg);

    return Promise.reject(err.response?.data ?? err);
  }
);
```

### 6.2 Endpoint registry (no string literals scattered in code)

```ts
// shared/api/endpoints.ts
export const endpoints = {
  auth: {
    login: "/auth/login",
    me:    "/auth/me",
    logout:"/auth/logout",
  },
  hr: {
    employees: "/hr/employees",
    employee: (id: string) => `/hr/employees/${id}`,
    payroll:   "/hr/payroll",
  },
  finance: {
    invoices: "/finance/invoices",
    invoice: (id: string) => `/finance/invoices/${id}`,
  },
} as const;
```

### 6.3 Module API service (thin, typed wrappers)

```ts
// modules/hr/api/employees.api.ts
import { http } from "@/shared/api/httpClient";
import { endpoints } from "@/shared/api/endpoints";
import type { Employee, EmployeeInput, Paginated, ListParams } from "../types";

export const employeesApi = {
  list:   (params?: ListParams)                      => http.get<Paginated<Employee>>(endpoints.hr.employees, { params }),
  get:    (id: string)                               => http.get<Employee>(endpoints.hr.employee(id)),
  create: (data: EmployeeInput)                      => http.post<Employee>(endpoints.hr.employees, data),
  update: (id: string, data: Partial<EmployeeInput>) => http.patch<Employee>(endpoints.hr.employee(id), data),
  remove: (id: string)                               => http.delete<void>(endpoints.hr.employee(id)),
};
```

### 6.4 React Query hooks — the ONLY way components call APIs

```ts
// modules/hr/hooks/useEmployees.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { employeesApi } from "../api/employees.api";
import type { ListParams, EmployeeInput } from "../types";

import { notifyMutationError } from "@shared/api/notify-mutation-error";
import { hrKeys } from "./keys"; // the module's ONE key factory — see §16.9.1

export const useEmployees = (params?: ListParams) =>
  useQuery({
    queryKey: hrKeys.employees.list(params),
    queryFn:  () => employeesApi.list(params),
  });

export const useEmployee = (id: string) =>
  useQuery({
    queryKey: hrKeys.employees.detail(id),
    queryFn:  () => employeesApi.get(id),
    enabled:  !!id,
  });

export const useCreateEmployee = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: EmployeeInput) => employeesApi.create(data),
    // A create changes the lists (and their tab counts) — never the details.
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: hrKeys.employees.lists() });
      void qc.invalidateQueries({ queryKey: hrKeys.employees.counts() });
    },
    onError: notifyMutationError, // every mutation surfaces its failure (§12)
  });
};

export const useUpdateEmployee = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<EmployeeInput> }) =>
      employeesApi.update(id, data),
    // Targeted (§16.9): the one record (+ everything nested under it) and the
    // lists that show it. Never the whole `hrKeys.employees.all` tree.
    onSuccess: (_e, { id }) => {
      void qc.invalidateQueries({ queryKey: hrKeys.employees.detail(id) });
      void qc.invalidateQueries({ queryKey: hrKeys.employees.lists() });
    },
    onError: notifyMutationError,
  });
};
```

### 6.5 Component usage

```tsx
const { data, isLoading } = useEmployees({ page: 1 });
const { mutate: createEmp, isPending } = useCreateEmployee();
```

That is the entire contract. Nothing else is acceptable.

### 6.5.1 Query config — global only, never per-hook (auto-reject)

The `QueryClient` is configured **once** in `src/app/providers.tsx` via `API.QUERY_DEFAULTS` (`src/shared/constants/api.ts`). Those defaults are the source of truth for `staleTime`, `gcTime`, `retry`, `refetchOnMount`, `refetchOnWindowFocus`, and `refetchOnReconnect`. All `useQuery` / `useInfiniteQuery` hooks **inherit** them.

**Auto-reject** any hook that overrides these on a per-call basis:

```ts
// ❌ WRONG — per-hook override silently defeats the global contract
useQuery({
  queryKey: [...KEY, id],
  queryFn:  () => api.get(id),
  staleTime: 5 * 60 * 1000,        // ← contradicts global staleTime: 0
  refetchOnMount: false,            // ← contradicts global "always"
});

// ✅ CORRECT — inherit globals
useQuery({
  queryKey: [...KEY, id],
  queryFn:  () => api.get(id),
});
```

**Why:** the global default `staleTime: 0` + `refetchOnMount: "always"` is a deliberate choice — every detail / list mount must hit the API so users see post-mutation truth. A single per-hook override of `staleTime` to a non-zero value silently breaks this contract for that hook only, and the resulting "stale data after save" bug looks like a cache-invalidation issue rather than a config drift. We've debugged this exact bug too many times.

**Allowed per-hook options** (no global equivalent — set freely per query):

- `queryKey`, `queryFn` — required
- `enabled` — gate the call (e.g. `enabled: !!id`)
- `select` — derive a slice from the response
- `placeholderData: keepPreviousData` — for paginated lists during page change
- `initialPageParam` / `getNextPageParam` — `useInfiniteQuery` plumbing only

**The ONE sanctioned exception — reference data.** Slow-changing master data that many screens mount at once (a warehouse team roster, the "my warehouses" scope list, a stage registry, OEM / category trees) may opt out of `staleTime: 0` by spreading the shared constant — and only this form is allowed:

```ts
useQuery({
  queryKey: wmsKeys.warehouses.team(whId),
  queryFn:  () => fetchWarehouseTeam(whId),
  ...API.REFERENCE_DATA_QUERY_OPTIONS,   // ✅ the one named exception
});
```

Rules: (1) never a raw `staleTime:` / `refetch*:` literal — still auto-reject; (2) never on transactional data (lists, details, counts, stats — anything a save changes); (3) the writes that DO change the reference data must still invalidate its key (a team write invalidates the roster). Rationale: without it, every worklist mount re-fetched the same roster once per observer — measurable request spam with no freshness benefit.

**Sanctioned exception — job-status polling.** A background-job list may poll via a *function* `refetchInterval` that returns `API.JOB_POLL_MS` while a job is active and `false` once none is (reference: `modules/ims/hooks/exports/useExportJobs.ts`) — the job finishes server-side, so no save will invalidate it.

**If you genuinely need a different `staleTime` / refetch behavior for anything else**: change `API.QUERY_DEFAULTS` so it applies project-wide, OR raise the question in the PR description and let the reviewer decide. Don't quietly add a per-hook override.

The same rule applies to `useMutation` defaults — configure retries / `networkMode` globally, not per call.

### 6.6 Optimistic updates

For fast-feedback mutations (toggle, reorder, status change), use TanStack Query's `onMutate` pattern. Revert in `onError`.

```ts
useMutation({
  mutationFn: toggleActive,
  onMutate: async (id) => {
    await qc.cancelQueries({ queryKey: KEY });
    const prev = qc.getQueryData(KEY);
    qc.setQueryData(KEY, (old) => old?.map(e => e.id === id ? { ...e, active: !e.active } : e));
    return { prev };
  },
  onError: (_err, _id, ctx) => qc.setQueryData(KEY, ctx?.prev),
  onSettled: () => qc.invalidateQueries({ queryKey: KEY }),
});
```

### 6.7 Verify against the live backend before claiming a feature is wired (mandatory)

> If a sibling backend folder exists in the workspace, the AI/engineer MUST verify the live API contract before writing or editing any frontend code that consumes that endpoint. "It compiles" is not "it works" — every list page that silently renders empty in this codebase has come from one of the seven mismatches enumerated below.

**When this rule applies.** A sibling backend folder is present at one of these paths (relative to the frontend repo):
- `../comprint-erp-backend/`
- `../<repo>-backend/`
- any sibling directory whose name matches `*-backend` and contains `app/main.py`, `manage.py`, `pyproject.toml`, or `package.json` exposing a server entrypoint.

If such a folder exists, treat it as **the** source of truth for the API contract, even if `shared/api/schema.gen.ts` is out of date. If no backend folder is present, fall back to the OpenAPI schema (`pnpm api:gen`) and the rules below still apply against the generated types.

**Pre-coding checklist for any endpoint-consuming change.** Before writing the api wrapper, the React Query hook, or the page that renders it, the AI MUST:

1. **Locate the route handler.** Grep the backend for the route — e.g. `grep -rn '@router.get("")' <backend>/app/modules/<module>/api/`. Confirm the path, the HTTP method, and the auth dependency (which permission code it requires).
2. **Read the response schema.** Open the corresponding Pydantic / serializer schema file. Note: field names (snake_case vs camelCase), nullability (`str | None`), enums (string vs int), pagination shape (always `{items, total, page, page_size, has_next}` — §16.8), and the envelope (`ApiResponse[...]` wraps everything in `{success, code, message, data, errors}`).
3. **Hit the endpoint live.** With the backend running, run a curl against it using a real token from the running auth flow. Confirm the *exact* JSON structure that the browser will see — this is the contract, not the schema file. Keep the response saved as the reference for the typescript types.
4. **Diff against the frontend types.** Open `modules/<module>/api.ts` (or `*.api.ts`) and confirm every field of every type (`SettingsUserListItem`, `LeadListItem`, etc.) exactly matches what curl returned. If the backend says `roles: string[]` with values `["superadmin", "admin"]` (lowercase) and the frontend has `ROLE_HIERARCHY` keyed on `SUPERADMIN` (uppercase), you have a mismatch — fix one side now, in this PR.
5. **Diff against query params and request bodies.** The same applies to write endpoints. Confirm field names, required vs optional, and enum values match the backend before posting.

**Post-coding verification (mandatory).** Before declaring a list/detail/form page done, the AI MUST:

1. **Curl the endpoint** the page calls, with the same query params the page would send, using a real bearer token. Save the response.
2. **Trace the data through the frontend without running the browser:**
   - Confirm the response interceptor's envelope unwrap will produce the shape the api wrapper expects (the wrapper's return type must match `data` after envelope unwrap, NOT the raw envelope).
   - Confirm the React Query hook returns that shape.
   - Confirm the page reads fields with the exact backend names (snake_case is the default — frontend code that destructures `firstName` against a backend that returns `first_name` is a silent bug).
3. **Verify the dev proxy is not eating the request.** If the frontend uses a relative API path (`/api/...`) and the dev server has a Vite proxy:
   - The axios instance MUST send `Accept: application/json`. Without it, the browser default `text/html,*/*` makes the Vite dev server's SPA fallback win over the proxy on GETs that match `/api/*`, returning `index.html`. Axios then receives HTML, the envelope check silently fails, the page renders empty, and the network tab shows a 200 with `Content-Type: text/html`.
   - Quick reproduction: `curl -sI http://localhost:5173/api/v1/<endpoint>`. If `Content-Type` is `text/html`, the proxy is being bypassed and you must either add `Accept: application/json` to the axios defaults or set `VITE_API_BASE_URL` to the backend origin so requests go cross-origin (CORS already permits `localhost:5173` per backend `cors_origins`).
4. **Open the browser network tab** (or, when running headlessly, log the response in the api wrapper) and confirm:
   - Status 200 (not 200-with-HTML, not 401, not 304-with-stale-empty-body).
   - Response is JSON, not HTML.
   - The `data` field has the expected shape and item count.
   - The `total` matches what curl returned.

**The seven silent-empty-page mismatches.** Every "data is in the API but the page is empty" report this codebase has produced has been one of these. Check each one before reporting a list page done:

| # | Symptom | Root cause | Fix |
|---|---------|-----------|-----|
| 1 | Network tab 200 OK but `Content-Type: text/html` | Dev proxy bypassed by SPA fallback (no `Accept: application/json`) | Set `Accept: application/json` on axios; or set `VITE_API_BASE_URL` to backend origin |
| 2 | `data.items` is `undefined` | Api wrapper typed as `T[]` but backend returns `{items, total, …}` envelope | Type the wrapper as the page object; unwrap `items` only at consumption sites that need a flat array |
| 3 | Roles / enums show as raw codes | Backend returns lowercase (`superadmin`) but frontend constants keyed uppercase (`SUPERADMIN`) | Normalize at the api wrapper boundary OR change the constant keys; pick one and document |
| 4 | "Status: Active" shows for users marked inactive | `is_active: boolean` mis-mapped to `status: "Active"\|"Inactive"` derivation that defaults to truthy on `undefined` | Map explicitly: `user.is_active ? "Active" : "Inactive"` — never rely on truthiness over a field that may be missing |
| 5 | Filters always return zero rows | Frontend sends `is_active=true` as the literal string `"true"` instead of a boolean; backend `bool \| None` accepts only proper booleans | Pass through axios `params` (axios serializes booleans correctly); never `String(value)` for boolean params |
| 6 | Pagination footer says "0 of 0" but rows render | `total` read from the wrong field (e.g. `data.length` instead of the API's `total`) | Read `total` from the API response, never derive from `items.length` |
| 7 | Page is empty after a mutation | Mutation invalidates a different queryKey shape than the list query uses | Mutation `invalidateQueries({ queryKey: [...USERS_KEY] })` MUST match the list hook's `queryKey: [...USERS_KEY, params]` prefix |

**Authoritative sources, in priority order:**
1. The live backend endpoint (curl response).
2. The backend's Pydantic / serializer schema file.
3. The OpenAPI spec at `<backend>/openapi.json` (or what `pnpm api:gen` produces).
4. The committed `shared/api/schema.gen.ts`.
5. Frontend `modules/<x>/api.ts` types (LEAST authoritative — these are the thing that drifts).

If `modules/<x>/api.ts` disagrees with the curl response, the api.ts is wrong, full stop. Do not "interpret" the live response to match the types — change the types.

**Do not skip this rule for "small changes."** A one-line fix that adds a field to a type or wraps a new endpoint is exactly where mismatches enter the codebase. The cost of a curl + a 30-second type diff is far less than the cost of a "data is coming back, why isn't it showing" debugging round-trip.

### 6.8 Multi-call submits, downloads and error surfacing (mandatory)

Several screens must make 2+ API calls for one user action (upload photos → raise spares → complete a stage; create a draft → attach units; create → add units → send). There is no transaction across them, so a failure part-way is normal and the retry must be safe.

1. **The orchestration lives in a mutation hook, never in a component** (§6.4). The component calls one `mutateAsync`.
2. **Retry-safe steps.** Wrap each already-successful step so a retry skips it — `useOnceSteps().run(key, fn)`, one key per unit of work (one per photo file). A retry after "complete" failed must not re-upload photos or re-raise spares.
3. **Report what landed.** When a later step fails after an earlier one created a record, throw an error that carries the created id (e.g. `DispatchUnitsNotAddedError(draftId)`) and land the user on that record — never leave them on a create form whose retry makes a duplicate.
4. **Invalidate in `onSettled`** (not `onSuccess`) for these flows, so the screens show what the server actually holds after a partial failure. This is the one case where §16.9 rule 4 ("no redundant `onSettled`") does not apply.
5. **Loops over items** (one request per picked item): remove each item from the form as it succeeds, so a retry only sends what is still outstanding, and say "N of M done".
6. **Every mutation has an error path.** Either the hook's `onError: notifyMutationError` toasts, or the dialog shows `errMsg(err)` inline — exactly one of the two, never both, never neither.
7. **Downloads** go through `apiClient.getBlob` / `postBlob` (the interceptor decodes a Blob error body into the backend's message — a raw `http` call loses it). Object URLs are created and revoked **outside** React state updaters (StrictMode runs updaters twice) and revoked on unmount. A download is a mutation hook that calls `saveBlob` in `onSuccess`; components never import `api/` to download.
8. **No silent failures.** No `catch {}` that swallows the backend message, and no `void mutateAsync()` / `void confirm()` without a catch (an unhandled rejection on top of the toast). Use `mutate(vars, { onSuccess })` when the caller only needs to close on success.

### 6.9 Module review checklist (mandatory for every new or reviewed module)

These rules came out of the WMS and rentals reviews (Oct 2026). Each one cost a real bug.

1. **Debounce search before it reaches a query key.** `const q = useDebounce(search, UI.DEBOUNCE_SEARCH_MS)`; the box shows `search`, the params use `q`. Without it every keystroke is a server request and the table flickers.
2. **Paged/filtered lists use `placeholderData: keepPreviousData`.** Otherwise each page/sort/filter change blanks the table.
3. **Gate queries nobody is looking at.** `enabled` on dialog-only queries (`open`), on queries for one tab (move them into that tab's component), on permission-gated cards, and on cards that only apply to some records (e.g. `isRental`). Ask for only the rows you show (`page_size: SHOWN`).
4. **Timestamps are never cut with `.slice(0, 10)`.** That is the UTC day — anything before 05:30 IST shows as the day before. Render with `formatIST*`; send a picked day as `istDayStartISO` / `istDayEndISO`; "today" for a business rule is `istTodayDateParam()`.
5. **Hooks and `lib/` never import from `components/`.** Copy a hook needs lives in `hooks/<sub-feature>/*.strings.ts`; a constants map in `constants/`.
6. **Never render a raw backend enum or status.** Every wire value shown to a user goes through a `constants/` `Record<Union, string>` label map (and a variant map for badges).
7. **One placeholder for a missing value:** `EMPTY_VALUE` from `src/shared/constants/ui.ts`, never a local `"—"`.
8. **Every module's `routes.tsx` ends with a `path="*"` not-found route** (copy `wms/routes.tsx`), and every `/new` route is permission-gated the same way as the button that opens it.
9. **Detail pages split load failures** with `isNotFound` / `isForbidden`: 404 → not-found state, 403 → `<NoAccess>`, anything else → `<LoadErrorState>` with Retry. A route id goes through `asUuid` first; a malformed id renders not-found without fetching.
10. **Delete what you orphan.** A dead file, strings section, hand-written type or demo strings file goes in the same PR that stopped using it — a stale model misleads the next reader.
11. **Hand-written API types are forbidden** when `schema.gen.ts` has the shape; index generated fields for unions (`RentalAgreementRequest["billing_type"]`).

---

## 7. Reusable Hooks Catalog (build once, reuse forever)

| Hook | Purpose |
|---|---|
| `usePermission` | RBAC checks |
| `useDebounce` | Debounced value |
| `useDebouncedCallback` | Debounced fn |
| `usePagination` | Page / size / total state |
| `useFilters<T>` | Generic filter state synced to URL |
| `useTable` | Wraps TanStack Table + server pagination |
| `useDisclosure` | Modal / drawer open state |
| `useConfirm` | Promise-based confirm dialog |
| `useToast` | Wrapper over toast |
| `useFormHandler` | RHF + Zod + submit + server-error mapping |
| `useUploader` | File upload with progress |
| `useExport` | CSV / Excel / PDF export |
| `usePolling` | Interval refetch |
| `useLocalStorage` | Typed LS state |
| `useQueryParam` | Read/write a single URL param, typed |

**Shipped shared building blocks** (real paths — grep before writing your own):

| Building block | Path | Use it for |
|---|---|---|
| `useTabCounts` | `src/shared/hooks/useTabCounts.ts` | Tab-badge counts: active tab reuses the list `total`, inactive tabs run one slim count query each with that tab's filters. Never hand-roll the `useQueries` block. |
| `useTabbedListView` | `src/shared/hooks/useTabbedListView.ts` | Per-page tab + search + sort + page + filters state that survives a detail round-trip (§1.1 of PAGE-UI-RULES). |
| `useClientPager` | `src/shared/hooks/useClientPager.ts` | Paging an array that is **fully embedded in a detail response** (no paged endpoint exists). Never for list endpoints (§16.7). |
| `toSortParam` | `src/shared/lib/sort-param.ts` | Table sort state → `field` / `-field`. Unmapped columns return `undefined` (never send a column key the API 422s). |
| `isUuid` / `asUuid` | `src/shared/lib/validation.ts` | §11.1 route/query param validation. Never a local `UUID_RE`. |
| `todayDateParam`, `dateRangeToParams`, `istDayStartISO` / `istDayEndISO`, `formatIST*` | `src/shared/lib/date.ts` | Calendar days and IST bounds. **Never** `new Date().toISOString().slice(0,10)` (that is the UTC day — "yesterday" until 05:30 IST) or `startOfDay(d).toISOString()` (browser zone). |
| `istTodayDateParam` | `src/shared/lib/date.ts` | Today on the IST business calendar (`YYYY-MM-DD`). Use it for a picker `max` or any rule the backend checks; `todayDateParam` is the browser's day. |
| `saveBlob` | `src/shared/lib/saveBlob.ts` | Save a downloaded Blob as a file (creates and revokes the object URL). Never hand-roll `createObjectURL`. |
| `EMPTY_VALUE` | `src/shared/constants/ui.ts` | The one "—" placeholder for a missing value. |
| `humanizeEnum` | `src/shared/lib/humanize-enum.ts` | Fallback label for an unmapped snake_case value. Known enums still use a `Record<Enum,string>` map (§16.12). |
| `compactParams`, `apiClient.getBlob` / `postBlob` | `src/shared/api/client.ts` | Drop empty query params; file downloads (Blob error bodies are decoded into a proper `ApiError` by the interceptor). |
| `isForbidden` / `isNotFound` / `isValidationError` | `src/shared/api/envelope.ts` | Split a load failure into 403 → `<NoAccess>`, 404 → not-found, anything else → `<LoadErrorState>` with retry (§12). |
| `notifyMutationError` | `src/shared/api/notify-mutation-error.ts` | Standard mutation `onError` (skips 422 field errors the form inlines). |
| `useOnceSteps` / `fileStepKey` | `src/shared/hooks/useOnceSteps.ts` (`@shared/hooks`) | Make a multi-call submit (upload → raise → complete) retry-safe (§6.8). Promoted from WMS when rentals' PO save became its second module. |
| `useIdRemappedInfinite` | `src/modules/wms/hooks/shared/useIdRemappedInfinite.ts` | Adapt an infinite query whose rows key on something other than `id` to `<AsyncSelect>` — no `as unknown as`. |

If you need behavior on this list — **import the hook**. Do not reimplement it.

---

## 8. Component System (atomic + data-driven)

### 8.1 Layers

- **`shared/components/ui/`** → primitives (Button, Input, Select, Badge, Card, Dialog…)
- **`shared/components/data/`** → generic engines:
  - `<DataTable queryHook columns filters rowActions />` — pagination, sorting, filtering, row actions, export. **Every ERP list uses this.**
  - `<FormBuilder schema fields onSubmit />` — renders any form from a Zod schema + field config
  - `<FilterBar config />` — driven by a config object
  - `<DetailView sections />` — driven by config
  - `<KanbanBoard />`, `<Stepper />`, `<Timeline />`
- **`shared/components/layout/`** → `AppShell`, `Sidebar`, `Topbar`, `Breadcrumbs`, `PageHeader`
- **`shared/components/feedback/`** → `Toast`, `Modal`, `ConfirmDialog`, `EmptyState`, `ErrorState`, `Skeleton`
- **`modules/<x>/components/`** → module-specific composites built from the above

### 8.2 The "list page" rule

A list page should be ~40 lines max:

```tsx
// modules/hr/pages/EmployeesPage.tsx
import { PermissionGuard } from "@/shared/rbac/PermissionGuard";
import { hrPermissions } from "../permissions";
import { useEmployees } from "../hooks/useEmployees";
import { employeeColumns } from "../config/employees.columns";
import { employeeFilters } from "../config/employees.filters";
import { employeeRowActions } from "../config/employees.actions";

export default function EmployeesPage() {
  return (
    <PermissionGuard required={hrPermissions.EMPLOYEE_VIEW} fallback={<NoAccess />}>
      <PageHeader
        title="Employees"
        actions={
          <PermissionGuard required={hrPermissions.EMPLOYEE_CREATE}>
            <Button onClick={openCreate}>Add Employee</Button>
          </PermissionGuard>
        }
      />
      <DataTable
        queryHook={useEmployees}
        columns={employeeColumns}
        filters={employeeFilters}
        rowActions={employeeRowActions}
      />
    </PermissionGuard>
  );
}
```

Columns / filters / actions live in **config files**, not JSX.

### 8.2.1 Page layout — the AppShell owns the outer frame

Every routed page renders inside `AppShell` (`src/app/layouts/AppShell.tsx`), whose `<main>` applies the **single** outer page frame — `p-5 lg:p-7` (20 px → 28 px) plus a centered `max-w-[1600px]` cap. This is the ONE source of truth for page padding; it guarantees the content never shifts when you navigate between modules or sub-modules.

**Rules:**

- A page's **root element must NOT set its own outer padding / margin / max-width / container** (`p-*`, `px-*`, `py-*`, `m-*`, `mx-auto`, `max-w-*`, `container`). The frame is already applied; re-padding the root double-insets the page and makes it jump relative to its siblings. This holds for the loaded view **and** every early-return loading / empty / error branch. Enforced by the `no-restricted-syntax` page-root rule in `eslint.config.js` (warning during migration → error once clean).
- Compose from the page-shells in `src/components/page-shells/` — `ListPageShell`, `DetailPageShell`, `FormPageShell`. They assume the frame is already applied and add only vertical rhythm.
- **Section rhythm is `gap-6` (24 px).** All three shells use it; match it when you hand-roll a page until it adopts a shell.
- Padding **inside** a card / panel (e.g. a form-card body `px-6 py-5`) is fine — the rule targets only the page's outer frame.
- Sticky-bleed components (`EntityHeader`, `FormPageShell` footer) use `-mx-5 lg:-mx-7` to extend to the frame edge; that negative margin is matched to the `p-5 lg:p-7` frame. If you ever change the frame value, update those bleeds in the same change.

See DESIGN-SYSTEM.md → "Page layout & spacing".

### 8.3 Base UI primitives — `render` prop and `nativeButton`

We use Base UI under shadcn (`@base-ui-components/react`). Base UI's `<Button>` defaults `nativeButton: true`, which forces a real `<button>` element. Render it as anything else (most commonly `<Link>` from React Router) and Base UI logs:

> *"A component that acts as a button expected a native `<button>` because the `nativeButton` prop is true. Rendering a non-`<button>` removes native button semantics, which can impact forms and accessibility."*

**Rule:** the `<Button>` wrapper in `src/components/ui/button.tsx` already auto-flips `nativeButton` to `false` whenever a `render` prop is passed. Two consequences:

```tsx
// ✅ CORRECT — wrapper auto-disables nativeButton because of `render`
<Button render={<Link to="/crm/leads" />}>Back to Leads</Button>

// ✅ CORRECT — no `render`, defaults to a real <button>
<Button onClick={handleSave}>Save</Button>

// ❌ NOT NEEDED (and noisy) — wrapper already handled it
<Button nativeButton={false} render={<Link to="..." />}>Back</Button>
```

Don't sprinkle `nativeButton={false}` at call sites. Don't fork the `<Button>` wrapper to "fix" the warning per-page. If you ever see the warning again it means either (a) you imported `ButtonPrimitive` directly and bypassed our wrapper, or (b) your `render` value is dynamic in a way that breaks the auto-flip — fix the root cause.

The same auto-flip pattern applies to **any** Base UI primitive that exposes both a native-element default and a `render` prop (e.g. future `<Toggle>`, `<MenuItem>` wrappers). When you wrap a Base UI primitive in `components/ui/`, mirror the Button pattern:

```ts
const nativeFoo =
  props.nativeFoo !== undefined ? props.nativeFoo
  : props.render === undefined ? true
  : false
```

This keeps every consumer's call site clean and makes the rule a one-line conditional in the wrapper, not 200 conditional fragments scattered through pages.

---

### 8.5 Colours come only from tokens — never hardcode (mandatory)

Every colour in the app comes from a **Tier 2 semantic token** in `src/styles/themes.css`, used as a Tailwind class — `bg-primary`, `text-success`, `border-input`, `bg-destructive-soft`, `text-muted-foreground`, `bg-violet`, `bg-card`, `bg-background`, `ring-ring`, … These route through the ramps in `src/styles/tokens/colors.css`, the **only** file where raw hex may live.

**Forbidden anywhere in feature code, components, or `comprint.css`:**

- raw hex in classes or styles — `bg-[#0F1B2D]`, `text-[#f1416c]`, `style={{ color: '#f6c000' }}`
- `rgb()` / `rgba()` / `hsl()` literals — `shadow-[0_1px_2px_rgba(16,24,40,0.05)]`, `ring-[rgba(15,27,45,0.12)]`
- `var(--token, #hex)` **fallbacks** — drop the fallback, use the clean class: `bg-card`, not `bg-[var(--card,#fff)]`
- hex in JS colour maps — use `var(--token)` strings, e.g. `LEAD_STAGE_COLOR['New'] = 'var(--info)'`

If the colour you need has no token, **add a ramp stop in `tokens/colors.css` + a semantic token in `themes.css`** — never inline it. For an alpha tint use a token + opacity modifier (`bg-success/18`) or `color-mix(in srgb, var(--success) 18%, transparent)`; for a themeable shadow use `rgb(var(--shadow-rgb)/a)`.

**Why mandatory:** a hardcoded colour silently breaks dark mode and the palette swap. To re-skin the whole app you edit **only** `themes.css` (+ `colors.css` for new values); any inline colour is a hole in that. ESLint warns on `[#hex]` (`no-restricted-syntax`). Same fix-as-you-go rule as §8.4 — migrate a file's colours when you touch it.

**The only exceptions** (CSS variables genuinely can't apply): PDF / print HTML strings built for export (`document.write`, `<table style="…">` — they render outside the app with no design-system CSS), `src/components/common/display/chartTheme.tsx` (the categorical chart palette), and Tier 1 `tokens/colors.css` itself. See **DESIGN-SYSTEM.md** for the token reference + migration table.

### 8.6 Every `src/components/ui/` primitive ships a Storybook story (mandatory)

Storybook is the catalog and contract for the reusable primitives. **When you add or materially change a component in `src/components/ui/`, write or update its colocated story in the same change:** `src/components/ui/<name>.stories.tsx`.

- CSF3 + `satisfies Meta<typeof X>` + `tags: ['autodocs']`; colocated next to the component.
- `title` uses a group: `Foundations` / `Primitives` / `Forms` / `Feedback` / `Overlays` / `Navigation` / `Data`.
- Mirror an existing story (`button.stories.tsx`, `card.stories.tsx`) for house style. These are **Base UI** components — compose with `render={…}` triggers (not `asChild`); copy a real app usage where one exists.
- Don't expose `asChild` / `render` / `ref` / outer-padding controls — they're disabled globally in `.storybook/preview.tsx`.
- `npm run storybook` to view (light/dark toggle + a11y panel); `npm run build-storybook` must pass.

A new or changed `ui/` primitive **without** its story is incomplete (§23 Definition of Done). Stories prove the component renders in isolation, in both themes, and surface it for reuse so nobody rebuilds it.

---

## 9. Forms (one engine, schema-driven)

```ts
// modules/hr/schemas/employee.schema.ts
import { z } from "zod";

export const employeeSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  departmentId: z.string().uuid(),
  salary: z.number().positive(),
});

export type EmployeeInput = z.infer<typeof employeeSchema>;
```

```tsx
<FormBuilder
  schema={employeeSchema}
  fields={[
    { name: "name",         label: "Name",       type: "text" },
    { name: "email",        label: "Email",      type: "email" },
    { name: "departmentId", label: "Department", type: "select", optionsHook: useDepartmentOptions },
    { name: "salary",       label: "Salary",     type: "number" },
  ]}
  onSubmit={createEmp}
/>
```

Server validation errors (HTTP 422) are mapped onto fields by `useFormHandler`. **No bespoke form code per page.**

**Unsaved-changes guard.** Any form that can be dirtied MUST block navigation away while `formState.isDirty` — wrap the leave with `<UnsavedChangesDialog>` (and `beforeunload` for tab close). Never let a stray click discard typed input.

**Every mutation surfaces its outcome, both ways.** On success a `toast.success`; on failure a `toast.error` (or inline — 422 field errors are mapped by `useFormHandler`), never a silent failure. Disable the submit control while the mutation `isPending` so the request can't be double-fired.

---

## 10. State Management

### 10.1 Where state lives

| Type of state | Where it lives |
|---|---|
| Server data (lists, entities) | **TanStack Query** |
| Auth / session | `authStore` (Zustand, persisted) |
| Local component UI | `useState` |
| Cross-component UI (modal/drawer) | `useDisclosure` or small Zustand slice |
| Module-wide UI state | Module's own Zustand store |
| Theme / i18n / feature flags | Provider + Zustand |
| Shareable view state (page, filters, sort) | URL — via `useQueryParam` / `useFilters` |

**Forbidden:**
- Redux for new code
- React Context for server data
- Storing API responses in Zustand
- Prop-drilling more than 2 levels

### 10.2 Derive, don't store

If a value can be computed from existing state, compute it — don't store a copy.

```ts
// WRONG — derived state stored
const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
useEffect(() => setFilteredEmployees(employees.filter(...)), [employees, filter]);

// CORRECT — derive
const filteredEmployees = useMemo(() => employees.filter(...), [employees, filter]);
```

### 10.3 URL is state for shareable views

Pagination, search, sort order, and active filters belong in the URL (via `useQueryParam` / `useFilters`), not local `useState`. Every list view must be deep-linkable.

### 10.4 Zustand store shape rules

```ts
type EmployeeUiStore = {
  // state
  selectedIds: Set<string>;
  drawerOpen: boolean;
  // actions — same object as state
  selectEmployee: (id: string) => void;
  clearSelection: () => void;
  openDrawer: () => void;
  closeDrawer: () => void;
};
```

- Actions live alongside state in the same `create` call.
- Stores are **UI state only** — never API response data.
- Stores are **not persisted** unless explicitly required (auth store is the exception).

---

## 11. Routing & Navigation

```ts
// modules/hr/routes.ts
import { hrPermissions } from "./permissions";

export const hrRoutes: RouteConfig[] = [
  {
    path: "/hr/employees",
    element: <EmployeesPage />,
    permission: hrPermissions.EMPLOYEE_VIEW,
    breadcrumb: "Employees",
  },
  {
    path: "/hr/employees/:id",
    element: <EmployeeDetailPage />,
    permission: hrPermissions.EMPLOYEE_VIEW,
    breadcrumb: "Employee",
  },
];
```

A central resolver merges all module routes, filters by permission, and produces the **sidebar tree** from the same config. **One source of truth — used by router AND sidebar.**

### 11.1 URL params are UNTRUSTED INPUT

Any value read from `useSearchParams()` or `useParams()` that reaches an API call MUST pass through a validating parser that returns a value **valid by construction**. Reference implementation: `modules/crm/hooks/dashboard/insight-view.params.ts` (+ its tests in `tests/unit/crm/insights-view-params.test.ts`).

**A format check is not validation.** Verify the *domain*:

| Kind | Check |
|---|---|
| Date | a real calendar day — `isValid(parseISO(s))`, **not** a `\d{4}-\d{2}-\d{2}` regex (`2026-13-45` passes that) |
| Date range | `from ≤ to`, plus any bound the picker itself enforces (e.g. no future end) |
| Entity id | UUID-shaped, because the backend types it `uuid.UUID` and will 422 otherwise |
| Enum | membership in the same list the dropdown offers |
| Page / size | clamped to a legal range — see `useInsightPaging` |

Then:

1. **Repair, don't reject.** Coerce to the nearest sane value; a page should always render something. Drop only the offending *value*, never the whole facet.
2. **Rewrite the URL to match what rendered**, with `{ replace: true }`. Leaving a repaired param in the bar means Share, Refresh and Back all disagree with the screen. A push instead of a replace makes Back bounce between the broken and fixed URLs forever.
3. **Say what changed.** A silent repair means the page answers a different question than the URL claims — the number is right and the label a lie.
4. **A clean URL must be a no-op** — no rewrite, no notice, no extra render. Guard the write-back on "did anything change", and memoise the parse so the canonical params are referentially stable.
5. **Never send a param the client can already prove the server will reject.** Twelve widgets sharing one bad slice means twelve round-trips to be told something knowable locally — and the reply is backend validator text, which must never reach a user.

An unknown route param (`:id`, `:metric`, `:tile`) renders a not-found state, never a crash — see §12.

> This rule exists because it was learned the hard way: `?period=custom&from=<later>&to=<earlier>` on the CRM dashboard turned the whole board into ~12 red boxes reading *"end must be greater than or equal to start"*. See `comprint-erp-docs/modules/crm/dashboard/CRM_DASHBOARD_URL_PARAM_HARDENING_PLAN.md`.

---

## 12. Errors, Loading, Empty States & Logging

### 12.1 The four required UI states

Every screen must handle all four:

| State | UI |
|---|---|
| Loading | `<Skeleton />` placeholders (not just spinners) |
| Empty | `<EmptyState />` with title + CTA |
| Error | `<ErrorState onRetry />` |
| Forbidden | `<NoAccess />` (via `<PermissionGuard fallback>`) |

### 12.2 Error taxonomy

| Error type | Where caught | UI response |
|---|---|---|
| Validation (422) — on a **write** | `useFormHandler` | Field-level inline messages |
| Validation (422) — on a **read** | `isValidationError()` at the query's render site | The params we sent were bad. Almost always a whole-SCREEN problem (one slice, many widgets), so explain it **once** at page level in your own copy — never repeat the backend's validator sentence per cell. Prevent it upstream per §11.1 |
| Unknown route param | The page, before render | Not-found header + back link — see `CrmInsightDetailPage` |
| Unauthorized (401) | HTTP interceptor | Auto-logout + redirect `/login` |
| Forbidden (403) | HTTP interceptor | Toast + `<NoAccess />` fallback |
| Not found (404) | Query `onError` | `<ErrorState>` with back link |
| Server error (5xx) | HTTP interceptor | Toast + Sentry capture |
| Network error | HTTP interceptor | Toast "Check your connection" |
| JS exception | `<ErrorBoundary>` | Scoped error UI, not full crash |

### 12.3 Structured logger utility

```ts
// shared/lib/logger.ts
const isProd = import.meta.env.PROD;

export const logger = {
  info:  (...args: unknown[]) => { if (!isProd) console.info(...args); },
  warn:  (...args: unknown[]) => { if (!isProd) console.warn(...args); },
  error: (msg: string, err?: unknown) => {
    if (!isProd) console.error(msg, err);
    // In production: Sentry.captureException(err, { extra: { msg } });
  },
};
```

- `logger.error` is the **only** permitted way to log errors in committed code.
- Direct `console.*` calls are banned (enforce via ESLint `no-console`).

### 12.4 ErrorBoundary placement

- One `<ErrorBoundary>` wraps the entire app (catches unhandled).
- One `<ErrorBoundary>` wraps each module's route subtree (isolates module crashes).
- Never put a boundary inside a list item or tight loop.

```tsx
{
  path: "/hr",
  element: (
    <ErrorBoundary fallback={<ModuleErrorState module="HR" />}>
      <HrLayout />
    </ErrorBoundary>
  ),
  children: hrRoutes,
}
```

### 12.5 Async boundaries (React 19 / Next.js)

```tsx
<ErrorBoundary fallback={<ErrorState />}>
  <Suspense fallback={<Skeleton />}>
    <AsyncComponent />
  </Suspense>
</ErrorBoundary>
```

---

## 13. Naming Conventions

| Thing | Convention | Example |
|---|---|---|
| File | kebab-case | `employee-form.tsx` |
| Component | PascalCase | `EmployeeForm` |
| Hook | `use` + camelCase | `useEmployees` |
| Type | PascalCase | `Employee`, `EmployeeInput` |
| Constant | SCREAMING_SNAKE | `MAX_PAGE_SIZE` |
| Constants file | camelCase file, SCREAMING export | `pagination.ts` → `PAGINATION.DEFAULT_PAGE_SIZE` |
| Boolean | `is/has/can/should` | `isLoading`, `canEdit` |
| Event handler (internal) | `handleX` | `handleSubmit` |
| Event handler (prop) | `onX` | `onClose` |
| Permission key | `module.resource.action` | `hr.employee.create` |
| Query key | `[module, resource, ...filters]` | `["hr","employees",{page:1}]` |
| Zod schema | `<resource>Schema` | `employeeSchema` |
| Inferred input type | `<Resource>Input` | `EmployeeInput` |
| API function | verb + noun | `fetchEmployees`, `createPart` |
| Config object | `<resource><Aspect>` | `employeeColumns`, `employeeFilters` |
| Store | `use<Noun>Store` | `useEmployeeUiStore` |
| Error boundary | `<Module>ErrorBoundary` | `HrErrorBoundary` |
| Enum-like const | PascalCase key, string value | `STATUS.ACTIVE = "active"` |
| Test file | source name + `.test.ts(x)` | `useEmployees.test.ts` |
| E2E spec | feature + `.spec.ts` | `create-employee.spec.ts` |

---

## 14. Hard Coding Rules (auto-reject if violated)

1–3. **Size limits — count code lines only** (blank and comment lines don't count). A limit is a smell detector: the fix is always *split by responsibility*, never squash lines.

   | Unit | Target | Hard cap (ESLint warns) | Split by |
   |---|---|---|---|
   | Component file `.tsx` | ≤ 200 | **300** (`max-lines`) | sections → subcomponents; state → a `use<Feature>` hook |
   | One component / one hook | ≤ 150 / ≤ 120 | **150** (`max-lines-per-function`) | JSX blocks → named subcomponents; hook by concern (queries · form state · submit) |
   | Plain function (helper, handler) | ≤ 50 | complexity **15** (`complexity`) | extract pure helpers |
   | API wrapper file | ≤ 300 | **400** | one file per sub-resource |
   | Function params | ≤ 4 | **4** (`max-params`) | pass one object |

   **Exempt** (declarative, long by nature): `*.strings.ts`, `*.columns.ts`, `schema.gen.ts`, `data/*` mocks, `*.stories.tsx`, tests, label-map constants.
   **Too big regardless of lines:** a component that owns more than one dialog, more than one table, or both a form and a list; a JSX `return` over ~80 lines.
   Reference split: `use<Feature>` hook + section components (`modules/wms/components/work-assignments/WorkAssignmentIssueBody.tsx` + `IssueStep*.tsx`; `modules/wms/hooks/operations/useStageCompletion.ts`).
   Ratchet, not big-bang: rules are warnings; any file you touch must end within the caps.
4. Props list ≤ **8 props**. Group or compose.
5. **No** nested ternaries — early returns or helper.
6. **No** magic numbers / strings — see §16 for where they live.
7. **No** `any`, **no** `as unknown as X`. Type properly or use generics.
8. **No** inline objects / arrays / fns as hook dependencies — hoist constants to module scope or derive inside the hook. Don't add `useMemo` / `useCallback` just for performance; the React Compiler memoises (§19.1).
9. **No** business logic inside components. Push into hooks / services.
10. **No** CSS-in-JS. Tailwind only. Variants via `cva`.
11. **No** duplicate request signatures across files. Reuse module API + hooks.
12. **No** commented-out code. Delete it.
13. **No** per-hook override of TanStack Query config knobs that the global `QueryClient` already sets — `staleTime`, `gcTime`, `retry`, `refetchOnMount`, `refetchOnWindowFocus`, `refetchOnReconnect`. The global default (`API.QUERY_DEFAULTS` in `src/shared/constants/api.ts`, wired in `src/app/providers.tsx`) is the source of truth. See §6.5.1.
14. **No** `dangerouslySetInnerHTML` with server / user / API-derived HTML — it's an XSS hole. If you genuinely must render HTML (PDF / print templates only), sanitize it first (e.g. DOMPurify); never inject raw untrusted markup.
15. **No** secrets in `VITE_`-prefixed env vars. Vite inlines every `VITE_*` value into the public client bundle, so it ships to every browser — use them for the API URL / feature flags only, **never** API keys, tokens, or passwords. Secrets live on the backend.
16. **No** hand-rolled date / number / money formatting. Route display formatting through `shared/lib` (`formatIST` / `<DateDisplay>` for dates, the currency/number helper for money) — never `new Date(...).toLocaleString()` or an inline `Intl.*` in a component.

---

## 15. Anti-Patterns (instant reject)

The big "no axios in components", "no role checks", "no cross-module imports", "no reimplementing hooks", "no server data in Zustand" rules are already covered in §3, §5, §6, §7, §10. The remaining smells:

- Two pages with similar tables not using `<DataTable>`.
- Putting business logic inside `useEffect`.
- One giant `types.ts` for the whole app.
- Mixing UI and business rules in the same file.
- Deriving data inside JSX with chained `.filter().map()` instead of `useMemo` + named variable.
- `useQuery({ ..., staleTime: 5 * 60 * 1000 })` or any per-hook query-config override that the `QueryClient` defaults already cover (§6.5.1). The global config wins. If you need different behavior, change the global or escalate.
- Spreading `nativeButton={false}` at every `<Button render={<Link>}>` call site (§8.3). The `<Button>` wrapper already auto-flips it. If a Base UI warning ("expected a native `<button>` because `nativeButton` is true") shows up, you imported the primitive directly or bypassed the wrapper — fix the import, not the call site.
- Hand-building query keys inline (`['ims','parts',params]`) scattered across files instead of a per-module keys factory (a single exported `KEY` / `keys` object). Inline keys drift and typo, silently breaking the targeted invalidation §16.9 relies on — define each entity's key once and import it everywhere (list, detail, and every `invalidateQueries`).

---

## 16. Centralized Constants & Config

> All hardcoded values — numbers, strings, delays, sizes — live in `shared/constants/`. **Zero magic numbers in feature code.**

### 16.1 Structure

```
shared/constants/
├── pagination.ts     # page sizes, batch sizes
├── api.ts            # timeouts, retry, stale times
├── ui.ts             # debounce delays, breakpoints, animation durations
└── index.ts          # re-exports everything
```

### 16.2 Pagination constants

```ts
// shared/constants/pagination.ts
export const PAGINATION = {
  DEFAULT_PAGE_SIZE:       25,
  PAGE_SIZE_OPTIONS:       [10, 25, 50, 100] as const,
  INFINITE_SCROLL_BATCH:   20,
  MAX_EXPORT_ROWS:       5000,
} as const;
```

### 16.3 API constants

```ts
// shared/constants/api.ts
export const API = {
  TIMEOUT_MS:         20_000,
  UPLOAD_TIMEOUT_MS: 120_000,
  MAX_RETRIES:             3,
  STALE_TIME_MS:      5 * 60 * 1000,   // 5 min
  CACHE_TIME_MS:     10 * 60 * 1000,   // 10 min
} as const;
```

### 16.4 UI constants

```ts
// shared/constants/ui.ts
export const UI = {
  DEBOUNCE_SEARCH_MS:  300,
  DEBOUNCE_RESIZE_MS:  150,
  TOAST_DURATION_MS: 4000,
  BREAKPOINTS: { SM: 640, MD: 768, LG: 1024, XL: 1280, XXL: 1536 },
  ANIMATION_DURATION_MS: 200,
} as const;
```

### 16.5 Usage

```ts
// WRONG
useDebounce(searchTerm, 300);
<DataTable pageSize={25} />;

// CORRECT
import { UI, PAGINATION } from "@/shared/constants";
useDebounce(searchTerm, UI.DEBOUNCE_SEARCH_MS);
<DataTable pageSize={PAGINATION.DEFAULT_PAGE_SIZE} />;
```

Any literal number or string that appears in logic is a magic value. Move it before committing.

### 16.6 Single-source pagination on multi-view list pages

> If a list page renders the same fetched dataset through more than one view
> (e.g. **table + kanban**, table + tile grid, table + chart), there MUST be
> exactly **one** module-level constant that drives both the initial API fetch
> size and every view's page size. Changing that constant must be the only edit
> required to change "how much data the page loads at first".

Rules:

1. The constant is defined once at the top of the page module (or in the
   module's `config/`), and derived from `PAGINATION.DEFAULT_PAGE_SIZE` (or
   another value in `PAGINATION`) — **never** a magic literal like `10` or `25`.
2. The same constant is passed as `page_size` to the API hook **and** as
   `pageSize` to the table component **and** is the upper-bound for the kanban
   group. No view may quietly hardcode its own page size.
3. If a view legitimately needs a different size (e.g. kanban needs more rows
   than the table paginates over), define a second constant in the same place
   so both knobs are visible side-by-side. Two named constants > one literal
   buried in JSX.
4. Server-side pagination is the default. Client-side `.slice()` over a fully
   loaded list is acceptable only when the constant is set high enough to
   cover the realistic dataset and is documented as such.

```ts
// modules/crm/pages/LeadsPage.tsx
import { PAGINATION } from "@/shared/constants";

// Single knob: drives both the API fetch size AND the table's pageSize.
// The kanban renders the same fetched set, so bumping this loads more rows
// for every view at once.
const LEADS_PAGE_SIZE = PAGINATION.DEFAULT_PAGE_SIZE;

const leadsQuery = useLeads({ page: 1, page_size: LEADS_PAGE_SIZE });

// table view
<DataTable pageSize={LEADS_PAGE_SIZE} ... />

// kanban view — consumes the same fetched data
<KanbanBoard items={groupByStage(leadsQuery.data?.items)} ... />
```

```ts
// WRONG — three independent values for the same page
useLeads({ page_size: 25 });          // API
<DataTable pageSize={10} />;          // table view paginates over only 10
<KanbanBoard items={...} />;          // kanban silently sees 25
// Result: bumping the fetch size doesn't change the table; bumping the
// table doesn't fetch more rows; the kanban is stuck at whatever the API gave.
```

If you find yourself touching more than one number to "load more data", you
violated this rule — collapse them into one constant before committing.

### 16.7 Server-side pagination is the default for every list page (mandatory)

> List pages MUST paginate **through the API**, not by slicing an in-memory
> cache. This applies to **every** list view in the app — leads, deals,
> accounts, contacts, quotes, sales orders, invoices, purchase requests,
> rejected leads, parts, OEMs, suppliers, POs, GRNs, warehouses, and every
> module added in the future.

Rules:

1. The page component owns `page` state (1-indexed). The API hook receives
   `{ page, page_size, ...filters }`. Page state resets to 1 whenever any
   filter that affects the result set changes (search, status, priority, etc.).
2. The table component receives a `serverPagination` prop (or equivalent) that
   carries `{ page, pageSize, total, isFetching, onPageChange }`. The footer
   buttons fire `onPageChange(n)` so the parent refetches — they do **not**
   slice cached rows.
3. `total` MUST come from the API response, not from `data.length`. The
   pagination footer shows `Showing N of {total}` where `total` is the
   server-reported full count.
4. Client-side `.filter().slice()` over the full result set is **forbidden**
   for list pages. The only acceptable client-side post-processing is light
   formatting (e.g. mapping a UTC string to IST for display).
5. Search input is debounced (`UI.DEBOUNCE_SEARCH_MS`) and sent to the API as
   a query param — never used as a client-side `.includes()` filter over
   loaded rows.
6. When you add a new list page, **wire it server-paginated from day one**.
   Do not ship a "we'll paginate later" client-side first version.
7. When you touch an existing list page that is still client-paginated, fix
   it as part of your change. A list page that fetches once with
   `page_size=25` and then `.slice()`s in the table is broken — even if it
   "works" for tiny demo data, it silently caps the user's view.

### 16.8 One pagination wire contract (mandatory)

Every paged endpoint speaks exactly one shape (backend `CLAUDE.md` §14,
enforced by the backend's `tests/unit/test_pagination_contract.py`):

- **Request:** `page` (from 1) + `page_size`. Never `offset` / `limit` /
  `size`.
- **Response data:** `{ items, total, page, page_size, has_next }`.

On the frontend, type it with the shared types in `@/shared/api/pagination`
— never redeclare paging fields per module:

```ts
import { FIRST_PAGE, nextPage, type PageParams, type PageResponse } from "@/shared/api/pagination"

export type LeadsPage = PageResponse<LeadWire>                // response
export interface FetchLeadsParams extends PageParams { … }  // request

useInfiniteQuery({
  queryFn: ({ pageParam }) => fetchLeads({ page: pageParam, page_size: SIZE }),
  initialPageParam: FIRST_PAGE,
  getNextPageParam: nextPage,   // reads has_next — never infer from row counts
})
```

A `limit` that means "the top N" (search suggestions, a recent-activity feed)
is not pagination and keeps its name.

```ts
// CORRECT — server-paginated list page (deals, mirrors LeadsPage)
const DEALS_PAGE_SIZE = PAGINATION.DEFAULT_PAGE_SIZE;

function DealsPage() {
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, UI.DEBOUNCE_SEARCH_MS);

  // Reset to page 1 whenever a result-changing filter changes.
  useEffect(() => { setPage(1); }, [debouncedSearch, status, owner]);

  const query = useDeals(
    { page, page_size: DEALS_PAGE_SIZE, search: debouncedSearch, status, owner },
    { enabled: view === "list" },
  );

  return (
    <DataTable
      rows={query.data?.items ?? []}
      serverPagination={{
        page,
        pageSize: DEALS_PAGE_SIZE,
        total: query.data?.total ?? 0,
        isFetching: query.isFetching,
        onPageChange: setPage,
      }}
      ...
    />
  );
}
```

```ts
// WRONG — client pagination over a fixed fetch
const dealsQuery = useDeals({ page_size: 100 });   // fetch 100, slice in table
<DataTable rows={dealsQuery.data?.items ?? []} pageSize={10} />;
// User scrolling table to "page 11" sees nothing — they never knew the cap exists.
```

**Detail-page related-list tabs use numbered pagination too.** The
related-list **tabs** on a detail page (Comments, Notes, Tasks, Quotes,
Material Inquiries, …) are numbered-paginated just like list pages — local
`page` + `pageSize` state, a `useQuery` keyed on
`(entityType, entityId, page, pageSize)` returning `{ items, total }`, and the
shared `<TablePagination>` footer (Prev/Next + page-size `<Select>`,
`PAGINATION.PAGE_SIZE_OPTIONS`). Reset to page 1 on a create mutation (lists
are newest-first). Use **local** `page` state, not a `?page` URL param — a
detail page hosts several independent tabs and one shared URL param would
clobber them. Infinite scroll remains the pattern ONLY for:

- **API-backed dropdowns / pickers** (§16.11), and
- **kanban / status-bucket** column bodies (§16.8), and
- genuinely **cursor-paginated** feeds with no offset/total (the CRM Activity
  feed) — these can't become numbered pages without a backend redesign.

Notification deep-links keep working under numbered pagination via the
page-walk in `shared/notifications/use-scroll-to-hash-target.ts` (`paginated`
mode): when the deep-linked row isn't on the current page the hook restarts at
page 1 and walks forward until the row renders, then scrolls + highlights it.

### 16.8 Multi-bucket views (kanban) MUST query per bucket

> Any view that splits data into independent buckets (kanban columns by stage,
> tabs by status, swim-lanes by owner, etc.) MUST run **one query per bucket**.
> A single global query that loads-then-groups is forbidden because it forces
> the page to over-fetch up-front and silently caps each bucket at whatever
> arrived on page 1.

Rules:

1. Use `useInfiniteQuery` per bucket (e.g. one per kanban stage). Each
   bucket's column header shows the server-reported `total` for that bucket;
   each column scrolls independently and triggers `fetchNextPage()` when its
   own scroll sentinel intersects.
2. The bucket dimension goes into the query key as a structural level, **not**
   buried inside an opaque params object. This makes targeted invalidation
   trivial (see §16.9).

   ```ts
   // CORRECT — bucket is its own queryKey level
   queryKey: ["crm", "deals", "infinite", stage, otherParams]
   ```

3. The number of bucket hooks is fixed at module scope (e.g. nine kanban
   stages). Use one explicit `useInfiniteQuery` call per bucket inside a
   wrapper hook (`useDealsByAllStages`) — do NOT call hooks in a `.map()` over
   a runtime array. Rules-of-hooks require a static call order.
4. The kanban board component receives `columnInfinite={ hasMore, loading,
   onLoadMore }` so each column knows its own state and can show
   `Loading more…` / `All loaded` footers independently.
5. Drag-and-drop optimistic UI is local to the kanban component; the truth
   comes back via the targeted invalidation in §16.9.

### 16.9 Mutations MUST do targeted cache invalidation

> A mutation on a single list item MUST only invalidate the queries actually
> affected by the change. Blanket-invalidating the entire module key
> (`["crm", "leads"]`, `["crm", "deals"]`, …) refetches every bucket, every
> page, every filter combination — this is wasted bandwidth and visible
> reflicker on every other column.

Rules:

1. The mutation accepts the **before** state plus the **after** state when the
   change moves the item between buckets. For a stage move:
   `{ id, fromStage, toStage }` — never just `{ id, toStage }`.
2. `onSuccess` invalidates only:
   - The two affected bucket queries (source + destination).
   - The single item's detail query (`[...KEY, id]`).
3. Use a `predicate` (or a structurally-keyed query) to match buckets:

   ```ts
   queryClient.invalidateQueries({
     predicate: (q) => {
       const k = q.queryKey;
       if (k[0] !== "crm" || k[1] !== "deals" || k[2] !== "infinite") return false;
       const params = k[3] as { stage?: string } | undefined;
       return params?.stage === fromStage || params?.stage === toStage;
     },
   });
   ```

4. Do not register a redundant `onSettled` that re-invalidates what
   `onSuccess` already covered. One invalidation pass is enough.
5. Cross-view freshness: if your mutation could affect the table view's
   currently-cached page, accept that the table query stays stale until
   `staleTime` expires or the user changes filters/page. Don't preemptively
   invalidate the table query just because *some* user might switch views —
   that's the wasted-request anti-pattern this rule exists to stop.

### 16.9.1 One query-key factory per module, nested by record (mandatory)

Inline key arrays drift (`'grn-batch'` vs `'grn-batches'`, `'work-assignment'` vs `'work-assignments'`) and every drift is a silent "stale after save" bug. Each module owns **one** factory file (reference: `src/modules/wms/hooks/keys.ts`, `wmsKeys`):

```ts
// ['<module>', <feature>, <kind>, …args] — most generic → most specific
const feature = (name) => {
  const all = ["wms", name] as const;
  return {
    all,
    lists:  () => [...all, "list"] as const,
    list:   (p: unknown) => [...all, "list", p] as const,
    counts: () => [...all, "count"] as const,
    count:  (p: unknown) => [...all, "count", p] as const,
    details:() => [...all, "detail"] as const,
    detail: (id: string) => [...all, "detail", id] as const,
  };
};
// Sub-resources nest UNDER the record, so one prefix refreshes one record and
// everything hanging off it (timeline, lines, checklist runs, active op):
history: (id, p) => [...devices.detail(id), "workflow-history", p],
```

Rules:
1. **No inline key arrays** in hooks or components — every `queryKey` and every `invalidateQueries` imports from the factory. Grep gate: `queryKey: \[ *["']` must return nothing outside the factory file.
2. **One named invalidate helper per feature** (`invalidateDevice(qc, id)`, `invalidateBatch(qc, id)`, `invalidateSpares(qc, reqId)`) that lists exactly what a write changes: `detail(id)` + `lists()` + `counts()` + the cross-feature pools it moves (stat tiles, ready-to-dispatch pool, a lot's engineer load). Never the feature `all`, never the module root.
3. **Cross-module keys come from the owning module's barrel** (`purchaseOrderKeys` from `@modules/procurement`, `imsKeys` from `@modules/ims`) — never a copied literal "kept in sync".
4. **Predicates match exact segments**, never `queryKey.includes('x')` — `includes('workflow-history')` silently missed the `'workflow-history-infinite'` key the device page actually renders. Export the predicate from the factory's owner (`isDeviceHistoryQuery`).
5. **Reference data has its own root** (e.g. `['wms','my-warehouses']`), so refreshing a transactional tree never refetches the navbar scope.
6. Tab-count queries live under `counts()` (so `invalidate(lists())` and `invalidate(counts())` are independent and both explicit).

### 16.10 Reference implementation

The leads module (`src/modules/crm/pages/LeadsPage.tsx`,
`src/modules/crm/hooks/useLeads.ts`) is the canonical implementation of
§16.6 → §16.9. When migrating another module (deals, accounts, contacts,
quotes, etc.), mirror its structure:

- Single `<MODULE>_PAGE_SIZE` constant from `PAGINATION.DEFAULT_PAGE_SIZE`.
- `use<Resource>(params, {enabled})` for the table view.
- `use<Resource>Infinite(params, {enabled})` for one bucket.
- `use<Resource>ByAll<Buckets>(common, {enabled})` wrapping the explicit
  per-bucket hook calls.
- `useMove<Resource>Bucket()` mutation with `{id, from, to}` and
  predicate-based invalidation.
- The page wires `serverPagination={...}` on the table and
  `columnInfinite={...}` on the kanban — both gated by `view === ...` via the
  `enabled` flag so the inactive view doesn't run unnecessary queries.

### 16.11 API-backed dropdowns and multi-selects (mandatory)

> Any dropdown / select / combobox / multi-select whose options come from a
> backend endpoint MUST treat that endpoint as a paginated, server-searched
> data source — **not** as a one-shot fetch followed by client-side
> filtering. This applies to the OEMs picker on the lead form, category
> pickers, account/contact lookups, user assignment selectors, part /
> variant pickers, supplier selectors, and every future option list sourced
> from the API.
>
> **Scope note (infinite scroll vs numbered pagination).** This rule mandates
> `useInfiniteQuery` + scroll-to-load for **dropdowns / pickers** only. It is
> NOT a blanket "all UI lists must be infinite-scrolled" rule. List pages
> (§16.7) and **detail-page related-list tabs** (Comments, Notes, Tasks,
> Quotes, Material Inquiries — see §16.7) use **numbered** server pagination
> via `<TablePagination>`. Kanban / status-bucket bodies (§16.8) infinite-
> scroll per column. Pick the pattern by surface, not by reflex.

Rules:

1. **Server-side fetching.** Options come from a TanStack Query hook calling
   the same `apiClient` as the rest of the module. **No** raw `axios`/`fetch`
   inside the dropdown component (§6).
2. **Pagination is dynamic.** If the endpoint accepts `page` / `page_size`
   (or `offset` / `limit`), the dropdown uses `useInfiniteQuery` and loads
   the next page when the user scrolls near the bottom of the open menu —
   detect via an `IntersectionObserver` sentinel rendered after the last
   option. The page size comes from `PAGINATION.DEFAULT_PAGE_SIZE` (§16.6),
   never a magic literal.
3. **Search hits the API.** When the user types in the dropdown's search
   box, debounce with `UI.DEBOUNCE_SEARCH_MS` and pass the value as a
   `search` (or equivalent) query param. Resetting the page to 1 on every
   query change. Forbidden: client-side `.filter()` / `.includes()` over
   already-loaded options when the backend has a search param.
4. **Forbidden patterns.**
   - Fetching all rows up-front with a huge `limit` (e.g. `?limit=10000`)
     and filtering client-side. Today's 10 OEMs fit; tomorrow's 5 000 won't.
   - Calling the list endpoint once and slicing.
   - Hand-rolling pagination state instead of `useInfiniteQuery`.
   - A search input that doesn't reset `page` to 1.
5. **Selected-but-not-loaded items.** A selected option whose row hasn't
   been fetched in the current paginated/searched view MUST still render
   correctly. Two acceptable strategies:
   - Store `{id, label}` (or the full row) at selection time and render the
     selected chip from local state.
   - Fetch the selected IDs explicitly via a `use<Resource>ByIds(ids)`
     companion query and merge with the paginated options.
   The dropdown must never show a selected item as "blank" or as a raw UUID
   because the user scrolled past it.
6. **Loading + empty UX.** Show a skeleton row on initial open, a
   "Loading more…" footer while `fetchNextPage` is in flight, and an
   "All loaded" / "No matches" terminal state. Don't fall back to a spinner
   that hides the already-loaded options.
7. **Endpoint envelope.** API wrappers MUST unwrap the paginated response
   shape (`{items, total, offset/page, limit/page_size}`) and return a typed
   page object with `total` so `getNextPageParam` can compute `hasNextPage`
   accurately. Wrappers that lie about the type (e.g. typed as `OEM[]` but
   actually returning `{items: OEM[], …}`) are forbidden — they silently
   cap the dropdown at zero rows.

Reference shape (mirror this for every API-backed picker):

```ts
// modules/ims/hooks/useOEMOptions.ts
import { useInfiniteQuery } from "@tanstack/react-query";
import { useDebounce } from "@/shared/hooks";
import { PAGINATION, UI, API } from "@/shared/constants";
import { fetchOEMsPage } from "../api";

export function useOEMOptions(rawSearch: string) {
  const search = useDebounce(rawSearch.trim(), UI.DEBOUNCE_SEARCH_MS);
  return useInfiniteQuery({
    queryKey: ["ims", "oems", "options", search],
    queryFn: ({ pageParam }) =>
      fetchOEMsPage({
        page: pageParam,
        page_size: PAGINATION.DEFAULT_PAGE_SIZE,
        search: search || undefined,
      }),
    initialPageParam: 1,
    getNextPageParam: (last) => {
      const loaded = last.page * last.page_size;
      return loaded < last.total ? last.page + 1 : undefined;
    },
    staleTime: API.STALE_TIME_MS,
  });
}
```

```tsx
// shared/components/ui/AsyncMultiSelect.tsx (sketch)
const sentinelRef = useRef<HTMLDivElement | null>(null);
useEffect(() => {
  if (!sentinelRef.current || !hasNextPage) return;
  const obs = new IntersectionObserver(([e]) => {
    if (e.isIntersecting && !isFetchingNextPage) fetchNextPage();
  });
  obs.observe(sentinelRef.current);
  return () => obs.disconnect();
}, [hasNextPage, isFetchingNextPage, fetchNextPage]);
```

```ts
// WRONG — silently caps the picker at the first page, loses search to client
const { data: allOems } = useOEMs();              // returns whatever page 1 had
const filtered = allOems?.filter(o =>             // client-side search, no API
  o.name.toLowerCase().includes(query.toLowerCase()),
);
<MultiSelect options={filtered ?? []} ... />;
```

If a list endpoint genuinely never paginates (e.g. an enum-backed lookup
with a fixed handful of rows guaranteed never to grow), the wrapper MUST
document this with a comment and still expose a typed page-1-style return
so future migration is mechanical.

### 16.12 String constants & user-facing copy (no naked strings)

> User-facing text is NOT hardcoded ("naked") in components. Every label,
> title, button caption, placeholder, empty/error state, dialog line, and
> toast message comes from a centralized, typed constant. The app is
> single-locale (English, IST) — this is a **code-quality / consistency**
> rule, not i18n. There is no translation runtime; do not add `i18next`,
> `react-intl`, or `t()` calls.

Pick the bucket by what the string *is*:

1. **Screen / component copy → a co-located `*.strings.ts`.** Titles, button
   labels, placeholders, empty/error/loading text, dialog copy, and that
   sub-feature's toast messages. One typed `as const` object named
   `<FEATURE>_STRINGS`, imported by the components and hooks of that
   sub-feature. Dynamic copy is a function member.

   ```ts
   // modules/crm/components/accounts/accounts.strings.ts
   export const ACCOUNTS_STRINGS = {
     list:   { title: "Accounts", empty: "No accounts yet" },
     delete: { title: "Delete account?",
               body: (name: string) => `This soft-deletes ${name}.` },
     toast:  { created: "Account created", deleteFailed: "Failed to delete account" },
   } as const
   // usage:  <Typography>{ACCOUNTS_STRINGS.list.title}</Typography>
   //         toast.success(ACCOUNTS_STRINGS.toast.created)
   ```

2. **Domain label maps → the module's `constants/`.** An enum/status → display
   label map is the single source that also feeds dropdown options, badges,
   and filters. Derive the union type from the keys so label and type can't
   drift. Keep the StatusBadge tone map next to it (don't duplicate the tone
   mapping per view). Reference: `modules/crm/constants/account-status.ts`,
   `modules/crm/constants/account-documents.ts` (`ACCOUNT_DOC_LABELS`).

   ```ts
   export const ACCOUNT_STATUS_LABELS = { Active: "Active", Inactive: "Inactive" } as const
   export type AccountStatus = keyof typeof ACCOUNT_STATUS_LABELS
   ```

3. **Zod validation messages → stay with the schema** (existing pattern, e.g.
   `NO_EMOJI_MESSAGE` in `modules/ims/schemas.ts`). Promote a message reused
   across modules to `src/shared/constants/validation-messages.ts`.

4. **Truly app-wide copy → `src/shared/constants/`** (e.g. a `COMMON_STRINGS`
   with generic `Save` / `Cancel` / `Loading…`). Don't promote prematurely —
   only when a second feature genuinely reuses it (same rule as the module
   `shared/` folder).

**Not "naked strings" — do NOT flag or centralize:** `className` / token
strings, route paths & hrefs, query keys, `data-*`, enum *values* sent to the
backend, technical prop values (e.g. `entityType="account"`), and test / story
strings.

**Rendering is unchanged.** Text still goes through `<Typography>` (§8.4) and
the design-system components — only the *source* of the literal moves to a
constant.

**Enforcement (warn-level, fix-as-you-go).** `eslint.config.js` runs
`i18next/no-literal-string` (used purely as a literal-string detector — no i18n
runtime) at `'warn'` over `src/modules/**` + `src/components/**`, excluding
`components/ui/**`, stories, and tests. It flags JSX text and copy-bearing
attributes (`placeholder`, `title`, `aria-label`, `alt`, `label`, …). Like the
§8.4 typography and §8.5 colour-token migrations, the warnings are the backlog:
**when you touch a file, migrate its naked strings in the same change.** New
naked strings in a component are a review-blocker.

**Reference implementation:** the CRM › accounts sub-feature
(`components/accounts/accounts.strings.ts` + `constants/account-status.ts`,
consumed by `AccountsTable.tsx`, `pages/accounts/AccountDetailPage.tsx`,
`components/accounts/DeleteAccountDialog.tsx`, and the `toast.*` calls in
`hooks/accounts/useAccounts.ts`). Mirror it per module.

---

## 17. SOLID Principles (Frontend / React / TypeScript)

### S — Single Responsibility

One component / hook / util does one thing.

- A component renders UI. It does **not** fetch data, compute business rules, or manage routing.
- A React Query hook fetches and caches one resource. It does **not** transform for display.
- A Zod schema validates shape. Business rules live in a separate validator util.

```ts
// WRONG — fetch + transform + render in one component
function EmployeeCard({ id }: { id: string }) {
  const [emp, setEmp] = useState<Employee>();
  useEffect(() => { http.get(`/hr/employees/${id}`).then(setEmp); }, [id]);
  const fullName = `${emp?.firstName} ${emp?.lastName}`.trim();
  return <p>{fullName}</p>;
}

// CORRECT — split
function EmployeeCard({ id }: { id: string }) {
  const { data } = useEmployee(id);
  return <p>{formatFullName(data)}</p>;
}
```

### O — Open/Closed

Extend through composition and config, not by editing existing files.

- New table column → add to columns config. Don't edit `DataTable`.
- New form field → add to fields array. Don't edit `FormBuilder`.
- New permission level → add to `permissions.ts`. Don't edit `PermissionGuard`.

### L — Liskov Substitution

A component accepting prop type `T` must work for any valid `T`. Use precise types; never rely on extra properties not in the interface.

```ts
type ColumnDef<T> = { key: keyof T; label: string; render?: (val: T) => ReactNode };
```

### I — Interface Segregation

Props interfaces are small and focused. If a component only needs `name` and `email`, don't pass the whole `Employee`.

```ts
// WRONG
function EmployeeBadge({ employee }: { employee: Employee }) { ... }

// CORRECT
function EmployeeBadge({ name, avatarUrl }: { name: string; avatarUrl?: string }) { ... }
```

This also prevents accidental re-renders.

### D — Dependency Inversion

Components depend on **abstractions** (hooks, context), not on concrete implementations (API clients, stores).

```ts
// WRONG
function EmployeeList() {
  const data = employeesApi.list();   // concrete API
}

// CORRECT
function EmployeeList() {
  const { data } = useEmployees();    // abstraction
}
```

---

## 18. Component Design Patterns

### 18.1 Container / Presenter split

- **Container**: owns data fetching, permission checks, state. No DOM-level styling.
- **Presenter**: pure UI, all data via props, events via callbacks. Fully testable without mocks.

```tsx
export function EmployeeListContainer() {
  const { data, isLoading, isError } = useEmployees();
  const { can } = usePermission();
  return (
    <EmployeeListView
      employees={data ?? []}
      isLoading={isLoading}
      isError={isError}
      canCreate={can(hrPermissions.EMPLOYEE_CREATE)}
    />
  );
}

export function EmployeeListView({ employees, isLoading, isError, canCreate }: EmployeeListViewProps) {
  ...
}
```

### 18.2 Compound components for complex UI

When a component has multiple coordinated parts, use compound components instead of a god-prop interface.

```tsx
// WRONG
<Modal title="Edit" footer={<Button>Save</Button>} isOpen onClose body={<Form />} size="lg" />

// CORRECT
<Modal open={open} onOpenChange={setOpen}>
  <Modal.Header>Edit Employee</Modal.Header>
  <Modal.Body><EmployeeForm /></Modal.Body>
  <Modal.Footer><Button type="submit">Save</Button></Modal.Footer>
</Modal>
```

### 18.3 Render props / slot pattern

Use `children` or named slot props when the parent controls layout but the caller controls content.

### 18.4 No boolean prop explosion

More than two boolean appearance props → use a `variant` string with `cva`.

```ts
// WRONG
<Badge success warning error outline />

// CORRECT
<Badge variant="success" />
```

---

## 19. Performance Rules

The app runs the **React Compiler** (`babel-plugin-react-compiler` v1, "infer" mode — wired in `vite.config.ts` via `reactCompilerPreset`). That changes what "optimising a component" means: the compiler memoises components and hooks automatically, **but only the ones that follow the Rules of React — anything else it silently skips** (the component then re-renders exactly as un-memoised code). Most of the rules below exist to keep components compilable.

### 19.1 Rendering (React Compiler era)

1. **Don't hand-write `useMemo` / `useCallback` / `React.memo` for performance in new code** — the compiler does it. Keep a manual memo only when a value must stay referentially stable for a reason the compiler can't see (an effect dependency, an `IntersectionObserver` callback, a third-party subscription). **Leave existing manual memos in place**; removing them changes compiler output and needs a re-test.
2. **Watch the compiler diagnostics — they are perf bugs.** `eslint-plugin-react-hooks` v7 reports them; treat these as must-fix in any file you touch:
   - `react-hooks/incompatible-library` ("Compilation Skipped") — usually `form.watch()`. Use `useWatch({ control, name })` instead.
   - `react-hooks/preserve-manual-memoization` — a manual `useMemo` the compiler can't keep (e.g. optional-chained deps). Replace it with a plain function/derivation.
   - `react-hooks/set-state-in-effect` — derive the value during render, or use the adjust-state-on-prop-change pattern (`if (prev !== x) { setPrev(x); setY(…) }`) instead of `useEffect(() => setY(…))`.
   - Mutating props/state, reading `ref.current` during render, or calling hooks conditionally all bail the component out.
3. **Escape hatch:** `"use no memo"` at the top of a component opts it out (temporarily, with a comment and a TODO). Never as a way to silence a Rules-of-React violation permanently.
4. **Unstable inputs still cost**: a `data ?? []` / `{...obj}` created every render and passed as a dependency or prop defeats memoisation downstream. Wrap such fallbacks once (`useMemo(() => q.data ?? [], [q.data])`) or hoist constants to module scope.
5. **Long lists** (> ~100 visible rows) virtualise with `@tanstack/react-virtual`; server pagination (§16.7) is still the first line of defence.

### 19.2 Network & cache (TanStack Query)

1. **Fewer requests beats faster requests.** Before adding a query, ask whether an existing one already holds the data. Tab badges come from one grouped stats/count query or `useTabCounts` — never one `page_size:1` query per tab firing on every keystroke (the 429 driver). Per-row fetches (N+1) are forbidden; ask the backend to denormalise the label onto the row.
2. **Gate on what the user can see and use**: `enabled` on dialog-only queries (`enabled: open`), and on permission (a fetch that is a guaranteed 403 for a role must not run for that role).
3. **`placeholderData: keepPreviousData`** on every paginated / filtered list and stats query, so paging never flashes an empty table.
4. **`select`** to derive a slice instead of copying server data into state; keep the selector stable (module-scope function) so structural sharing holds.
5. **Infinite scroll**: read the load-more callback through a ref, pause the observer while `isFetchingNextPage`, and call `fetchNextPage({ cancelRefetch: false })` — re-arming on every render cancelled in-flight pages in a loop.
6. **Targeted invalidation** (§16.9 / §16.9.1) — a blanket invalidation is a performance bug as much as a correctness one: it refetches every page and filter combination in the cache.
7. **Reference data** opts out of `staleTime: 0` only via `API.REFERENCE_DATA_QUERY_OPTIONS` (§6.5.1).

### 19.3 Bundle

1. **Lazy-load every module route** with `React.lazy` / dynamic `import()`. In large modules keep the lazy declarations in one `routes/lazy-pages.ts` (a `.tsx` that both declares lazies and exports route functions trips `react-refresh/only-export-components`).
2. **Heavy libraries load on demand**: charts, `html2canvas`, PDF / spreadsheet libs are `import()`-ed inside the handler or a lazy component, never top-level in a shared file.
3. **Mock data never ships in a live path**: `data/*.ts` mock files are imported only by `mock()` / `hidden()` pages (CLAUDE.md), which are lazy, so they stay out of the main chunk.
4. **Bundle size gate.** No single chunk > **250 kB gzipped**. The entry `index` chunk is the one closest to the gate (≈232 kB gz in Oct 2026) — anything added to app-wide providers, layouts or `src/shared` lands there, so check `vite build` output when touching them.
5. **Images**: explicit `width`/`height` + `loading="lazy"` on every `<img>`.

---

## 20. Accessibility (A11y) Rules

1. Every interactive element is keyboard-reachable via `Tab` and operable via `Enter` / `Space`. Test without a mouse.
2. Every form field has a visible `<label>` linked via `htmlFor` / `id`. No placeholder-only labels.
3. Every icon-only button has `aria-label` or a visually hidden `<span>`.
4. Color is never the only information carrier. Status badges use color **and** text/icon.
5. Focus traps in dialogs. `<Dialog>` from shadcn/Radix handles this — do not build custom modals that don't trap focus.
6. `<ErrorState>` and `<EmptyState>` include `role="status"` or `aria-live="polite"`.
7. Touch targets ≥ 44×44 px (WCAG 2.5.5). Use Tailwind `min-h-11 min-w-11`.

---

## 21. AI Code Generation Checklist

Before finalizing **any** generated code, the AI MUST verify:

**Structure & API**
- [ ] File placed in correct folder per §3.
- [ ] No direct `axios` / `fetch` outside `api/` layer.
- [ ] All API calls go through `http` → `endpoints` → module `*.api.ts` → React Query hook.
- [ ] No cross-module imports outside the published `index.ts`.

**Backend contract verification (§6.7)**
- [ ] If a sibling backend folder exists, located the route handler and read the response schema before writing the frontend wrapper.
- [ ] Curled the endpoint live and confirmed the JSON shape — field names, nullability, enum values, pagination wrapper, and envelope shape.
- [ ] Frontend types in `modules/<x>/api.ts` exactly match the curl response (snake_case preserved unless explicitly mapped at the wrapper boundary).
- [ ] If the dev proxy is involved, confirmed `curl -sI http://localhost:5173/api/v1/<endpoint>` returns `Content-Type: application/json`, NOT `text/html` (the SPA fallback swallows GETs that lack an explicit `Accept: application/json`).
- [ ] Walked through the seven silent-empty-page mismatches in §6.7 and ruled each out for the page being shipped.

**Reuse**
- [ ] Used existing hook from §7 if applicable; did NOT reinvent.
- [ ] Used `<DataTable>` / `<FormBuilder>` / `<PermissionGuard>` where applicable.

**Permissions**
- [ ] Every route, button, menu item, action gated by `permission`.
- [ ] Permission keys follow `module.resource.action`.
- [ ] No role-based checks anywhere.

**Types & schemas**
- [ ] No `any`. All props, returns, store slices typed.
- [ ] Zod schema exists for any form/input.

**Limits**
- [ ] Code lines (no blanks/comments): component file ≤ 200 (cap 300), one component/hook ≤ 150, helper ≤ 50 with complexity ≤ 15, ≤ 4 params, ≤ 8 props (§14). `eslint` shows no `max-lines` / `max-lines-per-function` / `complexity` warning in touched files.

**Constants**
- [ ] All numeric/string literals extracted to `shared/constants/` (§16).
- [ ] Multi-view list pages (table + kanban / etc.) use a single shared page-size constant per §16.6 — no view hardcodes its own number.

**Pagination & data fetching (§16.7 – §16.9)**
- [ ] List page is server-paginated: page state owned by the page, fed to the API hook, table footer fires `onPageChange` (no `.slice()` over cached rows).
- [ ] `total` shown in the footer comes from the API response, not from `data.length`.
- [ ] Search input is debounced with `UI.DEBOUNCE_SEARCH_MS` and sent as a query param — never a client-side `.includes()`.
- [ ] Page state resets to 1 whenever a result-changing filter changes.
- [ ] Multi-bucket views (kanban / status tabs / swim-lanes) run **one query per bucket** via `useInfiniteQuery`; the bucket dimension is its own queryKey level.
- [ ] Inactive view's queries are gated with `enabled: view === "..."` — don't run table + kanban queries simultaneously when only one is visible.
- [ ] Mutations doing item-bucket moves accept `{id, from, to}` and use a `predicate` to invalidate only the two affected bucket queries + the detail query. No blanket `invalidateQueries({ queryKey: MODULE_KEY })` on a single-item mutation.
- [ ] Every `queryKey` / invalidation comes from the module's key factory (§16.9.1) — zero inline key arrays; predicates match exact segments.
- [ ] Tab badges use `useTabCounts` or one grouped stats query — no per-tab `page_size:1` queries outside it.
- [ ] Every mutation has exactly one error surface (hook `onError` or inline `errMsg`), and multi-call submits are retry-safe (§6.8).

**API-backed dropdowns (§16.11)**
- [ ] Every dropdown / multi-select sourced from an API endpoint that supports pagination uses `useInfiniteQuery` and an `IntersectionObserver` sentinel to load more on scroll.
- [ ] Search inside the dropdown is debounced and sent as a `search` query param — no client-side `.filter()` over already-loaded options when the backend supports it.
- [ ] Page size in the dropdown comes from `PAGINATION.DEFAULT_PAGE_SIZE` (or another `PAGINATION.*` constant), never a literal.
- [ ] Selected-but-unloaded items still render correctly (store `{id,label}` at selection time, or fetch by ID).
- [ ] API wrapper unwraps the paginated `{items, total, …}` shape and returns a typed page — wrappers typed as `OEM[]` while actually returning `{items: …}` are rejected.

**State**
- [ ] No redundant `useState` mirror of server data (§10.2).
- [ ] Shareable view state (filters, page, sort) stored in URL (§10.3).

**SOLID**
- [ ] Single responsibility — no component fetches + transforms + renders (§17).

**UX states**
- [ ] Loading, empty, error, and forbidden states handled (§12.1).
- [ ] Module route wrapped in `<ErrorBoundary>` (§12.4).

**Logging**
- [ ] `console.*` replaced with `logger.*` (§12.3).

**Performance (§19)**
- [ ] Module route uses `React.lazy` for code splitting (§19.3).
- [ ] No new React Compiler bail-outs in touched files: `eslint` shows no `react-hooks/incompatible-library`, `preserve-manual-memoization` or `set-state-in-effect` (`useWatch`, not `form.watch`; derive instead of setState-in-effect) (§19.1).
- [ ] No N+1 per-row fetches; dialog-only and permission-gated queries use `enabled`; paged lists use `keepPreviousData` (§19.2).

**Dates & params**
- [ ] Calendar days / IST bounds via `src/shared/lib/date.ts` — no `toISOString().slice(0,10)`, no `toLocale*` (§7).
- [ ] Route `:id` and query params validated with `asUuid` / enum membership before any API call (§11.1).

**Accessibility**
- [ ] All interactive elements keyboard-accessible; icon buttons have `aria-label` (§20).

**Copy (§16.12)**
- [ ] User-facing strings come from a co-located `*.strings.ts` / label map — no naked strings. (Single-locale code-quality rule — NOT i18n; do not add `t()` / a translation runtime.)

---

## 22. End-to-End Example: Adding a Feature

**Task:** "Add a Leaves module with apply/approve."

1. `modules/leaves/permissions.ts` → `leaves.request.create`, `leaves.request.approve`, `leaves.request.view`.
2. `modules/leaves/types/leave.ts` → `Leave`, `LeaveInput`.
3. `modules/leaves/schemas/leave.schema.ts` → Zod schema.
4. `shared/api/endpoints.ts` → add `leaves` namespace.
5. `modules/leaves/api/leaves.api.ts` → service file.
6. `modules/leaves/hooks/useLeaves.ts` → React Query hooks.
7. `modules/leaves/config/leaves.columns.ts` + `leaves.filters.ts` + `leaves.actions.ts`.
8. `modules/leaves/pages/LeavesListPage.tsx` → `<DataTable>` driven.
9. `modules/leaves/components/LeaveForm.tsx` → `<FormBuilder>` driven.
10. `modules/leaves/routes.ts` → routes with `permission`.
11. `modules/leaves/index.ts` → export routes + permissions + sidebar entry.
12. Register module in `app/providers/modulesRegistry.ts`.

**No new utilities. No new generic hooks. No new HTTP code.** The whole feature is composition.

---

## 23. Definition of Done

A feature is "done" only when:

- Tests exist: at least one unit test (hook/util) + one integration test (page).
- Permissions enforced at: route, sidebar, page, button, table column, row action.
- Loading / empty / error / forbidden UIs all present.
- No TypeScript errors, no ESLint errors, no console warnings.
- Storybook story for every new/changed `src/components/ui/` primitive (§8.6), plus any other new shared component.
- No hardcoded colours — every colour is a semantic token (§8.5); no raw hex, `rgb()`/`rgba()`, or `var(--x,#hex)` fallbacks outside the documented exceptions.
- Bundle impact reviewed (module routes lazy-loaded).
- All user-facing copy routed through co-located `*.strings.ts` / label maps per §16.12 — no naked literals (single-locale English/IST, **not** i18n).

---

## 24. Final Rule for the AI

**When in doubt, do less.**

- Reuse existing primitives.
- If you feel the urge to write a new utility, **search first** — it probably exists.
- If it doesn't, add it to `shared/` so the next feature can reuse it.
- A great ERP feature is built almost entirely from existing pieces. New code should be small, typed, and obvious.
