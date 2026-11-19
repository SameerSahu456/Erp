# Account Approval — Make It Dynamic (Frontend-only)

**Date:** 2026-06-16
**Status:** ✅ Implemented 2026-06-16 (Phases 1–3). Typecheck + lint clean on all
changed files.
**Scope:** Frontend only. **No backend changes.** Wire the account-approval UI
(currently static/hardcoded) to the real backend APIs and delete the temporary
scaffolding added during the static phase.

---

## 1. Goal

Replace the static/preview approval wiring with live API calls so that:

1. **All Accounts tab** — fetches accounts (already dynamic; **left as-is**, keeps
   showing all accounts regardless of approval state — *decision: no status filter*).
2. **Approval tab** — fetches the real pending queue from
   `GET /crm/accounts/pending-approvals` and can **Approve / Reject** inline.
3. **Account detail page** — reads `approval_status` + decision metadata straight
   off the account response, and **Approve / Reject** call the real endpoints.
4. **Decider/submitter names** — come **embedded from the API** as `{id, name}`
   (`UserEmbed`), so no client-side name resolution is needed. *(backend updated
   2026-06-16 — see §2)*

---

## 2. Backend API reference (already in place — do not modify)

| Action | Method + path | Auth | Body / params | Returns |
|---|---|---|---|---|
| List pending | `GET /crm/accounts/pending-approvals` | `crm:account_approve` | `page`, `page_size` | `Paginated<PendingApprovalListItem>` |
| Approve | `POST /crm/accounts/{id}/approve` | `crm:account_approve` | `{}` | `AccountResponse` |
| Reject | `POST /crm/accounts/{id}/reject` | `crm:account_approve` | `{ reason }` (1–1000, required) | `AccountResponse` |
| Detail | `GET /crm/accounts/{id}` | `crm:account_read` | — | `AccountResponse` |

**`AccountResponse` approval fields (wire names):**
`approval_status` (`Pending` \| `Approved` \| `Rejected`),
**`approval_by`** (`UserEmbed { id, name } \| null` — decider, name embedded),
`approval_at` (datetime \| null), `approval_reason` (string \| null).

**`PendingApprovalListItem` (slim):**
`id, code, name, account_type, industry, gst_number, pan_number,
parent_account_id,` **`created_by` (`UserEmbed { id, name }`)**`, created_at`.
→ No revenue/website/owner, but **submitter name IS available** via `created_by.name`.

**`UserEmbed`** = `{ id: uuid, name: string }` — `name` is first+last (falls back
to email); `"(deleted)"` if the user was soft-deleted. Maps to the FE's existing
`CrmIdNameRef` type.

Behavioural notes: approve/reject **cascade to child accounts** and unblock /
reject related Pending sales orders. The pending list returns **root accounts only**.
New accounts & lead-conversions default to `approval_status='Pending'`.

---

## 3. Gaps & how we handle them (frontend-only)

| Gap | Handling (this round) |
|---|---|
| ~~No name for decider/submitter~~ | **RESOLVED by backend (2026-06-16).** `approval_by` and `created_by` are now `UserEmbed { id, name }`. Read `.name` directly — **no client-side resolver needed**. |
| `PendingApprovalListItem` has no revenue/website/owner | Approval table renders only the fields the API provides: name, type, industry, entity type (from `parent_account_id`), **Submitted By = `created_by.name`**, created date. Drop columns we can't fill. |
| Rich review **dialog** can't be filled from the slim list | Row click already navigates to the **detail page** (full `AccountResponse`). **Remove** `AccountApprovalReviewDialog` from the flow (delete or stop rendering). |
| All Accounts list not filtered by approval status | **Leave as-is** (decision). Pending/rejected may appear there too. |

---

## 4. Temporary / hardcoded code to REMOVE (added during the static phase)

1. **`components/accounts/AccountOverviewTab.tsx`**
   - Remove the static **"Approved By: Vikram Singh"** row + its `CheckCircle2`
     import. Replace with the dynamic decider name (`account.approval_by?.name`)
     or drop the row (decided in Phase 3).
2. **`pages/accounts/AccountDetailPage.tsx`**
   - Remove the `?approval_status=` **preview query-param fallback**.
   - Remove the local `decision` `useState` + `new Date().toISOString()` capture
     + the `deciderName` local capture used to fake metadata.
   - Keep `backHref` → approval tab, but base it on real origin (see Phase 3).
3. **`modules/crm/api.ts`**
   - Replace the guessed approval fields on `AccountResponse`:
     `approval_decided_by` / `approval_decided_at` → **`approval_by: CrmIdNameRef | null`**,
     **`approval_at`**, `approval_reason` (keep `approval_status`). Make
     `approval_status: AccountApprovalStatus` (required-nullable) to match the wire.
4. **`data/accountApprovals.ts`**
   - The rich static `AccountApproval` shape (revenue, website, city, companySize,
     employees, documents, submittedByRole, routedToRole) — slim it to the real
     `PendingApprovalListItem` (with `created_by: CrmIdNameRef`), or replace
     entirely with the API type in `api.ts`.
5. **`hooks/accounts/useAccountApprovals.ts`**
   - Remove the **"source from real accounts list"** stand-in (`useAccounts` +
     `toApprovalRow`) and the toast-only `confirmApprove/confirmReject`. Replace
     with the real pending-approvals query + approve/reject mutations.

---

## 5. Implementation plan (phased)

### Phase 1 — API layer
**Files:** `src/shared/api/endpoints.ts`, `src/modules/crm/api.ts`

- `endpoints.crm`: add
  - `accountsPendingApprovals: ${BASE}/crm/accounts/pending-approvals`
  - `accountApprove: (id) => ${BASE}/crm/accounts/${id}/approve`
  - `accountReject: (id) => ${BASE}/crm/accounts/${id}/reject`
- `crm/api.ts`:
  - Types: `PendingApprovalListItem`, `AccountPendingApprovalListResponse`
    (`PaginatedResponse<PendingApprovalListItem>`); fix `AccountResponse` approval
    field names (see §4.3).
  - Functions:
    - `fetchPendingApprovals(params): Promise<AccountPendingApprovalListResponse>`
    - `approveAccount(id): Promise<AccountResponse>`
    - `rejectAccount(id, reason): Promise<AccountResponse>`

### Phase 2 — Approval tab dynamic
**Files:** `hooks/accounts/useAccountApprovals.ts`, `components/accounts/AccountApprovalTable.tsx`,
`data/accountApprovals.ts`, (delete) `AccountApprovalReviewDialog.tsx` usage

- `useAccountApprovals`: `useInfiniteQuery` on `fetchPendingApprovals`
  (§16.11 — paginated, `PAGINATION.DEFAULT_PAGE_SIZE`); expose `rows`,
  `pendingCount` (= total), `canApprove`, and `approveMut` / `rejectMut`
  (mutations that invalidate `pending-approvals` + accounts list + the detail).
- `AccountApprovalTable`: render only API-backed columns; **Submitted By =
  `created_by.name`** (embedded, no lookup); **row click → `/crm/accounts/{id}`**
  (real id, no preview param). Inline Approve/Reject call the mutations (Reject
  opens a reason input — required).
- Remove the review-dialog path (slim data can't fill it; detail page replaces it).

### Phase 3 — Detail page dynamic
**Files:** `pages/accounts/AccountDetailPage.tsx`, `components/accounts/AccountApprovalBanner.tsx`,
`components/accounts/AccountOverviewTab.tsx`, (maybe) `hooks/accounts/useAccountDetail.ts`

- Read `account.approval_status` / `approval_by` / `approval_at` /
  `approval_reason` directly from the response. Delete the `?approval_status=`
  param + local `decision` state.
- Pass `decidedBy = account.approval_by?.name`, `decidedAt = account.approval_at`,
  `reason = account.approval_reason` to `AccountApprovalBanner` (banner UI already
  supports them). No client-side name lookup.
- Approve/Reject → `approveAccount` / `rejectAccount` mutations, then
  `invalidate(detail)`; the refetched account drives the banner + header pill
  (no local override).
- `AccountOverviewTab`: make "Approved By" dynamic from `account.approval_by?.name`
  (or remove the static row).
- `backHref`: keep returning to the Approval tab when arriving from it — base it
  on router state/origin rather than the (removed) preview param. Fallback:
  navigate(-1) or a `from=approval` flag set by the table row.

### Phase 4 — Verify
- `pnpm typecheck` + `pnpm lint` clean on all touched files.
- Manual E2E: create/convert → account is `Pending` → appears in Approval tab →
  Approve → status flips to Approved on detail + list; Reject (with reason) →
  Rejected + reason/by/at render. Confirm names resolve (not UUIDs).
- Confirm permissions: non-approvers don't see the Approval tab / action buttons.

---

## 6. Out of scope (explicitly deferred)

- **Any backend change** — e.g. an `approval_status` filter on `GET /crm/accounts`.
  (Revisit later to filter the All Accounts tab.)
- `api:gen` — CRM types are hand-written in `crm/api.ts`, so no schema regen needed.

---

## 7. Open follow-ups (future)
- ~~Backend `{id,name}` embed for approval/submitter~~ — **DONE 2026-06-16**
  (`approval_by` + `created_by` are now `UserEmbed`).
- `approval_status` query filter so All Accounts shows Approved only.
- Optional: badge the All Accounts rows with their approval state.
