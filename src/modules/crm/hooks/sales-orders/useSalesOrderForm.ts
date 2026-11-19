import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { type AccountDocumentType } from '@/modules/crm/constants/account-documents'
import { deepEqual } from '@/lib/deep-equal'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { stripHtml } from '@/lib/utils'
import { useFormErrors } from '@/hooks/use-form-errors'
import { useNavigateBack } from '@/hooks/use-navigate-back'
import { soListHref } from './soListHref'
import { useDebounce } from '@/shared/hooks'
import { formatINR } from '@/lib/currency'
import { istTodayDateParam } from '@shared/lib/date'
import { useVariantClassificationsByIds } from '@modules/ims'

import { useDeal } from '../deals/useDeals'
import {
  bomChildrenToCreatePayload,
  bomChildCategoryError,
  bomChildConditionError,
  bomChildNameError,
  bomChildOemError,
  bomChildDiscountError,
  resolveChildName,
  createEmptyBomChild,
  type BomChildRow,
  discountCapError,
} from '../../components/line-items'
import { useQuote } from '../quotes/useQuotes'
import { useCrmPrefillGuard } from '../shared/useCrmPrefillGuard'
import {
  useSalesOrder,
  useSalesOrderCalculate,
  useCreateSalesOrder,
  useReviseSalesOrder,
  useUpdateSalesOrder,
} from './useSalesOrders'
import { updateSalesOrder } from '../../api'
import type {
  AccountAddressWire,
  SOLineCondition,
  SOOrderType,
  SOStatus,
  SalesOrderAccountDocuments,
  SalesOrderAddressData,
  SalesOrderBomChildCreatePayload,
  SalesOrderBomChildUpsertPayload,
  SalesOrderCalculateLinePayload,
  SalesOrderCalculateRequest,
  SalesOrderCreatePayload,
  SalesOrderItemCreatePayload,
  SalesOrderUpdatePayload,
} from '../../api'
import { groupSoItemsToTree } from '../../lib/bomTree'
import { quoteRentalSpan } from '../../lib/quoteRentalSpan'
import { RENTAL_PERIOD_DEFAULT } from '../../components/line-items'
import { resolvePasteVariants, promoteComponentsOfNonBomParents, pastedConditionToCondition, variantKey } from '../../lib/paste-line-items'
import type { PastedLineGroup } from '../../lib/paste-line-items'
import { SALES_ORDERS_STRINGS as S } from '../../components/sales-orders/sales-orders.strings'
import {
  type LocalLine,
  type SourceMode,
  emptyAddressData,
  emptyLine,
  nextKey,
  toNumberOrUndef,
  useAddressesForAccount,
  validateAddressData,
  trimAddressData,
  lineDiscountError,
} from '../../components/sales-orders/form/shared'
import { useSoAttachmentLines } from './useSoAttachmentLines'

// Container logic for the Sales Order create/edit form: source-mode + quote
// prefill, customer/address resolution, the live /calculate preview, dirty
// detection, validation, and the create/update save dispatch.
//
// `amend` mode (the "Account Rejected" amend flow) reuses this entire form: the
// source SO is loaded and its line items / terms are prefilled, but the customer
// FKs (account / contact / addresses) start BLANK — the operator re-points the
// revision onto an approved account. Save dispatches POST /revise (full-replace
// items + customer-FK swap + amend_reason carried in via router state) and then
// PATCHes the remaining scalar fields onto the new Draft revision.
export function useSalesOrderForm(options?: { amend?: boolean }) {
  const isAmend = !!options?.amend
  const { id: soId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  // Reason for the amend, captured by the detail-page modal and carried here
  // via router state (see useSalesOrderDetail.handleRevise). Not a form field.
  const amendReason =
    (useLocation().state as { amendReason?: string } | null)?.amendReason ?? ''
  // `loadExisting` gates the source-SO fetch + hydration (true for BOTH edit
  // and amend). `isEdit` means edit-in-place (PATCH) — amend is NOT edit: it
  // spawns a new revision via /revise, so the edit-only branches (locked
  // customer FKs, locked account picker, PATCH save) must stay off.
  const loadExisting = !!soId
  const isEdit = !!soId && !isAmend
  // Carries the list's remembered `?page=…&so_size=…` (see soListHref).
  const [backHref] = useState(soListHref)
  const goBack = useNavigateBack(backHref)
  const qc = useQueryClient()
  const { errors, setError, clearError, clearAll } = useFormErrors()

  // ── Edit/amend-mode hydration ───────────────────────────────────────
  const soQuery = useSalesOrder(soId, { enabled: loadExisting })
  const existing = soQuery.data

  // ── Source mode ─────────────────────────────────────────────────────
  // Deep-link prefills are a pure-CREATE concern — gate on `!loadExisting` so
  // neither edit NOR amend (both load an existing SO) reads the query string.
  const prefillQuoteId = !loadExisting ? (searchParams.get('quoteId') ?? '') : ''
  const prefillAccountId = !loadExisting ? (searchParams.get('accountId') ?? '') : ''
  // Lead / Deal deep-links — set by the Closed-Won flow on leads / deals.
  // When present, the form locks into from-quote mode and the quote picker
  // is scoped to that entity's own quotes so the operator can't pick a
  // quote that doesn't belong to the source lead/deal.
  const prefillLeadId = !loadExisting ? (searchParams.get('leadId') ?? '') : ''
  const prefillDealId = !loadExisting ? (searchParams.get('dealId') ?? '') : ''
  // Memoize so downstream `useMemo` deps don't re-fire on every render
  // (object identity changes would otherwise re-compute initialValues +
  // re-key the scoped quote picker).
  const closedWonSource = useMemo<{ type: 'lead' | 'deal'; id: string } | null>(
    () =>
      prefillLeadId
        ? { type: 'lead', id: prefillLeadId }
        : prefillDealId
          ? { type: 'deal', id: prefillDealId }
          : null,
    [prefillLeadId, prefillDealId],
  )

  // Validate the deep-link prefill ids (?quoteId= / ?accountId= / ?leadId= /
  // ?dealId=). A hand-edited or stale id 404s — block the form and show a
  // clean "not found" rather than rendering it with a broken prefill.
  const prefillGuard = useCrmPrefillGuard({
    quoteId: prefillQuoteId,
    accountId: prefillAccountId,
    leadId: prefillLeadId,
    dealId: prefillDealId,
  })

  const [sourceMode, setSourceMode] = useState<SourceMode>(
    prefillQuoteId || closedWonSource ? 'from-quote' : 'direct',
  )
  const [salesQuoteId, setSalesQuoteId] = useState<string>(prefillQuoteId)

  // ── Form state ──────────────────────────────────────────────────────
  const [accountId, setAccountId] = useState<string>(prefillAccountId)
  const [contactId, setContactId] = useState<string>('')
  const [billingAddressId, setBillingAddressId] = useState<string>('')
  const [shippingAddressId, setShippingAddressId] = useState<string>('')
  const [placeOfSupply, setPlaceOfSupply] = useState<string>('')
  // Header discount is captured as a ₹ amount only — mirrors the Quote
  // form (no percent input). Backend recomputes the matching percentage
  // from `discount_amount`.
  const [headerDiscountAmt, setHeaderDiscountAmt] = useState<string>('')
  // Order classification (New / Refurb / Rental). Captured as a single
  // value here; sent to the backend as a one-element `order_type` array.
  // Empty string = nothing picked yet → the key is omitted from the payload.
  const [orderType, setOrderTypeState] = useState<SOOrderType | ''>('')
  /** Picking the order type also decides whether its lines are rental
   *  lines. `is_rental` is not a per-line choice on a rental order — the
   *  backend SETS it true on every line of one ("SET, not setdefault",
   *  added because rental orders were otherwise coming out with
   *  non-rental lines), so the form agrees with it rather than letting
   *  the two drift.
   *
   *  It is also what makes the per-line billing-period picker reachable:
   *  the line grid draws it only on a rental line, so while lines stayed
   *  `false` a NEW rental order could never give one item a shorter
   *  window — the backend just filled the full contract period down. */
  function setOrderType(next: SOOrderType | '') {
    setOrderTypeState(next)
    if (next) clearError('orderType')
    const isRental = next === 'Rental'
    setLines((prev) =>
      prev.map((l) => (Boolean(l.isRental) === isRental ? l : { ...l, isRental })),
    )
  }
  // Rental window — captured ONLY when the order type is Rental, and
  // stored on the rentals module's `so_configure` row rather than on
  // `sales_orders`, which has no date columns. The backend fills these
  // down onto every line (`is_rental` + period + dates), which is what
  // makes the order's units provision as tracked devices.
  // The order date defaults to TODAY (IST) on a new order and stays
  // editable (2026-11-16); an existing order never reads the default.
  const [rentalOrderDate, setRentalOrderDate] = useState<string>(() =>
    loadExisting ? '' : istTodayDateParam(),
  )
  const [rentalStartDate, setRentalStartDate] = useState<string>('')
  const [rentalEndDate, setRentalEndDate] = useState<string>('')
  const [termsConditions, setTermsConditions] = useState<string>('')
  const [notes, setNotes] = useState<string>('')
  const [paymentTerms, setPaymentTerms] = useState<string>('')
  const [warranty, setWarranty] = useState<string>('')
  const [delivery, setDelivery] = useState<string>('')
  const [lines, setLines] = useState<LocalLine[]>([emptyLine(0)])

  // Lead-cascade only — structured address payloads.
  const [billingAddr, setBillingAddr] = useState<SalesOrderAddressData>(emptyAddressData())
  const [shippingAddr, setShippingAddr] = useState<SalesOrderAddressData>(emptyAddressData())
  // When true, send `shipping_address_data` as null and let the cascade
  // duplicate billing into shipping.
  const [shippingSameAsBilling, setShippingSameAsBilling] = useState<boolean>(true)

  // Lead-cascade only — optional account documents. Backend stages each as
  // an attachment on the cascade-created Account; silently dropped on the
  // deal/account branches, so we only ship `documents` when `isLeadCascade`.
  const [leadCascadeDocs, setLeadCascadeDocs] = useState<
    Partial<Record<AccountDocumentType, File>>
  >({})
  function setLeadCascadeDoc(slot: AccountDocumentType, file: File | undefined) {
    setLeadCascadeDocs((prev) => {
      const next = { ...prev }
      if (file) next[slot] = file
      else delete next[slot]
      return next
    })
  }

  // Edit-mode hydration gate: dirty checks suppress until the existing SO
  // has been copied into state, otherwise the first render after data lands
  // would briefly read as dirty.
  const [hydrated, setHydrated] = useState<boolean>(!isEdit)

  // Quote details (only fetched when sourceMode='from-quote' and a quote is picked).
  const quoteQuery = useQuote(salesQuoteId || null, {
    enabled: sourceMode === 'from-quote' && !!salesQuoteId,
  })
  const quote = quoteQuery.data

  // ── Quote → form prefill (create mode only) ─────────────────────────
  // When the user picks a quote in create mode, copy its items into the
  // local form state so qty (and everything else) stays editable. T&C
  // and notes prefill ONLY when the user hasn't already typed something —
  // explicit edits win over the quote defaults.
  //
  // We key the effect on quote.id (not the whole quote object) and a
  // `prefilledFromQuoteId` ref to ensure the copy runs exactly once per
  // quote selection. Edit mode is skipped entirely — the SO already has
  // its own items and T&C from the create flow.
  // A real ref (not a useMemo holder) — refs are the sanctioned mutable escape
  // hatch, so writing `.current` below is allowed under the Rules of React.
  const prefilledFromQuoteIdRef = useRef<string | null>(null)
  useEffect(() => {
    // Skip for edit AND amend — both hydrate lines from the existing SO below,
    // not from a freshly-picked quote.
    if (loadExisting) return
    if (sourceMode !== 'from-quote') return
    if (!quote) return
    if (prefilledFromQuoteIdRef.current === quote.id) return
    prefilledFromQuoteIdRef.current = quote.id

    // Render EVERY quote item — drained ones included — so the user
    // sees the full picture of what was on the quote.
    //
    // 2026-05-20: always seed from `remaining_qty`. A fresh
    // Draft/Sent/Accepted quote has remaining_qty == qty by construction
    // (no SO activity yet); a drawn-down quote has remaining_qty < qty.
    // Either way remaining_qty is what's left to draw. The cap matches.
    // Backend still enforces `qty <= remaining_qty` (QUOTE_LINE_QTY_EXCEEDED)
    // so any drift surfaces as a clear toast rather than a silent overflow.
    //
    // Pre-decoupling we branched on quote.status === 'Accepted' to choose
    // between it.qty and it.remaining_qty; the branch is gone — see
    // docs/plans/QUOTE_SO_FLEXIBILITY_IMPLEMENTATION.md §2.3.
    // const useOriginalQty = quote.status === 'Accepted'
    setLines(
      quote.items.length > 0
        ? quote.items.map<LocalLine>((it, idx) => {
            const sourceQty = it.remaining_qty
            // SO-BOM — quote response is tree-shaped; project each
            // headline's children (Add rows only) into the shared
            // `BomChildRow` shape so the LineItemRow editor reads them
            // and they flow back into the SO save payload via
            // `bomChildrenToCreatePayload`.
            const localBom: BomChildRow[] = (it.children ?? [])
              .filter((c) => c.config_action !== 'Remove')
              .map((c) => ({
                id: `ac-${c.id}`,
                partId: c.part_variant_id ?? undefined,
                partSku: undefined,
                itemName: c.item_name,
                categoryId: c.category_id ?? undefined,
                oemId: c.oem_id ?? undefined,
                condition: (c.condition ?? undefined) as SOLineCondition | undefined,
                description: c.description ?? undefined,
                qty: Number(c.qty),
                rate: Number(c.rate),
                listPrice: c.list_price ?? undefined,
                taxRate: Number(c.tax_rate ?? 0),
                // Carry the per-child discount across from the quote so
                // the BOM editor shows the same Disc ₹ the customer
                // agreed to on the quote.
                discountAmount: Number(c.discount_amount ?? 0),
                warrantyLevel: c.warranty_level ?? undefined,
              }))
            return {
            tempKey: nextKey(),
            quoteItemId: it.id,
            partVariantId: it.part_variant_id ?? undefined,
            partSku: undefined,
            partName: it.part_variant_id ? it.item_name : undefined,
            itemName: it.item_name,
            description: it.description ?? '',
            categoryId: it.category_id ?? '',
            oemId: it.oem_id ?? undefined,
            condition: (it.condition ?? undefined) as SOLineCondition | undefined,
            qty: String(sourceQty),
            // A line with sourceQty=0 (fully drawn line on a previously
            // drained quote) is rendered with the "Fully drawn" hint and
            // won't be included on save (qty<=0 is skipped from the
            // quote_line_quantities map).
            originalQty: sourceQty,
            rate: String(it.rate),
            // Carry the quote line's catalog list_price snapshot into the SO draft.
            listPrice: it.list_price ?? undefined,
            taxRate: it.tax_rate ? String(it.tax_rate) : '',
            discountAmount:
              it.discount_amount && it.discount_amount > 0 ? String(it.discount_amount) : '0',
            isRental: it.is_rental,
            rentalPeriod: it.rental_period ?? undefined,
            // No per-line dates: the quote's are a proposal, and the server
            // bills every copied rental line on the window chosen on THIS
            // order (2026-11-16). Empty = "same as the order".
            rentalStartDate: undefined,
            rentalEndDate: undefined,
            sortOrder: it.sort_order ?? idx,
            configurationNotes: it.configuration_notes ?? undefined,
            warrantyLevel: it.warranty_level ?? undefined,
            bomChildren: localBom,
            isBomExpanded: localBom.length > 0,
            }
          })
        : [emptyLine(0)],
    )
    // Start the order's rental period from what the quote proposed (the
    // span of its rental lines) — editable; only when not picked yet.
    const quotedSpan = quoteRentalSpan(quote.items)
    if (quotedSpan) {
      // A quote with rental lines can only become a rental order — the
      // backend promotes it anyway — so say so up front; that is also what
      // reveals the rental date fields. A type already picked is kept.
      // (The lines already carry `isRental` from the quote.)
      setOrderTypeState((cur) => cur || 'Rental')
      setRentalStartDate((cur) => cur || quotedSpan.start)
      setRentalEndDate((cur) => cur || quotedSpan.end)
    }
    // Only prefill T&C / notes when the field is empty — preserve any
    // text the user has typed.
    setTermsConditions((cur) => cur || (quote.terms_conditions ?? ''))
    setNotes((cur) => cur || (quote.notes ?? ''))
    // Header discount prefill — amount only (the FE no longer exposes a
    // percentage input). Backend recomputes pct from amount on save.
    if (quote.discount_amount > 0) {
      setHeaderDiscountAmt((cur) => cur || String(quote.discount_amount))
    }
  }, [isEdit, sourceMode, quote, prefilledFromQuoteIdRef])

  // ── Auto-fill Brand/OEM + Condition from the selected part ──────────
  // Quote wires DO carry oem_id / condition today (both parent + child) and
  // the hydration above forwards them. This back-fill still runs for the
  // remaining gaps: legacy quote rows saved before the columns were
  // populated, demo-sourced lines, and anywhere a partId lands without an
  // OEM. Both are determined by the variant (condition on the variant, OEM
  // on its part) — same resolve-and-apply as a direct part pick.
  //
  // Targets ONLY lines that have a part but no OEM yet: direct-pick lines
  // already carry both (set together in one `onPick`), and edit/amend lines
  // hydrate oem_id/condition from the saved SO wire below — both are skipped,
  // so this never clobbers an existing or user-edited value.
  const linesNeedingClassification = useMemo(() => {
    const ids = new Set<string>()
    for (const l of lines) {
      if (l.partVariantId && !l.oemId) ids.add(l.partVariantId)
      // BOM children carry a part (partId) but seed from the quote without
      // oem/condition too — resolve theirs in the same pass.
      for (const c of l.bomChildren ?? []) {
        if (c.partId && !c.oemId) ids.add(c.partId)
      }
    }
    return Array.from(ids)
  }, [lines])
  const classificationQueries = useVariantClassificationsByIds(linesNeedingClassification)
  // Content signature so the apply-effect fires only when resolved data
  // actually changes, not on every render (useQueries returns a fresh array).
  const classificationSig = classificationQueries
    .map((q) => (q.data ? `${q.data.variantId}:${q.data.oemId}:${q.data.condition}` : ''))
    .join('|')
  const classifications = useMemo(() => {
    const map: Record<string, { oemId: string; condition: SOLineCondition }> = {}
    for (const q of classificationQueries) {
      if (q.data) {
        map[q.data.variantId] = {
          oemId: q.data.oemId,
          condition: q.data.condition as SOLineCondition,
        }
      }
    }
    return map
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classificationSig])
  useEffect(() => {
    if (Object.keys(classifications).length === 0) return
    setLines((prev) => {
      let changed = false
      const next = prev.map((l) => {
        let line = l
        // Echo the variant's own OEM + condition verbatim — the SO service
        // compares them to the variant on save and 400s on any disagreement.
        const lc = l.partVariantId && !l.oemId ? classifications[l.partVariantId] : undefined
        if (lc) {
          changed = true
          line = { ...line, oemId: lc.oemId, condition: line.condition ?? lc.condition }
        }
        // Same back-fill for BOM children with a part but no OEM yet.
        if (line.bomChildren?.some((c) => c.partId && !c.oemId && classifications[c.partId])) {
          changed = true
          line = {
            ...line,
            bomChildren: line.bomChildren.map((c) => {
              const cc = c.partId && !c.oemId ? classifications[c.partId] : undefined
              return cc ? { ...c, oemId: cc.oemId, condition: c.condition ?? cc.condition } : c
            }),
          }
        }
        return line
      })
      return changed ? next : prev
    })
  }, [classifications])

  // Hydrate from existing SO on edit. orderable_type drives sourceMode in
  // edit mode (sales_quote_id presence + orderable_type='lead'/'deal'/'account').
  useEffect(() => {
    if (!existing) return
    // Amend: the source SO is being re-pointed onto a NEW (approved) account,
    // so the form stays in Direct mode and the customer FKs start blank — the
    // operator picks account → contact → addresses. Lines + terms still
    // prefill (below) so the only thing missing is the customer.
    if (isAmend) {
      setSourceMode('direct')
    } else if (existing.sales_quote_id) {
      setSourceMode('from-quote')
      setSalesQuoteId(existing.sales_quote_id)
    } else {
      setSourceMode('direct')
    }
    // Customer FKs: hydrate on edit only. Amend leaves them blank.
    if (!isAmend) {
      setAccountId(existing.account_id)
      setContactId(existing.contact_id)
      setBillingAddressId(existing.billing_address_id)
      setShippingAddressId(existing.shipping_address_id)
    }
    setPlaceOfSupply(existing.place_of_supply ?? '')
    setHeaderDiscountAmt(
      existing.discount_amount && existing.discount_amount > 0
        ? String(existing.discount_amount)
        : '',
    )
    setTermsConditions(existing.terms_conditions ?? '')
    setNotes(existing.notes ?? '')
    setPaymentTerms(existing.payment_terms ?? '')
    setWarranty(existing.warranty ?? '')
    setDelivery(existing.delivery ?? '')
    // Order type is a JSONB array on the wire; the form holds a single
    // value, so take the first entry. Read-only post-create (see render).
    setOrderType((existing.order_type?.[0] as SOOrderType | undefined) ?? '')
    // Edit mode: when the SO is quote-driven, snapshot the persisted qty
    // as the upper bound for further edits (sales can keep decreasing
    // across sessions, never increase above the quoted amount). The cap is
    // applied PER LINE — only rows that actually carry a `sales_quote_item_id`
    // draw from a quote line. A quote-driven SO whose items were deep-copied
    // without line-level linkage (sales_quote_item_id null) is freely editable
    // like Direct.
    // SO-BOM: the SO response is FLAT — children sit alongside headlines
    // with `parent_sales_order_item_id` pointing at the parent. Group so
    // the form only renders headlines; children are projected onto the
    // headline's `bomChildren` array (Add rows only) for display in the
    // shared LineItemBomEditor. Children stay editable on saved rows — the
    // PATCH dispatches them through `buildBomChildrenForUpsert` (id-preserving
    // upsert: changed/added/removed children all travel).
    const soTree = groupSoItemsToTree(existing.items)
    setLines(
      soTree.length > 0
        ? soTree.map<LocalLine>((it, idx) => {
            const localBom: BomChildRow[] = it.children
              .filter((c) => c.config_action !== 'Remove')
              .map((c) => ({
                id: `ac-${c.id}`,
                // Preserve the server child id so the PATCH upsert updates
                // this child by id (variant/qty/etc. mutable) instead of
                // re-inserting a duplicate. Brand-new children added in the
                // editor have no serverChildId → they dispatch as creates.
                serverChildId: c.id,
                partId: c.part_variant_id ?? undefined,
                partSku: undefined,
                itemName: c.item_name,
                categoryId: c.category_id ?? undefined,
                oemId: c.oem_id ?? undefined,
                condition: (c.condition ?? undefined) as SOLineCondition | undefined,
                description: c.description ?? undefined,
                qty: Number(c.qty),
                rate: Number(c.rate),
                listPrice: c.list_price ?? undefined,
                taxRate: Number(c.tax_rate ?? 0),
                // Hydrate per-child discount from the saved SO so it
                // round-trips on edit and isn't silently zeroed out.
                discountAmount: Number(c.discount_amount ?? 0),
                warrantyLevel: c.warranty_level ?? undefined,
              }))
            return {
              tempKey: nextKey(),
              // Amend builds a brand-new revision via /revise full-replace —
              // each line must travel as a create-shape item (no serverId, so
              // buildItemPayload attaches `children`; no quote lineage / qty
              // cap; no approver so the backend re-runs PM auto-assignment).
              serverId: isAmend ? undefined : it.id,
              quoteItemId: isAmend ? undefined : (it.sales_quote_item_id ?? undefined),
              partVariantId: it.part_variant_id ?? undefined,
              partSku: undefined,
              partName: it.part_variant_id ? it.item_name : undefined,
              itemName: it.item_name,
              description: it.description ?? '',
              categoryId: it.category_id ?? '',
              oemId: it.oem_id ?? undefined,
              condition: (it.condition ?? undefined) as SOLineCondition | undefined,
              qty: String(it.qty),
              originalQty: isAmend ? undefined : it.sales_quote_item_id ? it.qty : undefined,
              rate: String(it.rate),
              // Snapshot of IMS sell_price at pick time; hydrated from server.
              listPrice: it.list_price ?? undefined,
              taxRate: it.tax_rate ? String(it.tax_rate) : '',
              discountAmount:
                it.discount_amount && it.discount_amount > 0 ? String(it.discount_amount) : '0',
              approverId: isAmend ? undefined : (it.approver_id ?? undefined),
              approverName: undefined,
              isRental: it.is_rental,
              rentalPeriod: it.rental_period ?? undefined,
              rentalStartDate: it.rental_start_date ?? undefined,
              rentalEndDate: it.rental_end_date ?? undefined,
              sortOrder: it.sort_order ?? idx,
              configurationNotes: it.configuration_notes ?? undefined,
              warrantyLevel: it.warranty_level ?? undefined,
              bomChildren: localBom,
              isBomExpanded: localBom.length > 0,
            }
          })
        : [emptyLine(0)],
    )
    setHydrated(true)
  }, [existing, isAmend])

  // When sourceMode flips, clear fields that don't apply to the new mode.
  function handleSourceModeChange(next: SourceMode) {
    if (next === sourceMode) return
    setSourceMode(next)
    setSalesQuoteId('')
    prefilledFromQuoteIdRef.current = null
    if (next === 'direct') {
      // Clear lead-cascade-only fields.
      setBillingAddr(emptyAddressData())
      setShippingAddr(emptyAddressData())
      setShippingSameAsBilling(true)
    } else {
      // Clear direct-only fields.
      setAccountId('')
      setContactId('')
      setBillingAddressId('')
      setShippingAddressId('')
      setLines([emptyLine(0)])
    }
    clearAll()
  }

  function handleAccountChange(id: string | null) {
    const newId = id ?? ''
    if (newId === accountId) return
    setAccountId(newId)
    setContactId('')
    setBillingAddressId('')
    setShippingAddressId('')
    clearError('accountId')
    clearError('contactId')
    clearError('billingAddressId')
    clearError('shippingAddressId')
  }

  // Active orderable_type — derived from sourceMode + quote. The save
  // path uses `quote.quotable_type` directly; we keep the boolean
  // shortcut here for conditional rendering.
  const quotableType = quote?.quotable_type
  // Lead-cascade only matters in CREATE mode — it's the path where the
  // FE submits structured AddressData because no account/addresses exist
  // yet. After Save, the cascade has created real rows; on EDIT the SO
  // carries real address IDs and we want the standard dropdown UI (locked
  // by customerLocked, since the customer FKs are frozen post-create).
  const isLeadCascade =
    !loadExisting && sourceMode === 'from-quote' && quotableType === 'lead'

  // Brand/OEM + Condition are mandatory on every freeform SO line that
  // saves them: direct creates, account-quote creates (items[] carry both)
  // and every edit / amend. The one exception is a create from a LEAD/DEAL
  // quote — that path posts only `quote_line_quantities` and the backend
  // copies the quote lines, which hold no OEM/Condition, so a value picked
  // here would be discarded. On the other quote-driven creates the row is
  // qty-only, but LineItemRow keeps these two pickers open when required.
  const oemConditionRequired = !(
    !loadExisting &&
    sourceMode === 'from-quote' &&
    quotableType !== 'account'
  )

  // For deal-driven quotes, fetch the deal so we can resolve its
  // account_id — which is the address-owner the pickers below scope to.
  // For account-driven quotes, orderable_id IS the account_id directly.
  const dealQuery = useDeal(
    sourceMode === 'from-quote' && quotableType === 'deal' ? quote?.quotable_id : null,
    { enabled: sourceMode === 'from-quote' && quotableType === 'deal' && !!quote },
  )

  // ── Address loading ──────────────────────────────────────────────────
  // Lead-cascade create has no list (addresses created by cascade). On
  // EDIT we always have a resolved account_id from the SO row regardless
  // of how it was originally created — use that directly. For CREATE,
  // walk through the source-specific paths.
  const addressOwnerAccountId: string = isLeadCascade
    ? ''
    : isEdit
      ? accountId
      : sourceMode === 'direct'
        ? accountId
        : quotableType === 'account'
          ? (quote?.quotable_id ?? '')
          : (dealQuery.data?.account_id ?? '')
  const addressesQuery = useAddressesForAccount(addressOwnerAccountId || null)
  // Filter by type for new picks, but ALWAYS include the currently-saved
  // address — lead-cascade in particular may create a single Billing-typed
  // address that the backend uses for both billing_address_id and
  // shipping_address_id, in which case the shipping dropdown's filter would
  // exclude it and the trigger would fall back to rendering the raw UUID.
  function withSavedAddress(
    pool: AccountAddressWire[],
    type: 'Billing' | 'Shipping',
    savedId: string,
  ): AccountAddressWire[] {
    // 'Both' serves billing AND shipping, so it belongs in either list.
    const matchesType = (a: AccountAddressWire) =>
      a.address_type === type || a.address_type === 'Both'
    const filtered = pool.filter(matchesType)
    if (savedId && !filtered.some((a) => a.id === savedId)) {
      const saved = pool.find((a) => a.id === savedId)
      if (saved && matchesType(saved)) return [saved, ...filtered]
    }
    return filtered
  }
  const billingAddresses = useMemo(
    () => withSavedAddress(addressesQuery.data ?? [], 'Billing', billingAddressId),
    [addressesQuery.data, billingAddressId],
  )
  const shippingAddresses = useMemo(
    () => withSavedAddress(addressesQuery.data ?? [], 'Shipping', shippingAddressId),
    [addressesQuery.data, shippingAddressId],
  )

  // Auto-select the account's default address for billing and shipping once its
  // addresses load (CREATE only — EDIT hydrates from the saved SO). Per type,
  // prefer the `is_default`-flagged address; fall back to the lone address of
  // that type. Account-scoped ref so clearing a pick doesn't re-trigger, and so
  // a new account re-runs the auto-select.
  const autoAddressForAccountRef = useRef<string | null>(null)
  useEffect(() => {
    if (autoAddressForAccountRef.current !== addressOwnerAccountId) {
      autoAddressForAccountRef.current = null
    }
  }, [addressOwnerAccountId])
  useEffect(() => {
    if (isEdit) return
    if (!addressOwnerAccountId) return
    if (addressesQuery.isLoading || addressesQuery.isError) return
    if (autoAddressForAccountRef.current === addressOwnerAccountId) return
    const all = addressesQuery.data ?? []
    if (all.length === 0) return
    autoAddressForAccountRef.current = addressOwnerAccountId

    const pickFor = (type: 'Billing' | 'Shipping') => {
      const pool = all.filter(
        (a) => a.address_type === type || a.address_type === 'Both',
      )
      return pool.find((a) => a.is_default) ?? (pool.length === 1 ? pool[0] : undefined)
    }
    if (!billingAddressId) {
      const pick = pickFor('Billing')
      if (pick) {
        setBillingAddressId(pick.id)
        clearError('billingAddressId')
      }
    }
    if (!shippingAddressId) {
      const pick = pickFor('Shipping')
      if (pick) {
        setShippingAddressId(pick.id)
        clearError('shippingAddressId')
      }
    }
  }, [
    isEdit,
    addressOwnerAccountId,
    addressesQuery.isLoading,
    addressesQuery.isError,
    addressesQuery.data,
    billingAddressId,
    shippingAddressId,
    clearError,
  ])

  // ── Line item helpers (Direct path only) ─────────────────────────────
  function updateLine(tempKey: string, patch: Partial<LocalLine>) {
    setLines((prev) => prev.map((l) => (l.tempKey === tempKey ? { ...l, ...patch } : l)))
  }
  function addLine() {
    setLines((prev) => [...prev, emptyLine(prev.length)])
  }
  function removeLine(tempKey: string) {
    setLines((prev) => {
      if (prev.length <= 1) return prev
      return prev.filter((l) => l.tempKey !== tempKey)
    })
  }
  /** "Clear all" in the grid — drop every line and leave one fresh empty
   *  row. The SO header PATCH sends the full items[] array, so saved rows
   *  simply fall out on the next save; no delete queue is needed here. */
  function clearAllLines() {
    setLines([emptyLine(0)])
  }

  const hasRealLines = lines.some(
    (l) => !!l.partVariantId || !!(l.itemName ?? "").trim() || (l.bomChildren ?? []).length > 0,
  )

  async function applyPastedGroups(pasted: PastedLineGroup[], mode: "replace" | "append") {
    if (pasted.length === 0) return

    const resolved = await resolvePasteVariants(pasted, qc)
    // SO rule: price-less rows become BOM components only under a parent
    // whose category is BOM-eligible; otherwise each becomes its own line.
    const groups = await promoteComponentsOfNonBomParents(pasted, resolved, qc)
    const { variantMap, categoryNameToId } = resolved

    const newLines: LocalLine[] = groups.map((g, idx) => {
      const bomChildren: BomChildRow[] = g.components.map((c) => {
        const base = createEmptyBomChild()
        const v = variantMap.get(variantKey(c.partNumber, {
          category: c.category || undefined,
          oem: c.oem || undefined,
          condition: pastedConditionToCondition(c.condition),
        })) ?? null
        if (v) {
          return {
            ...base,
            partId: v.id,
            partSku: v.sku_code,
            partImsId: v.part_id,
            itemName: v.name,
            categoryId: v.category_id,
            category: v.category_name,
            oemId: v.oem_id ?? undefined,
            condition: v.condition || undefined,
            listPrice: v.sell_price ? Number(v.sell_price) : undefined,
            description: c.description || undefined,
            qty: Number.isFinite(c.qty) && c.qty > 0 ? c.qty : 1,
          }
        }
        const childCat = c.category || undefined
        // Unmatched child: keep `partSku` empty (same shape as the unresolved
        // parent branch below). Otherwise the Part Number cell renders the
        // pasted text as if it were a resolved catalog SKU — misleading when
        // the part isn't in IMS. The pasted part number still shows in Part
        // Name via `itemName`, where the user can edit it freeform.
        return {
          ...base,
          itemName: c.partNumber || c.description || "",
          description: c.description || undefined,
          category: childCat,
          categoryId: childCat ? categoryNameToId.get(childCat.toLowerCase()) : undefined,
          condition: pastedConditionToCondition(c.condition) ?? c.conditionRaw,
          qty: Number.isFinite(c.qty) && c.qty > 0 ? c.qty : 1,
        }
      })

      const pv = variantMap.get(variantKey(g.parent.partNumber, {
        category: g.parent.category || undefined,
        oem: g.parent.oem || undefined,
        condition: pastedConditionToCondition(g.parent.condition),
      })) ?? null
      const qty = Number.isFinite(g.parent.qty) && g.parent.qty > 0 ? g.parent.qty : 1
      const rate = g.parent.price ?? 0
      const sortOrder = (hasRealLines && mode === "append" ? lines.length : 0) + idx

      if (pv) {
        const hsnRate = pv.hsn_gst_rate != null ? parseFloat(pv.hsn_gst_rate) : 18
        return {
          ...emptyLine(sortOrder),
          partVariantId: pv.id,
          partSku: pv.sku_code,
          partName: pv.name,
          partImsId: pv.part_id,
          itemName: pv.name,
          description: g.parent.description || "",
          categoryId: pv.category_id ?? "",
          oemId: pv.oem_id ?? undefined,
          condition: (pv.condition || undefined) as SOLineCondition | undefined,
          qty: String(qty),
          rate: String(rate),
          listPrice: pv.sell_price ? Number(pv.sell_price) : undefined,
          taxRate: String(hsnRate),
          bomChildren,
          isBomExpanded: bomChildren.length > 0,
        }
      }

      const pastedCat = g.parent.category
      return {
        ...emptyLine(sortOrder),
        itemName: g.parent.partNumber || "",
        description: g.parent.description || "",
        categoryId: pastedCat ? (categoryNameToId.get(pastedCat.toLowerCase()) ?? "") : "",
        condition: (pastedConditionToCondition(g.parent.condition) || undefined) as SOLineCondition | undefined,
        qty: String(qty),
        rate: String(rate),
        bomChildren,
        isBomExpanded: bomChildren.length > 0,
      }
    })

    setLines((prev) =>
      mode === "replace" || !hasRealLines ? newLines : [...prev, ...newLines],
    )
    return {
      lines: groups.length,
      components: groups.reduce((n, g) => n + g.components.length, 0),
    }
  }

  // ── Live totals (Direct + Quote-driven — both branches let the user
  //    edit qty / rate / discount, so both want a live preview).
  //
  // Rental rows: only fed to the preview when the shape is COMPLETE
  // (period + start + end). Partial rental data would 422 the
  // /calculate endpoint and clear the totals strip while the user is
  // mid-typing — instead we skip those rows for preview math only.
  const calcPayloadRaw = useMemo<SalesOrderCalculateLinePayload[]>(() => {
    // Backend f3e8b18 (2026-05-29) unified /sales-orders/calculate with the
    // persist payload — children live under `parent.children` with
    // `config_action` + required `category_id`. Remove rows are now
    // accepted and properly excluded from the rollup server-side, so we
    // can send the same shape sales fills in for POST.
    const items: SalesOrderCalculateLinePayload[] = []
    lines.forEach((l, idx) => {
      const qty = toNumberOrUndef(l.qty)
      if (!qty || qty <= 0) return
      const headline: SalesOrderCalculateLinePayload = {
        item_name: l.itemName.trim() || 'Line item',
        qty,
        sort_order: idx,
      }
      if (l.partVariantId) headline.part_variant_id = l.partVariantId
      if (l.categoryId) headline.category_id = l.categoryId
      const rate = toNumberOrUndef(l.rate)
      if (rate != null) headline.rate = rate
      const tax = toNumberOrUndef(l.taxRate)
      if (tax != null) headline.tax_rate = tax
      const da = toNumberOrUndef(l.discountAmount)
      if (da != null) headline.discount_amount = da
      // description omitted: /calculate math is driven by qty/rate/tax/
      // discount only — passing it would just churn the queryKey on
      // description edits and refetch with no effect on totals.
      const notes = (l.configurationNotes ?? '').trim()
      if (notes) headline.configuration_notes = notes
      const warranty = (l.warrantyLevel ?? '').trim()
      if (warranty) headline.warranty_level = warranty
      if (l.isRental && l.rentalPeriod && l.rentalStartDate && l.rentalEndDate) {
        headline.is_rental = true
        headline.rental_period = l.rentalPeriod
        headline.rental_start_date = l.rentalStartDate
        headline.rental_end_date = l.rentalEndDate
      }
      // Children require a `category_id` on every row — skip if the
      // parent hasn't picked one yet (preview will refresh once it does).
      const children = (l.bomChildren ?? []).filter(
        (c) => Number.isFinite(c.qty) && c.qty > 0,
      )
      if (l.categoryId && children.length > 0) {
        headline.children = children.map<
          NonNullable<SalesOrderCalculateLinePayload['children']>[number]
        >((c, childIdx) => ({
          config_action: 'Add',
          part_variant_id: c.partId || undefined,
          // Inherit the parent's category until the picker returns a real
          // UUID — matches the persist mapper's fallback.
          category_id: c.categoryId ?? l.categoryId!,
          item_name: resolveChildName(c) || undefined,
          // description omitted from /calculate — see headline note above.
          qty: c.qty,
          rate: c.rate >= 0 ? c.rate : undefined,
          tax_rate: c.taxRate ?? tax ?? undefined,
          // Per-child discount — without it the calc payload is
          // invariant to discount edits on child rows and `/calculate`
          // never refetches.
          discount_amount: c.discountAmount > 0 ? c.discountAmount : undefined,
          sort_order: childIdx,
        }))
      }
      items.push(headline)
    })
    return items
  }, [lines])

  // Don't call /calculate while any line or BOM child has a discount that
  // exceeds its amount — the backend 422s such a payload. The line + BOM
  // editor flag the offending row inline; this also gates the request.
  const hasDiscountError = useMemo(
    () =>
      lines.some(
        (l) =>
          lineDiscountError(l) != null ||
          (l.bomChildren ?? []).some((c) => bomChildDiscountError(c)),
      ),
    [lines],
  )

  // Defense in depth (mirrors QuoteBuilderPanel): when invalid, feed the
  // query an EMPTY payload *before* debouncing so it's disabled by BOTH
  // `enabled: false` AND `items.length === 0`. Debouncing the raw payload
  // and gating only via `enabled` left a hole: on fixing the discount,
  // `enabled` flips true instantly while the debounced payload still held
  // the old over-limit value for ~300ms, firing it at the network. Gating
  // the request before the debounce closes that window.
  const effectiveCalcRequest = useMemo<SalesOrderCalculateRequest>(
    () =>
      hasDiscountError
        ? { items: [] }
        : {
            discount_amount: toNumberOrUndef(headerDiscountAmt),
            items: calcPayloadRaw,
          },
    [hasDiscountError, headerDiscountAmt, calcPayloadRaw],
  )
  const debouncedCalcRequest = useDebounce(effectiveCalcRequest, 300)

  const calcQuery = useSalesOrderCalculate(debouncedCalcRequest, {
    enabled: !hasDiscountError,
  })
  const totals = calcQuery.data

  // Surface /calculate failures via a toast — without this the totals
  // row silently freezes at zero on a 422 / 5xx and the user has no idea
  // anything went wrong. Refire only when the error message changes so a
  // stuck error doesn't spam.
  const lastCalcErrorMsgRef = useRef<string | null>(null)
  useEffect(() => {
    if (!calcQuery.isError) {
      lastCalcErrorMsgRef.current = null
      return
    }
    const msg =
      (calcQuery.error instanceof Error && calcQuery.error.message) ||
      'Calculation failed'
    if (msg !== lastCalcErrorMsgRef.current) {
      lastCalcErrorMsgRef.current = msg
      toast.error(S.toast.calcFailed(msg))
    }
  }, [calcQuery.isError, calcQuery.error])

  // ── Attachments ──────────────────────────────────────────────────────
  // Shared with the Closed Won wizard, which builds sales orders through its
  // own controller. Create mode stages files onto the multipart POST; edit
  // mode uploads them against the existing SO as they're picked.
  const attachments = useSoAttachmentLines(soId)

  // ── Mutations ────────────────────────────────────────────────────────
  const createMut = useCreateSalesOrder()
  const updateMut = useUpdateSalesOrder(soId ?? '')
  // Amend spawns a new revision via POST /revise on the source SO id.
  const reviseMut = useReviseSalesOrder(soId ?? '')
  // `amendPatching` tracks the follow-up PATCH that persists the scalar fields
  // /revise doesn't accept (terms / notes / discount / place-of-supply).
  const [amendPatching, setAmendPatching] = useState(false)
  const saving =
    createMut.isPending || updateMut.isPending || reviseMut.isPending || amendPatching

  // Amend guards: only an "Account Rejected" SO is amendable through this form,
  // and the reason must have come from the detail-page modal. Bounce back to
  // the detail page otherwise so the operator goes through the proper entry.
  const amendBlocked =
    isAmend && !!existing && existing.status !== 'Account Rejected'
  const amendReasonMissing = isAmend && !!existing && !amendReason.trim()
  useEffect(() => {
    if (!soId) return
    // Once the amend save is in flight or done, the SOURCE SO refetches as
    // status 'Amend' (it's demoted by /revise) — that would trip the
    // wrong-status guard below and bounce us back to the source, overriding
    // the navigate to the NEW revision. Skip the guard for the whole save
    // window so the redirect to the new SO stands.
    if (reviseMut.isPending || reviseMut.isSuccess) return
    if (amendBlocked) {
      toast.error('This sales order isn’t in “Account Rejected” status.')
      navigate(`/crm/sales-orders/${soId}`, { replace: true })
    } else if (amendReasonMissing) {
      toast.error('Start the amendment from the order’s Amend button.')
      navigate(`/crm/sales-orders/${soId}`, { replace: true })
    }
  }, [
    amendBlocked,
    amendReasonMissing,
    navigate,
    soId,
    reviseMut.isPending,
    reviseMut.isSuccess,
  ])

  // ── Dirty detection ─────────────────────────────────────────────────
  // Summarize lines by the fields the user actually edits — the random
  // `tempKey` would otherwise force every snapshot to mismatch.
  const summarizeLine = (l: LocalLine) => ({
    serverId: l.serverId,
    quoteItemId: l.quoteItemId,
    partVariantId: l.partVariantId,
    // `partName` is editable for catalog rows (the Name input writes
    // back through `itemName`, but `partName` is what's actually shown
    // for partVariantId-bound rows). Without it in the dirty snapshot
    // a rename on a catalog row would silently slip past `isDirty`.
    partName: l.partName,
    itemName: l.itemName,
    description: l.description,
    categoryId: l.categoryId,
    oemId: l.oemId,
    condition: l.condition,
    qty: l.qty,
    rate: l.rate,
    taxRate: l.taxRate,
    discountAmount: l.discountAmount,
    approverId: l.approverId,
    isRental: l.isRental,
    rentalPeriod: l.rentalPeriod,
    rentalStartDate: l.rentalStartDate,
    rentalEndDate: l.rentalEndDate,
    // BOM tree — project to business fields only (local row ids would
    // make mount-time always-dirty). Without this, edits to the BOM
    // children editor get classified "no changes to save".
    configurationNotes: (l.configurationNotes ?? '').trim(),
    warrantyLevel: (l.warrantyLevel ?? '').trim(),
    bomChildren: (l.bomChildren ?? []).map((c) => ({
      partId: c.partId,
      itemName: c.itemName,
      description: c.description,
      categoryId: c.categoryId,
      oemId: c.oemId,
      condition: c.condition,
      qty: c.qty,
      rate: c.rate,
      taxRate: c.taxRate,
      discountAmount: c.discountAmount,
    })),
  })

  const initialValues = useMemo(() => {
    // Amend baseline mirrors the hydrated state: prefilled lines (create-shape)
    // + terms, but BLANK customer FKs. Picking an account/contact/address or
    // editing a line then reads as dirty (so the unsaved-changes guard works);
    // a freshly-loaded amend form does not.
    if (isAmend && existing) {
      return {
        sourceMode: 'direct' as SourceMode,
        salesQuoteId: '',
        accountId: '',
        contactId: '',
        billingAddressId: '',
        shippingAddressId: '',
        placeOfSupply: existing.place_of_supply ?? '',
        headerDiscountAmt:
          existing.discount_amount && existing.discount_amount > 0
            ? String(existing.discount_amount)
            : '',
        termsConditions: existing.terms_conditions ?? '',
        notes: existing.notes ?? '',
        paymentTerms: existing.payment_terms ?? '',
        warranty: existing.warranty ?? '',
        delivery: existing.delivery ?? '',
        orderType: (existing.order_type?.[0] as SOOrderType | undefined) ?? '',
        lines: (existing.items.length > 0
          ? groupSoItemsToTree(existing.items).map<LocalLine>((it, idx) => ({
              tempKey: '',
              serverId: undefined,
              quoteItemId: undefined,
              partVariantId: it.part_variant_id ?? undefined,
              partSku: undefined,
              partName: it.part_variant_id ? it.item_name : undefined,
              itemName: it.item_name,
              description: it.description ?? '',
              categoryId: it.category_id ?? '',
              oemId: it.oem_id ?? undefined,
              condition: (it.condition ?? undefined) as SOLineCondition | undefined,
              qty: String(it.qty),
              originalQty: undefined,
              rate: String(it.rate),
              // Snapshot of IMS sell_price at pick time; hydrated from server.
              listPrice: it.list_price ?? undefined,
              taxRate: it.tax_rate ? String(it.tax_rate) : '',
              discountAmount:
                it.discount_amount && it.discount_amount > 0 ? String(it.discount_amount) : '0',
              approverId: undefined,
              approverName: undefined,
              isRental: it.is_rental,
              rentalPeriod: it.rental_period ?? undefined,
              rentalStartDate: it.rental_start_date ?? undefined,
              rentalEndDate: it.rental_end_date ?? undefined,
              sortOrder: it.sort_order ?? idx,
              configurationNotes: it.configuration_notes ?? undefined,
              warrantyLevel: it.warranty_level ?? undefined,
              bomChildren: it.children
                .filter((c) => c.config_action !== 'Remove')
                .map((c) => ({
                  id: `ac-${c.id}`,
                  partId: c.part_variant_id ?? undefined,
                  partSku: undefined,
                  itemName: c.item_name,
                  categoryId: c.category_id ?? undefined,
                  oemId: c.oem_id ?? undefined,
                  condition: (c.condition ?? undefined) as SOLineCondition | undefined,
                  description: c.description ?? undefined,
                  qty: Number(c.qty),
                  rate: Number(c.rate),
                  taxRate: Number(c.tax_rate ?? 0),
                  discountAmount: Number(c.discount_amount ?? 0),
                  warrantyLevel: c.warranty_level ?? undefined,
                })),
              isBomExpanded:
                it.children.filter((c) => c.config_action !== 'Remove').length > 0,
            }))
          : [emptyLine(0)]
        ).map(summarizeLine),
        shippingSameAsBilling: true,
      }
    }
    if (isEdit && existing) {
      return {
        sourceMode: (existing.sales_quote_id ? 'from-quote' : 'direct') as SourceMode,
        salesQuoteId: existing.sales_quote_id ?? '',
        accountId: existing.account_id,
        contactId: existing.contact_id,
        billingAddressId: existing.billing_address_id,
        shippingAddressId: existing.shipping_address_id,
        placeOfSupply: existing.place_of_supply ?? '',
        headerDiscountAmt:
          existing.discount_amount && existing.discount_amount > 0
            ? String(existing.discount_amount)
            : '',
        termsConditions: existing.terms_conditions ?? '',
        notes: existing.notes ?? '',
        paymentTerms: existing.payment_terms ?? '',
        warranty: existing.warranty ?? '',
        delivery: existing.delivery ?? '',
        orderType: (existing.order_type?.[0] as SOOrderType | undefined) ?? '',
        // Baseline lines must mirror what `setLines` hydrates from
        // `existing` (the useEffect that populates state). Without
        // identical projection — same `bomChildren`, `configurationNotes`
        // — the dirty diff sees a mount-time delta (or worse, a missing
        // child-discount delta) and the "no changes to save" / always-
        // dirty bugs both appear depending on which side is missing what.
        lines: (existing.items.length > 0
          ? groupSoItemsToTree(existing.items).map<LocalLine>((it, idx) => ({
              tempKey: '',
              serverId: it.id,
              quoteItemId: it.sales_quote_item_id ?? undefined,
              partVariantId: it.part_variant_id ?? undefined,
              partSku: undefined,
              partName: it.part_variant_id ? it.item_name : undefined,
              itemName: it.item_name,
              description: it.description ?? '',
              categoryId: it.category_id ?? '',
              oemId: it.oem_id ?? undefined,
              condition: (it.condition ?? undefined) as SOLineCondition | undefined,
              qty: String(it.qty),
              originalQty: it.sales_quote_item_id ? it.qty : undefined,
              rate: String(it.rate),
              // Snapshot of IMS sell_price at pick time; hydrated from server.
              listPrice: it.list_price ?? undefined,
              taxRate: it.tax_rate ? String(it.tax_rate) : '',
              discountAmount:
                it.discount_amount && it.discount_amount > 0 ? String(it.discount_amount) : '0',
              approverId: it.approver_id ?? undefined,
              approverName: undefined,
              isRental: it.is_rental,
              rentalPeriod: it.rental_period ?? undefined,
              rentalStartDate: it.rental_start_date ?? undefined,
              rentalEndDate: it.rental_end_date ?? undefined,
              sortOrder: it.sort_order ?? idx,
              configurationNotes: it.configuration_notes ?? undefined,
              warrantyLevel: it.warranty_level ?? undefined,
              bomChildren: it.children
                .filter((c) => c.config_action !== 'Remove')
                .map((c) => ({
                  id: `ac-${c.id}`,
                  partId: c.part_variant_id ?? undefined,
                  partSku: undefined,
                  itemName: c.item_name,
                  categoryId: c.category_id ?? undefined,
                  oemId: c.oem_id ?? undefined,
                  condition: (c.condition ?? undefined) as SOLineCondition | undefined,
                  description: c.description ?? undefined,
                  qty: Number(c.qty),
                  rate: Number(c.rate),
                  taxRate: Number(c.tax_rate ?? 0),
                  discountAmount: Number(c.discount_amount ?? 0),
                  warrantyLevel: c.warranty_level ?? undefined,
                })),
              isBomExpanded:
                it.children.filter((c) => c.config_action !== 'Remove').length > 0,
            }))
          : [emptyLine(0)]
        ).map(summarizeLine),
        shippingSameAsBilling: true,
      }
    }
    // Closed-Won deep-link locks the form into From Quote on mount, so the
    // initial snapshot must reflect that — otherwise live state would diff
    // against a 'direct' baseline and the form would mount as dirty,
    // tripping the discard-changes guard on the first back-nav.
    const initialSourceMode: SourceMode =
      prefillQuoteId || closedWonSource ? 'from-quote' : 'direct'
    return {
      sourceMode: initialSourceMode,
      salesQuoteId: prefillQuoteId,
      accountId: prefillAccountId,
      contactId: '',
      billingAddressId: '',
      shippingAddressId: '',
      placeOfSupply: '',
      headerDiscountAmt: '',
      termsConditions: '',
      notes: '',
      paymentTerms: '',
      warranty: '',
      delivery: '',
      orderType: '' as SOOrderType | '',
      lines: [summarizeLine(emptyLine(0))],
      shippingSameAsBilling: true,
    }
  }, [
    isAmend,
    isEdit,
    existing,
    prefillQuoteId,
    prefillAccountId,
    closedWonSource,
  ])

  const currentValues = useMemo(
    () => ({
      sourceMode,
      salesQuoteId,
      accountId,
      contactId,
      billingAddressId,
      shippingAddressId,
      placeOfSupply,
      headerDiscountAmt,
      termsConditions,
      notes,
      paymentTerms,
      warranty,
      delivery,
      orderType,
      lines: lines.map(summarizeLine),
      shippingSameAsBilling,
    }),
    [
      sourceMode,
      salesQuoteId,
      accountId,
      contactId,
      billingAddressId,
      shippingAddressId,
      placeOfSupply,
      headerDiscountAmt,
      termsConditions,
      notes,
      paymentTerms,
      warranty,
      delivery,
      orderType,
      lines,
      shippingSameAsBilling,
    ],
  )

  const submitInFlight =
    saving || createMut.isSuccess || updateMut.isSuccess || reviseMut.isSuccess
  const isDirty =
    !submitInFlight &&
    (!isEdit || hydrated) &&
    !deepEqual(currentValues, initialValues)

  // ── Validation ───────────────────────────────────────────────────────
  function validate(): boolean {
    clearAll()
    let ok = true

    if (sourceMode === 'from-quote') {
      if (!salesQuoteId) {
        setError('salesQuoteId', 'Pick a quote.')
        ok = false
      }
      if (!quote) {
        // Still loading — block save until we know quotable_type.
        setError('salesQuoteId', 'Wait for quote details to load.')
        ok = false
      }
    }

    if (isLeadCascade) {
      // Lead-cascade requires billing_address_data; contact/address IDs are ignored.
      if (!validateAddressData(billingAddr)) {
        setError('billingAddr', 'Fill all required billing address fields (line1, city, state, pincode).')
        ok = false
      }
      if (!shippingSameAsBilling && !validateAddressData(shippingAddr)) {
        setError('shippingAddr', 'Fill all required shipping address fields.')
        ok = false
      }
    } else {
      // Direct path AND quote-driven from account/deal — backend reads
      // account_id/contact_id/billing/shipping from payload. For
      // quote-driven from account or deal, the FE can leave account_id
      // null (server falls back to quote/deal default), but contact +
      // addresses MUST be picked.
      if (sourceMode === 'direct' && !accountId) {
        setError('accountId', 'Pick an account.')
        ok = false
      }
      if (!contactId) {
        setError('contactId', 'Pick a contact.')
        ok = false
      }
      if (!billingAddressId) {
        setError('billingAddressId', 'Pick a billing address.')
        ok = false
      }
      if (!shippingAddressId) {
        setError('shippingAddressId', 'Pick a shipping address.')
        ok = false
      }
    }

    if (placeOfSupply && !/^[A-Z]{2}$/.test(placeOfSupply)) {
      setError('placeOfSupply', 'Use a 2-letter state code (e.g. KA, MH).')
      ok = false
    }

    // Line validation runs for both modes — the quote-driven flow now
    // exposes editable items prefilled from the quote, and we sync them
    // to the server via PATCH after the deep-copy POST.
    {
      const validLines = lines.filter((l) => toNumberOrUndef(l.qty))
      if (validLines.length === 0) {
        setError('items', 'Add at least one line item with a quantity.')
        ok = false
      }
      // Per-line validation: freeform rows need a category; rental rows
      // need the full shape. Catalog rows (partVariantId set) defer to
      // backend autofill for category_id. Quote-driven rows additionally
      // cap qty to the original (quote) qty — sales can scale down but
      // never above what the customer accepted. Name is optional — a row
      // is identified by its part / category, and the backend auto-fills
      // the name from the variant on catalog rows.
      // A rental order needs its window before any line can be rental —
      // see `buildItemPayload`. Caught here so the operator gets a field
      // error instead of a backend validation failure on save.
      // `!isEdit`: the window picker is disabled on an existing order, so
      // demanding it there would be an unfixable block — the operator has
      // no control to satisfy it. On edit a windowless rental order simply
      // saves its lines as non-rental (see `buildItemPayload`), which is
      // the same thing that happened before any of this.
      // Order Type is mandatory on create — it decides `sellable_type`, so
      // an order saved without one lands in neither the sales nor the
      // rentals flow the operator meant. Locked (and always set) on edit.
      if (!isEdit && !orderType) {
        setError('orderType', S.form.orderTypeRequired)
        ok = false
      }
      if (
        !isEdit &&
        orderType === 'Rental' &&
        (!rentalStartDate || !rentalEndDate)
      ) {
        setError('rentalWindow', S.form.rentalWindowRequired)
        ok = false
      }
      // The order date is mandatory on a rental order too — same `!isEdit`
      // reason: the picker is disabled once the order exists.
      if (!isEdit && orderType === 'Rental' && !rentalOrderDate) {
        setError('rentalOrderDate', S.form.rentalOrderDateRequired)
        ok = false
      }
      // The backend refuses an end on or before the start (QA RM11).
      if (rentalStartDate && rentalEndDate && rentalEndDate <= rentalStartDate) {
        setError('rentalWindow', S.form.rentalEndAfterStart)
        ok = false
      }
      for (const [idx, l] of lines.entries()) {
        const newQty = toNumberOrUndef(l.qty)
        // Blank row (no qty) — skip silently so a fresh "+ Add line"
        // placeholder doesn't shout at the user.
        if (!newQty) continue
        // Rate must be > 0 — a 0 (or missing) rate is an unpriced line and is
        // blocked on save.
        const rateNum = toNumberOrUndef(l.rate)
        if (rateNum == null || rateNum <= 0) {
          setError(`line:${l.tempKey}:rate`, S.line.validation.rateRequired)
          ok = false
        }
        // Part Number is optional on an SO line (the backend accepts freeform
        // rows: part_variant_id NULL + item_name/category/qty/rate from the FE).
        // Previously enforced: a line must say what it is — Part Number OR
        // Description. Commented out per user request — description is now
        // fully optional on SO lines.
        // if (!l.partVariantId && stripHtml(l.description).length === 0) {
        //   setError(`line:${l.tempKey}:identity`, S.line.validation.descriptionRequired)
        //   setError(`line:${l.tempKey}:description`, S.line.validation.descriptionRequired)
        //   ok = false
        // }
        // Per-child validation: a component needs a part name and a category
        // (Part Number is optional, same as the parent line and the Quote).
        // Keys are per-child so the shared LineItemsGrid lights up only the
        // offending child's cells.
        for (const c of l.bomChildren ?? []) {
          if (bomChildNameError(c)) {
            setError(
              `line:${l.tempKey}:child:${c.id}:name`,
              S.line.validation.componentNameRequired,
            )
            ok = false
          }
          if (bomChildCategoryError(c)) {
            setError(
              `line:${l.tempKey}:child:${c.id}:category`,
              S.line.validation.componentCategoryRequired,
            )
            ok = false
          }
        }
        // Brand/OEM + Condition are mandatory on every freeform component.
        // Keys are per-child so the shared LineItemsGrid lights up only the
        // offending child's OEM cell (and the condition flag persists at the
        // aggregate key for the toast summary).
        if (oemConditionRequired) {
          for (const c of l.bomChildren ?? []) {
            if (bomChildOemError(c)) {
              setError(`line:${l.tempKey}:child:${c.id}:oem`, S.line.oemRequired)
              ok = false
            }
            if (bomChildConditionError(c)) {
              setError(
                `line:${l.tempKey}:component_oem_condition`,
                'Every component must have a Brand/OEM and condition.',
              )
              ok = false
            }
          }
        }
        // Per-line discount can't exceed what the line is worth. Cap is
        // qty*rate for a standard line; for a rental it's the server-computed
        // gross (qty*rate*duration) read off the calc preview — skipped when
        // that gross isn't available yet.
        const discAmt = toNumberOrUndef(l.discountAmount)
        if (discAmt != null && discAmt > 0) {
          const calcGross = totals?.items?.[idx]?.gross_amount
          const lineGross = calcGross ?? newQty * (toNumberOrUndef(l.rate) ?? 0)
          const grossKnown = !l.isRental || calcGross != null
          const discErr = grossKnown ? discountCapError(discAmt, lineGross) : null
          if (discErr) {
            setError(`line:${l.tempKey}:discount`, discErr)
            ok = false
          }
        }
        if (l.originalQty != null && newQty > l.originalQty) {
          setError(
            `line:${l.tempKey}:qty`,
            `Qty cannot exceed ${l.originalQty} (the quoted amount).`,
          )
          ok = false
        }
        if (!l.partVariantId && !l.categoryId) {
          setError(
            `line:${l.tempKey}:category`,
            'Pick a category (required for freeform items).',
          )
          ok = false
        }
        // Brand/OEM + Condition are mandatory on every SO's freeform lines.
        // Catalog rows take both from the picked part (locked in the row).
        if (oemConditionRequired && !l.partVariantId) {
          if (!l.oemId) {
            setError(`line:${l.tempKey}:oem`, S.line.oemRequired)
            ok = false
          }
          if (!l.condition) {
            setError(`line:${l.tempKey}:condition`, S.line.conditionRequired)
            ok = false
          }
        }
        if (l.isRental) {
          // Against the EFFECTIVE window, not the line's own fields.
          // A blank line means "same as the order" — that is the whole
          // point of the inherit-by-default design — so demanding its own
          // dates failed every rental line on a form that never asks for
          // them. `rentalPeriod` is likewise not an operator choice: the
          // cadence lives on `so_configure` via Configure SO, and the
          // payload defaults it. These mirror `buildItemPayload` exactly,
          // so the form can never refuse a shape the API would accept.
          const start = l.rentalStartDate || rentalStartDate
          const end = l.rentalEndDate || rentalEndDate
          if (!start) {
            setError(`line:${l.tempKey}:rental_start`, 'Start date is required.')
            ok = false
          }
          if (!end) {
            setError(`line:${l.tempKey}:rental_end`, 'End date is required.')
            ok = false
          }
          if (start && end && end <= start) {
            setError(`line:${l.tempKey}:rental_end`, S.form.rentalEndAfterStart)
            ok = false
          }
        }
      }
    }
    // Attachment errors render inside the section, so they don't go through
    // `setError`; the controller owns its own error map. Call it regardless
    // of `ok` so the user sees every problem in one pass, not one per save.
    if (!attachments.validate()) ok = false
    return ok
  }

  function buildItemPayload(l: LocalLine, idx: number): SalesOrderItemCreatePayload {
    const payload: SalesOrderItemCreatePayload = {
      qty: toNumberOrUndef(l.qty) ?? 1,
      sort_order: idx,
    }
    // Catalog row: pass part_variant_id; backend auto-fills item_name +
    // category_id + tax_rate + rate from the variant. Freeform row: send
    // item_name + category_id (server requires both).
    if (l.partVariantId) {
      payload.part_variant_id = l.partVariantId
      // Send overrides only when the user edited them away from the
      // catalog defaults — the form treats both fields as editable post-pick.
      if (l.itemName.trim()) payload.item_name = l.itemName.trim()
      // Per-line category override is allowed even for catalog rows.
      if (l.categoryId) payload.category_id = l.categoryId
    } else {
      // Name is optional in the UI, but the backend requires a non-empty
      // item_name on freeform rows (no variant to auto-fill from). Fall back
      // ONLY to a generic label — NEVER the description (that leaked the
      // description into the name slot on the saved record).
      payload.item_name = l.itemName.trim() || '-'
      payload.category_id = l.categoryId
    }
    const rate = toNumberOrUndef(l.rate)
    if (rate != null) payload.rate = rate
    // Snapshot of IMS sell_price at pick time; survives sell_price changes.
    if (l.listPrice != null) payload.list_price = l.listPrice
    const tax = toNumberOrUndef(l.taxRate)
    if (tax != null) payload.tax_rate = tax
    const da = toNumberOrUndef(l.discountAmount)
    if (da != null) payload.discount_amount = da
    if (l.description.trim()) payload.description = l.description.trim()
    // Per-line Brand/OEM + Condition — both optional, and both consumed by the
    // service. On a catalog row it snapshots them from the variant/parent part
    // and 400s if the value we send disagrees (SO_ITEM_OEM_MISMATCH /
    // SO_ITEM_CONDITION_MISMATCH), so these must be the part's own values —
    // which is exactly what the part-pick handler fills in. On a freeform row
    // they're stored as-is. Rides along both create and PATCH (the update path
    // spreads `base`).
    if (l.oemId) payload.oem_id = l.oemId
    if (l.condition) payload.condition = l.condition
    if (l.approverId) payload.approver_id = l.approverId
    // Quote-item lineage — only send on NEW rows (no serverId). For
    // existing items the backend already has `sales_quote_item_id`
    // stored and re-sending it would re-fire `assert_qty_available`
    // and the fulfilment recompute unnecessarily. Lead/Deal branches
    // don't reach this code path (they send quote_line_quantities on
    // the header instead).
    if (l.quoteItemId && !l.serverId) {
      payload.sales_quote_item_id = l.quoteItemId
    }
    if (l.isRental) {
      payload.is_rental = true
      if (l.rentalPeriod) payload.rental_period = l.rentalPeriod
      if (l.rentalStartDate) payload.rental_start_date = l.rentalStartDate
      if (l.rentalEndDate) payload.rental_end_date = l.rentalEndDate
    }
    // SO-BOM — `configuration_notes` is mutable so it flows on both create
    // and update branches. `children` only flow on NEW rows (id absent):
    // the backend treats `parent_sales_order_item_id` / `config_action`
    // as immutable on existing rows. Sales edits BOM by deleting +
    // re-adding the parent line.
    const notes = (l.configurationNotes ?? '').trim()
    if (notes) payload.configuration_notes = notes
    const warranty = (l.warrantyLevel ?? '').trim()
    if (warranty) payload.warranty_level = warranty
    if (!l.serverId) {
      const children = bomChildrenToCreatePayload(
        l.bomChildren ?? [],
        l.categoryId || undefined,
        // SO children carry Brand/OEM + Condition (the quote's don't).
        { withOemCondition: true },
      ) as SalesOrderBomChildCreatePayload[]
      // Always emit `children` — empty array when no child is selected.
      payload.children = children
    }
    return payload
  }

  // PATCH-flavour BOM children for an EXISTING parent line. Keeps each
  // hydrated child's `serverChildId` so the backend updates that child by id
  // (variant / qty / rate all mutable). Children added in the editor have no
  // `serverChildId` → they dispatch as creates (`config_action: 'Add'`).
  // Children the user removed simply don't appear here, so the backend's
  // full-replace reconciliation drops them. Mirrors the quote builder's
  // `buildChildrenForUpsert`.
  function buildBomChildrenForUpsert(l: LocalLine): SalesOrderBomChildUpsertPayload[] {
    const parentCat = l.categoryId || undefined
    return (l.bomChildren ?? [])
      .filter((c) => Number.isFinite(c.qty) && c.qty > 0)
      .map<SalesOrderBomChildUpsertPayload>((c, idx) => ({
        id: c.serverChildId,
        // config_action is immutable on existing children — backend ignores
        // it when id is present, so only send it for brand-new children.
        ...(c.serverChildId ? {} : { config_action: 'Add' as const }),
        // Existing child whose variant was cleared → explicit null so the
        // PATCH drops it (omitting keeps the old variant). New child with no
        // part → omit (undefined). Catalog child → its variant id.
        part_variant_id: c.partId || (c.serverChildId ? null : undefined),
        category_id: (c.categoryId || parentCat) ?? '',
        // Brand/OEM + Condition — same null-vs-omit contract as
        // `part_variant_id` above: on an EXISTING child, an explicit null
        // clears a value the user unset (omitting would keep the stored one);
        // on a NEW child, omit so the server autofills from the variant.
        // On catalog children these carry the variant's own values, which is
        // exactly what the service asserts against.
        oem_id: c.oemId || (c.serverChildId ? null : undefined),
        condition:
          (c.condition as SOLineCondition | undefined) ||
          (c.serverChildId ? null : undefined),
        // Name comes ONLY from a selected part; freeform children send '-'
        // (never the description — mirrors the create mapper contract).
        item_name: resolveChildName(c) || '-',
        description: (c.description ?? '').trim() || null,
        qty: c.qty,
        rate: c.rate,
        ...(c.listPrice != null ? { list_price: c.listPrice } : {}),
        tax_rate: c.taxRate,
        discount_amount: c.discountAmount > 0 ? c.discountAmount : undefined,
        sort_order: idx,
        // Existing child whose warranty was cleared → explicit null so the
        // PATCH drops it; new child with no warranty → omit so the server
        // keeps its default (NULL).
        warranty_level:
          (c.warrantyLevel ?? '').trim() || (c.serverChildId ? null : undefined),
      }))
  }

  // `targetStatus` drives the CREATE path only — it decides whether the new
  // SO lands in Draft (Save as Draft) or goes straight to Submitted (Submit
  // for Approval). Defaults to 'Submitted' so existing primary-button callers
  // keep their behaviour. The backend create service honours the requested
  // status: Draft is the default, and 'Submitted' triggers an inline submit
  // (services/sales_order_service.py — requested_status branch). The EDIT path
  // ignores it (PATCH never changes status; that's done via /status or /revise).
  async function handleSave(targetStatus: 'Draft' | 'Submitted' = 'Submitted') {
    if (!validate()) {
      // Amend has no separate validation surface; surface the failure so a
      // missing account / contact / billing / shipping doesn't look like a
      // dead "Amend" button. (Create/edit keep their inline-only behaviour.)
      if (isAmend) toast.error('Please fix the highlighted fields.')
      return
    }

    // ── Amend path ───────────────────────────────────────────────────────
    // Spawn a new revision via POST /revise: full-replace line items + the new
    // (approved) account + contact/addresses + the reason carried from the
    // modal. The /revise contract doesn't cover the scalar commercial fields
    // (terms/notes/discount/place-of-supply), so they're PATCHed onto the new
    // Draft revision in a follow-up call.
    if (isAmend) {
      if (!amendReason.trim()) {
        toast.error('A reason is required to amend a sales order.')
        return
      }
      const items = lines
        .filter((l) => toNumberOrUndef(l.qty))
        .map((l, idx) => buildItemPayload(l, idx))
      try {
        const next = await reviseMut.mutateAsync({
          reason: amendReason.trim(),
          accountId,
          contactId,
          billingAddressId,
          shippingAddressId,
          items,
        })
        // Amend targets an approved account ⇒ the new revision is Draft, so the
        // PATCH is accepted. (Guard on Draft anyway — a non-Draft revision is
        // frozen and the scalar edits simply don't apply.)
        if (next.status === 'Draft') {
          const scalarBody: SalesOrderUpdatePayload = {
            place_of_supply: placeOfSupply || null,
            terms_conditions: termsConditions || null,
            notes: notes || null,
            payment_terms: paymentTerms || null,
            warranty: warranty || null,
            delivery: delivery || null,
          }
          const hAmt = toNumberOrUndef(headerDiscountAmt)
          if (hAmt != null) scalarBody.discount_amount = hAmt
          // Order type is editable on amend — persist the picked value (the new
          // revision inherited the source's via /revise; this overwrites it).
          if (orderType) scalarBody.order_type = [orderType]
          try {
            setAmendPatching(true)
            const patched = await updateSalesOrder(next.id, scalarBody)
            qc.setQueryData(['crm', 'sales-orders', 'detail', patched.id], patched)
          } catch {
            toast.error(
              'Revision created, but saving terms/notes failed — open the new order to retry.',
            )
          } finally {
            setAmendPatching(false)
          }
        }
        navigate(`/crm/sales-orders/${next.id}`, { replace: true })
      } catch {
        /* reviseMut fires the toast */
      }
      return
    }

    if (isEdit && existing) {
      // PATCH path — orderable_type/_id are NOT editable. The line upsert is
      // sent for EVERY edit, quote-driven SOs included (see items[] block).
      //
      // PATCH semantics (mirrors quote module): omit a key to keep its
      // current value, send `null` to clear, send a number/string to
      // overwrite. Empty form fields → omit. This avoids the
      // "discount_percentage / discount_amount must agree" trap when the
      // user only edits one of the two — backend recomputes the other
      // when we leave it omitted.
      const body: SalesOrderUpdatePayload = {
        contact_id: contactId || undefined,
        billing_address_id: billingAddressId || undefined,
        shipping_address_id: shippingAddressId || undefined,
        place_of_supply: placeOfSupply || null,
        terms_conditions: termsConditions || null,
        notes: notes || null,
        payment_terms: paymentTerms || null,
        warranty: warranty || null,
        delivery: delivery || null,
      }
      const hAmt = toNumberOrUndef(headerDiscountAmt)
      if (hAmt != null) body.discount_amount = hAmt
      // Always send the line upsert on edit — quote-driven SOs included. The
      // backend `update` accepts items[] on any Draft SO (Option B upsert:
      // id present → update, id absent → create), so new lines, full-field
      // edits, and BOM-child changes all travel in the PATCH the same way
      // they do for Direct. (CREATE-from-quote draws qty from the quote and
      // never reaches this branch.)
      {
        body.items = lines
          .filter((l) => toNumberOrUndef(l.qty))
          .map((l, idx) => {
            const base = buildItemPayload(l, idx)
            // New line → keep the create-shape children buildItemPayload
            // already attached. Existing line → re-attach its BOM as an
            // upsert array (child ids preserved) so the user's edits to the
            // saved BOM — changed variant, qty, added or removed child —
            // actually travel in the PATCH instead of being dropped.
            if (!l.serverId) return base
            const childUpserts = buildBomChildrenForUpsert(l)
            return {
              ...base,
              id: l.serverId,
              // Variant cleared on a saved line → send explicit null so the
              // PATCH actually drops it (omitting would keep the old variant);
              // the freeform item_name + category_id from buildItemPayload's
              // else-branch ride along. Catalog lines keep base.part_variant_id.
              ...(l.partVariantId ? {} : { part_variant_id: null }),
              // Same contract for Brand/OEM + Condition: `buildItemPayload`
              // omits them when unset, and the service dumps with
              // `exclude_unset=True` — so an omitted field KEEPS the stored
              // value. Without an explicit null, clearing either on a saved
              // freeform line would silently not stick.
              ...(l.oemId ? {} : { oem_id: null }),
              ...(l.condition ? {} : { condition: null }),
              // Always emit `children` — empty array when no child is selected.
              children: childUpserts,
            }
          })
      }
      try {
        await updateMut.mutateAsync(body)
        // Address the DETAIL page, never `navigate(-1)`. The pop was the odd
        // one out here — every other save path in this hook navigates to an
        // explicit SO url (the amend save at `/revise`, the create save, and
        // the wrong-status bounces above) — and it failed in three ways:
        //   - opened at /edit directly, there is no entry to pop, so save left
        //     the user sitting on the form;
        //   - the form is dirty right up until the mutation resolves, so
        //     `useUnsavedChangesGuard`'s sentinel is still on top of the form's
        //     OWN url and the pop consumed that instead of leaving;
        //   - when it did pop, it returned wherever the user came FROM (often
        //     the list), not to the record they just saved.
        // `replace` so Back from the detail page reaches the list rather than
        // re-entering a now-stale edit form.
        navigate(`/crm/sales-orders/${soId}`, { replace: true })
      } catch {
        /* hook fires toast */
      }
      return
    }

    // CREATE path — branch on sourceMode.
    let body: SalesOrderCreatePayload

    // A Rental order type makes the order a rental SALE — that is the flag
    // the rentals module keys everything off (configure row, device
    // provisioning, billing). The three dates ride along only in that
    // case; the backend schema refuses them on a plain sale.
    const isRentalOrder = orderType === 'Rental'
    const rentalFields = isRentalOrder
      ? {
          sellable_type: 'rental_sales' as const,
          rental_order_date: rentalOrderDate || undefined,
          rental_start_date: rentalStartDate || undefined,
          rental_end_date: rentalEndDate || undefined,
        }
      : { sellable_type: 'sales' as const }

    if (sourceMode === 'from-quote' && quote) {
      // ── Backend dispatch (services/sales_order_service.py:~371) ────
      // Only LEAD and DEAL branches deep-copy items from the quote via
      // `_copy_items_from_quote` (which respects quote_line_quantities
      // and decrements remaining_qty). The ACCOUNT branch treats the
      // sales_quote_id as a header-only link — items still come from
      // the payload `items[]` array. So we have to dispatch on
      // `quote.quotable_type` here:
      //
      //   lead / deal    → omit items[], send quote_line_quantities
      //   account        → send items[] (just like Direct mode), the
      //                    quote_line_quantities map is ignored
      const base: SalesOrderCreatePayload = {
        ...rentalFields,
        status: targetStatus,
        orderable_type: quote.quotable_type,
        orderable_id: quote.quotable_id,
        sales_quote_id: salesQuoteId,
        place_of_supply: placeOfSupply || undefined,
        terms_conditions: termsConditions || undefined,
        notes: notes || undefined,
        payment_terms: paymentTerms || undefined,
        warranty: warranty || undefined,
        delivery: delivery || undefined,
        // Single-select on the FE → one-element array on the wire. Omitted
        // entirely when nothing is picked (backend defaults it to []).
        order_type: orderType ? [orderType] : undefined,
        discount_amount: toNumberOrUndef(headerDiscountAmt),
      }

      if (quote.quotable_type === 'account') {
        // Header-only link: ship items[] like Direct mode. The form
        // already prefilled rate / category / etc. from the quote, so
        // the resulting SO mirrors the quote when the user doesn't
        // edit anything.
        base.items = lines
          .filter((l) => toNumberOrUndef(l.qty))
          .map((l, idx) => buildItemPayload(l, idx))
      } else {
        // Lead/Deal cascade: backend deep-copies from quote_items and
        // consumes remaining_qty. Map each line's edited qty by source
        // quote_item_id; lines absent from the map are skipped on this
        // SO (their qty stays available for a later draw).
        const qtyMap: Record<string, number> = {}
        for (const l of lines) {
          if (!l.quoteItemId) continue
          const n = toNumberOrUndef(l.qty)
          if (!n || n <= 0) continue
          qtyMap[l.quoteItemId] = n
        }
        base.quote_line_quantities = Object.keys(qtyMap).length > 0 ? qtyMap : null
      }

      if (isLeadCascade) {
        // Lead-cascade: backend cascades a new Account from the lead.
        // account_id is IGNORED in this branch — the cascade creates it.
        base.billing_address_data = trimAddressData(billingAddr)
        base.shipping_address_data = shippingSameAsBilling
          ? undefined
          : trimAddressData(shippingAddr)
      } else {
        // Quote-driven from account/deal — FE supplies contact + addresses.
        // Also send `account_id` whenever we can derive it on the FE: for
        // account-driven quotes it's `quote.quotable_id`; for deal-driven
        // it's the deal's `account_id`. The backend accepts these as
        // overrides for the defaults it would otherwise pull from the
        // quote/deal — sending them explicitly keeps the wire payload
        // self-describing.
        if (addressOwnerAccountId) base.account_id = addressOwnerAccountId
        if (contactId) base.contact_id = contactId
        if (billingAddressId) base.billing_address_id = billingAddressId
        if (shippingAddressId) base.shipping_address_id = shippingAddressId
      }
      body = base
    } else {
      // Direct path.
      body = {
        ...rentalFields,
        status: targetStatus,
        orderable_type: 'account',
        orderable_id: accountId,
        account_id: accountId,
        contact_id: contactId,
        billing_address_id: billingAddressId,
        shipping_address_id: shippingAddressId,
        place_of_supply: placeOfSupply || undefined,
        terms_conditions: termsConditions || undefined,
        notes: notes || undefined,
        payment_terms: paymentTerms || undefined,
        warranty: warranty || undefined,
        delivery: delivery || undefined,
        // Single-select on the FE → one-element array on the wire. Omitted
        // entirely when nothing is picked (backend defaults it to []).
        order_type: orderType ? [orderType] : undefined,
        discount_amount: toNumberOrUndef(headerDiscountAmt),
        items: lines
          .filter((l) => toNumberOrUndef(l.qty))
          .map((l, idx) => buildItemPayload(l, idx)),
      }
    }

    // Documents only travel on the lead-cascade branch. Filter out empty
    // slots so the multipart upload doesn't carry blank file parts.
    const docs: SalesOrderAccountDocuments | undefined = isLeadCascade
      ? Object.fromEntries(
          Object.entries(leadCascadeDocs).filter(([, f]) => f instanceof File),
        )
      : undefined

    try {
      const created = await createMut.mutateAsync({
        payload: body,
        documents: docs,
        // Staged files ride along as multipart parts, so they commit inside
        // the SO's own transaction — a file the backend rejects fails the
        // whole create rather than leaving a half-attached order.
        attachments: attachments.buildUploads(),
      })
      // No post-create PATCH needed: for quote-driven SOs the per-line
      // qty already travelled in `quote_line_quantities`, and rate /
      // discount / category are locked to the quote (not editable in
      // qtyOnly mode anyway).
      navigate(`/crm/sales-orders/${created.id}`, { replace: true })
    } catch {
      /* hook fires toast */
    }
  }

  const status: SOStatus = existing?.status ?? 'Draft'
  // Editable in place while Draft or Submitted — mirrors the SoDetailHeader
  // Edit-button gating. NOTE: the backend currently freezes everything but
  // Draft (SO_FROZEN_STATUSES), so saving a Submitted SO needs that freeze
  // widened to match (being updated separately) or the PATCH 400s with
  // SO_NOT_DRAFT_FROZEN.
  const readOnly = isEdit && status !== 'Draft' && status !== 'Submitted'
  // Customer FKs are locked once an SO is created — even in Draft. The
  // backend allows changing them per spec but the product decision is
  // that sales should only adjust qty post-create; identity stays put.
  // (`readOnly` already covers the post-Submitted case where everything
  // is frozen anyway.)
  const customerLocked = readOnly || isEdit

  return {
    oemConditionRequired,
    soId, isEdit, isAmend, amendReason, backHref, goBack, navigate,
    soQuery, existing,
    prefillGuard,
    closedWonSource,
    sourceMode, setSourceMode, handleSourceModeChange,
    salesQuoteId, setSalesQuoteId,
    accountId, handleAccountChange,
    contactId, setContactId,
    billingAddressId, setBillingAddressId,
    shippingAddressId, setShippingAddressId,
    placeOfSupply, setPlaceOfSupply,
    headerDiscountAmt, setHeaderDiscountAmt,
    orderType, setOrderType,
    rentalOrderDate, setRentalOrderDate,
    rentalStartDate, setRentalStartDate,
    rentalEndDate, setRentalEndDate,
    termsConditions, setTermsConditions,
    notes, setNotes,
    paymentTerms, setPaymentTerms,
    warranty, setWarranty,
    delivery, setDelivery,
    lines, setLines, updateLine, addLine, removeLine, clearAllLines, hasRealLines, applyPastedGroups,
    billingAddr, setBillingAddr,
    shippingAddr, setShippingAddr,
    shippingSameAsBilling, setShippingSameAsBilling,
    leadCascadeDocs, setLeadCascadeDoc,
    attachments,
    quote, quoteQuery, quotableType,
    isLeadCascade,
    dealQuery,
    addressOwnerAccountId,
    addressesQuery,
    billingAddresses, shippingAddresses,
    totals, calcQuery,
    errors, clearError,
    saving, isDirty,
    handleSave,
    status, readOnly, customerLocked,
  }
}

export type SalesOrderFormController = ReturnType<typeof useSalesOrderForm>
