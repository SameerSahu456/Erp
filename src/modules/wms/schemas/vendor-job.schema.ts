import { z } from "zod";

// ── Vendor services (§9 — schemas live here, never inline in a component) ──

/** An empty <select> yields "", which `.uuid().optional()` rejects; accept "" (keeps the type `string`).
 *  The submit handler maps "" to null. */
const optionalUuid = z.literal("").or(z.string().uuid()).optional();
const optionalDisposition = z
  .literal("")
  .or(z.enum(["repaired", "replaced"]))
  .optional();

/** Codes that would be shadowed by literal `/wms/vendor-jobs/<x>` routes. */
export const RESERVED_SECTION_CODES: readonly string[] = ["vendors", "sections"];
export const SECTION_CODE_MAX = 30;
/** "Something else" / item free text on the raise form. */
export const ITEM_DESCRIPTION_MAX = 100;

const sectionTextRequired = (message: string) => z.string().trim().min(1, message);

/** Add / edit a service section. `code` is only validated on create — it is
 *  immutable afterwards (the input is disabled in edit mode). */
export const serviceSectionFormSchema = (isEdit: boolean) =>
  z.object({
    code: isEdit
      ? z.string()
      : z
          .string()
          .trim()
          .min(1, "Enter a code.")
          .max(SECTION_CODE_MAX, `Please enter a code with ${SECTION_CODE_MAX} characters or less.`)
          .regex(
            /^[a-z][a-z0-9_]*$/,
            "Lowercase letters, digits and underscores, starting with a letter.",
          )
          .refine((code) => !RESERVED_SECTION_CODES.includes(code), {
            message: `"vendors" and "sections" are reserved page names — choose another code.`,
          }),
    name: sectionTextRequired("Enter a name."),
    device_status_label: sectionTextRequired("Enter the device status label."),
    item_suggestions: z.array(z.string()),
    tracks_replacement: z.boolean(),
    applies_to_servers: z.boolean(),
    is_active: z.boolean(),
  });
export type ServiceSectionFormInput = z.infer<ReturnType<typeof serviceSectionFormSchema>>;

export const raiseVendorJobSchema = z.object({
  // Optional: a suggestion tick also counts; the dialog and server enforce "at least one item".
  item_description: z
    .string()
    .trim()
    .max(ITEM_DESCRIPTION_MAX, `Please enter ${ITEM_DESCRIPTION_MAX} characters or fewer.`)
    .optional(),
  item_part_no: z.string().trim().max(100).optional(),
  item_serial_no: z.string().trim().max(100).optional(),
  service_vendor_id: optionalUuid,
  notes: z.string().trim().max(2000).optional(),
})
export type RaiseVendorJobInput = z.infer<typeof raiseVendorJobSchema>

export const sendVendorJobSchema = z.object({
  service_vendor_id: z.string().uuid("Pick a vendor"),
  notes: z.string().trim().max(2000).optional(),
})
export type SendVendorJobInput = z.infer<typeof sendVendorJobSchema>

/** Replacement serial is required only when the item was REPLACED (PRD §12.4). */
export const receiveVendorJobSchema = z
  .object({
    outcome: z.enum(["pass", "fail"], { message: "Choose an outcome" }),
    return_disposition: optionalDisposition,
    replacement_serial_no: z.string().trim().max(100).optional(),
    vendor_response: z.string().trim().max(2000).optional(),
  })
  .refine(
    (v) => v.return_disposition !== "replaced" || !!v.replacement_serial_no,
    { path: ["replacement_serial_no"], message: "Required for a replaced item" },
  )
export type ReceiveVendorJobInput = z.infer<typeof receiveVendorJobSchema>

export const resendVendorJobSchema = z.object({
  service_vendor_id: optionalUuid,
  note: z.string().trim().min(1, "Required").max(2000),
})
export type ResendVendorJobInput = z.infer<typeof resendVendorJobSchema>

export const cancelVendorJobSchema = z.object({
  cancellation_reason: z
    .string()
    .trim()
    .min(1, "Required")
    .max(250, "Reason should not exceed 250 characters"),
})
export type CancelVendorJobInput = z.infer<typeof cancelVendorJobSchema>
