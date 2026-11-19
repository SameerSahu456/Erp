# Plan — Account Access Requests (Access tab + Request Access flow)

**Date:** 2026-06-16
**Scope:** `comprint-erp-frontend` → `src/modules/crm` (accounts)
**Goal:** Build the **Access** experience in CRM Accounts — a non-owner can request access to an account, and an approver reviews a queue of pending requests — with the UI modeled on the `erp-demo` reference, wired to the **already-implemented backend endpoints**.

---

## 0. Status of the pieces

| Piece | State |
|---|---|
| Backend API | ✅ **Fully implemented** (4 endpoints, table, schemas, service, RBAC, audit) — see §2 |
| Reference UI | ✅ Exists in `erp-demo` (Access tab + Request/Review dialogs) but **mock only** (in-memory `useSyncExternalStore`, no API) |
| Target frontend | ❌ **Not implemented** — only the auto-generated types in `schema.gen.ts` exist; no `endpoints`, `api.ts`, hooks, or components |

This plan is **frontend-only**: build the UI like `erp-demo` and wire it to the real backend. No backend changes required (one optional enhancement noted in §6).

---

## 1. Reference UX (from `erp-demo`)

Files: `erp-demo/src/modules/crm/account-access-shared.ts`, `erp-demo/src/modules/crm/pages/AccountsPage.tsx`, `AccountDetailPage.tsx`.

Three surfaces:

1. **All-Accounts tab → per-row "Access" affordance.** For an account the user does **not** own, a button reflects their request state: `none` → "Request Access", `pending` → "Requested" (disabled), `granted` → opens normally, `rejected` → "Request Access" again. Owners/approvers don't see it.
2. **Request Access dialog.** Non-owner opens it from the row (or the detail page when they hit a locked account), enters a reason, submits. (⚠️ see §3 — the real backend does **not** accept a reason.)
3. **Access tab (approver queue).** A table of **Pending** requests routed to the current approver, columns `Sr.No · Account · Type · Requested By · Reason · Status · Actions`, with inline **Reject / Grant** buttons that open a review dialog (Grant takes no note; Reject requires a note).

The target app already has the **directly analogous** Approval tab (`AccountApprovalTable` + `useAccountApprovals` + `AccountApprovalReviewDialog`) — this feature mirrors that structure almost 1:1, which is the recommended template to copy.

---

## 2. Backend API (already available)

Base: `/api/v1` (router mounted under `/crm`). Source: `comprint-erp-backend/app/modules/crm/api/v1/endpoints.py`.

| # | Method + Path | Permission | Body | Response |
|---|---|---|---|---|
| 1 | `POST /crm/accounts/{account_id}/access-requests` | `crm:read` or `crm:account_read` | **none** | `AccountAccessRequestResponse` (201) |
| 2 | `GET /crm/accounts/access-requests` | `crm:account_approve` | query: `status?`, `account_id?`, `page`, `page_size` | `Paginated<AccountAccessRequestResponse>` |
| 3 | `POST /crm/accounts/access-requests/{request_id}/approve` | `crm:account_approve` | **none** | `AccountAccessRequestResponse` |
| 4 | `POST /crm/accounts/access-requests/{request_id}/reject` | `crm:account_approve` | `{ notes: string }` (1–1000 chars, required) | `AccountAccessRequestResponse` |

**`AccountAccessRequestResponse` shape** (`schemas/account_access_request.py`):
```
id: uuid
status: "Pending" | "Approved" | "Rejected"
requested_at: datetime (ISO, UTC)
account:      { id: uuid, name: string }
requested_by: { id: uuid, name: string }
reviewed_by:  { id: uuid, name: string } | null
reviewed_at:  datetime | null
notes:        string | null
```

**Table:** `account_access_requests` — unique partial index enforces **one Pending per (account, user)**; `status` CHECK in (Pending/Approved/Rejected); soft-delete + timestamps. Guards: account must exist; requester must not already have natural visibility; approve/reject only valid while Pending. All three mutations write audit rows.

**Backend behavior notes (must shape the UI):**
- Approver gating is **permission-based** (`crm:account_approve`) — there is **no per-customer-type routing** like erp-demo's `TYPE_APPROVER` map. The queue shows all pending requests the permission allows.
- Raising a request carries **no payload** (no reason). Reject **requires** `notes`; approve takes none.

---

## 3. Gaps between the reference UI and the real API (decisions needed)

| erp-demo feature | Real API | Resolution |
|---|---|---|
| Request dialog collects a **reason** | `raise` endpoint takes **no body**; response has no `reason` | **Option A (recommended, no backend work):** drop the reason field from the Request dialog — submit is a single confirm. **Option B:** extend backend to accept+store `reason` (see §6). |
| Access-tab **Type** column (customer type) | not in response | Omit the column, **or** fetch it from the account (extra lookup). Recommend omit for v1. |
| Access-tab **Reason** column | not stored | Omit for v1 (or show `notes` only after decision). |
| erp-demo routes by customer type to a specific manager | permission-only | Queue is "all pending I can approve." No routing UI. |
| "Grant" label | endpoint is `approve` | Keep label "Grant"/"Approve" in strings; call the approve endpoint. |

**Recommendation:** ship **v1 against the API as-is** (no reason), columns = `Account · Requested By · Requested At · Status · Actions`. Revisit reason via §6 if product wants it.

---

## 4. Implementation (mirror the existing Approval tab)

### 4.1 Endpoints — `src/shared/api/endpoints.ts`
Add under the existing `crm` account keys (after `accountReject`):
```ts
accountAccessRequests:        (id: string) => `${BASE}/crm/accounts/${id}/access-requests`,
accountAccessRequestsList:    `${BASE}/crm/accounts/access-requests`,
accountAccessRequestApprove:  (rid: string) => `${BASE}/crm/accounts/access-requests/${rid}/approve`,
accountAccessRequestReject:   (rid: string) => `${BASE}/crm/accounts/access-requests/${rid}/reject`,
```

### 4.2 API wrappers — `src/modules/crm/api.ts`
Add a typed section (prefer types from `schema.gen.ts` `components['schemas']['AccountAccessRequestResponse']`, else hand-declare matching §2). Functions, all unwrapping the `ApiResponse` envelope:
- `requestAccountAccess(accountId): Promise<AccountAccessRequest>`
- `fetchAccessRequests(params: { status?; account_id?; page?; page_size? }): Promise<Paginated<AccountAccessRequest>>`
- `approveAccessRequest(requestId): Promise<AccountAccessRequest>`
- `rejectAccessRequest(requestId, notes: string): Promise<AccountAccessRequest>`

### 4.3 Hooks — `src/modules/crm/hooks/accounts/useAccessRequests.ts`
Copy the shape of `useAccountApprovals.ts`:
- `useAccessRequests({ enabled })` — gate on `enabled && can(crm:account_approve)`; `useQuery` keyed `["crm","accounts","access-requests", page, pageSize, status]`; server-paginated; expose `rows`, `total`, `pendingCount`, paging, review dialog state, `approveMut`/`rejectMut` (invalidate the access-requests key + accounts list), `confirmApprove`/`confirmReject` (reject requires non-empty notes), `canApprove`.
- `useRequestAccountAccess()` — `useMutation` calling `requestAccountAccess`; on success toast + invalidate the per-account request state; map the 409 "already pending"/"already has access" errors to friendly toasts.
- Follow **§6.5.1** — no per-hook query-config overrides.

### 4.4 Components — `src/modules/crm/components/accounts/`
- `AccountAccessTable.tsx` — clone `AccountApprovalTable.tsx`; columns `Account · Requested By · Requested At · Status · Actions(Reject/Grant)`; `CrmDataTable` with the **same** `className`/`pageSize`/server-pagination wiring (and apply the column-parity approach from `2026-06-16-account-approval-table-parity.md` so it matches the other tabs).
- `AccountAccessReviewDialog.tsx` — clone `AccountApprovalReviewDialog.tsx`; Grant = confirm only, Reject = required notes textarea.
- `RequestAccountAccessButton.tsx` (or inline cell) — per-row affordance on the All-Accounts tab reflecting `none/pending/granted/rejected`; only for non-owners. v1: single-click `requestAccountAccess` (no reason) with an optional lightweight confirm dialog.

### 4.5 Page wiring — `src/modules/crm/pages/accounts/AccountsPage.tsx`
- Add a third tab value `"access"` alongside `"accounts" | "approval"`; show the tab only when `canApprove` (same gating pattern already used for the Approval tab); keep tab in the URL (`?tab=access`).
- Render `<AccountAccessTable c={access} />` for the access tab; fetch only when active (`enabled: activeTab === "access"`).
- (Optional, if doing the per-row request affordance) add the Access column/cell to `AccountsTable` driven by the viewer's request state.

### 4.6 Strings & RBAC
- All copy → `accounts.strings.ts` (`access.*`: tab label, column labels, dialog titles/buttons, toasts) per **§16.12**. No naked strings.
- Add the permission code to `src/modules/crm/permissions.ts` (`crm:account_approve` for the queue/decisions; `crm:read`/`crm:account_read` already implied for raising). Gate the queue tab + decision buttons via `usePermission`.

### 4.7 Verify against the live backend (§6.7)
Before marking done: run the backend, `curl` each of the 4 endpoints, save JSON, and diff field names against the frontend types. Confirm `GET …/access-requests` returns `application/json` through the Vite proxy. Walk an end-to-end: non-approver raises → approver sees it in the queue → Grant/Reject → row clears.

---

## 5. Files to create / touch

| File | Change |
|---|---|
| `src/shared/api/endpoints.ts` | + 4 access-request endpoint keys |
| `src/modules/crm/api.ts` | + 4 typed wrappers + the `AccountAccessRequest` type |
| `src/modules/crm/hooks/accounts/useAccessRequests.ts` | **new** — queue + mutations (clone of `useAccountApprovals`) |
| `src/modules/crm/components/accounts/AccountAccessTable.tsx` | **new** — approver queue (clone of `AccountApprovalTable`) |
| `src/modules/crm/components/accounts/AccountAccessReviewDialog.tsx` | **new** — Grant/Reject dialog |
| `src/modules/crm/components/accounts/RequestAccountAccessButton.tsx` | **new** (optional v1) — per-row request affordance |
| `src/modules/crm/pages/accounts/AccountsPage.tsx` | + `access` tab + gating + URL sync |
| `src/modules/crm/components/accounts/accounts.strings.ts` | + `access.*` copy |
| `src/modules/crm/permissions.ts` | ensure `crm:account_approve` mapped for the queue |

No backend changes for v1.

---

## 6. Optional backend enhancement (only if product wants "reason")

To bring the request dialog to full parity with `erp-demo`:
- Add an optional `reason` body to `POST /accounts/{id}/access-requests`, store it on `account_access_requests`, and surface it in `AccountAccessRequestResponse`.
- Then the Access tab can show the **Reason** column and the Request dialog regains its textarea.

This is a backend ticket (model column + migration + schema + service) — out of scope for the frontend plan; flag for product decision.

---

## 7. Acceptance criteria

- [ ] A non-owner can raise an access request from the Accounts list; duplicate/pending and already-has-access are handled with friendly toasts (no raw 409).
- [ ] An approver (`crm:account_approve`) sees a **server-paginated** Pending queue under an **Access** tab that is visually consistent with the All-Accounts / Approval tabs (column-parity plan applied).
- [ ] Grant approves with no note; Reject requires a note (1–1000 chars) and blocks empty submits.
- [ ] A decision updates the queue and the requester's per-row state without a manual refresh (targeted invalidation, §16.9).
- [ ] Tab visibility + decision actions are permission-gated; the queue query stays idle off-tab.
- [ ] All copy via `accounts.strings.ts`; timestamps via `formatIST`/`<DateDisplay>`; no naked strings; no per-hook query config.
- [ ] `tsc` + ESLint clean; verified end-to-end against the live backend (§6.7).

---

## 8. Open questions

1. **Reason field** — ship v1 without it (API as-is), or wait on the §6 backend enhancement for full erp-demo parity?
2. **Per-row "Request Access" affordance** — include it in v1, or ship the approver **Access tab** first and add the requester-side button next?
3. **Customer-type routing** — confirm we accept the backend's permission-only model (no per-type approver routing like erp-demo).
