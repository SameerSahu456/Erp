import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { FileQuestion } from 'lucide-react'

import { NoAccess } from '@/shared/components/feedback/NoAccess'
import { EmptyState } from '@/components/common/feedback/EmptyState'
import { useNavigateBack } from '@/hooks/use-navigate-back'
import { useQueries } from '@tanstack/react-query'
// Only used by the commented-out "Acting as" widget.
// import { User } from 'lucide-react'

import { Typography } from "@/components/ui/typography"
// Select primitives only used by the commented-out "Acting as" widget.
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from '@/components/ui/select'
import { PageHeader } from '@/components/page-shells'
// POApprovalCard / actOnPO / usePOs / PM_CATEGORIES only fed the commented-out mock PO card.
import { DemoApprovalCard } from '../../pm-approvals-shared'
import { MIPMApprovalCard } from '../../components/pm-approvals/MIPMApprovalCard'
import { MI_DETAIL_STATUS_VARIANT, demoStatusVariant } from './approval-status'
import { useMIProcurementDetail } from '../../hooks/pm-approvals/useMIResponses'
import { QUOTE_STATUS_LABELS, QUOTE_STATUS_VARIANT, QuoteApprovalDetailPanel, SO_STATUS_LABELS, SO_STATUS_VARIANT, SalesOrderApprovalDetailPanel, useApproveDemoRequestItems, useDemoRequest, useQuote, useRejectDemoRequestItems, useReplacementRequest, useSalesOrderApprovalDetail, useSalesReturnRequest } from '@modules/crm'
import { ReplacementApprovalPanel } from './ReplacementApprovalPanel'
import { SalesReturnApprovalPanel } from './SalesReturnApprovalPanel'
import { PoApprovalCardBody } from '../purchase-orders/PoApprovalCardBody'
import type { DemoRequestStatusWire, DemoRequestWire } from '@modules/crm'
import { rentalsCan } from '@modules/rentals'
import type { DemoRequest } from '@/modules/crm/types'
import { useAccount, useAccountAddresses } from '@/modules/crm/hooks/accounts/useAccounts'
import { useContact } from '@/modules/crm/hooks/contacts/useContacts'
import { fetchPart, fetchVariant, type Part, type PartVariant } from '@/modules/ims/api'
import { getUserDisplayName, useUser } from '@modules/users'
import { usePermission } from '@shared/rbac'
import { crmCanAll } from '@/modules/crm/permissions'
import { procurementCan } from '../../permissions'
import { PM_APPROVALS_STRINGS } from './pm-approvals.strings'
import {
  REPLACEMENT_STATUS_LABEL,
  REPLACEMENT_STATUS_VARIANT,
  SALES_RETURN_STATUS_LABEL,
  SALES_RETURN_STATUS_VARIANT,
  type ReplacementRequestStatus,
  type SalesReturnStatus,
} from '@modules/wms'

const S = PM_APPROVALS_STRINGS


export type EntityType = 'mi' | 'so' | 'pr' | 'po' | 'demo' | 'rr' | 'sret' | 'quote'

export const TYPE_LABEL: Record<EntityType, string> = {
  mi: 'Material Inquiry',
  so: 'Sales Order',
  pr: 'Purchase Request',
  po: 'Purchase Order',
  demo: 'Demo Request',
  rr: 'Replacement Request',
  sret: 'Sales Return',
  quote: 'Quote',
}

export function wireStatusToUi(status: DemoRequestStatusWire, isOverdue: boolean): DemoRequest['status'] {
  if (isOverdue && status === 'WithCustomer') return 'Return Overdue'
  const map: Record<DemoRequestStatusWire, DemoRequest['status']> = {
    Draft: 'Draft',
    'Pending for Approval': 'Pending PM Approval',
    PartiallyApproved: 'Pending PM Approval',
    Approved: 'PM Approved',
    Rejected: 'PM Rejected',
    PartiallyDispatched: 'Partially Dispatched',
    Dispatched: 'Dispatched',
    WithCustomer: 'With Customer',
    PartiallyReturned: 'With Customer',
    Returned: 'Returned',
    ConvertedToSO: 'Closed',
    Closed: 'Closed',
    'Account Approval Pending': 'Account Approval Pending',
    'Account Rejected': 'Account Rejected',
  }
  return map[status]
}

export type VariantLabel = {
  name: string
  sku: string
  brand: string
  category: string
  condition: DemoRequest['items'][number]['condition']
}

// Category + OEM/brand are denormed on the parent Part, not the variant. Pass
// the resolved Part so those render real values instead of the "Uncategorized"
// / "Catalog" fallbacks; the variant supplies only name/sku/condition.
export function variantLabelFromWire(
  variant: PartVariant | undefined,
  part?: Part,
): VariantLabel | undefined {
  if (!variant) return undefined
  const row = variant as unknown as Record<string, unknown>
  const str = (key: string) => (typeof row[key] === 'string' ? row[key] as string : undefined)
  const partRow = part as unknown as Record<string, unknown> | undefined
  const partStr = (key: string) =>
    typeof partRow?.[key] === 'string' ? (partRow[key] as string) : undefined
  const rawCondition = str('condition')
  const condition =
    rawCondition === 'refurbished'
      ? 'Refurbished'
      : rawCondition === 'new_pull'
      ? 'New Pull'
      : 'New'
  const category = partStr('category_name') ?? str('category_name')
  const parentCategory = partStr('parent_category_name')
  return {
    name: str('part_name') ?? str('name') ?? S.detailBody.fallbacks.catalogItem,
    sku: str('part_number') ?? str('sku_code') ?? str('name') ?? S.detailBody.fallbacks.catalogItem,
    brand: partStr('oem_name') ?? str('oem_name') ?? S.detailBody.fallbacks.catalog,
    category: category
      ? parentCategory
        ? `${parentCategory} > ${category}`
        : category
      : S.detailBody.fallbacks.uncategorized,
    condition,
  }
}

export function formatAddressLine(address: {
  label?: string | null
  line1?: string | null
  line2?: string | null
  city?: string | null
  state?: string | null
  pincode?: string | null
} | null | undefined) {
  return [
    address?.label,
    address?.line1,
    address?.line2,
    address?.city,
    address?.state,
    address?.pincode,
  ]
    .filter(Boolean)
    .join(', ')
}

export function mapDemoForApproval(
  wire: DemoRequestWire,
  labels: {
    accountName?: string
    contactName?: string
    contactPhone?: string
    contactEmail?: string
    requestedBy?: string
    shippingAddress?: string
    variants?: Record<string, VariantLabel | undefined>
  } = {},
): DemoRequest {
  return {
    id: wire.id,
    demoNumber: wire.demo_number,
    accountId: wire.account_id,
    accountName: labels.accountName ?? '—',
    contactName: labels.contactName ?? '—',
    contactPhone: labels.contactPhone ?? '—',
    contactEmail: labels.contactEmail ?? '—',
    items: wire.items.map((item) => {
      const variant = labels.variants?.[item.variant_id]
      return {
        id: item.id,
        variantId: item.variant_id,
        condition: variant?.condition ?? 'New',
        variantSku: variant?.sku ?? S.detailBody.fallbacks.catalogItem,
        partId: item.variant_id,
        partName: variant?.name ?? S.detailBody.fallbacks.catalogItem,
        partSku: variant?.sku ?? S.detailBody.fallbacks.catalogItem,
        category: variant?.category ?? S.detailBody.fallbacks.uncategorized,
        brand: variant?.brand ?? S.detailBody.fallbacks.catalog,
        qty: item.qty,
        unitPrice: Number(item.unit_price),
        taxRate: item.tax_rate != null ? Number(item.tax_rate) : null,
        amount: Number(item.unit_price) * item.qty,
        serialNumbers: item.serial_numbers,
        pmStatus: item.pm_status,
        pmRejectionReason: item.pm_rejection_reason,
        canApprove: item.can_approve ?? false,
      }
    }),
    status: wireStatusToUi(wire.status, wire.is_overdue),
    productManager: S.detailBody.fallbacks.productManager,
    productManagerEmail: '—',
    shippingAddress: labels.shippingAddress || '—',
    expectedReturnDate: wire.expected_return_date,
    isOverdue: wire.is_overdue,
    requestedBy: labels.requestedBy ?? '—',
    createdAt: wire.created_at,
    updatedAt: wire.updated_at,
    notes: wire.notes ?? undefined,
  }
}


export function PMApprovalDetailBody() {
  const { type: rawType, id } = useParams<{ type: string; id: string }>()
  const entityType = rawType as EntityType | undefined

  // Per-type approve gate. Route-level guard already filtered users with
  // *zero* approve codes; this filter handles the user who landed on a
  // type they can't approve (e.g. via stale link). For MI/SO/DR the
  // bundle is AND-of-(approve, read) — the page can't function without
  // both (approve to act, read to see what you're approving).
  // PR/PO accept either the fine `procurement:po_approve` /`pr_approve` or
  // the legacy umbrella `procurement:approve` — matches the backend OR-list.
  const { can } = usePermission()
  const allowedForType = (() => {
    if (entityType === 'mi') {
      return crmCanAll.approveMi.every((bundle) => can([...bundle]))
    }
    if (entityType === 'so') {
      // Rental rate-change approvers open SOs here too (role-based).
      return (
        crmCanAll.approveSo.every((bundle) => can([...bundle])) ||
        can([...rentalsCan.approveRateChange])
      )
    }
    if (entityType === 'demo') {
      return crmCanAll.approveDr.every((bundle) => can([...bundle]))
    }
    if (entityType === 'po') {
      return can([...procurementCan.approvePo])
    }
    if (entityType === 'rr' || entityType === 'sret') {
      // Same gate as the Sales Return / Replacement queue tabs
      // (PMApprovalsBody `canApproveSret`).
      return can([...crmCanAll.approveSo[0]!])
    }
    if (entityType === 'quote') {
      return crmCanAll.approveQuote.every((bundle) => can([...bundle]))
    }
    return false
  })()

  const demoQuery = useDemoRequest(entityType === 'demo' ? id : null)
  // SO order number drives the page title for SO approvals. Same cache key
  // as the panel's lazy detail fetch (useSalesOrderApprovalDetail), so this
  // shares the panel's request rather than firing a second round-trip.
  const soQuery = useSalesOrderApprovalDetail(entityType === 'so' ? id : null)
  const soWire = soQuery.data
  // Same query (and cache entry) as MIPMApprovalCard — for the page title.
  const miQuery = useMIProcurementDetail(entityType === 'mi' ? id : null)
  const rrQuery = useReplacementRequest(entityType === 'rr' ? id : null)
  const sretQuery = useSalesReturnRequest(entityType === 'sret' ? id : null)
  const quoteQuery = useQuote(entityType === 'quote' ? id : null)
  const approveDemoItems = useApproveDemoRequestItems()
  const rejectDemoItems = useRejectDemoRequestItems()
  const demoWire = demoQuery.data
  const accountQuery = useAccount(demoWire?.account_id, {
    enabled: entityType === 'demo' && Boolean(demoWire?.account_id),
  })
  const contactQuery = useContact(demoWire?.contact_id, {
    enabled: entityType === 'demo' && Boolean(demoWire?.contact_id),
  })
  const requestedByQuery = useUser(
    entityType === 'demo' ? demoWire?.requested_by_id ?? '' : '',
  )
  const shippingAddressesQuery = useAccountAddresses(
    entityType === 'demo' ? demoWire?.account_id ?? null : null,
    {},
    { enabled: entityType === 'demo' && Boolean(demoWire?.account_id) },
  )
  const variantIds = useMemo<string[]>(
    () => Array.from(new Set(demoWire?.items.map((item) => item.variant_id) ?? [])),
    [demoWire?.items],
  )
  const variantQueries = useQueries({
    queries: variantIds.map((variantId) => ({
      queryKey: ['ims', 'variants', variantId],
      queryFn: () => fetchVariant(variantId),
      enabled: entityType === 'demo' && Boolean(variantId),
    })),
  })
  // Category + OEM/brand live on the parent Part, not the variant. Resolve the
  // unique set of parent parts so each line shows its real category instead of
  // the "Uncategorized" / "Catalog" fallback.
  const partIds = useMemo<string[]>(
    () =>
      Array.from(
        new Set(
          variantQueries
            .map((query) => query.data?.part_id)
            .filter((partId): partId is string => Boolean(partId)),
        ),
      ),
    [variantQueries],
  )
  const partQueries = useQueries({
    queries: partIds.map((partId) => ({
      queryKey: ['ims', 'parts', partId],
      queryFn: () => fetchPart(partId),
      enabled: entityType === 'demo' && Boolean(partId),
    })),
  })
  const partsById = useMemo(() => {
    const out = new Map<string, Part>()
    partIds.forEach((partId, idx) => {
      const part = partQueries[idx]?.data
      if (part) out.set(partId, part)
    })
    return out
  }, [partIds, partQueries])
  const variantLabels = useMemo(() => {
    const out: Record<string, VariantLabel | undefined> = {}
    variantIds.forEach((variantId, idx) => {
      const variant = variantQueries[idx]?.data
      const part = variant?.part_id ? partsById.get(variant.part_id) : undefined
      out[variantId] = variantLabelFromWire(variant, part)
    })
    return out
  }, [variantIds, variantQueries, partsById])

  if (!entityType || !id || !TYPE_LABEL[entityType]) return <NotFound />
  // Per-tab/per-type denials in the *list* page render inline NoAccess
  // (in-page tab content). Detail pages are full routes — render the
  // same NoAccess panel inline to match RouteGuard's behaviour. Don't
  // redirect to `/` here: `/` forwards to `/crm/leads`, and a user
  // without lead access would loop until React Router's history-rate
  // safeguard threw a DOMException.
  if (!allowedForType) return <NoAccess />

  // Purchase Orders: the real (backend-wired) per-line approval card, opened
  // inside PM Approvals so the URL, sidebar and back-arrow stay in this
  // section. It renders its own PageHeader (title, supplier, status,
  // "Approve all mine"), so it replaces this page's header entirely.
  if (entityType === 'po') {
    return <PoApprovalCardBody poId={id} backHref={S.detailBody.backHref} />
  }

  // Only used by the commented-out "Acting as" widget below.
  // const pmInitials = currentPM
  //   .split(' ')
  //   .map((n) => n[0])
  //   .join('')
  //   .slice(0, 2)
  const pageTitle =
    entityType === 'demo'
      ? demoWire?.demo_number ?? (demoQuery.isLoading ? S.detailBody.loadingDemoRequest : S.detailBody.demoRequestFallback)
      : entityType === 'so'
      ? soWire?.order_number ?? (soQuery.isLoading ? S.detailBody.loadingSalesOrder : S.detailBody.salesOrderFallback)
      : entityType === 'mi'
      ? miQuery.data?.enquiry_number ?? (miQuery.isLoading ? S.detailBody.loadingMaterialInquiry : S.detailBody.materialInquiryFallback)
      : entityType === 'rr'
      ? rrQuery.data?.request_number ?? (rrQuery.isLoading ? S.detailBody.loadingReplacement : S.detailBody.replacementFallback)
      : entityType === 'sret'
      ? sretQuery.data?.request_number ?? (sretQuery.isLoading ? S.detailBody.loadingSalesReturn : S.detailBody.salesReturnFallback)
      : entityType === 'quote'
      ? quoteQuery.data?.quote_number ?? TYPE_LABEL[entityType]
      : TYPE_LABEL[entityType]

  const rrStatus = rrQuery.data?.status as ReplacementRequestStatus | undefined
  const sretStatus = sretQuery.data?.status as SalesReturnStatus | undefined
  const demoStatus = demoWire ? wireStatusToUi(demoWire.status, demoWire.is_overdue) : undefined
  const headerStatus =
    entityType === 'so' && soWire
      ? {
          label: SO_STATUS_LABELS[soWire.status] ?? soWire.status,
          variant: SO_STATUS_VARIANT[soWire.status] ?? 'neutral',
        }
      : entityType === 'mi' && miQuery.data
      ? {
          label: miQuery.data.status,
          variant: MI_DETAIL_STATUS_VARIANT[miQuery.data.status] ?? 'neutral',
        }
      : entityType === 'demo' && demoStatus
      ? { label: demoStatus, variant: demoStatusVariant(demoStatus) }
      : entityType === 'rr' && rrStatus
      ? {
          label: REPLACEMENT_STATUS_LABEL[rrStatus] ?? rrStatus,
          variant: REPLACEMENT_STATUS_VARIANT[rrStatus] ?? 'neutral',
        }
      : entityType === 'sret' && sretStatus
        ? {
            label: SALES_RETURN_STATUS_LABEL[sretStatus] ?? sretStatus,
            variant: SALES_RETURN_STATUS_VARIANT[sretStatus] ?? 'neutral',
          }
        : entityType === 'quote' && quoteQuery.data
          ? {
              label: QUOTE_STATUS_LABELS[quoteQuery.data.status] ?? quoteQuery.data.status,
              variant: QUOTE_STATUS_VARIANT[quoteQuery.data.status] ?? 'neutral',
            }
          : undefined

  return (
    <div className="space-y-6">
      <PageHeader
        title={pageTitle}
        // Record pages show just the number, with the status badge beside
        // it — no "… · Approval" line under it. PR (mock) has no number to
        // title with, so it keeps the type line.
        subtitle={
          entityType === 'pr'
            ? `${TYPE_LABEL[entityType]} ${S.detailBody.subtitleSuffix}`
            : undefined
        }
        status={headerStatus}
        backHref={S.detailBody.backHref}
        // "Acting as" PM selector commented out per request (applies to SO, MI,
        // and demo-request approvals — all routed through this page). The
        // `currentPM` state is kept (defaults to ALL_PMS[0]) since the
        // approve/reject logic below still references it.
        // actions={
        //   <div className="flex items-center gap-3 rounded-xl border bg-card/80 p-2 pr-3 shadow-sm">
        //   <div className="flex size-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/70 text-xs font-semibold text-primary-foreground">
        //     {pmInitials}
        //   </div>
        //   <div className="space-y-0.5">
        //     <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        //       Acting as
        //     </p>
        //     <Select
        //       value={currentPM}
        //       onValueChange={(v: string | null) => v && setCurrentPM(v)}
        //     >
        //       <SelectTrigger className="h-6 w-40 border-none bg-transparent px-0 text-xs font-semibold shadow-none focus:ring-0">
        //         <SelectValue />
        //       </SelectTrigger>
        //       <SelectContent>
        //         {ALL_PMS.map((pm) => (
        //           <SelectItem key={pm} value={pm}>
        //             <div className="flex items-center gap-2">
        //               <User className="size-3.5 text-muted-foreground" />
        //               {pm}
        //             </div>
        //           </SelectItem>
        //         ))}
        //       </SelectContent>
        //     </Select>
        //   </div>
        //   </div>
        // }
      />

      {/* Entity-specific card. MI is now driven entirely by live API
          (procurement-side detail + per-item responses + approve/reject).
          The other four entity types still render off the mock store
          until their own backend endpoints ship. */}
      {entityType === 'mi' && <MIPMApprovalCard miId={id} />}

      {entityType === 'so' && <SalesOrderApprovalDetailPanel soId={id} />}

      {entityType === 'rr' && <ReplacementApprovalPanel rrId={id} />}

      {entityType === 'sret' && <SalesReturnApprovalPanel sretId={id} />}

      {entityType === 'quote' && <QuoteApprovalDetailPanel quoteId={id} />}


      {entityType === 'demo' &&
        (() => {
          if (demoQuery.isLoading) {
            return (
              <Typography variant="body" tone="muted" align="center" asChild>
                <div className="rounded-xl border border-dashed bg-muted/10 p-8">
                  {S.detailBody.loadingDemoRequest}
                </div>
              </Typography>
            )
          }
          if (!demoWire) return <NotFound />
          // Show every item on the demo request; whether the caller can act on
          // a line is the backend `can_approve` flag (gated per line in the
          // card), not an FE product_manager_id match.
          if (demoWire.items.length === 0) {
            return (
              <Typography variant="body" tone="muted" align="center" asChild>
                <div className="rounded-xl border border-dashed bg-muted/10 p-8">
                  {S.detailBody.noDemoItems}
                </div>
              </Typography>
            )
          }
          const scopedDemoWire = demoWire
          const shippingAddress =
            shippingAddressesQuery.data?.find((address) => address.id === demoWire.shipping_address_id)
          const demo = mapDemoForApproval(scopedDemoWire, {
            accountName: accountQuery.data
              ? `${accountQuery.data.name} (${accountQuery.data.code})`
              : undefined,
            contactName: contactQuery.data?.name,
            contactPhone: contactQuery.data?.phone ?? undefined,
            contactEmail: contactQuery.data?.email ?? undefined,
            requestedBy: requestedByQuery.data
              ? getUserDisplayName(requestedByQuery.data)
              : undefined,
            shippingAddress: formatAddressLine(shippingAddress),
            variants: variantLabels,
          })
          return (
            <DemoApprovalCard
              demo={demo}
              onApprove={(demoId, action, remarks, pricedItems) => {
                const targetItemIds = new Set(pricedItems?.map((item) => item.id) ?? [])
                // Only mutate items the caller can actually act on — the
                // backend `can_approve` flag is the source of truth.
                const pendingItems = demoWire.items
                  .filter((item) =>
                    item.can_approve &&
                    (targetItemIds.size === 0 || targetItemIds.has(item.id)),
                  )
                  .map((item) => ({ id: item.id }))
                if (action === 'PM Approved') {
                  approveDemoItems.mutate({
                    demoRequestId: demoId,
                    items: pendingItems,
                    body: { pm_notes: remarks },
                  })
                } else {
                  rejectDemoItems.mutate({
                    demoRequestId: demoId,
                    items: pendingItems.map((item) => ({ id: item.id })),
                    body: {
                      pm_rejection_reason: remarks,
                      pm_notes: remarks,
                    },
                  })
                }
              }}
            />
          )
        })()}
    </div>
  )
}

function NotFound() {
  // Back restores the inbox tab/scroll when there is in-app history, and only
  // falls back to the PM-approvals root on a deep link / fresh load (§10).
  const navigateBack = useNavigateBack(S.detailBody.backHref)
  return (
    <EmptyState
      icon={FileQuestion}
      title={S.detailBody.notFound.title}
      description={S.detailBody.notFound.description}
      action={{ label: S.detailBody.notFound.backButton, onClick: navigateBack }}
    />
  )
}


