import { z } from "zod"

// Zod messages live with the schema, not in the strings file (§9 / §16.12).

/**
 * One physical unit the customer is authorised to send back.
 *
 * `pinnedDriId` is ADVISORY — it records which unit sales expects. The
 * warehouse may legitimately return a different unit of the same variant, so
 * this is a traceability aid, never a promise.
 */
const salesReturnReasonSchema = z.enum(["customer_return", "damage_in_transit"], {
  message: "Pick a reason",
})

export const salesReturnUnitSelectionSchema = z.object({
  dispatchRequestItemId: z.string().uuid(),
  salesOrderItemId: z.string().uuid(),
  partVariantId: z.string().uuid(),
  internalSerial: z.string(),
  label: z.string(),
  // Per-unit reason (`items[].item_reason`). Starts EMPTY — never preselected;
  // the operator picks it per row (or fills all via the bulk bar). Sent as
  // null when left blank (the API accepts a null item_reason).
  itemReason: salesReturnReasonSchema.or(z.literal("")),
  // Per-unit note (`items[].notes`) — optional context for this one unit.
  notes: z.string(),
})

export const salesReturnFormBaseSchema = z.object({
  salesOrderId: z.string().uuid("Choose a sales order"),
  reason: salesReturnReasonSchema,
  description: z.string().optional(),
  notes: z.string().optional(),

  // Logistics — recorded so the warehouse can expect the shipment. "Who moves
  // it" is mandatory BUT only for a warehouse raiser, so it is
  // required conditionally in `makeSalesReturnFormSchema` and stays optional
  // here. The rest is optional context.
  pickupBy: z.enum(["us", "customer"]).optional(),
  courierName: z.string().max(100, "Courier name can't exceed 100 characters.").optional(),
  awbNumber: z.string().max(100, "AWB number can't exceed 100 characters.").optional(),
  expectedArrivalDate: z.string().optional(),
  // NOTE: `return_to_warehouse_id` is accepted by the API but no control ever
  // set it, so it was dead form state. Dropped; the create body sends null.

  units: z
    .array(salesReturnUnitSelectionSchema)
    .min(1, "Select at least one unit"),
})

export type SalesReturnFormInput = z.infer<typeof salesReturnFormBaseSchema>

/**
 * The form schema, parameterised by whether the raiser can set logistics.
 * A warehouse raiser (holds `wms:returns_*`) sees the Logistics section, so
 * "Who moves it" (`pickupBy`) is required. A CRM raiser never sees the
 * section, so it stays optional and the request is saved with logistics null;
 * the warehouse fills it in later on the detail page.
 */
export function makeSalesReturnFormSchema(requireLogistics: boolean) {
  if (!requireLogistics) return salesReturnFormBaseSchema
  return salesReturnFormBaseSchema.superRefine((val, ctx) => {
    if (!val.pickupBy) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["pickupBy"],
        message: "Choose who moves it",
      })
    }
  })
}
export type SalesReturnUnitSelection = z.infer<
  typeof salesReturnUnitSelectionSchema
>
