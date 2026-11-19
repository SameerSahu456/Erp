# Comprint ERP Frontend — Code Review

**Verdict upfront**: This is well above average for an ERP scaffold. The architecture is solid, conventions are consistent, and the separation of concerns is mostly correct. But there are specific issues that will hurt you in production if left unaddressed. Here's the brutally honest breakdown.

---

## 1. Component Design

### What's good
The three-layer shell pattern (`ListPageShell` / `DetailPageShell` / `FormPageShell`) is genuinely excellent. Every page follows the same structural contract, which means adding a new page is mechanical and reviewers can instantly orient themselves.

`BusinessMetricsTable` and `KanbanBoard` are well-abstracted generic components with clean generic props (`T extends { id: string }`).

### Problem 1: `LeadsPage` is a 646-line god component

`src/modules/crm/pages/LeadsPage.tsx` holds:
- Filter state (7 persisted values)
- Date range computation
- KPI stats computation
- Kanban grouping + filtering
- Drag-and-drop intercept logic
- Lost reason dialog state
- List view column config + cell formatter
- All JSX including the filter panel (an inline `<aside>`)

**Why this is wrong:** You can't test any of this logic in isolation. When a bug is filed against the filter panel, you're debugging a 646-line file. When the kanban drag logic needs changing, the list view formatter is in your way.

**Fix — split it into:**
```
modules/crm/pages/LeadsPage.tsx          ← orchestrator only (~80 lines)
modules/crm/components/LeadsFilters.tsx  ← filter panel + state
modules/crm/components/LeadsKanban.tsx   ← kanban view + drag logic
modules/crm/components/LeadsList.tsx     ← list view + formatter
modules/crm/hooks/useLeadsFilters.ts     ← all filter state + derivations
modules/crm/hooks/useLeadsStats.ts       ← KPI computation
```

### Problem 2: Inline JSX assigned to variables in render

In `src/modules/crm/pages/LeadsPage.tsx` (lines ~280–380), `searchBar`, `filterPanel`, and `headerActions` are built as JSX variables inside the render function. This is an anti-pattern — they re-execute on every render, can't be tested independently, and are invisible to React DevTools as named components.

```tsx
// BAD — current code
const filterPanel = (
  <aside className="h-fit w-64 ...">
    ...100 lines of JSX...
  </aside>
)

// GOOD
function LeadsFilterPanel({ ... }: LeadsFilterPanelProps) {
  return <aside ...>...</aside>
}
```

### Problem 3: `renderLeadCard` is a function, not a component

```tsx
// Current — function inside component
const renderLeadCard = (lead: Lead) => (
  <div className="cpt-kcard cursor-pointer" onClick={...}>
    ...
  </div>
)
```

This is passed as a prop to `KanbanBoard`. It re-creates on every render of `LeadsPage`, which means every card re-renders even when unchanged. It also has a click handler accessing `navigate` via closure. It should be:

```tsx
// Better
const LeadKanbanCard = memo(({ lead, onNavigate }: LeadKanbanCardProps) => (
  <div className="cpt-kcard cursor-pointer" onClick={() => onNavigate(lead.id)}>
    ...
  </div>
))
```

---

## 2. Reusability

### What's genuinely reusable
- `BusinessMetricsTable` — solid, used across all modules correctly
- `KanbanBoard<T>` — generic, properly typed, well-isolated
- `DataCard`, `StatsRow`, `StatusBadge`, `EmptyState` — clean, composable
- Page shells — excellent abstraction, proper prop delegation

### What's not reusable but should be

**Problem 4: `formatCurrency` re-defined in `LeadsPage`**

```tsx
// LeadsPage.tsx line ~45
const formatCurrency = (value: number) =>
  `₹${(value / 100000).toFixed(1)}L`
```

This exact pattern exists in `src/shared/lib/currency.ts` as `formatINRShort`. This is a local re-implementation that will drift from the canonical version. Delete it and use `formatINRShort` from the shared lib.

**Problem 5: `stageVariant` and `stageColors` maps are page-local**

```tsx
// LeadsPage.tsx — local constants
const stageVariant: Record<string, StatusBadgeVariant> = { ... }
const stageColors: Record<string, string> = { ... }
```

These map `Lead["stage"]` values to display config. Any other component that renders a lead stage (detail page, card, notification) will either duplicate these or import from `LeadsPage`, which is wrong. They belong in `modules/crm/types.ts` or a `modules/crm/constants.ts`.

**Problem 6: `priorityVariant` function defined twice**

It's defined inline in `LeadsPage` and likely duplicated in `DealsPage`. Should be in `modules/crm/types.ts` or a shared utility.

---

## 3. Code Quality

### Naming — mostly good, one issue

`L` as a component name in the router is too terse:

```tsx
// router.tsx
function L({ children }: { children: ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>
}
```

It saves typing but actively harms readability. `<L><PartsPage /></L>` tells a reader nothing. Rename to `<Lazy>` or `<Page>`.

### State mutation anti-pattern

**Problem 7: `useMemo` used as a side effect**

```tsx
// LeadsPage.tsx
const [kanbanItems, setKanbanItems] = useState(() =>
  groupLeadsByStage(leads.filter((l) => l.stage !== 'Rejected'))
)

// Re-group when filters change — THIS IS WRONG
useMemo(() => {
  setKanbanItems(groupLeadsByStage(filteredLeads))
}, [filteredLeads])
```

`useMemo` is for returning a value, not for running side effects. Using it to call `setState` causes a React warning in strict mode and can produce unexpected double-calls. This is `useEffect`'s job:

```tsx
useEffect(() => {
  setKanbanItems(groupLeadsByStage(filteredLeads))
}, [filteredLeads])
```

Even better: derive `kanbanItems` from `filteredLeads` directly without separate state (see Performance section).

### `isMyData` function defined inside render

```tsx
// LeadsPage.tsx
const isMyData = (owner: string) =>
  selectedUser === "__all__" || owner === selectedUser
```

This is a plain predicate that re-creates on every render. Move it inside `filteredLeads`'s `useMemo` or extract to a pure function outside the component.

### Stale closure in `handleMoveAcross`

```tsx
const handleMoveAcross = useCallback(
  (itemId: string, fromColumn: string, toColumn: string) => {
    const lead = (kanbanItemsRef.current[fromColumn] ?? []).find(...)
    ...
  },
  [] // empty deps — intentional, uses ref
)
```

The ref workaround is valid but fragile. The better pattern is to pass `kanbanItems` as a parameter via the drag end event rather than storing a ref. The comment "Use a ref so the callback always sees the latest kanbanItems without causing re-renders" is correct but this pattern is a code smell that signals the state design needs rethinking.

---

## 4. State Management

### Problem 8: Dual state for kanban items — filtered and unfiltered are both tracked

```tsx
const [kanbanItems, setKanbanItems] = useState(...)   // unfiltered
const filteredKanbanItems = useMemo(...)               // filtered for display
```

Then `kanbanItems` is re-set via `useMemo` (the side-effect anti-pattern above) whenever `filteredLeads` changes. You now have:
- `leads` (raw mock data)
- `filteredLeads` (filtered by UI state)
- `kanbanItems` (grouped, unfiltered, also used for drag state)
- `filteredKanbanItems` (grouped and filtered, for display)

That's 4 derived views of the same data. The drag state (`kanbanItems`) is mixing UI operation state with display filtering. The simpler model:

```tsx
// Single source of truth for drag state
const [dragOrder, setDragOrder] = useState<Record<string, string[]>>({})

// Derive display items from filteredLeads + dragOrder
const displayItems = useMemo(() => {
  const grouped = groupLeadsByStage(filteredLeads)
  // apply drag reordering on top
  ...
}, [filteredLeads, dragOrder])
```

### Problem 9: `usePersistedState` with empty key falls back to `useState`

```tsx
// BusinessMetricsTable.tsx
const pk = persistKey ? `bmt:${persistKey}` : ""
const [activeTab, setActiveTab] = usePersistedState<string>(pk ? `${pk}:tab` : "", tabs[0]?.id ?? "")
```

When `persistKey` is not provided, the key is `""`. `usePersistedState` likely uses `""` as the actual sessionStorage key. If it does `sessionStorage.setItem("", value)`, all non-keyed tables share state. This is a silent data corruption bug.

The hook itself should guard against empty keys:
```tsx
// inside use-persisted-state.ts
if (!key) return useState(initialValue) // fall back to plain state
```

### Auth state is in `localStorage` with no expiry mechanism

`src/shared/auth/AuthContext.tsx` stores token in `localStorage` and loads it on init. There's no token expiry check, no refresh token flow, and no 401 → logout handler. If the token expires mid-session, every API call silently fails with a 401, but the user stays "logged in" from the frontend's perspective.

**Minimum fix:**
```tsx
// In shared/api/client.ts — add a 401 interceptor
if (response.status === 401) {
  window.dispatchEvent(new Event('auth:unauthorized'))
}

// In shared/auth/AuthContext.tsx — listen and logout
useEffect(() => {
  const handler = () => logout()
  window.addEventListener('auth:unauthorized', handler)
  return () => window.removeEventListener('auth:unauthorized', handler)
}, [logout])
```

---

## 5. Separation of Concerns

### What's done correctly
IMS module cleanly separates: `api.ts` (network), `hooks/` (TanStack Query), `schemas.ts` (validation), `types.ts` (domain), `pages/` (UI). This is textbook.

### What's not

**Problem 10: Business logic in `LeadsPage` render scope**

```tsx
// LeadsPage.tsx — these belong in hooks
const summaryStats = useMemo(() => {
  const activeLeads = filteredLeads.filter(...)
  const totalValue = filteredLeads.reduce(...)
  const wonLeads = ...
  const convRate = ...
  return { total, active, totalValue, wonValue, convRate }
}, [filteredLeads])
```

This is pure business logic (pipeline stats calculation) sitting in a page component. It should be:

```tsx
// modules/crm/hooks/useLeadsStats.ts
export function useLeadsStats(leads: Lead[]) {
  return useMemo(() => computeLeadsStats(leads), [leads])
}

// modules/crm/utils/leads-stats.ts
export function computeLeadsStats(leads: Lead[]) { ... }
```

Now it's testable in isolation. A bug in win-rate calculation doesn't require loading the full page to debug.

**Problem 11: `IS_SUPERADMIN` and `CURRENT_USER` are module-level constants, not derived from auth**

```tsx
// modules/crm/utils/dashboard-filters.ts
export const CURRENT_USER = "..."
export const IS_SUPERADMIN = true
```

These are hardcoded mock values that the real auth context should provide. Any page that uses these will show wrong data when running against the real backend. They need to be replaced with `useAuth().hasRole('SUPERADMIN')` and `useAuth().user?.name`.

---

## 6. Scalability

### What will hold up
- Module isolation with `index.ts` boundaries — excellent, will scale to 50+ modules
- TanStack Query pattern in IMS — scales naturally, cache invalidation is centralized per module
- Page shell pattern — zero friction to add new pages
- Lazy loading all routes — correct, won't cause bundle bloat

### What will break first

**Problem 12: `BusinessMetricsTable` loads ALL data client-side**

```tsx
data: (parts ?? []).map((p) => ({ ... }))
```

The entire dataset is passed in as a `data` array. Filtering, sorting, and pagination all happen in the browser. This works for 200 rows. At 2,000+ parts, you'll have:
- A 2MB+ API response on every page load
- A multi-second `useMemo` on filter change
- Laggy table scroll

The `BusinessMetricsTable` API has no `totalCount`, no `onPageChange`, no `onSortChange`. When you need server-side features you'll have to rewrite both the component and every call site.

**Recommendation — add an optional server-side mode now:**
```tsx
interface ServerSideConfig {
  totalCount: number
  onPageChange: (page: number) => void
  onSortChange: (col: string, dir: SortDirection) => void
  onFilterChange: (filters: Record<string, string>) => void
}

interface BusinessMetricsTableProps {
  // existing...
  serverSide?: ServerSideConfig  // when provided, disables client-side processing
}
```

**Problem 13: `router.tsx` has 160+ lazy imports at the top level**

React's `lazy()` is called at module evaluation time, not at render time. All 160 `lazy()` calls run when `router.tsx` is first imported. As the app grows, `router.tsx` becomes a 600-line file that everyone touches and creates merge conflicts. Consider splitting it:

```
app/routes/crm-routes.tsx
app/routes/wms-routes.tsx
app/routes/ims-routes.tsx
app/router.tsx  ← imports and composes route files
```

---

## 7. Performance

### Problem 14: Missing `memo` on `renderCard` prop in `KanbanBoard`

Every time `LeadsPage` re-renders (on filter change, search change, or any state update), `renderLeadCard` is a new function reference. `KanbanBoard` receives a new `renderCard` prop, which causes every `SortableCard` to re-render — even cards that didn't change.

```tsx
// Fix: memoize the render function + memo the card component
const renderLeadCard = useCallback((lead: Lead) => (
  <LeadKanbanCard lead={lead} onNavigate={navigate} />
), [navigate])

const LeadKanbanCard = memo(({ lead, onNavigate }: LeadKanbanCardProps) => (
  <div className="cpt-kcard cursor-pointer" onClick={() => onNavigate(lead.id)}>
    ...
  </div>
))
```

Combined, this makes the kanban O(changed cards) instead of O(all cards) on filter changes.

### Problem 15: `processedData` in `BusinessMetricsTable` recomputes on stale `tabs` reference

```tsx
const processedData = React.useMemo(() => {
  // filter → sort → paginate
}, [activeTabConfig, sortColumn, sortDirection, searchQuery, columnFilters])
```

The dependency on `activeTabConfig` (derived from `tabs` prop) means this recomputes whenever the `tabs` prop reference changes — even if the data is identical. Pages that forget to `useMemo` their `tabs` will cause double processing on every render.

### Problem 16: `filterOptions` iterates entire dataset on every tab switch

```tsx
const filterOptions = React.useMemo(() => {
  for (const col of activeTabConfig.columns) {
    if (col.filterable) {
      const values = new Set<string>()
      for (const row of activeTabConfig.data) { // O(columns × rows)
        values.add(String(row[col.key]))
      }
    }
  }
}, [activeTabConfig])
```

At 5,000 rows and 10 filterable columns: 50,000 iterations on every tab change. At current scale this is invisible. At production scale, compute filter options server-side or at data load time.

### Problem 17: No `ErrorBoundary` anywhere

If any lazy-loaded page throws during render, React unmounts the entire component tree and shows a blank white screen. There is no `<ErrorBoundary>` wrapping the router or page shells.

```tsx
// Minimum viable fix in router.tsx
function L({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary fallback={<PageError />}>
      <Suspense fallback={<PageLoader />}>{children}</Suspense>
    </ErrorBoundary>
  )
}
```

---

## 8. Priority Fix List

| # | Issue | File | Severity | Effort |
|---|-------|------|----------|--------|
| 1 | No 401 → logout handler; expired token leaves user in broken session | `shared/api/client.ts` + `shared/auth/AuthContext.tsx` | **Critical** | Small |
| 2 | `useMemo` used as side effect to call `setState` | `modules/crm/pages/LeadsPage.tsx` | **High** | Small |
| 3 | No `ErrorBoundary` — blank screen on any page crash | `app/router.tsx` | **High** | Small |
| 4 | `formatCurrency` re-defined locally, bypasses shared lib | `modules/crm/pages/LeadsPage.tsx` | Medium | Small |
| 5 | `stageVariant` / `stageColors` / `priorityVariant` are page-local and will be duplicated | `modules/crm/pages/LeadsPage.tsx` | Medium | Small |
| 6 | `IS_SUPERADMIN` / `CURRENT_USER` hardcoded mocks leak into filter logic | `modules/crm/utils/dashboard-filters.ts` | Medium | Medium |
| 7 | `renderLeadCard` missing `useCallback` + `memo` — causes full kanban re-render | `modules/crm/pages/LeadsPage.tsx` | Medium | Small |
| 8 | `LeadsPage` 646 lines — god component mixing UI, state, and business logic | `modules/crm/pages/LeadsPage.tsx` | Medium | Medium |
| 9 | `usePersistedState("")` empty key may corrupt shared sessionStorage | `components/common/BusinessMetricsTable.tsx` | Medium | Small |
| 10 | `router.tsx` 160+ routes — will cause merge conflicts as team grows | `app/router.tsx` | Low | Medium |
| 11 | `BusinessMetricsTable` has no server-side pagination mode — will hit wall at 2k+ rows | `components/common/BusinessMetricsTable.tsx` | Low now, **Critical later** | Large |

---

## Final Verdict

The foundation is genuinely strong. The IMS module is production-quality. The shared infrastructure (API client, auth, page shells, TanStack Query hooks) is correct and consistent. The main issues are: a 646-line page component doing too much, a few state management anti-patterns concentrated in that same file, missing error boundaries, and the looming `BusinessMetricsTable` scalability wall that hasn't been hit yet but will be.

Fix Critical and High issues before shipping. Plan the scalability items for the next milestone.
