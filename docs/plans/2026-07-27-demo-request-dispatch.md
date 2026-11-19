# Demo Request Dispatch — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the frontend demo-request dispatch loop — create a dispatch from a demo request (WMS create page) and surface Material Issues + Dispatch Requests on the demo detail page via tabs.

**Architecture:** Frontend-only. The backend is already polymorphic (`demo_requests` accepted by the MI resolver, ready-units, `POST /dispatch-requests`, and dispatch/recall hooks). Part 1 makes the WMS dispatch-create source picker source-type-aware and flips `demo_requests` to wired. Part 2 converts the demo detail to `DetailTabs` and adds read-only Material Issues + Dispatch Requests tabs. Part 3 promotes the three shared accordion presentational components out of the sales-orders sub-feature into `crm/components/shared/detail-docs/` so both SO and demo consume one copy.

**Tech Stack:** React 19, TypeScript strict, TanStack Query v5, React Router 7, Tailwind v4, shadcn/Base UI. No frontend tests (project convention) — verify via `pnpm typecheck && pnpm lint` + runtime walkthrough.

## Global Constraints

- No backend changes; no `schema.gen.ts` regeneration.
- No automated tests for frontend (per `comprint-erp-frontend/CLAUDE.md`). Verification gate per task: `pnpm typecheck && pnpm lint` must pass, plus the stated runtime check.
- Cross-module imports only via module index barrels (`@modules/wms`, `@modules/crm`). Same-module imports use relative paths.
- No naked user-facing strings — route copy through `*.strings.ts` (§16.12).
- All display text through `<Typography>`; no hardcoded colours; all dates via `formatIST_date` (§8.4, §8.5).
- Do not pass per-hook TanStack Query config (staleTime/retry/etc.) — global only (§6.5.1).
- Dev server runs at `http://localhost:5173`; `pnpm api:gen` targets backend port `:8002` in this workspace (not `:8000`) — but no api:gen is needed here.

---

### Task 1: Wire demo into the WMS dispatch-create source picker

**Files:**
- Create: `src/modules/wms/hooks/dispatches/useDemoRequestOptions.ts`
- Modify: `src/modules/wms/components/dispatches/DispatchCreateBody.tsx`

**Interfaces:**
- Consumes: `useDemoRequestsInfinite` from `@modules/crm` (params `{ q?: string }`; already exported and used by `MaterialIssueSourcePicker`). `DispatchRequestCreate` type from `../../api/dispatch`.
- Produces: `useDemoRequestOptions(search: string)` — an infinite-query feed matching the `AsyncSelect` `useOptions` contract, returning demo rows whose `demo_number` is the label.

- [ ] **Step 1: Create the demo options hook**

Mirror the existing `useSalesOrderOptions.ts` exactly:

```ts
// src/modules/wms/hooks/dispatches/useDemoRequestOptions.ts
import { useDemoRequestsInfinite } from "@modules/crm"

/** AsyncSelect-compatible option feed for the Demo-Request picker on the
 *  dispatch create form. Mirrors `useSalesOrderOptions` — returns the raw
 *  infinite-query shape (`{ data: { pages: [{ items }] }, ... }`). */
export function useDemoRequestOptions(search: string) {
  return useDemoRequestsInfinite({ q: search || undefined })
}
```

- [ ] **Step 2: Flip demo to `wired: true` in `DispatchCreateBody`**

In `src/modules/wms/components/dispatches/DispatchCreateBody.tsx`, the `SOURCE_TYPES` entry (currently line ~47):

```tsx
{ key: "demo_requests", label: "Demo Request", entity: "demo_requests", dispatchType: "demo_dispatch", wired: true },
```

- [ ] **Step 3: Make the source `<AsyncSelect>` source-type-aware**

Add the import at the top with the other hook imports:

```tsx
import { useDemoRequestOptions } from "../../hooks/dispatches/useDemoRequestOptions";
```

Replace the hardcoded source `<AsyncSelect>` block (the one with `useOptions={useSalesOrderOptions}`) with a branch on `sourceTypeKey`. Keep the sales-order branch identical; add the demo branch:

```tsx
{sourceTypeKey === "demo_requests" ? (
  <AsyncSelect
    value={source}
    onValueChange={(next) => {
      setSource(next);
      setSelected(new Set());
    }}
    useOptions={useDemoRequestOptions}
    toLabel={(dr: { demo_number: string }) => dr.demo_number}
    placeholder={S.pickSourcePlaceholder}
    searchable
    searchPlaceholder={S.pickSourcePlaceholder}
  />
) : (
  <AsyncSelect
    value={source}
    onValueChange={(next) => {
      setSource(next);
      setSelected(new Set());
    }}
    useOptions={useSalesOrderOptions}
    toLabel={(so: { order_number: string }) => so.order_number}
    placeholder={S.pickSourcePlaceholder}
    searchable
    searchPlaceholder={S.pickSourcePlaceholder}
  />
)}
```

The two `<AsyncSelect>` elements sit inside the same `<label>` wrapper that already exists. `AsyncSelect` re-keys its internal query on the `useOptions` identity, and the existing `setSource(null)` in the source-type `<Select>`'s `onValueChange` already clears the stale selection when the type flips — no extra reset needed.

- [ ] **Step 4: Verify typecheck + lint**

Run: `pnpm typecheck && pnpm lint`
Expected: PASS. If `AsyncSelect`'s generic can't infer from the inline `toLabel` param type, add the explicit type argument (`<AsyncSelect<{ demo_number: string }>>`), matching how `MaterialIssueSourcePicker` annotates it.

- [ ] **Step 5: Runtime check**

With backend + `pnpm dev` running, go to `/wms/dispatches/new`:
1. Source Type dropdown now enables "Demo Request".
2. Select it → the source picker searches demos by `demo_number`.
3. Pick a demo that has a Material Issue with dispatch-ready units → the ready-units table populates.
4. Select unit(s) → **Create** → redirects to `/wms/dispatches/:id` and a toast confirms.

(If no demo has ready units yet, create a `demo_issue` Material Issue for an approved demo first via `/wms/material-issue/new`.)

- [ ] **Step 6: Commit**

```bash
git add src/modules/wms/hooks/dispatches/useDemoRequestOptions.ts \
        src/modules/wms/components/dispatches/DispatchCreateBody.tsx
git commit -m "feat(wms): wire demo requests into dispatch-create source picker"
```

---

### Task 2: Promote shared detail-doc components out of sales-orders

Move the three source-agnostic presentational components into a shared CRM folder and decouple them from `SALES_ORDERS_STRINGS`, so the demo tabs (Task 4) can reuse them.

**Files:**
- Create: `src/modules/crm/components/shared/detail-docs/detail-docs.strings.ts`
- Create: `src/modules/crm/components/shared/detail-docs/DocList.tsx` (from `SoDocList`)
- Create: `src/modules/crm/components/shared/detail-docs/DocAccordion.tsx` (from `SoDocAccordion`)
- Create: `src/modules/crm/components/shared/detail-docs/SourceLineLabel.tsx` (from `SoSourceLineLabel`)
- Delete: `src/modules/crm/components/sales-orders/detail/tabs/SoDocList.tsx`
- Delete: `src/modules/crm/components/sales-orders/detail/tabs/SoDocAccordion.tsx`
- Delete: `src/modules/crm/components/sales-orders/detail/tabs/SoSourceLineLabel.tsx`
- Modify: `src/modules/crm/components/sales-orders/detail/tabs/SoMaterialIssuesTab.tsx`
- Modify: `src/modules/crm/components/sales-orders/detail/tabs/SoDispatchRequestsTab.tsx`
- Modify: `src/modules/crm/pages/sales-orders/SalesOrderDetailPage.tsx` (only if it imports `SoLineBrief` — see step 5)

**Interfaces:**
- Produces:
  - `DETAIL_DOCS_STRINGS` — `{ loadError, view, linesLoading, noLines, serialPrefix, unknownPart }` (the generic copy the shared components use; tab-level empty text stays per-sub-feature and is passed as `emptyText`).
  - `interface DocRow { id: string; number: string; status: string; statusVariant: StatusBadgeVariant; meta: string; href: string }`
  - `interface DetailLineBrief { name: string; description: string | null }`
  - `DocList`, `DocAccordion`, `SourceLineLabel` components (same props as the `So*` originals).

- [ ] **Step 1: Create the neutral strings file**

```ts
// src/modules/crm/components/shared/detail-docs/detail-docs.strings.ts
// Generic copy for the shared detail-doc list/accordion components, reused by
// the SO and Demo Request detail tabs. Tab-level empty text (e.g. "No dispatches
// for this order yet.") stays in each sub-feature's strings and is passed in as
// the `emptyText` prop.
export const DETAIL_DOCS_STRINGS = {
  loadError: "Couldn't load this list.",
  view: "View",
  linesLoading: "Loading items…",
  noLines: "No line items.",
  serialPrefix: "S/N",
  unknownPart: "Item",
} as const
```

- [ ] **Step 2: Create `SourceLineLabel.tsx`**

Copy `SoSourceLineLabel.tsx` verbatim, then: rename the exported interface `SoLineBrief` → `DetailLineBrief`, rename the component `SoSourceLineLabel` → `SourceLineLabel`, and replace the `SALES_ORDERS_STRINGS` import + `S.detail.docTabs.unknownPart` usage with `DETAIL_DOCS_STRINGS.unknownPart`.

```tsx
// src/modules/crm/components/shared/detail-docs/SourceLineLabel.tsx
import { Typography } from "@/components/ui/typography"
import { stripHtml } from "@/lib/utils"

import { DETAIL_DOCS_STRINGS as S } from "./detail-docs.strings"

/** The ordered source line a unit was issued/dispatched against: name + description. */
export interface DetailLineBrief {
  name: string
  description: string | null
}

// Renders which source line (name + a stripped, truncated description) an
// issued/dispatched unit belongs to. Shared by the Material Issues and Dispatch
// Requests accordions (SO + Demo) so both label the source line the same way.
export function SourceLineLabel({ line }: { line: DetailLineBrief | undefined }) {
  const description = line?.description ? stripHtml(line.description) : ""
  return (
    <div className="min-w-0">
      <Typography variant="helper" truncate className="min-w-0 text-foreground">
        {line?.name ?? S.unknownPart}
      </Typography>
      {description ? (
        <Typography variant="caption" tone="muted" truncate className="min-w-0">
          {description}
        </Typography>
      ) : null}
    </div>
  )
}
```

- [ ] **Step 3: Create `DocList.tsx`**

Copy `SoDocList.tsx` verbatim; rename `SoDocList` → `DocList`; replace the `SALES_ORDERS_STRINGS` import with `DETAIL_DOCS_STRINGS`, and both `S.detail.docTabs.loadError` / `S.detail.docTabs.view` with `S.loadError` / `S.view`. Keep the exported `DocRow` interface. (Full body is identical to the current `SoDocList.tsx` apart from those three substitutions.)

- [ ] **Step 4: Create `DocAccordion.tsx`**

Copy `SoDocAccordion.tsx` verbatim; rename `SoDocAccordion` → `DocAccordion`; change `import type { DocRow } from "./SoDocList"` → `import type { DocRow } from "./DocList"`; replace `SALES_ORDERS_STRINGS` with `DETAIL_DOCS_STRINGS` and `S.detail.docTabs.loadError` / `S.detail.docTabs.view` → `S.loadError` / `S.view`.

- [ ] **Step 5: Point the SO tabs at the shared components**

In `SoMaterialIssuesTab.tsx` and `SoDispatchRequestsTab.tsx` (same-module — use **relative** paths, never `@modules/crm/...`):
- Replace `import { SoDocAccordion } from "./SoDocAccordion"` → `import { DocAccordion } from "../../shared/detail-docs/DocAccordion"`.
- Replace `import type { DocRow } from "./SoDocList"` → `import type { DocRow } from "../../shared/detail-docs/DocList"`.
- Replace `import { SoSourceLineLabel, type SoLineBrief } from "./SoSourceLineLabel"` → `import { SourceLineLabel, type DetailLineBrief } from "../../shared/detail-docs/SourceLineLabel"`.
- Rename in-file usages: `<SoDocAccordion>` → `<DocAccordion>`, `<SoSourceLineLabel>` → `<SourceLineLabel>`, and the `lineById: Map<string, SoLineBrief>` prop types → `Map<string, DetailLineBrief>`.

Then grep for any other importers of the three old files and update them the same way (relative path to `../../shared/detail-docs/...`, `SoLineBrief` → `DetailLineBrief`):

Run: `grep -rn "SoDocAccordion\|SoDocList\|SoSourceLineLabel\|SoLineBrief" src`
Update every hit (notably `SalesOrderDetailPage.tsx`, which imports `SoLineBrief`, and possibly `SoReplacementRequestsTab.tsx`).

- [ ] **Step 6: Delete the three old files**

```bash
git rm src/modules/crm/components/sales-orders/detail/tabs/SoDocList.tsx \
       src/modules/crm/components/sales-orders/detail/tabs/SoDocAccordion.tsx \
       src/modules/crm/components/sales-orders/detail/tabs/SoSourceLineLabel.tsx
```

- [ ] **Step 7: Verify typecheck + lint**

Run: `pnpm typecheck && pnpm lint`
Expected: PASS. A failure here almost always means a missed importer from step 5 — re-run the grep.

- [ ] **Step 8: Runtime check (SO unchanged)**

On `/crm/sales-orders/:id` open an SO with material issues + dispatches → the Material Issues and Dispatch Requests tabs render exactly as before (rows expand to line items, View links work).

- [ ] **Step 9: Commit**

```bash
git add src/modules/crm/components/shared/detail-docs \
        src/modules/crm/components/sales-orders/detail/tabs \
        src/modules/crm/pages/sales-orders/SalesOrderDetailPage.tsx
git commit -m "refactor(crm): promote detail-doc components to shared/detail-docs"
```

---

### Task 3: Expose a `lineById` map from `useDemoRequestDetail`

The demo tabs label each unit by its source line. Build the map from the **raw wire** demo items (keyed by `demo_request_item.id`), not the collapsed display items — `mapWireDemo` merges lines and keeps only the first id, which would leave some `source_id`s unresolved.

**Files:**
- Modify: `src/modules/crm/hooks/demo-requests/useDemoRequestDetail.ts`

**Interfaces:**
- Consumes: `demoQuery.data.items` (raw wire, each `{ id: string; variant_id: string; ... }`), `variantLabels` (`Record<variantId, VariantLabel | undefined>`) — both already computed in this hook. `DetailLineBrief` type from Task 2.
- Produces: `lineById: Map<string, DetailLineBrief>` added to the hook's return object.

- [ ] **Step 1: Import the shared type**

Add to the imports:

```ts
import type { DetailLineBrief } from "../../components/shared/detail-docs/SourceLineLabel"
```

- [ ] **Step 2: Derive the map (place after `variantLabels` is defined, ~line 73)**

```ts
// demo_request_item.id → source-line brief, so the Material Issues + Dispatch
// accordions can label which ordered line each issued/dispatched unit is for.
// Built from RAW wire items (not the collapsed display items) so every
// source_id resolves.
const lineById = useMemo(() => {
  const map = new Map<string, DetailLineBrief>()
  for (const item of demoQuery.data?.items ?? []) {
    const label = variantLabels[item.variant_id]
    map.set(item.id, { name: label?.name ?? "Catalog item", description: label?.sku ?? null })
  }
  return map
}, [demoQuery.data?.items, variantLabels])
```

- [ ] **Step 3: Add `lineById` to the return object**

In the `return { ... }` block (~line 179), add `lineById,` alongside `demo,`.

- [ ] **Step 4: Verify typecheck + lint**

Run: `pnpm typecheck && pnpm lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/modules/crm/hooks/demo-requests/useDemoRequestDetail.ts
git commit -m "feat(crm): expose lineById map from useDemoRequestDetail"
```

---

### Task 4: Build the demo Material Issues + Dispatch Requests tabs

**Files:**
- Modify: `src/modules/crm/components/demo-requests/demo-requests.strings.ts`
- Create: `src/modules/crm/components/demo-requests/DemoMaterialIssuesTab.tsx`
- Create: `src/modules/crm/components/demo-requests/DemoDispatchRequestsTab.tsx`

**Interfaces:**
- Consumes: from `@modules/wms` — `useMaterialIssues`, `useMaterialIssue`, `useDispatchRequestsList`, `useDispatchLineItems`; types `MaterialIssueListRow`, `MaterialIssueLineResponse`, `DispatchRequestListItem`, `DispatchLineItem`. From Task 2 — `DocAccordion`, `SourceLineLabel`, `DetailLineBrief`. From Task 3 — the `lineById` map (passed as a prop).
- Produces: `DemoMaterialIssuesTab({ demoId, lineById })` and `DemoDispatchRequestsTab({ demoId, lineById })`.

- [ ] **Step 1: Add tab + doc-tab strings**

In `demo-requests.strings.ts`, under the `detail` section add a `tabs` block and a `docTabs` block (mirroring the SO strings, worded for demos):

```ts
tabs: {
  overview: "Overview",
  materialIssues: "Material Issues",
  dispatchRequests: "Dispatch Requests",
},
docTabs: {
  noMaterialIssues: "No material issues for this demo yet.",
  noDispatchRequests: "No dispatches for this demo yet.",
  units: "units",
},
```

(The generic per-row copy — loading, no-lines, S/N, unknown-part — lives in `DETAIL_DOCS_STRINGS` from Task 2; only the tab-level empty text + "units" belong here.)

- [ ] **Step 2: Create `DemoMaterialIssuesTab.tsx`**

Mirror `SoMaterialIssuesTab.tsx`, swapping the source type to `demo_requests`, the strings source, and the shared-component imports:

```tsx
// src/modules/crm/components/demo-requests/DemoMaterialIssuesTab.tsx
import { useMaterialIssue, useMaterialIssues } from "@modules/wms"
import type { MaterialIssueListRow, MaterialIssueLineResponse } from "@modules/wms"

import type { StatusBadgeVariant } from "@/components/common/display/StatusBadge"
import { StatusBadge } from "@/components/common/display/StatusBadge"
import { Typography } from "@/components/ui/typography"
import { formatIST_date } from "@shared/lib/date"

import { DETAIL_DOCS_STRINGS as D } from "../shared/detail-docs/detail-docs.strings"
import { DocAccordion } from "../shared/detail-docs/DocAccordion"
import type { DocRow } from "../shared/detail-docs/DocList"
import { SourceLineLabel, type DetailLineBrief } from "../shared/detail-docs/SourceLineLabel"
import { DEMO_REQUESTS_STRINGS as S } from "./demo-requests.strings"

const MI_STATUS_VARIANT: Record<string, StatusBadgeVariant> = {
  issued: "success",
  draft: "warning",
  cancelled: "error",
}

const STAGE_VARIANT: Record<string, StatusBadgeVariant> = {
  ready_for_dispatch: "success",
  dispatched: "success",
  issued: "info",
  qc_failed: "error",
  returned: "warning",
  cancelled: "error",
  draft: "neutral",
}

function MiLines({ miId, lineById }: { miId: string; lineById: Map<string, DetailLineBrief> }) {
  const query = useMaterialIssue(miId)
  if (query.isLoading) {
    return <Typography variant="helper" tone="muted">{D.linesLoading}</Typography>
  }
  const lines = (query.data?.line_items ?? []).filter(
    (l: MaterialIssueLineResponse) => l.role === "primary",
  )
  if (lines.length === 0) {
    return <Typography variant="helper" tone="muted">{D.noLines}</Typography>
  }
  return (
    <ul className="space-y-2">
      {lines.map((line: MaterialIssueLineResponse) => (
        <li key={line.id} className="flex items-start justify-between gap-3">
          <SourceLineLabel line={lineById.get(line.source_line_id ?? "")} />
          <StatusBadge variant={STAGE_VARIANT[line.stage] ?? "neutral"}>{line.stage}</StatusBadge>
        </li>
      ))}
    </ul>
  )
}

// Read-only list of this demo's Material Issues, expandable to line-item detail.
export function DemoMaterialIssuesTab({
  demoId,
  lineById,
}: {
  demoId: string
  lineById: Map<string, DetailLineBrief>
}) {
  const query = useMaterialIssues({
    source_entity_type: "demo_requests",
    source_entity_id: demoId,
  })

  const rows: DocRow[] = (query.data?.items ?? []).map((mi: MaterialIssueListRow) => ({
    id: mi.id,
    number: mi.mi_number,
    status: mi.status,
    statusVariant: MI_STATUS_VARIANT[mi.status] ?? "neutral",
    meta: `${mi.line_count} ${S.detail.docTabs.units} · ${formatIST_date(mi.created_at)}`,
    href: `/wms/material-issue/${mi.id}`,
  }))

  return (
    <DocAccordion
      rows={rows}
      isLoading={query.isLoading}
      isError={query.isError}
      emptyText={S.detail.docTabs.noMaterialIssues}
      renderLines={(id) => <MiLines miId={id} lineById={lineById} />}
    />
  )
}
```

- [ ] **Step 3: Create `DemoDispatchRequestsTab.tsx`**

Mirror `SoDispatchRequestsTab.tsx` the same way (source type `demo_requests`, dispatch line-items filtered to top-level rows where `parent_dispatch_item_id == null`, `source_id` for the label lookup):

```tsx
// src/modules/crm/components/demo-requests/DemoDispatchRequestsTab.tsx
import { useDispatchLineItems, useDispatchRequestsList } from "@modules/wms"
import type { DispatchLineItem, DispatchRequestListItem } from "@modules/wms"

import type { StatusBadgeVariant } from "@/components/common/display/StatusBadge"
import { StatusBadge } from "@/components/common/display/StatusBadge"
import { Typography } from "@/components/ui/typography"
import { formatIST_date } from "@shared/lib/date"

import { DETAIL_DOCS_STRINGS as D } from "../shared/detail-docs/detail-docs.strings"
import { DocAccordion } from "../shared/detail-docs/DocAccordion"
import type { DocRow } from "../shared/detail-docs/DocList"
import { SourceLineLabel, type DetailLineBrief } from "../shared/detail-docs/SourceLineLabel"
import { DEMO_REQUESTS_STRINGS as S } from "./demo-requests.strings"

const DR_STATUS_VARIANT: Record<string, StatusBadgeVariant> = {
  dispatched: "success",
  delivered: "success",
  closed: "success",
  draft: "warning",
  cancelled: "error",
}

const DRI_STATUS_VARIANT: Record<string, StatusBadgeVariant> = {
  dispatched: "success",
  sold: "success",
  pending: "warning",
  returned: "warning",
  cancelled: "error",
}

function DispatchLines({ dispatchId, lineById }: { dispatchId: string; lineById: Map<string, DetailLineBrief> }) {
  const query = useDispatchLineItems(dispatchId)
  if (query.isLoading) {
    return <Typography variant="helper" tone="muted">{D.linesLoading}</Typography>
  }
  const lines = (query.data ?? []).filter(
    (l: DispatchLineItem) => l.parent_dispatch_item_id == null,
  )
  if (lines.length === 0) {
    return <Typography variant="helper" tone="muted">{D.noLines}</Typography>
  }
  return (
    <ul className="space-y-2">
      {lines.map((line: DispatchLineItem) => (
        <li key={line.id} className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <SourceLineLabel line={lineById.get(line.source_id ?? "")} />
            {line.serial_number ? (
              <Typography variant="caption" tone="muted">{D.serialPrefix} {line.serial_number}</Typography>
            ) : null}
          </div>
          <StatusBadge variant={DRI_STATUS_VARIANT[line.status] ?? "neutral"}>{line.status}</StatusBadge>
        </li>
      ))}
    </ul>
  )
}

// Read-only list of this demo's Dispatch Requests, expandable to line-item detail.
export function DemoDispatchRequestsTab({
  demoId,
  lineById,
}: {
  demoId: string
  lineById: Map<string, DetailLineBrief>
}) {
  const query = useDispatchRequestsList({
    source_entity_type: "demo_requests",
    source_entity_id: demoId,
  })

  const rows: DocRow[] = (query.data?.items ?? []).map((dr: DispatchRequestListItem) => ({
    id: dr.id,
    number: dr.dispatch_number,
    status: dr.status,
    statusVariant: DR_STATUS_VARIANT[dr.status] ?? "neutral",
    meta: formatIST_date(dr.dispatched_at ?? dr.created_at),
    href: `/wms/dispatches/${dr.id}`,
  }))

  return (
    <DocAccordion
      rows={rows}
      isLoading={query.isLoading}
      isError={query.isError}
      emptyText={S.detail.docTabs.noDispatchRequests}
      renderLines={(id) => <DispatchLines dispatchId={id} lineById={lineById} />}
    />
  )
}
```

- [ ] **Step 4: Verify typecheck + lint**

Run: `pnpm typecheck && pnpm lint`
Expected: PASS. Confirm `useDispatchRequestsList`, `useDispatchLineItems`, `useMaterialIssues`, `useMaterialIssue` and their types all resolve from `@modules/wms` (they are exported — see `src/modules/wms/index.ts`).

- [ ] **Step 5: Commit**

```bash
git add src/modules/crm/components/demo-requests/DemoMaterialIssuesTab.tsx \
        src/modules/crm/components/demo-requests/DemoDispatchRequestsTab.tsx \
        src/modules/crm/components/demo-requests/demo-requests.strings.ts
git commit -m "feat(crm): add demo Material Issues + Dispatch Requests tabs"
```

---

### Task 5: Convert the demo detail page to tabs

Wrap the existing demo detail body in `DetailTabs` (Overview / Material Issues / Dispatch Requests). `EntityHeader`, status banners, and lifecycle stepper stay above the tabs — the current cards move into the Overview tab.

**Files:**
- Modify: `src/modules/crm/pages/demo-requests/DemoRequestDetailPage.tsx`

**Interfaces:**
- Consumes: `DetailTabs` from `@/components/page-shells/DetailTabs`; `DemoMaterialIssuesTab`, `DemoDispatchRequestsTab` (Task 4); `detail.lineById` (Task 3); `DEMO_REQUESTS_STRINGS.detail.tabs` (Task 4).

- [ ] **Step 1: Add imports**

```tsx
import { DetailTabs } from "@/components/page-shells/DetailTabs"
import { DemoMaterialIssuesTab } from "../../components/demo-requests/DemoMaterialIssuesTab"
import { DemoDispatchRequestsTab } from "../../components/demo-requests/DemoDispatchRequestsTab"
```

- [ ] **Step 2: Build the tab set and render**

Decide placement: keep `EntityHeader`, `DemoStatusBanners`, and `DemoLifecycleStepper` above the tabs (they summarise the whole demo). Move `DemoInfoCards`, `DemoDetailItemsCard`, `DemoSourceNotesCards`, `TimestampFooter` into the **Overview** tab. Replace the current return body's lower half:

```tsx
const tabs = [
  {
    id: "overview",
    label: S.detail.tabs.overview,
    content: (
      <div className="space-y-6">
        <DemoInfoCards demo={demo} isOverdue={detail.isOverdue} />
        <DemoDetailItemsCard demo={demo} totalItems={detail.totalItems} approvedTotal={detail.approvedTotal} />
        <DemoSourceNotesCards demo={demo} />
        <TimestampFooter createdAt={demo.createdAt} />
      </div>
    ),
  },
  {
    id: "material-issues",
    label: S.detail.tabs.materialIssues,
    content: <DemoMaterialIssuesTab demoId={demo.id} lineById={detail.lineById} />,
  },
  {
    id: "dispatch-requests",
    label: S.detail.tabs.dispatchRequests,
    content: <DemoDispatchRequestsTab demoId={demo.id} lineById={detail.lineById} />,
  },
]
```

And in the JSX, after `<DemoLifecycleStepper … />`:

```tsx
<DetailTabs tabs={tabs} defaultTab="overview" />
```

Remove the now-inlined `<DemoInfoCards>`, `<DemoDetailItemsCard>`, `<DemoSourceNotesCards>`, `<TimestampFooter>` from their old flat positions (they now live inside the Overview tab content).

- [ ] **Step 3: Verify typecheck + lint**

Run: `pnpm typecheck && pnpm lint`
Expected: PASS.

- [ ] **Step 4: Runtime check (full loop)**

On `/crm/demo-requests/:id` for the demo dispatched in Task 1:
1. Three tabs render: Overview · Material Issues · Dispatch Requests; Overview is default and shows the same cards as before.
2. **Material Issues** tab lists the demo's MI(s); expanding a row shows primary lines labelled by part name + stage badge.
3. **Dispatch Requests** tab lists the dispatch created in Task 1; expanding shows units labelled by source line + serial + unit-status badge; **View** opens `/wms/dispatches/:id`.
4. Confirm the demo header status reflects `Dispatched` (flipped by the backend hook at final dispatch).

- [ ] **Step 5: Commit**

```bash
git add src/modules/crm/pages/demo-requests/DemoRequestDetailPage.tsx
git commit -m "feat(crm): tab demo detail with Material Issues + Dispatch Requests"
```

---

## Self-Review

**Spec coverage:**
- Part 1 (create flow, demo wired, source-aware picker, `useDemoRequestOptions`) → Task 1. ✓
- Part 2 (demo detail tabs; Overview/MI/Dispatch; `lineById` from raw wire; expose `variantLabels`/`lineById`) → Tasks 3 (map), 4 (tabs), 5 (tabbed page). ✓
- Part 3 (promote `SoDocAccordion`/`SoDocList`/`SoSourceLineLabel` to `crm/components/shared/detail-docs/`, decouple strings, rename `SoLineBrief`→`DetailLineBrief`, update SO tabs) → Task 2. ✓
- Out-of-scope items (no create button on demo detail, no backend, no tests) respected. ✓

**Placeholder scan:** No TBD/TODO; every code step carries full source. ✓

**Type consistency:**
- `DetailLineBrief` defined in Task 2 (`SourceLineLabel.tsx`), consumed in Tasks 3, 4. ✓
- `DocRow` defined in Task 2 (`DocList.tsx`), consumed in Task 4. ✓
- `DETAIL_DOCS_STRINGS` keys (`loadError`, `view`, `linesLoading`, `noLines`, `serialPrefix`, `unknownPart`) defined in Task 2, used in Tasks 2 + 4. ✓
- `useDemoRequestOptions(search: string)` defined Task 1, used same task. ✓
- `lineById: Map<string, DetailLineBrief>` produced Task 3, consumed Task 4/5. ✓
- Tab strings (`tabs.overview/materialIssues/dispatchRequests`, `docTabs.noMaterialIssues/noDispatchRequests/units`) defined Task 4, used Tasks 4 + 5. ✓

**Ordering:** Task 2 precedes Tasks 3–5 (they import the shared components/types); Task 3 precedes 5; Task 1 is independent and may run first or last. Recommended order: 1 → 2 → 3 → 4 → 5.
