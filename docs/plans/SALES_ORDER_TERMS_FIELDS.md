# Sales Order — Payment Terms / Warranty / Delivery fields — plan

Status: **Draft, awaiting sign-off**
Owner: CRM Sales Order form
Surfaces affected: Sales Order form (create + edit), Sales Order detail (read-only)
Files in scope:
- `src/modules/crm/pages/SalesOrderFormPage.tsx` (state, hydration, dirty-tracking memos, UI card, save payload ×2)
- `src/modules/crm/api.ts` (`SalesOrderWire`, `SalesOrderCreatePayload`, `SalesOrderUpdatePayload`)
- `src/shared/api/schema.gen.ts` (regenerated via `pnpm api:gen`)
- `src/modules/crm/pages/SalesOrderDetailPage.tsx` (read-only display — optional)

**Backend changes required.** Schema regeneration required (`pnpm api:gen`). See Phase 0.

---

## Goal

Add three dedicated free-text input boxes to the Sales Order form — **Payment Terms**, **Warranty**, **Delivery** — persisted end-to-end. Today all three are informally crammed into the single `terms_conditions` textarea (its placeholder literally reads _"Payment, warranty, delivery, etc."_).

---

## Current vs target

| State | Current | Target |
|---|---|---|
| Terms section | One **Terms & Conditions** textarea + one **Notes** textarea (2-col grid) | Adds **Payment Terms**, **Warranty**, **Delivery** textareas alongside |
| Backend columns | `terms_conditions`, `notes` only | `+ payment_terms`, `+ warranty`, `+ delivery` (nullable `Text`) |
| Create payload | `terms_conditions`, `notes` | `+ payment_terms`, `+ warranty`, `+ delivery` |
| Update payload | `terms_conditions`, `notes` | `+ payment_terms`, `+ warranty`, `+ delivery` |
| Detail (read-only) | shows T&C + Notes | shows the 3 new fields when present |

Per project rule "reskin keeps existing extras" — `terms_conditions` and `notes` are **kept**, not replaced.

---

## Phase 0 — Backend + schema regen (blocking)

The three fields **do not exist** on the backend today. Frontend-only would silently drop the values. This phase must land first.

**File:** `../comprint-erp-backend/app/modules/crm/models/sales_order.py`
Add next to `notes` (~line 286):
```python
payment_terms: Mapped[str | None] = mapped_column(Text(), nullable=True)
warranty: Mapped[str | None] = mapped_column(Text(), nullable=True)
delivery: Mapped[str | None] = mapped_column(Text(), nullable=True)
```

**File:** `../comprint-erp-backend/app/modules/crm/schemas/sales_order.py`
Add `payment_terms / warranty / delivery: str | None = None` to the **Create** (~line 665), **Update** (~line 745), and **Response** (~line 866) models — wherever `terms_conditions` / `notes` already appear.

**File:** `../comprint-erp-backend/app/modules/crm/services/sales_order_service.py`
If create/update map fields explicitly (not `**payload`), add the three to both paths.

**Migration:**
```bash
cd ../comprint-erp-backend
alembic revision --autogenerate -m "add payment_terms warranty delivery to sales_orders"
alembic upgrade head
```

**Verify (per Coding-guideline §6.7):**
```bash
curl -s localhost:8000/openapi.json | grep -iE "payment_terms|warranty|delivery"
```
Confirm the three appear in the SalesOrder Create/Update/Response schemas before touching the frontend.

**Regenerate types:**
```bash
cd comprint-erp-frontend && pnpm api:gen   # updates src/shared/api/schema.gen.ts
```
> Env note: `pnpm` may not run in this workspace (Node 20 vs pnpm 11, needs 22.13+). Fallback: run the generator from `node_modules/.bin`, or hand-add the fields to the `api.ts` interfaces below if regen is blocked.

---

## Phase 1 — Type wiring

**File:** `src/modules/crm/api.ts`

Add `payment_terms / warranty / delivery: string | null` to:
- `SalesOrderWire` (~line 2984) — response type
- `SalesOrderCreatePayload` (~line 3241) — `payment_terms?: string | null` (×3)
- `SalesOrderUpdatePayload` (~line 3287) — `payment_terms?: string | null` (×3)

If `schema.gen.ts` was regenerated, prefer deriving from `components['schemas'][...]` rather than hand-typing, per CLAUDE.md Pattern #1.

---

## Phase 2 — Form state + hydration

**File:** `src/modules/crm/pages/SalesOrderFormPage.tsx`

> Note: this form uses local `useState` per field (not RHF), mirroring the existing `termsConditions` / `notes`. Follow that existing pattern exactly — do not introduce RHF for just these fields.

- **State** (after ~line 295, next to `termsConditions` / `notes`):
  ```ts
  const [paymentTerms, setPaymentTerms] = useState<string>('')
  const [warranty, setWarranty]         = useState<string>('')
  const [delivery, setDelivery]         = useState<string>('')
  ```

- **Edit-mode hydration** (the `useEffect` keyed on `existing`, ~line 433):
  ```ts
  setPaymentTerms(existing.payment_terms ?? '')
  setWarranty(existing.warranty ?? '')
  setDelivery(existing.delivery ?? '')
  ```

---

## Phase 3 — Dirty tracking

**File:** `src/modules/crm/pages/SalesOrderFormPage.tsx`

Add the three vars to **both** the `initialValues` memo (~line 747, edit + new branches) and the `currentValues` memo (~line 823, object **and** dependency array). This is what drives the unsaved-changes guard; omit it and edits to the new fields won't mark the form dirty.

---

## Phase 4 — UI (Terms card)

**File:** `src/modules/crm/pages/SalesOrderFormPage.tsx`, the "Terms & Notes" card (~line 1831).

Add three `<Textarea>` boxes. Bump the grid (e.g. existing `lg:grid-cols-2` → keep T&C/Notes, add a second row of 3, or a single `lg:grid-cols-3` block for the new fields). All text styling via `<Typography>` / existing `<Label>` per §8.4 — no raw headings.

```tsx
<div className="space-y-2">
  <Label htmlFor="so-payment-terms">Payment Terms</Label>
  <Textarea id="so-payment-terms" rows={4}
    placeholder="e.g. Net 30, 50% advance"
    value={paymentTerms} disabled={readOnly}
    onChange={(e) => setPaymentTerms(e.target.value)} />
</div>
<div className="space-y-2">
  <Label htmlFor="so-warranty">Warranty</Label>
  <Textarea id="so-warranty" rows={4}
    placeholder="e.g. 12 months, parts & labor"
    value={warranty} disabled={readOnly}
    onChange={(e) => setWarranty(e.target.value)} />
</div>
<div className="space-y-2">
  <Label htmlFor="so-delivery">Delivery</Label>
  <Textarea id="so-delivery" rows={4}
    placeholder="e.g. 2-3 weeks, FOB Bangalore"
    value={delivery} disabled={readOnly}
    onChange={(e) => setDelivery(e.target.value)} />
</div>
```

No new imports (`Textarea`, `Label` already imported). No validation rule needed (free text, optional) — `validate()` untouched unless a rule is later requested.

---

## Phase 5 — Save payloads

**File:** `src/modules/crm/pages/SalesOrderFormPage.tsx`, `handleSave()` (~line 1058).

- **CREATE branch** (~line 1099), mirror `terms_conditions`:
  ```ts
  payment_terms: paymentTerms || undefined,
  warranty: warranty || undefined,
  delivery: delivery || undefined,
  ```
- **UPDATE branch** (~line 1071), mirror `terms_conditions`:
  ```ts
  payment_terms: paymentTerms || null,
  warranty: warranty || null,
  delivery: delivery || null,
  ```
Empty strings collapse to `undefined`/`null` so blank fields aren't sent as `""`.

---

## Phase 6 — Detail-page display (optional)

**File:** `src/modules/crm/pages/SalesOrderDetailPage.tsx`

If the read-only SO detail renders T&C / Notes, add the three new fields there too (only when present) so saved values are visible. Skip if the detail page doesn't surface terms today.

---

## Phase 7 — Verification checklist

- [ ] Migration applies; `\d sales_orders` shows 3 new `text` nullable columns.
- [ ] OpenAPI exposes the 3 fields in Create/Update/Response (`curl … | grep`).
- [ ] `pnpm api:gen` ran; `schema.gen.ts` committed (or fallback documented).
- [ ] Create SO with all 3 filled → POST body carries them → row persists.
- [ ] Edit existing SO → fields hydrate from server → PATCH updates them.
- [ ] Editing any of the 3 marks the form dirty (unsaved-changes guard fires).
- [ ] `readOnly` mode disables all 3.
- [ ] Blank fields send `undefined`/`null`, not `""`.
- [ ] Reload SO → values come back.
- [ ] `pnpm typecheck && pnpm lint && pnpm test` clean (via `node_modules/.bin` per env note).

---

## Sizing

Frontend: ~1 file of focused work (`SalesOrderFormPage.tsx`) + 1 interface file, ~40 lines net.
Backend: model + schema + service + 1 migration, ~15 lines net.
Schema regeneration required. Cannot ship frontend-only (Phase 0 is blocking).

---

## Open questions before implementation

1. **Keep `terms_conditions`?** Plan keeps it alongside the 3 new fields (don't lose existing data). Confirm — or should T&C be retired/migrated into the new split fields?
2. **Field type — Textarea vs Input?** Plan uses multi-line `Textarea` for consistency with T&C/Notes. Confirm single-line `Input` isn't preferred.
3. **Max length?** Plan uses unbounded `Text` like `terms_conditions`. If a cap is wanted, mirror `notes` (`max_length=1000`).
4. **Detail-page display (Phase 6)?** Confirm whether the read-only SO view should surface these, or form-only is enough.
