import { z } from "zod"

// Zod messages live with the schema, not in the strings file (§9 / §16.12).

/** The backend's per-request line cap (`RRET_MAX_LINES`): one line per unit. */
export const RENTAL_RETURN_MAX_UNITS = 2000

/**
 * One unit the customer is sending back, ticked on the order's unit list —
 * the same per-unit shape as a sales return. Each becomes its own request
 * line pinned to that unit, and the warehouse may receive only the units
 * the request names (a unit of the same model on the same order line can
 * stand in, as on a sales return); anything else is held at inward.
 *
 * A migrated (legacy) unit has no dispatch record and no model: it is
 * pinned by its rental device and named by its order line.
 */
export const rentalReturnUnitPickSchema = z.object({
  key: z.string(),
  salesOrderItemId: z.string().uuid(),
  partVariantId: z.string().uuid().nullable(),
  dispatchRequestItemId: z.string().uuid().nullable(),
  rentalDeviceId: z.string().uuid().nullable(),
  /** `replacement`: a unit the customer received as a replacement — its line
   *  says so, so the warehouse looks for it by its pin. */
  generation: z.enum(["sales_order", "replacement"]),
})

export const rentalReturnFormSchema = z
  .object({
  accountId: z.string().uuid("Choose a customer"),
  /** The order the units are ticked on — required, as on a sales return. */
  declaredSalesOrderId: z.string().uuid("Choose the order"),
  reason: z.enum(["tenure_over", "not_wanted", "quality_issue", "other"], {
    message: "Pick a reason",
  }),
  description: z.string().optional(),
  notes: z.string().optional(),

  // Logistics — recorded so the warehouse can expect the shipment. The
  // return method is REQUIRED (2026-10-29): it decides the day billing
  // stops — self pick at handover, customer delivery at receipt less the
  // order's return grace days. The return date is REQUIRED too
  // (2026-11-13): it becomes each received unit's return date. The rest is
  // optional.
  pickupBy: z.enum(["us", "customer"]).optional(),
  courierName: z.string().optional(),
  awbNumber: z.string().optional(),
  expectedArrivalDate: z.string().optional(),

  units: z
    .array(rentalReturnUnitPickSchema)
    .min(1, "Tick at least one unit")
    .max(
      RENTAL_RETURN_MAX_UNITS,
      `At most ${RENTAL_RETURN_MAX_UNITS} units per return — raise another for the rest`,
    ),
  })
  // "Other" means nothing without the words — the API refuses it too.
  .refine((form) => form.reason !== "other" || !!form.description?.trim(), {
    message: "Say why the units are coming back",
    path: ["description"],
  })
  // Optional in the type so the form can start empty; required to submit.
  .refine((form) => !!form.pickupBy, {
    message: "Choose the return method",
    path: ["pickupBy"],
  })
  .refine((form) => !!form.expectedArrivalDate, {
    message: "Choose the return date",
    path: ["expectedArrivalDate"],
  })

/** A terminated order's units come back no earlier than its termination
 *  date (2026-11-15) — checked on submit, as the floor depends on the order. */
export const returnBeforeTerminationMessage = (date: string) =>
  `This order was terminated on ${date}. Choose that day or later.`

export type RentalReturnFormInput = z.infer<typeof rentalReturnFormSchema>
export type RentalReturnUnitPick = z.infer<typeof rentalReturnUnitPickSchema>
