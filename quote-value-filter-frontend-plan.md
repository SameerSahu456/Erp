# Quote Value Range Filter — Frontend Plan

## Goal
Add a **Quote Value** range filter to the Quotes list toolbar. The user enters a
min and/or max amount; the list refetches showing only quotes whose `grand_total`
is within the range. State is URL-backed (survives refresh / back-forward) and
plumbed to the API as `min_value` / `max_value` query params. Mirrors the existing
date-range filter wiring (`crm-date-range-filter-frontend-plan.md`).

## Framework facts
- React 19 · TypeScript strict · Vite · TanStack Query v5 · React Router 7 · URL-backed filter state.
- `grand_total` is already returned (`QuoteListItemWire.grand_total: number`, surfaced as
  `total` row field) — **no response-shape change needed**, only two new request params.
- No reusable numeric min/max component exists — build a small one modeled on the date-range control.

## Files & changes (mirror the `daterange` path exactly)

### 1. Toolbar filter type — `src/modules/crm/components/shared/crm-data-table/types.ts`
`ToolbarFilter` is a discriminated union on `kind` (~line 130). Add a new member:

```ts
export interface ToolbarValueRangeFilter {
  kind: "valuerange";
  key: string;
  label: string;
  value: { min?: number; max?: number };
  minPlaceholder?: string;
  maxPlaceholder?: string;
}

export type ToolbarFilter =
  | ToolbarSelectFilter
  | ToolbarDateRangeFilter
  | ToolbarValueRangeFilter;
```

Also add a callback to `CrmDataTableProps` (~lines 188-200), mirroring `onToolbarDateRangeChange`:
```ts
onToolbarValueRangeChange?: (key: string, range: { min?: number; max?: number }) => void;
```

### 2. Range control — `src/modules/crm/components/shared/crm-data-table/toolbarFilterControls.tsx`
Add `CrmToolbarValueRange` alongside `CrmToolbarDateRange`: two `<input type="number">`
fields (Min / Max), `min={0}`, debounced or on-blur commit, emitting
`{ min?, max? }`. Reuse existing chip/popover styling from the date-range control so it
reads as one system. Show a clear affordance to reset both.

### 3. Toolbar dispatch — `src/modules/crm/components/shared/crm-data-table/CrmTableToolbar.tsx`
In the `toolbarFilters.map(...)` branch (~lines 150-168) add:
```tsx
if (tf.kind === "valuerange") {
  return (
    <CrmToolbarValueRange
      key={tf.key}
      filter={tf}
      onChange={(range) => onToolbarValueRangeChange?.(tf.key, range)}
    />
  );
}
```

### 4. Wire the prop through — `src/modules/crm/components/shared/crm-data-table/CrmDataTable.tsx`
Accept and forward `onToolbarValueRangeChange` to `CrmTableToolbar` (~lines 30-37, 84-95),
exactly as `onToolbarDateRangeChange` is threaded.

### 5. URL state — `src/shared/hooks/useUrlFilterState.ts`
Reuse two `useUrlFilter` keys (`min_value`, `max_value`) — simplest — or add a
`useUrlValueRange` helper analogous to `useUrlDateRange`. Values are numeric strings in URL.

### 6. Container hook — `src/modules/crm/hooks/quotes/useQuotesList.ts`
- Read `min_value` / `max_value` from URL (step 5).
- Add a `valuerange` entry to `toolbarFilters` (~lines 140-167) with current `{ min, max }`.
- Add a change handler that writes both keys to the URL (`setMany` for atomic set/clear).
- Include both keys in the `handleClearFilters` `setMany` list (~lines 78-87).
- Pass `min_value` / `max_value` into the `useQuotes({...})` call.

### 7. Query hook — `src/modules/crm/hooks/quotes/useQuotes.ts`
Add `min_value` / `max_value` to the params object handed to `fetchQuotes` and include
them in the TanStack Query `queryKey` so a range change triggers a refetch.

### 8. API layer — `src/modules/crm/api/quotes.ts`
- `FetchQuotesParams` (~line 250): add `min_value?: number; max_value?: number`.
- `fetchQuotes` serialization (~line 432): add
  `min_value: params.min_value || undefined, max_value: params.max_value || undefined`
  (omit falsy so empty inputs aren't sent).

## Full chain (extend, don't invent)
URL keys (`min_value`/`max_value`) → `useQuotesList` (toolbarFilters + handler + clear) →
`useQuotes` params/queryKey → `FetchQuotesParams` → `fetchQuotes` → backend query params.

## UX notes
- Inputs numeric, `min >= 0`. If `min > max`, disable/soft-warn (backend also 422s).
- Empty input = unbounded; both empty = no filter (chip shows placeholder).
- Active chip should show a compact summary (e.g. `Value: 1,000–5,000`) and a clear (×).
- Debounce or commit on blur to avoid a refetch per keystroke.

## Tests
- Entering min only / max only / both updates URL and refetches with correct params.
- Clearing removes both URL keys and resets the list.
- Refresh preserves the range (URL-backed).
- `min_value || undefined` guard drops empty inputs from the request.

## Definition of done
- [ ] `valuerange` filter type + control + toolbar/table plumbing added.
- [ ] URL-backed state; survives refresh and participates in Clear filters.
- [ ] `min_value` / `max_value` reach the API and are in the query key.
- [ ] Chip summary + clear affordance; no refetch storm on typing.
