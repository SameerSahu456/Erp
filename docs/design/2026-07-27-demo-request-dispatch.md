# Demo Request Dispatch — Full Loop (Frontend)

**Date:** 2026-07-27
**Scope:** Frontend only. Wire the demo-request dispatch loop — create a dispatch
from a demo request, and surface Material Issues + Dispatch Requests on the demo
detail page.

## Background

The backend already supports demo-request dispatch end to end, polymorphic with
sales orders:

- Material Issue accepts `demo_issue` → `demo_requests`
  (`material_issue_source_resolver`).
- `GET /dispatch-ready-units`, `GET /outward/sources`, `POST /dispatch-requests`,
  and `GET /dispatch-requests` all accept `source_entity_type = "demo_requests"`.
- `DemoRequestDispatchHookService` flips the demo `Approved → Dispatched` and
  appends serials at final dispatch (idempotent, multi-trip safe), with a
  `mark_recalled` reverse hook.

The gap is entirely in the frontend:

1. **Create step is not wired for demo** — `DispatchCreateBody` marks
   `demo_requests` as `wired: false` and hardcodes the source picker to
   sales-orders (`useSalesOrderOptions`, `toLabel = order_number`).
2. **Demo detail has no dispatch/MI history** — unlike the SO detail (which has
   `SoMaterialIssuesTab` + `SoDispatchRequestsTab` inside `DetailTabs`), the
   demo detail is a flat card layout with a lifecycle stepper but no view of the
   actual dispatches or material issues.

**No backend changes. No new tests** (frontend has no test suite per project
convention — verify via typecheck + lint + runtime).

## Decisions (from brainstorming)

- **(C)** Implement the full loop: create the dispatch *and* show it on the demo
  detail.
- Demo detail is converted to a **tabbed** layout to accommodate multiple
  dispatches over a demo's life.
- Tab set: **Overview · Material Issues · Dispatch Requests**.
- Create-flow entry point: **WMS-only**, mirroring SO exactly (staff go to
  `/wms/dispatches/new`). No "Create Dispatch" button on the demo detail.
- The shared accordion presentational components are **promoted to
  `crm/components/shared/`** (DRY), rather than duplicated under demo-requests.

## Part 1 — Create flow (WMS dispatch-create page)

**File:** `src/modules/wms/components/dispatches/DispatchCreateBody.tsx`

- In the `SOURCE_TYPES` array, flip `demo_requests` to `wired: true`.
- Make the source `<AsyncSelect>` source-type-aware. Today it hardcodes:
  ```tsx
  useOptions={useSalesOrderOptions}
  toLabel={(so) => so.order_number}
  ```
  Switch both on `sourceTypeKey`:
  - `sales_orders` → `useSalesOrderOptions`, `toLabel = order_number` (unchanged).
  - `demo_requests` → `useDemoRequestOptions`, `toLabel = demo_number`.

  `AsyncSelect` is generic over its option type; the branch selects the correct
  `useOptions` + `toLabel` pair. Because `<AsyncSelect>` keys its internal query
  on the hook identity, remount or reset selection when `sourceTypeKey` changes
  (the existing `setSource(null)` on source-type change already covers this).

**New hook:** `src/modules/wms/hooks/dispatches/useDemoRequestOptions.ts`

One-liner mirroring `useSalesOrderOptions`, wrapping `useDemoRequestsInfinite`
(already consumed by `MaterialIssueSourcePicker`):

```ts
import { useDemoRequestsInfinite } from "@modules/crm"

export function useDemoRequestOptions(search: string) {
  return useDemoRequestsInfinite({ q: search || undefined })
}
```

Everything downstream is already polymorphic and needs no change:
`useDispatchReadyUnits(entity, sourceId)`, `createDispatchRequest`,
`pickFromMaterialIssue`, and the redirect to `/wms/dispatches/:id`.

**Result:** staff pick "Demo Request" → select a demo → its MI-issued
dispatch-ready units load → create a draft dispatch. Same UX as SO. Courier info
and document upload continue to happen on the dispatch detail page after
creation (source-agnostic, unchanged).

## Part 2 — Read flow (Demo detail → tabs)

**File:** `src/modules/crm/pages/demo-requests/DemoRequestDetailPage.tsx`

Wrap the page body in `DetailTabs` (mirroring `SalesOrderDetailPage`):

- **Overview** — everything on the page today: `DemoStatusBanners`,
  `DemoLifecycleStepper`, `DemoInfoCards`, `DemoDetailItemsCard`,
  `DemoSourceNotesCards`, `TimestampFooter`. No content change; it just moves
  inside the first tab. `EntityHeader` stays above the tabs.
- **Material Issues** — `DemoMaterialIssuesTab`, reading
  `useMaterialIssues({ source_entity_type: "demo_requests", source_entity_id })`.
- **Dispatch Requests** — `DemoDispatchRequestsTab`, reading
  `useDispatchRequestsList({ source_entity_type: "demo_requests", source_entity_id })`.

`defaultTab` = Overview.

### `lineById` map

Both accordion tabs label each unit by its source line via a
`lineById: Map<string, DetailLineBrief>`. Build it in the detail page (or its
container hook) from the **raw wire** items, keyed by `demo_request_item.id`:

```ts
const lineById = useMemo(() => {
  const map = new Map<string, DetailLineBrief>()
  for (const item of demoQuery.data?.items ?? []) {
    const label = variantLabels[item.variant_id]
    map.set(item.id, { name: label?.name ?? "Catalog item", description: label?.sku ?? null })
  }
  return map
}, [demoQuery.data?.items, variantLabels])
```

Use **raw wire items** (`demoQuery.data.items`), not the collapsed display items
from `mapWireDemo` — the display mapping merges lines and keeps only the first
id, which would leave some `source_id` values unresolved.

`variantLabels` (a `Record<variantId, VariantLabel>`) is already computed inside
`useDemoRequestDetail`. It will be surfaced from the hook (or the map built
inside the hook and returned) so the page can construct `lineById`.

## Part 3 — Share the accordion components (DRY)

`SoDocAccordion`, `SoDocList`, and `SoSourceLineLabel` currently live under
`crm/components/sales-orders/detail/tabs/` and reference `SALES_ORDERS_STRINGS`.
A second sub-feature (demo-requests) now consumes them, so per the CRM module
layout rule they move to a shared location:

**New folder:** `src/modules/crm/components/shared/detail-docs/`
- `DocAccordion.tsx` (was `SoDocAccordion`)
- `DocList.tsx` (was `SoDocList`, exporting `DocRow`)
- `SourceLineLabel.tsx` (was `SoSourceLineLabel`, exporting `DetailLineBrief`,
  renamed from `SoLineBrief`)

The handful of generic strings these components use (lines-loading, no-lines,
unknown-part, empty text) are passed in as props or read from a neutral shared
strings constant in the same folder — they must not depend on
`SALES_ORDERS_STRINGS`.

**Consumers updated:**
- SO tabs (`SoMaterialIssuesTab`, `SoDispatchRequestsTab`, and anything else
  importing the three components) switch to the shared imports and the
  `DetailLineBrief` type. Behaviour unchanged.
- New demo tabs (`DemoMaterialIssuesTab`, `DemoDispatchRequestsTab`) are thin
  copies of the SO tabs pointing at `demo_requests`, consuming the shared
  components and `DEMO_REQUESTS_STRINGS` for demo-specific copy.

## Files touched (summary)

**WMS (create):**
- `components/dispatches/DispatchCreateBody.tsx` — source-type-aware picker,
  `demo_requests` wired.
- `hooks/dispatches/useDemoRequestOptions.ts` — new.

**CRM (read):**
- `pages/demo-requests/DemoRequestDetailPage.tsx` — tabbed layout.
- `hooks/demo-requests/useDemoRequestDetail.ts` — expose `variantLabels` /
  `lineById`.
- `components/demo-requests/DemoMaterialIssuesTab.tsx` — new.
- `components/demo-requests/DemoDispatchRequestsTab.tsx` — new.
- `components/demo-requests/demo-requests.strings.ts` — add tab labels +
  doc-tab copy.

**CRM (shared, DRY move):**
- `components/shared/detail-docs/{DocAccordion,DocList,SourceLineLabel}.tsx` —
  moved from `sales-orders/detail/tabs/`, strings decoupled.
- `components/sales-orders/detail/tabs/{SoMaterialIssuesTab,SoDispatchRequestsTab}.tsx`
  — update imports to shared components + `DetailLineBrief`.

## Out of scope

- No "Create Dispatch" button on the demo detail (WMS-only entry decided).
- No changes to the demo lifecycle stepper, status mapping, or MI creation flow
  (already wired via `MaterialIssueSourcePicker`).
- No backend changes.
- No automated tests (per frontend convention); verify with
  `pnpm typecheck && pnpm lint` + runtime walkthrough of create + both tabs.
