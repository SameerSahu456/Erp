# Comprint ERP Frontend — AI Context

## Before You Code (mandatory pre-flight)

**Before making any change in this project, read all three files at the frontend root:**
1. `Coding-guideline.md` — engineering rules (folder structure, API layer, hooks, forms, state, routing, anti-patterns, etc.)
2. `PRODUCT.md` — product context (users, brand, tone, anti-references, strategic principles)
3. `DESIGN-SYSTEM.md` — design system tokens (colors, typography, elevation, components). The 4-tier token architecture (ramps → semantic tokens → Tailwind bridge → component utilities) plus the migration table mapping every legacy hex to its semantic replacement. `DESIGN.md` is a local-only artefact produced by the `/impeccable` skill — don't confuse the two.

These three files are the source of truth and override any default behavior.

**For any UI-related change or when creating a new page, you MUST also read `PAGE-UI-RULES.md` (frontend root) and apply EVERY section — never a subset.** It is the page-level UI + test-case contract, and it applies to bug fixes, refactors, and brand-new pages alike. Sections to check every time: §0 global rules · §1 listing pages + §1.1 list view-state · §2 detail pages · §3 / §3.1 / §3.2 forms, modal forms, field sizing · §4 component cheat-sheet · §5 non-negotiables · §6 test-case checklist (§6.1–§6.6) · §7 consistency & symmetry · §8 typography map · §9 fields/inputs/uploads/wizards/tables · §10 navigation · §11 API efficiency · §12 errors/sessions/bulk/feeds/export · §13 interactions & polish · §14 more test cases (line items, validation, a11y, content, routing). Walk all of them and confirm coverage — skipping a section (e.g. §10 navigation) makes the change look half-done and gets rejected on review.

## Where Planning Docs Live

**No planning document lives in this repo.** Exactly five Markdown files belong at the frontend root:

| File | Why it stays |
|------|--------------|
| `CLAUDE.md` | This file — AI context |
| `Coding-guideline.md` | Engineering rules, mandated by the pre-flight above |
| `DESIGN-SYSTEM.md` | Design tokens, mandated by the pre-flight above |
| `PAGE-UI-RULES.md` | Page-level UI + test-case contract, mandated by the pre-flight above for any UI change / new page |
| `README.md` | Standard repo furniture |

Everything else — plans, specs, audits, changelogs, fix write-ups; `*_PLAN.md`, `PLAN-*.md`,
`*-plan.md`, `*_SPEC.md`, `*_AUDIT.md` — belongs in the **`plan/{module}/folder `** repo, filed
under the module and entity it describes:

```
comprint-erp-docs/modules/
├── crm/{account,contact,lead,deal,quote,sales-order,demo-request,dashboard,…}/
└── foundation/{audit,auth,users,roles,search,ui}/
```

**Rules:**
- Never create a planning `.md` at the frontend root or anywhere under `src/`. Write it
  straight into `comprint-erp-docs/modules/<module>/<entity>/`.
- Cite a doc from code by its full docs-repo path
  (`comprint-erp-docs/modules/crm/quote/QUOTE_VERTICALS_PLAN.md`), never a bare filename —
  bare names silently dangle once the doc is filed.
- No entity folder fits? Add one under the right module. Don't drop the file at a repo root.
- `comprint-erp-docs` commits need explicit approval — ask before committing there.

**For UI / design work, use the `/impeccable` plugin.** It loads `PRODUCT.md` + `DESIGN.md` automatically and follows the design laws + register-specific (brand vs product) guidance. Use sub-commands like `/impeccable craft`, `/impeccable shape`, `/impeccable critique`, `/impeccable polish`, `/impeccable colorize`, etc. Don't invent design decisions outside the plugin — let it consume `DESIGN.md` and produce on-brand output.

**Read `Coding-guideline.md` (frontend root) before making any code change.** It is the source of truth for: folder structure (§3), RBAC (§5), the centralized API layer (§6), the reusable hooks catalog (§7), component system (§8), forms (§9), state management (§10), routing (§11), error/empty/loading UX (§12), naming (§13), hard limits (§14), anti-patterns (§15), centralized constants (§16), SOLID for React (§17), component patterns (§18), performance (§19), accessibility (§20), and the AI generation checklist (§21).

**Especially load §6.5.1, §6.7 and §16.6 → §16.12 into context for any list-page work** (leads, deals, accounts, contacts, quotes, sales orders, invoices, purchase requests, parts, OEMs, suppliers, POs, GRNs, warehouses, and every future module):

- **§6.5.1 — Query config is global, never per-hook.** The `QueryClient` in `src/app/providers.tsx` is the single source for `staleTime`, `gcTime`, `retry`, `refetchOnMount`, `refetchOnWindowFocus`, `refetchOnReconnect` (sourced from `API.QUERY_DEFAULTS` in `src/shared/constants/api.ts`). Do NOT pass any of these to an individual `useQuery` / `useInfiniteQuery` / `useMutation` call. Per-hook overrides silently break the always-refetch contract — the recurring symptom is "stale data after save". If a module genuinely needs different defaults, change the global or escalate; never quietly override per call. (Auto-reject per §14 #13 and §15.) There are **two** named exceptions. One is slow-changing reference data (team rosters, my-warehouses, stage registries) spreading `...API.REFERENCE_DATA_QUERY_OPTIONS` — never a raw `staleTime:` literal, never on transactional data. The other is job-status polling: a function `refetchInterval` that returns `API.JOB_POLL_MS` while a job is active and `false` once none is.

- **§16.9.1 — One query-key factory per module.** Every `queryKey` and `invalidateQueries` imports from the module's factory (reference: `src/modules/wms/hooks/keys.ts` → `wmsKeys`): `['<module>', feature, kind, …]`, with a record's sub-resources nested under `detail(id)` so one prefix refreshes one record. Zero inline key arrays; one named invalidate helper per feature; cross-module keys from the owner's barrel (`purchaseOrderKeys`, `imsKeys`); predicates match exact segments, never `includes()`.

- **§6.8 — Multi-call submits are retry-safe.** When one action makes 2+ API calls (upload → raise → complete; create draft → attach units), the orchestration lives in a mutation hook, completed steps are skipped on retry (`useOnceSteps`), a partial failure lands the user on the record that was created, invalidation runs in `onSettled`, and every mutation has exactly one error surface. File downloads go through `apiClient.getBlob/postBlob`.

- **§19 — Performance under the React Compiler.** The compiler memoises automatically but silently skips any component that breaks the Rules of React. Don't hand-write `useMemo`/`useCallback` for perf in new code; DO fix the compiler diagnostics in files you touch (`react-hooks/incompatible-library` → `useWatch` not `form.watch`; `preserve-manual-memoization`; `set-state-in-effect` → derive / adjust-during-render). No N+1 per-row fetches, no per-tab `page_size:1` count queries (use `useTabCounts` / one stats query), `enabled` on dialog-only and permission-gated queries, `keepPreviousData` on paged lists.

- **§14 — Size limits count code lines only (no blanks/comments).** Component file ≤ 200 (hard cap 300), one component or hook ≤ 150, helper function ≤ 50 with complexity ≤ 15, ≤ 4 params; API wrapper files cap at 400; `*.strings.ts`, `*.columns.ts`, `schema.gen.ts`, mocks, stories and tests are exempt. ESLint warns (`max-lines`, `max-lines-per-function`, `complexity`, `max-params`) — split by responsibility (a `use<Feature>` hook + section components), never by squashing lines. Fix-as-you-go: a file you touch must end within the caps.

- **§7 — Shared building blocks exist; grep before writing.** `useTabCounts`, `useTabbedListView`, `useClientPager` (embedded arrays only), `toSortParam`, `isUuid`/`asUuid`, IST date helpers (`todayDateParam`, `istDayStartISO` — never `toISOString().slice(0,10)`), `humanizeEnum`, `isForbidden`/`isNotFound`, `notifyMutationError`, `compactParams`. Full table with paths in Coding-guideline §7. Also `istTodayDateParam` (IST business "today"), `saveBlob`, `EMPTY_VALUE`.

- **§6.9 — Module review checklist (apply to every module you build or touch).**
  1. Search reaches a query key only through `useDebounce`.
  2. Paged lists use `keepPreviousData`.
  3. Dialog-only, one-tab and permission-gated queries have `enabled`.
  4. Never `.slice(0,10)` a timestamp; use `formatIST*` / `istDayStartISO` / `istTodayDateParam`.
  5. Every mutation has exactly one error surface: no `catch {}` and no `void mutateAsync()`.
  6. Hooks and `lib/` never import from `components/`.
  7. No raw backend enum or status reaches the UI; use a `constants/` label map.
  8. Use `EMPTY_VALUE`, not a local `"—"`.
  9. `routes.tsx` ends with a `path="*"` not-found route, and `/new` routes are permission-gated.
  10. Detail pages split 404/403/error with `asUuid` first.
  11. Delete files, strings and types you orphan.
  12. No hand-written API types the schema already has.
  13. Components never import `api/`; downloads are mutation hooks.

- **§8.3 — Base UI primitives use `render` for polymorphism, never `nativeButton` at call sites.** When you write `<Button render={<Link to="..."/>}>`, the `<Button>` wrapper in `src/components/ui/button.tsx` auto-flips `nativeButton: false` for you. If you ever see the Base UI warning *"expected a native `<button>` because the `nativeButton` prop is true"* it means the wrapper got bypassed (you imported `ButtonPrimitive` directly, or built a fresh component without the auto-flip) — fix that, don't sprinkle `nativeButton={false}` per page. Mirror the same pattern when wrapping any other Base UI primitive that has both a native-element default and a `render` prop.

- **§6.7 — Verify against the live backend before claiming a feature is wired.** A sibling backend folder (`../comprint-erp-backend/`) is present in this workspace. Before writing or editing any endpoint-consuming code, the AI MUST: (a) grep the backend for the route, (b) read the Pydantic response schema, (c) curl the endpoint live and save the JSON, (d) diff every field against the frontend types in `modules/<x>/api.ts`, (e) verify `curl -sI http://localhost:5173/api/v1/<endpoint>` returns `Content-Type: application/json` (not `text/html` — that means the Vite dev proxy is being eaten by the SPA fallback and the page will render empty), and (f) walk through the seven silent-empty-page mismatches in §6.7. Do not report a list/detail/form page done until the data has been seen end-to-end.

- **§16.6 — Single-source pagination.** One `<MODULE>_PAGE_SIZE` constant per page, derived from `PAGINATION.DEFAULT_PAGE_SIZE`. No view (table, kanban, grid) may hardcode its own size literal.
- **§16.7 — Server pagination is the default.** Tables MUST page through the API. `.slice()` over a cached fetch is forbidden. The page owns `page` state; it resets to 1 on filter changes; the footer fires `onPageChange` to refetch.
- **§16.8 — One pagination wire contract.** Request `page` + `page_size` (never offset/limit/size); response `{items, total, page, page_size, has_next}`. Type it with `PageParams` / `PageResponse<T>` from `@/shared/api/pagination`; infinite queries use `FIRST_PAGE` + `nextPage`.
- **§16.8 — Multi-bucket views query per bucket.** Kanban / status-tab / swim-lane pages run one `useInfiniteQuery` per column, with infinite scroll per column and the bucket key as a structural queryKey level.
- **§16.9 — Targeted invalidation.** Item-move mutations take `{id, from, to}` and `predicate`-invalidate only the two affected bucket queries + the detail query. No blanket `invalidateQueries({ queryKey: MODULE_KEY })`.
- **§16.10 — Reference implementation.** The leads module (`modules/crm/pages/LeadsPage.tsx`, `modules/crm/hooks/useLeads.ts`) is the canonical pattern. Mirror its structure for deals, accounts, etc.
- **§16.11 — API-backed dropdowns are dynamic.** Every dropdown / multi-select sourced from a paginated API endpoint MUST use `useInfiniteQuery`, scroll-to-load-more via `IntersectionObserver`, debounced search sent as a query param, and `PAGINATION.DEFAULT_PAGE_SIZE` for the chunk size. Never fetch all rows up-front and filter client-side. The API wrapper MUST unwrap the `{items, total, …}` envelope and return a typed page object — wrappers typed `OEM[]` while actually returning the paginated wrapper are forbidden (silently caps the dropdown at zero).

- **§16.12 — No naked strings.** User-facing copy (titles, button labels, placeholders, empty/error states, dialog copy, toast messages) is NOT hardcoded in components — it comes from a centralized typed constant: co-located `*.strings.ts` (`<FEATURE>_STRINGS as const`) for screen copy, a module `constants/` label map (`Record<Enum,string>`) for status/enum display, Zod messages staying with the schema, and `shared/constants/` for truly app-wide copy. Single-locale code-quality rule, NOT i18n — do not add a translation runtime / `t()`. Rendering still goes through `<Typography>` (§8.4); only the literal's source moves. Enforced by `i18next/no-literal-string` at **warn** (detector only) over `src/modules/**` + `src/components/**` — fix-as-you-go: migrate a file's naked strings whenever you touch it. Reference: CRM › accounts (`components/accounts/accounts.strings.ts` + `constants/account-status.ts`).

- **§8.4 — All display text goes through `<Typography>`.** The only typographic primitive is `<Typography variant=… tone=…>` in `src/components/ui/typography.tsx`. No raw `<h1>`–`<h6>` in feature code, no inline `text-{xs,sm,base,lg,xl,2xl,3xl,4xl}`, and no arbitrary `text-[Npx]` / `text-[Nrem]` classes. Pick a semantic variant (`page-title`, `card-title`, `body`, `helper`, etc.); pick a `tone` instead of sprinkling `text-muted-foreground` / `text-destructive`. Same "fix as you go" migration rule as §16.7 — when you touch a file, migrate its text styling.

- **§8.5 — Never hardcode a colour. Ever.** Every colour comes from a Tier 2 semantic token defined in `src/styles/themes.css` and used as a Tailwind class: `bg-primary`, `text-success`, `border-input`, `bg-destructive-soft`, `text-muted-foreground`, `bg-violet`, `bg-card`, `bg-background`, `ring-ring`, … — routed through the ramps in `src/styles/tokens/colors.css` (the ONLY file where raw hex may live). **Forbidden in feature code, components, and `comprint.css`:** raw hex (`bg-[#f1416c]`, `style={{ color: '#f6c000' }}`), `rgb()`/`rgba()`/`hsl()` literals (`shadow-[…rgba(16,24,40,.05)]`, `ring-[rgba(...)]`), `var(--token, #hex)` fallbacks (use `bg-card`, **not** `bg-[var(--card,#fff)]`), and hex in JS colour maps (use `var(--token)` strings). No token fits? Add a ramp stop in `tokens/colors.css` + a semantic token in `themes.css` — don't inline. For an alpha tint use the token + opacity (`bg-success/18`) or `color-mix(in srgb, var(--success) 18%, transparent)`; for a shadow use `rgb(var(--shadow-rgb)/a)`. To re-skin/theme the whole app you edit ONLY `themes.css` (+ `colors.css` for new values) — a hardcoded colour silently breaks dark mode and the palette swap. The ONLY exceptions: PDF/print HTML strings (no CSS vars render there), `chartTheme.tsx` (chart palette), and `tokens/colors.css` itself. ESLint warns on `[#hex]`; fix-as-you-go. See DESIGN-SYSTEM.md + Coding-guideline §8.5.

- **§8.6 — Every `src/components/ui/` primitive ships a colocated `*.stories.tsx`.** When you add or materially change a component in `src/components/ui/`, write/update its Storybook story (`src/components/ui/<name>.stories.tsx`) **in the same change** — Storybook is the component catalog and the contract. CSF3 + `satisfies Meta<typeof X>` + `tags: ['autodocs']`, colocated, `title` group (`Foundations`/`Primitives`/`Forms`/`Feedback`/`Overlays`/`Navigation`/`Data`); mirror `button.stories.tsx`. These are **Base UI** components — compose with `render={…}` triggers, not `asChild`; copy a real app usage where one exists. `npm run build-storybook` must pass. A `ui/` primitive without its story is incomplete. See Coding-guideline §8.6 / §23.

- **§8.7 — No component may scroll horizontally. Build every component to fit its container.** A horizontal scrollbar inside a card, dialog, list row, or panel is a layout bug, never accepted behaviour — content must wrap or truncate, never push the layout wide. The usual cause is long unbroken text (names, emails, URLs) in a flex/grid row whose item can't shrink. When authoring or touching any component: any `truncate` element inside a flex/grid row MUST also carry `min-w-0` (and usually `flex-1`) — `truncate` alone is a no-op in a flex child because its default `min-width:auto` keeps it at content width and the row overflows; keep secondary content (icons, email, actions) `shrink-0`; never hardcode a px width wider than the narrowest container the component renders in; reserve `overflow-x-auto` for genuinely wide 2-D content (a data table the user pans), never as a patch over a blow-out. Before calling a component done, test every text slot with an absurdly long string and confirm zero horizontal scrollbar at its narrowest breakpoint. (This is exactly the `/crm/accounts/new` → "Link existing contact" dialog bug — a `<span className="truncate">` with no `min-w-0`.)
- **§11.1 — URL params are untrusted input.** Anything read from `useSearchParams()` / `useParams()` that reaches an API call MUST go through a validating parser that returns a value **valid by construction** — then repair rather than reject, rewrite the URL to match what actually rendered (`{ replace: true }`), and say what changed. A format check is NOT validation: `/^\d{4}-\d{2}-\d{2}$/` accepts `2026-13-45`, and it accepts an inverted range — which is exactly how `?period=custom&from=<later>&to=<earlier>` turned the CRM dashboard into ~12 red boxes of backend validator text. Verify the domain (real calendar date, ordered range, UUID, enum membership), drop only the offending value rather than the whole facet, keep a clean URL a strict no-op (no rewrite, no re-render), and never send a param the client can already prove the server will 422. Unknown route params render a not-found state, never a crash. Reference: `modules/crm/hooks/dashboard/insight-view.params.ts`.

This applies to every task — bug fix, refactor, new feature, or one-line change. Don't reinvent a hook listed in §7. Don't hardcode a number that already lives in `shared/constants/` per §16. Don't override TanStack Query config per hook — §6.5.1 forbids it. Don't ship a client-paginated list page — §16.7 forbids it. Don't ship a kanban that loads-then-groups — §16.8 forbids it. Don't blanket-invalidate after a single-item move — §16.9 forbids it. Don't ship a dropdown that fetches all rows and filters in the browser — §16.11 forbids it. Don't hardcode user-facing copy as a naked string in a component — route it through a `*.strings.ts` / label map per §16.12. Don't style text with raw `<h1>`–`<h6>` or inline `text-…` classes — §8.4 forbids it. Don't hardcode a colour — hex, `rgb()`/`rgba()`, or a `var(--x,#hex)` fallback — §8.5 forbids it. Don't add a `src/components/ui/` primitive without its Storybook story — §8.6 requires it. Don't read a URL param straight into an API call — §11.1 requires it be validated first.

If your change conflicts with the guideline, update the guideline in the same PR (with a one-line rationale) and only then write the code. Code that ships out of sync with the guideline will be rejected on review.

## Tech Stack (exact versions)

| Layer | Choice |
|-------|--------|
| Language | TypeScript 6.x (strict mode) |
| Framework | React 19 |
| Build | Vite 8 |
| UI components | shadcn/ui + Radix primitives + `@base-ui/react` |
| Styling | Tailwind CSS v4 — utility-first, no CSS-in-JS |
| Routing | React Router 7 (data router / `react-router-dom`) |
| Server state | TanStack Query v5 — all API data goes here |
| Client state | Zustand (use only when genuinely cross-feature; prefer local `useState`) |
| Forms | React Hook Form 7 + Zod 4 resolver |
| API types | Generated from backend OpenAPI — `openapi-typescript` + `openapi-fetch` |
| Icons | lucide-react |
| Dates | `date-fns` + `date-fns-tz` — all timestamps rendered in IST (Asia/Kolkata) |
| Toasts | sonner |
| Testing | Vitest 4 (unit/component), React Testing Library 16, Playwright (e2e) |
| Lint/format | ESLint flat config + Prettier |
| Package manager | pnpm |

## Commands

```bash
# Setup
pnpm install
cp .env.example .env.local

# Development
pnpm dev                       # Vite dev server → http://localhost:5173
pnpm api:gen                   # Regenerate src/shared/api/schema.gen.ts from backend OpenAPI
                               # Run this after any backend schema change; commit the result

# Quality gates
pnpm lint                      # ESLint + Prettier check
pnpm format                    # Prettier write
pnpm typecheck                 # tsc --noEmit (strict)
pnpm test                      # Vitest (unit + component)
pnpm test:e2e                  # Playwright e2e against running backend

# Build
pnpm build                     # tsc -b && vite build
pnpm preview                   # serve dist/
```

`pnpm api:gen` points to `http://localhost:8000/openapi.json` — backend must be running.

## Project Structure

```
comprint-erp-frontend/
├── src/
│   ├── main.tsx                       # Entry point, provider tree root
│   │
│   ├── app/                           # App-level glue (one-of-a-kind)
│   │   ├── providers.tsx              # QueryClient, theme, Toaster, auth context
│   │   ├── router.tsx                 # Composes <ModuleName>Routes from each module
│   │   ├── layouts/                   # AppShell + Header + Sidebar + header widgets
│   │   │   ├── AppShell.tsx           # Top-level frame (used only by router.tsx)
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── sidebar-nav-config.ts
│   │   │   ├── UserMenu.tsx           # Header widgets — only Header uses them
│   │   │   ├── ThemeSwitcher.tsx
│   │   │   ├── NotificationPopover.tsx
│   │   │   ├── GlobalSearch.tsx
│   │   │   └── FloatingQueryButton.tsx
│   │   ├── ComingSoonPage.tsx
│   │   └── DashboardPage.tsx
│   │
│   ├── components/                    # Reusable building blocks (many-of)
│   │   ├── ui/                        # shadcn primitives — kept FLAT (library, managed by shadcn CLI)
│   │   ├── page-shells/               # Page-level chrome: ListPageShell, DetailPageShell,
│   │   │                              # FormPageShell, EntityHeader, DetailTabs, PageHeader,
│   │   │                              # Breadcrumbs, LoadingSkeletons
│   │   └── common/                    # Cross-cutting widgets, grouped by purpose
│   │       ├── pickers/               # CategoryPicker, MultiSelect, TagInput, …
│   │       ├── dialogs/               # ConfirmDialog, UnsavedChangesDialog
│   │       ├── files/                 # FileUpload, DocumentUploadField, MediaGallery
│   │       ├── feedback/              # EmptyState, FormCardSkeleton
│   │       ├── forms/                 # FieldError, ListToolbar, ResponsiveFilters
│   │       ├── display/               # StatusBadge, Avatar, Logo, Timeline, Stats, …
│   │       ├── tables/                # BusinessMetricsTable, TablePagination
│   │       ├── views/                 # KanbanBoard, MultiStepWizard, WorkflowStepper, CommentSection
│   │       └── permissions/           # PermissionGate
│   │
│   ├── shared/                        # Cross-cutting NON-component code
│   │   ├── api/
│   │   │   ├── schema.gen.ts          # AUTO-GENERATED — do not edit by hand
│   │   │   └── client.ts              # openapi-fetch wrapper + auth interceptor
│   │   ├── hooks/                     # useDebounce, usePagination, etc.
│   │   ├── lib/                       # date helpers (formatIST), currency, cn()
│   │   ├── auth/                      # AuthProvider, useAuth, route guards
│   │   ├── rbac/                      # <Can />, usePermission
│   │   ├── errors/                    # ErrorBoundary, error mappers
│   │   └── styles/                    # global.css, Tailwind v4 @theme tokens
│   │
│   ├── modules/                       # Business modules — mirror backend domains.
│   │   │                              # Each module owns: pages, components, hooks, routes, api,
│   │   │                              # schemas, permissions, types, and its index.ts barrel.
│   │   ├── crm/                       # Largest module — see "Module Layout" below for full shape
│   │   │   ├── pages/<sub-feature>/   # leads/, deals/, accounts/, contacts/, quotes/, …
│   │   │   ├── components/<sub-feature>/
│   │   │   ├── hooks/<sub-feature>/
│   │   │   ├── api.ts                 # Typed endpoint wrappers
│   │   │   ├── schemas.ts             # Zod schemas for forms
│   │   │   ├── permissions.ts         # RBAC permission codes for this module
│   │   │   ├── routes.tsx             # <CrmRoutes /> — module owns its routing
│   │   │   └── index.ts               # Public exports — the ONLY way other modules import from CRM
│   │   ├── ims/                       # categories, oems, parts, variants, stock, checklists,
│   │   │                              # pm-assignments, dashboard, sku-history, shared
│   │   ├── wms/                       # warehouses, inwards, devices, dispatches, qc, vendor-jobs,
│   │   │                              # repair, work-orders, bom, spares, …  (15 sub-features)
│   │   ├── procurement/               # purchase-requests, purchase-orders, grns, vendors, pm-approvals
│   │   ├── settings/                  # users, roles, profile, app
│   │   ├── invoices/                  # sales, purchase, credit-notes, dashboard
│   │   ├── accounting/                # ledger, payments, reports, dashboard
│   │   ├── reconciliation/            # bank, vendor, inventory, inter-module
│   │   ├── customers/                 # customer entity CRUD + approvals
│   │   ├── vendors/                   # vendor entity CRUD + approvals
│   │   ├── rentals/                   # contracts, orders, returns, billing, analytics, …
│   │   ├── identity/                  # LoginPage + auth UI
│   │   ├── dashboard/                 # Home dashboard
│   │   ├── design-system/             # Internal design system showcase
│   │   ├── reports/                   # ReportBuilderPage
│   │   ├── audit/                     # Cross-module audit-trail tab + hooks
│   │   ├── attachments/               # Attachment hook (shared across modules)
│   │   └── users/                     # User profile types + hook
│
├── tests/e2e/                         # Playwright specs
├── components.json                    # shadcn/ui config
├── vite.config.ts
├── tsconfig.json
├── tsconfig.app.json                  # Path aliases: @/* @app/* @modules/* @shared/*
├── eslint.config.js
└── package.json
```

## Module Layout — sub-feature pattern

Every business module that has more than ~3 pages groups its `pages/`, `components/`, and `hooks/` by **sub-feature** (kebab-case folders). Example from CRM:

```
src/modules/crm/
├── pages/
│   ├── leads/              LeadsPage.tsx, LeadDetailPage.tsx, LeadFormPage.tsx, RejectedLeadsPage.tsx
│   ├── deals/              DealsPage.tsx, DealDetailPage.tsx, DealFormPage.tsx
│   ├── quotes/             QuotesPage.tsx, QuoteFormPage.tsx, QuoteBuilderPage.tsx
│   ├── sales-orders/       …
│   └── close-won/          ClosedWonPage.tsx (cross-feature wizard)
├── components/
│   ├── leads/              KanbanCard.tsx, LostReasonDialog.tsx, …
│   ├── deals/              …
│   └── shared/             ActivityFeed.tsx, AuditTrail.tsx, CrmDataTable.tsx, … (cross-sub-feature)
├── hooks/
│   ├── leads/              useLeads.ts, useLeadStatuses.ts, …
│   ├── deals/              …
│   └── shared/             useActivities.ts, useComments.ts, useNotes.ts, … (cross-sub-feature)
├── api.ts
├── schemas.ts
├── permissions.ts
├── routes.tsx              # <CrmRoutes />
└── index.ts
```

**Rules:**
- Sub-feature folders are kebab-case (`sales-orders/`, `pm-assignments/`)
- A `shared/` sub-folder holds anything used across **two or more** sub-features within the same module (don't promote prematurely; only when there's a real second caller)
- Tiny modules (1–2 pages) skip the sub-feature wrapping — see `identity/`, `reports/`, `design-system/`

## Routing — each module owns its routes

```typescript
// src/modules/crm/routes.tsx
import { lazy } from 'react'
import { Route, Routes } from 'react-router-dom'
import { ErrorBoundary, ModuleErrorState } from '@shared/errors/ErrorBoundary'

const LeadsPage = lazy(() => import('./pages/leads/LeadsPage'))
// … other lazy imports use relative ./pages/<sub-feature>/X paths

export function CrmRoutes() {
  return (
    <ErrorBoundary fallback={<ModuleErrorState module="CRM" />}>
      <Routes>
        <Route path="leads" element={<LeadsPage />} />
        {/* … */}
      </Routes>
    </ErrorBoundary>
  )
}
```

```typescript
// src/modules/crm/index.ts — export the Routes alongside hooks/types
export { CrmRoutes } from './routes'
```

```typescript
// src/app/router.tsx — composes them via @modules/<name>
import { CrmRoutes } from '@modules/crm'
import { ImsRoutes } from '@modules/ims'
// …
<Route path="/crm/*" element={<CrmRoutes />} />
```

**Rules:**
- Each module's `routes.tsx` uses relative imports (`./pages/...`) — same-module code never uses `@modules/<self>/...`
- Each module's `routes.tsx` is wrapped in `ErrorBoundary` with a module-scoped fallback
- The URL prefix (`/crm/*`) stays in `router.tsx` — the module doesn't hardcode its mount path
- Single-page modules (identity, reports, design-system) inline their one route in `router.tsx` — no `routes.tsx` needed

### Mock pages — the `mock()` convention

A page that renders fabricated/in-memory data (no backend wiring yet) MUST be gated superuser-only so real users never mistake demo records for live ones. The WMS module defines the pattern (`src/modules/wms/routes.tsx`):

```typescript
// MOCK pages (fabricated data, no backend wiring yet) are locked to superusers.
const mock = (el: ReactElement) => <RouteGuard superuserOnly>{el}</RouteGuard>
// HIDDEN pages are blocked for EVERYONE (renders <NoAccess />) until wired.
const hidden = (_el: ReactElement) => <NoAccess />
// ...
<Route path="work-orders" element={hidden(<WorkOrderListPage />)} />
```

`hidden(...)` is the stricter variant used when even superusers should not see the demo data (WMS: dashboard, inventory, BOM, related parts, work orders, component history — 2026-10-05 RBAC decision). A hidden page has no sidebar entry. Bring it back by swapping `hidden(...)` for the real gate (or `mock(...)`) and restoring the nav item.

**Rules:**
- Every route of an unwired page is wrapped in `mock(...)`, and its sidebar entry is `superuserOnly: true`
- The mock data file (`src/modules/<mod>/data/<feature>.ts`) declares itself a demo mock in a header comment
- **When a page gets wired:** swap `mock(...)` for the real permission gate AND delete the mock data file in the same PR — a stale mock file whose domain model contradicts the live API misleads the next reader
- Mock and real data paths must never coexist inside one live flow — a wired page importing anything from `data/` mock files is a review-blocker (§6.7)

## Key Patterns

### 1. API types are generated — never hand-write them

```typescript
// src/shared/api/schema.gen.ts — AUTO-GENERATED, do not edit
// After backend schema changes: pnpm api:gen

// Use generated types in feature api.ts files:
import type { components } from '@/shared/api/schema.gen'
export type Part = components['schemas']['PartResponse']
export type CreatePartRequest = components['schemas']['CreatePartRequest']
```

### 2. All API calls go through the shared client — no bare fetch

```typescript
// src/shared/api/client.ts — openapi-fetch wrapper with auth interceptor
import { client } from '@/shared/api/client'

export async function createPart(payload: CreatePartRequest): Promise<Part> {
  const { data, error } = await client.POST('/api/v1/ims/parts', { body: payload })
  if (error) throw error
  return data.data    // unwrap the ApiResponse envelope
}
```

Always unwrap `response.data` from the `ApiResponse` envelope before returning to hooks/components.

### 3. All server state via TanStack Query

```typescript
// modules/ims/hooks/parts/useParts.ts — sub-feature folder
export function useParts(params: PartsQueryParams) {
  return useQuery({
    queryKey: ['ims', 'parts', params],
    queryFn: () => fetchParts(params),
  })
}

export function useCreatePart() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createPart,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ims', 'parts'] })
      toast.success('Part created')
    },
  })
}
```

No local `useState` for data that comes from the server. TanStack Query owns it.

### 4. All forms use React Hook Form + Zod

```typescript
// features/ims/schemas.ts
export const createPartSchema = z.object({
  part_number: z.string().min(1),
  name: z.string().min(1),
  ...
})
export type CreatePartInput = z.infer<typeof createPartSchema>

// In the component:
const form = useForm<CreatePartInput>({ resolver: zodResolver(createPartSchema) })
```

### 5. All timestamps rendered in IST — never call toLocaleString directly

```typescript
// shared/lib/date.ts — use this, not new Date(...).toLocaleString()
import { formatInTimeZone } from 'date-fns-tz'
export const formatIST = (iso: string) =>
  formatInTimeZone(new Date(iso), 'Asia/Kolkata', 'dd MMM yyyy, HH:mm')

// Or use <DateDisplay value={item.created_at} /> in JSX
```

All timestamps from the backend are UTC ISO-8601. The server never localizes.

### 6. shadcn/ui for all UI — extend via components/ui/, don't fork primitives

```typescript
// Adding a new variant to a shadcn component:
// src/components/ui/button.tsx — thin wrapper, use CVA variants
// Never copy-paste and edit a shadcn primitive inside a feature folder
// src/components/ui/ is FLAT (managed by the shadcn CLI — `pnpm dlx shadcn add`)
```

### 7. Module boundary rule — cross-module imports via index.ts only

```typescript
// CORRECT — CRM importing stock data from IMS
import { useInventorySummary } from '@modules/ims'   // via index.ts barrel

// WRONG — reaching into IMS internals
import { useInventorySummary } from '@modules/ims/hooks/stock/useStock'

// CORRECT — same-module imports use relative paths
import { useDeals } from '../../hooks/deals/useDeals'

// WRONG — same module reaching through @modules/<self>/...
import { useDeals } from '@modules/crm/hooks/deals/useDeals'
```

ESLint `no-restricted-imports` enforces this (currently as a **warning** during migration — to be flipped to error after the 232 existing violations are cleaned up). The rule bans `@modules/*/*` and `@/modules/*/*` — anything with a slash after the module folder. Every module has an `index.ts` as its public contract.

### 8. Path aliases (tsconfig.app.json)

| Alias | Resolves to | Use for |
|-------|-------------|---------|
| `@/*` | `src/*` | General imports (components, hooks, etc.) |
| `@app/*` | `src/app/*` | App-level glue (AppShell, providers, router) |
| `@modules/*` | `src/modules/*` | **Only at the module index level** — `@modules/crm`, not `@modules/crm/pages/...` |
| `@shared/*` | `src/shared/*` | Shared utilities (api/client, auth, lib, errors) |

Prefer the most specific alias. Use relative paths within a module.

### 9. Every data-driven view must handle loading, empty, and error states

```tsx
function PartsList() {
  const { data, isLoading, isError } = useParts(params)
  if (isLoading) return <Skeleton />
  if (isError) return <ErrorState />
  if (!data?.length) return <EmptyState action={<CreatePartButton />} />
  return <DataTable rows={data} />
}
```

### 10. Page shells over hand-rolled layouts

Every list, detail, and form page must compose from `src/components/page-shells/`:

```tsx
import { ListPageShell } from '@/components/page-shells/ListPageShell'
import { DetailPageShell } from '@/components/page-shells/DetailPageShell'
import { FormPageShell } from '@/components/page-shells/FormPageShell'
import { EntityHeader } from '@/components/page-shells/EntityHeader'
import { DetailTabs } from '@/components/page-shells/DetailTabs'
```

These guarantee every page in the app shares the same visual frame (breadcrumbs, header chrome, footer actions, loading skeletons). Don't roll your own `<header><nav>…</nav><main>…</main></header>` per page.

## Route Naming

All routes are kebab-case under module prefixes. The mount prefix lives in `src/app/router.tsx`; the routes themselves live in `src/modules/<mod>/routes.tsx`.

| Module | Mount prefix | Example sub-paths |
|--------|--------------|-------------------|
| CRM | `/crm/*` | `leads`, `deals`, `accounts`, `contacts`, `quotes`, `sales-orders`, `material-inquiries`, `demo-requests` |
| IMS | `/ims/*` | `categories`, `oems`, `parts`, `variants`, `stock-items`, `pm-assignments` |
| WMS | `/wms/*` | `inward`, `devices`, `work-assignments`, `inspection`, `repair`, `qc`, `vendor-jobs`, `spares`, `assign-rack`, `material-issue`, `dispatches`, `transfers`, `purchase-returns`, `replacements`, `sales-returns`, `locations`, `checklists`, `reports` |
| Procurement | `/procurement/*` | `purchase-requests`, `purchase-orders`, `grns`, `vendors`, `pm-approvals` |
| Invoices | `/invoices/*` | `sales`, `purchase`, `credit-notes` |
| Accounting | `/accounting/*` | `ledger`, `payments`, `reports` |
| Reconciliation | `/reconciliation/*` | `bank`, `vendor`, `inventory`, `inter-module` |
| Customers | `/customers/*` | (CRUD + `approvals`) |
| Vendors | `/vendors/*` | (CRUD + `approvals`) |
| Rentals | `/rentals/*` | `contracts`, `tracking`, `returns`, `orders`, `assets`, `billing`, `analytics` |
| Settings | `/settings/*` | `users`, `roles`, `profile`, `app` |

## File Naming Conventions

- `PascalCase.tsx` — React components
- `camelCase.ts` — hooks, utilities, API wrappers
- `kebab-case.ts` — route config files
- Named exports everywhere; default exports only for lazy-loaded route chunks

## Testing Strategy

| Level | Tool | What |
|-------|------|------|
| Unit | Vitest | Pure utilities, Zod schemas, `renderHook` for hooks |
| Component | Vitest + RTL + msw | Isolated component tests with mocked API responses |
| Integration | Vitest + RTL | Feature flows (form → submit → success state) |
| E2E | Playwright | Golden paths against a running backend (login, create PO, etc.) |

- Coverage: ≥ 70% on `features/*`, ≥ 90% on `shared/lib/`
- msw handlers seeded from generated OpenAPI — no hand-rolled mocks that drift from contract
- `pnpm test:e2e` requires the backend docker compose stack to be running

## Boundaries

**Always do:**
- Run `pnpm api:gen` after backend schema changes; commit `schema.gen.ts`
- Run `pnpm typecheck && pnpm lint && pnpm test` before pushing
- Use shadcn primitives; only extend them inside `src/components/ui/`
- Compose list/detail/form pages from `src/components/page-shells/*`
- Handle loading + empty + error states on every data-driven view
- Use semantic HTML and ARIA attributes; verify keyboard navigation
- When adding a page to a module, place it in the correct sub-feature folder (`pages/<sub-feature>/`) and update the module's `routes.tsx` — never edit `src/app/router.tsx` for module-internal routes
- When adding a route to a NEW module, create `src/modules/<mod>/routes.tsx` and export `<ModuleName>Routes` from the module's `index.ts`

**Ask first before:**
- Adding a new top-level `pnpm` dependency
- Forking/modifying a shadcn primitive beyond a thin wrapper
- Introducing a Zustand store that spans multiple modules
- Changing routing strategy or auth flow
- Adding a new top-level folder under `src/`
- Promoting a module-local component to `src/components/` (must verify it's used by ≥ 2 other modules)

**Never do:**
- Reach into `@modules/<other>/pages|components|hooks|api|...` — go through `@modules/<other>` (the index) instead
- Use `@modules/<self>/...` from within the same module — use relative paths
- Put module-specific code in `src/components/` (only cross-module reusables belong there)
- Put reusable components in `src/app/` (only one-of-a-kind app glue belongs there)
- Use `any` to silence the type checker
- Call the backend without going through `src/shared/api/client.ts`
- Hardcode the API base URL — always use `import.meta.env.VITE_API_URL`
- Commit `node_modules`, `.env.local`, `.claude/`, or `dist/`
- Disable a failing test instead of fixing it
- Call `new Date(...).toLocaleString()` — use `formatIST()` / `<DateDisplay />`
- Create a planning / spec / audit `.md` in this repo — they live in `comprint-erp-docs` (see "Where Planning Docs Live")
