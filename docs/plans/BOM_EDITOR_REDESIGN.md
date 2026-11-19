# BOM editor redesign — plan

Status: **Draft, awaiting sign-off**
Owner: CRM line-items
Surfaces affected: Quote builder, Sales Order form, Closed-Won wizard, SO Quick-Create review
Files in scope:
- `src/modules/crm/components/line-items/LineItemBomSection.tsx`
- `src/modules/crm/components/line-items/LineItemBomEditor.tsx`
- `src/modules/crm/components/line-items/lineItemMappers.ts` (sanity check on `createEmptyBomChild` defaults)

No backend changes. No schema regeneration.

---

## Current vs target UX

| State | Current | Target (per screenshots) |
|---|---|---|
| Category not BOM-eligible | Section hidden entirely | unchanged — hidden |
| Category IS BOM-eligible, no children yet | Always-rendered "View BOM" toggle (zero count) | Pill **`+ Add BOM`** (dashed, ghost) under the parent row |
| Click "+ Add BOM" | n/a | Section expands AND a first empty component row is appended; pill becomes **`▼ Hide BOM · N comp`** |
| Expanded | "Hide BOM" link + full table | "Hide BOM" pill + Assembly subheader (`Load template…` + `Clear`) + simplified component table |
| BOM child row | Part Number / Name / Category / Qty / Rate / Disc / Tax % / [Amount] / × | **Part Number / Description / Qty / [Amount] / ×** — Category, Rate, Tax, Disc hidden but still in the row's state and payload |

---

## Phase 1 — Eligibility-gated "+ Add BOM" pill

**File:** `LineItemBomSection.tsx`

Today the section returns one of three things:
1. `null` (not BOM-eligible)
2. The toggle-pill + (when expanded) the editor
3. View-mode read-only render

Rewrite branch 2:

- **Collapsed + zero children:**
  ```tsx
  <button>+ Add BOM</button>
  ```
  Click handler:
  ```ts
  () => {
    onToggle()                                  // sets isBomExpanded = true
    if (bomChildren.length === 0) {
      onChange([createEmptyBomChild()])         // seed first row inline
    }
  }
  ```
  Styling: dashed-border ghost pill, `inline-flex`, `Plus` icon.

- **Expanded (any child count):**
  Existing "Hide BOM" pill — keep label and count badge, swap visual to a filled chip (background `bg-muted`, smaller).

- **Collapsed + children exist** (rare — only after the user collapses a populated BOM):
  Same pill but reads `▶ View BOM · N comp`. Click → just `onToggle()`, no auto-seed (already populated).

- **Remove the auto-seed `useEffect` inside `LineItemBomEditor`.** Seeding moves to the section's click handler so we don't seed rows the user hasn't asked for. Otherwise toggling collapse/expand would re-seed after every clear.

---

## Phase 2 — Assembly subheader

Inside the expanded section, above the table:

```
[chip: Assembly]  N component(s)        [Load template…▾]  [🗑 Clear]
```

- **Assembly chip** — purely visual badge.
- **Load template** — optional `AsyncSelect` of BOM templates. Render only if a `bomTemplates` prop is passed; otherwise omit. Phase 1 ships chip + Clear only; template loading wires later when the BOM-template API for Quote/SO exists.
- **Clear** — `onChange([])` resets children. Show a small confirm dialog when `bomChildren.length > 1` to avoid accidental loss.

---

## Phase 3 — Simplified child row

**File:** `LineItemBomEditor.tsx`

Hide these columns from the table while keeping their values on the row:

- **Category** — derive from `parent.categoryId` (already happens via the save-mapper fallback) AND `partId`'s picked variant. Don't render the column; the value still flows in `bomChildren[].categoryId`.
- **Rate** — picked variant's `sellPrice` for catalog rows; default `0` for freeform. No column. (Most BOM children are catalog-picked; sales rarely needs to set a custom rate per component.)
- **Disc ₹** — hide. Default `0`. Discount lives at the parent line level.
- **Tax %** — hide. Inherits parent's `tax_rate` via the existing save-path fallback (`tax_rate: c.taxRate ?? parent.tax_rate`).

Visible columns become:

```
| Part Number (combobox) | Description (input) | Qty | [Amount] | × |
```

Sketch:

```tsx
<table>
  <thead>
    <tr>
      <th>Part Number</th>
      <th>Description</th>
      <th className="w-16 text-right">Qty</th>
      {childAmounts && <th className="w-24 text-right">Amount</th>}
      <th className="w-9" />
    </tr>
  </thead>
  <tbody>
    {value.map((c, ci) => (
      <tr key={c.id}>
        <td><PartCombobox onPick={…} onClear={…} /></td>
        <td><Input value={c.description ?? ""} onChange={…} /></td>
        <td className="text-right"><Input value={c.qtyInput ?? String(c.qty)} … /></td>
        {childAmounts && (
          <td className="text-right">
            {childAmounts[ci]
              ? formatINR(childAmounts[ci].amount + childAmounts[ci].tax_amount)
              : "—"}
          </td>
        )}
        <td><Button onClick={() => removeChild(c.id)}>×</Button></td>
      </tr>
    ))}
  </tbody>
</table>
```

Empty-state colspan adjusts to 4 (or 5 with the Amount column when `childAmounts` is provided).

---

## Phase 4 — Hidden-but-passed values

The shared payload helpers already inherit from the parent when a child has no own value:

- `bomChildrenToCreatePayload(rows, parentCategoryId)` — falls back to `parentCategoryId` for `category_id`.
- Tax inheritance: the inline calc/save mappers in each form do `tax_rate: c.taxRate ?? parent.tax_rate`.

What needs to change so hiding the inputs doesn't lose data:

1. **On `onPick` (catalog row)** in the simplified editor — keep populating `categoryId`, `rate`, `category` from the picked variant exactly like today. The user doesn't see them but they're stored on the row.
2. **For freeform rows** (no part picked) — `categoryId` / `rate` / `taxRate` default to undefined. The save/calc-payload builders' parent fallbacks kick in. Already correct in:
   - `bomChildrenToCreatePayload` (shared)
   - `buildChildrenForCalcLine` / `buildChildrenForLine` / `buildChildrenForUpsert` (QuoteBuilderPanel)
   - The inline child-builders in SO form's `calcPayloadRaw` and Close-Won's `calculatePayload`
3. **`createEmptyBomChild`** in `lineItemMappers.ts` — verify it returns sane defaults (`qty: 1, rate: 0, taxRate: 0, discountAmount: 0`). Skim and adjust if not.
4. **Type signature** — `BomChildRow` already carries every field; no schema change needed.

---

## Phase 5 — View-mode tweaks

Current view-mode path in `LineItemBomSection`:

```tsx
if (viewLocked) {
  if (childCount === 0) return null
  return <Assembly chip + always-visible editor with viewLocked />
}
```

Keep the same behavior but apply the simplified column set so view mode mirrors edit mode. The `childAmounts` Amount column already shows in view too.

---

## Phase 6 — Form-level coordination (no changes expected)

- **Calc payloads** already nest children with `tax_rate: c.taxRate ?? parent.tax_rate` and `category_id: c.categoryId ?? parent.category_id`. Hiding the inputs makes these fallbacks the primary path for freeform rows; they're already exercised today.
- **Save payloads** — same fallbacks via `bomChildrenToCreatePayload(rows, parent.categoryId)`.
- **Dirty detection** (`isDirty` per-row diff in `QuoteBuilderPanel.buildChildrenForUpsert`) compares `itemName / description / qty / rate / partId`. With `rate` hidden-but-populated, this still works for catalog rows. Freeform rate defaults to 0 on creation and won't change → no false-dirty.

---

## Phase 7 — Roll-out per surface

All three forms host BOM via the same `LineItemBomSection` → `LineItemBomEditor` pair. Changes land in those two files and automatically apply to:

- Quote builder (`QuoteBuilderPanel.tsx`)
- SO form (`SalesOrderFormPage.tsx`)
- Close-Won wizard via shared `LineItemRow` (`ClosedWonPage.tsx`)
- SO Quick-Create review step — already read-only, picks up the simplified view-mode columns automatically.

No per-form code change needed except verifying that empty `bomChildren` on a BOM-eligible category no longer auto-pads with a row (since we moved the seed from the editor's `useEffect` to the section's click handler).

---

## Phase 8 — Verification checklist

- [ ] Pick a BOM-eligible category on a line → **`+ Add BOM`** pill appears.
- [ ] Click **`+ Add BOM`** → section expands with one empty component row; pill changes to **`Hide BOM · 1 comp`**.
- [ ] Click **`Hide BOM`** → section collapses, child rows preserved; pill reads **`View BOM · 1 comp`**.
- [ ] Add component → row added; pill count increments.
- [ ] Pick a part in a child row → row stores `partId / categoryId / rate / category` invisibly; calc preview totals include the child.
- [ ] Clear (Phase 2) → all children removed; pill back to **`+ Add BOM`**.
- [ ] Switch parent category to a non-BOM-eligible one → pill + section vanish (existing gate covers this).
- [ ] Save quote / SO → backend receives children with `category_id` (parent-inherited if child had none), `rate` (variant's sell_price or 0), `tax_rate` (parent's or 0), `discount_amount` (0).
- [ ] Reload → children come back; pill reads **`Hide BOM · N`** (or **`View BOM · N`** if collapsed by default).
- [ ] View-mode (saved Quote / SO read-only) → **`Assembly · N component(s)`** chip + always-visible read-only table with the simplified columns.

---

## Sizing

~2 files of focused work (`LineItemBomSection.tsx` + `LineItemBomEditor.tsx`), roughly ~150 lines net. No backend changes, no schema regeneration.

---

## Open questions before implementation

1. **Freeform child row without a Rate input** — if sales ever needs to set rate on a freeform BOM child (a one-off cable / label), they can't anymore. The reference screenshot only shows Part Number / Serial / Qty, so this seems intended. Confirm.
2. **Description vs Serial Number** — the screenshot shows "SERIAL NUMBER" as the middle column, but the spec text says "description". `BomChildRow` has `description` but no `serialNumber`. Planning **Description** since (a) that's what the existing field is, (b) the BOM editor isn't a WMS-inward serial-capture surface, (c) serial capture lives on the SO/Quote items elsewhere. Confirm before implementation.
3. **"Load template" dropdown** — image shows it; the backend doesn't have a BOM-templates API for Quotes / SO yet (the only BOM templates are mock WMS BOMs). Plan ships the Assembly chip + Clear; Load template deferred to a follow-up when the API exists. Confirm OK to defer.
