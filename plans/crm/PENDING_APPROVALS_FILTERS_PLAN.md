# Plan — Add Filters to Pending Account Approvals

**Endpoint:** `GET /api/v1/crm/accounts/pending-approvals?page=1&page_size=10`
**Goal:** Add query-parameter filters to the pending-approvals list and wire matching UI:

1. **Entity Type (hierarchy)** — Parent / Child
2. **Industry**
3. **Entity Type (channel)** — Channel Type & End Customer (i.e. `account_type`)

> Note on naming: the request mentions "Entity type" twice meaning two different things.
> - "Entity type which is **parent / child**" → backend concept **`hierarchy_role`** (`parent` | `child`).
> - "Entity type which is **channel type and end customer**" → backend concept **`account_type`** (`End Customer` | `Channel Partner` | `Cloud / Data Center`).
>
> The frontend already labels these two columns "Entity Type" and "Type" respectively, so the UI keeps that vocabulary; the API uses `hierarchy_role` and `account_type`.

---

## ⚠️ Decision Point (resolve before backend work)

The current service hard-filters the pending queue to **root accounts only**:

```python
# account_service.py — list_pending_approvals()
base_filter = (
    AccountModel.approval_status == ACCOUNT_APPROVAL_STATUS_PENDING,
    AccountModel.parent_account_id.is_(None),   # ← only roots are ever returned
    AccountModel.deleted_at.is_(None),
)
```

Because of this, **every pending row today is a "Parent"** — a Parent/Child filter is a no-op until this constraint changes. Two options:

- **Option A (recommended): make `hierarchy_role` drive that constraint.**
  Remove the unconditional `parent_account_id.is_(None)` and instead:
  - `hierarchy_role == "parent"` → `parent_account_id IS NULL`
  - `hierarchy_role == "child"` → `parent_account_id IS NOT NULL`
  - no filter → return both (parents and children awaiting approval)
  This requires confirming that **child accounts can legitimately be pending KYC approval**. If they can, Option A is correct and the filter becomes meaningful.

- **Option B: keep roots-only and drop the Parent/Child filter.**
  If only root accounts are ever pending by design, the Parent/Child filter has nothing to filter — implement only Industry + `account_type`, and surface the Entity-Type filter as disabled / omitted.

**This plan assumes Option A.** If Option B is chosen, skip every `hierarchy_role` step below.

---

## Backend

Project: `comprint-erp-backend` · FastAPI · async SQLAlchemy 2.x · Pydantic v2.

Mirror the existing filter pattern already proven on `GET /accounts`
(`endpoints.py` lines ~556–722) — it already supports `industry`, `account_type`,
and `hierarchy_role`. We are porting a subset of that to the pending-approvals route.

### B1. Endpoint signature — `app/modules/crm/api/v1/endpoints.py`

Function `list_pending_account_approvals` (~line 725). Add three optional query params and validate enums (copy the validation block from `list_accounts` lines ~665–683):

```python
from app.modules.crm.enums import ACCOUNT_TYPES, ACCOUNT_HIERARCHY_ROLES
from app.core.exceptions import ValidationError

@router.get("/accounts/pending-approvals", tags=["crm:accounts"])
async def list_pending_account_approvals(
    service: AccountServiceDep,
    current_user: Annotated[User, Depends(require_permission(codes.CRM_ACCOUNT_APPROVE))],
    params: Annotated[PaginationParams, Depends(PaginationParams)],
    industry: Annotated[str | None, Query(max_length=100)] = None,
    account_type: Annotated[str | None, Query(description="End Customer | Channel Partner | Cloud / Data Center")] = None,
    hierarchy_role: Annotated[str | None, Query(description="parent | child")] = None,
) -> ApiResponse[AccountPendingApprovalListResponse]:
    if account_type is not None and account_type not in ACCOUNT_TYPES:
        raise ValidationError(f"Unknown account_type: {account_type!r}")
    if hierarchy_role is not None and hierarchy_role not in ACCOUNT_HIERARCHY_ROLES:
        raise ValidationError(
            f"Unknown hierarchy_role: {hierarchy_role!r}. Allowed: {list(ACCOUNT_HIERARCHY_ROLES)}"
        )

    items, total = await service.list_pending_approvals(
        offset=params.offset,
        limit=params.limit,
        industry=industry,
        account_type=account_type,
        hierarchy_role=hierarchy_role,
    )
    data = AccountPendingApprovalListResponse(
        items=items, total=total, page=params.page, page_size=params.page_size
    )
    return ApiResponse[AccountPendingApprovalListResponse].ok(data=data)
```

`industry` is free-text (no validation) — consistent with `list_accounts`.

### B2. Service layer — `app/modules/crm/services/account_service.py`

Extend `list_pending_approvals` (~line 700). Build the filter list conditionally and apply identical conditions to **both** the page query and the count query:

```python
async def list_pending_approvals(
    self,
    *,
    offset: int,
    limit: int,
    industry: str | None = None,
    account_type: str | None = None,
    hierarchy_role: str | None = None,
) -> tuple[list[PendingApprovalListItem], int]:
    from sqlalchemy import func
    from app.modules.crm.models.account import Account as AccountModel

    filters = [
        AccountModel.approval_status == ACCOUNT_APPROVAL_STATUS_PENDING,
        AccountModel.deleted_at.is_(None),
    ]

    # Option A: hierarchy_role replaces the old unconditional roots-only filter.
    if hierarchy_role == ACCOUNT_HIERARCHY_ROLE_PARENT:
        filters.append(AccountModel.parent_account_id.is_(None))
    elif hierarchy_role == ACCOUNT_HIERARCHY_ROLE_CHILD:
        filters.append(AccountModel.parent_account_id.is_not(None))
    # else: no hierarchy filter → both parents and children

    if industry:
        filters.append(AccountModel.industry == industry)
    if account_type:
        filters.append(AccountModel.account_type == account_type)

    stmt = (
        select(AccountModel)
        .where(*filters)
        .order_by(AccountModel.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    count_stmt = select(func.count()).select_from(AccountModel).where(*filters)
    # ... rest unchanged (rows, total, name_map, item mapping)
```

Add the enum imports at the top: `ACCOUNT_HIERARCHY_ROLE_PARENT`, `ACCOUNT_HIERARCHY_ROLE_CHILD` from `app.modules.crm.enums`.

> If **Option B** is chosen instead: keep `parent_account_id.is_(None)` unconditionally and drop the `hierarchy_role` param entirely.

### B3. Schemas — no change required

`PendingApprovalListItem` / `AccountPendingApprovalListResponse`
(`schemas/account.py` ~line 657) already expose `account_type`, `industry`, and
`parent_account_id`, which is all the UI needs. No response change.

### B4. Tests — `comprint-erp-backend/tests/.../crm`

Add cases to the pending-approvals test:
- `industry=` returns only matching-industry pending accounts.
- `account_type=Channel Partner` returns only channel partners; `End Customer` only end customers.
- `hierarchy_role=parent` returns only `parent_account_id IS NULL`; `child` only non-null. (Requires seeding at least one pending child account — also validates the Option A behaviour change.)
- Invalid `account_type` / `hierarchy_role` → 422/ValidationError.
- Filters compose (e.g. `industry=IT Services&account_type=End Customer`).
- Count matches filtered page total.

### B5. OpenAPI

After backend changes, the schema updates automatically. Frontend must run `pnpm api:gen` (backend running on `:8000`) so generated types pick up the new query params — though these are query params, not body, so `schema.gen.ts` mainly documents them; the hand-written `api.ts` wrapper is what carries them (see F1).

---

## Frontend

Project: `comprint-erp-frontend` · React 19 · TanStack Query v5 · TS strict.
**Read `Coding-guideline.md` §6.5.1, §6.7, §16.6–§16.12, §8.4–§8.7 before coding** (per `CLAUDE.md`).

Mirror the proven filter wiring in `hooks/accounts/useAccountsList.ts` +
`components/accounts/AccountsTable.tsx`. The approvals table already declares the
three columns as `filterable: true` but nothing is wired yet.

### F1. API client — `src/modules/crm/api.ts`

Extend `fetchPendingApprovals` (~line 763) to accept and pass the new params:

```ts
export async function fetchPendingApprovals(
  params: {
    page?: number
    page_size?: number
    industry?: string
    account_type?: AccountTypeWire
    hierarchy_role?: AccountHierarchyRole
  } = {},
): Promise<AccountPendingApprovalListResponse> {
  return apiClient.get<AccountPendingApprovalListResponse>(
    endpoints.crm.accountsPendingApprovals,
    {
      params: {
        page: params.page ?? 1,
        page_size: params.page_size ?? PAGINATION.DEFAULT_PAGE_SIZE,
        industry: params.industry || undefined,
        account_type: params.account_type || undefined,
        hierarchy_role: params.hierarchy_role || undefined,
      },
    },
  )
}
```

Reuse existing types: `AccountTypeWire`, `ACCOUNT_TYPE_VALUES`, `INDUSTRY_OPTIONS`
(api.ts ~lines 356/374/383) and `AccountHierarchyRole` (already used by `useAccountsList`).

### F2. Hook — `src/modules/crm/hooks/accounts/useAccountApprovals.ts`

Add filter state and feed it into the query. Keep the existing `?ap_page` URL key
pattern; add sibling URL keys so filters survive navigation (use the project's
URL-filter hooks as in `useAccountsList`, or local `useState` if simpler — but
URL is preferred for shareability and matches §16.7 "reset to page 1 on filter change").

Key changes:
- Add state: `industry` (free-text/select), `accountType` (`ALL`|value), `hierarchyRole` (`ALL`|`parent`|`child`).
- Reset `ap_page` to 1 whenever any filter changes.
- Add filters to the query key and pass to `fetchPendingApprovals`:

```ts
const { data, ... } = useQuery({
  queryKey: [...PENDING_KEY, page, pageSize, industry, accountType, hierarchyRole],
  queryFn: () => fetchPendingApprovals({
    page, page_size: pageSize,
    industry: industry || undefined,
    account_type: accountType !== ALL ? (accountType as AccountTypeWire) : undefined,
    hierarchy_role: hierarchyRole !== ALL ? (hierarchyRole as AccountHierarchyRole) : undefined,
  }),
  enabled: active,
})
```

- Build a `toolbarFilters: ToolbarFilter[]` array (mirror `useAccountsList` lines ~149–215):
  - **Entity Type** → key `hierarchy_role`, options `[{value:"parent",label:"Parent"},{value:"child",label:"Child"}]`
  - **Industry** → key `industry`, options from `INDUSTRY_OPTIONS`
  - **Type** → key `account_type`, options from `ACCOUNT_TYPE_VALUES` (Channel Partner / End Customer / Cloud · Data Center)
- Add `handleToolbarFilterChange(key, value)` and `handleClearFilters`.
- Return the new fields from the memoized controller object (and add them to the deps array).

### F3. Table component — `src/modules/crm/components/accounts/AccountApprovalTable.tsx`

Wire the controller's filters into `<CrmDataTable>` (mirror `AccountsTable.tsx` lines ~151–179):

```tsx
<CrmDataTable
  ...
  toolbarFilters={c.toolbarFilters}
  onToolbarFilterChange={c.handleToolbarFilterChange}
  onClearFilters={c.handleClearFilters}
  ...
/>
```

The columns are already marked `filterable`; the toolbar (`CrmTableToolbar.tsx`)
renders the native `Select` dropdowns automatically from `toolbarFilters`.

### F4. Strings — `src/modules/crm/components/accounts/accounts.strings.ts`

Per §16.12 (no naked strings) add labels and reuse where possible:
`entityTypeLabel: "Entity Type"`, `entityTypeAll`, `industryLabel`/`industryAll`
(may already exist), `channelTypeLabel: "Type"` / `channelTypeAll`. Route the
filter labels/`allLabel` through these constants in the hook.

### F5. Verify end-to-end (§6.7)

1. `pnpm api:gen` against running backend (`:8000`).
2. `curl` the endpoint with each filter and confirm the JSON narrows correctly
   (use the bearer token from the original request; backend on `:8002`):
   - `?account_type=Channel%20Partner`
   - `?industry=IT%20Services`
   - `?hierarchy_role=child`
   - combined
3. In the UI (`:5173`): open Accounts → Approval tab, exercise each dropdown,
   confirm the list refetches, page resets to 1, and Clear resets all.
4. `pnpm typecheck && pnpm lint && pnpm test`.

---

## Summary of touched files

| Layer | File | Change |
|-------|------|--------|
| BE | `app/modules/crm/api/v1/endpoints.py` | Add 3 query params + enum validation on `list_pending_account_approvals` |
| BE | `app/modules/crm/services/account_service.py` | Conditional filters in `list_pending_approvals` (page + count) |
| BE | `tests/.../crm` (pending-approvals test) | Filter + validation + compose cases |
| FE | `src/modules/crm/api.ts` | Extend `fetchPendingApprovals` params |
| FE | `src/modules/crm/hooks/accounts/useAccountApprovals.ts` | Filter state, query key, `toolbarFilters`, handlers |
| FE | `src/modules/crm/components/accounts/AccountApprovalTable.tsx` | Pass `toolbarFilters` / change / clear to `CrmDataTable` |
| FE | `src/modules/crm/components/accounts/accounts.strings.ts` | Filter labels (no naked strings) |

## Out of scope / assumptions
- Industry is filtered by exact match (mirrors `list_accounts`), not fuzzy search.
- Assumes **Option A** (hierarchy filter relaxes the roots-only constraint). Confirm with product whether child accounts can be pending KYC; if not, use Option B and drop the Parent/Child filter.
- No new permission — keeps `crm:account_approve`.
- No DB/migration changes — all needed columns (`industry`, `account_type`, `parent_account_id`) already exist.
