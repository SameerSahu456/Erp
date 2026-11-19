import { useState, useMemo, useEffect, useRef } from 'react'
import { deepEqual as deepEqualLocal } from '@/lib/deep-equal'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { useNavigate } from 'react-router-dom'

import { useFormErrors } from '@/hooks/use-form-errors'
import { type PickedPart } from '../../components/shared/PartLineFields'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { discountCapError, bomChildrenToCreatePayload, bomChildCategoryError, bomChildDiscountError, bomChildIdentityError, createEmptyBomChild, resolveChildName, sanitizeNumericInput } from '../../components/line-items'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { stripHtml } from '@/lib/utils'
import { UI } from '@/shared/constants'
import { useDebounce } from '@/shared/hooks'
import type { PartPickerResult } from '../../components/quotes/PartPickerDialog'
import type { SwapResult } from '../../components/quotes/SwapComponentDialog'
import { useAccount } from '../../hooks/accounts/useAccounts'
import { useLead } from '../../hooks/leads/useLeads'
import { useDeal } from '../../hooks/deals/useDeals'
import { type AsyncSelectOption } from '@/components/ui/async-select'

import { useCreateQuote, useUpdateQuote, useDeleteQuoteItem, useNextQuoteNumber, useQuoteCalculate, useVersionQuote } from '../../hooks/quotes/useQuotes'
import { beginQuotePdfPoll } from './useQuotePdfPolling'
import { addQuoteItem as addQuoteItemApi, deleteQuoteItem as deleteQuoteItemApi, fetchHydrate, fetchQuote as fetchQuoteApi, updateQuote as updateQuoteApi, updateQuoteStatus as updateQuoteStatusApi } from '../../api'
import type { QuotableType, QuoteBomChildCreatePayload, QuoteBomChildUpsertPayload, QuoteCalculateChildPayload, QuoteCalculateLinePayload, QuoteItemCreatePayload, QuoteItemUpsertPayload, QuoteWire } from '../../api'
import { useBrand } from './useBrands'
import { useQuoteClauses, clauseFromRow, clauseFromTerm, clausesToPayload, type EditableClause } from './useQuoteClauses'

// ── Types ──

import { fmt, buildBomConfigs, createEmptyLineItem, lineItemFromServer, partsWithBOM, fileNameFromUrl, lineDiscountError, type BOMComponentAction, type QuoteBuilderLineItem, type QuoteBuilderPanelProps, type QuoteOrderType } from '../../components/quotes/quoteBuilderShared'
import { TAXES } from '../../constants/taxes'
import { clampPriceDigits, clampQtyDigits } from '../../constants/line-items'
import { QUOTES_STRINGS as S } from '../../components/quotes/quotes.strings'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { resolvePasteVariants, promoteComponentsOfNonBomParents, pastedConditionToCondition, variantKey } from '../../lib/paste-line-items'
import type { PastedLineGroup } from '../../lib/paste-line-items'
import { saveBlob } from '@/shared/lib/saveBlob'

// Per-BOM-child Brand/OEM + Condition on quotes. The backend schemas
// (QuoteBomChildCreate / QuoteBomChildUpsert) and the quote_items columns now
// accept both, and SO already sends them. Left `false`, every child's
// condition was silently dropped on save. The Q→SO conversion relies on
// children carrying them to avoid re-selection.
const QUOTE_CHILD_SENDS_OEM_CONDITION = true

// Container logic for the Quote Builder: quotable resolution, line-item +
// BOM editing, the live /quotes/calculate preview, dirty tracking, and the
// create / edit / amend (version) save dispatch.
export function useQuoteBuilder(props: QuoteBuilderPanelProps) {
  const {
  leadId,
  dealId,
  accountId: propAccountId,
  accountName,
  mode = 'standalone',
  existing,
  amendMode = false,
  onCancelAmend,
  viewOnly = false,
  onSaved,
  onCancel,
  onDirtyChange,
  } = props
  const isEmbedded = mode !== 'standalone'
  const isSalesOrderEmbedded = mode === 'sales-order-embedded'
  // `<fieldset disabled>` only locks native form controls. Base UI primitives
  // (Switch, Select, CategoryOptionsCombobox, …) render custom DOM and do
  // NOT inherit fieldset disabled — they need this flag passed explicitly.
  const viewLocked = viewOnly && !amendMode
  const navigate = useNavigate()
  const isEdit = !!existing

  // Quotable resolution: the upstream party is exclusive — exactly one of
  // account | lead | deal. Hydrate type+id from `existing` in edit mode,
  // or from the URL deep-link props on create (lead beats deal beats
  // account, matching the spec's resolution order). User can swap via the
  // Type toggle in the standalone header.
  const initialAccountId =
    existing?.quotable_type === 'account'
      ? existing.quotable_id
      : propAccountId ?? ''
  const initialLeadId =
    existing?.quotable_type === 'lead' ? existing.quotable_id : leadId ?? ''
  const initialDealId =
    existing?.quotable_type === 'deal' ? existing.quotable_id : dealId ?? ''

  // The upstream party (Account / Lead / Deal type + which record) is fixed
  // once the quote exists: on edit/amend it can't be re-pointed at a different
  // entity, so the "Linked to" type toggle + the record picker are locked.
  // On create it's also locked when the form is deep-linked from a specific
  // record (e.g. /crm/quotes/new?leadId=…) — the user already chose the entity
  // by navigating here. Plain "Create Quote" from the Quotes list carries no
  // prefill → the picker stays fully editable.
  const quotableLocked =
    isEdit || !!(initialAccountId || initialLeadId || initialDealId)

  // First dropdown drives which entity picker is visible. Edit mode
  // hydrates from server; create defaults to "account" unless a URL
  // prefill points at lead/deal.
  const [quotableType, setQuotableType] = useState<QuotableType>(() => {
    // hydrates from server; create defaults to "lead" (the Account option
    // is temporarily disabled in the dropdown) unless a URL prefill points
    // at a specific record — an ?accountId= deep-link still locks the form
    // to that account.
    if (existing) return existing.quotable_type
    if (initialLeadId) return 'lead'
    if (initialDealId) return 'deal'
    if (initialAccountId) return 'account'
    return 'lead'
  })

  const [selectedAccountId, setSelectedAccountId] = useState(initialAccountId)
  // `{id, label}` so the trigger renders the right name even when the
  // selected row isn't in the picker's loaded pages. Labels are patched in
  // by the useLead/useDeal effects below once the server detail resolves.
  const [selectedLead, setSelectedLead] = useState<AsyncSelectOption | null>(
    initialLeadId ? { id: initialLeadId, label: S.builder.loadingPlaceholder } : null,
  )
  const [selectedDeal, setSelectedDeal] = useState<AsyncSelectOption | null>(
    initialDealId ? { id: initialDealId, label: S.builder.loadingPlaceholder } : null,
  )

  const { errors, setErrors, clearError, clearAll } = useFormErrors()

  // Today's date (YYYY-MM-DD) — used both for the input `min` attribute
  // (block past picks) and as the seed for the "today + 10 days" default
  // shown when there's no existing value yet.
  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const defaultValidUntilIso = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() + 10)
    return d.toISOString().slice(0, 10)
  }, [])
  const [validUntil, setValidUntil] = useState(
    existing?.valid_until ?? defaultValidUntilIso,
  )
  // ── Quote type ────────────────────────────────────────────────────
  //
  // A quote has NO `sellable_type` column: rental-ness lives per item on
  // `quote_items.is_rental`. So the type is a UI-level choice written
  // down onto every line, and read back by asking whether the saved
  // items are rental.
  //
  // Until this existed there was no way to mark a quote rental at all —
  // `createEmptyLineItem` hardcoded `is_rental: false` and nothing ever
  // set it, so every quote saved as Sales and the rental half of this
  // controller (payload at `buildItemsPayload`, the date validation) was
  // unreachable. A quote converted to a rental SO then lost its window,
  // because that conversion filters `items.filter(i => i.is_rental)`.
  // A NEW quote starts with no type so the operator must choose one — it
  // used to default to Sales, which silently saved rental deals as sales
  // quotes. A saved quote derives its type from its items as before.
  const [quoteType, setQuoteTypeState] = useState<QuoteOrderType | ''>(() =>
    existing ? ((existing.items ?? []).some((it) => it.is_rental) ? 'Rental' : 'Sales') : '',
  )
  // The window every rental line inherits. Held on the quote because an
  // operator states it once; each line may narrow it (never widen it).
  const [rentalStartDate, setRentalStartDateState] = useState<string>(
    () => (existing?.items ?? []).find((it) => it.rental_start_date)?.rental_start_date ?? '',
  )
  const [rentalEndDate, setRentalEndDateState] = useState<string>(
    () => (existing?.items ?? []).find((it) => it.rental_end_date)?.rental_end_date ?? '',
  )

  const [notes, setNotes] = useState(existing?.notes ?? '')
  const [terms, setTerms] = useState(existing?.terms_conditions ?? '')
  // Header-level discount in ₹ (matches backend `discount_amount`).
  // Hydrated from the saved quote in edit/view mode; defaults to 0 on
  // create. Backend exposes `discount_amount` as a non-nullable number
  // (NULL on persist becomes 0).
  const [discount, setDiscount] = useState<number>(existing?.discount_amount ?? 0)

  // ── Business Vertical (brand) + Terms & Conditions clause snapshot ──
  // `selectedBrand` holds { id, code, name }: id → quotes.brand_id on create
  // (frozen after); code → hydrate + reset; name → badge + reset label. The
  // structured clause list lives on `clauseCtrl` and is persisted on the
  // quote's `terms[]`. See comprint-erp-docs/modules/crm/quote/QUOTE_VERTICALS_PLAN.md.
  const [selectedBrand, setSelectedBrand] = useState<{
    id: string
    code: string
    name: string
  } | null>(null)
  const [hydratingTerms, setHydratingTerms] = useState(false)

  // Per-brand clause cache (keyed by brand id) for the current session. When
  // the user switches the vertical away and back, we restore the clauses that
  // were on screen for that brand instead of re-hydrating its template — so
  // saved/edited clauses survive a round trip through another vertical. Seeded
  // lazily on switch-away; the saved brand falls back to the quote's saved
  // snapshot and a never-visited brand falls back to its template (see
  // handleBrandChange). "Reset to <brand> default" stays the explicit way to
  // pull the pristine template. A ref (not state) — it never drives rendering.
  const clauseCacheRef = useRef<Map<string, EditableClause[]>>(new Map())

  // Edit mode: the quote response carries only `brand_id`, so resolve it back
  // to code + name for the (disabled) dropdown chip and the reset label.
  // Derived (not an effect): the user pick wins; otherwise fall back to the
  // resolved saved brand once it loads.
  const brandDetailQuery = useBrand(existing?.brand_id ?? undefined)
  const resolvedBrand =
    selectedBrand ??
    (brandDetailQuery.data
      ? {
          id: brandDetailQuery.data.id,
          code: brandDetailQuery.data.code,
          name: brandDetailQuery.data.name,
        }
      : null)

  // Seed the clause list from the saved quote's terms (edit) or empty (create,
  // until a vertical is picked → hydrate fills it).
  const initialClauses = useMemo<EditableClause[]>(
    () => (existing?.terms ?? []).map(clauseFromTerm),
    [existing],
  )

  // Fetch the brand's default clause template and replace the list. Used on
  // vertical select and on "Reset to <brand> default". A 404 (brand has no
  // live template) leaves an empty list so ad-hoc clauses are still possible.
  // `preserveOpenState` is set by the reset path only — resetting must not
  // collapse the section the user is working in (a vertical switch still does).
  async function loadBrandTemplate(brandCode: string, preserveOpenState = false) {
    try {
      setHydratingTerms(true)
      const res = await fetchHydrate(brandCode)
      clauseCtrl.replaceClauses(res.rows.map(clauseFromRow), { preserveOpenState })
    } catch (err) {
      clauseCtrl.replaceClauses([], { preserveOpenState })
      toast.error(err instanceof Error ? err.message : S.builder.clauses.hydrateFailed)
    } finally {
      setHydratingTerms(false)
    }
  }

  // Vertical dropdown change. Fires in create, edit, and amend — the new brand
  // is persisted via `brand_id` on the PATCH (see the save flow below).
  //
  // Clause resolution for the incoming brand, in priority order:
  //   1) session cache — clauses previously shown for this brand (restores the
  //      user's in-session edits after a round trip through another vertical);
  //   2) saved snapshot — the quote's committed `terms` for its original brand
  //      (so returning to the saved vertical brings the saved clauses back, not
  //      a fresh template hydrate);
  //   3) template hydrate — first visit to any other brand.
  // Before switching, we snapshot the OUTGOING brand's current clauses into the
  // cache so they can be restored later. "Reset to <brand> default" stays the
  // explicit escape hatch to re-pull the pristine template.
  function handleBrandChange(
    brand: { id: string; code: string; name: string } | null,
  ) {
    const prevBrandId = selectedBrand?.id ?? existing?.brand_id ?? null
    if (prevBrandId) {
      clauseCacheRef.current.set(prevBrandId, clauseCtrl.clauses)
    }

    setSelectedBrand(brand)
    if (!brand) {
      clauseCtrl.replaceClauses([])
      return
    }

    const cached = clauseCacheRef.current.get(brand.id)
    if (cached) {
      clauseCtrl.replaceClauses(cached)
      return
    }
    if (existing?.brand_id && brand.id === existing.brand_id) {
      clauseCtrl.replaceClauses((existing.terms ?? []).map(clauseFromTerm))
      return
    }
    void loadBrandTemplate(brand.code)
  }

  // "Reset to <brand> default" — re-hydrate the pristine template.
  async function handleResetClauses() {
    if (!resolvedBrand) return
    await loadBrandTemplate(resolvedBrand.code, true)
    toast.success(S.builder.clauses.resetDone(resolvedBrand.name))
  }

  const clauseCtrl = useQuoteClauses({
    initialClauses,
    brandName: resolvedBrand?.name ?? null,
    onResetToDefaults: handleResetClauses,
    resetting: hydratingTerms,
  })

  const [lineItems, setLineItems] = useState<QuoteBuilderLineItem[]>(() => {
    if (existing && existing.items.length > 0) {
      return [...existing.items]
        .filter((it) => it.parent_quote_item_id == null)
        .sort((a, b) => a.sort_order - b.sort_order)
        .map(lineItemFromServer)
    }
    return [createEmptyLineItem()]
  })

  // Snapshot of items as they came back from the server, keyed by item id.
  // Used at save time to compute which rows were actually changed (dirty
  // diffing) so PATCH only carries the items that need updating — not the
  // entire array. Populated once at mount; never re-keyed (the panel is
  // remounted via `key={quote.id}` in the page when the quote changes).
  const originalItemsById = useMemo(() => {
    const m = new Map<string, QuoteWire['items'][number]>()
    if (existing) {
      for (const item of existing.items) m.set(item.id, item)
    }
    return m
  }, [existing])

  // Track ids of saved items the user has removed (clicked the trash) so
  // we fire DELETE for each on save. PATCH upsert never auto-deletes
  // missing rows — see plan §5.4.
  const [pendingItemDeletes, setPendingItemDeletes] = useState<string[]>([])

  // Patch the lead/deal trigger labels once the server detail resolves.
  // Pickers store `{id, "Loading…"}` on hydration; useLead/useDeal fire
  // when an id is present and replace the placeholder. Same pattern as
  // MI form — keeps the chip readable even when the row isn't in the
  // currently loaded picker pages.
  const leadDetailQuery = useLead(selectedLead?.id ?? '')
  const dealDetailQuery = useDeal(selectedDeal?.id ?? null)
  useEffect(() => {
    const lead = leadDetailQuery.data
    if (!lead || !selectedLead || selectedLead.id !== lead.id) return
    const label = `${lead.lead_code}${lead.company_name ? ` · ${lead.company_name}` : ''}`
    if (selectedLead.label !== label) setSelectedLead({ id: lead.id, label })
  }, [leadDetailQuery.data, selectedLead])
  useEffect(() => {
    const deal = dealDetailQuery.data
    if (!deal || !selectedDeal || selectedDeal.id !== deal.id) return
    // Show the customer on the deal chip. Backend joins `accounts.name`
    // onto `DealResponse.account_name`; null only when the FK is
    // orphaned (rare).
    const accountName = deal.account_name ?? deal.account?.name
    const label = accountName
      ? `${deal.deal_number} · ${accountName}`
      : deal.deal_number
    if (selectedDeal.label !== label) setSelectedDeal({ id: deal.id, label })
  }, [dealDetailQuery.data, selectedDeal])

  // Switching the Type dropdown clears the two inactive sides so the
  // resolved quotable carries exactly one id (backend `quotable_type`
  // is exclusive).
  function switchQuotableType(next: QuotableType) {
    if (next === quotableType) return
    if (next !== 'account') setSelectedAccountId('')
    if (next !== 'lead') setSelectedLead(null)
    if (next !== 'deal') setSelectedDeal(null)
    setQuotableType(next)
    clearError('quotable')
  }

  // Quote number + status — shown read-only in the standalone header
  // (mirrors the erp-demo Quote form). Edit/amend carry the server-allocated
  // number; a brand-new quote previews the next number via
  // GET /api/v1/next-number. The preview is provisional — POST /crm/quotes
  // allocates the authoritative number on save and may land one ahead if
  // another user creates first.
  const nextNumberQuery = useNextQuoteNumber({ enabled: !isEdit && !isEmbedded })
  const quoteNumber = existing
    ? existing.quote_number
    : (nextNumberQuery.data?.next_number ??
      (nextNumberQuery.isLoading ? S.builder.quoteNumberLoading : S.builder.quoteNumberAuto))
  const quoteStatus = existing?.status ?? 'Draft'

  // The DealAccountSelect combobox below sources accounts from the live
  // API with infinite-scroll + debounced server-side search (Coding-
  // guideline §16.11). For the PDF download we still need to resolve the
  // selected account's name on demand — useAccount(id) hydrates that.
  const fallbackAccountQuery = useAccount(selectedAccountId || null)
  const selectedAccountFallback = fallbackAccountQuery.data
    ? { id: fallbackAccountQuery.data.id, name: fallbackAccountQuery.data.name }
    : null

  // ── Dialog state ──
  const [partPickerOpen, setPartPickerOpen] = useState(false)
  const [partPickerTarget, setPartPickerTarget] = useState<{ lineItemId: string; mode: 'main' | 'additional'; additionalCompId?: string } | null>(null)
  const [swapDialogOpen, setSwapDialogOpen] = useState(false)
  const [swapTarget, setSwapTarget] = useState<{ lineItemId: string; bomItemId: string; currentPartId: string; currentPartName: string; substituteIds: string[] } | null>(null)

  // ── Line Item CRUD ──

  function updateLineItem(id: string, updates: Partial<QuoteBuilderLineItem>) {
    setLineItems((prev) => prev.map((li) => (li.id === id ? { ...li, ...updates } : li)))
  }

  /** Switching the type re-stamps every line.
   *
   *  `is_rental` is not a per-line choice here: the whole quote is one
   *  or the other, matching how a rental SO works (its backend SETS
   *  `is_rental` on every line). Lines also carry the period and the
   *  window, because the `rental_consistency` CHECK is all-or-nothing —
   *  a line is either fully non-rental or has period AND both dates. */
  function setQuoteType(next: QuoteOrderType) {
    setQuoteTypeState(next)
    const isRental = next === 'Rental'
    setLineItems((prev) =>
      prev.map((li) =>
        Boolean(li.is_rental) === isRental
          ? li
          : {
              ...li,
              is_rental: isRental,
              rental_period: isRental ? (li.rental_period ?? 'month') : undefined,
              rental_start_date: isRental
                ? (li.rental_start_date || rentalStartDate || undefined)
                : undefined,
              rental_end_date: isRental
                ? (li.rental_end_date || rentalEndDate || undefined)
                : undefined,
            },
      ),
    )
  }

  /** Moving the quote's window moves every line that never opted out.
   *
   *  A line counts as "not opted out" when it holds no date of its own,
   *  or still holds the window's PREVIOUS value — the same rule the SO
   *  form uses, where an empty line means "same as the order". A line
   *  that was deliberately narrowed keeps its own dates.
   *
   *  The dates are written down rather than resolved at save time
   *  because a quote has no order-level window for the backend to fill
   *  from: `quote_items` carries the only copy, and the
   *  `rental_consistency` CHECK wants all three fields or none. */
  function cascadeWindow(field: 'rental_start_date' | 'rental_end_date', prevValue: string, next: string) {
    setLineItems((prev) =>
      prev.map((li) =>
        li.is_rental && (!li[field] || li[field] === prevValue)
          ? { ...li, [field]: next || undefined }
          : li,
      ),
    )
  }
  function setRentalStartDate(next: string) {
    cascadeWindow('rental_start_date', rentalStartDate, next)
    setRentalStartDateState(next)
  }
  function setRentalEndDate(next: string) {
    cascadeWindow('rental_end_date', rentalEndDate, next)
    setRentalEndDateState(next)
  }

  function addLineItem() {
    setLineItems((prev) => [...prev, createEmptyLineItem(quoteType === 'Rental')])
  }

  /** True when any line carries real content (drives the paste dialog's
   *  append vs replace choice — the first empty row doesn't count). */
  const hasRealLines = lineItems.some(
    (li) =>
      !!li.partId ||
      !!li.partSku ||
      !!(li.itemDescription ?? "").trim() ||
      !!(li.itemName ?? "").trim() ||
      (li.bomChildren ?? []).length > 0,
  )

  /**
   * Append or replace lines from a parsed paste. Each `PastedLineGroup`
   * becomes one headline row + its components as `bomChildren`.
   *
   * Variant lookup + TanStack cache pre-seeding + category map are handled by
   * the shared `resolvePasteVariants` utility in lib/paste-line-items.
   */
  async function applyPastedGroups(
    groups: PastedLineGroup[],
    mode: "replace" | "append",
  ) {
    if (groups.length === 0) return

    const resolved = await resolvePasteVariants(groups, qc)
    // Quote: eligibility-based promotion disabled. The quote grid now has
    // `bomComponentsRule="always"`, so price-less rows are kept as BOM
    // components under their price-carrying parent regardless of whether
    // the parent part's category is flagged `is_bom_eligible`. Freeform
    // parents (part number unknown to catalog) also keep their nested
    // components instead of each being promoted to its own headline.
    const promoted = groups
    // const promoted = await promoteComponentsOfNonBomParents(groups, resolved, qc)
    const { variantMap, categoryNameToId } = resolved

    const newLines: QuoteBuilderLineItem[] = promoted.map((g) => {
      const base = createEmptyLineItem()

      const bomChildren = g.components.map((c) => {
        const child = createEmptyBomChild()
        const v = variantMap.get(variantKey(c.partNumber, {
          category: c.category || undefined,
          oem: c.oem || undefined,
          condition: pastedConditionToCondition(c.condition),
        })) ?? null
        if (v) {
          return {
            ...child,
            partId: v.id,
            partSku: v.sku_code,
            itemName: v.name,
            categoryId: v.category_id,
            category: v.category_name,
            oemId: v.oem_id ?? undefined,
            condition: v.condition,
            listPrice: v.sell_price ? Number(v.sell_price) : undefined,
            description: c.description || v.description || v.part_description || undefined,
            qty: Number.isFinite(c.qty) && c.qty > 0 ? c.qty : 1,
          }
        }
        const childCat = c.category || undefined
        // No catalog match → freeform child. The pasted part number goes
        // into `itemName` only; leaving `partSku` undefined keeps the row
        // visually unlinked (the Part Number cell stays an empty search
        // input), same as the SO paste flow.
        return {
          ...child,
          itemName: c.partNumber || c.description || "",
          description: c.description || undefined,
          qty: Number.isFinite(c.qty) && c.qty > 0 ? c.qty : 1,
          category: childCat,
          categoryId: childCat ? categoryNameToId.get(childCat.toLowerCase()) : undefined,
          condition: pastedConditionToCondition(c.condition) ?? c.conditionRaw,
        }
      })

      const pv = variantMap.get(variantKey(g.parent.partNumber, {
        category: g.parent.category || undefined,
        oem: g.parent.oem || undefined,
        condition: pastedConditionToCondition(g.parent.condition),
      })) ?? null
      const qty = Number.isFinite(g.parent.qty) && g.parent.qty > 0 ? g.parent.qty : 1
      const rate = g.parent.price ?? 0

      if (pv) {
        const hsnRate = pv.hsn_gst_rate != null ? parseFloat(pv.hsn_gst_rate) : undefined
        return {
          ...base,
          type: 'ims_part' as const,
          partId: pv.id,
          partName: pv.name,
          partSku: pv.sku_code,
          category: pv.category_name,
          category_id: pv.category_id,
          brand: pv.oem_name,
          oemId: pv.oem_id ?? undefined,
          is_bom_eligible: pv.is_bom_eligible,
          variantType: pv.condition,
          itemDescription: g.parent.description || pv.description || pv.part_description || undefined,
          qty,
          rate,
          list_price: pv.sell_price ? Number(pv.sell_price) : undefined,
          ...(hsnRate != null ? { tax_rate: hsnRate, taxRateInput: undefined } : {}),
          bomChildren,
          isBomExpanded: bomChildren.length > 0,
        }
      }

      const pastedCat = g.parent.category
      const resolvedCategoryId = pastedCat
        ? categoryNameToId.get(pastedCat.toLowerCase())
        : undefined
      const resolvedCondition = pastedConditionToCondition(g.parent.condition)
      // No catalog match → freeform parent. `partSku` stays undefined so the
      // Part Number cell renders as an empty search input (not a resolved
      // chip); the pasted part number lives in `itemName`.
      return {
        ...base,
        type: 'description' as const,
        itemName: g.parent.partNumber || undefined,
        category: pastedCat,
        category_id: resolvedCategoryId,
        variantType: resolvedCondition ?? g.parent.conditionRaw,
        itemDescription: g.parent.description,
        qty,
        rate,
        bomChildren,
        isBomExpanded: bomChildren.length > 0,
      }
    })

    setLineItems((prev) =>
      mode === "replace" || !hasRealLines ? newLines : [...prev, ...newLines],
    )
  }

  function removeLineItem(id: string) {
    if (lineItems.length <= 1) return
    const removed = lineItems.find((li) => li.id === id)
    setLineItems((prev) => prev.filter((li) => li.id !== id))
    // Saved rows queued for DELETE on next Save — see pendingItemDeletes
    // declaration. New (unsaved) rows just disappear locally.
    if (removed?.serverId) {
      setPendingItemDeletes((prev) =>
        prev.includes(removed.serverId!) ? prev : [...prev, removed.serverId!],
      )
    }
  }

  /** "Clear all" in the grid — drop every line (queueing saved rows for
   *  DELETE exactly like removeLineItem) and leave one fresh empty line so
   *  the builder never renders an empty table. */
  function clearAllLineItems() {
    const savedIds = lineItems.map((li) => li.serverId).filter((x): x is string => !!x)
    if (savedIds.length > 0) {
      setPendingItemDeletes((prev) => [...prev, ...savedIds.filter((id) => !prev.includes(id))])
    }
    setLineItems([createEmptyLineItem()])
  }

  function applyLineItemPartChange(
    id: string,
    next: { partId?: string; partSku?: string; partName?: string; description: string },
    picked?: PickedPart | null
  ) {
    if (picked) {
      const bom = partsWithBOM.find((b) => b.partId === picked.id)
      // Reset the line-level discount when the part actually changes —
      // the previous discount was tied to a different part's price and
      // shouldn't carry over. Re-picking the same part is a no-op.
      const current = lineItems.find((li) => li.id === id)
      const partChanged = picked.id !== current?.partId
      // Pre-seed the per-id Category + OEM caches so the combobox hydrators
      // (`useCategory` / `useOEM`) read from the cache and skip the network
      // on the fresh ids this pick writes to the line. The variants list
      // endpoint already echoes `category_name` + `oem_name` on the picked
      // row, so hitting `/ims/categories/{id}` + `/ims/oems/{id}` on every
      // part select was a redundant round-trip. Shape is minimal — the
      // comboboxes only read `{ id, name }` for the trigger label; the full
      // detail refetches on its own via normal invalidation.
      if (picked.categoryId) {
        qc.setQueryData(['ims', 'categories', picked.categoryId], {
          id: picked.categoryId,
          name: picked.categoryName,
        })
      }
      if (picked.oemId) {
        qc.setQueryData(['ims', 'oems', picked.oemId], {
          id: picked.oemId,
          name: picked.brand,
        })
      }
      updateLineItem(id, {
        type: 'ims_part',
        partId: picked.id,
        partName: picked.name,
        partSku: picked.sku,
        category: picked.categoryName,
        // category_id is the UUID we send to the backend; the picked part
        // carries it (see PartLineFields legacy-id mapping). User can still
        // override via the per-line CategoryOptionsCombobox.
        category_id: picked.categoryId,
        brand: picked.brand,
        oemId: picked.oemId || undefined,
        is_bom_eligible: picked.isBomEligible ?? false,
        variantType: picked.condition,
        partImsId: picked.partImsId,
        rate: picked.sellPrice ?? 0,
        list_price: picked.sellPrice,
        // Show the variant's HSN GST rate as the Tax % when the API resolves
        // one; clear the draft input so the new value renders. When the part
        // actually changes but the new variant has no HSN mapping, fall back
        // to the 18% default — the previous part's rate must not carry over
        // (mirrors the discount reset below). Re-picking the SAME part with
        // no HSN rate leaves whatever the user typed untouched.
        ...(picked.hsnGstRate != null
          ? { tax_rate: picked.hsnGstRate, taxRateInput: undefined }
          : partChanged
            ? { tax_rate: TAXES.DEFAULT_TAX_RATE, taxRateInput: undefined }
            : {}),
        bomId: bom?.bomId,
        bomName: bom?.bomName,
        bomComponents: bom ? buildBomConfigs(bom.items) : [],
        isBomExpanded: false,
        itemDescription: next.description,
        // undefined (not '') so the Disc field shows "0" after the reset —
        // an ''-draft would win over the String(discount_amount) fallback.
        ...(partChanged ? { discount_amount: 0, discountAmountInput: undefined } : {}),
      })
      return
    }

    if (picked === null) {
      // Explicit clear-part → drop the line discount and reset the tax to
      // the 18% default; both were tied to the now-removed part (the tax
      // came from its HSN GST rate) and must not linger on the empty line.
      updateLineItem(id, {
        type: 'description',
        partId: undefined,
        partName: undefined,
        partSku: undefined,
        category: undefined,
        brand: undefined,
        oemId: undefined,
        is_bom_eligible: false,
        variantType: undefined,
        list_price: undefined,
        bomId: undefined,
        bomName: undefined,
        bomComponents: [],
        additionalComponents: [],
        isBomExpanded: false,
        itemDescription: next.description,
        discount_amount: 0,
        // undefined (not '') — blank draft would mask the 0.
        discountAmountInput: undefined,
        tax_rate: TAXES.DEFAULT_TAX_RATE,
        taxRateInput: undefined,
      })
      return
    }

    // Plain text edit on Name and/or Description (no part picked / cleared).
    // Both fields flow through this branch since the Name input is now an
    // open text box (not a dropdown) — keystrokes must persist.
    updateLineItem(id, {
      partName: next.partName,
      itemName: next.partName,
      itemDescription: next.description,
    })
  }

  function openPartPicker(lineItemId: string, mode: 'main' | 'additional' = 'main', additionalCompId?: string) {
    setPartPickerTarget({ lineItemId, mode, additionalCompId })
    setPartPickerOpen(true)
  }

  function handlePartPickerSelect(result: PartPickerResult) {
    if (!partPickerTarget) return

    if (partPickerTarget.mode === 'main') {
      // Main line item part selection
      const bom = partsWithBOM.find((b) => b.partId === result.partId)

      updateLineItem(partPickerTarget.lineItemId, {
        partId: result.partId,
        partName: result.partName,
        partSku: result.partSku,
        category: result.category,
        brand: result.brand,
        variantType: result.variantType,
        rate: result.unitPrice,
        bomId: bom?.bomId,
        bomName: bom?.bomName,
        bomComponents: bom ? buildBomConfigs(bom.items) : [],
        additionalComponents: [],
        isBomExpanded: false,
      })
    }
    // (Mode 'additional' was wired to the legacy inline editor — gone now.
    // The shared LineItemBomEditor uses its own PartCombobox directly.)

    setPartPickerTarget(null)
  }

  function openSwapDialog(lineItemId: string, bomItemId: string, currentPartId: string, currentPartName: string, substituteIds: string[]) {
    setSwapTarget({ lineItemId, bomItemId, currentPartId, currentPartName, substituteIds })
    setSwapDialogOpen(true)
  }

  function handleSwapSelect(result: SwapResult) {
    if (!swapTarget) return

    setLineItems((prev) =>
      prev.map((li) => {
        if (li.id !== swapTarget.lineItemId) return li
        return {
          ...li,
          bomComponents: li.bomComponents.map((c) =>
            c.bomItemId === swapTarget.bomItemId
              ? {
                  ...c,
                  action: 'SWAP' as BOMComponentAction,
                  swapPartId: result.partId,
                  swapPartName: result.partName,
                  swapPartSku: result.partSku,
                }
              : c
          ),
        }
      })
    )

    setSwapTarget(null)
  }

  // ── BOM Component Actions ──

  function toggleBomComponent(lineItemId: string, bomItemId: string) {
    setLineItems((prev) =>
      prev.map((li) => {
        if (li.id !== lineItemId) return li
        return {
          ...li,
          bomComponents: li.bomComponents.map((c) =>
            c.bomItemId === bomItemId
              ? { ...c, action: c.action === 'INCLUDE' ? 'EXCLUDE' : 'INCLUDE' }
              : c
          ),
        }
      })
    )
  }

  function updateComponentQuantity(lineItemId: string, bomItemId: string, qty: number) {
    setLineItems((prev) =>
      prev.map((li) => {
        if (li.id !== lineItemId) return li
        return {
          ...li,
          bomComponents: li.bomComponents.map((c) =>
            c.bomItemId === bomItemId ? { ...c, quantity: qty } : c
          ),
        }
      })
    )
  }

  function resetSwap(lineItemId: string, bomItemId: string) {
    setLineItems((prev) =>
      prev.map((li) => {
        if (li.id !== lineItemId) return li
        return {
          ...li,
          bomComponents: li.bomComponents.map((c) =>
            c.bomItemId === bomItemId
              ? { ...c, action: 'INCLUDE', swapPartId: undefined, swapPartName: undefined, swapPartSku: undefined }
              : c
          ),
        }
      })
    )
  }

  // ── Additional Components ──

  // (Legacy `additionalComponents` handlers removed — the shared
  // LineItemBomEditor now owns BOM child state via `bomChildren`.)

  function handleQtyInputChange(lineItemId: string, raw: string) {
    let cleaned = sanitizeNumericInput(raw)
    if (!/^\d*$/.test(cleaned)) return
    // Cap the digit count (shared across all line-item surfaces). Truncate
    // rather than reject so an over-long paste keeps its leading digits.
    cleaned = clampQtyDigits(cleaned)
    if (cleaned === '') {
      updateLineItem(lineItemId, { qtyInput: '' })
      return
    }
    const parsed = Number.parseInt(cleaned, 10)
    updateLineItem(lineItemId, {
      qtyInput: cleaned,
      ...(Number.isFinite(parsed) && parsed >= 1 ? { qty: parsed } : {}),
    })
  }

  function commitQtyInput(lineItemId: string, raw: string | undefined) {
    const parsed = Number.parseInt((raw ?? '').trim(), 10)
    updateLineItem(lineItemId, {
      qty: Number.isFinite(parsed) && parsed >= 1 ? parsed : 1,
      qtyInput: undefined,
    })
  }

  function handleRateInputChange(lineItemId: string, raw: string) {
    // Rate / Tax % accept at most 2 decimal places (backend caps both at
    // decimal_places=2 — more would 422 on save).
    let cleaned = sanitizeNumericInput(raw)
    if (!/^\d*(\.\d{0,2})?$/.test(cleaned)) return
    // Cap the integer digit count (shared across all line-item surfaces).
    // Truncate rather than reject so an over-long paste keeps its leading
    // integer digits (decimals preserved).
    cleaned = clampPriceDigits(cleaned)
    if (cleaned === '') {
      updateLineItem(lineItemId, { rateInput: '' })
      return
    }
    const parsed = Number(cleaned)
    updateLineItem(lineItemId, {
      rateInput: cleaned,
      rate: Number.isFinite(parsed) && parsed >= 0 ? parsed : 0,
    })
  }

  function commitRateInput(lineItemId: string, raw: string | undefined) {
    const parsed = Number((raw ?? '').trim())
    updateLineItem(lineItemId, {
      rate: Number.isFinite(parsed) && parsed >= 0 ? parsed : 0,
      rateInput: undefined,
    })
  }

  function handleDiscountInputChange(lineItemId: string, raw: string) {
    // Discount amount is currency — at most 2 decimal places, same as rate/tax
    // above (backend caps at decimal_places=2; more would 422 on save).
    const cleaned = sanitizeNumericInput(raw)
    if (!/^\d*(\.\d{0,2})?$/.test(cleaned)) return
    if (cleaned === '') {
      // Clearing the field has to also zero out `discount_amount` —
      // otherwise the calc keeps using the previously-typed value until
      // blur and the preview total looks frozen.
      updateLineItem(lineItemId, { discountAmountInput: '', discount_amount: 0 })
      return
    }
    const parsed = Number(cleaned)
    updateLineItem(lineItemId, {
      discountAmountInput: cleaned,
      discount_amount: Number.isFinite(parsed) && parsed >= 0 ? parsed : 0,
    })
  }

  function commitDiscountInput(lineItemId: string, raw: string | undefined) {
    const parsed = Number(sanitizeNumericInput(raw ?? ''))
    updateLineItem(lineItemId, {
      discount_amount: Number.isFinite(parsed) && parsed >= 0 ? parsed : 0,
      discountAmountInput: undefined,
    })
  }

  function handleTaxInputChange(lineItemId: string, raw: string) {
    // Rate / Tax % accept at most 2 decimal places (backend caps both at
    // decimal_places=2 — more would 422 on save).
    const cleaned = sanitizeNumericInput(raw)
    if (!/^\d*(\.\d{0,2})?$/.test(cleaned)) return
    if (cleaned === '') {
      // Clearing → zero tax_rate immediately so the calc preview refreshes;
      // keep the input blank (no default).
      updateLineItem(lineItemId, { taxRateInput: '', tax_rate: 0 })
      return
    }
    const parsed = Number(cleaned)
    if (!Number.isFinite(parsed)) return
    // Tax % is bounded to [0, 100]. Reject the keystroke (don't update the
    // visible input) when it would push the value past 100, so the field
    // can never display an out-of-range number — matching the underlying
    // clamp on `tax_rate`.
    if (parsed > 100) return
    updateLineItem(lineItemId, {
      taxRateInput: cleaned,
      tax_rate: parsed,
    })
  }

  function commitTaxInput(lineItemId: string, raw: string | undefined) {
    const trimmed = (raw ?? '').trim()
    // Empty stays empty — no default tax is injected on blur.
    if (trimmed === '') {
      updateLineItem(lineItemId, { tax_rate: 0, taxRateInput: '' })
      return
    }
    const parsed = Number(trimmed)
    updateLineItem(lineItemId, {
      tax_rate: Number.isFinite(parsed) ? Math.min(Math.max(parsed, 0), 100) : 0,
      taxRateInput: Number.isFinite(parsed) ? undefined : '',
    })
  }

  // ── Totals (server-driven via POST /quotes/calculate) ──
  //
  // Build the calculate payload from the form state. Lines with qty<=0 or
  // a rental row with missing dates would 422 — skip them client-side and
  // let the server-truth render whatever lines pass validation. The header
  // discount field on the form is in the same units as `discount_amount`
  // (₹). Changes are routed through `useDebounce` so we don't spam the API
  // as the user types.

  function buildCalcLine(li: QuoteBuilderLineItem, idx: number): QuoteCalculateLinePayload | null {
    if (!Number.isFinite(li.qty) || li.qty <= 0) return null

    // `category_id` is optional on `QuoteCalculateLine` (backend schema —
    // see quote.py:573), so we forward whatever the form has and let the
    // server compute totals without it. This means the preview starts
    // refreshing the moment qty/rate change, even before the user picks
    // a category — and the same path covers the "part number just
    // selected, category about to auto-fill" race.
    //
    // Rental shape, on the other hand, IS strictly validated server-side
    // (is_rental=true requires period + both dates — see
    // _validate_rental_shape). So when the user has flipped Rental ON
    // but hasn't picked dates yet we send the line as a regular (non-
    // rental) row instead of dropping it; the totals area still updates
    // while they finish filling in the rental fields.
    const rentalReady =
      li.is_rental &&
      Boolean(li.rental_period) &&
      Boolean(li.rental_start_date) &&
      Boolean(li.rental_end_date)

    // Name is strictly user-typed (or part-derived). No description
    // fallback — description was leaking into name slots downstream.
    const name = (li.partName?.trim() || li.itemName?.trim() || '').trim()
    return {
      part_variant_id: li.partId,
      category_id: li.category_id,
      // Backend requires non-empty item_name. If the user hasn't typed
      // a name (and no part is picked), send "-" as a placeholder so
      // the save still goes through instead of 422-ing.
      item_name: name || '-',
      // description omitted: /calculate math (subtotal/tax/grand_total) is
      // driven by qty/rate/tax/discount only — sending it would just churn
      // the queryKey on description edits and refetch with no effect.
      qty: li.qty,
      rate: li.rate,
      discount_amount: li.discount_amount > 0 ? li.discount_amount : undefined,
      tax_rate: li.tax_rate,
      sort_order: idx,
      is_rental: rentalReady,
      rental_period: rentalReady ? li.rental_period : undefined,
      rental_start_date: rentalReady ? li.rental_start_date : undefined,
      rental_end_date: rentalReady ? li.rental_end_date : undefined,
    }
  }

  // Backend f3e8b18 (2026-05-29): /calculate accepts the SAME nested
  // children shape as POST /quotes. Children live under `parent.children`,
  // carry `config_action`, and `category_id` is required on every row.
  // Source: the shared `bomChildren` array on the line — same data the
  // `LineItemBomSection` editor writes to.
  function buildChildrenForCalcLine(
    parent: QuoteBuilderLineItem,
  ): QuoteCalculateChildPayload[] {
    // Early-return commented out — category_id is now optional on quote
    // line items; a headline without one still needs to emit its children.
    // if (!parent.category_id) return []
    return (parent.bomChildren ?? [])
      .filter((c) => Number.isFinite(c.qty) && c.qty > 0)
      .map<QuoteCalculateChildPayload>((c, childIdx) => ({
        config_action: 'Add',
        part_variant_id: c.partId,
        // Children inherit the parent's category_id when the row has
        // none of its own (matches the persist-path fallback).
        category_id: c.categoryId ?? parent.category_id!,
        // Child name is strictly user-typed; no description fallback.
        // Fall back to "-" only at the wire (backend requires non-empty).
        item_name: resolveChildName(c) || '-',
        // description omitted from /calculate — see headline note above.
        qty: c.qty,
        rate: c.rate,
        tax_rate: c.taxRate ?? parent.tax_rate,
        // Per-child discount — without this the payload is invariant to
        // discount edits on a child row, queryKey doesn't change, and
        // `/calculate` never refetches.
        discount_amount: c.discountAmount > 0 ? c.discountAmount : undefined,
        sort_order: childIdx,
      }))
  }

  const calcRequest = useMemo(() => {
    // Header discount removed (QUOTE-4) — backend rejects `discount_*`
    // at the request root with 422 (extra='forbid'). The discount UI is
    // already hidden via TotalsSection's `hideDiscount` flag.
    const items: QuoteCalculateLinePayload[] = []
    lineItems.forEach((li, idx) => {
      const head = buildCalcLine(li, idx)
      if (!head) return
      const children = buildChildrenForCalcLine(li)
      items.push(children.length > 0 ? { ...head, children } : head)
    })
    return { items }
  }, [lineItems])

  // Block the /calculate call entirely while ANY line or BOM child has a
  // discount that exceeds its amount — the backend 422s such a payload, so
  // there's no point firing it. The offending input shows an inline error;
  // totals hold their last good value (keepPreviousData) until it's fixed.
  // This covers paste exactly like typing: a paste fires the same `onChange`
  // (after the numeric sanitizer), so the over-limit value lands in state,
  // flips this flag, and the request below is gated before it can go out.
  const hasDiscountError = useMemo(
    () =>
      lineItems.some(
        (li) =>
          lineDiscountError(li) ||
          (li.bomChildren ?? []).some((c) => bomChildDiscountError(c)),
      ),
    [lineItems],
  )

  // Defense in depth: when invalid, feed the query an empty payload so it's
  // disabled by BOTH `enabled: false` AND `items.length === 0` — no debounce
  // timing window can let a stale over-limit payload reach the network.
  const effectiveCalcRequest = useMemo(
    () => (hasDiscountError ? { items: [] } : calcRequest),
    [hasDiscountError, calcRequest],
  )
  const debouncedCalcRequest = useDebounce(effectiveCalcRequest, UI.DEBOUNCE_SEARCH_MS)

  const calcQuery = useQuoteCalculate(debouncedCalcRequest, {
    enabled: !hasDiscountError,
  })

  // Surface /calculate failures via a toast — without this the totals row
  // silently freezes at zero on a 422 (bad payload) or 5xx and the user
  // has no signal anything went wrong. Refire the toast only when the
  // error identity actually changes so a stuck error doesn't spam.
  const lastCalcErrorMsgRef = useRef<string | null>(null)
  useEffect(() => {
    if (!calcQuery.isError) {
      lastCalcErrorMsgRef.current = null
      return
    }
    const msg =
      (calcQuery.error instanceof Error && calcQuery.error.message) ||
      S.toast.calcFailedPlain
    if (msg !== lastCalcErrorMsgRef.current) {
      lastCalcErrorMsgRef.current = msg
      toast.error(S.toast.calcFailed(msg))
    }
  }, [calcQuery.isError, calcQuery.error])

  // Build a stable lookup of server-computed per-line money keyed by
  // `sort_order` so the row render can pull `gross_amount` / `amount` /
  // `tax_amount` / `rental_duration_units` without re-doing math locally.
  const calcByLine = useMemo(() => {
    const m = new Map<number, NonNullable<typeof calcQuery.data>['items'][number]>()
    for (const r of calcQuery.data?.items ?? []) m.set(r.sort_order, r)
    return m
  }, [calcQuery.data])

  // Header totals come straight from the calc response — TotalsSection
  // renders them verbatim, no FE math. While the first request is in
  // flight (or all rows fail validation) these read zero rather than a
  // stale local fallback.
  const subtotal = calcQuery.data?.subtotal ?? 0
  const totalLineDiscount = calcQuery.data?.total_line_discount ?? 0
  const totalTaxAmount = calcQuery.data?.total_tax ?? 0
  const taxableAmount = calcQuery.data?.taxable_amount ?? 0
  const grandTotal = calcQuery.data?.grand_total ?? 0

  // ── API mutations ──
  const createMut = useCreateQuote()
  const updateMut = useUpdateQuote(existing?.id ?? '')
  const deleteItemMut = useDeleteQuoteItem(existing?.id ?? '')
  const versionMut = useVersionQuote()

  // ── Dirty detection (reports to parent via `onDirtyChange`) ─────────
  // Snapshot the header fields + a stable summary of line items the user can
  // edit. `existing` is the post-load source of truth in edit mode; create
  // mode uses the hardcoded defaults that mirror `useState` initializers.
  const summarizeLine = (li: QuoteBuilderLineItem) => ({
    serverId: li.serverId,
    type: li.type,
    partId: li.partId,
    itemName: li.itemName,
    itemDescription: li.itemDescription,
    category_id: li.category_id,
    qty: li.qty,
    rate: li.rate,
    tax_rate: li.tax_rate,
    discount_amount: li.discount_amount,
    is_rental: li.is_rental,
    rental_period: li.rental_period,
    rental_start_date: li.rental_start_date,
    rental_end_date: li.rental_end_date,
    // BOM state — without this, edits to the per-line "Configuration
    // Notes" or BOM children slip past the dirty check and the user
    // sees "No changes to save". Local row ids (`c.id`) are randomly
    // regenerated on every hydrate so we project to business fields
    // only; including `id` would make mount-time always-dirty.
    configNotes: (li.configNotes ?? '').trim(),
    warrantyLevel: (li.warrantyLevel ?? '').trim(),
    bomChildren: (li.bomChildren ?? []).map((c) => ({
      partId: c.partId,
      itemName: c.itemName,
      description: c.description,
      categoryId: c.categoryId,
      qty: c.qty,
      rate: c.rate,
      taxRate: c.taxRate,
      discountAmount: c.discountAmount,
      warrantyLevel: (c.warrantyLevel ?? '').trim(),
    })),
  })
  const dirtyInitial = useMemo(() => {
    if (existing) {
      return {
        quotableType: existing.quotable_type,
        quotableId: existing.quotable_id,
        validUntil: existing.valid_until ?? '',
        notes: existing.notes ?? '',
        terms: existing.terms_conditions ?? '',
        discount: existing.discount_amount ?? 0,
        brandId: existing.brand_id ?? '',
        clauses: clausesToPayload((existing.terms ?? []).map(clauseFromTerm)),
        lines: [...existing.items]
          .filter((it) => it.parent_quote_item_id == null)
          .sort((a, b) => a.sort_order - b.sort_order)
          .map(lineItemFromServer)
          .map(summarizeLine),
      }
    }
    return {
      // Mirrors the quotableType useState initializer above — the two must
      // agree or a fresh quote mounts with dirty=true.
      quotableType: (initialLeadId
        ? 'lead'
        : initialDealId
          ? 'deal'
          : initialAccountId
            ? 'account'
            : 'lead') as QuotableType,
      quotableId: initialAccountId || initialLeadId || initialDealId || '',
      // Seed baseline with the same prefilled "today + 10" default we put in
      // the validUntil state above, so mounting a fresh quote doesn't
      // immediately flip the panel to dirty=true and stage the unsaved
      // dialog before the user has typed anything.
      validUntil: defaultValidUntilIso,
      notes: '',
      terms: '',
      discount: 0,
      brandId: '',
      clauses: [] as ReturnType<typeof clausesToPayload>,
      lines: [summarizeLine(createEmptyLineItem())],
    }
  }, [existing, initialAccountId, initialLeadId, initialDealId, defaultValidUntilIso])

  const dirtyCurrent = useMemo(
    () => ({
      quotableType,
      quotableId:
        quotableType === 'account'
          ? selectedAccountId
          : quotableType === 'lead'
            ? selectedLead?.id ?? ''
            : selectedDeal?.id ?? '',
      validUntil,
      notes,
      terms,
      discount,
      // Brand is frozen after create, so in edit mode it never contributes to
      // dirtiness (and the async brand resolve mustn't spuriously flip the
      // unsaved-changes guard). Only the create-mode user pick matters.
      brandId: existing ? existing.brand_id ?? '' : selectedBrand?.id ?? '',
      clauses: clausesToPayload(clauseCtrl.clauses),
      lines: lineItems.map(summarizeLine),
    }),
    [
      quotableType,
      selectedAccountId,
      selectedLead,
      selectedDeal,
      validUntil,
      notes,
      terms,
      discount,
      selectedBrand,
      clauseCtrl.clauses,
      lineItems,
    ],
  )

  const submitInFlight =
    createMut.isPending ||
    updateMut.isPending ||
    versionMut.isPending ||
    createMut.isSuccess ||
    updateMut.isSuccess ||
    versionMut.isSuccess
  // View-only mode never shows the prompt — the user can't be editing.
  const computedDirty =
    !viewLocked && !submitInFlight && !deepEqualLocal(dirtyCurrent, dirtyInitial)

  useEffect(() => {
    onDirtyChange?.(computedDirty)
  }, [computedDirty, onDirtyChange])

  // We hit the raw `updateQuoteApi` / `deleteQuoteItemApi` (not the hooks)
  // in two places: the amend save chain (target id is a freshly-created
  // draft, not `existing.id` so the hook-bound mutations don't fit) and
  // the trash-queue cleanup at the end of regular edit. Those raw calls
  // bypass the hook layer's `onSuccess` invalidation, so the detail query
  // cache stays stuck on its pre-mutation snapshot — including the one
  // pre-warmed by the version POST. Grab the QueryClient so we can flush
  // both detail + list keys ourselves after each manual call.
  const qc = useQueryClient()

  // Resolve the polymorphic upstream party. The first (Type) dropdown
  // picks the slot; we read the id from its matching state.
  function resolveQuotable():
    | { quotable_type: QuotableType; quotable_id: string }
    | { error: string } {
    if (quotableType === 'lead') {
      const id = selectedLead?.id ?? ''
      return id
        ? { quotable_type: 'lead', quotable_id: id }
        : { error: S.validation.pickLead }
    }
    if (quotableType === 'deal') {
      const id = selectedDeal?.id ?? ''
      return id
        ? { quotable_type: 'deal', quotable_id: id }
        : { error: S.validation.pickDeal }
    }
    return selectedAccountId
      ? { quotable_type: 'account', quotable_id: selectedAccountId }
      : { error: S.validation.pickAccount }
  }

  // Convert form line items to the API payload. The cross-part variants API
  // (`/api/v1/ims/variants`) is now wired to the Part Number dropdown, so
  // when the user picks a row we forward its `part_variant_id` — backend
  // links the line to the catalog entry. The PATCH path
  // (`buildUpsertItems`) does the same thing on line 916.
  function buildItemsPayload(): QuoteItemCreatePayload[] | { error: string } {
    if (lineItems.length === 0) {
      return { error: S.validation.addLineItem }
    }
    const out: QuoteItemCreatePayload[] = []
    for (const [idx, li] of lineItems.entries()) {
      // Name is optional. Send it only when the user typed one (or it was
      // derived from the picked part); otherwise omit `item_name` and let
      // the backend auto-fill from the variant on catalog rows.
      const name = (li.partName?.trim() || li.itemName?.trim() || '').trim()
      if (name.length > 255) return { error: S.validation.lineNameTooLong(idx + 1) }
      // Headline category required check commented out — category_id is
      // now optional on quote line items (DB column nullable since
      // migration 202610211400). SO + Close-Won still enforce it.
      // if (!li.category_id) {
      //   return { error: S.validation.linePickCategory(idx + 1) }
      // }
      if (!Number.isFinite(li.qty) || li.qty < 1) {
        return { error: S.validation.lineQtyMin(idx + 1) }
      }
      if (!Number.isFinite(li.rate) || li.rate < 0) {
        return { error: S.validation.lineRateMin(idx + 1) }
      }
      // Description required check commented out — description is now
      // optional on quote line items per user request.
      // if (stripHtml(li.itemDescription).length === 0) {
      //   return { error: S.validation.lineDescriptionRequired(idx + 1) }
      // }
      for (const child of li.bomChildren ?? []) {
        if (bomChildIdentityError(child)) {
          return { error: S.validation.lineComponentIdentity(idx + 1) }
        }
        // Category required check commented out — category_id is now
        // optional on quote BOM children (DB column nullable since
        // migration 202610211400). SO + Close-Won still enforce it.
        // if (bomChildCategoryError(child)) {
        //   return { error: S.validation.lineComponentCategory(idx + 1) }
        // }
      }
      // Rental shape — backend rejects partial. Mirror its rule client-side
      // so users see a friendly error instead of a 422 they can't action.
      if (li.is_rental) {
        if (!li.rental_period) return { error: S.validation.lineRentalPeriod(idx + 1) }
        if (!li.rental_start_date) return { error: S.validation.lineRentalStart(idx + 1) }
        if (!li.rental_end_date) return { error: S.validation.lineRentalEnd(idx + 1) }
        if (li.rental_end_date < li.rental_start_date) {
          return { error: S.validation.lineRentalEndOrder(idx + 1) }
        }
      }
      const children = buildChildrenForLine(li)
      // Catalog rows (partId set) omit item_name and let the backend
      // auto-fill from the variant. Freeform rows have no variant, so the
      // backend requires a non-empty name — fall back ONLY to a generic
      // label, NEVER the description (that leaked the description into the
      // name slot on the saved record).
      const itemName = li.partId ? name : name || '-'
      out.push({
        part_variant_id: li.partId || undefined,
        condition: li.variantType || undefined,
        oem_id: li.oemId || undefined,
        category_id: li.category_id!,
        ...(itemName ? { item_name: itemName } : {}),
        description: (li.itemDescription ?? '').trim() || null,
        qty: li.qty,
        rate: li.rate,
        // Snapshot of IMS sell_price at pick time; survives sell_price changes.
        list_price: li.list_price,
        discount_amount: li.discount_amount || undefined,
        tax_rate: li.tax_rate,
        sort_order: idx,
        configuration_notes: (li.configNotes ?? '').trim() || undefined,
        warranty_level: (li.warrantyLevel ?? '').trim() || undefined,
        is_rental: li.is_rental || undefined,
        rental_period: li.is_rental ? li.rental_period : undefined,
        rental_start_date: li.is_rental ? li.rental_start_date : undefined,
        rental_end_date: li.is_rental ? li.rental_end_date : undefined,
        // Always emit `children` — empty array when no child is selected.
        children,
      })
    }
    return out
  }

  // QUOTE-4 — convert the shared `bomChildren` rows to BOM child create
  // payloads (POST /quotes branch). `category_id` is REQUIRED on every
  // child server-side; we inherit the parent line's id when the child
  // has none so routing/reports stay coherent within the quote.
  function buildChildrenForLine(
    parent: QuoteBuilderLineItem,
  ): QuoteBomChildCreatePayload[] {
    // Early-return commented out — category_id is now optional on quote
    // line items; a headline without one still needs to emit its children.
    // if (!parent.category_id) return []
    return (parent.bomChildren ?? [])
      .filter((c) => Number.isFinite(c.qty) && c.qty > 0)
      .map<QuoteBomChildCreatePayload>((c, idx) => {
        // Child name comes ONLY from a selected part — NEVER the Description.
        // Freeform children (no part) send '-' so the Description can't leak
        // into item_name (mirrors the BOM editor / mappers contract).
        const name = resolveChildName(c) || '-'
        return {
          config_action: 'Add',
          part_variant_id: c.partId || undefined,
          // Per-child Brand/OEM + Condition — gated on backend readiness.
          // See QUOTE_CHILD_SENDS_OEM_CONDITION at the top of this file.
          ...(QUOTE_CHILD_SENDS_OEM_CONDITION && c.oemId ? { oem_id: c.oemId } : {}),
          ...(QUOTE_CHILD_SENDS_OEM_CONDITION && c.condition ? { condition: c.condition } : {}),
          category_id: c.categoryId ?? parent.category_id!,
          item_name: name,
          description: c.description?.trim() || undefined,
          qty: c.qty,
          rate: c.rate >= 0 ? c.rate : undefined,
          tax_rate: c.taxRate ?? parent.tax_rate,
          discount_amount: c.discountAmount > 0 ? c.discountAmount : undefined,
          sort_order: idx,
          warranty_level: (c.warrantyLevel ?? '').trim() || undefined,
        }
      })
  }

  // Has a saved row been edited vs the server snapshot? Compares every
  // mutable field we transmit on PATCH so a category, tax_rate, or part
  // change marks the row dirty.
  function isDirty(li: QuoteBuilderLineItem, idx: number): boolean {
    if (!li.serverId) return true // new row — always send
    const original = originalItemsById.get(li.serverId)
    if (!original) return true // server doesn't recognize it — send and let backend reject
    const name = (li.partName?.trim() || li.itemName?.trim() || '').trim()
    const desc = (li.itemDescription ?? '').trim()
    const origDesc = (original.description ?? '').trim()
    // BOM-tree diff: compare the in-form `bomChildren` against the
    // server's `original.children` by `serverChildId` (Add rows only;
    // Remove rows aren't surfaced in this UI yet). Counts +
    // by-id-business-field equality catches additions, removals, and
    // per-child edits. Without this, child edits silently pass through
    // dirty-check and the PATCH skips the row.
    const origAddChildren = (original.children ?? []).filter(
      (c) => c.config_action !== 'Remove',
    )
    const inFormChildren = li.bomChildren ?? []
    let childrenChanged = origAddChildren.length !== inFormChildren.length
    if (!childrenChanged) {
      const origById = new Map(origAddChildren.map((c) => [c.id, c]))
      for (const c of inFormChildren) {
        if (!c.serverChildId) {
          // newly added child on a saved parent — definitely dirty
          childrenChanged = true
          break
        }
        const o = origById.get(c.serverChildId)
        if (!o) {
          childrenChanged = true
          break
        }
        const cDesc = (c.description ?? '').trim()
        const oDesc = (o.description ?? '').trim()
        const cName = (c.itemName ?? '').trim()
        if (
          cName !== o.item_name ||
          cDesc !== oDesc ||
          Number(c.qty) !== Number(o.qty) ||
          Number(c.rate) !== Number(o.rate) ||
          // Per-child discount + tax changes must mark the parent dirty —
          // without these the BOM editor's Disc ₹ / Tax % edits silently
          // pass through `isDirty`, the parent row gets filtered out of
          // `buildUpsertItems(dirtyOnly: true)`, and Save toasts
          // "No changes to save" while the child's new amount is real.
          Number(c.discountAmount ?? 0) !== Number(o.discount_amount ?? 0) ||
          Number(c.taxRate ?? 0) !== Number(o.tax_rate ?? 0) ||
          (c.partId ?? null) !== (o.part_variant_id ?? null) ||
          // Per-child Brand/OEM + Condition edits must mark the parent dirty
          // or the PATCH filters the row out and the change silently drops.
          (c.oemId ?? null) !== (o.oem_id ?? null) ||
          (c.condition ?? null) !== (o.condition ?? null)
        ) {
          childrenChanged = true
          break
        }
      }
    }
    return (
      name !== original.item_name ||
      desc !== origDesc ||
      Number(li.qty) !== Number(original.qty) ||
      Number(li.rate) !== Number(original.rate) ||
      Number(li.discount_amount) !== Number(original.discount_amount ?? 0) ||
      Number(li.tax_rate) !== Number(original.tax_rate) ||
      (li.category_id ?? null) !== (original.category_id ?? null) ||
      (li.partId ?? null) !== (original.part_variant_id ?? null) ||
      idx !== original.sort_order ||
      Boolean(li.is_rental) !== Boolean(original.is_rental) ||
      (li.rental_period ?? null) !== (original.rental_period ?? null) ||
      (li.rental_start_date ?? null) !== (original.rental_start_date ?? null) ||
      (li.rental_end_date ?? null) !== (original.rental_end_date ?? null) ||
      (li.configNotes ?? '').trim() !== (original.configuration_notes ?? '').trim() ||
      (li.warrantyLevel ?? '').trim() !== (original.warranty_level ?? '').trim() ||
      childrenChanged
    )
  }

  // Build the upsert array. PATCH carries every editable field — backend
  // resolves create vs. update by `id` and applies category_id /
  // part_variant_id / tax_rate updates against the existing item.
  function buildUpsertItems(
    idMapper: (li: QuoteBuilderLineItem) => string | undefined,
    options: { dirtyOnly: boolean },
  ): QuoteItemUpsertPayload[] {
    const out: QuoteItemUpsertPayload[] = []
    lineItems.forEach((li, idx) => {
      const id = idMapper(li)
      // dirtyOnly path: skip saved-and-untouched rows entirely. Rows
      // without an id (new) always get sent.
      if (options.dirtyOnly && id && !isDirty(li, idx)) return

      // Name is strictly user-typed; no "Untitled line" default and no
      // description fallback.
      const name = (li.partName?.trim() || li.itemName?.trim() || '').trim()
      // Children are only emitted on the CREATE branch (id absent).
      // QUOTE-4 immutability rule: `parent_quote_item_id` and
      // `config_action` are frozen on existing rows, so we never edit
      // a BOM tree via the upsert PATCH — sales would soft-delete the
      // line and re-add fresh.
      // For NEW rows (id absent) → create-shape children (no child id).
      // For EXISTING rows (id present) → upsert-shape children with each
      // hydrated child's `serverChildId` so backend updates by id instead
      // of inserting duplicates. Brand-new components on a saved parent
      // have no `serverChildId` → they create.
      const children: QuoteBomChildUpsertPayload[] = id
        ? buildChildrenForUpsert(li)
        : buildChildrenForLine(li)
      // Catalog rows omit item_name (backend auto-fills from the variant);
      // freeform rows have no variant, so fall back ONLY to a generic label
      // to satisfy the backend's non-empty requirement — NEVER the
      // description (that leaked the description into the name slot).
      const itemName = li.partId ? name : name || '-'
      const base: QuoteItemUpsertPayload = {
        id,
        ...(itemName ? { item_name: itemName } : {}),
        description: (li.itemDescription ?? '').trim() || null,
        qty: li.qty,
        rate: li.rate,
        // Snapshot of IMS sell_price at pick time; survives sell_price changes.
        list_price: li.list_price,
        // Always send discount_amount on PATCH — omitting it leaves the old
        // server value in place. If the user cleared the discount the field is
        // 0 here, and we need the backend to apply that zero so it doesn't
        // re-validate a stale non-zero discount against the new gross.
        discount_amount: li.discount_amount,
        tax_rate: li.tax_rate,
        category_id: li.category_id,
        // Existing line whose variant was cleared → explicit null so the PATCH
        // drops it (omitting keeps the old variant); the line becomes freeform.
        // New line (no id) with no part → omit.
        part_variant_id: li.partId || (id ? null : undefined),
        condition: li.variantType || undefined,
        oem_id: li.oemId || undefined,
        sort_order: idx,
        configuration_notes: (li.configNotes ?? '').trim() || undefined,
        warranty_level: (li.warrantyLevel ?? '').trim() || undefined,
        is_rental: li.is_rental || undefined,
        rental_period: li.is_rental ? li.rental_period : undefined,
        rental_start_date: li.is_rental ? li.rental_start_date : undefined,
        rental_end_date: li.is_rental ? li.rental_end_date : undefined,
        // Always emit `children` — empty array when no child is selected.
        children,
      }
      // Inline children are honoured by the backend only on the create
      // branch (id absent); skip them for existing rows.
      if (!id) {
        // Gated on backend readiness — see QUOTE_CHILD_SENDS_OEM_CONDITION
        // at the top of this file.
        const children = bomChildrenToCreatePayload(li.bomChildren ?? [], undefined, {
          withOemCondition: QUOTE_CHILD_SENDS_OEM_CONDITION,
        })
        if (children.length) base.children = children
      }
      out.push(base)
    })
    return out
  }

  // PATCH-flavour child payload — keeps the hydrated `serverChildId` so
  // existing children update by id (backend `QuoteBomChildUpsert`). Rows
  // without a `serverChildId` are newly-added components on a saved
  // parent and dispatch as creates.
  function buildChildrenForUpsert(
    parent: QuoteBuilderLineItem,
  ): QuoteBomChildUpsertPayload[] {
    // Early-return commented out — category_id is now optional on quote
    // line items; a headline without one still needs to emit its children.
    // if (!parent.category_id) return []
    return (parent.bomChildren ?? [])
      .filter((c) => Number.isFinite(c.qty) && c.qty > 0)
      .map<QuoteBomChildUpsertPayload>((c, idx) => {
        // Child name comes ONLY from a selected part — NEVER the Description.
        // Freeform children (no part) send '-' so the Description can't leak
        // into item_name (mirrors the BOM editor / mappers contract).
        const name = resolveChildName(c) || '-'
        return {
          id: c.serverChildId,
          // config_action is immutable on existing children — backend
          // silently ignores when id is present; safe to omit.
          ...(c.serverChildId ? {} : { config_action: 'Add' as const }),
          // Existing child whose variant was cleared → explicit null so the
          // PATCH drops it (omitting keeps the old variant). New child with no
          // part → omit (undefined). Catalog child → its variant id.
          part_variant_id: c.partId || (c.serverChildId ? null : undefined),
          // Per-child Brand/OEM + Condition — gated on backend readiness.
          // See QUOTE_CHILD_SENDS_OEM_CONDITION at the top of this file.
          ...(QUOTE_CHILD_SENDS_OEM_CONDITION && c.oemId ? { oem_id: c.oemId } : {}),
          ...(QUOTE_CHILD_SENDS_OEM_CONDITION && c.condition ? { condition: c.condition } : {}),
          category_id: c.categoryId ?? parent.category_id!,
          item_name: name,
          description: c.description?.trim() || undefined,
          qty: c.qty,
          rate: c.rate >= 0 ? c.rate : undefined,
          ...(c.listPrice != null ? { list_price: c.listPrice } : {}),
          tax_rate: c.taxRate ?? parent.tax_rate,
          discount_amount: c.discountAmount > 0 ? c.discountAmount : undefined,
          sort_order: idx,
          warranty_level: (c.warrantyLevel ?? '').trim() || undefined,
        }
      })
  }

  // Field-keyed validation that powers the inline FieldError UI.
  //   - `quotable`       → header (account/lead/deal must be picked)
  //   - `items`          → overall ("Add at least one line item")
  //   - `item:{id}:name` → row name
  //   - `item:{id}:category`
  //   - `item:{id}:qty`
  //   - `item:{id}:rate`
  //   - `item:{id}:rental_period|rental_start_date|rental_end_date`
  // resolveQuotable / buildItemsPayload still own backend-shape failures;
  // this pass exists so the user sees WHICH field is wrong before we hit
  // the API.
  function validateForm(): Record<string, string> {
    const e: Record<string, string> = {}

    if (
      (quotableType === 'lead' && !selectedLead?.id) ||
      (quotableType === 'deal' && !selectedDeal?.id) ||
      (quotableType === 'account' && !selectedAccountId)
    ) {
      e.quotable = S.validation.pickEntity(quotableType)
    }

    // Business Vertical is required. Enforced where the field is shown and
    // editable — create mode and amend, non-SO-embed. Amend spawns a fresh
    // draft version and sends `brand_id`, so a legacy null-brand quote must
    // pick one before the new version is written. Plain edit stays exempt: the
    // brand is frozen there and a legacy null can't be set via PATCH.
    if ((!isEdit || amendMode) && !isSalesOrderEmbedded && !resolvedBrand) {
      e.vertical = S.validation.selectVertical
    }

    // Order Type is required on create. An SO-embedded quote takes its type
    // from the order, and a saved quote always has one derived from its items.
    if (!isEdit && !isSalesOrderEmbedded && !quoteType) {
      e.orderType = S.validation.selectOrderType
    }

    // A rental quote needs its period: every line inherits it, and the SO
    // made from the quote takes it as the order's rental window.
    if (quoteType === 'Rental' && (!rentalStartDate || !rentalEndDate)) {
      e.rentalWindow = S.validation.rentalWindowRequired
    }

    if (lineItems.length === 0) {
      e.items = S.validation.addLineItem
    }

    for (const [idx, li] of lineItems.entries()) {
      // Part Name is required on every quote line — catalog rows auto-fill
      // it from the picked part; freeform rows must type one. Part Number
      // is NOT required on a quote, so we deliberately do NOT emit an
      // `:identity` key (the Part Number cell must never turn red).
      const name = (li.partName?.trim() || li.itemName?.trim() || '').trim()
      if (!li.partId && !name) {
        e[`item:${li.id}:name`] = S.validation.nameRequired
      } else if (name.length > 255) {
        e[`item:${li.id}:name`] = S.validation.nameTooLong
      }
      // Headline category required check commented out — see save-validator above.
      // if (!li.category_id) {
      //   e[`item:${li.id}:category`] = S.validation.pickCategory
      // }
      // Description required check commented out — description is now
      // optional on quote line items per user request.
      // if (stripHtml(li.itemDescription).length === 0) {
      //   e[`item:${li.id}:description`] = S.validation.descriptionRequired
      // }
      if (!Number.isFinite(li.qty) || li.qty < 1) {
        e[`item:${li.id}:qty`] = S.validation.qtyMin
      }
      // Rate must be > 0 — a 0 (or invalid) rate is an unpriced line and is
      // blocked on save.
      if (!Number.isFinite(li.rate) || li.rate <= 0) {
        e[`item:${li.id}:rate`] = S.validation.rateRequired
      }
      // Every BOM component must also be priced (> 0). The offending child
      // shows its own inline error via `bomChildRateError` in the editor; this
      // just guarantees save is blocked. Key per child so multiple bad rows
      // each register.
      // Per-child validation. On a quote, Part Number is NOT required;
      // Name is the required identifier (catalog-picked rows auto-fill
      // it, freeform rows must type one) and Category is mandatory.
      // Rate is intentionally NOT required: pasted components drop
      // their price (the parent's price covers the whole config) and
      // the backend schema marks rate optional on BOM children. Keys
      // are per-child (`item:<lineId>:child:<childId>:<field>`) so the
      // shared LineItemsGrid lights up ONLY the offending child's
      // cells — and we deliberately do NOT emit an `:identity` key so
      // the Part Number cell never turns red on a quote.
      for (const child of li.bomChildren ?? []) {
        if (!child.partId && !child.itemName?.trim()) {
          e[`item:${li.id}:child:${child.id}:name`] =
            S.validation.componentNameRequired
        }
        // Category required check commented out — see save-validator above.
        // if (bomChildCategoryError(child)) {
        //   e[`item:${li.id}:child:${child.id}:category`] =
        //     S.validation.componentCategoryRequired
        // }
      }
      if (li.is_rental) {
        if (!li.rental_period) {
          e[`item:${li.id}:rental_period`] = S.validation.rentalPeriodRequired
        }
        if (!li.rental_start_date) {
          e[`item:${li.id}:rental_start_date`] = S.validation.rentalStartRequired
        }
        if (!li.rental_end_date) {
          e[`item:${li.id}:rental_end_date`] = S.validation.rentalEndRequired
        }
        if (
          li.rental_start_date &&
          li.rental_end_date &&
          li.rental_end_date < li.rental_start_date
        ) {
          e[`item:${li.id}:rental_end_date`] = S.validation.rentalEndOrder
        }
      }

      // Per-line discount can't exceed what the line is worth. For a
      // standard line the cap is qty*rate; for a rental it's the
      // server-computed gross (qty*rate*duration), which we read off the
      // calc preview — and skip the check while that gross isn't known yet.
      const calcGross = calcByLine.get(idx)?.gross_amount
      const lineGross = calcGross ?? li.qty * li.rate
      const grossKnown = !li.is_rental || calcGross != null
      const discErr = grossKnown ? discountCapError(li.discount_amount, lineGross) : null
      if (discErr) e[`item:${li.id}:discount`] = discErr

    }
    return e
  }

  // `targetStatus` distinguishes the two footer buttons:
  //   * "Draft"     → Save as Draft (outline button). Persists without
  //                   advancing the state machine.
  //   * "Submitted" → Submit (primary button). On create the backend
  //                   accepts the status inline; on edit we issue a
  //                   PATCH with `status: "Submitted"` so the Draft →
  //                   Submitted transition runs in the same request.
  // Amend mode ignores the argument — the version endpoint always
  // creates a fresh Draft from a Rejected source.
  async function handleSaveQuote(targetStatus: "Draft" | "Submitted" = "Draft") {
    const validationErrors = validateForm()
    // Empty-clause check lives on the clause controller (it owns the inline
    // per-field flags + expands offending clauses); combine it with the
    // field-level errors so either blocks save.
    const clausesValid = clauseCtrl.validateClauses()
    if (Object.keys(validationErrors).length > 0 || !clausesValid) {
      setErrors(validationErrors)
      toast.error(S.validation.fixHighlighted)
      return
    }
    // Empty Valid Until → the payloads below send the default; show it in the
    // field too so the form matches what is being saved.
    if (!validUntil) setValidUntil(defaultValidUntilIso)
    clearAll()

    const q = resolveQuotable()
    if ('error' in q) {
      toast.error(q.error)
      return
    }
    const items = buildItemsPayload()
    if (!Array.isArray(items)) {
      toast.error(items.error)
      return
    }
    try {
      if (amendMode && existing) {
        // ── Amend save flow ──
        // The user has been editing a (not-yet-created) new version of a
        // Rejected source quote. The previous approach PATCHed the cloned
        // items by id, but the backend rejects PATCH updates that touch
        // `part_variant_id` or `category_id` on existing rows with
        // `QUOTE_ITEM_FIELD_FROZEN` (quote_service.py:417). Once the cross-
        // part variants picker landed, any amend where the user picked a
        // catalog row 422'd silently — the form stayed open and the variant
        // never linked. So we replace items wholesale instead of upserting:
        //   1) POST /quotes/<rejected>/version → server clones to a new Draft
        //   2) PATCH the new draft with header fields only (no items)
        //   3) DELETE every cloned item — sidesteps the FROZEN guard
        //   4) POST each form line as a fresh item — `part_variant_id`,
        //      `category_id`, rate, etc. all settable on insert
        //   5) Refetch detail; navigate / fire onSaved
        const newDraft = await versionMut.mutateAsync(existing.id)
        // Async PDF: the new version starts with no rendered PDF (worker will
        // fill it after the item/T&C writes below settle). See
        // docs/quote-pdf-async-integration.md.
        beginQuotePdfPoll(newDraft.id, null)
        const items = buildItemsPayload()
        if (!Array.isArray(items)) {
          toast.error(items.error)
          return
        }
        await updateQuoteApi(newDraft.id, {
          valid_until: validUntil || defaultValidUntilIso,
          terms_conditions: terms || null,
          notes: notes || null,
          // Replace the new version's T&C snapshot with the edited clauses.
          // version() clones the source quote's brand; if the user re-picked a
          // vertical while amending, send the new `brand_id` so the fresh draft
          // is rebranded (and its PDF re-rendered under the new vertical). Fall
          // back to the source brand (never null) when the user didn't touch
          // the dropdown, so an unresolved lookup can't wipe the inherited brand.
          brand_id: selectedBrand?.id ?? existing.brand_id ?? null,
          terms: clausesToPayload(clauseCtrl.clauses),
          // Header discount removed (QUOTE-4) — backend rejects with 422.
          // Per-line discounts are carried via the items re-add loop below.
        })
        for (const item of newDraft.items) {
          await deleteQuoteItemApi(newDraft.id, item.id)
        }
        for (let i = 0; i < items.length; i++) {
          await addQuoteItemApi(newDraft.id, { ...items[i], sort_order: i })
        }
        // If the user clicked Submit (not Save as Draft), flip the
        // freshly-spawned v(N+1) Draft to Submitted. Backend version()
        // always spawns Draft, so the transition is a separate PATCH.
        if (targetStatus === 'Submitted') {
          await updateQuoteStatusApi(newDraft.id, 'Submitted')
        }
        const fresh = await fetchQuoteApi(newDraft.id)
        qc.setQueryData(['crm', 'quotes', 'detail', newDraft.id], fresh)
        void qc.invalidateQueries({
          queryKey: ['crm', 'quotes', 'detail', newDraft.id],
        })
        void qc.invalidateQueries({ queryKey: ['crm', 'quotes', 'list'] })

        toast.success(S.toast.savedAsVersion(newDraft.version_number))
        if (onCancelAmend) onCancelAmend()
        // Embedded callers handle their own post-save UX (e.g., flip the
        // QuoteSection back to list mode). Standalone falls through to
        // the read-only view page of the NEW VERSION.
        if (onSaved) {
          onSaved(fresh)
        } else {
          // `replace` so Back from the new version's view returns to the
          // list/origin, not the amend form that no longer exists.
          navigate(`/crm/quotes/${newDraft.id}`, { replace: true })
        }
        return
      }

      if (isEdit && existing) {
        // ── Regular edit (Draft / Pending Approval / Partially Approved on
        //    the backend — see QUOTE_INLINE_EDITABLE_STATUSES) ──
        // PATCH carries:
        //   * only the dirty rows (untouched saved rows are omitted)
        //   * for existing rows: only mutable fields (NO category_id /
        //     part_variant_id — both frozen by backend, would 422)
        //   * any new rows the user added inline
        // Plus separate DELETE calls for any saved rows the user removed
        // via the trash icon (see pendingItemDeletes).
        const upsertItems = buildUpsertItems((li) => li.serverId, {
          dirtyOnly: true,
        })

        // Quote-level dirty check — only send fields that actually changed
        // so PATCH is minimal.
        const partyChanged =
          q.quotable_type !== existing.quotable_type ||
          q.quotable_id !== existing.quotable_id
        // Empty (cleared) falls back to the default shown on a fresh quote.
        const validUntilNew = validUntil || defaultValidUntilIso
        const validUntilDirty = validUntilNew !== (existing.valid_until ?? null)
        const termsNew = terms || null
        const termsDirty = termsNew !== (existing.terms_conditions ?? null)
        const notesNew = notes || null
        const notesDirty = notesNew !== (existing.notes ?? null)
        // Business Vertical is now editable on a still-editable quote. Only a
        // deliberate user pick counts as a change — `selectedBrand` is null
        // until the user touches the dropdown, so an unresolved saved-brand
        // lookup can never be mistaken for "cleared". When the pick differs
        // from the saved brand, send `brand_id` so the backend rebrands the
        // quote and re-renders its PDF.
        const brandDirty =
          selectedBrand != null && selectedBrand.id !== (existing.brand_id ?? null)
        const brandNew = selectedBrand?.id ?? null
        // Structured T&C snapshot. We diff the mapped payload against the saved
        // snapshot so reorders / resets / edits are all caught; when dirty the
        // whole `terms[]` array is replaced.
        const currentTermsPayload = clausesToPayload(clauseCtrl.clauses)
        const termsClausesDirty = !deepEqualLocal(
          currentTermsPayload,
          clausesToPayload((existing.terms ?? []).map(clauseFromTerm)),
        )
        // Inline status transition. Only emit `status` when the target
        // differs from the current status, otherwise the backend state
        // machine raises QUOTE_INVALID_TRANSITION on the no-op pair
        // (e.g. (Draft, Draft)).
        const statusChanged = targetStatus !== existing.status
        // Header discount removed (QUOTE-4) — discounts live at line
        // level only; the form's `discount` state is unused on save.

        // Skip the PATCH entirely if nothing changed AND no items to upsert
        // AND no items to delete — saves a round trip.
        const hasItemWork = upsertItems.length > 0 || pendingItemDeletes.length > 0
        if (
          partyChanged ||
          validUntilDirty ||
          termsDirty ||
          notesDirty ||
          termsClausesDirty ||
          brandDirty ||
          statusChanged ||
          upsertItems.length > 0
        ) {
          // Capture the URL the FE is currently displaying so the async-PDF
          // poll can detect the worker's replacement (mutation returns the
          // stale value, worker overwrites 1–3s later). Status-only PATCHes
          // don't enqueue a render, so skip polling when the only dirty bit
          // is `statusChanged`.
          const willEnqueueRender =
            partyChanged ||
            validUntilDirty ||
            termsDirty ||
            notesDirty ||
            termsClausesDirty ||
            // A brand/vertical change re-brands the PDF (backend re-renders
            // under the new vertical → new storage key → new pdf_url). Without
            // this, a vertical-only save never polls and the cached pdf_url
            // stays on the OLD vertical's file — Download hands back the wrong
            // brand's PDF.
            brandDirty ||
            upsertItems.length > 0
          const previousPdfUrl = existing.pdf_url ?? null
          await updateMut.mutateAsync({
            quotable_type: partyChanged ? q.quotable_type : undefined,
            quotable_id: partyChanged ? q.quotable_id : undefined,
            status: statusChanged ? targetStatus : undefined,
            valid_until: validUntilDirty ? validUntilNew : undefined,
            terms_conditions: termsDirty ? termsNew : undefined,
            notes: notesDirty ? notesNew : undefined,
            // Send the re-picked vertical only when it changed.
            ...(brandDirty ? { brand_id: brandNew } : {}),
            // Replace the whole T&C snapshot only when it changed.
            ...(termsClausesDirty ? { terms: currentTermsPayload } : {}),
            // Omit `items` entirely if no row work — keeps the payload clean.
            ...(upsertItems.length > 0 ? { items: upsertItems } : {}),
          })
          if (willEnqueueRender) {
            beginQuotePdfPoll(existing.id, previousPdfUrl)
          }
        }

        // Process pending deletes after the PATCH so an error in the
        // upsert path doesn't leave us mid-cascade. Each fires its own
        // request — the backend has no bulk-delete endpoint. We hit the
        // raw API (not the hook) so we have to invalidate the detail +
        // list caches ourselves once the loop completes; the next mount
        // of the view page will then refetch (also pinned by useQuote's
        // refetchOnMount: 'always').
        if (pendingItemDeletes.length > 0) {
          for (const itemId of pendingItemDeletes) {
            await deleteQuoteItemApi(existing.id, itemId)
          }
          setPendingItemDeletes([])
          void qc.invalidateQueries({
            queryKey: ['crm', 'quotes', 'detail', existing.id],
          })
          void qc.invalidateQueries({ queryKey: ['crm', 'quotes', 'list'] })
          // Item delete also enqueues a render. If the PATCH above already
          // opened a poll this resets it with the SAME previousUrl, which is
          // fine — the poll simply keeps waiting for a URL change.
          beginQuotePdfPoll(existing.id, existing.pdf_url ?? null)
        }

        if (
          !hasItemWork &&
          !partyChanged &&
          !validUntilDirty &&
          !termsDirty &&
          !notesDirty &&
          !termsClausesDirty &&
          !brandDirty &&
          !statusChanged
        ) {
          toast.info(S.toast.noChanges)
          return
        }
        // After a successful update, embedded callers stay on the parent
        // page; standalone routes to the read-only view of the same quote.
        if (onSaved) {
          // Pull the freshly-updated detail from the cache (the mutation's
          // onSuccess already populated it via setQueryData).
          const fresh =
            qc.getQueryData<QuoteWire>(['crm', 'quotes', 'detail', existing.id]) ??
            existing
          onSaved(fresh)
        } else {
          // `replace` so Back from the view doesn't re-open the edit form.
          navigate(`/crm/quotes/${existing.id}`, { replace: true })
        }
        return
      }

      // ── Create flow ──
      // Header discount removed (QUOTE-4). All discount lives at line
      // level via `item.discount_amount`.
      const created = await createMut.mutateAsync({
        quotable_type: q.quotable_type,
        quotable_id: q.quotable_id,
        status: targetStatus,
        valid_until: validUntil || defaultValidUntilIso,
        terms_conditions: terms || null,
        notes: notes || null,
        // Vertical brand (optional; frozen after create) + the structured
        // Terms & Conditions snapshot the user is committing.
        brand_id: resolvedBrand?.id ?? null,
        terms: clausesToPayload(clauseCtrl.clauses),
        items,
      })
      // Async PDF: create response returns `pdf_url = null`; worker renders
      // ~1–3s later. previousUrl is null on first-create.
      beginQuotePdfPoll(created.id, null)
      // Embedded callers stay on the parent page; standalone routes to
      // the read-only view of the new quote.
      if (onSaved) {
        onSaved(created)
      } else {
        // `replace` so Back from the view returns to the list/origin
        // instead of re-opening the empty create form.
        navigate(`/crm/quotes/${created.id}`, { replace: true })
      }
    } catch {
      // The hooks already toast on failure; this catch keeps the click
      // handler from throwing if mutateAsync rejects.
    }
  }

  // Reference deleteItemMut so the import stays live for future inline-row
  // delete wiring on saved quotes (the user clicks the trash on an
  // already-saved row → fires DELETE so the upsert array semantics stay
  // correct). For QUOTE-1 we keep the simpler "PATCH array as the user
  // sees it; missing rows are not auto-deleted" flow until the wider
  // edit-mode UX is signed off.
  void deleteItemMut

  // ── Actions ──

  // Downloads the backend-rendered branded PDF (3-page reportlab layout).
  // The filename is taken straight from the PDF URL (its last path segment),
  // falling back to `<quote-number>-v<version>.pdf` if the URL has no usable
  // name. The URL is refreshed by the server on every quote mutation and
  // persisted on `quotes.pdf_url`; null when the storage backend is local-disk
  // (dev) or the latest generation attempt failed silently. Uses fetch+Blob+<a
  // download> so the user gets a real Save dialog instead of the PDF
  // opening inline in a new tab.
  async function handleDownloadQuote() {
    const url = existing?.pdf_url
    if (!url || !existing) return
    try {
      const res = await fetch(url)
      if (!res.ok) {
        toast.error(S.toast.pdfDownloadFailedStatus(res.status))
        return
      }
      const blob = await res.blob()
      saveBlob(blob, fileNameFromUrl(url, `${existing.quote_number}-v${existing.version_number}.pdf`))
    } catch {
      toast.error(S.toast.pdfDownloadFailed)
    }
  }

  // Build a tabular HTML representation of the quote and copy it to the
  // clipboard alongside a plain-text fallback. Pasting into Gmail (or any
  // rich-text composer) renders the HTML table verbatim; pasting into a
  // plain-text field gets the tab-separated fallback. Money is server-
  // computed (`calcByLine`) so the row totals match what the form shows.
  async function handleCopyQuote() {
    // Description is rich-text HTML (from the RichTextEditor on each
    // row). Two projections so the copied output matches what the user
    // sees inside the form, just without raw markup leaking through:
    //   • `htmlToPlain` — collapses tags to visible characters so the
    //     TSV / plain-text fallback keeps line breaks, bullets, etc.
    //     instead of running everything into one blob.
    //   • `sanitizeRichHtml` — preserves the original formatting tags
    //     for the HTML branch (Gmail / Docs render them as bold,
    //     bullets, paragraphs) but strips script/style/event handlers
    //     so we never paste anything executable into the target app.
    const htmlToPlain = (html: string): string => {
      if (!html) return ''
      // Replace block-level tags with newlines and list items with a
      // bullet *before* extracting textContent, so visible structure
      // survives. Order matters — handle `<br>` and closing block tags
      // before stripping any remaining markup.
      const blocked = html
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/(p|div|h[1-6]|li|tr)>/gi, '\n')
        .replace(/<li[^>]*>/gi, '• ')
      let text: string
      if (typeof DOMParser === 'undefined') {
        text = blocked.replace(/<[^>]+>/g, '')
      } else {
        const doc = new DOMParser().parseFromString(blocked, 'text/html')
        text = doc.body.textContent ?? ''
      }
      return text
        .replace(/\r\n?/g, '\n')
        .replace(/[ \t]+\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
    }
    const sanitizeRichHtml = (html: string): string => {
      if (!html) return ''
      if (typeof DOMParser === 'undefined') return html
      const doc = new DOMParser().parseFromString(html, 'text/html')
      // Strip script/style entirely.
      doc.querySelectorAll('script, style, iframe, object, embed').forEach(
        (n) => n.remove(),
      )
      // Strip event-handler attributes (`on*`) and any javascript: URLs.
      doc.querySelectorAll('*').forEach((el) => {
        Array.from(el.attributes).forEach((a) => {
          if (a.name.toLowerCase().startsWith('on')) el.removeAttribute(a.name)
          if (
            (a.name === 'href' || a.name === 'src') &&
            /^\s*javascript:/i.test(a.value)
          ) {
            el.removeAttribute(a.name)
          }
        })
      })
      return doc.body.innerHTML.trim()
    }
    type Row = {
      sr: string
      /** Description as plain text with line-breaks preserved — TSV
       *  fallback uses this so multiline bullets/paragraphs stay
       *  readable when pasted into a plain composer. */
      description: string
      /** Description as sanitized rich HTML — injected verbatim into
       *  the HTML table cell so Gmail / Docs render formatting. */
      descriptionHtml: string
      product: string
      qty: number
      unitPrice: number
      sellingPrice: number
      taxRate: number
      taxAmt: number
      subtotal: number
      // BOM child line item — rendered indented + sub-numbered (e.g. "1.2").
      isChild: boolean
    }

    const rows: Row[] = []
    lineItems.forEach((li, idx) => {
      const calc = calcByLine.get(idx)
      const qty = calc?.qty ?? li.qty
      const rate = calc?.rate ?? li.rate
      // Money is server-computed (POST /quotes/calculate) — no FE math.
      const taxRate = calc?.tax_rate ?? li.tax_rate
      const taxAmt = calc?.tax_amount ?? 0
      // `amount` is the server's taxable line subtotal (gross − line
      // discount). Unit Selling Price = amount / qty — a presentational
      // per-unit split of that server figure (no API field exists for it).
      const subtotal = calc?.amount ?? 0
      const sellingPrice = qty > 0 ? subtotal / qty : rate
      const product =
        li.type === 'ims_part'
          ? li.partName ?? li.itemName ?? '—'
          : li.itemName ?? '—'
      const rawDesc = li.itemDescription ?? ''
      const description = htmlToPlain(rawDesc) || '—'
      const descriptionHtml = sanitizeRichHtml(rawDesc)
      const sr = String(idx + 1)
      rows.push({
        sr,
        product,
        description,
        descriptionHtml,
        qty,
        unitPrice: rate,
        sellingPrice,
        taxRate,
        taxAmt,
        subtotal,
        isChild: false,
      })

      // BOM child line items (QUOTE-4). Same filter as the /calculate
      // request (`buildChildrenForCalcLine`: qty > 0) so the child index
      // lines up with the server's `calc.children`, which is money-only and
      // correlated by `sort_order`. Identity (name/description) comes from
      // the local child; money comes from the matched calc child — same
      // server-figure-only contract as the headline rows above.
      const visibleChildren = (li.bomChildren ?? []).filter(
        (c) => Number.isFinite(c.qty) && c.qty > 0,
      )
      visibleChildren.forEach((child, childIdx) => {
        const cc = calc?.children?.find((c) => c.sort_order === childIdx)
        const cQty = cc?.qty ?? child.qty
        const cRate = cc?.rate ?? child.rate
        const cTaxRate = cc?.tax_rate ?? child.taxRate ?? taxRate
        const cTaxAmt = cc?.tax_amount ?? 0
        const cSubtotal = cc?.amount ?? 0
        const cSelling = cQty > 0 ? cSubtotal / cQty : cRate
        // Child name is strictly user-typed (or SKU). Description is
        // rich-text HTML — keep formatting for HTML, project to plain
        // text with line breaks for TSV.
        const cProduct =
          child.itemName?.trim() ||
          child.partSku?.trim() ||
          'Component'
        const cRawDesc = child.description ?? ''
        const cDescription = htmlToPlain(cRawDesc) || '—'
        const cDescriptionHtml = sanitizeRichHtml(cRawDesc)
        rows.push({
          sr: `${sr}.${childIdx + 1}`,
          product: cProduct,
          description: cDescription,
          descriptionHtml: cDescriptionHtml,
          qty: cQty,
          unitPrice: cRate,
          sellingPrice: cSelling,
          taxRate: cTaxRate,
          taxAmt: cTaxAmt,
          subtotal: cSubtotal,
          isChild: true,
        })
      })
    })

    if (rows.length === 0) {
      toast.error(S.toast.nothingToCopy)
      return
    }

    // `grandTotal` (component scope) is the server's /calculate value —
    // the export uses it verbatim so the copied table matches the form.
    const headerDiscount = discount > 0 ? discount : 0

    // ── Plain-text fallback (TSV — pastes into Excel / plain composers) ──
    const HEADERS = [
      'Sr No',
      'Product',
      'Description',
      'Qty',
      'Unit Price',
      'Unit Selling Price',
      'Tax %',
      'Tax Amount',
      'Subtotal',
    ]
    const dashOrMoney = (v: number) => (v > 0 ? `₹${fmt(v)}` : '—')

    // Embedded newlines in a TSV cell break Excel row parsing — keep
    // the visible structure (line breaks → " · ", bullet rows stay
    // bulleted) so the cell stays on one line for plain composers.
    const tsvCell = (s: string) => s.replace(/\n+/g, ' · ')
    const textLines: string[] = []
    textLines.push(HEADERS.join('\t'))
    for (const r of rows) {
      textLines.push(
        [
          r.sr,
          r.isChild ? `    ↳ ${r.product}` : r.product,
          tsvCell(r.description),
          String(r.qty),
          `₹${fmt(r.unitPrice)}`,
          `₹${fmt(r.sellingPrice)}`,
          `${r.taxRate.toFixed(2)}%`,
          dashOrMoney(r.taxAmt),
          `₹${fmt(r.subtotal)}`,
        ].join('\t'),
      )
    }
    textLines.push('')
    textLines.push(`Subtotal\t₹${fmt(subtotal)}`)
    if (headerDiscount > 0) {
      textLines.push(`Discount\t₹${fmt(headerDiscount)}`)
    }
    textLines.push(`Tax\t₹${fmt(totalTaxAmount)}`)
    textLines.push(`Grand Total\t₹${fmt(grandTotal)}`)
    const plainText = textLines.join('\n')

    // ── HTML table (inline styles — Gmail strips <style> tags) ──
    const esc = (s: string) =>
      s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
    const TH_CSS =
      'padding:8px 10px;border:1px solid #d0d5dd;background:#f6f7f9;text-align:left;font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:0.04em;color:#475467;'
    const TH_RIGHT = `${TH_CSS}text-align:right;`
    const TD_CSS =
      'padding:8px 10px;border:1px solid #d0d5dd;font-size:13px;color:#101828;'
    const TD_RIGHT = `${TD_CSS}text-align:right;`
    const TD_CENTER = `${TD_CSS}text-align:center;`
    const TD_MUTED = `${TD_CSS}color:#667085;`
    const FOOT_LABEL =
      'padding:8px 10px;border:1px solid #d0d5dd;background:#f6f7f9;text-align:right;font-weight:600;font-size:13px;color:#101828;'
    const FOOT_VALUE =
      'padding:8px 10px;border:1px solid #d0d5dd;background:#f6f7f9;text-align:right;font-weight:700;font-size:13px;color:#101828;'

    const rowsHtml = rows
      .map((r) => {
        // BOM children render indented + muted under their headline row;
        // headlines keep the bold product + bold subtotal styling.
        const productCell = r.isChild
          ? `<td style="${TD_CSS}padding-left:28px;color:#475467;">&#8627; ${esc(r.product)}</td>`
          : `<td style="${TD_CSS}"><strong>${esc(r.product)}</strong></td>`
        const subtotalCell = r.isChild
          ? `<td style="${TD_RIGHT}">&#8377;${esc(fmt(r.subtotal))}</td>`
          : `<td style="${TD_RIGHT}"><strong>&#8377;${esc(fmt(r.subtotal))}</strong></td>`
        return `
        <tr>
          <td style="${TD_CENTER}">${esc(r.sr)}</td>
          ${productCell}
          <td style="${r.descriptionHtml ? TD_CSS : TD_MUTED}">${
            // Description is already sanitized rich HTML (`sanitizeRichHtml`)
            // — inject verbatim so Gmail / Docs render formatting (bold,
            // bullets, paragraphs). Fall back to the em-dash when empty.
            r.descriptionHtml || '&mdash;'
          }</td>
          <td style="${TD_RIGHT}">${r.qty}</td>
          <td style="${TD_RIGHT}">&#8377;${esc(fmt(r.unitPrice))}</td>
          <td style="${TD_RIGHT}">&#8377;${esc(fmt(r.sellingPrice))}</td>
          <td style="${TD_RIGHT}">${r.taxRate.toFixed(2)}%</td>
          <td style="${r.taxAmt > 0 ? TD_RIGHT : TD_MUTED + 'text-align:right;'}">${
            r.taxAmt > 0 ? `&#8377;${esc(fmt(r.taxAmt))}` : '&mdash;'
          }</td>
          ${subtotalCell}
        </tr>`
      })
      .join('')

    const headersHtml = `
      <tr>
        <th style="${TH_CSS}text-align:center;">Sr No</th>
        <th style="${TH_CSS}">Product</th>
        <th style="${TH_CSS}">Description</th>
        <th style="${TH_RIGHT}">Qty</th>
        <th style="${TH_RIGHT}">Unit Price</th>
        <th style="${TH_RIGHT}">Unit Selling Price</th>
        <th style="${TH_RIGHT}">Tax %</th>
        <th style="${TH_RIGHT}">Tax Amount</th>
        <th style="${TH_RIGHT}">Subtotal</th>
      </tr>`

    const footerHtml = `
      <tr>
        <td colspan="8" style="${FOOT_LABEL}">Subtotal</td>
        <td style="${FOOT_VALUE}">&#8377;${esc(fmt(subtotal))}</td>
      </tr>
      ${
        headerDiscount > 0
          ? `<tr>
              <td colspan="8" style="${FOOT_LABEL}">Discount</td>
              <td style="${FOOT_VALUE}">&#8377;${esc(fmt(headerDiscount))}</td>
            </tr>`
          : ''
      }
      <tr>
        <td colspan="8" style="${FOOT_LABEL}">Tax</td>
        <td style="${FOOT_VALUE}">&#8377;${esc(fmt(totalTaxAmount))}</td>
      </tr>
      <tr>
        <td colspan="8" style="${FOOT_LABEL}">Grand Total</td>
        <td style="${FOOT_VALUE}">&#8377;${esc(fmt(grandTotal))}</td>
      </tr>`

    const html = `<table cellspacing="0" cellpadding="0" style="border-collapse:collapse;border:1px solid #d0d5dd;font-family:Arial,Helvetica,sans-serif;min-width:600px;">
      <thead>${headersHtml}</thead>
      <tbody>${rowsHtml}</tbody>
      <tfoot>${footerHtml}</tfoot>
    </table>`

    try {
      if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
        const item = new ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([plainText], { type: 'text/plain' }),
        })
        await navigator.clipboard.write([item])
      } else {
        // Older Safari / Firefox configurations — plain text only.
        await navigator.clipboard.writeText(plainText)
      }
      toast.success(S.toast.copied)
    } catch (err) {
      console.error('Quote copy failed', err)
      toast.error(S.toast.copyFailed)
    }
  }

  // ── Summary counts per line item ──


  return {
    errors,
    setErrors,
    clearError,
    clearAll,
    handleSaveQuote,
    handleDownloadQuote,
    handleCopyQuote,
    quotableType,
    selectedAccountId,
    selectedLead,
    selectedDeal,
    validUntil,
    quoteType,
    rentalStartDate,
    rentalEndDate,
    notes,
    terms,
    discount,
    lineItems,
    pendingItemDeletes,
    partPickerOpen,
    partPickerTarget,
    swapDialogOpen,
    swapTarget,
    setQuotableType,
    setSelectedAccountId,
    setSelectedLead,
    setSelectedDeal,
    setValidUntil,
    setQuoteType,
    setRentalStartDate,
    setRentalEndDate,
    setNotes,
    setTerms,
    setDiscount,
    // Business Vertical (brand) + Terms & Conditions clause builder.
    clauseCtrl,
    selectedBrand: resolvedBrand,
    handleBrandChange,
    hydratingTerms,
    setLineItems,
    setPendingItemDeletes,
    setPartPickerOpen,
    setPartPickerTarget,
    setSwapDialogOpen,
    setSwapTarget,
    addLineItem,
    applyPastedGroups,
    hasRealLines,
    applyLineItemPartChange,
    buildCalcLine,
    buildChildrenForCalcLine,
    buildChildrenForLine,
    buildChildrenForUpsert,
    buildItemsPayload,
    buildUpsertItems,
    calcByLine,
    calcQuery,
    calcRequest,
    commitDiscountInput,
    commitQtyInput,
    commitRateInput,
    commitTaxInput,
    computedDirty,
    createMut,
    dealDetailQuery,
    debouncedCalcRequest,
    defaultValidUntilIso,
    deleteItemMut,
    dirtyCurrent,
    dirtyInitial,
    fallbackAccountQuery,
    grandTotal,
    handleDiscountInputChange,
    handlePartPickerSelect,
    handleQtyInputChange,
    handleRateInputChange,
    handleSwapSelect,
    handleTaxInputChange,
    initialAccountId,
    initialDealId,
    initialLeadId,
    isDirty,
    isEdit,
    isEmbedded,
    isSalesOrderEmbedded,
    lastCalcErrorMsgRef,
    leadDetailQuery,
    navigate,
    nextNumberQuery,
    openPartPicker,
    openSwapDialog,
    originalItemsById,
    qc,
    quotableLocked,
    quoteNumber,
    quoteStatus,
    removeLineItem,
    clearAllLineItems,
    resetSwap,
    resolveQuotable,
    selectedAccountFallback,
    submitInFlight,
    subtotal,
    summarizeLine,
    switchQuotableType,
    taxableAmount,
    todayIso,
    toggleBomComponent,
    totalLineDiscount,
    totalTaxAmount,
    updateComponentQuantity,
    updateLineItem,
    updateMut,
    validateForm,
    versionMut,
    viewLocked,
    accountName,
    mode,
    existing,
    amendMode,
    viewOnly,
    onSaved,
    onCancel,
    onCancelAmend,
    onDirtyChange,
    leadId,
    dealId,
    propAccountId,
  }
}

export type QuoteBuilderController = ReturnType<typeof useQuoteBuilder>
