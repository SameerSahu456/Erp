import { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useNavigateBack } from '@/hooks/use-navigate-back'
import { useUnsavedChangesGuard } from '@/hooks/use-unsaved-changes-guard'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'

import type { DemoConvertAdditionalItemPayload, DemoRequestWire, FetchQuotesParams, QuotableType, QuoteListItemWire, QuoteStatus, SalesOrderAccountDocuments, SalesOrderBomChildCreatePayload, SalesOrderCalculateLinePayload, SalesOrderCalculateRequest, SalesOrderCreatePayload, SalesOrderItemCreatePayload, SOLineCondition, SOOrderType } from '../../api'
import { ACCOUNT_GST_ERROR, ACCOUNT_GST_REGEX, ACCOUNT_GST_REQUIRED, ACCOUNT_PAN_ERROR, ACCOUNT_PAN_REGEX, type AccountDocumentType } from '../../constants/account-documents'
import { TAXES } from '../../constants/taxes'
import { COMPANY_SIZE_OPTIONS, type AccountTagWire, type AccountTypeWire } from '../../api'
import { type AsyncOption } from '@/components/ui/async-multi-select'
import { useCreateSalesOrder, useSalesOrderCalculate } from '../../hooks/sales-orders/useSalesOrders'
import { useSoAttachmentLines } from '../../hooks/sales-orders/useSoAttachmentLines'
import { CLOSE_WON_STRINGS } from '../../components/close-won/close-won.strings'
import { useLead } from '../../hooks/leads/useLeads'
import { useDeal } from '../../hooks/deals/useDeals'
import { useConvertDemoRequestToOrder, useDemoRequest } from '../../hooks/demo-requests/useDemoRequests'
import { DEMO_REQUESTS_STRINGS } from '../../components/demo-requests/demo-requests.strings'
import { useQuote, useQuotesInfinite } from '../../hooks/quotes/useQuotes'
import { useAccount, useAccountAddresses, useAccounts, useCreateAccountAddress, useUpdateAccountAddress } from '../../hooks/accounts/useAccounts'
import { useDebounce } from '@/shared/hooks'
import { ApiError } from '@/shared/api/envelope'
import { useVariantClassificationsByIds, useVariantsByIds } from '@modules/ims'

import type { AccountAddress, Lead, Deal, DemoRequest } from '../../types'
import { bomChildrenToCreatePayload, bomChildCategoryError, bomChildConditionError, bomChildOemError, bomChildDiscountError, discountCapError, createEmptyBomChild, type BomChildRow, type BuilderLineItem } from '../../components/line-items'
import { resolvePasteVariants, promoteComponentsOfNonBomParents, pastedConditionToCondition, variantKey } from '../../lib/paste-line-items'
import type { PastedLineGroup } from '../../lib/paste-line-items'
import { stripHtml } from '@/lib/utils'
import { usePermission } from '@shared/rbac'
import { crmCan } from '../../permissions'
import { type ClosedWonDemoFormState } from '../../components/demo-requests/ClosedWonDemoForm'

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// ── Line Item types ──

export type SOLineItemType = 'ims_part' | 'description'

export interface SOLineItem {
  id: string
  type: SOLineItemType
  // When `partId` is set the row is part-backed (rate is locked from the
  // variant's sell_price). Empty → ad-hoc row (rate editable, item_name
  // free-text). 2026-05-19 spec: SO items always wire as flat lines with
  // `sales_quote_item_id: null` — even when seeded from a selected quote.
  partId?: string
  partName?: string
  partSku?: string
  /** Parent IMS Part UUID — lets the VariantPicker filter sibling variants. */
  partImsId?: string
  brand?: string
  variantType?: string
  category?: string
  categoryId?: string
  /** Mirrors the picked variant's `category.is_bom_eligible`. */
  isBomEligible?: boolean
  // Per-line Brand/OEM (optional). FK to /ims/oems.
  oemId?: string
  // Per-line condition (optional) — the variant's own condition
  // (new / refurbished / new_pull), NOT the header order type.
  condition?: SOLineCondition
  bomId?: string
  bomName?: string
  item: string
  description: string
  qty: number
  rate: number
  /** Catalog list price of the picked variant (`VariantListItem.sell_price`).
   *  Client-only — not sent to the backend. Captured at part-pick time so the
   *  grid's "List Price" column shows the catalog price next to the actual
   *  (possibly discounted) `rate`. Unset for freeform rows and for lines
   *  hydrated from an existing source quote until the user re-picks. */
  listPrice?: number
  // Per-line discount in ₹; subtracted from qty*rate before tax. Defaults
  // to 0. Mirrors backend `discount_amount` on QuoteItem / SalesOrderItem.
  discount_amount: number
  /** Draft text shown while the discount input is being edited. */
  discountAmountInput?: string
  // GST per line, in percent (0-100). Matches the SO form's "Tax %"
  // column. Mirrors backend `tax_rate` on QuoteItem / SalesOrderItem.
  taxRate: number
  /** ID of the source quote when this line was seeded by the picker. Lets
   *  us strip the right rows when the user changes / clears the quote
   *  selection, instead of clobbering ad-hoc lines on every re-pick.
   *  Unset for ad-hoc rows the user typed directly. */
  sourceQuoteId?: string
  /** This line's OWN billing window, on a rental order. Undefined means
   *  "same as the order" — the line inherits the header window, which is
   *  what `_apply_rental_line_defaults` fills in server-side. Only an
   *  explicit pick writes these, so an override reads as a deliberate act
   *  rather than a stale copy, and moving the ORDER's window still moves
   *  every line that never opted out. */
  rentalStartDate?: string
  rentalEndDate?: string
  /** Draft text while qty/rate inputs are edited (shared LineItemRow). */
  qtyInput?: string
  rateInput?: string
  /** BOM children (free-form Add components) + expand state for the shared row. */
  bomChildren?: BomChildRow[]
  isBomExpanded?: boolean
  /** Parent-line configuration notes (free text). Forwarded into the SO
   *  row's `configuration_notes` on save. Prefilled from the source quote
   *  item or typed inline. */
  configurationNotes?: string
  /** Parent-line warranty (free text). Forwarded into the SO row's
   *  `warranty_level` on save. Prefilled from the source quote item. */
  warrantyLevel?: string
  /** Demo → SO conversion only: the originating demo-request ITEM id. Rows
   *  carrying this ride into `demo_request_item_ids` on the convert payload;
   *  rows without it (user-added) go as `additional_items`. */
  demoItemId?: string
}

// ── Adapters: SOLineItem ⇄ canonical BuilderLineItem (shared row) ──
export function soLineToBuilder(li: SOLineItem): BuilderLineItem {
  return {
    id: li.id,
    type: li.type,
    partId: li.partId,
    partSku: li.partSku,
    partName: li.partName ?? li.item,
    partImsId: li.partImsId,
    itemName: li.item,
    brand: li.brand,
    variantType: li.variantType,
    category: li.category,
    categoryId: li.categoryId,
    isBomEligible: li.isBomEligible,
    oemId: li.oemId,
    condition: li.condition,
    description: li.description,
    qty: li.qty,
    qtyInput: li.qtyInput,
    rate: li.rate,
    rateInput: li.rateInput,
    listPrice: li.listPrice,
    discountAmount: li.discount_amount,
    discountAmountInput: li.discountAmountInput,
    taxRate: li.taxRate,
    // The per-line rental window rides the SAME canonical field names the
    // quote builder and SO form use, so `LineBillingPeriod` works here
    // unchanged rather than needing a third wiring.
    rentalStartDate: li.rentalStartDate,
    rentalEndDate: li.rentalEndDate,
    warrantyLevel: li.warrantyLevel,
    bomChildren: li.bomChildren ?? [],
    isBomExpanded: li.isBomExpanded ?? false,
  }
}

export function builderPatchToSO(u: Partial<BuilderLineItem>): Partial<SOLineItem> {
  const o: Partial<SOLineItem> = {}
  if ('type' in u) o.type = (u.type ?? 'description') as SOLineItemType
  if ('partId' in u) o.partId = u.partId
  if ('partSku' in u) o.partSku = u.partSku
  if ('partName' in u) o.partName = u.partName
  if ('partImsId' in u) o.partImsId = u.partImsId
  if ('itemName' in u) o.item = u.itemName ?? ''
  if ('brand' in u) o.brand = u.brand
  if ('variantType' in u) o.variantType = u.variantType
  if ('category' in u) o.category = u.category
  if ('categoryId' in u) o.categoryId = u.categoryId
  if ('isBomEligible' in u) o.isBomEligible = u.isBomEligible
  if ('oemId' in u) o.oemId = u.oemId
  if ('condition' in u) o.condition = (u.condition || undefined) as SOLineCondition | undefined
  if ('description' in u) o.description = u.description ?? ''
  if ('qty' in u) o.qty = u.qty as number
  if ('qtyInput' in u) o.qtyInput = u.qtyInput
  if ('rate' in u) o.rate = u.rate as number
  if ('rateInput' in u) o.rateInput = u.rateInput
  if ('discountAmount' in u) o.discount_amount = u.discountAmount as number
  if ('discountAmountInput' in u) o.discountAmountInput = u.discountAmountInput
  if ('taxRate' in u) o.taxRate = u.taxRate as number
  // `'x' in u`, not a truthiness test: CLEARING a date sends
  // `undefined`, and that has to reach the line so it goes back to
  // inheriting the order's window. A truthy check would silently keep
  // the old override.
  if ('rentalStartDate' in u) o.rentalStartDate = u.rentalStartDate
  if ('rentalEndDate' in u) o.rentalEndDate = u.rentalEndDate
  if ('bomChildren' in u) o.bomChildren = u.bomChildren
  if ('isBomExpanded' in u) o.isBomExpanded = u.isBomExpanded
  if ('warrantyLevel' in u) o.warrantyLevel = u.warrantyLevel
  return o
}

// Bake the lead/deal scope into a `(search, opts?)` hook that matches the
// AsyncSelect contract. The status filter mirrors the Convert-to-SO gate in
// QuoteStatusActions / QuoteRowActions (2026-10-07): a quote must clear
// internal approval before it can produce an SO, so only Approved quotes are
// offered. History — pre-decoupling: ['Accepted', 'PartiallyFulfilled'];
// 2026-05-20: ['Draft', 'Sent', 'Accepted']; 2026-06-02: ['Draft',
// 'Submitted']; 2026-10-15: ['Approved']. Backend OR-filters when an array
// is sent. Keep in sync with AcceptedQuotePicker.DRAWABLE_QUOTE_STATUSES.
export const QUOTE_PICKER_STATUSES: QuoteStatus[] = ['Approved']

export function makeUseQuoteOptions(quotableType: QuotableType, quotableId: string) {
  return function useQuoteOptions(
    search: string,
    options?: { enabled?: boolean },
  ) {
    const params: Omit<FetchQuotesParams, 'page' | 'page_size'> = {
      search,
      quotable_type: quotableType,
      quotable_id: quotableId,
      status: QUOTE_PICKER_STATUSES,
    }
    return useQuotesInfinite(params, {
      enabled: (options?.enabled ?? true) && !!quotableId,
    })
  }
}

// Slot-style state for the 5 account docs the lead-cascade SO can carry.
// Keyed by backend doc type so the mutation invocation can pass it through
// verbatim. Missing keys (or undefined values) mean "no file picked" — that
// slot is omitted from the multipart upload.
export type AccountDocumentsSlots = Partial<Record<AccountDocumentType, File>>

export function genId() {
  return `soli-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

/** A fresh ad-hoc (freeform) row — no part, no category, 18% default tax.
 *  The shared LineItemsSection expects at least one row at all times (it
 *  hides "remove" on the last row and has no empty state), so the wizard
 *  always seeds / resets to one of these. A blank row is never saved. */
export function emptyAdhocLine(): SOLineItem {
  return {
    id: genId(),
    type: 'description',
    item: '',
    description: '',
    qty: 1,
    rate: 0,
    discount_amount: 0,
    taxRate: TAXES.DEFAULT_TAX_RATE,
  }
}

/** True when the row carries nothing the user typed or picked. */
export function isBlankLine(li: SOLineItem): boolean {
  return (
    !li.partId &&
    li.item.trim() === '' &&
    !(li.rate > 0) &&
    !li.categoryId &&
    stripHtml(li.description ?? '').length === 0 &&
    (li.bomChildren ?? []).length === 0
  )
}

export function fmtCurrency(n: number) {
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// Container logic for the Closed-Won wizard: resolves the source lead/deal/
// demo, owns every wizard step's form state, the live /calculate preview,
// duplicate detection, validation, and the SO/Demo create dispatch.
export function useClosedWonWizard() {
  const qc = useQueryClient()
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const entityType = (searchParams.get('type') as 'lead' | 'deal' | 'demo' | null) ?? 'deal'
  const isLead = entityType === 'lead'
  const isDemo = entityType === 'demo'

  // Resolve entity from the live API. Mock-array imports stay for parts/BOMs/
  // variants used by the SO step's line-item builder — those still need
  // hydration via real IMS hooks in a later pass.
  //
  // Each hook is `enabled` only for its own entity type so we don't waste a
  // request fetching a lead-id from the deals endpoint. While the active
  // query is in-flight, `entity` is undefined → the loading branch below
  // renders a skeleton instead of the "not found" page.
  const leadQuery = useLead(isLead && id ? id : '')
  const dealQuery = useDeal(entityType === 'deal' && id ? id : null, {
    enabled: entityType === 'deal' && !!id,
  })
  const demoQuery = useDemoRequest(isDemo && id ? id : null, { enabled: isDemo && !!id })

  const entityLoading =
    (isLead && leadQuery.isLoading) ||
    (entityType === 'deal' && dealQuery.isLoading) ||
    (isDemo && demoQuery.isLoading)

  // Adapter objects shaped like the legacy mock types so the rest of this
  // 1400-line component reads the same field names it always did. Only the
  // fields the wizard actually consumes are mapped — anything else stays
  // undefined.
  const lead: Lead | undefined = useMemo(() => {
    const w = leadQuery.data
    if (!isLead || !w) return undefined
    return {
      id: w.id,
      name: w.contact_name ?? w.company_name ?? w.lead_code,
      company: w.company_name ?? '',
      email: w.email ?? '',
      phone: w.phone ?? '',
      stage: w.stage,
      value: Number(w.lead_value ?? 0),
      source: w.source ?? '',
      owner: '',
      bde: '',
      priority: w.priority,
      lastContact: w.updated_at,
      createdAt: w.created_at,
      description: w.description ?? '',
      categories: [],
      addresses: [],
    } as Lead
  }, [isLead, leadQuery.data])

  const deal: Deal | undefined = useMemo(() => {
    const w = dealQuery.data
    if (entityType !== 'deal' || !w) return undefined
    // Wire `DealStage` and `DealPriority` enums don't perfectly intersect
    // with the mock `Deal` literal unions, so we cast through `unknown`.
    // The wizard only reads `name`/`accountId`/`accountName`/`value` from
    // this object; the stronger types are noise for that consumer.
    return {
      id: w.id,
      name: w.title,
      accountId: w.account_id,
      accountName: w.account?.name ?? '',
      stage: w.stage,
      value: Number(w.value ?? 0),
      probability: w.probability,
      closeDate: w.estimated_closure_date ?? '',
      owner: '',
      priority: w.priority,
      createdAt: w.created_at,
      addresses: [],
    } as unknown as Deal
  }, [entityType, dealQuery.data])

  // Demo source is consumed as the WIRE shape directly — no adapter, no
  // `as unknown as DemoRequest` cast. The wire response has no embedded
  // contact/account display fields; those resolve via follow-up queries.
  const demo: DemoRequestWire | undefined =
    isDemo && demoQuery.data ? demoQuery.data : undefined

  const entity = deal ?? lead ?? demo

  const entityName = deal?.name ?? lead?.name ?? demo?.demo_number ?? ''
  const entityValue = deal?.value ?? lead?.value ?? 0
  const entityCompany = lead?.company ?? ''

  // The deal-detail response only reliably ships `account_id` — its nested
  // `account` embed is optional and often null — so resolve the account
  // name with a dedicated fetch (mirrors DealDetailPage). Without this the
  // deal Closed Won flow renders the account as "N/A". The demo wire is the
  // same story (bare `account_id`), so the demo path shares this fetch.
  const sourceAccountId =
    entityType === 'deal' ? dealQuery.data?.account_id : demo?.account_id
  const dealAccountQuery = useAccount(sourceAccountId, {
    enabled: (entityType === 'deal' || isDemo) && !!sourceAccountId,
  })
  const existingAccountName =
    deal?.accountName ||
    dealAccountQuery.data?.name ||
    ''
  const existingAccountId = deal?.accountId ?? demo?.account_id

  // Guard: a deal can't be moved to Closed Won if its account has been deleted.
  // A soft-deleted account 404s on GET /accounts/{id}; when that happens, bounce
  // back to the deal with a toast instead of running the wizard against a
  // missing account. Covers every entry point (detail stage-change, kanban
  // drag, edit-form save) and the race where the account is deleted after the
  // page loaded. `useRef` so the toast/redirect fires exactly once.
  const accountDeletedHandledRef = useRef(false)
  useEffect(() => {
    if (entityType !== 'deal' || accountDeletedHandledRef.current) return
    if (!dealQuery.data?.account_id) return
    const err = dealAccountQuery.error
    if (
      dealAccountQuery.isError &&
      err instanceof ApiError &&
      err.statusCode === 404
    ) {
      accountDeletedHandledRef.current = true
      toast.error(CLOSE_WON_STRINGS.toast.accountDeleted)
      // Deal branch only → return to the deal detail page.
      navigate(`/crm/deals/${id}`, { replace: true })
    }
  }, [
    entityType,
    id,
    dealQuery.data?.account_id,
    dealAccountQuery.isError,
    dealAccountQuery.error,
    navigate,
  ])

  const backPath = isLead
    ? `/crm/leads/${id}`
    : isDemo
      ? `/crm/demo-requests/${id}`
      : `/crm/deals/${id}`
  const goBack = useNavigateBack(backPath)
  // List/index path of the source entity, handed to the SO/DR view via
  // router state so its back button returns to that list (Closed Won →
  // create → SO/DR view → Back → leads / deals / demo-requests list).
  const listPath = isLead
    ? '/crm/leads'
    : isDemo
      ? '/crm/demo-requests'
      : '/crm/deals'

  const [currentStep, setCurrentStep] = useState(1)

  // ── SO vs Demo Request artifact choice (lead/deal closed-won only) ──
  // The Sales Order step lets the user create either a Sales Order (the
  // default flow below) or a Demo Request (`ClosedWonDemoForm`). The demo
  // option is gated behind CRM demo-request write permission and is never
  // offered on the demo→SO conversion path (`isDemo`).
  const { can } = usePermission()
  const canCreateDemo = can([...crmCan.writeDr])
  const showDemoToggle = !isDemo && canCreateDemo
  const [soOrDemo, setSoOrDemo] = useState<'so' | 'demo'>('so')
  const [demoFormState, setDemoFormState] = useState<ClosedWonDemoFormState>({
    isValid: false,
    isPending: false,
    isDirty: false,
    summary: '',
  })

  // 2026-05-19: Quote is OPTIONAL. Sales may seed line items by picking a
  // non-Rejected quote (any of Draft/Sent/Accepted — see 2026-05-20
  // decoupling), or skip the picker entirely and build line items directly.
  // The selected quote_id still flows to the backend via `sales_quote_id`
  // so the SO links back to its source, but items are always sent as flat
  // lines (`sales_quote_item_id: null`).
  const [selectedQuote, setSelectedQuote] = useState<QuoteListItemWire | null>(null)

  // Memoised hook factory for the quote dropdown. The dropdown's
  // useOptions hook needs to be stable per-render so AsyncSelect's
  // internal query keys don't churn.
  const quoteOptionsHook = useMemo(
    () => makeUseQuoteOptions(isLead ? 'lead' : 'deal', id ?? ''),
    [isLead, id],
  )

  // Deep-link entry from the quote detail / list "Convert to SO" actions.
  // When `?quoteId=<id>` is present, we fetch the quote and pre-select it
  // so sales lands directly on the SO step with the quote already chosen.
  const prefillQuoteId = searchParams.get('quoteId')
  const prefillQuoteQuery = useQuote(prefillQuoteId ?? '', {
    enabled: !!prefillQuoteId,
  })

  // Account form state (leads only)
  // Account names are stored in UPPERCASE — keep the field uppercase from
  // the initial prefill through every edit and the final save.
  const [accountName, setAccountName] = useState(entityCompany.toUpperCase())
  const [industry, setIndustry] = useState('')
  // Typed as `AccountTypeWire` so the Select round-trips to the API Literal
  // without a runtime cast at POST time. Empty string means "not yet picked"
  // and is rejected by the form-valid check below.
  const [accountType, setAccountType] = useState<AccountTypeWire | ''>('')
  const [companySize, setCompanySize] = useState('')
  const [employees, setEmployees] = useState<number | ''>('')
  // Required on AccountCreate / AccountInlineData. Account status is not
  // user-editable in the wizard — every closed-won account is created
  // "Active" (hardcoded into the payload below). Tag stays "Cold" because
  // the wizard is the conversion path for previously-cold leads.
  const [tag, setTag] = useState<AccountTagWire>('Cold')
  // Optional informational fields on AccountInlineData. `revenue` is held
  // as a free-text string for input ergonomics; coerced to Decimal at POST
  // time (same pattern as AccountFormPage).
  const [website, setWebsite] = useState('')
  const [revenue, setRevenue] = useState('')
  // Free-form sales-side tags ⇒ stored on the account as `list[str]`.
  // The IMS picker hands back `{id, label}` rows; on POST we collapse to
  // the label string so the wire shape matches `categories_interested` /
  // `categories_bought` on AccountInlineData.
  const [categoriesInterested, setCategoriesInterested] = useState<AsyncOption[]>([])
  const [categoriesBought, setCategoriesBought] = useState<AsyncOption[]>([])

  // Contact details — lead path prefills these from the lead query below.
  // The demo wire carries only `contact_id` (no inline contact fields), and
  // the demo → SO conversion has no contact step, so the demo path leaves
  // them empty.
  const initialContactFirst = ''
  const initialContactLast = ''
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [designation, setDesignation] = useState('')
  const [department, setDepartment] = useState('')

  // Document uploads
  // Account-document slots — one File (or undefined) per backend doc type.
  // Wired into the SO create multipart on the lead branch only. The UI renders
  // one shared <DocumentUploadField> per slot (it owns the file input + MIME/
  // size validation), so we only keep the slot map here.
  const [documents, setDocuments] = useState<AccountDocumentsSlots>({})
  // Tax / compliance identifiers — both optional, both regex-validated.
  const [panNumber, setPanNumber] = useState('')
  const [gstNumber, setGstNumber] = useState('')

  // Sales Order form state. Starts with one blank ad-hoc row so the grid
  // renders a fillable line immediately (it has no empty state — same as
  // the Quote and Sales Order forms). A blank row is never validated or
  // saved. The demo path replaces it with the demo's wire items via the
  // ref-guarded effect below (the demo query resolves after first render,
  // so a useState initializer can't do it); a picked quote drops it.
  const [lineItems, setLineItems] = useState<SOLineItem[]>(() => [emptyAdhocLine()])
  // ── Auto-fill Brand/OEM + Condition from the selected part ──────────
  // Quote items DO carry oem_id / condition on the wire and the mapper
  // below forwards them. Demo items don't, and legacy quote lines saved
  // before those columns were populated won't either. For a part-backed
  // line still missing an OEM, resolve it from the part-number API and
  // back-fill, exactly like the SO form.
  //
  // Targets ONLY part-backed lines missing an OEM: direct-pick lines already
  // carry both (set together in one `partPatch`), so they're skipped and never
  // clobbered.
  const linesNeedingClassification = useMemo(() => {
    const ids = new Set<string>()
    for (const l of lineItems) {
      if (l.partId && !l.oemId) ids.add(l.partId)
      // BOM children carry a part (partId) but seed from the quote without
      // oem/condition too — resolve theirs in the same pass.
      for (const c of l.bomChildren ?? []) {
        if (c.partId && !c.oemId) ids.add(c.partId)
      }
    }
    return Array.from(ids)
  }, [lineItems])
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
    setLineItems((prev) => {
      let changed = false
      const next = prev.map((l) => {
        let line = l
        // Echo the variant's own OEM + condition verbatim — the SO service
        // compares them to the variant on save and 400s on any disagreement.
        const lc = l.partId && !l.oemId ? classifications[l.partId] : undefined
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

  // Prefilled from the demo wire by the seeding effect below (demo path).
  const [notes, setNotes] = useState('')
  // Retained for backward compat: T&C is no longer shown in the UI but is
  // still seeded from the picked quote and round-tripped onto the SO so the
  // legal text carries forward. The three dedicated commercial-terms fields
  // below replace it in the UI.
  const [terms, setTerms] = useState('')
  const [paymentTerms, setPaymentTerms] = useState('')
  const [warranty, setWarranty] = useState('')
  const [delivery, setDelivery] = useState('')
  // Order classification carried onto the SO header. Mirrors
  // SalesOrderFormPage's Order Details select; sent as a one-element
  // `order_type` array on the create payload.
  const [orderType, setOrderType] = useState<SOOrderType | ''>('')
  // The rental window, as TWO independent fields. Not a range picker: the
  // two ends are picked months apart in practice (a tenure starts next
  // week and runs a year), and one dual-calendar control makes the far
  // end a scrolling exercise.
  //
  // `''` means not picked. Both are required before an order can be a
  // rental one — see `rentalWindowReady`.
  const [rentalStartDate, setRentalStartDate] = useState<string>('')
  const [rentalEndDate, setRentalEndDate] = useState<string>('')
  // The day the customer ordered. Required on a rental order by the
  // backend (`SalesOrderCreate._check_rental_dates`), as on the SO form;
  // a quote carries no order date, so it is always picked here.
  const [rentalOrderDate, setRentalOrderDate] = useState<string>('')
  // The missing-date messages show only after a submit attempt — on an
  // untouched form they read as errors the operator has not made yet.
  const [rentalSubmitTried, setRentalSubmitTried] = useState(false)

  // Addresses — aggregate from lead/deal/account + locally added
  const [localAddresses, setLocalAddresses] = useState<AccountAddress[]>([])
  const [addAddressOpen, setAddAddressOpen] = useState(false)
  const [addAddressType, setAddAddressType] = useState<'Billing' | 'Shipping'>('Billing')
  // Set when the user clicks Edit on an address card. Reused as `initialValues`
  // on the AddAddressDialog; null = create flow. `editingSource` records whether
  // the edited row is account-owned ('Account' → PATCH the account address) or a
  // locally-staged 'New' row (lead branch → local replace).
  const [editingAddress, setEditingAddress] = useState<AccountAddress | null>(null)
  const [editingSource, setEditingSource] = useState<'Account' | 'New' | null>(
    null,
  )

  // Load addresses from the live account when one exists (deal path has
  // `deal.account_id`; lead path will get `existingAccountId` populated
  // after Step 1's create-account mutation lands in a follow-up turn).
  // Wire shape (`address_type`, `is_default`) → legacy mock shape
  // (`type`, `isDefault`) so the existing rendering code keeps working.
  const accountAddressesQuery = useAccountAddresses(existingAccountId ?? '')
  const accountAddressesFromApi: AccountAddress[] = useMemo(() => {
    const rows = accountAddressesQuery.data ?? []
    return rows.map((a) => ({
      id: a.id,
      label: a.label ?? a.address_type,
      type: a.address_type,
      line1: a.line1,
      line2: a.line2 ?? '',
      city: a.city,
      state: a.state,
      pincode: a.pincode,
      isDefault: a.is_default,
    }))
  }, [accountAddressesQuery.data])

  type TaggedAddress = AccountAddress & { source: string }
  const allAddresses: TaggedAddress[] = (() => {
    const result: TaggedAddress[] = []
    for (const a of accountAddressesFromApi) result.push({ ...a, source: 'Account' })
    for (const a of localAddresses) if (!result.some((r) => r.id === a.id)) result.push({ ...a, source: 'New' })
    return result
  })()

  // 'Both' addresses serve as billing AND shipping, so they appear in both pools.
  const billingAddressPool = allAddresses.filter(
    (a) => a.type === 'Billing' || a.type === 'Both',
  )
  const shippingAddressPool = allAddresses.filter(
    (a) => a.type === 'Shipping' || a.type === 'Both',
  )

  // Single-select per section — the SO API takes exactly one
  // `billing_address_id` and one `shipping_address_id`. Seed with the
  // account's default address of each type so the radio is pre-checked
  // when the user lands on the SO step. Defaults recompute reactively
  // when the address pool finishes loading via the effect below.
  const [selectedBillingId, setSelectedBillingId] = useState<string | null>(
    () => billingAddressPool.find((a) => a.isDefault)?.id ?? null,
  )
  const [selectedShippingId, setSelectedShippingId] = useState<string | null>(
    () => shippingAddressPool.find((a) => a.isDefault)?.id ?? null,
  )
  // Once the account addresses query resolves (deal path), preselect the
  // server-marked defaults if nothing is selected yet. Doesn't override
  // a manual pick.
  useEffect(() => {
    if (selectedBillingId == null) {
      const def = billingAddressPool.find((a) => a.isDefault)
      if (def) setSelectedBillingId(def.id)
    }
    if (selectedShippingId == null) {
      const def = shippingAddressPool.find((a) => a.isDefault)
      if (def) setSelectedShippingId(def.id)
    }
  }, [billingAddressPool, shippingAddressPool, selectedBillingId, selectedShippingId])

  // ── Unsaved-changes guard ──────────────────────────────────────
  // Capture the initial `lineItems` shape once: demo source pre-fills items
  // from the demo's line items; lead/deal paths start with one blank row. Subsequent
  // edits (add/remove/qty/rate) make `lineItems` dirty relative to baseline.
  const initialLineItemsJsonRef = useRef<string | null>(null)
  if (initialLineItemsJsonRef.current === null) {
    initialLineItemsJsonRef.current = JSON.stringify(lineItems)
  }
  const lineItemsJson = JSON.stringify(lineItems)

  // Gate the guard until the entity/quote prefill has actually been APPLIED to
  // local state. Without this, the render where `leadQuery.data` arrives runs
  // the dirty check with the loaded baseline (e.g. `leadCompany`) while local
  // fields (`accountName`, …) are still empty — a one-render `isDirty=true`
  // transient that pushes the guard's history sentinel and pops the discard
  // dialog the instant you land here (e.g. via Convert-to-SO). Flipped true by
  // an effect below that runs AFTER the prefill effects in the same commit.
  const [hydrated, setHydrated] = useState(false)

  // "Has anything been filled?" — each field is compared against its prefill
  // source so a freshly loaded page doesn't trip the prompt before the user
  // has touched anything. Lead path prefills from `leadQuery.data`; demo path
  // prefills contact/notes/items from the demo entity; deal path is empty.
  const isDirty = useMemo(() => {
    // Never dirty until prefill has landed — see `hydrated` above.
    if (!hydrated) return false
    const norm = (s: string) => s.trim()
    const leadW = leadQuery.data
    // Order Type is prefilled from the lead/deal's single `tags` value;
    // compare against that baseline so an untouched prefill isn't dirty.
    const entityOrderType =
      leadW?.tags?.[0] ?? dealQuery.data?.tags?.[0] ?? ''
    const leadCompany = leadW?.company_name ?? entityCompany ?? ''
    const leadSize = leadW?.company_size ?? ''
    // Type prefill: `setAccountType(w.channel_type)` lands on hydrate, so
    // compare against the lead's channel rather than `""` — otherwise a
    // freshly loaded page reads as dirty before the user touches anything.
    const leadAccountType: AccountTypeWire | '' = leadW?.channel_type ?? ''
    const leadEmployees: number | '' =
      typeof leadW?.employees === 'number' ? leadW.employees : ''
    const leadFirst =
      leadW?.contact_name?.split(/\s+/)[0] ?? initialContactFirst ?? ''
    const leadLast =
      leadW?.contact_name?.split(/\s+/).slice(1).join(' ') ??
      initialContactLast ??
      ''
    const leadEmail = leadW?.email ?? ''
    const leadPhone = leadW?.phone ?? ''
    const leadWebsite = leadW?.website ?? ''
    // Categories Interested prefill: same story — the chip picker is seeded
    // from the lead's categories, so the baseline is that id-set, not an
    // empty list. Compare by id so re-ordering inside the chip picker
    // doesn't falsely flag the field as dirty.
    const leadCategoryIds = new Set(
      (leadW?.categories ?? []).map((c) => c.id),
    )
    const currentCategoryIds = new Set(
      categoriesInterested.map((o) => String(o.id)),
    )
    const categoriesInterestedChanged =
      currentCategoryIds.size !== leadCategoryIds.size ||
      [...currentCategoryIds].some((id) => !leadCategoryIds.has(id))
    const demoNotes = demo?.notes ?? ''

    const docCount = Object.values(documents).filter(Boolean).length
    // URL-prefilled quote (`?quoteId=<id>`) is the initial baseline, not a
    // user edit — otherwise the page lands dirty and even an immediate
    // browser-back triggers the discard popup. Treat it as "not dirty"
    // while the current selection still equals the prefill; if the user
    // clicks Change and picks a different quote, that's a real edit.
    const quoteSelectionChanged =
      selectedQuote !== null &&
      (prefillQuoteId == null || selectedQuote.id !== prefillQuoteId)
    return (
      quoteSelectionChanged ||
      docCount > 0 ||
      norm(panNumber) !== '' ||
      norm(gstNumber) !== '' ||
      localAddresses.length > 0 ||
      // accountName is force-uppercased on entry; compare against the
      // uppercased baseline so an untouched prefill isn't flagged dirty
      // (norm() only trims — it is case-sensitive).
      norm(accountName) !== norm(leadCompany.toUpperCase()) ||
      industry !== '' ||
      accountType !== leadAccountType ||
      // Tag select defaults to 'Cold' on mount (no prefill source); anything
      // else means the user changed it.
      tag !== 'Cold' ||
      companySize !== leadSize ||
      employees !== leadEmployees ||
      norm(website) !== norm(leadWebsite) ||
      norm(revenue) !== '' ||
      categoriesInterestedChanged ||
      categoriesBought.length > 0 ||
      norm(firstName) !== norm(leadFirst) ||
      norm(lastName) !== norm(leadLast) ||
      norm(contactEmail) !== norm(leadEmail) ||
      norm(contactPhone) !== norm(leadPhone) ||
      norm(designation) !== '' ||
      norm(department) !== '' ||
      norm(notes) !== norm(demoNotes) ||
      norm(terms) !== '' ||
      norm(paymentTerms) !== '' ||
      norm(warranty) !== '' ||
      norm(delivery) !== '' ||
      orderType !== entityOrderType ||
      lineItemsJson !== initialLineItemsJsonRef.current ||
      (soOrDemo === 'demo' && demoFormState.isDirty)
    )
  }, [
    selectedQuote,
    prefillQuoteId,
    documents,
    panNumber,
    gstNumber,
    localAddresses.length,
    accountName,
    entityCompany,
    leadQuery.data,
    dealQuery.data,
    industry,
    accountType,
    tag,
    companySize,
    employees,
    website,
    revenue,
    categoriesInterested,
    categoriesBought.length,
    firstName,
    lastName,
    initialContactFirst,
    initialContactLast,
    contactEmail,
    contactPhone,
    designation,
    department,
    notes,
    terms,
    paymentTerms,
    warranty,
    delivery,
    orderType,
    demo,
    lineItemsJson,
    soOrDemo,
    demoFormState.isDirty,
    hydrated,
  ])

  const unsavedGuard = useUnsavedChangesGuard({ isDirty })
  const guardedBack = () => unsavedGuard.attempt(goBack)

  // ── Add-Address dispatch ────────────────────────────────────────
  // Lead branch (no `existingAccountId`): no account exists yet. The
  // address stays in `localAddresses` and gets sent inline as
  // `billing_address_data` / `shipping_address_data` on the cascade POST.
  // Deal branch (has `existingAccountId`): hit
  // `POST /accounts/{id}/addresses` so the address actually lives on the
  // account row, then auto-select the returned id into the matching slot.
  const createAddressMut = useCreateAccountAddress(existingAccountId ?? '')
  const updateAddressMut = useUpdateAccountAddress(existingAccountId ?? '')

  // Edit dispatch: an account-owned row PATCHes the saved account address; a
  // locally-staged ('New') row or a brand-new entry falls through to
  // `handleAddressAdd` (create / local-replace). Branch on `editingSource`
  // because `editingAddress` itself doesn't carry the tag.
  function handleAddressSave(addr: AccountAddress) {
    if (editingSource === 'Account' && existingAccountId && editingAddress) {
      const isBoth = addr.type === 'Both'
      updateAddressMut.mutate(
        {
          addressId: editingAddress.id,
          body: {
            address_type: addr.type,
            label: addr.label?.trim() || null,
            line1: addr.line1,
            line2: addr.line2 || null,
            city: addr.city,
            state: addr.state,
            pincode: addr.pincode,
            gstin: addr.gstin || null,
            is_default: !!addr.isDefault,
          },
        },
        {
          onSuccess: (updated) => {
            // Keep the edited row selected in whichever slot(s) it serves.
            if (isBoth || addr.type === 'Billing') setSelectedBillingId(updated.id)
            if (isBoth || addr.type === 'Shipping') setSelectedShippingId(updated.id)
          },
        },
      )
      return
    }
    handleAddressAdd(addr)
  }

  function handleAddressAdd(addr: AccountAddress) {
    // 'Both' counts as billing AND shipping — select it into both slots.
    const isBoth = addr.type === 'Both'
    const isBilling = isBoth || addr.type === 'Billing'
    const isShipping = isBoth || addr.type === 'Shipping'

    if (existingAccountId) {
      createAddressMut.mutate(
        {
          address_type: addr.type,
          label: addr.label?.trim() || null,
          line1: addr.line1,
          line2: addr.line2 || null,
          city: addr.city,
          state: addr.state,
          pincode: addr.pincode,
          gstin: addr.gstin || null,
          is_default: !!addr.isDefault,
        },
        {
          onSuccess: (created) => {
            if (isBilling) setSelectedBillingId(created.id)
            if (isShipping) setSelectedShippingId(created.id)
          },
        },
      )
      return
    }
    // Lead branch — no account exists yet. SO cascade accepts exactly one
    // `billing_address_data` and one `shipping_address_data`, so the local
    // pool is single-slot per role: a new entry REPLACES any existing one
    // serving the same role(s) (a 'Both' clears prior billing+shipping).
    setLocalAddresses((prev) =>
      [
        ...prev.filter((p) => {
          const pBilling = p.type === 'Billing' || p.type === 'Both'
          const pShipping = p.type === 'Shipping' || p.type === 'Both'
          // Drop a prior entry only if it serves a role this new one takes over.
          return !((isBilling && pBilling) || (isShipping && pShipping))
        }),
        addr,
      ],
    )
    if (isBilling) setSelectedBillingId(addr.id)
    if (isShipping) setSelectedShippingId(addr.id)
  }

  // ── Prefill from lead ────────────────────────────────────────────
  // When the lead query resolves, push its data into the account fields.
  // Guarded by a ref so the user can edit the prefilled values without
  // the effect overwriting them when React re-runs (e.g. dev StrictMode
  // double-invoke or background refetch).
  const leadPrefilledRef = useRef(false)
  useEffect(() => {
    if (leadPrefilledRef.current) return
    const w = leadQuery.data
    if (!isLead || !w) return
    leadPrefilledRef.current = true
    if (w.company_name) setAccountName(w.company_name.toUpperCase())
    if (w.company_size) setCompanySize(w.company_size)
    if (typeof w.employees === 'number') setEmployees(w.employees)
    if (w.website) setWebsite(w.website)
    // Carry the lead's channel through to the account's type — the two
    // enums are identical (CustomerType ≡ AccountTypeWire). The Type
    // select is locked when this prefill fires (see `disabled=` below)
    // so the account inherits the lead's channel without manual reentry.
    if (w.channel_type) setAccountType(w.channel_type)
    // Seed Categories Interested from the lead's selected categories.
    // A closed-won conversion implies the customer is interested in
    // exactly those categories at the very least — sales can still
    // edit/add before submitting. Categories are stored on the
    // account as label strings (see _list[str] in AccountInlineData),
    // so we hand the chip-picker the resolved {id, name} refs.
    if (w.categories?.length) {
      setCategoriesInterested(
        w.categories.map((c) => ({ id: c.id, label: c.name })),
      )
    }
    // Split contact_name on first whitespace into first/last.
    if (w.contact_name) {
      const [first, ...rest] = w.contact_name.split(/\s+/)
      setFirstName(first ?? '')
      setLastName(rest.join(' '))
    }
    if (w.email) setContactEmail(w.email)
    if (w.phone) setContactPhone(w.phone)
  }, [isLead, leadQuery.data])

  // ── Prefill from demo (demo → SO conversion) ─────────────────────
  // Seed the line-item builder from the demo's wire items once the demo
  // query resolves. Only PM-APPROVED items are seeded — those are the rows
  // the convert endpoint accepts in `demo_request_item_ids`. Rate/qty come
  // from the approved demo line; the seeded rows are the baseline, so the
  // unsaved-changes snapshot is re-taken. Ref-guarded like the lead prefill.
  const demoPrefilledRef = useRef(false)
  useEffect(() => {
    if (demoPrefilledRef.current) return
    const w = demoQuery.data
    if (!isDemo || !w) return
    demoPrefilledRef.current = true
    // eslint-disable-next-line react-hooks/set-state-in-effect -- ref-guarded one-shot prefill on query resolve; same pattern as the lead prefill above
    setNotes((cur) => cur || (w.notes ?? ''))
    const seeded: SOLineItem[] = w.items
      .filter((item) => item.pm_status === 'Approved')
      .map((item) => ({
        id: genId(),
        type: 'ims_part' as const,
        partId: item.variant_id,
        demoItemId: item.id,
        categoryId: item.category_id ?? undefined,
        item: '',
        description: '',
        qty: item.qty,
        rate: Number(item.unit_price) || 0,
        // Demo items carry no per-line discount/tax — 0 / 18% default.
        discount_amount: 0,
        taxRate: TAXES.DEFAULT_TAX_RATE,
      }))
    if (seeded.length === 0) return
    setLineItems(seeded)
    initialLineItemsJsonRef.current = JSON.stringify(seeded)
  }, [isDemo, demoQuery.data])

  // Resolve display names for demo-seeded rows: the demo wire item carries
  // only `variant_id`, so fetch the variant details (shared IMS cache) and
  // back-fill name/sku once. Applies only to part-backed rows still missing
  // a name, so user edits are never clobbered.
  const namelessVariantIds = useMemo(() => {
    if (!isDemo) return []
    const ids = new Set<string>()
    for (const l of lineItems) {
      if (l.partId && !l.partName) ids.add(l.partId)
    }
    return Array.from(ids)
  }, [isDemo, lineItems])
  const namelessVariantQueries = useVariantsByIds(namelessVariantIds)
  const variantNameSig = namelessVariantQueries
    .map((q) => (q.data ? `${q.data.id}:${q.data.name}` : ''))
    .join('|')
  useEffect(() => {
    if (!isDemo || namelessVariantIds.length === 0) return
    const byId = new Map(
      namelessVariantQueries
        .filter((q) => !!q.data)
        .map((q) => [q.data!.id, q.data!]),
    )
    if (byId.size === 0) return
    setLineItems((prev) => {
      let changed = false
      const next = prev.map((l) => {
        if (!l.partId || l.partName) return l
        const variant = byId.get(l.partId)
        if (!variant) return l
        changed = true
        return {
          ...l,
          partName: variant.name,
          partSku: variant.sku_code ?? undefined,
          item: l.item || variant.name,
        }
      })
      if (changed && initialLineItemsJsonRef.current !== null) {
        // Name back-fill is hydration, not a user edit — refresh the
        // unsaved-changes baseline alongside.
        initialLineItemsJsonRef.current = JSON.stringify(next)
      }
      return changed ? next : prev
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDemo, variantNameSig])

  // Arm the guard only once the source entity has settled. Defined AFTER the
  // prefill effect above so, in the commit where the entity data lands, the
  // prefill runs first (filling local fields) and this flips `hydrated` second
  // — both batched, so no render ever observes the empty-vs-loaded transient.
  const hydratedRef = useRef(false)
  useEffect(() => {
    if (hydratedRef.current) return
    const leadSettled = isLead ? !!leadQuery.data || leadQuery.isError : true
    const dealSettled =
      entityType === 'deal' ? !!dealQuery.data || dealQuery.isError : true
    // Demo path: don't arm the guard until the demo prefill (notes + seeded
    // line items) has landed, same reasoning as the lead/deal gates.
    const demoSettled = isDemo ? !!demoQuery.data || demoQuery.isError : true
    if (!leadSettled || !dealSettled || !demoSettled) return
    hydratedRef.current = true
    setHydrated(true)
  }, [
    isLead,
    isDemo,
    entityType,
    leadQuery.data,
    leadQuery.isError,
    dealQuery.data,
    dealQuery.isError,
    demoQuery.data,
    demoQuery.isError,
  ])

  // ── Prefill Order Type from the lead/deal ────────────────────────
  // A closed-won SO inherits the source entity's order classification.
  // The lead/deal `tags` array holds a single value (single-select); seed
  // the SO Order Type select with it. Ref-guarded so a background refetch
  // doesn't clobber a user edit — the value stays editable.
  const orderTypePrefilledRef = useRef(false)
  useEffect(() => {
    if (orderTypePrefilledRef.current) return
    const tag = leadQuery.data?.tags?.[0] ?? dealQuery.data?.tags?.[0]
    if (!tag) return
    orderTypePrefilledRef.current = true
    setOrderType(tag as SOOrderType)
  }, [leadQuery.data, dealQuery.data])

  // ── Quote → line items auto-populate ─────────────────────────────
  // Fetch the full quote (with embedded items) when the picker stores a
  // selection. The slim list shape doesn't carry items, so we fetch the
  // detail here and project each item into the wizard's SOLineItem shape.
  const fullQuoteQuery = useQuote(selectedQuote?.id ?? '', {
    enabled: !!selectedQuote?.id,
  })
  // ── Rental detection ─────────────────────────────────────────────
  // What makes an order a RENTAL is `sellable_type = 'rental_sales'`, NOT
  // the Order Type tag. Order Type is a classification label that drives
  // nothing in the rentals module — `rental_agreements` is keyed off
  // sellable_type alone (see its model docstring).
  //
  // The evidence is the QUOTE's lines. The backend promotes the header
  // itself when a linked quote has rental lines
  // (`_quote_has_rental_lines`), but this wizard also sends `items[]`, and
  // `items[]` WINS over the quote deep-copy (`if items_payload:` in
  // `SalesOrderService.create`). So the promoted header arrived with lines
  // carrying no rental fields at all: a rental_sales order whose every
  // line was `is_rental = false`. The agreement was seeded, it had nothing
  // to bill, and nothing on screen said so.
  //
  // Sending the WINDOW is what fixes it. `_apply_rental_line_defaults`
  // fills is_rental + period + both dates down onto every line that does
  // not state its own, and an UNSET is_rental defaults to true on a rental
  // order — which is exactly what this wizard's stripped rows are.
  const quoteRental = useMemo(() => {
    const items = fullQuoteQuery.data?.items ?? []
    const rentalLines = items.filter((it) => it.is_rental)
    if (rentalLines.length === 0) return null
    // Widest span, so no line falls outside the order it belongs to —
    // the same rule the standalone SO form applies when it seeds the
    // order window from a rental quote.
    const starts = rentalLines
      .map((it) => it.rental_start_date)
      .filter(Boolean) as string[]
    const ends = rentalLines
      .map((it) => it.rental_end_date)
      .filter(Boolean) as string[]
    // A rental quote line always carries both dates — the
    // `ck_quote_items_is_rental_dates_match` CHECK refuses one without
    // them — so an empty list here is a shape we do not understand.
    // Treated as "not a rental" rather than guessed at: a header window
    // we invented would be stamped onto every line of the order.
    if (starts.length === 0 || ends.length === 0) return null
    return {
      rentalLineCount: rentalLines.length,
      totalLineCount: items.length,
      startDate: starts.reduce((a, b) => (a < b ? a : b)),
      endDate: ends.reduce((a, b) => (a > b ? a : b)),
    }
  }, [fullQuoteQuery.data])

  // The window actually in force: the operator's pick when they made one,
  // otherwise the rental quote's own span.
  //
  // DERIVED, not seeded through an effect. Copying the quote's dates into
  // state on load would need a ref guard to stop a refetch clobbering a
  // typed date, and it would add a sixth `setState`-in-effect to a file
  // the linter already flags five times. Deriving has neither problem:
  // an explicit pick wins because it is checked first, and clearing a
  // field falls back to the quote rather than to nothing.
  const effectiveRentalStart = rentalStartDate || quoteRental?.startDate || ''
  const effectiveRentalEnd = rentalEndDate || quoteRental?.endDate || ''

  // ── Is this a rental order? ───────────────────────────────────────
  // TWO independent triggers, because either alone is a real case:
  //
  //   * the operator picks Order Type = Rental. This is the no-quote
  //     path — a closed-won deal with no quote at all still has to be
  //     able to produce a rental order, and before this it could not.
  //   * the linked quote carries rental lines. The backend promotes the
  //     header for this case anyway; matching it here keeps the screen
  //     honest instead of letting the server disagree with the form.
  const isRentalOrder = orderType === 'Rental' || quoteRental !== null

  // The Order Type the operator SEES and the order is saved with. A rental
  // quote makes it Rental, whatever the lead/deal tag prefilled (often
  // "New") — before this the order was created as a rental (sellable_type)
  // while the select still read the tag, so the Order Type was wrong.
  // Derived, not set in an effect, for the same reasons as the window above.
  const effectiveOrderType: SOOrderType | '' = quoteRental !== null ? 'Rental' : orderType

  // A rental order is only SAFE to create once the window is known.
  // Without both dates `_apply_rental_line_defaults` receives None and
  // leaves every line non-rental — which is the silent "agreement with
  // nothing to bill" order this whole change exists to prevent. So the
  // dates gate the rental payload rather than being optional extras.
  const rentalWindowReady =
    isRentalOrder && effectiveRentalStart !== '' && effectiveRentalEnd !== ''

  // Inverted window — caught here so the operator sees it on the field
  // instead of as a backend CHECK violation on submit.
  const rentalWindowInverted =
    effectiveRentalStart !== '' &&
    effectiveRentalEnd !== '' &&
    effectiveRentalEnd < effectiveRentalStart

  const quoteLoadedRef = useRef<string | null>(null)
  useEffect(() => {
    const q = fullQuoteQuery.data
    if (!q) return
    if (quoteLoadedRef.current === q.id) return
    const previouslyLoaded = quoteLoadedRef.current
    quoteLoadedRef.current = q.id
    // 2026-05-19: quote items become flat SO lines — we DON'T carry
    // `sales_quote_item_id` through to the payload anymore. The SO row's
    // `partId` (when present) is the variant id; the rate is locked at the
    // quote's value when the row is part-backed.
    //
    // 2026-05-26: tag each row with `sourceQuoteId` so a later pick-change
    // / clear can strip only this quote's rows. Ad-hoc lines (no tag) and
    // rows from any other quote stay untouched.
    // QUOTE-4 / SO-BOM: quote response is tree-shaped — `qi.children` holds
    // the assembly's Add/Remove rows for this headline. Carry them across
    // to the SO line as inline `children` payloads so the resulting SO
    // mirrors the quote's BOM tree one-for-one. The category_id falls back
    // to the parent's if the child's own is missing (defensive; backend
    // requires non-null) — same fallback the form layer uses.
    const mapped: SOLineItem[] = q.items.map((qi) => {
      // Project quote children → the shared upstream `BomChildRow` shape
      // (LineItemRow reads `bomChildren` directly). Remove rows are
      // skipped (no Remove UI yet); when that toggle lands, surface
      // them with an action field on BomChildRow.
      const prefilledComps: BomChildRow[] = (qi.children ?? [])
        .filter((qc) => qc.config_action !== 'Remove')
        .map((qc) => ({
          id: `ac-${qc.id}`,
          partId: qc.part_variant_id ?? undefined,
          partSku: undefined,
          itemName: qc.item_name,
          categoryId: qc.category_id ?? undefined,
          description: qc.description ?? undefined,
          qty: Number(qc.qty),
          rate: Number(qc.rate),
          listPrice: qc.list_price ?? undefined,
          // Quote child rows missing a tax rate fall back to the 18% default.
          taxRate: Number(qc.tax_rate ?? TAXES.DEFAULT_TAX_RATE),
          // Carry the per-child discount across from the quote so the
          // BOM editor shows the same Disc ₹ value the customer agreed
          // to in the quote. Without this the input was always blank.
          discountAmount: Number(qc.discount_amount ?? 0),
          oemId: qc.oem_id ?? undefined,
          condition: qc.condition || undefined,
          warrantyLevel: qc.warranty_level ?? undefined,
        }))
      return {
        id: genId(),
        type: qi.part_variant_id ? 'ims_part' : 'description',
        partId: qi.part_variant_id ?? undefined,
        partName: qi.item_name,
        categoryId: qi.category_id ?? undefined,
        item: qi.item_name,
        description: qi.description ?? '',
        qty: Number(qi.remaining_qty),
        rate: Number(qi.rate),
        // Carry the quote line's catalog list_price snapshot across to the SO.
        listPrice: qi.list_price ?? undefined,
        discount_amount: Number(qi.discount_amount ?? 0),
        // Quote items missing a tax rate fall back to the 18% default;
        // an explicit stored 0 stays 0.
        taxRate: Number(qi.tax_rate ?? TAXES.DEFAULT_TAX_RATE),
        // Carry the quote line's OWN window across, so a quote where one
        // item was out for a shorter span becomes an order that bills it
        // for that span. Left undefined when the quote line had none —
        // the line then inherits the order's window rather than being
        // pinned to a copy of it.
        rentalStartDate: qi.rental_start_date ?? undefined,
        rentalEndDate: qi.rental_end_date ?? undefined,
        sourceQuoteId: q.id,
        configurationNotes: qi.configuration_notes ?? undefined,
        warrantyLevel: qi.warranty_level ?? undefined,
        bomChildren: prefilledComps.length > 0 ? prefilledComps : undefined,
        oemId: qi.oem_id ?? undefined,
        condition: (qi.condition || undefined) as SOLineCondition | undefined,
      }
    })
    if (mapped.length > 0) {
      // Strip rows from the previously-loaded quote so a pick-change
      // doesn't accumulate two copies of the same source. Ad-hoc rows
      // (no ``sourceQuoteId``) and rows seeded by a demo-source stay.
      // Then append the new quote's rows on top.
      setLineItems((prev) => {
        // Blank placeholder rows (the grid's always-present empty line) are
        // dropped too, so quote rows don't land under an empty first row.
        const kept = (previouslyLoaded
          ? prev.filter((li) => li.sourceQuoteId !== previouslyLoaded)
          : prev
        ).filter((li) => !isBlankLine(li))
        const next = [...kept, ...mapped]
        // When this hydration came from the URL prefill, the
        // auto-populated lines are the user's baseline — not their
        // edits. Re-snapshot so the dirty check compares against the
        // hydrated shape, otherwise the page lands dirty and
        // bare-arrival browser-back triggers the discard popup.
        if (prefillQuoteId === q.id) {
          initialLineItemsJsonRef.current = JSON.stringify(next)
        }
        return next
      })
    }
    // Seed Terms & Conditions from the quote — only when the field is still
    // empty so user edits aren't clobbered on re-hydration.
    setTerms((cur) => cur || (q.terms_conditions ?? ''))
  }, [fullQuoteQuery.data, prefillQuoteId])

  // When the user clears their quote selection, strip the lines that
  // came from the cleared quote — but leave ad-hoc lines and any
  // demo-seeded lines in place.
  useEffect(() => {
    if (selectedQuote) return
    const previouslyLoaded = quoteLoadedRef.current
    if (!previouslyLoaded) return
    quoteLoadedRef.current = null
    setLineItems((prev) => {
      const next = prev.filter((li) => li.sourceQuoteId !== previouslyLoaded)
      return next.length > 0 ? next : [emptyAdhocLine()]
    })
  }, [selectedQuote])

  // Deep-link pre-select: when `?quoteId=<id>` is in the URL, synthesize a
  // QuoteListItemWire from the fetched full quote and set it as the chosen
  // quote on first arrival. Guarded by a ref so the user can click "Change"
  // and re-pick freely afterward without us snapping back to the URL value.
  const prefillAppliedRef = useRef<string | null>(null)
  useEffect(() => {
    const q = prefillQuoteQuery.data
    if (!q) return
    if (prefillAppliedRef.current === q.id) return
    prefillAppliedRef.current = q.id
    // QuoteWire doesn't carry `entity_number` (only the list endpoint
    // resolves it). Fall back to the lead/deal code from the active entity
    // query so the summary banner reads cleanly.
    const entityNumber =
      leadQuery.data?.lead_code ??
      dealQuery.data?.deal_number ??
      null
    const synthesized: QuoteListItemWire = {
      id: q.id,
      quote_number: q.quote_number,
      version_number: q.version_number,
      parent_quote_id: q.parent_quote_id,
      is_latest_quote: q.is_latest_quote,
      quotable_type: q.quotable_type,
      quotable_id: q.quotable_id,
      entity_number: entityNumber,
      // QuoteWire doesn't carry the resolved customer display name (only
      // the list endpoint does the per-row lookup). Synthesize from the
      // active entity query so the banner reads cleanly — DealResponse
      // embeds the account name on `account.name`.
      account_name:
        leadQuery.data?.company_name ?? dealQuery.data?.account?.name ?? null,
      status: q.status,
      valid_until: q.valid_until,
      grand_total: q.grand_total,
      labels: q.labels,
      // List-only enrichment; synthesizing from the detail endpoint has
      // no source for the per-quote item count, so 0 is the safe default.
      line_item_count: 0,
      // QuoteWire carries `brand_id` but not the resolved code/name (the
      // list endpoint does that batched lookup) — leave them null; the
      // wizard banner doesn't render the vertical.
      brand_id: q.brand_id,
      brand_code: null,
      brand_name: null,
      created_by: q.created_by,
      // Same story as brand_code/brand_name: the embedded creator ref is a
      // list-endpoint enrichment that QuoteWire doesn't carry, and the wizard
      // banner never renders it — null is the honest value here.
      created_by_user: null,
      // Same story as created_by_user — list-endpoint enrichment the wizard
      // banner never renders; empty is the honest value here.
      approved_by_users: [],
      created_at: q.created_at,
      updated_at: q.updated_at,
    }
    setSelectedQuote(synthesized)
  }, [prefillQuoteQuery.data, leadQuery.data?.lead_code, dealQuery.data?.deal_number])

  // ── Duplicate-detection lookups for account name + contact email ──
  // Debounced search against the live API so the user gets a non-blocking
  // warning when a typed account name or contact email collides with an
  // existing record. We don't block submit — the backend will reject hard
  // duplicates with a 409; this is a heads-up so sales can choose to use
  // the existing record instead of creating a duplicate.
  const debouncedAccountName = useDebounce(accountName.trim(), 400)
  const accountDupQuery = useAccounts(
    // Only flag a clash against an APPROVED account — a Pending/Rejected
    // account with the same name is not treated as an existing duplicate.
    { search: debouncedAccountName, page_size: 5, approval_statuses: ["Approved"] },
    { enabled: isLead && debouncedAccountName.length >= 2 },
  )
  const duplicateAccount = useMemo(() => {
    if (!debouncedAccountName) return null
    const lower = debouncedAccountName.toLowerCase()
    return (
      (accountDupQuery.data?.items ?? []).find(
        (a) => a.name.toLowerCase() === lower,
      ) ?? null
    )
  }, [accountDupQuery.data, debouncedAccountName])

  // ── Sales Order create mutation ───────────────────────────────
  // Backend `POST /api/v1/crm/sales-orders` accepts the entire closed-won
  // payload (account_data + contact_data + *_address_data + items or
  // sales_quote_id) and creates Account + Contact + Addresses + SO
  // atomically. Declared up here — above the early returns below — so the
  // hook count stays stable across the loading → loaded transition (the
  // "rule of hooks" — moving this below the early returns crashed the
  // page when the lead query resolved).
  const createSOMut = useCreateSalesOrder()

  // Demo → SO conversion mutation (real `POST …/convert-to-order`). Declared
  // unconditionally (rule of hooks); only fired from the demo branch of
  // handleComplete. Success/error toasts + targeted cache invalidation live
  // in the hook itself.
  const convertDemoMut = useConvertDemoRequestToOrder(id ?? '')

  // One in-flight submit at a time. `isPending` only flips on the next render, so
  // a fast double-click can fire handleComplete twice first and create two Sales
  // Orders; the ref closes that window and is released when the request settles.
  const submitLockRef = useRef(false)

  // Attachment lines for the SO this wizard is about to create. No id yet, so
  // the controller stays in create mode and stages files onto the multipart
  // POST. Same hook the SO form uses — the two build sales orders through
  // separate controllers, and this is the shared piece.
  const attachments = useSoAttachmentLines()

  // Stable callbacks handed to `ClosedWonDemoForm` so its `onStateChange`
  // effect doesn't re-fire on every parent render.
  const handleDemoState = useCallback((next: ClosedWonDemoFormState) => {
    setDemoFormState(next)
  }, [])
  const handleDemoCreated = useCallback(
    (created: DemoRequestWire) => {
      navigate(`/crm/demo-requests/${created.id}`, {
        state: { backTo: listPath },
      })
    },
    [navigate, listPath],
  )


  // 2026-05-19: Totals come from the live calculate endpoint — no FE math.
  // The hook serialises payload into the queryKey, so any qty/rate change
  // refetches. We map our local SOLineItem shape onto the calculate-line
  // shape; rows missing both part_variant_id AND item_name are filtered out
  // so the server doesn't 422 on incomplete drafts.
  const calculatePayload = useMemo<SalesOrderCalculateRequest>(() => {
    // Closed Won builds a Sales Order, so it prices against
    // /sales-orders/calculate — the same endpoint (and gate) the standalone
    // SO form uses, not /quotes/calculate. Both schemas accept a category-less
    // line, so a row prices on qty alone: gating on category (the old
    // `partId || categoryId` check) blanked the live totals until a category
    // was picked. Children still need a category — see the `li.categoryId`
    // guard below — matching the SO form + persist mapper.
    const items: SalesOrderCalculateLinePayload[] = []
    lineItems.forEach((li, idx) => {
      // `category_id` is OPTIONAL on the calculate line (backend —
      // `uuid.UUID | None`), so a headline only needs a positive qty to be
      // priceable: forward whatever category the form has and let the server
      // compute totals without it. The totals preview therefore refreshes the
      // moment qty/rate change, before a category is picked. (Category IS
      // required on the persist path and on BOM children — those keep their
      // guards.)
      if (!(li.qty > 0)) return
      const headline: SalesOrderCalculateLinePayload = {
        part_variant_id: li.partId,
        category_id: li.categoryId,
        item_name: li.partName ?? (li.item.trim() || '-'),
        // description omitted: /calculate math is driven by qty/rate/tax/
        // discount only — passing it would just churn the queryKey on
        // description edits and refetch with no effect on totals.
        qty: li.qty,
        rate: li.rate,
        discount_amount:
          li.discount_amount > 0 ? li.discount_amount : undefined,
        tax_rate: li.taxRate,
        sort_order: idx,
      }
      if (li.configurationNotes && li.configurationNotes.trim()) {
        headline.configuration_notes = li.configurationNotes.trim()
      }
      if (li.warrantyLevel && li.warrantyLevel.trim()) {
        headline.warranty_level = li.warrantyLevel.trim()
      }
      const children = (li.bomChildren ?? []).filter(
        (c) => Number.isFinite(c.qty) && c.qty > 0,
      )
      // `li.categoryId &&` gate commented out — children are now sent to
      // /calculate even when the parent has no category, so component
      // prices contribute to the subtotal immediately. Backend will
      // surface a clear error if its own schema still requires it.
      if (/* li.categoryId && */ children.length > 0) {
        headline.children = children.map<
          NonNullable<SalesOrderCalculateLinePayload['children']>[number]
        >((c, childIdx) => ({
          config_action: 'Add',
          part_variant_id: c.partId || undefined,
          // Children inherit the parent's category until the picker
          // returns real category UUIDs — same fallback the persist
          // mapper uses.
          category_id: c.categoryId ?? li.categoryId!,
          // Name comes from the picked part only — NEVER mirror the
          // Description into item_name. Nameless children send "-".
          item_name: c.itemName?.trim() || '-',
          // description omitted from /calculate — see headline note above.
          qty: c.qty,
          rate: c.rate >= 0 ? c.rate : undefined,
          tax_rate: c.taxRate ?? li.taxRate,
          // Per-child discount — without it the calc payload is
          // invariant to discount edits on child rows.
          discount_amount: c.discountAmount > 0 ? c.discountAmount : undefined,
          sort_order: childIdx,
          ...(c.warrantyLevel && c.warrantyLevel.trim()
            ? { warranty_level: c.warrantyLevel.trim() }
            : {}),
        }))
      }
      items.push(headline)
    })
    return { items }
  }, [lineItems])
  // Don't call /calculate while any line or BOM child has a discount that
  // exceeds its amount — the backend 422s such a payload. The shared BOM
  // editor flags the offending child inline; this just gates the request.
  // `lineDiscountError` is a hoisted function declaration, so it's callable
  // here even though it's defined further down.
  const hasDiscountError = lineItems.some(
    (li) =>
      lineDiscountError(li) !== null ||
      (li.bomChildren ?? []).some((c) => bomChildDiscountError(c)),
  )
  const calculateQuery = useSalesOrderCalculate(calculatePayload, {
    enabled: calculatePayload.items.length > 0 && !hasDiscountError,
  })
  const calc = calculateQuery.data

  // Surface /calculate failures via a toast — without this the totals
  // row silently freezes at zero on a 422 / 5xx. Refire only when the
  // error message changes so a stuck error doesn't spam.
  const lastCalcErrorMsgRef = useRef<string | null>(null)
  useEffect(() => {
    if (!calculateQuery.isError) {
      lastCalcErrorMsgRef.current = null
      return
    }
    const msg =
      (calculateQuery.error instanceof Error && calculateQuery.error.message) ||
      CLOSE_WON_STRINGS.toast.calcFailedFallback
    if (msg !== lastCalcErrorMsgRef.current) {
      lastCalcErrorMsgRef.current = msg
      toast.error(CLOSE_WON_STRINGS.toast.calcFailed(msg))
    }
  }, [calculateQuery.isError, calculateQuery.error])
  const subtotal = calc?.subtotal ?? 0
  const lineDiscount = calc?.total_line_discount ?? 0
  const gst = calc?.total_tax ?? 0
  const grandTotal = calc?.grand_total ?? 0
  // Per-row totals from the calc response, indexed by sort_order. Rows
  // filtered out of the calc payload (incomplete) get a `0` fallback so
  // the column still renders something instead of blanking out.
  // Stored tax-inclusive (amount + tax) so the row "Total" column shows
  // the price after tax — display only; the payload is unchanged.
  const calcRowTotals = useMemo(() => {
    const totals = new Map<number, number>()
    calc?.items.forEach((row, idx) => {
      totals.set(row.sort_order ?? idx, row.amount + row.tax_amount)
    })
    return totals
  }, [calc])

  // Validation
  // §AccountCreate Pydantic: name + account_type are strictly required;
  // status defaults to "Active" and tag to "Cold" on POST. Everything else
  // is captured in UI but accepted nullable by the backend.
  // PAN stays optional (format-checked only when filled). GST is MANDATORY
  // on the lead branch — that's the path that creates the account inline via
  // AccountInlineData, so it must carry a valid GST (deal branch reuses an
  // existing account and has no GST input here).
  const trimmedPan = panNumber.trim().toUpperCase()
  const trimmedGst = gstNumber.trim().toUpperCase()
  const panError =
    trimmedPan !== '' && !ACCOUNT_PAN_REGEX.test(trimmedPan) ? ACCOUNT_PAN_ERROR : null
  const gstError =
    isLead && trimmedGst === ''
      ? ACCOUNT_GST_REQUIRED
      : trimmedGst !== '' && !ACCOUNT_GST_REGEX.test(trimmedGst)
        ? ACCOUNT_GST_ERROR
        : null
  // Contact is optional, but a partly-filled contact must be completed —
  // backend ContactInlineData needs a name AND (email or phone), with a
  // well-formed email. An untouched contact block is left alone.
  const contactFullName = `${firstName} ${lastName}`.trim()
  const contactTouched = [
    firstName,
    lastName,
    contactEmail,
    contactPhone,
    designation,
    department,
  ].some((v) => v.trim() !== '')
  const contactError: string | null = !contactTouched
    ? null
    : !contactFullName
      ? 'Enter the contact first or last name.'
      : !contactEmail.trim() && !contactPhone.trim()
        ? 'Add a contact email or phone number.'
        : contactEmail.trim() !== '' && !EMAIL_REGEX.test(contactEmail.trim())
          ? 'Enter a valid contact email address.'
          : null

  const isAccountValid =
    accountName.trim() !== '' &&
    accountType !== '' &&
    industry !== '' &&
    !panError &&
    !gstError &&
    !contactError
  // A row is valid when:
  //   • qty > 0 AND rate > 0
  //   • category_id is set — part-backed rows get it auto-filled; ad-hoc
  //     rows require the user to pick one from the Category dropdown
  //   • it is identifiable — a picked part OR a typed description (a name
  //     alone is not enough); otherwise it would persist as a "-" row
  //   • every BOM component is itself identifiable (part or description) and
  //     priced (rate > 0)
  //   • Brand/OEM + Condition are set — mandatory on every SO line; a
  //     part-backed row takes both from the part (backend fills them)
  function isLineValid(li: SOLineItem): boolean {
    if (!(li.qty > 0 && li.rate > 0)) return false
    if (lineDiscountError(li)) return false
    // Close-Won Sales Order lines require Part Name, Category, Brand/OEM and
    // Condition on the parent. Part Number required-check commented out per
    // user request — Close Won now matches the direct SO form (freeform rows
    // allowed; description substitutes for Part Number).
    // if (!li.partId) return false
    if (!li.item?.trim()) return false
    if (!li.categoryId) return false
    if (!li.oemId) return false
    if (!li.condition) return false
    if (
      (li.bomChildren ?? []).some(
        (c) =>
          // Children carry the same mandatory fields as the parent. Part
          // Number required-check commented out per user request. Price is
          // NOT required on a component — its cost rolls into the parent
          // line and never prints on the document — so a blank child Price
          // must not block Save.
          // !c.partId ||
          !c.itemName?.trim() ||
          !c.categoryId ||
          !c.oemId ||
          bomChildCategoryError(c) ||
          bomChildOemError(c) ||
          bomChildConditionError(c),
      )
    ) {
      return false
    }
    return true
  }
  // Per-line discount can't exceed what the line is worth (qty*rate, the
  // line gross). Mirrors QuoteBuilderPanel's cap; returns a human message
  // surfaced at the line-item level, or null when the discount is in range.
  function lineDiscountError(li: SOLineItem): string | null {
    const lineGross = li.qty * li.rate
    return discountCapError(li.discount_amount, lineGross)
  }
  // Submit is blocked when any row carries an over-cap discount (parent or
  // BOM child) — see `hasDiscountError` computed above, which also gates the
  // /calculate request.
  // A row "has content" once the user puts anything meaningful in it. A
  // content-bearing row that isn't valid is INCOMPLETE — submit is blocked
  // until it is completed or removed, so partial rows are never silently
  // dropped from the payload.
  // ── Demo → SO conversion payload rows ─────────────────────────────
  // Original demo items ride into the convert body by ITEM id; net-new rows
  // must be part-backed with qty > 0 (`additional_items` has no free-text
  // shape). Addresses/terms are NOT part of the convert contract — the
  // backend builds the SO from the demo itself.
  const demoConvertItemIds = isDemo
    ? lineItems
        .filter((li): li is SOLineItem & { demoItemId: string } => !!li.demoItemId)
        .map((li) => li.demoItemId)
    : []
  const demoAdditionalItems: DemoConvertAdditionalItemPayload[] = isDemo
    ? lineItems
        .filter((li) => !li.demoItemId && !!li.partId && li.qty > 0)
        .map((li) => ({
          part_variant_id: li.partId as string,
          qty: li.qty,
          rate: li.rate,
        }))
    : []

  const incompleteLineItems = isDemo
    ? // Demo branch: a STARTED user-added row that can't convert (no part
      // picked, or qty not positive) blocks submit so it isn't silently
      // dropped from the payload. Untouched blank rows don't count.
      lineItems.filter(
        (li) =>
          !li.demoItemId &&
          !(li.partId && li.qty > 0) &&
          (!!li.partId ||
            li.item.trim() !== '' ||
            li.rate > 0 ||
            !!li.categoryId ||
            (li.description ?? '').trim() !== ''),
      )
    : lineItems.filter(
        (li) =>
          (!!li.partId ||
            li.item.trim() !== '' ||
            li.rate > 0 ||
            !!li.categoryId ||
            (li.description ?? '').trim() !== '') &&
          !isLineValid(li),
      )
  const isSOValid = isDemo
    ? // Demo branch: at least one convertible row, and no half-filled
      // user-added rows. Address selection doesn't apply here.
      incompleteLineItems.length === 0 &&
      demoConvertItemIds.length + demoAdditionalItems.length > 0
    : lineItems.some(isLineValid) &&
      !hasDiscountError &&
      incompleteLineItems.length === 0 &&
      // Both billing AND shipping address are mandatory before the SO can be
      // created.
      !!selectedBillingId &&
      !!selectedShippingId

  // Step layout (Quote selection now lives INSIDE the SO step as a top
  // card, not a standalone step):
  //   Lead  → 1=Account, 2=Sales Order   (2 steps)
  //   Deal  → 1=Sales Order               (1 step)
  //   Demo  → 1=Sales Order               (1 step, unchanged)
  const isOnAccountStep = isLead && currentStep === 1
  const isOnSOStep = isLead ? currentStep === 2 : currentStep === 1
  const totalSteps = isLead ? 2 : 1

  // The Demo Request item table is intentionally independent from the Sales
  // Order: the DR always starts empty and the user picks demo items fresh, so
  // SO line items are never carried over (no shared/"common" item list).

  // Loading state — while the active entity query is in flight, render a
  // skeleton instead of falling through to the "not found" branch (which
  // would briefly flash on every navigation while the request resolves).

  // Line item CRUD
  function updateLineItem(lineItemId: string, updates: Partial<SOLineItem>) {
    setLineItems((prev) => prev.map((li) => li.id === lineItemId ? { ...li, ...updates } : li))
  }

  // Demo-style "search a part → add a line". Picking a variant in the search
  // bar appends a part-backed row (rate seeded from the variant's sell_price,
  // category auto-filled). If a row for the same variant already exists we
  // bump its qty by 1 instead of stacking a duplicate — mirrors DemoItemsCard.
  // Append an ad-hoc (freeform) line — no part picked, no category yet.
  // The Item column already renders an inline name + category picker for
  // rows where `partId` is undefined (see ItemsTable, ~line 2534); this
  // helper just gives sales an entry point. The backend's freeform
  // branch needs `item_name` + `category_id` (validated in the save
  // mapper at handleSubmit); sales fills both in the row after clicking
  // this button.
  function addAdhocLine() {
    setLineItems((prev) => [...prev, emptyAdhocLine()])
  }

  function removeLineItem(lineItemId: string) {
    setLineItems((prev) => {
      // The shared grid always keeps one row; mirror the SO form's guard.
      if (prev.length <= 1) return prev
      return prev.filter((li) => li.id !== lineItemId)
    })
  }

  /** "Clear all" in the grid — drop every line and leave one fresh row. */
  function clearAllLineItems() {
    setLineItems([emptyAdhocLine()])
  }

  const hasRealLines = lineItems.some(
    (l) => !!l.partId || l.item.trim() !== '' || (l.bomChildren ?? []).length > 0,
  )

  // Paste-from-Excel — same resolution + SO BOM rule as the Sales Order form
  // (Closed Won creates a Sales Order): price-less rows become components
  // only under a BOM-eligible parent, otherwise each becomes its own line.
  async function applyPastedGroups(pasted: PastedLineGroup[], mode: 'replace' | 'append') {
    if (pasted.length === 0) return

    const resolved = await resolvePasteVariants(pasted, qc)
    const groups = await promoteComponentsOfNonBomParents(pasted, resolved, qc)
    const { variantMap, categoryNameToId } = resolved

    const newLines: SOLineItem[] = groups.map((g) => {
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
        return {
          ...base,
          itemName: c.partNumber || c.description || '',
          partSku: c.partNumber || undefined,
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

      if (pv) {
        const hsnRate =
          pv.hsn_gst_rate != null ? parseFloat(pv.hsn_gst_rate) : TAXES.DEFAULT_TAX_RATE
        return {
          ...emptyAdhocLine(),
          type: 'ims_part',
          partId: pv.id,
          partSku: pv.sku_code,
          partName: pv.name,
          partImsId: pv.part_id,
          item: pv.name,
          description: g.parent.description || '',
          categoryId: pv.category_id ?? undefined,
          category: pv.category_name,
          isBomEligible: pv.is_bom_eligible === true,
          oemId: pv.oem_id ?? undefined,
          condition: (pv.condition || undefined) as SOLineCondition | undefined,
          qty,
          rate,
          listPrice: pv.sell_price ? Number(pv.sell_price) : undefined,
          taxRate: hsnRate,
          bomChildren,
          isBomExpanded: bomChildren.length > 0,
        }
      }

      const pastedCat = g.parent.category
      return {
        ...emptyAdhocLine(),
        item: g.parent.partNumber || '',
        description: g.parent.description || '',
        categoryId: pastedCat ? categoryNameToId.get(pastedCat.toLowerCase()) : undefined,
        category: pastedCat || undefined,
        condition: (pastedConditionToCondition(g.parent.condition) || undefined) as
          | SOLineCondition
          | undefined,
        qty,
        rate,
        bomChildren,
        isBomExpanded: bomChildren.length > 0,
      }
    })

    setLineItems((prev) =>
      mode === 'replace' || !hasRealLines ? newLines : [...prev, ...newLines],
    )
    return {
      lines: groups.length,
      components: groups.reduce((n, g) => n + g.components.length, 0),
    }
  }

  // Document handling — per-slot single-file set/clear. MIME allow-list + 20 MB
  // validation now lives in the shared <DocumentUploadField>, so this just
  // stores (file) or clears (undefined) the given slot.
  function setDocument(slot: AccountDocumentType, file: File | undefined) {
    setDocuments((prev) => {
      const next = { ...prev }
      if (file) next[slot] = file
      else delete next[slot]
      return next
    })
  }


  function handleNext() {
    if (isOnAccountStep) {
      if (!isAccountValid) {
        toast.error(CLOSE_WON_STRINGS.toast.fillAccountFields)
        return
      }
      setCurrentStep(2)
      return
    }
  }

  function handleComplete() {
    if (submitLockRef.current) return
    // ── Demo → SO conversion: real backend endpoint ──────────────────
    // POST /crm/demo-requests/{id}/convert-to-order with the picked demo
    // item ids + any user-added part rows. The backend creates the SO and
    // returns the updated demo (with `converted_sales_order_id`).
    if (isDemo && demo) {
      if (demo.converted_sales_order_id) {
        toast.info(CLOSE_WON_STRINGS.toast.demoSoExists)
        navigate(`/crm/sales-orders/${demo.converted_sales_order_id}`, {
          state: { backTo: listPath },
        })
        return
      }
      if (convertDemoMut.isPending) return
      if (demoConvertItemIds.length + demoAdditionalItems.length === 0) {
        toast.error(DEMO_REQUESTS_STRINGS.toast.noLineItems)
        return
      }
      submitLockRef.current = true
      convertDemoMut.mutate(
        {
          ...(demoConvertItemIds.length > 0
            ? { demo_request_item_ids: demoConvertItemIds }
            : {}),
          ...(demoAdditionalItems.length > 0
            ? { additional_items: demoAdditionalItems }
            : {}),
          ...(notes.trim() ? { notes: notes.trim() } : {}),
        },
        {
          // Success toast comes from the convert hook (single toast).
          onSuccess: (updated) => {
            navigate(
              updated.converted_sales_order_id
                ? `/crm/sales-orders/${updated.converted_sales_order_id}`
                : `/crm/demo-requests/${updated.id}`,
              { state: { backTo: listPath } },
            )
          },
          onSettled: () => {
            submitLockRef.current = false
          },
        },
      )
      return
    }

    if (!id) return

    // 2026-05-19: Quote is optional. At least one valid line item is the
    // only hard requirement. Quote-seeded rows count toward this — they're
    // already in `lineItems` after the fullQuoteQuery hydration.
    if (!isSOValid) {
      toast.error(
        hasDiscountError
          ? CLOSE_WON_STRINGS.toast.fixDiscount
          : incompleteLineItems.length > 0
            ? CLOSE_WON_STRINGS.toast.incompleteRows(incompleteLineItems.length)
            : !selectedBillingId
              ? CLOSE_WON_STRINGS.toast.pickBillingAddress
              : !selectedShippingId
                ? CLOSE_WON_STRINGS.toast.pickShippingAddress
                : CLOSE_WON_STRINGS.toast.addValidItem,
      )
      return
    }

    // Address resolution: the radio-multiselect retains either existing
    // account-address ids (source==='Account') or locally-added rows
    // (source==='New'). Backend accepts either form per side.
    const billingPicked = selectedBillingId
      ? billingAddressPool.find((a) => a.id === selectedBillingId)
      : undefined
    const shippingPicked = selectedShippingId
      ? shippingAddressPool.find((a) => a.id === selectedShippingId)
      : undefined
    if (!billingPicked) {
      toast.error(CLOSE_WON_STRINGS.toast.pickBillingAddress)
      return
    }
    if (!shippingPicked) {
      toast.error(CLOSE_WON_STRINGS.toast.pickShippingAddress)
      return
    }
    // Order Type is mandatory, same as the Sales Order form. A rental quote
    // fixes it to Rental, so this only fires on the no-quote / sales path.
    if (!effectiveOrderType) {
      toast.error(CLOSE_WON_STRINGS.toast.orderTypeRequired)
      return
    }
    // A rental order is REFUSED rather than quietly downgraded to a plain
    // sale: downgrading is what produced orders labelled Rental that
    // billed nothing, and nobody can see the difference after the fact.
    if (isRentalOrder) setRentalSubmitTried(true)
    if (isRentalOrder && rentalWindowInverted) {
      toast.error(CLOSE_WON_STRINGS.toast.rentalWindowInverted)
      return
    }
    if (isRentalOrder && !rentalWindowReady) {
      toast.error(CLOSE_WON_STRINGS.toast.rentalWindowRequired)
      return
    }
    if (isRentalOrder && !rentalOrderDate) {
      toast.error(CLOSE_WON_STRINGS.toast.rentalOrderDateRequired)
      return
    }
    // Attachment problems render inline in the section (not as a toast), so
    // this just gates the submit.
    if (!attachments.validate()) return
    const inlineFromTagged = (a: TaggedAddress) => ({
      line1: a.line1,
      line2: a.line2 || null,
      city: a.city,
      state: a.state,
      pincode: a.pincode,
      label: a.label || null,
    })

    // Build the unified payload. `account_data` + `contact_data` only on
    // the lead branch — backend ignores them on the deal branch (account
    // is resolved from the deal row). `status: 'Submitted'` matches the
    // standalone SalesOrderFormPage behavior — the close-won flow always
    // pushes the SO straight into approval, not Draft.
    const payload: SalesOrderCreatePayload = {
      // STATED, not left to the backend's silent promotion. The promotion
      // only fixes the header; the WINDOW is what makes the LINES rental
      // (`_apply_rental_line_defaults` fills is_rental + period + dates
      // down onto every line that does not state its own), and the two
      // have to travel together or the order bills nothing.
      sellable_type: rentalWindowReady ? 'rental_sales' : 'sales',
      ...(rentalWindowReady
        ? {
            rental_order_date: rentalOrderDate,
            rental_start_date: effectiveRentalStart,
            rental_end_date: effectiveRentalEnd,
          }
        : {}),
      status: 'Submitted',
      orderable_type: isLead ? 'lead' : 'deal',
      orderable_id: id,
      sales_quote_id: selectedQuote?.id ?? null,
      ...(billingPicked.source === 'Account'
        ? { billing_address_id: billingPicked.id }
        : { billing_address_data: inlineFromTagged(billingPicked) }),
      ...(shippingPicked
        ? shippingPicked.source === 'Account'
          ? { shipping_address_id: shippingPicked.id }
          : { shipping_address_data: inlineFromTagged(shippingPicked) }
        : {}),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
      ...(terms.trim() ? { terms_conditions: terms.trim() } : {}),
      ...(paymentTerms.trim() ? { payment_terms: paymentTerms.trim() } : {}),
      ...(warranty.trim() ? { warranty: warranty.trim() } : {}),
      ...(delivery.trim() ? { delivery: delivery.trim() } : {}),
      // FE captures one Order Type; backend stores `order_type: list`.
      ...(effectiveOrderType ? { order_type: [effectiveOrderType] } : {}),
    }

    if (isLead) {
      if (!accountType) {
        toast.error(CLOSE_WON_STRINGS.toast.pickAccountType)
        return
      }
      if (!industry) {
        toast.error(CLOSE_WON_STRINGS.toast.pickIndustry)
        return
      }
      // Collapse the AsyncMultiSelect rows back to the wire shape: send the
      // selected IMS category UUIDs (`o.id`), not the labels. This mirrors
      // `useAccountForm` after the 2026-06 {id,name} migration — the backend
      // expects `categories_*` as a list of category ids.
      const categoriesInterestedIds = Array.from(
        new Set(categoriesInterested.map((o) => o.id).filter(Boolean)),
      )
      const categoriesBoughtIds = Array.from(
        new Set(categoriesBought.map((o) => o.id).filter(Boolean)),
      )
      // `revenue` lives in state as a free-text string for input ergonomics
      // (matches `AccountFormPage`). Send the trimmed string straight through
      // — the backend parses it as a precise `Decimal`. A `Number()` round-
      // trip would convert 16+ digit values to scientific notation and the
      // backend's `max_digits=18` check would 400. Empty → null.
      const trimmedRevenue = revenue.trim()
      const revenuePayload = trimmedRevenue === '' ? null : trimmedRevenue
      payload.account_data = {
        name: accountName.trim().toUpperCase(),
        account_type: accountType as AccountTypeWire,
        // Status isn't exposed in the wizard — closed-won accounts are
        // always created Active.
        status: 'Active',
        tag,
        // Own the new account to the lead's salesperson (assigned_to), not the
        // user completing the wizard. Null → backend falls back to the cascade
        // actor; ignored when find-or-create reuses an existing account.
        owner_id: leadQuery.data?.assigned_to?.id ?? null,
        industry: industry || null,
        company_size: companySize || null,
        employees: typeof employees === 'number' ? employees : null,
        website: website.trim() || null,
        revenue: revenuePayload,
        categories_interested: categoriesInterestedIds,
        categories_bought: categoriesBoughtIds,
        // Both regex-validated server-side. The form pre-validates above so
        // these only land here when the input parses, but normalize to
        // uppercase (backend regex requires it) and send null when blank.
        pan_number: trimmedPan || null,
        gst_number: trimmedGst || null,
      }
      const contactName = `${firstName} ${lastName}`.trim()
      const emailTrim = contactEmail.trim() || null
      const phoneTrim = contactPhone.trim() || null
      // Backend invariant: contact requires email OR phone — skip the
      // block entirely when sales didn't capture either.
      if (contactName && (emailTrim || phoneTrim)) {
        payload.contact_data = {
          name: contactName,
          email: emailTrim,
          phone: phoneTrim,
          designation: designation.trim() || null,
          department: department.trim() || null,
        }
      }
    }

    // 2026-05-19: items are ALWAYS sent as flat lines. Per the spec, each
    // row carries `sales_quote_item_id: null` even when seeded from the
    // selected quote — the quote linkage lives only on the SO header
    // (`sales_quote_id`). `sort_order` is the row index so the backend
    // preserves the on-screen order.
    const validLines = lineItems.filter(isLineValid)
    payload.items = validLines.map<SalesOrderItemCreatePayload>((li, idx) => {
      // SO-BOM: convert the upstream UI's `bomChildren` rows to the
      // backend's `SalesOrderBomChildCreatePayload` shape. `category_id`
      // is required server-side on every child — inherit from the parent
      // line when the child has none (matches the calc-payload fallback).
      const childPayloads = li.categoryId
        ? (bomChildrenToCreatePayload(
            li.bomChildren ?? [],
            li.categoryId,
            // Closed Won creates a Sales Order — same child shape as the SO form.
            { withOemCondition: true },
          ) as SalesOrderBomChildCreatePayload[])
        : []
      return {
        sales_quote_item_id: null,
        part_variant_id: li.partId,
        qty: li.qty,
        rate: li.rate,
        // Snapshot of IMS sell_price at pick time; survives sell_price changes.
        ...(li.listPrice != null ? { list_price: li.listPrice } : {}),
        discount_amount: li.discount_amount > 0 ? li.discount_amount : undefined,
        tax_rate: li.taxRate,
        // Name is optional now — a nameless row saves item_name "-".
        item_name: li.partName ?? (li.item.trim() || '-'),
        description: li.description || null,
        sort_order: idx,
        // This line's OWN window, only when it states one AND the order
        // is actually a rental. Sending dates on a non-rental order would
        // break `rental_consistency`, which is all-or-nothing: a line is
        // either fully non-rental, or carries is_rental AND a period AND
        // both dates.
        //
        // `is_rental` is deliberately NOT sent. Left unset,
        // `_apply_rental_line_defaults` reads it as "the caller did not
        // say" and defaults it ON for a rental order, filling the period
        // and any missing date from the header window. Sending an
        // explicit `true` here would also have to send `rental_period`,
        // duplicating a default the backend already owns.
        ...(rentalWindowReady && (li.rentalStartDate || li.rentalEndDate)
          ? {
              rental_start_date: li.rentalStartDate || effectiveRentalStart,
              rental_end_date: li.rentalEndDate || effectiveRentalEnd,
            }
          : {}),
        ...(li.categoryId ? { category_id: li.categoryId } : {}),
        // Per-line Brand/OEM + Condition — both optional. Sent ahead of the
        // backend accepting them (it ignores unknown fields today).
        ...(li.oemId ? { oem_id: li.oemId } : {}),
        ...(li.condition ? { condition: li.condition } : {}),
        ...(li.configurationNotes
          ? { configuration_notes: li.configurationNotes }
          : {}),
        ...(li.warrantyLevel
          ? { warranty_level: li.warrantyLevel }
          : {}),
        ...(childPayloads.length > 0 ? { children: childPayloads } : {}),
      }
    })

    // Documents are only forwarded on the lead-cascade branch — backend
    // silently drops them on deal/demo (no Account is created there, just
    // referenced). Filter the slot map to entries that actually hold a File
    // so the wire layer doesn't append empty parts.
    const leadDocuments: SalesOrderAccountDocuments | undefined = isLead
      ? Object.fromEntries(
          Object.entries(documents).filter(([, f]) => f instanceof File),
        )
      : undefined

    // Retry-safe: a second click before the first request settles must not
    // enqueue a duplicate Sales Order (CP-723 REG-03).
    if (createSOMut.isPending) return

    submitLockRef.current = true
    createSOMut.mutate(
      {
        payload,
        documents: leadDocuments,
        attachments: attachments.buildUploads(),
      },
      {
        onSuccess: (so) => {
          navigate(`/crm/sales-orders/${so.id}`, {
            state: { backTo: listPath },
          })
        },
        onSettled: () => {
          submitLockRef.current = false
        },
      },
    )
  }

  // Demo Request payload fragments — built from Step 1's account/contact
  // state; used only when a lead-path user picks the Demo Request branch.
  const demoLeadAccount = {
    name: accountName.trim().toUpperCase(),
    account_type: accountType || undefined,
    status: 'Active' as const,
    tag,
    industry: industry || undefined,
    website: website.trim() || undefined,
    // The demo-request API's `company_size` is a strict enum (unlike the
    // sales-order path, which maps loose strings server-side). A lead can
    // carry a free-text company_size ("Mid-Market", "11-50", …) the demo
    // enum rejects — only forward a value that is actually valid.
    company_size: (COMPANY_SIZE_OPTIONS as readonly string[]).includes(
      companySize,
    )
      ? companySize
      : undefined,
    employees: typeof employees === 'number' ? employees : undefined,
    // Full account detail parity with the Sales Order `account_data` payload
    // so the demo-provisioned account isn't a stripped-down record. `revenue`
    // lives as free-text; coerce (blank / non-numeric → undefined). PAN/GST
    // are uppercased (backend regex requires it). Categories send the IMS
    // category UUIDs (`o.id`) — the backend stores the ids and resolves them
    // to `{id, name}` embeds on read-back; sending the label name instead is
    // silently dropped (it can't be parsed as a UUID). Mirrors the SO/account
    // path above (`categoriesInterestedIds`).
    // Trimmed string, not Number — see the SO-cascade branch above for why
    // (JS Number precision breaks past ~17 digits and the backend 400s).
    revenue: revenue.trim() === '' ? undefined : revenue.trim(),
    pan_number: trimmedPan || undefined,
    gst_number: trimmedGst || undefined,
    categories_interested: Array.from(
      new Set(categoriesInterested.map((o) => String(o.id)).filter(Boolean)),
    ),
    categories_bought: Array.from(
      new Set(categoriesBought.map((o) => String(o.id)).filter(Boolean)),
    ),
    // Own the account to the lead's salesperson, matching the SO cascade.
    owner_id: leadQuery.data?.assigned_to?.id ?? undefined,
  }
  const demoLeadContact = {
    name: `${firstName} ${lastName}`.trim(),
    email: contactEmail.trim() || undefined,
    phone: contactPhone.trim() || undefined,
    designation: designation.trim() || undefined,
    department: department.trim() || undefined,
    status: 'Active' as const,
  }

  return {
    id,
    currentStep,
    soOrDemo,
    demoFormState,
    selectedQuote,
    accountName,
    industry,
    accountType,
    companySize,
    employees,
    tag,
    website,
    revenue,
    categoriesInterested,
    categoriesBought,
    firstName,
    lastName,
    contactEmail,
    contactPhone,
    designation,
    department,
    documents,
    panNumber,
    gstNumber,
    lineItems,
    notes,
    terms,
    paymentTerms,
    warranty,
    delivery,
    // The EFFECTIVE type: Rental whenever the linked quote is a rental.
    orderType: effectiveOrderType,
    quoteRental,
    rentalOrderDate,
    setRentalOrderDate,
    rentalSubmitTried,
    rentalStartDate: effectiveRentalStart,
    rentalEndDate: effectiveRentalEnd,
    setRentalStartDate,
    setRentalEndDate,
    isRentalOrder,
    rentalWindowReady,
    rentalWindowInverted,
    localAddresses,
    addAddressOpen,
    addAddressType,
    editingAddress,
    selectedBillingId,
    selectedShippingId,
    setCurrentStep,
    setSoOrDemo,
    setDemoFormState,
    setSelectedQuote,
    setAccountName,
    setIndustry,
    setAccountType,
    setCompanySize,
    setEmployees,
    setTag,
    setWebsite,
    setRevenue,
    setCategoriesInterested,
    setCategoriesBought,
    setFirstName,
    setLastName,
    setContactEmail,
    setContactPhone,
    setDesignation,
    setDepartment,
    setDocuments,
    setDocument,
    setPanNumber,
    setGstNumber,
    setLineItems,
    setNotes,
    setTerms,
    setPaymentTerms,
    setWarranty,
    setDelivery,
    setOrderType,
    setLocalAddresses,
    setAddAddressOpen,
    setAddAddressType,
    setEditingAddress,
    setSelectedBillingId,
    setSelectedShippingId,
    accountAddressesFromApi,
    accountAddressesQuery,
    accountDupQuery,
    addAdhocLine,
    applyPastedGroups,
    clearAllLineItems,
    hasRealLines,
    allAddresses,
    attachments,
    backPath,
    billingAddressPool,
    calc,
    calcRowTotals,
    calculatePayload,
    calculateQuery,
    canCreateDemo,
    contactError,
    contactFullName,
    contactTouched,
    createAddressMut,
    createSOMut,
    convertDemoMut,
    deal,
    dealAccountQuery,
    dealQuery,
    debouncedAccountName,
    demo,
    demoLeadAccount,
    demoLeadContact,
    demoQuery,
    duplicateAccount,
    entity,
    entityCompany,
    entityLoading,
    entityName,
    entityType,
    entityValue,
    existingAccountId,
    existingAccountName,
    fullQuoteQuery,
    goBack,
    grandTotal,
    gst,
    gstError,
    guardedBack,
    editingSource,
    setEditingSource,
    handleAddressAdd,
    handleAddressSave,
    handleComplete,
    handleDemoCreated,
    handleDemoState,
    handleNext,
    hasDiscountError,
    incompleteLineItems,
    initialContactFirst,
    initialContactLast,
    initialLineItemsJsonRef,
    isAccountValid,
    isDemo,
    isDirty,
    isLead,
    isLineValid,
    isOnAccountStep,
    isOnSOStep,
    isSOValid,
    lastCalcErrorMsgRef,
    lead,
    leadPrefilledRef,
    leadQuery,
    lineDiscount,
    lineDiscountError,
    lineItemsJson,
    listPath,
    navigate,
    orderTypePrefilledRef,
    panError,
    prefillAppliedRef,
    prefillQuoteId,
    prefillQuoteQuery,
    quoteLoadedRef,
    quoteOptionsHook,
    removeLineItem,
    shippingAddressPool,
    showDemoToggle,
    subtotal,
    totalSteps,
    trimmedGst,
    trimmedPan,
    unsavedGuard,
    updateLineItem,
  }
}

export type ClosedWonController = ReturnType<typeof useClosedWonWizard>
