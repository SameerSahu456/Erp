import type { StatusBadgeVariant } from "@/components/common/display/StatusBadge";
import { PAGINATION } from "@shared/constants/pagination";
import { formatIST_date } from "@shared/lib/date";
import { toSortParam } from "@shared/lib/sort-param";

import type {
  VendorJobListParams,
  VendorJobStage,
  VendorJobStats,
  VendorJobSummary,
} from "../../api/service-jobs";
import { VENDOR_JOBS_STRINGS as S } from "./vendor-jobs.strings";

const DASH = "—";

export type VendorJobTabId = VendorJobStage | "not_ok" | "all";

export const VENDOR_JOB_TAB_IDS: readonly VendorJobTabId[] = [
  "awaiting_vendor",
  "with_vendor",
  "returned",
  "not_ok",
  "cancelled",
  "all",
];
export const VENDOR_JOB_DEFAULT_TAB: VendorJobTabId = "with_vendor";

/** §16.6 — one page-size per page, derived from the global default. */
export const VENDOR_JOBS_PAGE_SIZE = PAGINATION.DEFAULT_PAGE_SIZE;

/** Backend search limit — a long paste is capped so it can't 422. */
export const VENDOR_JOBS_SEARCH_MAX = 50;

export const VENDOR_JOB_STAGE_VARIANT: Record<string, StatusBadgeVariant> = {
  awaiting_vendor: "warning",
  with_vendor: "info",
  returned: "success",
  cancelled: "neutral",
};

/** Table column key → the server's `sort` field. Only "Sent" has a stable
 *  server ordering beyond the default; the rest fall back to newest-first. */
const SORT_FIELD_MAP: Readonly<Record<string, string>> = { sent: "vendor_sent_at" };
const DEFAULT_SORT: NonNullable<VendorJobListParams["sort"]> = "-created_at";

export function vendorJobSortParam(
  column: string | null,
  direction: "asc" | "desc" | null,
): VendorJobListParams["sort"] {
  return (toSortParam(column, direction, SORT_FIELD_MAP) ?? DEFAULT_SORT) as VendorJobListParams["sort"];
}

/** Tab → server filters; failed returns appear only under "Returned — not OK". */
export function filtersForTab(tab: VendorJobTabId): Partial<Pick<VendorJobListParams, "stage" | "outcome">> {
  if (tab === "all") return {};
  if (tab === "not_ok") return { stage: "returned", outcome: "fail" };
  if (tab === "returned") return { stage: "returned", outcome: "pass" };
  return { stage: tab };
}

/** "Returned" excludes failed returns; falls back to `returned - not_ok` on older backends. */
export function tabCount(id: VendorJobTabId, stats: VendorJobStats | undefined): number {
  if (!stats) return 0;
  if (id === "returned") return stats.returned_ok ?? Math.max(0, stats.returned - stats.not_ok);
  return stats[id] ?? 0;
}

export function vendorJobRow(job: VendorJobSummary): Record<string, unknown> {
  const item = job.item_description ?? DASH;
  return {
    id: job.id,
    stockItemId: job.stock_item_id,
    device: job.internal_serial ?? DASH,
    section: job.section_name ?? DASH,
    // cycle_number > 1 marks a re-send; without it a chain reads as several
    // unrelated jobs.
    item: job.cycle_number > 1 ? `${item} (${S.columns.trip} ${job.cycle_number})` : item,
    serial: job.item_serial_no ?? DASH,
    vendor: job.vendor_name ?? DASH,
    sent: job.vendor_sent_at ? formatIST_date(job.vendor_sent_at) : DASH,
    returned: job.vendor_returned_at ? formatIST_date(job.vendor_returned_at) : DASH,
    outcome: job.outcome ?? "",
    stage: job.stage,
    disposition: job.return_disposition ?? "",
    replacementSerial: job.replacement_serial_no ?? DASH,
    actions: job.id,
  };
}

/** The Section column shows only on the cross-section view; Disposition /
 *  Replacement Serial only when every section in view tracks replacement. */
export function vendorJobColumns(showSection: boolean, showReplacement: boolean) {
  return [
    { key: "device", label: S.columns.device },
    ...(showSection ? [{ key: "section", label: S.columns.section }] : []),
    { key: "item", label: S.columns.item },
    { key: "serial", label: S.columns.serial },
    { key: "vendor", label: S.columns.vendor },
    { key: "sent", label: S.columns.sent, sortable: true },
    { key: "returned", label: S.columns.returned },
    { key: "outcome", label: S.columns.outcome },
    ...(showReplacement
      ? [
          { key: "disposition", label: S.columns.disposition },
          { key: "replacementSerial", label: S.columns.replacementSerial },
        ]
      : []),
    { key: "actions", label: S.columns.actions, align: "right" as const },
  ];
}
