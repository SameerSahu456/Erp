# Phase 1 — Frontend Scaffold Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans`. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Stand up the Vite + React + TypeScript app with routing, auth shell, TanStack Query, Tailwind + shadcn, design tokens ported from the theme repo, and a health-check page that hits the backend.

**Architecture:** See [../design/2026-04-22-frontend-architecture.md](../design/2026-04-22-frontend-architecture.md).

**Tech Stack:** Node 20+, pnpm (or npm), Vite 5, React 18, TypeScript 5, React Router 6, TanStack Query 5, Tailwind CSS, shadcn/ui, React Hook Form, Zod, Vitest, Playwright.

**Outcome:** `pnpm dev` starts the app. The app has a login page and a protected dashboard page that hits `GET /api/v1/health` on the backend and renders the result. Design tokens from the theme repo are in place. CI green.

---

## Tasks

### Task 1: Initialize Vite + React + TS project

- [ ] **Step 1:** From `comprint-frontend/` root run Vite scaffold (non-interactive):

```bash
pnpm create vite@latest . --template react-ts
# or: npm create vite@latest . -- --template react-ts
```

- [ ] **Step 2:** Clean up boilerplate — delete `src/App.css`, `src/index.css`, `src/assets/*`, the default `App.tsx`. We'll rewrite.
- [ ] **Step 3:** Commit: `chore: scaffold Vite + React + TypeScript`.

---

### Task 2: TypeScript strict mode + path aliases

- [ ] **Step 1:** Update `tsconfig.json` — enable `"strict": true`, `"noUncheckedIndexedAccess": true`, `"exactOptionalPropertyTypes": true`. Add path aliases:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@shared/*": ["src/shared/*"],
      "@modules/*": ["src/modules/*"],
      "@app/*": ["src/app/*"]
    }
  }
}
```

- [ ] **Step 2:** Update `vite.config.ts` to match aliases:

```ts
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "./src"), "@shared": path.resolve(__dirname, "./src/shared"), "@modules": path.resolve(__dirname, "./src/modules"), "@app": path.resolve(__dirname, "./src/app") } },
});
```

- [ ] **Step 3:** Commit.

---

### Task 3: Tailwind + PostCSS + shadcn base

- [ ] **Step 1:** Install Tailwind + peer deps:

```bash
pnpm add -D tailwindcss postcss autoprefixer @types/node
pnpm dlx tailwindcss init -p
```

- [ ] **Step 2:** Configure `tailwind.config.ts` — enable dark mode via class, set content paths `./src/**/*.{ts,tsx}`, add the Comprint design-system color + font extensions (port from theme repo — see Task 5).
- [ ] **Step 3:** Create `src/styles/tailwind.css` with `@tailwind base; @tailwind components; @tailwind utilities;` directives.
- [ ] **Step 4:** Init shadcn (copy `components.json` from theme repo as starting point, adjust aliases).
- [ ] **Step 5:** Add a Button + Input + Dialog shadcn primitives — verify they render.
- [ ] **Step 6:** Commit.

---

### Task 4: ESLint + Prettier

- [ ] Install eslint + typescript-eslint + eslint-config-prettier + plugin-react-hooks. Port `.eslintrc.cjs` and `.prettierrc` from the theme repo. Commit.

---

### Task 5: Port Comprint design tokens from theme repo

- [ ] **Step 1:** Copy `src/styles/index.css` (or equivalent token file) from `../theme/src/styles/` to `src/styles/tokens.css`. Remove any theme-specific imports not relevant here.
- [ ] **Step 2:** Copy the theme repo's `tailwind.config.*` color and font extensions into this repo's `tailwind.config.ts`.
- [ ] **Step 3:** Port any custom shadcn component overrides from `../theme/src/components/ui/` — one-to-one copy, verify they compile.
- [ ] **Step 4:** Render a test page showing buttons, inputs, a card, a data table row — visually verify styles match the theme.
- [ ] **Step 5:** Commit.

---

### Task 6: App shell (Sidebar + Header + Content)

- [ ] **Step 1:** Port `AppShell`, `Sidebar`, `Header` layout components from theme (`src/components/layout/`). Simplify — remove theme-specific sidebar nav config; we'll wire our own nav config per module.
- [ ] **Step 2:** Create `src/shared/components/layout/nav-config.ts` with a per-module nav definition array:

```ts
export const navConfig = [
  { label: "Dashboard", path: "/", icon: "home" },
  {
    label: "CRM", items: [
      { label: "Leads", path: "/crm/leads" },
      { label: "Accounts", path: "/crm/accounts" },
      { label: "Deals", path: "/crm/deals" },
      { label: "Quotes", path: "/crm/quotes" },
    ],
  },
  {
    label: "OMS", items: [
      { label: "Sales Orders", path: "/oms/sales-orders" },
    ],
  },
  {
    label: "Procurement", items: [
      { label: "Vendors", path: "/procurement/vendors" },
      { label: "Purchase Requests", path: "/procurement/prs" },
      { label: "Purchase Orders", path: "/procurement/pos" },
    ],
  },
  {
    label: "IMS", items: [
      { label: "Categories", path: "/ims/categories" },
      { label: "Parts", path: "/ims/parts" },
      { label: "Pricing", path: "/ims/pricing" },
    ],
  },
  {
    label: "WMS", items: [
      { label: "Stock", path: "/wms/stock" },
      { label: "Inward", path: "/wms/inward" },
      { label: "Outward", path: "/wms/outward" },
      { label: "Disassembly", path: "/wms/disassembly" },
      { label: "Reassembly", path: "/wms/reassembly" },
      { label: "Returns", path: "/wms/returns" },
    ],
  },
];
```

- [ ] **Step 3:** Commit.

---

### Task 7: React Router setup with placeholder routes

- [ ] **Step 1:** Install `react-router-dom@6`.
- [ ] **Step 2:** Create `src/app/router.tsx`:

```tsx
import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import { AppShell } from "@shared/components/layout/AppShell";
import { LoginPage } from "@modules/identity/pages/LoginPage";
import { DashboardPage } from "@/DashboardPage"; // placeholder
import { RequireAuth } from "@shared/auth/RequireAuth";

const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: "/", element: <DashboardPage /> },
          { path: "*", element: <Navigate to="/" replace /> },
        ],
      },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
```

- [ ] **Step 3:** Wire `AppRouter` in `src/main.tsx`.
- [ ] **Step 4:** Commit.

---

### Task 8: Auth context + token storage

- [ ] **Step 1:** Create `src/shared/auth/AuthContext.tsx`. Holds `accessToken` in memory only. Refresh token lives in HttpOnly cookie set by backend.
- [ ] **Step 2:** Implement `useAuth()` hook returning `{ user, login, logout, isAuthenticated }`.
- [ ] **Step 3:** Implement `RequireAuth` — redirects to `/login` if not authenticated.
- [ ] **Step 4:** Implement `login(email, password)` stub that will POST to backend when Task 10 completes.
- [ ] **Step 5:** Commit.

---

### Task 9: API client — envelope unwrap + error class

- [ ] **Step 1:** Install `axios` (or stick with fetch; pick one). We'll assume fetch-based since the OpenAPI generator outputs fetch.
- [ ] **Step 2:** Create `src/shared/api/envelope.ts`:

```ts
export interface ErrorDetail { code: string; detail: string; field?: string | null }
export interface Envelope<T> { success: boolean; code: number; message: string; data: T | null; errors: ErrorDetail[] | null }

export class ApiError extends Error {
  constructor(public code: number, public envMessage: string, public errors: ErrorDetail[] | null) {
    super(envMessage);
  }
  hasErrorCode(code: string): boolean {
    return this.errors?.some((e) => e.code === code) ?? false;
  }
}

export function unwrap<T>(env: Envelope<T>): T {
  if (!env.success || env.data == null) {
    throw new ApiError(env.code, env.message, env.errors);
  }
  return env.data;
}
```

- [ ] **Step 3:** Create `src/shared/api/client.ts` with a typed fetch wrapper that:
  - injects the access token from AuthContext
  - generates an `Idempotency-Key` header on non-idempotent methods
  - parses Envelope JSON and throws ApiError on non-success
  - catches 401 → attempts refresh → retries once → logs out on repeated failure
- [ ] **Step 4:** Unit tests for envelope unwrap + ApiError.
- [ ] **Step 5:** Commit.

---

### Task 10: OpenAPI code generation

- [ ] **Step 1:** Install `openapi-typescript-codegen` (or `oazapfts`):

```bash
pnpm add -D openapi-typescript-codegen
```

- [ ] **Step 2:** Add `gen:api` npm script:

```json
"scripts": {
  "gen:api": "openapi --input http://localhost:8000/api/v1/openapi.json --output src/shared/api/generated --client fetch --useOptions --useUnionTypes"
}
```

- [ ] **Step 3:** Run `pnpm gen:api` against a running backend. Commit the generated files. (If backend isn't up yet, create a placeholder `src/shared/api/generated/.gitkeep` and defer regeneration to when Phase 2 backend work starts.)
- [ ] **Step 4:** Commit.

---

### Task 11: TanStack Query provider

- [ ] **Step 1:** Install TanStack Query: `pnpm add @tanstack/react-query @tanstack/react-query-devtools`.
- [ ] **Step 2:** Create `src/app/providers.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { AuthProvider } from "@shared/auth/AuthContext";

const qc = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={qc}>
      <AuthProvider>{children}</AuthProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

- [ ] **Step 3:** Wrap `AppRouter` with `AppProviders` in `main.tsx`.
- [ ] **Step 4:** Commit.

---

### Task 12: Login page (basic, unstyled-ok)

- [ ] **Step 1:** Create `src/modules/identity/pages/LoginPage.tsx` with a React Hook Form + Zod form (`email`, `password`).
- [ ] **Step 2:** On submit, call `useAuth().login(email, password)` → redirect to `/`.
- [ ] **Step 3:** Show inline field errors + toast on API error.
- [ ] **Step 4:** E2E test (Playwright) — visit `/login`, fill and submit, verify redirect. Can use a mocked backend until Phase 2 identity module is live.
- [ ] **Step 5:** Commit.

---

### Task 13: Dashboard page with backend health check

- [ ] **Step 1:** Create `src/DashboardPage.tsx`:

```tsx
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@shared/api/client";

export function DashboardPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["health"],
    queryFn: () => apiClient.get<{ status: string }>("/api/v1/health"),
  });
  return (
    <div className="p-8">
      <h1 className="text-2xl">Comprint ERP</h1>
      {isLoading && <p>Loading…</p>}
      {error && <p className="text-red-500">Backend unreachable.</p>}
      {data && <p>Backend status: {data.status}</p>}
    </div>
  );
}
```

- [ ] **Step 2:** Commit.

---

### Task 14: Vitest + RTL setup

- [ ] **Step 1:** Install: `pnpm add -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom`.
- [ ] **Step 2:** Add `vitest.config.ts` with `jsdom` environment + setup file importing `@testing-library/jest-dom`.
- [ ] **Step 3:** Write a sanity test in `tests/unit/envelope.test.ts` covering `unwrap` + `ApiError.hasErrorCode`.
- [ ] **Step 4:** Add `test` script to package.json. Run: `pnpm test`.
- [ ] **Step 5:** Commit.

---

### Task 15: Playwright setup

- [ ] **Step 1:** `pnpm dlx playwright@latest install` + `pnpm add -D @playwright/test`.
- [ ] **Step 2:** Create `playwright.config.ts` — `webServer: { command: 'pnpm dev', port: 5173, reuseExistingServer: !process.env.CI }`.
- [ ] **Step 3:** Write one smoke E2E: visit `/login` → verify page loads → visit `/` → verify redirect when unauthenticated.
- [ ] **Step 4:** Commit.

---

### Task 16: CI pipeline

- [ ] **Step 1:** Create `.github/workflows/ci.yml` running: install → lint → type-check (`tsc --noEmit`) → vitest → playwright.
- [ ] **Step 2:** Commit.

---

### Task 17: .env + README

- [ ] **Step 1:** Write `.env.example`:

```bash
VITE_API_BASE_URL=http://localhost:8000
VITE_ENABLE_DEVTOOLS=true
```

- [ ] **Step 2:** Write `README.md` with getting-started instructions, scripts list, link to architecture doc.
- [ ] **Step 3:** Commit.

---

## Acceptance criteria (Phase 1 done)

- [ ] `pnpm install` clean.
- [ ] `pnpm dev` serves the app at `http://localhost:5173`.
- [ ] Visiting `/` without auth redirects to `/login`.
- [ ] Logging in (mocked if backend not ready) redirects to `/`.
- [ ] Dashboard page hits `/api/v1/health` and renders status (or "Backend unreachable" with a clear error).
- [ ] `pnpm test` (Vitest) passes with the envelope + ApiError tests.
- [ ] `pnpm exec playwright test` passes the smoke E2E.
- [ ] `pnpm exec tsc --noEmit` has zero errors.
- [ ] `pnpm exec eslint .` is clean.
- [ ] CI green on first push.
- [ ] Design tokens from theme repo render correctly — visual comparison matches.

Phases 2+ (per-module pages) live in `2026-04-22-modules-task-lists.md`.
