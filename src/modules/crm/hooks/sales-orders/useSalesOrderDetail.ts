import { useState } from "react";
import {
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { toast } from "sonner";

import { useAllCategories, useOEMsByIds } from "@modules/ims"
import { lastRecentLocation } from "@shared/hooks/useRecentLocations"

import { useAccount, useAccountAddresses } from "../accounts/useAccounts";
import { soListHref } from "./soListHref";
import { useContact } from "../contacts/useContacts";
import { useLead } from "../leads/useLeads";
import { useDeal } from "../deals/useDeals";
import {
  useDeleteSalesOrder,
  useReviseSalesOrder,
  useSalesOrder,
  useSubmitSalesOrder,
} from "./useSalesOrders";
import { useQuote } from "../quotes/useQuotes";
import { SALES_ORDERS_STRINGS as S } from "../../components/sales-orders/sales-orders.strings";

// Container logic for the Sales Order detail page: loads the SO, hydrates every
// FK (account / contact / addresses / linked quote / upstream source entity)
// into readable labels, resolves IMS categories, and owns the delete/submit
// dialog state + handlers.
//
// `soIdOverride` lets a page outside `/crm/sales-orders/:id` reuse it — the
// rentals agreement page renders this same layout on its own route, whose
// param is not `:id`. Omitted, the id comes from the CRM route as before.
export function useSalesOrderDetail(soIdOverride?: string) {
  const { id: routeSoId } = useParams<{ id: string }>();
  const soId = soIdOverride ?? routeSoId;
  const navigate = useNavigate();
  // A create flow (e.g. Closed Won → create SO) passes an explicit back
  // target via router state; when present the back button returns there
  // instead of doing browser-back to the conversion wizard.
  const backTo = (useLocation().state as { backTo?: string } | null)?.backTo
  // This page is shared: a sales order is reached from the CRM list AND
  // from the rentals SO list, which shows the same orders through the
  // rental contract's lens. Back must return to whichever list was left,
  // not always to CRM's — the `?from=` convention the account detail and
  // the WMS device queues already use.
  //
  // Non-rental callers get the CRM list URL stamped with the last-seen
  // `?page=…&so_size=…` (soListHref) so the breadcrumb returns to the same
  // page, not page 1.
  const [searchParams] = useSearchParams()
  const [crmListHref] = useState(soListHref)
  const backHref =
    searchParams.get("from") === "rentals"
      ? "/rentals/sales-orders"
      : crmListHref
  // Back returns to the page the user came from (the list at page 3, an
  // account's 360 tab, a deal …), skipping this module's own record routes —
  // detail / edit / new / amend — so an edit or amend round trip does not land
  // back on the form or on a pre-edit copy of this page. `backTo` (create flows)
  // still wins; with nothing on record (reload, deep link) it is `backHref`.
  // When that page is behind us in history, step BACK to it rather than
  // pushing it again — a push would leave this SO behind the parent, and the
  // parent's own Back (`navigate(-1)`) would bounce straight back here.
  const goBack = () => {
    if (backTo) return navigate(backTo)
    const target = lastRecentLocation((p) => /^\/crm\/sales-orders\/./.test(p))
    if (target?.delta != null) return navigate(target.delta)
    navigate(target?.url ?? backHref)
  }
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [submitOpen, setSubmitOpen] = useState(false)
  const [reviseOpen, setReviseOpen] = useState(false)
  const [reviseReason, setReviseReason] = useState("")

  const soQuery = useSalesOrder(soId);
  const so = soQuery.data;
  const deleteMut = useDeleteSalesOrder();
  const submitMut = useSubmitSalesOrder(soId ?? "");
  const reviseMut = useReviseSalesOrder(soId ?? "");

  // Hydrate FK columns into readable labels. Each query auto-disables
  // when the SO hasn't loaded yet so we don't fire round-trips against
  // empty IDs. Addresses are fetched once per account and filtered.
  // Account + contact are fetched purely for DISPLAY here, so bypass the
  // per-record access gate: the account/contact block should render even when
  // the viewer can see the SO but not its linked account/contact.
  const accountQuery = useAccount(so?.account_id, { bypassAccess: true });
  const contactQuery = useContact(so?.contact_id, { bypassAccess: true });
  const addressesQuery = useAccountAddresses(so?.account_id ?? null);
  const linkedQuoteQuery = useQuote(so?.sales_quote_id ?? null);

  // Resolve the upstream entity's human-readable number for the Source row
  // (lead_code / deal_number / account.code). The detail wire doesn't ship
  // `orderable_number` — only the list response does — so we look it up
  // client-side. Each hook auto-gates on its empty-id sentinel; only the
  // one matching `orderable_type` actually fires a network request.
  const orderableType = so?.orderable_type;
  const orderableId = so?.orderable_id ?? null;
  const sourceLeadQuery = useLead(
    orderableType === "lead" && orderableId ? orderableId : "",
  );
  const sourceDealQuery = useDeal(
    orderableType === "deal" ? orderableId : null,
  );
  const sourceAccountQuery = useAccount(
    orderableType === "account" ? orderableId : null,
    { bypassAccess: true },
  );
  const sourceCode =
    orderableType === "lead"
      ? (sourceLeadQuery.data?.lead_code ?? null)
      : orderableType === "deal"
        ? (sourceDealQuery.data?.deal_number ?? null)
        : orderableType === "account"
          ? (sourceAccountQuery.data?.code ?? null)
          : null;
  const sourceLoading =
    orderableType === "lead"
      ? sourceLeadQuery.isLoading
      : orderableType === "deal"
        ? sourceDealQuery.isLoading
        : orderableType === "account"
          ? sourceAccountQuery.isLoading
          : false;
  const billingAddress = addressesQuery.data?.find(
    (a) => a.id === so?.billing_address_id,
  );
  const shippingAddress = addressesQuery.data?.find(
    (a) => a.id === so?.shipping_address_id,
  );

  // Resolve IMS category UUIDs on every line into human names. One
  // global fetch is cheaper than per-line lookups; the result is cached
  // and shared across the page (any other component using
  // `useAllCategories` shares this query).
  const allCategoriesQuery = useAllCategories();
  const categoryNameById = new Map(
    (allCategoriesQuery.data ?? []).map((c) => [c.id, c.name] as const),
  );

  // Same id → name resolution for per-line Brand/OEM. Unlike categories there's
  // no "fetch all OEMs" hook (the pickers are paginated per §16.11), so resolve
  // only the ids actually on this SO. `items` is flat — headlines and BOM
  // children alike — so one pass over it covers both. De-duped: a 10-line SO
  // from one OEM issues a single request, and each id is cached/shared.
  const oemIds = Array.from(
    new Set(
      (so?.items ?? []).map((i) => i.oem_id).filter((id): id is string => !!id),
    ),
  );
  const oemQueries = useOEMsByIds(oemIds);
  const oemNameById = new Map(
    oemQueries
      .map((q) => q.data)
      .filter((o): o is NonNullable<typeof o> => !!o)
      .map((o) => [o.id, o.name] as const),
  );

  const isDraft = so?.status === "Draft";
  // Only a Rejected SO can be returned to Draft via POST /revise; every other
  // status hides the button (the backend would 400 SO_REVISE_FROM_NON_REJECTED).
  const isRejected = so?.status === "Rejected";

  async function handleDelete() {
    if (!soId) return;
    try {
      await deleteMut.mutateAsync(soId);
      navigate(backHref);
    } catch {
      // toast already fired by the hook
    }
  }

  // Lines with no approver are allowed — the backend bypasses PM approval for
  // them (a NULL approver_id means that line skips the approval gate). We still
  // count them so the dialog can show an informational note before submitting.
  function missingApproverCount(): number {
    return so ? so.items.filter((i) => !i.approver_id).length : 0;
  }

  async function handleSubmit() {
    if (!soId) return;
    if (so && so.items.length === 0) {
      toast.error(S.toast.submitNoLines);
      return;
    }
    setSubmitOpen(false);
    try {
      await submitMut.mutateAsync();
    } catch {
      // hook fires toast
    }
  }

  async function handleRevise() {
    if (!soId) return;
    // Reason is mandatory — the dialog validates before calling, but guard
    // here too so no code path can amend without audit context.
    if (!reviseReason.trim()) return;
    setReviseOpen(false);

    // "Account Rejected" amends need a NEW approved account + contact/addresses
    // (and may edit line items), so they don't /revise from the modal. Instead
    // we hand off to the full amend form, carrying the reason via router state.
    if (so?.status === "Account Rejected") {
      const reason = reviseReason.trim();
      setReviseReason("");
      navigate(`/crm/sales-orders/${soId}/amend`, {
        state: { amendReason: reason },
      });
      return;
    }

    try {
      // /revise returns a NEW SO (v(N+1) Draft) — jump straight to its EDIT
      // form so the user keeps editing the new revision without an extra click.
      const next = await reviseMut.mutateAsync(reviseReason);
      setReviseReason("");
      navigate(`/crm/sales-orders/${next.id}/edit`, { replace: true });
    } catch {
      // hook fires toast
    }
  }

  return {
    soId,
    so,
    navigate,
    backHref,
    backTo,
    goBack,
    isLoading: soQuery.isLoading,
    isError: soQuery.isError,
    deleteOpen,
    setDeleteOpen,
    submitOpen,
    setSubmitOpen,
    reviseOpen,
    setReviseOpen,
    reviseReason,
    setReviseReason,
    accountQuery,
    contactQuery,
    addressesQuery,
    linkedQuoteQuery,
    sourceCode,
    sourceLoading,
    billingAddress,
    shippingAddress,
    categoryNameById,
    oemNameById,
    isDraft,
    isRejected,
    deleteMut,
    submitMut,
    reviseMut,
    handleDelete,
    handleSubmit,
    handleRevise,
    missingApproverCount,
  };
}

export type SalesOrderDetailController = ReturnType<typeof useSalesOrderDetail>;
