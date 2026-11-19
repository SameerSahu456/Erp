import type { Part, PartVariant } from "@modules/ims"
import { formatIST_date } from "@shared/lib/date"

import type {
  AccountAddressWire,
  DemoLineCondition,
  DemoRequestItemPMStatus,
  DemoRequestStatusWire,
  DemoRequestWire,
} from "../../api"
import {
  DEMO_RETURN_CONDITION_LABELS,
  type DemoReturnConditionLabel,
  type DemoStatusLabel,
} from "../../constants/demo-request-status"
import { DEMO_REQUESTS_STRINGS as S } from "./demo-requests.strings"

export function formatDate(dateStr: string) {
  return formatIST_date(dateStr)
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount)
}

export const DEMO_WORKFLOW_STAGES = [
  { id: "request", label: S.detail.stepper.request },
  { id: "pm-approval", label: S.detail.stepper.pmApproval },
  { id: "dispatch", label: S.detail.stepper.dispatch },
  { id: "with-customer", label: S.detail.stepper.withCustomer },
  { id: "return", label: S.detail.stepper.return },
]

export const DETAIL_LINK_CLASS = "font-medium text-primary hover:underline"

export function getActiveStage(status: DemoStatusLabel): number {
  const map: Partial<Record<DemoStatusLabel, number>> = {
    "Draft": 0,
    "Account Approval Pending": 0,
    "Account Rejected": 0,
    "Pending PM Approval": 1,
    "PM Approved": 1,
    "PM Rejected": 1,
    "Partially Dispatched": 2,
    "Dispatched": 2,
    "With Customer": 3,
    "Return Overdue": 3,
    "Returned": 4,
    "Closed": 4,
  }
  return map[status] ?? 0
}

export function wireStatusToUi(status: DemoRequestStatusWire, isOverdue: boolean): DemoStatusLabel {
  if (isOverdue && status === "WithCustomer") return "Return Overdue"
  const map: Record<DemoRequestStatusWire, DemoStatusLabel> = {
    Draft: "Draft",
    "Pending for Approval": "Pending PM Approval",
    PartiallyApproved: "Pending PM Approval",
    Approved: "PM Approved",
    Rejected: "PM Rejected",
    PartiallyDispatched: "Partially Dispatched",
    Dispatched: "Dispatched",
    WithCustomer: "With Customer",
    PartiallyReturned: "With Customer",
    Returned: "Returned",
    ConvertedToSO: "Closed",
    Closed: "Closed",
    "Account Approval Pending": "Account Approval Pending",
    "Account Rejected": "Account Rejected",
  }
  return map[status]
}

export type VariantLabel = {
  name: string
  sku: string
  brand: string
  category: string
}

export type DemoDisplayLabels = {
  accountName?: string
  contactName?: string
  contactPhone?: string
  contactEmail?: string
  shippingAddress?: string
  requestedBy?: string
  leadName?: string
  dealName?: string
  variants?: Record<string, VariantLabel | undefined>
  /** Resolved approver (product manager) display name, keyed by user id. */
  productManagers?: Record<string, string | undefined>
}

// The variant response carries no category/OEM denorm — those live on the
// parent Part (`category_name`, `parent_category_name`, `oem_name`). Pass the
// resolved Part so category + brand render real values instead of the
// catalog fallbacks; the variant supplies the item's own name/sku.
export function variantLabelFromWire(
  variant: PartVariant | undefined,
  part?: Part,
): VariantLabel | undefined {
  if (!variant) return undefined
  const category = part?.category_name ?? undefined
  const parentCategory = part?.parent_category_name ?? undefined
  return {
    name: variant.name || S.detail.fallback.catalogItem,
    sku:
      variant.sku_code ?? part?.part_number ?? variant.name ?? S.detail.fallback.catalogItem,
    brand: part?.oem_name ?? S.detail.fallback.catalogBrand,
    category: category
      ? parentCategory
        ? `${parentCategory} > ${category}`
        : category
      : S.detail.fallback.uncategorized,
  }
}

export function formatAddress(address: AccountAddressWire | undefined) {
  if (!address) return undefined
  return [
    address.line1,
    address.line2,
    [address.city, address.state, address.pincode].filter(Boolean).join(", "),
  ]
    .filter(Boolean)
    .join(", ")
}

export function mapWireDemo(demo: DemoRequestWire, labels: DemoDisplayLabels = {}) {
  const itemsByDisplayLine = new Map<
    string,
    {
      id: string
      variantId: string
      /** The line's REAL IMS condition off the wire — was hardcoded `"New"`
       *  before the column existed. Null on rows saved before it. */
      condition: DemoLineCondition | null
      oemId: string | null
      variantSku: string
      partId: string
      partName: string
      partSku: string
      category: string
      brand: string
      qty: number
      unitPrice: number
      /** GST % off the part's HSN; null when the part has none. */
      taxRate: number | null
      amount: number
      serialNumbers: string[]
      pmStatus: DemoRequestItemPMStatus
      approverName: string | undefined
      pmRejectionReason: string | null
      pmNotes: string | null
      /**
       * Every demo_request_item collapsed into this display row.
       *
       * The grouping below merges lines that agree on variant + price + PM
       * state, so `id` alone names only the FIRST of them. Fulfillment counts
       * are keyed per item id server-side, so anything reading them must sum
       * across this list or a merged row silently under-reports.
       */
      sourceItemIds: string[]
    }
  >()

  for (const item of demo.items) {
    const unitPrice = Number(item.unit_price)
    const variantLabel = labels.variants?.[item.variant_id]
    const key = [
      item.variant_id,
      unitPrice,
      item.pm_status,
      item.product_manager_id ?? "",
      item.pm_rejection_reason ?? "",
      item.pm_notes ?? "",
      item.return_condition ?? "",
      item.actual_return_date ?? "",
      // Part of the key, not just carried on the row: two lines for the same
      // variant that route to different PMs (different OEM or condition) are
      // genuinely different lines, and merging them would show one row whose
      // condition contradicts half the quantity behind it.
      item.oem_id ?? "",
      item.condition ?? "",
    ].join("|")
    const existing = itemsByDisplayLine.get(key)
    if (existing) {
      existing.qty += item.qty
      existing.amount = existing.unitPrice * existing.qty
      existing.serialNumbers = Array.from(
        new Set([...existing.serialNumbers, ...(item.serial_numbers ?? [])]),
      )
      existing.sourceItemIds.push(item.id)
      continue
    }

    itemsByDisplayLine.set(key, {
      id: item.id,
      variantId: item.variant_id,
      condition: item.condition,
      oemId: item.oem_id,
      variantSku: variantLabel?.sku ?? S.detail.fallback.catalogItem,
      partId: item.variant_id,
      partName: variantLabel?.name ?? S.detail.fallback.catalogItem,
      partSku: variantLabel?.sku ?? S.detail.fallback.catalogItem,
      category: variantLabel?.category ?? S.detail.fallback.uncategorized,
      brand: variantLabel?.brand ?? S.detail.fallback.catalogBrand,
      qty: item.qty,
      unitPrice,
      taxRate: item.tax_rate != null ? Number(item.tax_rate) : null,
      amount: unitPrice * item.qty,
      serialNumbers: item.serial_numbers ?? [],
      pmStatus: item.pm_status,
      approverName: item.product_manager_id
        ? labels.productManagers?.[item.product_manager_id]
        : undefined,
      pmRejectionReason: item.pm_rejection_reason,
      pmNotes: item.pm_notes ?? null,
      sourceItemIds: [item.id],
    })
  }

  return {
    id: demo.id,
    demoNumber: demo.demo_number,
    accountId: demo.account_id,
    accountName: labels.accountName ?? S.detail.fallback.loadingAccount,
    contactId: demo.contact_id,
    contactName: labels.contactName ?? S.detail.fallback.loadingContact,
    contactPhone: labels.contactPhone ?? S.detail.fallback.emDash,
    contactEmail: labels.contactEmail ?? S.detail.fallback.emDash,
    shippingAddress:
      labels.shippingAddress ?? S.detail.fallback.loadingShippingAddress,
    status: wireStatusToUi(demo.status, demo.is_overdue),
    expectedReturnDate: demo.expected_return_date,
    isOverdue: demo.is_overdue,
    overdueByDays: demo.is_overdue
      ? Math.max(
          0,
          Math.ceil(
            (Date.now() - new Date(demo.expected_return_date).getTime()) /
              (1000 * 60 * 60 * 24),
          ),
        )
      : undefined,
    requestedBy: labels.requestedBy ?? S.detail.fallback.loadingRequester,
    createdAt: demo.created_at,
    updatedAt: demo.updated_at,
    notes: demo.notes ?? undefined,
    dispatchRequestId: demo.dispatch_id
      ? S.detail.fallback.dispatchCreated
      : undefined,
    dispatchDate: demo.status === "Dispatched" ? demo.updated_at : undefined,
    actualReturnDate: demo.items.find((item) => item.actual_return_date)?.actual_return_date,
    returnCondition: ((): DemoReturnConditionLabel | undefined => {
      const wireCondition = demo.items.find(
        (item) => item.return_condition,
      )?.return_condition
      return wireCondition
        ? DEMO_RETURN_CONDITION_LABELS[wireCondition]
        : undefined
    })(),
    returnNotes: undefined,
    leadId: demo.lead_id ?? undefined,
    leadName: demo.lead_id
      ? labels.leadName ?? S.detail.fallback.loadingLead
      : undefined,
    dealId: demo.deal_id ?? undefined,
    dealName: demo.deal_id
      ? labels.dealName ?? S.detail.fallback.loadingDeal
      : undefined,
    items: Array.from(itemsByDisplayLine.values()),
  }
}

export type DemoDisplay = ReturnType<typeof mapWireDemo>
