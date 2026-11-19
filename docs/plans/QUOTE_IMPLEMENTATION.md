# Quote API Integration — Implementation Plan

**Status:** Draft, awaiting sign-off
**Owner:** Frontend
**Backend:** Already shipped (QUOTE-1 base layer, see `comprint-erp-backend/app/modules/crm/api/v1/endpoints.py:1365-1634`)
**Pages affected:** `/crm/quotes` (list), `/crm/quotes/new` (create), `/crm/quotes/:id/edit` (view + amend)

---

## 1. Requirements (as captured from request)

### 1.1 List page — `/crm/quotes`
- Replace mock `quotes` array with `GET /api/v1/crm/quotes` (paginated).
- Index page must call this API and render the rows.

### 1.2 Create page — `/crm/quotes/new`
- Wire the existing form UI to `POST /api/v1/crm/quotes`.
- The UI may differ from the API shape — it must be adapted.
- Body fields and rules:

| Field | Source on the form | Behavior |
|---|---|---|
| `quotable_type` | derived | `'account'` when account dropdown is used; `'lead'` when a `lead` id is present in input; `'deal'` when a `deal` id is present. |
| `quotable_id` | derived | UUID from the matching field (account dropdown id, or lead id, or deal id). |
| Account dropdown | UX rule | **Disabled** when a `lead` or `deal` id is set — the polymorphic upstream party is exclusive. |
| `valid_until` | the "Valid Until" date input | optional |
| `terms_conditions` | the "Terms and Conditions" input | optional |
| `notes` | the "Notes" input | optional |
| `items[]` | line items array | see §1.3 |

### 1.3 Line items (each row)

| Field | Source | Rules |
|---|---|---|
| `part_variant_id` | the static "Part Number" dropdown | the option's id. Dropdown is static now; same code must keep working when replaced with an API-backed variant picker later. |
| `category_id` | derived | **Case 1**: a part is picked → take `category_id` from the option (the dummy response shape includes `category_id`). If the existing static mock options don't have one, **add a dummy `category_id` UUID per option** so the shape matches the eventual real API. **Case 2**: no part picked → user must select a category from a dropdown that calls `GET /api/v1/ims/categories`. |
| `item_name` | the Name text input | When a part is picked, auto-fill from the option's `name`; user can still edit. (Name is a **text box, not a dropdown**.) |
| `description` | the Description input | When a part is picked, auto-fill from the option's `description`; user can still edit. |
| `qty` | Qty input | default **1**, **never less than 1** — clearing the field reverts to 1. |
| `rate` | Rate input | the unit price entered by user. |
| `tax_rate` | Tax input | default **18**, user-editable, **driven by a global constant** so we can change the default in one place. |
| `sort_order` | array index | not shown in UI; sent as the line's position (0-based or 1-based — see §6 Decisions). |

**Component sub-rows on the form:** UI exists for adding components inside a line item; **leave as-is for this iteration.** No API binding.

### 1.4 Save behavior
- Add a **Save** button that posts the form.
- Auto-save (the existing inline indicator) should be removed or repurposed once Save is wired.

### 1.5 View / edit / amend on `/crm/quotes/:id/edit`
- On open, call `GET /api/v1/crm/quotes/:id` so the embedded line items render.
- **Amend button** must call the version API: `POST /api/v1/crm/quotes/:id/version` where `:id` is the source quote. Existing UI continues to work; only the action behind the Amend button changes.

---

## 2. Backend contract (verified live, 2026-05-06)

Source: `comprint-erp-backend/app/modules/crm/api/v1/endpoints.py` and `app/modules/crm/schemas/quote.py`.
OpenAPI confirmed at `http://localhost:8000/openapi.json`.

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/v1/crm/quotes` | Create Draft quote (optionally with inline items in one transaction). |
| `GET`  | `/api/v1/crm/quotes` | Paginated list. Filters: `search`, `status`, `quotable_type`, `quotable_id`, `created_by`, `sort`. |
| `GET`  | `/api/v1/crm/quotes/{id}` | Detail with embedded `items[]`. |
| `PATCH`| `/api/v1/crm/quotes/{id}` | Partial update; **Draft only**. Items array is upsert-only (never auto-deletes). |
| `DELETE` | `/api/v1/crm/quotes/{id}` | Soft delete; **Draft only**. |
| `POST` | `/api/v1/crm/quotes/{id}/items` | Add one line item. |
| `PATCH` | `/api/v1/crm/quotes/{id}/items/{item_id}` | Update one line item; **Draft only**. `part_variant_id` and `category_id` are frozen. |
| `DELETE` | `/api/v1/crm/quotes/{id}/items/{item_id}` | Soft delete a line item; **Draft only**. |
| `POST` | `/api/v1/crm/quotes/{id}/version` | Spawn v(N+1) Draft. **Source must be `Rejected`.** Returns 400 `QUOTE_INVALID_TRANSITION` otherwise. |
| `GET`  | `/api/v1/crm/quotes/{id}/versions` | Full version chain. |
| `PATCH` | `/api/v1/crm/quotes/{id}/status` | Transition Draft→Sent, Sent→Accepted, Sent→Rejected. |

### 2.1 `QuoteCreate` body (from `schemas/quote.py:193`)

```jsonc
{
  "quotable_type": "account" | "deal" | "lead",
  "quotable_id":   "<uuid>",
  "valid_until":   "2026-06-30",          // optional ISO date
  "terms_conditions": "string | null",
  "notes":         "string | null",
  "items": [ /* QuoteItemCreate */ ]      // optional, max 50
}
```

`quote_number`, `status`, `created_by` are server-set — sending them returns 422 (`extra='forbid'`).

### 2.2 `QuoteItemCreate` — two payload modes

**Catalog row** (variant-driven):
```jsonc
{ "part_variant_id": "<uuid>", "qty": 2 }
```
Service auto-fills `item_name` / `description` / `rate` / `tax_rate` / `category_id` from the variant + parent part + HSN.
**`rate`, `tax_rate`, `category_id` are NOT overridable** — frozen at create per spec §B5.
Returns 422 `QUOTE_ITEM_PRICE_MISSING` if the variant's `sell_price` is NULL.

**Freeform row** (manual):
```jsonc
{
  "category_id": "<uuid>",      // required
  "item_name":   "string",      // required, 1..255
  "description": "string|null",
  "qty":         1,             // required, > 0
  "rate":        0,             // required, >= 0
  "tax_rate":    18,            // optional; defaults to 0 if omitted
  "sort_order":  0
}
```

### 2.3 ⚠️ Critical compatibility decision — catalog vs freeform

The user spec says **rate is user-entered** and **tax_rate defaults to 18 with user override**. That is **incompatible with catalog mode** — sending `part_variant_id` causes the backend to ignore `rate`/`tax_rate` and use the variant's `sell_price` + HSN tax.

**Recommendation: use freeform mode for now.** Do **not** send `part_variant_id` in the create payload, even when a part is picked. Instead, copy the picked option's `category_id` / `name` / `description` into the freeform fields. The user keeps editable rate + tax_rate. We can store the picked id locally for UI display but not transmit it.

**Future:** when a real variant-aware picker is wired, decide either to (a) keep freeform and accept that variant linkage is lost, or (b) switch to catalog mode and disable rate/tax_rate inputs. That's a separate ticket.

### 2.4 ⚠️ Critical: Amend / version requires `Rejected` status

`POST /quotes/{id}/version` is **only** legal when the source quote is in `Rejected` state (per spec §B10 and the endpoint docstring). Calling it on Draft / Sent / Accepted returns **400 `QUOTE_INVALID_TRANSITION`**.

Two options:
1. **Hide the Amend button** unless `quote.status === 'Rejected'`.
2. **Show always**, surface the 400 as a toast.

**Recommendation: option 1.** It matches what the backend permits and avoids broken UX. The UI can show a tooltip on disabled Amend explaining why ("Quote must be Rejected to amend").

---

## 3. Files to add / change

### 3.1 New / modified — frontend module

```
src/shared/constants/
├── index.ts                                  [MODIFY] re-export TAXES
└── taxes.ts                                  [NEW]    DEFAULT_TAX_RATE = 18

src/modules/crm/
├── api.ts                                    [MODIFY] add quote types + fetchers
├── hooks/
│   └── useQuotes.ts                          [NEW]    list / detail / create / update / delete / version / item CRUD
├── pages/
│   ├── QuotesPage.tsx                        [MODIFY] swap mock data for useQuotes()
│   └── QuoteFormPage.tsx                     [MODIFY] wire create + edit + amend
├── components/
│   ├── QuoteBuilderPanel.tsx                 [MODIFY] form-state → API payload mapper, Save button, account-dropdown enable/disable rule, line-item form rules (qty min 1, default tax 18, etc.)
│   ├── PartLineFields.tsx                    [MODIFY] propagate selected option's category_id + name + description up to parent; dropdown can stay static
│   └── QuoteCategorySelect.tsx               [NEW]    fallback category dropdown for freeform rows; calls GET /ims/categories via existing useCategories
└── data/
    ├── quotes.ts                             [DELETE] (or move to fixtures/dev-only)
    └── (static parts mock used by PartLineFields) [MODIFY] add `category_id: <uuid>` to every option
```

### 3.2 No backend changes
The backend already exposes everything we need. This plan is frontend-only.

---

## 4. Step-by-step plan

Phases run in order. Each phase ends with a typecheck + manual smoke step.

### Phase 0 — Pre-flight (per `Coding-guideline.md` §6.7)

0.1. ☑ Already done: live curl against `/openapi.json` confirmed routes + param shapes.
0.2. Confirm `pnpm api:gen` was run after the most recent backend deploy (regenerates `src/shared/api/schema.gen.ts`).
0.3. Confirm with user — sign off on the two ⚠️ decisions in §2.3 and §2.4.

### Phase 1 — Shared scaffolding

1.1. **`src/shared/constants/taxes.ts`** — export `TAXES = { DEFAULT_TAX_RATE: 18 } as const`.
1.2. Re-export from `src/shared/constants/index.ts`.
1.3. **`src/modules/crm/api.ts`** — add types + fetchers (mirror existing `fetchAccounts` / `fetchLeads` style):

```ts
// types
export type QuoteStatus = "Draft" | "Sent" | "Accepted" | "Rejected"
export type QuotableType = "account" | "deal" | "lead"

export interface QuoteItemWire { /* mirror QuoteItemResponse */ }
export interface QuoteWire { /* mirror QuoteResponse, includes items[] */ }
export interface QuoteListItemWire { /* mirror QuoteListItem */ }
export interface QuotesListResponse { items: QuoteListItemWire[]; total: number; page: number; page_size: number }

export interface FetchQuotesParams { page?: number; page_size?: number; search?: string;
  status?: QuoteStatus; quotable_type?: QuotableType; quotable_id?: string; created_by?: string;
  sort?: string }

export interface QuoteItemCreatePayload {
  part_variant_id?: string | null
  category_id?: string | null     // required for freeform
  item_name?: string | null       // required for freeform
  description?: string | null
  qty: number
  rate?: number | null
  tax_rate?: number | null
  sort_order?: number
}

export interface QuoteCreatePayload {
  quotable_type: QuotableType
  quotable_id: string
  valid_until?: string | null     // ISO date "YYYY-MM-DD"
  terms_conditions?: string | null
  notes?: string | null
  items?: QuoteItemCreatePayload[]
}

export interface QuoteUpdatePayload { /* same shape, all optional, items is upsert array */ }

// fetchers
export async function fetchQuotes(params: FetchQuotesParams = {}): Promise<QuotesListResponse>
export async function fetchQuote(id: string): Promise<QuoteWire>
export async function createQuote(body: QuoteCreatePayload): Promise<QuoteWire>
export async function updateQuote(id: string, body: QuoteUpdatePayload): Promise<QuoteWire>
export async function deleteQuote(id: string): Promise<void>
export async function addQuoteItem(quoteId: string, body: QuoteItemCreatePayload): Promise<QuoteItemWire>
export async function updateQuoteItem(quoteId: string, itemId: string, body: Partial<QuoteItemCreatePayload>): Promise<QuoteItemWire>
export async function deleteQuoteItem(quoteId: string, itemId: string): Promise<void>
export async function versionQuote(id: string): Promise<QuoteWire>
export async function fetchQuoteVersions(id: string): Promise<QuoteWire[]>
export async function updateQuoteStatus(id: string, status: QuoteStatus): Promise<QuoteWire>
```

All routes use `endpoints.crm.quotes` / `endpoints.crm.quote(id)` (already declared in `src/shared/api/endpoints.ts:68-69`); add `quoteItems(id)`, `quoteItem(id, itemId)`, `quoteVersion(id)`, `quoteVersions(id)`, `quoteStatus(id)` to the endpoints map.

1.4. Verify-step: `pnpm typecheck` passes; no usages yet.

### Phase 2 — Hooks (`src/modules/crm/hooks/useQuotes.ts`)

Mirror `useDeals.ts` / `useAccounts.ts` (TanStack Query keys split structurally per Coding-guideline §16.9):

```ts
const QUOTES_KEY    = ["crm", "quotes"] as const
const LIST_KEY      = [...QUOTES_KEY, "list"] as const
const DETAIL_KEY    = [...QUOTES_KEY, "detail"] as const
const VERSIONS_KEY  = [...QUOTES_KEY, "versions"] as const
```

Hooks to expose:
- `useQuotes(params)` → `useQuery` over `fetchQuotes`
- `useQuote(id)` → `useQuery` over `fetchQuote`
- `useQuoteVersions(id)` → `useQuery` over `fetchQuoteVersions`
- `useCreateQuote()` → `useMutation`; on success: `setQueryData([DETAIL_KEY, id], created)` + `invalidateQueries({ queryKey: LIST_KEY })`
- `useUpdateQuote(id)` → similar
- `useDeleteQuote()` → similar; `removeQueries` for the detail key
- `useVersionQuote()` → `useMutation((sourceId) => versionQuote(sourceId))`; on success, navigate to `/crm/quotes/${created.id}/edit` (handled in the page, not the hook)
- `useAddQuoteItem(quoteId)`, `useUpdateQuoteItem(quoteId)`, `useDeleteQuoteItem(quoteId)` → mutations; on success, invalidate the detail and list queries
- `useUpdateQuoteStatus(id)` → mutation; on success, invalidate detail + list

Verify-step: typecheck.

### Phase 3 — List page (`/crm/quotes`)

3.1. Open `QuotesPage.tsx`.
3.2. Replace `import { quotes } from '@/modules/crm/data/quotes'` with `useQuotes`.
3.3. Page state: `page` (default 1), `tab` (drives `status` filter), `search` (debounced via existing `useDebounce`).
3.4. Pass `{ page, page_size: PAGINATION.DEFAULT_PAGE_SIZE, status, search }` into `useQuotes`.
3.5. Stats KPIs need totals per status — backend list endpoint **does not** return stats. Two options:
   - Compute KPIs from the **current page** only (cheap, but wrong when there are >1 page).
   - Hide KPIs from QUOTE-1 and add a dedicated `/quotes/stats` endpoint later.
   - **Recommendation: hide / "—" KPIs in this iteration**, add a comment, file a follow-up.
6. Wire row-click → `navigate('/crm/quotes/${id}/edit')` (already done).
7. Loading / empty / error states per Coding-guideline §12.

Verify-step: open `/crm/quotes`, confirm page 1 loads via Network tab; pagination footer fires another GET; row-click goes to detail.

### Phase 4 — Create flow (`/crm/quotes/new`)

4.1. **`PartLineFields.tsx`** — surface the picked option's `category_id` and `description` to the parent via the `onChange` callback. Today it surfaces only `partId / partSku / partName / description`. Extend the `picked` shape to include `categoryId`.

4.2. **Static parts mock** — for every option, add a **`category_id` UUID** field. Use a real UUID (e.g. fixed sentinel `00000000-0000-0000-0000-000000000001`) so the shape matches the eventual API response.

4.3. **`QuoteBuilderPanel.tsx`** — restructure form state:

```ts
type FormLineItem = {
  // local UI state
  uiId: string                          // local-only, for React keys
  pickedPartId?: string                 // for displaying pretty card; NOT sent
  pickedPartVariantId?: string          // future use (catalog mode)
  // payload state
  category_id: string | null
  item_name: string
  description: string | null
  qty: number                           // min 1, see helper
  rate: number
  tax_rate: number                      // defaults to TAXES.DEFAULT_TAX_RATE
  // sort_order is computed from index at submit time
}

const clampQty = (n: unknown) => {
  const num = Math.floor(Number(n))
  return Number.isFinite(num) && num >= 1 ? num : 1
}
```

4.4. **Quotable resolution** (the §1.2 rule):

```ts
function resolveQuotable(): { quotable_type: QuotableType; quotable_id: string } | null {
  if (leadId)    return { quotable_type: "lead",    quotable_id: leadId }
  if (dealId)    return { quotable_type: "deal",    quotable_id: dealId }
  if (accountId) return { quotable_type: "account", quotable_id: accountId }
  return null   // -> Save button is disabled
}

const accountSelectDisabled = !!leadId || !!dealId
```

4.5. **Category fallback dropdown** — `QuoteCategorySelect.tsx` (new). Mounted on a line item only when `pickedPartId === undefined`. Sources from `useCategories()` (already exists at `src/modules/ims/hooks/useCategories.ts`). When a part *is* picked, the category is read-only and shown as a chip.

4.6. **Save button** — replace the auto-save indicator with an explicit `<Button onClick={handleSave}>Save</Button>` in the form footer.

```ts
async function handleSave() {
  const q = resolveQuotable()
  if (!q) { toast.error("Pick an account, lead, or deal first"); return }

  // validate every line item (Zod) — see Phase 4.7
  const items: QuoteItemCreatePayload[] = lineItems.map((li, idx) => ({
    // freeform mode (per §2.3): NO part_variant_id sent
    category_id: li.category_id,
    item_name:   li.item_name,
    description: li.description,
    qty:         li.qty,
    rate:        li.rate,
    tax_rate:    li.tax_rate,
    sort_order:  idx,
  }))

  await createQuoteMut.mutateAsync({
    quotable_type: q.quotable_type,
    quotable_id:   q.quotable_id,
    valid_until:   validUntil || null,
    terms_conditions: terms || null,
    notes:         notes || null,
    items,
  })
}
```

4.7. **Zod schema** for the form (`schemas.ts` already exists for other modules in CRM — add a `quoteCreateFormSchema`):
- `quotable_id` required
- `items` non-empty
- per item: `item_name` 1..255, `category_id` UUID, `qty` integer >= 1, `rate` >= 0, `tax_rate` 0..100

Show the first validation error in a toast or inline.

4.8. Auto-save — **remove** the timer/effect. The Save button is the source of truth.

Verify-step: open `/crm/quotes/new`, fill the form, confirm:
- Save with no quotable selected → toast.
- Save with all fields → 201 in Network, redirect to `/crm/quotes/:id/edit`, the new row shows up on the list page.
- Submit a freeform line item with no name → 422 from backend, surfaced as a clean toast.
- Pick a part → Name and Description auto-fill, category dropdown disappears (read-only chip).
- Set qty input to 0 → reverts to 1.
- Default tax_rate is 18; change `TAXES.DEFAULT_TAX_RATE` → all new rows pick up the new default.
- Set lead id in URL → account dropdown disabled, payload uses `quotable_type: "lead"`.

### Phase 5 — View / edit / amend flow (`/crm/quotes/:id/edit`)

5.1. **`QuoteFormPage.tsx`** — replace `quotes.find((q) => q.id === quoteId)` with `useQuote(quoteId)`. Loading state: skeleton; error: error state per §12; not-found: redirect to `/crm/quotes`.

5.2. Hydrate form from `quote.items[]` (sort by `sort_order`).

5.3. **Amend button**:
   - Visible only if `quote.status === 'Rejected'` (per §2.4).
   - On click: `await versionQuoteMut.mutateAsync(quote.id)`; on success, `navigate('/crm/quotes/${created.id}/edit')`.
   - Tooltip on disabled Amend (other statuses): "Quote must be Rejected before it can be amended."

5.4. Save on edit — call `updateQuote(id, body)` instead of `createQuote`. Items array on PATCH is upsert-only (see schemas/quote.py:238-244): rows with `id` update existing, rows without `id` create new, **omitted rows are NOT auto-deleted**. To remove a row, call `deleteQuoteItem(quoteId, itemId)` separately when the user clicks the trash icon — **do this immediately**, not at form-save time, so the upsert array semantics stay correct.

5.5. **Status transitions — IN SCOPE.** Wire the existing menu actions to `PATCH /api/v1/crm/quotes/{id}/status`.

Legal transitions (per backend `endpoints.py:1614-1622`):

| From  | To       | Pre-flight                |
|-------|----------|---------------------------|
| Draft | Sent     | requires ≥ 1 line item    |
| Sent  | Accepted | none                      |
| Sent  | Rejected | none                      |

Anything else returns 400 `QUOTE_INVALID_TRANSITION`.

UI rules:

- **Detail page (`/crm/quotes/:id/edit`) action bar** — show buttons matching the current status:
  - `Draft` → `Send` button (calls `updateQuoteStatus(id, "Sent")`).
  - `Sent`  → `Mark as Accepted` + `Mark as Rejected` buttons.
  - `Accepted` → "Convert to Sales Order" button (existing UI; out-of-scope wiring).
  - `Rejected` → `Amend` button (the version flow from §5.3).
- **List page (`/crm/quotes`) row dropdown** — same matrix, condensed in the existing `MoreHorizontal` menu (the items currently exist as toast stubs at `QuotesPage.tsx:213-237`; replace toasts with mutation calls).
- Buttons that are not currently legal are **hidden**, not disabled. Mirrors the Amend rule from §5.3.
- All transitions confirm with a toast on success and surface 400/422 errors via the existing apiClient toast handler.

Hook: `useUpdateQuoteStatus(id)` (declared in Phase 2). On success: `setQueryData([DETAIL_KEY, id], updated)`, `invalidateQueries({ queryKey: LIST_KEY })`.

Edge case — `Draft → Sent` with 0 items: backend returns 400. Client should pre-check and show a clearer message ("Add at least one line item before sending") rather than relying on the raw backend error.

Verify-step: navigate to a saved quote; confirm GET fires once, items render, Save with edits PATCHes, deleting a row DELETEs immediately, Amend on a Rejected quote creates v2 and navigates.

### Phase 6 — Cleanup

6.1. Delete `src/modules/crm/data/quotes.ts` (or move to a `fixtures/` folder if other places still depend on it — check `LeadDetailPage.tsx:27` which currently imports it).
6.2. Replace `LeadDetailPage` quote usage with `useQuotes({ quotable_type: 'lead', quotable_id: leadId })`.
6.3. Run `pnpm lint && pnpm typecheck && pnpm test`.
6.4. Smoke E2E: create → list → edit → reject (via stub or backend) → amend → verify v2.

---

## 5. Risks and follow-ups

| Risk | Mitigation |
|---|---|
| User wants `part_variant_id` to "just work" later (§2.3) — but freeform mode loses variant linkage. | Plan ships freeform now. Future ticket decides catalog vs freeform once real variant picker exists. Static dropdown's `id` is **not** sent in this iteration. |
| Amend works only on Rejected (§2.4). | Hide the button on other statuses. |
| List page KPIs need cross-status totals; backend has no `/quotes/stats` yet. | Hide KPIs in this iteration; file a follow-up for a stats endpoint. |
| `LeadDetailPage` reads from the mock `quotes` array — deleting it breaks that page. | Migrate `LeadDetailPage` in Phase 6.2. |
| Quote rejects items with NULL `sell_price` (`QUOTE_ITEM_PRICE_MISSING`). Doesn't apply to freeform mode but will when we switch to catalog. | Note in the future-catalog ticket. |
| Inline upsert (PATCH `items[]`) does **not** delete missing rows. Easy to forget and ship a "delete doesn't work" bug. | Documented in Phase 5.4; delete uses the dedicated `DELETE /items/{item_id}` route. |

---

## 6. Decisions to confirm before coding

1. **Freeform vs catalog mode** for line items in this iteration → **freeform** (recommended, see §2.3).
2. **Amend gating**: hide button when status ≠ `Rejected`? → **yes** (recommended, see §2.4).
3. **List page KPIs**: hide for now or compute from the visible page? → **hide**, file follow-up.
4. **`sort_order`**: 0-based or 1-based? Backend accepts `int >= 0` so both work — pick **0-based** to match the array index without an off-by-one.
5. **`tax_rate` constant location**: confirm `src/shared/constants/taxes.ts` is acceptable (vs. a CRM-local constant).
6. **Auto-save removal**: delete entirely, or keep the indicator and turn it into a "saved at HH:mm" timestamp after each Save click? → **delete entirely** unless there's a strong reason to keep.

---

## 7. Out of scope (explicitly)

- Components / BOM sub-rows on a line item (UI stays, no API binding).
- Quote PDF render / send (the email side; manual status flip Draft → Sent **is** in scope, see §5.5).
- Convert-to-sales-order wiring (button stays as-is for this ticket).
- Any backend changes — backend is already complete for this scope.
- Real variant-aware part picker (handled in a separate ticket).
