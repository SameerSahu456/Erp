import { useState } from "react";
import { useNavigate } from "react-router-dom";

import type { AsyncSelectOption } from "@/components/ui/async-select";
import { PAGINATION } from "@/shared/constants";
import { istTodayDateParam } from "@shared/lib/date";

import type { AdhocInvoiceRequest } from "../../api/invoices";
import { useRentalSalesOrders } from "../agreements/useRentalSalesOrders";
import { useAdhocInvoicePreview, useRaiseAdhocInvoice } from "./useRentalInvoices";

const LIST = "/rentals/invoices";

interface Draft {
  account: { id: string; name: string } | null;
  selected: string[];
  billUpTo: string;
  issueDate: string;
  creditDays: string;
}

/** What the price preview needs: the orders and the date billed up to. The
 *  issue date and credit terms only set the invoice number and due date,
 *  which the preview does not show — so they are left out, and editing them
 *  does not re-price. Save sends them (`toRequest`). */
function toPreviewRequest(d: Draft): AdhocInvoiceRequest | null {
  const request = toRequest(d);
  return request ? { ...request, issue_date: null, credit_period_days: null } : null;
}

/** The request, or null while it is not yet answerable. */
function toRequest(d: Draft): AdhocInvoiceRequest | null {
  if (!d.account || !d.selected.length || !d.billUpTo) return null;
  return {
    account_id: d.account.id,
    sales_order_ids: d.selected,
    bill_up_to: d.billUpTo,
    issue_date: d.issueDate || null,
    credit_period_days: d.creditDays === "" ? null : Number(d.creditDays),
  };
}

/** Raise-an-invoice form state: the account (id + name straight off the
 *  picker), its configured orders, and the live price preview. */
export function useNewRentalInvoice() {
  const navigate = useNavigate();
  const [account, setAccount] = useState<Draft["account"]>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [billUpTo, setBillUpTo] = useState(istTodayDateParam);
  const [issueDate, setIssueDate] = useState("");
  const [creditDays, setCreditDays] = useState("");

  // One page of the account's orders; only once an account is picked.
  const orders = useRentalSalesOrders(
    { account_id: account?.id, page_size: PAGINATION.MAX_PAGE_SIZE },
    { enabled: !!account },
  );
  const selectable = (orders.data?.items ?? []).filter((r) => r.is_configured);

  const draft = { account, selected, billUpTo, issueDate, creditDays };
  const request = toPreviewRequest(draft);
  const preview = useAdhocInvoicePreview(request);
  const raise = useRaiseAdhocInvoice();

  const pickAccount = (opt: AsyncSelectOption | null) => {
    setAccount(opt ? { id: opt.id, name: opt.label } : null);
    // The chosen orders belong to the previous account; the API refuses them.
    setSelected([]);
  };
  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const save = () => {
    const payload = toRequest(draft);
    if (payload) raise.mutate(payload, { onSuccess: () => navigate(LIST) });
  };

  return {
    account,
    pickAccount,
    billUpTo,
    setBillUpTo,
    issueDate,
    setIssueDate,
    creditDays,
    setCreditDays,
    orders,
    selectable,
    selected,
    toggle,
    preview,
    priced: request ? preview.data : undefined,
    // The preview on screen prices exactly what Save would send.
    pricingSettled: !preview.isFetching,
    raise,
    save,
    cancel: () => navigate(LIST),
    isDirty: !!account || selected.length > 0,
  };
}

export type NewRentalInvoiceState = ReturnType<typeof useNewRentalInvoice>;
