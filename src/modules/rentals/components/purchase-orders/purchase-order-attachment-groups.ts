import type { SoAttachmentGroup } from "@modules/crm";

import type { RentalPurchaseOrderDocument } from "../../api/purchase-orders";
import { PURCHASE_ORDER_STRINGS as S } from "./purchase-orders.strings";

/** The order's PO papers as Attachments-section groups — one per PO, in the
 *  order the API returns them (newest PO first). */
export function toPurchaseOrderAttachmentGroups(
  documents: readonly RentalPurchaseOrderDocument[],
): SoAttachmentGroup[] {
  const byPo = new Map<string, SoAttachmentGroup>();
  for (const doc of documents) {
    const key = `customer-po::${doc.purchase_order_id}`;
    const group = byPo.get(key) ?? { key, title: S.attachmentsGroup(doc.po_number ?? null), items: [] };
    group.items.push(doc);
    byPo.set(key, group);
  }
  return Array.from(byPo.values());
}
