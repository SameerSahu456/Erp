# Plan — Make the Account Approval table match the Accounts table

**Date:** 2026-06-16
**Scope:** `src/modules/crm` — Accounts list (`AccountsTable`) vs. Accounts → Approval tab (`AccountApprovalTable`)
**Goal:** The Approval tab should read as the *same table* as the All-Accounts tab — same density, column widths, row height, badges, and chrome — by sharing one column/formatter definition instead of two hand-rolled configs.

---

## 1. Current state (what's actually happening)

Both tabs live on `AccountsPage` (`?tab=approval`) and **already render through the same component**, `CrmDataTable` (`components/crm/shared/CrmDataTable.tsx`). So "reuse the same component" is already true — the problem is that the **two call sites configure it differently**, so they look different.

| Aspect | `AccountsTable.tsx` (All Accounts) | `AccountApprovalTable.tsx` (Approval) |
|---|---|---|
| `className` | `cpt-compact crm-premium-table accounts-list-table` | `cpt-compact crm-premium-table` (no `accounts-list-table`) |
| Columns | **10** — name, entityType, industry, type, owners, status, approvalStatus, categoriesInterested, categoriesBought, tag | **7** — name, entityType, industry, type, submittedBy, status, actions |
| Column `width` hints | none (all auto) | none (all auto) |
| Toolbar | search + status/type/tag filters + owner multiselect + date range | **none** |
| `type` cell | raw text (no formatter) | rendered as a `<Badge>` |
| Column labels | from `accounts.strings.ts` (`S.list.columns.*`) | **hardcoded strings** (violates Coding-guideline §16.12) |
| Data source | `useAccountsList` → `GET /crm/accounts` (full rows) | `useAccountApprovals` → `GET /crm/accounts/pending-approvals` (slim `PendingApprovalListItem`) |

### Why the Approval table "has more space"

The table renders with the browser default **`table-layout: auto`** and **no per-column `width`** (`CrmTableGrid.tsx` only sets `style={{ width: col.width }}`, which is `undefined` for every account column). With auto layout:

- The **All Accounts** tab has 10 columns, two of which (owners, categories) hold wide pill content, so the row fills (and usually overflows to the horizontal scroll that `.cpt-compact` forces) → looks **dense**.
- The **Approval** tab has only 7 columns of short text, so the browser **distributes the full container width across fewer/narrower columns** → big inter-column gaps → looks **spaced out**.

It is **not** a padding/density difference — both share `.cpt-compact` (`padding: 8px 10px`, `font-size: 12.5px`, `white-space: nowrap`). It is purely **column count + the absence of width constraints**. Two confirming details:

- `crm-premium-table` and `accounts-list-table` have **no CSS rules** anywhere in `src/styles/` — they are inert marker classes. Adding/removing `accounts-list-table` changes nothing today (but see Task 4 — keep it for parity/future hooks).
- The missing toolbar removes the search/filter row at the top, which also makes the two tabs feel different above the grid.

---

## 2. Approach

Single source of truth for the account row's columns + cell rendering, consumed by both tables. The Approval tab becomes "the same columns as Accounts, with a trailing Actions column and a Pending-only filter," so they match **by construction** rather than by two configs kept in sync by hand.

Recommended: **Option B**. Option A is the fast partial fix if we only want to kill the spacing now.

### Option A — Minimal: constrain column widths + add the toolbar (low effort)
Make column distribution deterministic so it no longer depends on column count.

1. Add explicit `width` to the shared columns (e.g. `name: "20%"`, `industry: "12%"`, `type: "12%"`, …) **or** introduce a `table-layout: fixed` rule on a shared class so auto-layout stops stretching.
2. Give the Approval tab the same `toolbarLayout`/search affordance (or intentionally hide it on both).
3. Add `accounts-list-table` to the Approval `className` for parity.

Pros: ~1 file, fixes the visible gap fast. Cons: still two column lists to keep in sync; cell rendering (type badge, labels) still diverges.

### Option B — Recommended: extract a shared column + formatter definition (true reuse)

1. **New file** `components/accounts/accountsTableColumns.tsx` exporting:
   - `buildAccountColumns(opts: { withActions?: boolean }): ColumnDef[]` — the canonical column list with labels from `accounts.strings.ts` and explicit `width` hints. When `withActions`, append `{ key: "actions", label: "", align: "right", width: "140px" }`.
   - `accountCellFormatter: CellFormatter` — the canonical cell rendering (name uppercase, entityType Badge, status `StatusBadge`, approvalStatus `StatusBadge`, tag, owners/categories `OverflowPillList`, **type Badge** — unify on one style). Accept an optional `renderActions?` callback for the approval row buttons.
2. **`AccountsTable.tsx`** — replace its inline `columns` + `cellFormatter` with `buildAccountColumns()` + `accountCellFormatter`.
3. **`AccountApprovalTable.tsx`** — use `buildAccountColumns({ withActions: true })` + `accountCellFormatter` (passing `renderActions` for the Approve/Reject buttons). Match `className` (`...accounts-list-table`).
4. **Row shape parity** — map `PendingApprovalListItem` into the same row keys the columns expect. The slim pending payload lacks `owners`, `categories_interested/bought`, `tag`, and `approval_status`. Two choices (pick one in review):
   - **(b1)** Render the *same* column set, filling the missing fields with empty/`—` (owners `[]`, categories `[]`, tag `null`, approvalStatus `"Pending"`). Columns line up 1:1 with All Accounts → identical look. Simplest path to "same table."
   - **(b2)** Ask backend to add the missing fields to `/pending-approvals` so the columns carry real data. More work; only if product wants owners/categories visible in the queue.
   - Recommendation: **b1** now (matches the user's ask — same look), leave b2 as a follow-up if the data is wanted.
5. **Strings** — move the Approval tab's hardcoded labels into `accounts.strings.ts` (e.g. `S.list.columns.submittedBy`, `S.approval.actions.*`) per §16.12; the shared column builder reads from there.

---

## 3. Files to touch

| File | Change |
|---|---|
| `components/accounts/accountsTableColumns.tsx` | **New** — `buildAccountColumns()` + `accountCellFormatter` (shared) |
| `components/accounts/AccountsTable.tsx` | Consume shared columns/formatter; remove inline duplicates |
| `components/accounts/AccountApprovalTable.tsx` | Consume shared columns/formatter (`withActions`); align `className`; pass `renderActions` |
| `components/accounts/accounts.strings.ts` | Add `submittedBy` + approval action labels; keep existing `approval` column label |
| `hooks/accounts/useAccountApprovals.ts` | Map `PendingApprovalListItem` → shared row shape (option b1 fallbacks) |
| `src/styles/comprint.css` *(only if Option A width route via `table-layout: fixed`)* | Add a fixed-layout rule scoped to the shared table class |

No change to `CrmDataTable` / `CrmTableGrid` themselves — the component is already shared.

---

## 4. Acceptance criteria

- [ ] Approval tab and All-Accounts tab show **identical column widths and row height** at the same viewport (no wider gaps on Approval).
- [ ] The shared columns are defined **once**; both tables import them.
- [ ] `type` (and every shared cell) renders with the **same badge/text style** on both tabs.
- [ ] All column labels come from `accounts.strings.ts` — **no hardcoded strings** (§16.12 clean).
- [ ] Approval tab keeps its **Approve/Reject actions** column and the row-click → detail (`?from=approval`) behavior.
- [ ] No horizontal-scroll regression on either tab at the narrowest supported width (§8.7).
- [ ] `tsc` clean; ESLint clean (no new `i18next/no-literal-string` warnings in the touched files).

---

## 5. Out of scope / follow-ups

- Backend enrichment of `/pending-approvals` with owners/categories/tag (option b2) — only if product wants those columns populated in the queue.
- Any change to the shared `CrmDataTable` density tokens (would affect every CRM list).
- Decision on whether the Approval tab should also get search/filters (currently none) — propose matching All-Accounts' search at least, decide in review.

---

## 6. Open questions for the user

1. **Same columns, or queue-specific?** Should the Approval queue show the *full* account column set (owners, categories, tag, approval) with empty fallbacks (b1, exact visual match), or stay a leaner queue (name / type / submitted-by / actions) but with the spacing fixed via fixed widths (Option A)?
2. **Search/filters on the Approval tab** — add them to match All Accounts, or intentionally keep the queue filter-free?
