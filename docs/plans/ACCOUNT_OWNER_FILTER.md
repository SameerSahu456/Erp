# Plan — Owner Filter on the Accounts list + narrower search box

**Module:** CRM → Accounts (frontend)
**Goal:** Add an **Account Owner** filter to the Accounts list toolbar and **reduce the search-box width** so the new control fits cleanly on one row.
**Backend status:** ✅ Already done — `GET /api/v1/crm/accounts` accepts `owner_id` (single UUID; "accounts where this user is a live owner — primary or otherwise"). No backend change required.

---

## 0. What already exists (do NOT rebuild)

| Layer | State | Evidence |
|---|---|---|
| Backend query param | ✅ `owner_id: uuid \| None` on `list_accounts`, threaded into `service.list(..., owner_id=...)` | `app/modules/crm/api/v1/endpoints.py:577-585`, `:628` |
| FE request type | ✅ `FetchAccountsParams.owner_id?: string` | `src/modules/crm/api.ts:476` |
| FE request call | ✅ `fetchAccounts` already forwards `owner_id` | `src/modules/crm/api.ts:590` |
| FE single-select user picker pattern | ✅ exists — copy it | `TaskFormDialog.tsx:520-620` (assignee picker) |
| FE user-options data hook | ✅ `useUserOptions(search, filters, { enabled })` → infinite query | `src/modules/users/hooks/useUsers.ts:138` |

**The only gaps are UI + list-hook wiring.** Nothing in the network layer needs touching.

---

## 1. Approach decision

The owner filter is a **single-value** filter (`owner_id` is one UUID, not a list — note the recent UAT *multi-select* work was on a different surface; the Accounts endpoint is single-owner). Users are a large, paginated set, so the control must be an **async, searchable, infinite-scroll single-select** — not a static `<Select>`.

The existing toolbar's `toolbarFilters` mechanism (`CrmToolbarFilterSelect`) renders a **static** `<Select>` with no async search → not suitable for a user list. We therefore:

1. Build a dedicated **`AccountOwnerFilter`** component (async user picker), reusing the proven `TaskFormDialog` assignee pattern.
2. Inject it into the toolbar via a **new optional `extraFilters?: ReactNode` slot** on `CrmDataTable` (smallest, reusable change — keeps the owner picker out of the static `ToolbarFilter` contract and makes the slot available to Deals/Leads later).

> **Alternative considered & rejected:** extending `ToolbarFilter` with an async variant. Rejected because it bloats the shared static-select contract for a one-off async control. The `extraFilters` slot is more isolated and reusable.

---

## 2. File-by-file changes

### 2.1 New component — `src/modules/crm/components/accounts/AccountOwnerFilter.tsx`

Single-select async user picker. Stores the selection as `{ id, label }` so the chip still renders after the picked row scrolls off the loaded pages (Coding-guideline §16.11 #5). Models directly on `TaskFormDialog.tsx:520-620`.

```tsx
import { useMemo, useState } from "react"

import { cn } from "@/lib/utils"
import { Popover } from "@/components/ui/popover"
import { PopoverSelectTrigger } from "@/components/ui/popover-select-trigger"
import { useDebounce } from "@/shared/hooks"
import { UI } from "@/shared/constants"
import {
  getUserDisplayName,
  useUser,
  useUserOptions,
  type UserListItem,
} from "@modules/users"

import { InfiniteScrollPickerContent } from "../shared/InfiniteScrollPickerContent"

export interface OwnerFilterValue {
  id: string
  label: string
}

export function AccountOwnerFilter({
  value,
  onChange,
}: {
  value: OwnerFilterValue | null
  onChange: (next: OwnerFilterValue | null) => void
}) {
  const [open, setOpen] = useState(false)
  const [rawSearch, setRawSearch] = useState("")
  const debouncedSearch = useDebounce(rawSearch.trim(), UI.DEBOUNCE_SEARCH_MS)

  // Active users only; lazy — first request fires on open.
  const query = useUserOptions(debouncedSearch, { is_active: true }, { enabled: open })
  const { data, isLoading, isError, hasNextPage, isFetchingNextPage, fetchNextPage } = query

  const rawItems = useMemo<UserListItem[]>(
    () => (data?.pages ?? []).flatMap((p) => p.items),
    [data?.pages],
  )

  // Hydrate the selected user if it isn't on the currently-loaded pages, so
  // the row stays highlighted when reopening with a value already chosen.
  const valueInList = !!value && rawItems.some((i) => i.id === value.id)
  const valueDetail = useUser(value && !valueInList ? value.id : "")

  const items = useMemo<UserListItem[]>(() => {
    const seen = new Set<string>()
    const out: UserListItem[] = []
    if (value && !valueInList && valueDetail.data) {
      out.push(valueDetail.data)
      seen.add(valueDetail.data.id)
    }
    for (const item of rawItems) {
      if (!seen.has(item.id)) {
        seen.add(item.id)
        out.push(item)
      }
    }
    return out
  }, [value, valueInList, valueDetail.data, rawItems])

  function pick(item: UserListItem) {
    onChange({ id: item.id, label: getUserDisplayName(item) })
    setOpen(false)
    setRawSearch("")
  }

  function clear(e: React.MouseEvent) {
    e.stopPropagation()
    onChange(null)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverSelectTrigger
        hasValue={!!value}
        onClear={clear}
        clearLabel="Clear owner"
        // Match the toolbar select-trigger sizing (see §2.4 CSS).
        className="account-owner-filter"
      >
        {value ? value.label : "All owners"}
      </PopoverSelectTrigger>
      <InfiniteScrollPickerContent
        search={{ value: rawSearch, onChange: setRawSearch, placeholder: "Search owners…" }}
        query={{ isLoading, isError, hasNextPage, isFetchingNextPage, fetchNextPage }}
        items={items}
        errorText="Failed to load users"
        emptyText={rawSearch ? "No matches" : "No users"}
        renderItem={(item) => (
          <button
            type="button"
            onClick={() => pick(item)}
            className={cn(
              "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent",
              value?.id === item.id && "bg-accent/50",
            )}
          >
            <span className="min-w-0 flex-1 truncate">{getUserDisplayName(item)}</span>
            {item.email && (
              <span className="shrink-0 text-[10px] text-muted-foreground">{item.email}</span>
            )}
          </button>
        )}
      />
    </Popover>
  )
}
```

> Confirm `useUser` is exported from `@modules/users` (it is used in `TaskFormDialog`). Mirror the exact import surface used there.

### 2.2 List hook — `src/modules/crm/hooks/accounts/useAccountsList.ts`

Add owner state, thread it into the query params, the page-reset list, and the clear handler.

1. **Persisted state** (store `{id,label}` so the chip survives reload; reuse `usePersistedState`):
   ```ts
   import type { OwnerFilterValue } from "../../components/accounts/AccountOwnerFilter"
   ...
   const [selectedOwner, setSelectedOwner] =
     usePersistedState<OwnerFilterValue | null>("accounts:owner", null)
   ```
2. **Query params** — add inside the `queryParams` `useMemo` (and its dep array):
   ```ts
   owner_id: selectedOwner?.id || undefined,
   ```
3. **Reset to page 1 on change** — add `selectedOwner?.id` to `useUrlPagination({ resetOn: [...] })`.
4. **Clear filters** — in `handleClearFilters`, add `setSelectedOwner(null)`.
5. **Expose** in the returned object: `selectedOwner`, `setSelectedOwner`.

> Leave the existing `toolbarFilters` array untouched — the owner picker is rendered through the new `extraFilters` slot, not as a static `ToolbarFilter`.

### 2.3 Table wiring — `src/modules/crm/components/accounts/AccountsTable.tsx`

1. Import the new component:
   ```tsx
   import { AccountOwnerFilter } from "./AccountOwnerFilter"
   ```
2. Pass it through the new slot on `<CrmDataTable>` (added in §2.4) and add a scoping class so the narrower search-box CSS can target this table only:
   ```tsx
   <CrmDataTable
     className="cpt-compact crm-premium-table accounts-list-table"   // + accounts-list-table
     ...
     extraFilters={
       <AccountOwnerFilter
         value={list.selectedOwner}
         onChange={list.setSelectedOwner}
       />
     }
   />
   ```

### 2.4 Shared table — add the `extraFilters` slot

Three tiny edits so the toolbar can render an arbitrary trailing control:

- **`.../crm-data-table/types.ts`** — add to `CrmDataTableProps`:
  ```ts
  /** Optional custom filter control(s) rendered at the end of the toolbar
   *  filter row (before the right-aligned spacer). Use for filters that the
   *  static `toolbarFilters` contract can't express — e.g. an async user
   *  picker. */
  extraFilters?: React.ReactNode
  ```
- **`CrmDataTable.tsx`** — destructure `extraFilters` from props and forward it to `<CrmTableToolbar extraFilters={extraFilters} />`.
- **`CrmTableToolbar.tsx`** — accept `extraFilters` and render it just before the `marginLeft:auto` spacer:
  ```tsx
  {(toolbarFilters ?? []).map((tf) => ... )}
  {extraFilters}
  <div style={{ marginLeft: "auto" }} />
  ```

### 2.5 Reduce the search-box width — `src/styles/comprint.css`

The Accounts toolbar uses `toolbarLayout="inline"` → `.crm-data-table-toolbar-inline .cpt-search-field` (currently `flex: 0 1 280px; min-width:240px; max-width:320px`, widening to `340/300/360` at ≥1280px — `comprint.css:140-157`). That rule is **shared with Contacts**, so scope the reduction to the Accounts table via the new `accounts-list-table` class instead of editing the shared rule:

```css
/* Accounts list: narrower search box to make room for the Owner filter. */
.accounts-list-table .cpt-search-field {
  flex: 0 1 220px;
  min-width: 180px;
  max-width: 240px;
}
@media (min-width: 1280px) {
  .accounts-list-table .cpt-search-field {
    flex-basis: 240px;
    min-width: 200px;
    max-width: 260px;
  }
}

/* Owner filter trigger sits flush with the static filter selects. */
.account-owner-filter {
  flex: 0 0 180px;
  width: 180px;
}
```

> Specificity: `.accounts-list-table .cpt-search-field` (0,2,0) beats `.crm-data-table-toolbar-inline .cpt-search-field` (0,2,0) only by source order — place these rules **after** the `.crm-data-table-toolbar-inline` block in the file so they win. (Adjust the px target to taste during review.)

---

## 3. Data flow (end to end)

```
AccountOwnerFilter (pick user)
  → list.setSelectedOwner({id,label})          [useAccountsList persisted state]
  → queryParams.owner_id = id                  [useMemo]
  → useAccounts(queryParams)                   [react-query]
  → fetchAccounts({ owner_id })                [api.ts:590 — already wired]
  → GET /crm/accounts?owner_id=<uuid>          [backend — already wired]
  → table re-renders filtered rows; page resets to 1
```

---

## 4. Verification checklist

- [ ] `make`-equivalent FE typecheck/lint passes (`pnpm lint`, `pnpm typecheck` / tsc).
- [ ] Owner dropdown loads active users, searches by name, infinite-scrolls.
- [ ] Picking an owner filters the table; network tab shows `?owner_id=<uuid>`.
- [ ] Clearing the owner (X on trigger) and **Clear filters** both remove `owner_id` and restore the full list.
- [ ] Changing owner resets pagination to page 1; back-nav preserves it (mount-safe `resetOn`).
- [ ] Selection persists across reload (persisted state) and the chip label shows even when the picked user isn't on page 1.
- [ ] Search box is visibly narrower **only** on Accounts; Contacts (also inline) is unchanged.
- [ ] Toolbar stays on one row at common widths; no horizontal overflow at <1280px and ≥1280px.
- [ ] RBAC: owner picker visible to anyone with `CRM_READ`/`CRM_ACCOUNT_READ` (read-only control — no write gate needed).

## 5. Tests

- **Unit/RTL** (`tests/` mirroring existing CRM tests): mount `AccountOwnerFilter`, assert it calls `onChange({id,label})` on pick and `onChange(null)` on clear.
- **List-hook test**: assert `owner_id` appears in `queryParams` when an owner is selected and is `undefined` when cleared; assert `resetOn` returns to page 1.
- Reuse the existing accounts-list test harness if present; otherwise follow the nearest CRM list test as the template.

## 6. Out of scope / follow-ups

- Multi-select owner filter (backend is single `owner_id` today — would need a backend change to accept `owner_ids`).
- Promoting `extraFilters` usage to Deals/Leads list toolbars (the slot makes it trivial later).
- "My accounts" quick-toggle (pre-fill `owner_id` = current user) — easy add-on once the filter exists.
