import { Typography } from "@/components/ui/typography"

import type { PurchaseOrderItemView } from "../../api"
import { DASH } from "./po-detail-helpers"

/** The line's identity: part number (strong) over part name, plus variant SKU
 *  when it differs. Free-text lines have no part, so the Description column
 *  carries their text and this shows a dash. */
export function ItemCell({ item }: { item: PurchaseOrderItemView }) {
  if (!item.part_number && !item.part_name) {
    return (
      <Typography variant="body" tone="muted" asChild>
        <span className="opacity-60">{DASH}</span>
      </Typography>
    )
  }
  return (
    <div className="min-w-0">
      <Typography variant="body-strong" asChild>
        <p className="break-words">{item.part_number ?? item.part_name}</p>
      </Typography>
      {item.part_number && item.part_name && (
        <Typography variant="helper" tone="muted" asChild>
          <p className="break-words">{item.part_name}</p>
        </Typography>
      )}
      {item.variant_sku && item.variant_sku !== item.part_number && (
        <Typography variant="helper" tone="muted" asChild>
          <p className="break-words">{item.variant_sku}</p>
        </Typography>
      )}
    </div>
  )
}
