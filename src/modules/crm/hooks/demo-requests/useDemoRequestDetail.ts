import { useMemo } from "react"
import { useLocation, useNavigate, useParams } from "react-router-dom"

import { useNavigateBack } from "@/hooks/use-navigate-back"
import { usePartsByIds, useVariantsByIds, type Part } from "@modules/ims"
import { getUserDisplayName, useUser, useUsersByIds } from "@modules/users"

import { useDemoRequest } from "./useDemoRequests"
import { useAccount, useAccountAddresses } from "../accounts/useAccounts"
import { useContact } from "../contacts/useContacts"
import { useDeal } from "../deals/useDeals"
import { useLead } from "../leads/useLeads"
import type { DemoStatusLabel } from "../../constants/demo-request-status"
import type { DetailLineBrief } from "../../components/shared/detail-docs/SourceLineLabel"
import {
  formatAddress,
  getActiveStage,
  mapWireDemo,
  variantLabelFromWire,
  type VariantLabel,
} from "../../components/demo-requests/demoRequestDetailHelpers"

// Container logic for the Demo Request detail page: the demo query plus the
// account/contact/address/lead/deal/requester/SO/variant follow-up queries,
// the wire→view mapping, lifecycle derivations, and the convert-to-SO flow.
export function useDemoRequestDetail() {
  const { id } = useParams<{ id: string }>()
  const goBack = useNavigateBack("/crm/demo-requests")
  const navigate = useNavigate()
  // A create flow passes an explicit back target via router state.
  const backTo = (useLocation().state as { backTo?: string } | null)?.backTo
  const demoQuery = useDemoRequest(id)
  // Account + contact are fetched purely for DISPLAY here, so bypass the
  // per-record access gate: the linked account/contact should render even when
  // the viewer can see the demo request but not its account/contact.
  const accountQuery = useAccount(demoQuery.data?.account_id, { bypassAccess: true })
  const contactQuery = useContact(demoQuery.data?.contact_id, { bypassAccess: true })
  const addressesQuery = useAccountAddresses(demoQuery.data?.account_id)
  const leadQuery = useLead(demoQuery.data?.lead_id ?? "")
  const dealQuery = useDeal(demoQuery.data?.deal_id)
  const requestedByQuery = useUser(demoQuery.data?.requested_by_id ?? "")
  const shippingAddress = useMemo(
    () =>
      addressesQuery.data?.find(
        (address) => address.id === demoQuery.data?.shipping_address_id,
      ),
    [addressesQuery.data, demoQuery.data?.shipping_address_id],
  )
  const variantIds = useMemo(
    () => Array.from(new Set(demoQuery.data?.items.map((item) => item.variant_id) ?? [])),
    [demoQuery.data?.items],
  )
  // Batched via the IMS module's own hooks so the cache keys stay owned by
  // IMS (no foreign queryKey literals here).
  const variantQueries = useVariantsByIds(variantIds)
  // Category + OEM/brand live on the parent Part, not the variant. Resolve the
  // unique set of parent parts so each line shows its real category instead of
  // the "Uncategorized" / "Catalog" fallback.
  const partIds = useMemo(
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
  const partQueries = usePartsByIds(partIds)
  const partsById = useMemo(() => {
    const out = new Map<string, Part>()
    for (const [idx, partId] of partIds.entries()) {
      const part = partQueries[idx]?.data
      if (part) out.set(partId, part)
    }
    return out
  }, [partIds, partQueries])
  const variantLabels = useMemo(() => {
    const out: Record<string, VariantLabel | undefined> = {}
    for (const [idx, variantId] of variantIds.entries()) {
      const variant = variantQueries[idx]?.data
      const part = variant?.part_id ? partsById.get(variant.part_id) : undefined
      out[variantId] = variantLabelFromWire(variant, part)
    }
    return out
  }, [variantIds, variantQueries, partsById])

  // demo_request_item.id → source-line brief, so the Material Issues + Dispatch
  // accordions can label which ordered line each issued/dispatched unit is for.
  // Built from RAW wire items (not the collapsed display items) so every
  // source_id resolves.
  const lineById = useMemo(() => {
    const map = new Map<string, DetailLineBrief>()
    for (const item of demoQuery.data?.items ?? []) {
      const label = variantLabels[item.variant_id]
      map.set(item.id, { name: label?.name ?? "Catalog item", description: label?.sku ?? null })
    }
    return map
  }, [demoQuery.data?.items, variantLabels])

  // Default sell price per demo_request_item_id — the convert-to-SO dialog
  // prefills each dispatched unit's price from its source demo line.
  const priceByItemId = useMemo(() => {
    const map: Record<string, number> = {}
    for (const item of demoQuery.data?.items ?? []) {
      map[item.id] = Number(item.unit_price)
    }
    return map
  }, [demoQuery.data?.items])

  // Per-item approver (product manager) names. Each line carries its own
  // `product_manager_id`; resolve the unique set to display names via the
  // users module's batch hook (shares the USERS_DETAIL cache with `useUser`,
  // and keeps the users queryKey owned by that module).
  const productManagerIds = useMemo(
    () =>
      Array.from(
        new Set(
          (demoQuery.data?.items ?? [])
            .map((item) => item.product_manager_id)
            .filter((pmId): pmId is string => Boolean(pmId)),
        ),
      ),
    [demoQuery.data?.items],
  )
  const { displayNameById: productManagerLabels } =
    useUsersByIds(productManagerIds)

  const demo = useMemo(
    () =>
      demoQuery.data
        ? mapWireDemo(demoQuery.data, {
            accountName: accountQuery.data
              ? `${accountQuery.data.name}${accountQuery.data.code ? ` (${accountQuery.data.code})` : ""}`
              : undefined,
            contactName: contactQuery.data?.name,
            contactPhone: contactQuery.data?.phone ?? undefined,
            contactEmail: contactQuery.data?.email ?? undefined,
            shippingAddress: formatAddress(shippingAddress),
            requestedBy: requestedByQuery.data
              ? getUserDisplayName(requestedByQuery.data)
              : undefined,
            leadName: leadQuery.data
              ? leadQuery.data.company_name ?? leadQuery.data.contact_name ?? leadQuery.data.lead_code
              : undefined,
            dealName: dealQuery.data
              ? `${dealQuery.data.deal_number} · ${dealQuery.data.title}`
              : undefined,
            variants: variantLabels,
            productManagers: productManagerLabels,
          })
        : null,
    [
      accountQuery.data,
      contactQuery.data,
      dealQuery.data,
      demoQuery.data,
      leadQuery.data,
      requestedByQuery.data,
      shippingAddress,
      variantLabels,
      productManagerLabels,
    ],
  )

  // Derived lifecycle / totals — safe defaults when `demo` is still null.
  const activeStage = demo ? getActiveStage(demo.status) : 0
  const isRejected = demo?.status === "PM Rejected"
  const isOverdue = !!demo?.isOverdue
  const totalItems = demo ? demo.items.reduce((s, i) => s + i.qty, 0) : 0
  const approvedTotal = demo ? demo.items.reduce((s, i) => s + (i.unitPrice ?? 0) * i.qty, 0) : 0
  // The convert-to-SO action is offered once the demo has reached a
  // dispatched-or-later lifecycle status. We gate on the header status so the
  // button stays VISIBLE even when no unit is eligible yet — the dialog then
  // lists the dispatched units (or explains why there are none) instead of the
  // action silently vanishing. Per-serial eligibility is sourced from the
  // dispatched-units endpoint inside the dialog and re-validated by the backend.
  const CONVERT_ELIGIBLE_STATUSES: DemoStatusLabel[] = [
    "Dispatched",
    "With Customer",
    "Return Overdue",
    "Returned",
  ]
  const canCreateSO = !!demo && CONVERT_ELIGIBLE_STATUSES.includes(demo.status)

  return {
    demo,
    lineById,
    priceByItemId,
    demoQuery,
    backTo,
    navigate,
    goBack,
    activeStage,
    isRejected,
    isOverdue,
    totalItems,
    approvedTotal,
    canCreateSO,
  }
}
