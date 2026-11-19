import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { istTodayDateParam } from "@shared/lib/date";
import { usePermission } from "@shared/rbac";

import type { RentalSalesOrderBillingDetail } from "../../api/sales-orders";
import { PO_OPEN_STATUSES } from "../../constants/billing";
import { rentalsCan } from "../../permissions";
import { toAgreementCadence, toAgreementPayload } from "../../lib/agreementCadence";
import {
  fitCadenceToPeriod,
  validateCadence,
  type BillingSettings,
  type RentalPeriod,
} from "../../lib/cadence";
import {
  emptyPoPaper,
  isPoPaperTouched,
  poPaperPayload,
  poPaperProblem,
  poPeriodProblem,
  type PoPaper,
} from "../../lib/poPaper";
import { useAccountBillingSettings } from "../accounts/useAccountBillingSettings";
import { useOrderPurchaseOrders } from "../purchase-orders/usePurchaseOrders";
import { AGREEMENTS_HOOKS_STRINGS as S } from "./agreements-hooks.strings";
import { useConfigureSo, useRentalSalesOrderConfigVersions } from "./useAgreement";

interface Options {
  salesOrderId: string;
  detail: RentalSalesOrderBillingDetail;
  accountId: string | null;
  backHref: string;
}

export interface PoPeriod {
  validFrom: string;
  validTo: string;
}

/** The PO entered with the terms: its paper and period, and whether the form
 *  needs one at all (PO Required ticked on an order not yet on a PO). */
function usePoEntry(salesOrderId: string, orderEnd: string | null, poRequired: boolean) {
  const pos = useOrderPurchaseOrders(salesOrderId);
  const onPo = (pos.data?.items ?? []).some((po) => PO_OPEN_STATUSES.has(po.status));
  const [paper, setPaper] = useState<PoPaper>(() => emptyPoPaper(istTodayDateParam()));
  const [period, setPeriod] = useState<PoPeriod>({ validFrom: "", validTo: orderEnd ?? "" });
  // Recording the PO is `crm:manage | rentals:po_manage`, not the
  // configure code: without it the terms still save, and the order waits
  // as Awaiting PO for someone who can record it (RBAC audit 2026-10-30).
  const canRecord = usePermission().canAny(rentalsCan.managePurchaseOrders);
  const missing = poRequired && pos.isSuccess && !onPo;
  const needed = missing && canRecord;
  const deferred = missing && !canRecord;

  function problem(): string | null {
    if (poRequired && pos.isPending) return S.poLoading;
    if (!needed) return null;
    return (
      poPaperProblem(paper) ??
      (paper.available ? poPeriodProblem(period.validFrom, period.validTo, orderEnd) : null)
    );
  }

  const request = needed
    ? {
        payload: {
          ...poPaperPayload(paper),
          // Awaited: the PO's period is not known yet; it runs to the order's end.
          valid_from: paper.available ? period.validFrom || null : null,
          valid_to: paper.available ? period.validTo || null : null,
        },
        file: paper.available ? paper.file : null,
      }
    : null;
  const touched = needed && (isPoPaperTouched(paper) || period.validTo !== (orderEnd ?? ""));

  return { onPo, needed, deferred, paper, setPaper, period, setPeriod, problem, request, touched };
}

/** The Configure / Amend form: draft, amend reason, the PO when PO Required is
 *  ticked, validation and save. Seeded once at mount — the page re-keys it
 *  when the version changes. */
export function useRentalAgreementForm({ salesOrderId, detail, accountId, backHref }: Options) {
  const navigate = useNavigate();
  // `configured_at` is stamped, so a save SUPERSEDES the version — hence the reason.
  const isAmend = detail.is_configured;
  const configure = useConfigureSo(salesOrderId);
  const versions = useRentalSalesOrderConfigVersions(salesOrderId, { enabled: isAmend });
  const accountSettings = useAccountBillingSettings(accountId);
  const orderEnd = detail.config?.end_date ?? null;
  // The order's own dates: a cycle longer than the rental is refused, and a
  // rental shorter than a month starts on a custom cycle of its length.
  const rentalPeriod: RentalPeriod = { start: detail.config?.start_date, end: detail.config?.end_date };

  const [seed, setSeed] = useState<BillingSettings>(() =>
    fitCadenceToPeriod(toAgreementCadence(detail.config), rentalPeriod),
  );
  const [draft, setDraft] = useState<BillingSettings>(seed);
  const po = usePoEntry(salesOrderId, orderEnd, draft.po_required === true);
  // A null `invoicing_mode` means "follow the account": once the account's
  // defaults land, show its value selected (and move `seed` so the unsaved
  // guard doesn't read it as an edit). An order with its own mode keeps it.
  const [inherited, setInherited] = useState(false);
  const accountMode = accountSettings.data?.invoicing_mode;
  if (!inherited && seed.invoicing_mode === null && accountMode) {
    setInherited(true);
    setSeed((s) => ({ ...s, invoicing_mode: accountMode }));
    setDraft((d) => (d.invoicing_mode === null ? { ...d, invoicing_mode: accountMode } : d));
  }
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  function update(next: BillingSettings) {
    setDraft(next);
    setError(null);
  }

  function save() {
    const problem = validateCadence(draft, rentalPeriod) ?? po.problem();
    setError(problem);
    if (problem) return;
    // Land where the NEXT step is: from rentals, the agreement (to approve it).
    const next = backHref === "/rentals/sales-orders" ? `/rentals/agreements/${salesOrderId}` : backHref;
    const payload = toAgreementPayload(draft, isAmend ? reason.trim() || null : null);
    configure.mutate({ payload, po: po.request }, { onSuccess: () => navigate(next) });
  }

  return {
    isAmend,
    draft,
    update,
    reason,
    setReason,
    error,
    isDirty: JSON.stringify(draft) !== JSON.stringify(seed) || reason.trim() !== "" || po.touched,
    save,
    saving: configure.isPending,
    versions: versions.data ?? [],
    orderEnd,
    rentalPeriod,
    po: {
      needed: po.needed,
      deferred: po.deferred,
      locked: po.onPo,
      paper: po.paper,
      setPaper: (next: PoPaper) => {
        po.setPaper(next);
        setError(null);
      },
      period: po.period,
      setPeriod: (next: PoPeriod) => {
        po.setPeriod(next);
        setError(null);
      },
    },
  };
}
