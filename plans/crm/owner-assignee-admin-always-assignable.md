# Plan — Admins/Superadmins always assignable as Owner / Assigned-To

**Date:** 2026-06-10
**Scope:** CRM Lead "Assigned To", Deal "Owner", Account "Owners"
**Approach:** **Frontend-only — NO backend changes.**

---

## 1. Requirement & thought process

Today, when a **type** (channel type) is selected on the Lead / Deal / Account
forms, the owner/assignee dropdowns send `channel_tags=[type]` to
`GET /api/v1/users`. The list then shows **only** users whose role carries that
channel tag. Save-time validation likewise rejects any picked user whose
`channel_tags` don't include the type (and rejects `channel_tags == null`).

**Problem:** Admin / Superadmin users have unrestricted roles
(`channel_tags = []` → effective `channel_tags: null`). They therefore:
- get **excluded** from the dropdown when a type is selected, and
- get **rejected** by the save-time validation (`tags == null` → "does not deal in X").

**Desired behaviour (admins oversee all channels, so always assignable):**

1. **No type selected** → behave exactly as today: a single query, show users
   directly. No admin pinning.
2. **Type selected** → show **admin + superadmin users first (by default, pinned
   on top)**, then the **channel-tag-matched users** below them, via pagination.
3. **No duplicates** — if a user falls in BOTH lists (e.g. holds an admin role
   *and* another role carrying the tag), they appear **once** (the pinned/top
   occurrence wins; the later duplicate is dropped).
4. **Validation** — accept the picked user if *they are admin/superadmin* **OR**
   *their role has the selected type*.

---

## 2. Why frontend-only is doable (no backend change)

The backend AND-combines `channel_tags` + `role_names`
(`user_repository.py:207-252`), so a single combined call can't produce the
union. **But the dropdowns don't need the backend to do the union** — they
consume a `useInfiniteQuery`-shaped object and flatten `data.pages` **in order**.

- `AsyncSelect` (Lead) already **dedupes by `id` across all pages**
  (`async-select.tsx:184-193`), keeping the first occurrence.
- `AccountOwnersSelect` (Account) flattens pages (`AccountOwnersSelect.tsx:152-155`)
  but does **not** dedupe yet → add a 1-line order-preserving `id` dedupe.

So we run **two queries** and stitch their pages together client-side,
**admins first**:

- **Query A — pinned admins:** `role_names=[admin, superadmin]`, **no**
  `channel_tags`, no exclude. Tiny, cached, shared across all three forms.
  **Enabled only when a type is selected.**
- **Query B — channel users:** today's exact call (`channel_tags=[type]` +
  `exclude_role_names`), paginated.

A small wrapper hook returns the `AsyncQueryShape` the components already expect:

```ts
// Only merges when a type (channelTags) is selected; otherwise returns Query B alone.
data.pages         = [...adminQuery.pages, ...channelQuery.pages]   // admins on top
isLoading          = adminQuery.isLoading || channelQuery.isLoading
isError            = adminQuery.isError || channelQuery.isError
hasNextPage        = adminQuery.hasNextPage || channelQuery.hasNextPage
isFetchingNextPage = adminQuery.isFetchingNextPage || channelQuery.isFetchingNextPage
fetchNextPage()    = adminQuery.hasNextPage           // exhaust admins first,
                       ? adminQuery.fetchNextPage()   // then page through
                       : channelQuery.fetchNextPage() // channel users
```

**Dedupe:** flatten admins-then-channel into a `Set<id>` keeping first
occurrence → admin row stays pinned on top, the channel duplicate is dropped.
`AsyncSelect` does this already; `AccountOwnersSelect` gets the same logic added.

---

## 3. Implementation plan (frontend only)

### Part A — shared constant + helper

1. **`src/modules/crm/crm-roles.ts`**
   ```ts
   export const OWNER_INCLUDE_ROLE_NAMES = ["admin", "superadmin"] as const
   // admin/superadmin bypass — used by dropdown merge + all 3 validations
   export function isOwnerExempt(user: { roles?: string[] } | null | undefined): boolean {
     return !!user?.roles?.some((r) => OWNER_INCLUDE_ROLE_NAMES.includes(r as never))
   }
   ```

### Part B — merged "admins-first" picker hook

2. **`src/modules/users/hooks/useUsers.ts`** (or a small new file) — add
   `useUserOptionsWithPinnedAdmins`:
   - Query A: `useUserOptionsByRoles(OWNER_INCLUDE_ROLE_NAMES, { search, isActive: true, enabled: hasType })`
     — no `channelTags`, no `excludeRoleNames`.
   - Query B: the existing channel-scoped query (caller-supplied filters incl.
     `channelTags` + `excludeRoleNames`).
   - When `hasType` is **false** → return Query B unchanged (single query, today's behaviour).
   - When **true** → return the merged `AsyncQueryShape` (admins-first, dedupe handled by consumer / built in).

### Part C — wire each picker

3. **Lead — `src/modules/crm/hooks/leads/useLeadForm.ts`**
   `useAssignedToOptions` → use the merged hook. `channelTagsForPickers`
   already drives "is a type selected". AsyncSelect dedupes automatically.
4. **Account — `src/modules/crm/components/accounts/AccountOwnersSelect.tsx`**
   - Swap the single `useUserOptions` for the merged hook (pinned admins when
     `channelTags` set).
   - Add order-preserving `id` dedupe to its `items` memo (line ~152):
     ```ts
     const items = React.useMemo(() => {
       const seen = new Set<string>()
       const out: UserListItem[] = []
       for (const u of (data?.pages ?? []).flatMap((p) => p.items)) {
         if (seen.has(u.id) || excluded.has(u.id)) continue
         seen.add(u.id); out.push(u)
       }
       return out
     }, [data?.pages, excluded])
     ```
5. **Deal — `src/modules/crm/hooks/deals/useDealForm.ts`**
   No fetch change (owner list comes from the account's owners). Validation only.

### Part D — relax validation in all three (accept admins)

6. **Lead** `useLeadForm.ts` — `handleCustomerTypeChange` (~182) and
   `validateForm` (~438): accept assignee if `isOwnerExempt(user)` **OR** tags include type.
7. **Deal** `useDealForm.ts` — `validateForm` (~323): accept owner if
   `isOwnerExempt(ownerUserQuery.data)` **OR** tags include `channelType`.
8. **Account** `useAccountForm.ts` — `handleAccountTypeChange` (~326) and
   `validateForm` (~364): skip dropping / skip rejecting owners where `isOwnerExempt`.
   - Needs role info per owner. Widen `OwnerOption` to capture `roles` (or an
     `isExempt` flag) at select-time from `item.roles`, and from
     `useUsersByIds`/`fetchUser` in edit mode (`UserDetail.roles` exists).

### Part E — checks

9. FE typecheck + lint. Manual verification:
   - No type selected → dropdown shows users directly (unchanged), no admin pinning.
   - Type selected → admins/superadmins listed first, then tag-matched users; scroll paginates.
   - A user who is admin **and** holds a tag-bearing role → appears **once**, on top.
   - Pick an admin → save passes regardless of type.
   - Pick a tag-mismatched non-admin → save still blocked.

---

## 4. Files touched (checklist) — frontend only

- [ ] `src/modules/crm/crm-roles.ts` (constant + `isOwnerExempt`)
- [ ] `src/modules/users/hooks/useUsers.ts` (merged `useUserOptionsWithPinnedAdmins`)
- [ ] `src/modules/crm/hooks/leads/useLeadForm.ts` (picker + validation)
- [ ] `src/modules/crm/hooks/deals/useDealForm.ts` (validation only)
- [ ] `src/modules/crm/hooks/accounts/useAccountForm.ts` (validation + OwnerOption role info)
- [ ] `src/modules/crm/components/accounts/AccountOwnersSelect.tsx` (merged hook + dedupe)

**No backend files touched.**

---

## 5. Tradeoff note

- One extra small, cached `GET /users?role_names=admin,superadmin` request fires
  only when a type is selected (shared across all three forms). Negligible cost.
- Backend stays untouched and backward-compatible.
