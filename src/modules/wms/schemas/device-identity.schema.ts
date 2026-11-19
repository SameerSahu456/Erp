import { z } from "zod";

// ── Device identity corrections (spec modules/wms/device-identity) ────────

/** Record or correct a device's OEM serial; `reason` is required only when correcting. */
export const recordSerialSchema = (isCorrection: boolean) =>
  z.object({
    manufacturer_serial: z
      .string()
      .trim()
      .min(1, "Enter the serial printed on the unit")
      .max(255),
    reason: isCorrection
      ? z
          .string()
          .trim()
          .min(1, "Say why the recorded serial is being replaced")
          .max(500)
      : z.string().trim().max(500).optional(),
  })
export type RecordSerialInput = z.infer<ReturnType<typeof recordSerialSchema>>

export const reidentifyDeviceSchema = z.object({
  part_variant_id: z.string().uuid("Choose the part this device actually is"),
  reason: z.string().trim().min(1, "Say why the part is being changed").max(500),
})
export type ReidentifyDeviceInput = z.infer<typeof reidentifyDeviceSchema>

/** `part_variant_id` is needed only for description-only PO lines; the dialog checks that. */
export const relinkPoItemSchema = z.object({
  purchase_order_item_id: z.string().uuid("Choose the correct PO line"),
  part_variant_id: z.string().uuid().optional(),
  reason: z.string().trim().min(1, "Say why the line is being changed").max(500),
})
export type RelinkPoItemInput = z.infer<typeof relinkPoItemSchema>
