import { z } from "zod"

// Zod messages live with the schema, not in the strings file (§9 / §16.12).

export const replacementUnitSelectionSchema = z
  .object({
    // One line item. Its device is keyed on `unitKey`: its dispatch-request-
    // item (DRI) for a dispatched unit, `legacy:<rental device>` for a unit
    // migrated with no dispatch record. The first pick of a device has
    // rowKey = unitKey; further parts of the same device (component spec
    // D10a) get their own rowKey. Both client-only, not sent.
    rowKey: z.string(),
    unitKey: z.string(),
    // Pinned on submit: the DRI of a dispatched unit, or the rental device of
    // a legacy one (which has no DRI and whose line has no variant).
    dispatchRequestItemId: z.string().uuid().nullable(),
    rentalDeviceId: z.string().uuid().nullable(),
    salesOrderItemId: z.string().uuid(),
    replacedVariantId: z.string().uuid().nullable(),
    // A legacy unit's catalog part, as the operator picked it — kept so the
    // picker shows it without refetching (§16.11 #5).
    replacedVariantLabel: z.string().optional(),
    generation: z.enum(["sales_order", "replacement"]),
    // Serial + label carried for display; not sent.
    serial: z.string(),
    label: z.string(),
    // A component's is worked out from its fields (normalizePick); only an
    // in-house part may be left for the engineer (spec D14).
    decision: z.enum(["same_part", "different_part", "to_be_decided", "repair"]),
    // "Repair this part" picked in the Replacement part dropdown (spec D15).
    repair: z.boolean().optional(),
    replacementVariantId: z.string().uuid().optional(),
    // Kept so the picker trigger shows the chosen variant without
    // refetching it (§16.11 #5).
    replacementVariantLabel: z.string().optional(),
    // A numeric rate (money), driven through the shared number-field hook.
    replacementRate: z.number().nonnegative().optional(),
    // Per-line complaint (`issue_reason`). Optional.
    issueReason: z.string(),
    returnOwed: z.boolean(),
    returnWaivedReason: z.string().optional(),
    // Whole device, or one component inside it (component replacement). A
    // component is picked from the device's recorded contents or described
    // in words, and swapped at the customer's site or in house.
    target: z.enum(["unit", "component"]),
    swapLocation: z.enum(["on_site", "in_house"]).optional(),
    // In house: the whole device or only the parts come to us (spec D15).
    inHouseReturn: z.enum(["device", "part"]).optional(),
    stockItemComponentId: z.string().uuid().optional(),
    // Carried for display; not sent.
    componentLabel: z.string().optional(),
    componentDescription: z.string().max(255).optional(),
    componentPartNumber: z.string().max(100).optional(),
  })
  .refine(
    (u) =>
      u.decision === "different_part"
        ? !!u.replacementVariantId && u.replacementRate != null
        : !u.replacementVariantId && u.replacementRate == null,
    {
      // The server enforces the same pairing and 422s on either-or shapes;
      // catching it here keeps the operator out of a raw validation error.
      message: "A different part needs both a substitute and its rate",
      path: ["replacementVariantId"],
    },
  )
  // A legacy unit's line has no catalog part (the server enforces it too):
  // sending the same part again needs the operator to say which part it is.
  .refine((u) => !u.rentalDeviceId || u.decision !== "same_part" || !!u.replacedVariantId, {
    message: "Choose which catalog part this unit is",
    path: ["replacedVariantId"],
  })
  .refine((u) => (u.returnOwed ? true : !!u.returnWaivedReason?.trim()), {
    message: "Say why no unit is owed back",
    path: ["returnWaivedReason"],
  })
  .refine((u) => u.target === "unit" || !!u.swapLocation, {
    message: "Choose where the part is swapped",
    path: ["swapLocation"],
  })
  .refine(
    (u) =>
      u.target === "unit" ||
      !!u.stockItemComponentId ||
      !!u.componentDescription?.trim(),
    {
      message: "Pick a part or type its name",
      path: ["componentDescription"],
    },
  )
  .refine(
    (u) =>
      u.target === "unit" ||
      u.decision !== "to_be_decided" ||
      u.swapLocation !== "on_site",
    {
      // In house the engineer may decide later; on site the part ships to
      // the customer, so it must be known now (spec D14).
      message: "Choose the replacement part — it ships to the customer",
      path: ["replacementVariantId"],
    },
  )
  .refine((u) => u.decision !== "repair" || u.swapLocation === "in_house", {
    // A part is repaired only when it comes to us (spec D15).
    message: "A part is repaired only when it comes to us",
    path: ["replacementVariantId"],
  })

export const replacementRequestFormSchema = z.object({
  salesOrderId: z.string().uuid("Choose a sales order"),
  replacementMode: z.enum(["normal", "advance"]),
  priority: z.enum(["low", "medium", "high", "urgent"], {
    message: "Select a priority",
  }),
  reason: z.string().trim().min(1, "Say what went wrong"),
  // Trim free-text so pasted leading/trailing whitespace is never stored/sent
  // (§9), matching `reason` above.
  description: z.string().trim().optional(),
  // Capped at the backend column limit (String(100)); without it a long value
  // sailed past validation and 500'd at INSERT.
  externalTicketNo: z
    .string()
    .trim()
    .max(100, "Keep the ticket number under 100 characters.")
    .optional(),
  // YYYY-MM-DD; blank = today. May be backdated, never in the future (D8).
  issueDate: z
    .string()
    .optional()
    .refine((v) => !v || v <= new Date().toISOString().slice(0, 10), {
      message: "The issue date cannot be in the future",
    }),
  engineerId: z.string().uuid().optional(),
  units: z
    .array(replacementUnitSelectionSchema)
    .min(1, "Choose at least one unit to replace"),
})
  // Advance ships first, but an in-house part ships the customer's own device
  // or part back, so it cannot leave before it arrives (the server refuses it).
  .refine(
    (f) =>
      f.replacementMode !== "advance" ||
      !f.units.some((u) => u.target === "component" && u.swapLocation === "in_house"),
    {
      message: "Advance replacement is not available when a part comes in to us",
      path: ["replacementMode"],
    },
  )

export type ReplacementRequestFormInput = z.infer<
  typeof replacementRequestFormSchema
>
export type ReplacementUnitSelection = z.infer<
  typeof replacementUnitSelectionSchema
>
