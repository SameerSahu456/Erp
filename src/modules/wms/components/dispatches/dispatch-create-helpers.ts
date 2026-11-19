import {
  ArrowLeftRight,
  FileText,
  Monitor,
  Replace,
  type LucideIcon,
} from "lucide-react";

import { type AsyncSelectOption } from "@/components/ui/async-select";
import { isUuid } from "@shared/lib/validation";
import { type DeliveryDetails, type DispatchRequestCreate } from "../../api/dispatch";
import { DISPATCH_CREATE_STRINGS as S } from "./dispatch-create.strings";
import { DISPATCH_STRINGS } from "./dispatches.strings";

// Documents captured at create — staged in the form, uploaded once the dispatch
// exists (attachments key off its id). Mirrors Inward's delivery-challan staging.
export interface StagedDoc {
  id: string;
  file: File;
  document_type: string;
}

// Source types shown as tiles. `entity` maps to the backend SOURCE_ENTITY_TYPE;
// `dispatchType` to its DISPATCH_TYPE. `wired` gates which have a live picker +
// backend flow (Phase A = Sales Order + Demo).
export const SOURCE_TYPES: {
  key: string;
  label: string;
  description: string;
  icon: LucideIcon;
  entity: string;
  dispatchType: DispatchRequestCreate["dispatch_type"];
  wired: boolean;
}[] = [
  {
    key: "sales_orders",
    label: DISPATCH_STRINGS.createBody.sourceTypes.sales_orders.label,
    description:
      DISPATCH_STRINGS.createBody.sourceTypes.sales_orders.description,
    icon: FileText,
    entity: "sales_orders",
    dispatchType: "sale_dispatch",
    wired: true,
  },
  {
    key: "demo_requests",
    label: DISPATCH_STRINGS.createBody.sourceTypes.demo_requests.label,
    description:
      DISPATCH_STRINGS.createBody.sourceTypes.demo_requests.description,
    icon: Monitor,
    entity: "demo_requests",
    dispatchType: "demo_dispatch",
    wired: true,
  },
  {
    key: "replacement_requests",
    label: DISPATCH_STRINGS.createBody.sourceTypes.replacement_requests.label,
    description:
      DISPATCH_STRINGS.createBody.sourceTypes.replacement_requests.description,
    icon: Replace,
    entity: "replacement_requests",
    dispatchType: "replacement_dispatch",
    wired: true,
  },
  {
    key: "staff_requests",
    label: DISPATCH_STRINGS.createBody.sourceTypes.staff_requests.label,
    description:
      DISPATCH_STRINGS.createBody.sourceTypes.staff_requests.description,
    icon: ArrowLeftRight,
    entity: "staff_requests",
    dispatchType: "staff_issuance",
    wired: false,
  },
];

// Logistics form state — string-valued so empty fields are omitted from the
// payload (the backend delivery_details is optional at create).
export interface LogisticsForm {
  courier_tracking_number: string;
  courier: string;
  docket_number: string;
  mode: string;
  number_of_packages: string;
  freight_charges: string;
  freight_paid_by: string;
}
export const EMPTY_LOGISTICS: LogisticsForm = {
  courier_tracking_number: "",
  courier: "",
  docket_number: "",
  mode: "",
  number_of_packages: "",
  freight_charges: "",
  freight_paid_by: "",
};

export const STEP_LABELS = [S.stepSource, S.stepUnits];

/**
 * Parse the "Send to Dispatch" deep link's pre-fill from the URL (§11.1 —
 * URL params are untrusted). The Material Issue page links here with
 * `source_entity_type` + `source_entity_id` (+ optional `source_label`) to
 * seed the wizard's source picker.
 *
 * Valid by construction: the type must be a WIRED source key and the id a real
 * UUID, and BOTH must be present to seed (a type with no id would land on an
 * empty picker). Anything else falls back to the default type with no source,
 * exactly as if the page were opened directly. Returns the initial
 * `sourceTypeKey` + `source` option for the component's `useState`.
 */
export function parseDispatchCreateSeed(params: URLSearchParams): {
  sourceTypeKey: string;
  source: AsyncSelectOption | null;
} {
  const fallback = { sourceTypeKey: "sales_orders", source: null };
  const type = params.get("source_entity_type");
  const id = params.get("source_entity_id");
  const validType = SOURCE_TYPES.some((s) => s.key === type && s.wired);
  if (!type || !validType || !isUuid(id)) return fallback;
  const label = params.get("source_label")?.trim() || id;
  return { sourceTypeKey: type, source: { id, label } };
}

// Only non-empty fields — the backend schema is `extra: forbid`, so send a
// trimmed object (or nothing) rather than blank strings.
export function buildDeliveryDetails(logi: LogisticsForm): DeliveryDetails | undefined {
  const d: Record<string, unknown> = {};
  if (logi.courier_tracking_number.trim())
    d.courier_tracking_number = logi.courier_tracking_number.trim();
  if (logi.courier.trim()) d.courier = logi.courier.trim();
  if (logi.docket_number.trim()) d.docket_number = logi.docket_number.trim();
  if (logi.mode) d.mode = logi.mode;
  if (logi.number_of_packages.trim())
    d.number_of_packages = Number(logi.number_of_packages);
  if (logi.freight_charges.trim())
    d.freight_charges = logi.freight_charges.trim();
  if (logi.freight_paid_by) d.freight_paid_by = logi.freight_paid_by;
  return Object.keys(d).length ? (d as DeliveryDetails) : undefined;
}

// Create-time metadata: delivery details and/or the invoice amount (billing,
// not delivery), or nothing when neither was entered.
export function buildCreateMetadata(
  delivery: DeliveryDetails | undefined,
  invoiceAmount: string,
): DispatchRequestCreate["metadata"] {
  if (!delivery && !invoiceAmount.trim()) return undefined;
  return {
    ...(delivery ? { delivery_details: delivery } : {}),
    ...(invoiceAmount.trim()
      ? { billing_details: { invoice_amount: invoiceAmount } }
      : {}),
  };
}
