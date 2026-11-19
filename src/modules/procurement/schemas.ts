import { z } from "zod"

// Trim-and-empty-to-undefined for optional text fields. Backend rejects
// empty strings on length-constrained fields (e.g. contact_name has
// min_length=1), so a blank textbox must round-trip as `undefined`/`null`,
// not "".
const optionalTrimmed = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v && v.length > 0 ? v : undefined))

// GSTIN — exactly 15 chars with the standard structure: 2-digit state code +
// 10-char PAN + entity digit + 'Z' + checksum. Mirrors the backend regex so a
// malformed-but-15-char value (e.g. "000000000000000") fails inline here rather
// than as a server 422. Uppercased on the way out (the backend normalizes too).
// Optional; blank → undefined per the same rule above.
const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][A-Z0-9]Z[A-Z0-9]$/
const optionalGst = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v && v.length > 0 ? v.toUpperCase() : undefined))
  .pipe(
    z.union([
      z.undefined(),
      z.string().regex(GSTIN_RE, "Enter a valid 15-character GSTIN"),
    ]),
  )

const optionalEmail = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v && v.length > 0 ? v : undefined))
  .pipe(
    z.union([
      z.undefined(),
      z.string().email("Enter a valid email").max(255, "Email is too long"),
    ]),
  )

// Phone — optional; when present must look like a real number: an optional
// leading +, then digits with common separators (space / - / ( )), 7–20 chars,
// starting and ending on a digit. Blocks letters and separator-only input.
const optionalPhone = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v && v.length > 0 ? v : undefined))
  .pipe(
    z.union([
      z.undefined(),
      z
        .string()
        .max(30, "Phone is too long")
        .regex(/^\+?\d[\d\s()-]{5,18}\d$/, { message: "Enter a valid phone number" }),
    ]),
  )

// Required primary-contact fields for the vendor form — a vendor's main contact
// must be reachable, so name / mobile / email are compulsory.
const requiredContactName = z
  .string()
  .trim()
  .min(1, "Contact name is required")
  .max(255, "Contact name is too long")
  // Letters only (plus spaces and . ' - for real names) — no digits/symbols.
  .regex(/^[A-Za-z][A-Za-z\s.'-]*$/, {
    message: "Contact name may contain only letters",
  })

const requiredEmail = z
  .string()
  .trim()
  .min(1, "Email is required")
  .email("Enter a valid email")
  .max(255, "Email is too long")

// Mobile — required, exactly a 10-digit Indian mobile (starts 6-9). Accepts an
// optional +91 / 91 / 0 country/trunk prefix and common separators (space, -,
// ()), stripped length-aware so a plain 10-digit number that happens to start
// with "91" is not mistaken for a country code.
const requiredPhone = z
  .string()
  .trim()
  .min(1, "Mobile number is required")
  .max(20, "Mobile number is too long")
  .refine((v) => {
    let d = v.replace(/[\s()-]/g, "")
    if (d.startsWith("+91")) d = d.slice(3)
    else if (d.length === 12 && d.startsWith("91")) d = d.slice(2)
    else if (d.length === 11 && d.startsWith("0")) d = d.slice(1)
    return /^[6-9]\d{9}$/.test(d)
  }, "Enter a valid 10-digit mobile number")

// One additional coordinating contact on a vendor. Name required; email/phone
// reuse the same optional validators as the primary contact.
export const contactSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(255, "Contact name is too long")
    .regex(/^[A-Za-z][A-Za-z\s.'-]*$/, {
      message: "Contact name may contain only letters",
    }),
  email: optionalEmail,
  phone: optionalPhone,
})

export type ContactFormInput = z.infer<typeof contactSchema>

export const vendorFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(255, "Name is too long"),
  // Primary contact is compulsory: name, mobile, and email are all required.
  contact_name: requiredContactName,
  contact_email: requiredEmail,
  contact_phone: requiredPhone,
  gst_number: optionalGst,
  status: z.enum(["active", "inactive"]),
  notes: optionalTrimmed,
  // Structured postal address (all optional) — shown on the PO detail's Vendor
  // card (via SupplierBrief).
  line1: optionalTrimmed,
  line2: optionalTrimmed,
  city: optionalTrimmed,
  state: optionalTrimmed,
  pincode: optionalTrimmed,
  // NOTE: additional coordinating contacts are managed on the vendor DETAIL page
  // (VendorContactsCard), not in this form. `contactSchema` backs that dialog.
})

export type VendorFormInput = z.infer<typeof vendorFormSchema>
