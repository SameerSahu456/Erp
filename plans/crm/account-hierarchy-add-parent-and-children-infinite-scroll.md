# Plan — Account Hierarchy: "Add Parent" + Children Infinite-Scroll

**Date:** 2026-06-11
**Scope:** CRM Account detail page — right-rail Parent/Child hierarchy cards
**Approach:** **Frontend-only — NO backend changes required.**

---

## 1. Requirements

1. **Add Parent** affordance on the Account detail page, mirroring the existing
   **Add Child** affordance — let the user pick an existing account (or create a
   new one) to become **this account's parent**.
2. **Infinite scrolling** for the **Child Accounts** card (currently shows only
   the first page of children) via pagination.
3. **Max-height** on the Child Accounts list so a long child list scrolls inside
   the card instead of pushing the page/viewport.

---

## 2. Backend reality (verified — nothing to build)

| Need | Existing API | Notes |
|------|-------------|-------|
| Set this account's parent ("Add Parent") | `PATCH /api/v1/crm/accounts/{account_id}` body `{ "parent_account_id": "<uuid>" }` | Same call **Add Child** already uses (just inverted: there we set the *child's* parent; here we set *this account's* parent). Clear a parent with `parent_account_id: null`. |
| List children (paginated) | `GET /api/v1/crm/accounts?parent_account_id=<id>&page=N&page_size=M` | Returns `{ items, total, page, page_size }`. |
| Cycle / depth safety | enforced server-side | `account_service.py::_assert_parent_chain_valid` — returns **400** with code `ACCOUNT_HIERARCHY_CYCLE` (picking a descendant as parent) or `ACCOUNT_DEPTH_EXCEEDED` (> `ACCOUNT_MAX_HIERARCHY_DEPTH`). Self-parent blocked by DB CHECK `ck_accounts_no_self_parent`. |

> **Decision:** Do **not** introduce a new endpoint and do **not** adopt the bulk
> `PATCH /accounts/parent-child-relationships` endpoint. The per-account
> `updateAccount` path is already the codebase convention for hierarchy edits
> (`useSyncChildAccounts`), keeps "Add Parent" symmetric with "Add Child", and
> gets the same cycle/depth validation for free.

Permission to edit: `crm:manage` **or** `crm:account:write` (route-enforced).

---

## 3. Current frontend state (what we're extending)

- `components/accounts/AccountHierarchyCards.tsx`
  - **Parent Account card** (lines ~46–84): read-only link, rendered **only when
    `parent_account_id` exists**. No add affordance today.
  - **Child Accounts card** (lines ~86–150): has the `UserPlus` dropdown →
    "Link existing" (opens `LinkChildAccountsDialog`) / "Create new"
    (`/crm/accounts/new?parentAccountId=<id>`). Renders the flat child list.
- `components/accounts/LinkChildAccountsDialog.tsx`: `AsyncMultiSelect` over
  `useAccountOptions`, diff-based Save via `useSyncChildAccounts`.
- `hooks/accounts/useAccounts.ts`
  - `useChildAccounts` (lines ~71–83): **single page** `useQuery`
    (`page:1, page_size:10`) — this is what we replace with an infinite query.
  - `useAccountOptions` (lines ~89–151): **reference infinite-scroll pattern** —
    `getNextPageParam: last.page * last.page_size < last.total ? last.page+1 : undefined`.
  - `useSyncChildAccounts` (lines ~203–239): `updateAccount(id, { parent_account_id })`.
- `hooks/accounts/useAccountDetail.ts`: wires `childAccounts` (lines ~47–49) and
  already has the **IntersectionObserver sentinel pattern** for deals/orders
  (lines ~99–150) we mirror.
- `pages/accounts/AccountDetailPage.tsx` (lines ~174–177): renders
  `<AccountHierarchyCards account parentAccount childAccounts />`.
- `components/accounts/accounts.strings.ts`: `hierarchy` block (lines ~249–257),
  `linkChildDialog` block (lines ~132–139).
- `shared/constants/pagination.ts`: `DEFAULT_PAGE_SIZE = 10`,
  `INFINITE_SCROLL_BATCH = 25`.

---

## 4. Implementation

### 4.1 — Children infinite scroll + max-height

**(a) New hook `useChildAccountsInfinite`** in `hooks/accounts/useAccounts.ts`,
modeled on `useAccountOptions`:

```ts
export function useChildAccountsInfinite(
  parentId: string | null | undefined,
  options?: { enabled?: boolean },
) {
  const pageSize = PAGINATION.INFINITE_SCROLL_BATCH // 25 — fewer round-trips
  return useInfiniteQuery({
    queryKey: [...LIST_KEY, "children", parentId, pageSize],
    queryFn: ({ pageParam }) =>
      fetchAccounts({
        page: pageParam,
        page_size: pageSize,
        parent_account_id: parentId ?? undefined,
      }),
    initialPageParam: 1 as number,
    getNextPageParam: (last) =>
      last.page * last.page_size < last.total ? last.page + 1 : undefined,
    enabled: !!parentId && (options?.enabled ?? true),
  })
}
```

Keep the old `useChildAccounts` only if another caller needs it; otherwise
replace its single usage.

**(b) `useAccountDetail.ts`** — swap `useChildAccounts` for the infinite hook,
flatten pages, expose `total`, `hasNextPage`, `fetchNextPage`,
`isFetchingNextPage`, and a `setChildSentinel` (copy the deals observer block at
lines ~99–123):

```ts
const childrenQuery = useChildAccountsInfinite(account?.id)
const childAccounts = useMemo(
  () => (childrenQuery.data?.pages ?? []).flatMap((p) => p.items),
  [childrenQuery.data?.pages],
)
const childAccountsTotal = childrenQuery.data?.pages?.[0]?.total ?? 0
// + IntersectionObserver effect on childSentinel → fetchNextPage()
```

Return `childAccounts`, `childAccountsTotal`, `childrenQuery`,
`setChildSentinel` from the hook (extend the return object at lines ~205–244).

**(c) `AccountHierarchyCards.tsx`** — make the child list a bounded scroll
container and drop the sentinel at the bottom. New props:
`childAccountsTotal`, `setChildSentinel`, `isFetchingMoreChildren`.

```tsx
<CardContent>
  {childAccounts.length === 0 ? (
    <Typography variant="helper" tone="muted" className="italic">
      {S.hierarchy.childEmpty}
    </Typography>
  ) : (
    // max-h cap + internal scroll so many children never overflow the page.
    // -mr-1 pr-1 keeps the scrollbar off the card content edge.
    <div className="max-h-72 space-y-2 overflow-y-auto -mr-1 pr-1">
      {childAccounts.map((child) => (/* existing row link */))}
      {/* sentinel — observer fires fetchNextPage when it scrolls into view */}
      <div ref={setChildSentinel} />
      {isFetchingMoreChildren && (
        <div className="flex justify-center py-2">
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  )}
</CardContent>
```

- `max-h-72` (~18rem) is the starting cap; tune to match the right-rail. Use a
  Tailwind value already common in the codebase if one exists.
- Optionally show the count in the card title: `Child Accounts ({childAccountsTotal})`.

**(d) `AccountDetailPage.tsx`** — pass the new props through (lines ~174–177).

### 4.2 — "Add Parent"

**(a) Strings** — add to `accounts.strings.ts`:

```ts
hierarchy: {
  // …existing…
  addParentAccount: "Add parent account",
  changeParentAccount: "Change parent account",
  noParent: "No parent account.",
},
linkParentDialog: {
  title: "Set parent account",
  accountLabel: "Parent account",
  placeholder: "Select a parent account…",
  cancel: "Cancel",
  save: "Save",
},
toast: {
  // …existing…
  parentAccountSet: "Parent account updated",
  parentAccountCleared: "Parent account removed",
  parentAccountUpdateFailed: "Failed to update parent account",
},
```

**(b) Hook `useSetParentAccount`** in `useAccounts.ts` (sibling of
`useSyncChildAccounts`): set or clear **this account's** parent.

```ts
export function useSetParentAccount(accountId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (parentId: string | null) =>
      updateAccount(accountId, { parent_account_id: parentId }),
    onSuccess: (updated, parentId) => {
      qc.setQueryData([...DETAIL_KEY, accountId], updated)
      void qc.invalidateQueries({ queryKey: LIST_KEY })          // child-of lists
      void qc.invalidateQueries({ queryKey: OPTIONS_KEY })
      if (parentId)
        void qc.invalidateQueries({ queryKey: [...DETAIL_KEY, parentId] })
      toast.success(parentId ? S.toast.parentAccountSet : S.toast.parentAccountCleared)
    },
    onError: (e: Error) =>
      toast.error(e.message || S.toast.parentAccountUpdateFailed),
  })
}
```

> The backend returns the cycle/depth 400 with a human message; surface it via
> the existing `error.message` toast path — no special handling needed, but
> verify the message is readable.

**(c) Dialog `LinkParentAccountDialog.tsx`** (single-select variant of
`LinkChildAccountsDialog`). Use `AsyncSelect` (single) if available, else
`AsyncMultiSelect` capped to one pick. **Exclusions to prevent obvious cycles:**

- exclude `accountId` (self), and
- exclude the **current children ids** (a direct child can't become the parent).

```tsx
const useOptions = (search, opts) =>
  useAccountOptions(search, {
    excludeId: accountId,
    excludeIds: childAccountIds,   // direct children
    enabled: opts?.enabled,
  })
```

Deeper descendants aren't known client-side; the backend
`ACCOUNT_HIERARCHY_CYCLE` 400 is the safety net and shows as a toast. Seed the
control with the current parent so the dialog acts as **Set / Change parent**.
Save → `setParentMut.mutate(selectedId)`. (Optional) allow clearing via a
"Remove parent" action → `mutate(null)`.

**(d) `AccountHierarchyCards.tsx` — Parent card affordance.** Render the Parent
card **always** (not only when a parent exists), and add an add/change control
mirroring the child card's `UserPlus` dropdown:

```tsx
<Card size="sm">
  <CardHeader className="flex-row items-center justify-between pb-3">
    <CardTitle className="text-sm">{S.hierarchy.parentAccount}</CardTitle>
    <DropdownMenu>
      <DropdownMenuTrigger aria-label={
        account.parent_account_id ? S.hierarchy.changeParentAccount
                                  : S.hierarchy.addParentAccount
      } /* same button classes as child card */>
        <UserPlus className="size-3.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem onClick={() => setParentLinkOpen(true)}>
          {S.hierarchy.linkExisting}
        </DropdownMenuItem>
        {/* Create-new parent: open the create form, then set it as parent on
            return. Simplest v1: omit "create new" and ship link-existing only. */}
      </DropdownMenuContent>
    </DropdownMenu>
  </CardHeader>
  <CardContent>
    {account.parent_account_id
      ? /* existing parent link block */
      : <Typography variant="helper" tone="muted" className="italic">
          {S.hierarchy.noParent}
        </Typography>}
  </CardContent>
</Card>

<LinkParentAccountDialog
  open={parentLinkOpen}
  onOpenChange={setParentLinkOpen}
  accountId={account.id}
  currentParentId={account.parent_account_id}
  childAccountIds={childAccounts.map((c) => c.id)}
/>
```

---

## 5. Files touched

| File | Change |
|------|--------|
| `hooks/accounts/useAccounts.ts` | + `useChildAccountsInfinite`, + `useSetParentAccount` |
| `hooks/accounts/useAccountDetail.ts` | swap to infinite children + observer; expose `childAccountsTotal`, `setChildSentinel`, `childrenQuery` |
| `components/accounts/AccountHierarchyCards.tsx` | parent-card add/change affordance; bounded-scroll child list + sentinel; new props |
| `components/accounts/LinkParentAccountDialog.tsx` | **new** single-select parent picker |
| `pages/accounts/AccountDetailPage.tsx` | pass new props through |
| `components/accounts/accounts.strings.ts` | + parent strings + toasts |

No `api.ts` change — `updateAccount` and `fetchAccounts` already cover it.

---

## 6. Edge cases & QA

- **Cycle:** pick a descendant as parent → backend 400 `ACCOUNT_HIERARCHY_CYCLE`
  → toast; UI state unchanged. Direct children pre-excluded from the picker.
- **Depth:** chain would exceed max → 400 `ACCOUNT_DEPTH_EXCEEDED` → toast.
- **Re-parent:** setting a new parent on an account that already has one just
  overwrites `parent_account_id` (single-parent model). Dialog seeds with current
  parent and reads as "Change parent".
- **Cache:** after Set Parent, this account's detail updates; old parent's and
  new parent's children lists invalidate (both carry `parent_account_id` in
  `LIST_KEY`), so their Child cards refresh.
- **Max-height:** verify a 50+ child account scrolls inside `max-h-*` and the
  page itself doesn't grow; confirm the sentinel triggers `fetchNextPage` and the
  spinner shows between pages.
- **Empty parent:** root account shows the "No parent account." placeholder with
  the add affordance available.
- **Permissions:** without `crm:manage`/`crm:account:write` the PATCH 403s —
  consider hiding the add affordances for users lacking write (match how Add
  Child / owners affordances gate today).
