import { EntityDocumentsCard } from "../shared/EntityDocumentsCard";
import { TRANSFER_DOCUMENTS_STRINGS as S } from "./stock-transfer.strings";

export const TRANSFER_ENTITY_TYPE = "warehouse_transfers" as const;

/**
 * The paperwork that travels with the truck, rendered through the SHARED WMS
 * documents field ({@link DispatchDocumentsField}) so it reads identically to
 * the dispatch surfaces (RULE ZERO — one documents field, not two).
 *
 * THREE slots — delivery challan, e-way bill, POD — and deliberately NO invoice
 * slot: a transfer between our own warehouses is not a sale, and offering one
 * invites a sales invoice to be attached to an internal movement (spec D15).
 *
 * Uploads stay enabled in EVERY status, including received and cancelled. A POD
 * arrives after receipt by definition, and a corrected challan can land later —
 * the same reasoning already applied to purchase orders.
 */
const TRANSFER_DOC_TYPES = [
  { value: "delivery_challan", label: S.slotChallan },
  { value: "eway_bill", label: S.slotEwayBill },
  { value: "pod", label: S.slotPod },
] as const;

export function TransferDocumentsSection({ transferId }: { transferId: string }) {
  return (
    <EntityDocumentsCard
      entityType={TRANSFER_ENTITY_TYPE}
      entityId={transferId}
      docTypes={TRANSFER_DOC_TYPES}
      title={S.title}
      uploadedSummary={S.uploaded}
      countLabel={S.filesCount}
      compact
    />
  );
}
