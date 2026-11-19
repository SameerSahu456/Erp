import { z } from "zod";

// ─── Global field-length policy (FE only) ────────────────────────────────────
// One source of truth for every IMS schema:
//   - TEXT_MAX:     single-line text inputs (name, code, label, etc.)
//   - TEXTAREA_MAX: free-form multi-line (description, notes)
//   - NUMBER_MAX:   numeric ceilings — 10 digits keeps invoice / quantity
//                   columns from overflowing
// The backend still accepts wider values; tightening here only blocks
// awkward shapes at submit time so they never reach DB or downstream UI.
const TEXT_MAX = 100;
const TEXTAREA_MAX = 500;
const NUMBER_MAX = 9_999_999_999;

// ─── Checklist item bounds (hardcoded, not operator-editable) ────────────────
// Operators no longer set min/max per item — the form strips those inputs and
// `normalizeChecklistItem` injects these constants on submit. Required items
// get min=1; optional items get min=0 so "no answer" is a valid completion.
const CHECKLIST_TEXT_MIN_LEN = 1;
const CHECKLIST_TEXT_MAX_LEN = 500;
const CHECKLIST_NUMERIC_MIN = 0;
const CHECKLIST_NUMERIC_MAX = NUMBER_MAX;
const CHECKLIST_PHOTOS_MAX = 5;

// ─── Shared text quality validators ──────────────────────────────────────────
// Two refines applied to every user-authored IMS text field below:
//
//   1. No emojis / pictographic characters. Matches the emoji set proper
//      (Extended_Pictographic), the ZWJ that joins multi-codepoint sequences,
//      and regional-indicator pairs (flag emojis). Plain digits, `#`, and `*`
//      pass — they have legitimate identifier uses.
//   2. At least one letter or digit. Blocks "____", "..", "---" and similar
//      all-punctuation inputs from slipping past min-length on identifier-
//      style fields. Empty strings pass so optional/nullable fields can stay
//      blank; the field's own .min() is responsible for required-ness.
 
export const EMOJI_REGEX = new RegExp(
  "[\\u{1F1E6}-\\u{1F1FF}\\u200D]|\\p{Extended_Pictographic}",
  "u",
);
export const NO_EMOJI_MESSAGE = "Emojis aren't allowed.";
export const MEANINGFUL_MESSAGE = "Must include at least one letter or number.";
export const hasNoEmoji = (v: string) => !EMOJI_REGEX.test(v);
// Unicode-aware so Devanagari, CJK, Arabic, accented Latin, etc. all pass
// — the goal is "at least one meaningful character", not "must be English".
// `\p{L}` covers all letter categories, `\p{N}` covers all number categories.
export const hasAlphanumeric = (v: string) =>
  v === "" || /[\p{L}\p{N}]/u.test(v);

// specifications: ordered list of { key, value } entries (converted to Record on submit)
// Key/value caps mirror the backend (`SPECS_KEY_MAX_LEN=50`, `SPECS_VALUE_MAX_LEN=200`
// in schemas/part.py) so an entry the FE accepts never 422s server-side. The key
// is picked from the specification attribute master (the backend rejects any
// other name). A row with a key but no value is simply skipped on save — that's
// how a prefilled category spec is left out — but a value with no key is an error.
export const specEntrySchema = z
  .object({
    key: z.string().trim().max(50),
    value: z
      .string().trim()
      .max(200)
      .refine(hasNoEmoji, NO_EMOJI_MESSAGE)
      .refine(hasAlphanumeric, MEANINGFUL_MESSAGE),
  })
  .superRefine((entry, ctx) => {
    if (entry.value && !entry.key) {
      ctx.addIssue({
        code: "custom",
        path: ["key"],
        message: "Pick a specification for this value.",
      });
    }
  });
export type SpecEntry = z.infer<typeof specEntrySchema>;

// IMS form-spec (2026-09): names must START with a letter or number, then may
// contain letters, numbers, spaces, and common special characters (. , & ( ) #
// ' + _ / -). A pure-numeric name ("2024") is allowed; a leading space/symbol is
// not. `/` needs no escape inside the character class.
const NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 .,&()#'+_/-]*$/;
const NAME_PATTERN_MESSAGE =
  "Name must start with a letter or number, and can contain letters, numbers, spaces, and common punctuation. Example: Logitech MX-Master 3S (2024).";

// Whitespace normaliser for human-typed identifier fields (category /
// OEM name, etc.). Trims leading/trailing whitespace and collapses any
// internal whitespace run to a single space. Exported so form pages
// can mirror the same rule on edit-hydration — otherwise the user sees
// the stored (still-dirty) name in the input and saves it back as-is.
//
// NAME_PATTERN already rejects a *leading* space (must start with a
// letter/digit) but allows trailing spaces and double-spaces — without
// this normaliser those silently round-trip into the DB.
export const normalizeIdentifierName = (s: string): string =>
  s.trim().replace(/\s+/g, " ");

// ─── Price validator ─────────────────────────────────────────────────────────
// Shared across createVariantSchema.sell_price, updateVariantSchema.sell_price,
// and updatePriceSchema.new_price so every price field in IMS rejects the
// same shapes with the same wording:
//   - Empty                       → "Required"
//   - Non-numeric (NaN)           → "Enter a number"
//   - < 0.01                      → "Must be at least 0.01"
//   - > 99,999,999.99             → "Too large"
//   - More than 2 decimal places  → "Up to 2 decimals"
// Backend stores prices as NUMERIC(12,2); the upper bound matches that.
// The minimum mirrors the backend allowance (≥0) but keeps a token positive
// floor so a stray "0" doesn't silently price an item at zero rupees.
export const PRICE_MIN = 0.01;
export const PRICE_MAX = 99_999_999.99;
export const priceFieldSchema = () =>
  z
    .number({
      error: (issue) =>
        issue.input === undefined || issue.input === null
          ? "Required"
          : "Enter a number",
    })
    .min(PRICE_MIN, `Must be at least ${PRICE_MIN}`)
    .max(PRICE_MAX, "Too large")
    .refine(
      // Floating-point safety: `1200.12 * 100` is `120011.99999999999`, so
      // a strict `Math.round(v*100) === v*100` rejects legitimate 2-decimal
      // values. Compare with an epsilon (≈ a millionth of a paisa) instead.
      (v) =>
        Number.isFinite(v) &&
        Math.abs(Math.round(v * 100) - v * 100) < 1e-6,
      "Up to 2 decimals",
    );

// Mirror of `priceFieldSchema` for surfaces that validate a raw string outside
// React Hook Form (e.g. the inline editable-price cell on the parts table).
// Keeping both in this file means the wording can only drift if someone edits
// the constants below, not the schema.
export function validatePriceInput(raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed === "") return "Required";
  const n = Number(trimmed);
  if (!Number.isFinite(n)) return "Enter a number";
  if (n < PRICE_MIN) return `Must be at least ${PRICE_MIN}`;
  if (n > PRICE_MAX) return "Too large";
  // Same FP-safe comparison as priceFieldSchema — direct equality rejects
  // legitimate 2-decimal values like 1200.12 because `1200.12 * 100` is
  // `120011.99999999999` in IEEE-754.
  if (Math.abs(Math.round(n * 100) - n * 100) > 1e-6)
    return "Up to 2 decimals";
  return null;
}

// Backend `CategoryCreate` (post ims_ccd1): `code` was dropped from the
// categories table; identity is name + parent_id (case-insensitive sibling-
// unique). `is_tracking` already lives on parts. extra='forbid' — any stray
// field 422s.
export const createCategorySchema = z.object({
  // `transform` normalises whitespace BEFORE the pattern/length checks so
  // the validated output is the canonical name — trailing spaces and
  // double-spaces no longer survive a save. `.pipe()` keeps the same
  // user-facing error messages on the post-transform value.
  name: z
    .string().trim()
    .transform(normalizeIdentifierName)
    .pipe(
      z
        .string().trim()
        .min(1, "Category name is required.")
        .max(TEXT_MAX, `Category name must be ${TEXT_MAX} characters or fewer.`)
        .regex(NAME_PATTERN, NAME_PATTERN_MESSAGE),
    ),
  parent_id: z.string().uuid().nullable().optional(),
  description: z
    .string().trim()
    .max(TEXTAREA_MAX, `Description must be ${TEXTAREA_MAX} characters or fewer.`)
    .refine(hasNoEmoji, NO_EMOJI_MESSAGE)
    .refine(hasAlphanumeric, MEANINGFUL_MESSAGE)
    .nullable()
    .optional(),
  // Optional in the schema input — form supplies a default of 0. Avoids the
  // Resolver "input vs output type" drift that `.default()` introduces.
  // Bounds match backend `_DISPLAY_ORDER_MIN`/`_DISPLAY_ORDER_MAX` exactly
  // (0–10000) so the user sees an inline error instead of a 422 round-trip.
  display_order: z
    .number()
    .int()
    .min(0, "Display order must be 0 or greater.")
    .max(10_000, "Display order must be 10000 or less.")
    .optional(),
  is_active: z.boolean(),
  // Opt-in flag for Reference BOM eligibility. Default `false` per the
  // backend — only PMs whose category needs assembly modeling flip it
  // on. The BOM PUT endpoint gates on this flag and 422s with
  // `CATEGORY_NOT_BOM_ELIGIBLE` when it's false; the Variant detail
  // BOM tab pre-checks it so the editor stays hidden in that case.
  is_bom_eligible: z.boolean(),
  // Linked specification attributes as `{id, label}` chips, in display order.
  // Capped at 50 like the backend.
  specification_attributes: z
    .array(z.object({ id: z.string(), label: z.string() }))
    .max(50, "A category can have at most 50 specification attributes."),
});
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

// ─── OEM (Brand/OEM) ─────────────────────────────────────────────────────────
// Length caps mirror the backend column limits. The regex patterns that once
// constrained `name` and `code` were dropped — operators kept hitting them with
// legitimate values (multi-word brands with punctuation, codes containing
// dots/underscores). Length, required-ness, and the notes content guards still
// apply.
//
// Single schema for both create and edit modes. The previous edit-only schema
// (which omitted `code` + `name` because the inputs were disabled) was removed
// when operators asked for editable Name/Code fields in edit mode. Heads-up:
// the backend's `OEMUpdate` may reject a changed name/code with a 422 — the
// form surfaces that verbatim; the FE no longer guards against it.
export const oemCreateSchema = z.object({
  // IMS form-spec (2026-09): Code is MANDATORY on create (no name-fallback).
  // On edit it always has a stored value, so min(1) is a no-op there.
  code: z
    .string().trim()
    .min(1, "OEM code is required.")
    .max(30, "OEM code must be 30 characters or fewer."),
  name: z
    .string().trim()
    .min(1, "OEM name is required.")
    .max(TEXT_MAX, `OEM name must be ${TEXT_MAX} characters or fewer.`),
  notes: z
    .string().trim()
    .max(TEXTAREA_MAX, `Notes must be ${TEXTAREA_MAX} characters or fewer.`)
    .refine(hasNoEmoji, NO_EMOJI_MESSAGE)
    .refine(hasAlphanumeric, MEANINGFUL_MESSAGE)
    .nullable()
    .optional(),
  is_active: z.boolean(),
});
export type OEMFormInput = z.infer<typeof oemCreateSchema>;

// Part number policy: letters (any case), digits, and only `-` / `/`.
// No spaces, dots, underscores, or other punctuation. Purely numeric and
// purely alphabetic values are both accepted.
const PART_NUMBER_PATTERN = /^[A-Za-z0-9\-/]+$/;
const PART_NUMBER_MESSAGE =
  "Part number can only contain letters, numbers, and the characters - or /. Spaces, dots (.), underscores (_), and other punctuation aren't allowed. Example: AB-1234, 12/345, or LX9-A1.";

export const createPartSchema = z.object({
  part_number: z
    .string().trim()
    .min(1, "Part number is required.")
    .max(100, "Part number must be 100 characters or fewer.")
    .regex(PART_NUMBER_PATTERN, PART_NUMBER_MESSAGE),
  name: z
    .string().trim()
    .min(1, "Part name is required.")
    // Frontend is stricter than the backend (255) on purpose: per product
    // call, 100 chars is the practical ceiling for a part name shown in
    // tables, invoices, and dropdowns without truncation.
    .max(TEXT_MAX, `Part name must be ${TEXT_MAX} characters or fewer.`)
    .regex(NAME_PATTERN, NAME_PATTERN_MESSAGE),
  // Optional: `.trim()` normalises a whitespace-only value to "" so a stray
  // space in this non-mandatory field passes `hasAlphanumeric` (empty is OK)
  // instead of blocking the form.
  description: z
    .string()
    .trim()
    .max(TEXTAREA_MAX, `Description must be ${TEXTAREA_MAX} characters or fewer.`)
    .refine(hasNoEmoji, NO_EMOJI_MESSAGE)
    .refine(hasAlphanumeric, MEANINGFUL_MESSAGE)
    .nullable()
    .optional(),
  // Backend caps at 20 aliases. Each entry is trimmed; a blank / whitespace-only
  // entry passes as "" (no `.min(1)`, so it doesn't error the whole array) and
  // is dropped on submit.
  aliases: z
    .array(
      z
        .string()
        .trim()
        .max(TEXT_MAX)
        .refine(hasNoEmoji, NO_EMOJI_MESSAGE)
        .refine(hasAlphanumeric, MEANINGFUL_MESSAGE),
    )
    .max(20)
    .nullable()
    .optional(),
  // Backend rejects null on create — use undefined when unset. The
  // `message:` on `z.string()` catches the "field never touched"
  // (undefined) case; `.uuid(...)` catches the empty-string case from a
  // cleared dropdown. Both render the same friendly text.
  category_id: z
    .string({ message: "Select a category." })
    .uuid("Select a category."),
  oem_id: z
    .string({ message: "Select an OEM / brand." })
    .uuid("Select an OEM / brand."),
  hsn_code_id: z
    .string({ message: "Select an HSN code." })
    .uuid("Select an HSN code."),
  // Live backend field name is `uom` (was `unit`); CHECK constraint is
  // lowercase enum: pcs|set|kg|roll|m|l|box.
  // Removed from the form per user request; when omitted the backend defaults it.
  uom: z
    .string({ message: "Select a unit of measure." })
    .min(1, "Select a unit of measure.")
    .max(10)
    .optional(),
  is_active: z.boolean(),
  // Optional in the schema so the input type stays simple; the form supplies
  // defaults via `useForm.defaultValues`. Backend defaults: false / "new".
  is_tracking: z.boolean().optional(),
  // Form helper — converted to `specs: Record<string,string>` on submit.
  spec_entries: z.array(specEntrySchema).optional(),
});
export type CreatePartInput = z.infer<typeof createPartSchema>;

// Part edit disables `part_number`, `category_id`, and `oem_id` (immutable
// post-create); they're dropped from the schema so the form never blocks
// save on values the user can't change. Editable fields stay strict.
export const updatePartSchema = createPartSchema.omit({
  part_number: true,
  category_id: true,
  oem_id: true,
});

// SKU policy: letters (any case), digits, and only `-` / `/`. Dots,
// underscores, spaces, and other punctuation are rejected at submit. The
// backend regex is wider (`^[A-Za-z0-9._\-/]+$`) so tightening here only
// blocks legal-but-unwanted shapes; the wire contract still holds.
const SKU_CODE_PATTERN = /^[A-Za-z0-9\-/]+$/;
const SKU_CODE_MESSAGE =
  "SKU can only contain letters, numbers, and the characters - or /. Spaces, dots (.), underscores (_), and other punctuation aren't allowed.";

export const createVariantSchema = z.object({
  // IMS form-spec (2026-09): variant name cap is 255 (the DB column limit;
  // the spec's 256 rounds to the column). Shares NAME_PATTERN with parts so
  // display surfaces (tables, dropdowns, audit feed) stay consistent.
  name: z
    .string().trim()
    .min(1, "Variant name is required.")
    .max(255, "Variant name must be 255 characters or fewer.")
    .regex(NAME_PATTERN, NAME_PATTERN_MESSAGE),
  sku_code: z
    .string().trim()
    .min(1, "SKU code is required.")
    .max(50, "SKU code must be 50 characters or fewer.")
    .regex(SKU_CODE_PATTERN, SKU_CODE_MESSAGE)
    .refine(
      (v) => /[A-Za-z0-9]/.test(v),
      "SKU code must include at least one letter or number.",
    ),
  description: z
    .string().trim()
    .max(TEXTAREA_MAX, `Description must be ${TEXTAREA_MAX} characters or fewer.`)
    .refine(hasNoEmoji, NO_EMOJI_MESSAGE)
    .refine(hasAlphanumeric, MEANINGFUL_MESSAGE)
    .nullable()
    .optional(),
  // Trimmed; blank / whitespace-only entries pass as "" and are dropped on
  // submit (no `.min(1)`, so they don't error the whole array — IMS trim sweep).
  aliases: z
    .array(
      z
        .string()
        .trim()
        .max(TEXT_MAX)
        .refine(hasNoEmoji, NO_EMOJI_MESSAGE)
        .refine(hasAlphanumeric, MEANINGFUL_MESSAGE),
    )
    .max(20)
    .nullable()
    .optional(),
  condition: z.enum(["new", "refurbished", "new_pull"], {
    message: "Select a condition.",
  }),
  sell_price: priceFieldSchema(),
  hsn_code_id: z
    .string({ message: "Select an HSN code." })
    .uuid("Select an HSN code."),
  is_active: z.boolean(),
  spec_entries: z.array(specEntrySchema).optional(),
});
export type CreateVariantInput = z.infer<typeof createVariantSchema>;

// Variant edit disables `sku_code` and `condition` (immutable post-create);
// they're dropped from the schema so the form never blocks save on values
// the user can't change. Editable fields keep their create-time rules.
export const updateVariantSchema = createVariantSchema.omit({
  sku_code: true,
  condition: true,
});

// ─── PM Assignment ───────────────────────────────────────────────────────────
// Mirrors backend PMAssignmentCreate. Date constraints (no backdating, end >=
// start) are pre-checked here so the user gets inline feedback. The backend
// still enforces them — this is a UX nicety, not a security boundary.

// Factory because the past-date rule applies only on CREATE. On EDIT
// the assignment already exists with whatever `effective_from` it was
// born with — opening it 2-3 days later and reaching for Save would
// otherwise fail the "Start date cannot be in the past" check on an
// unchanged value the user has every right to keep. The end-date-
// after-start-date rule is invariant and stays on for both modes.
//
// Pass `{ allowPastDates: true }` for edit/replace flows; default
// rejects backdated dates the way the create form should.
export const makePMAssignmentSchema = (
  opts: { allowPastDates?: boolean } = {},
) =>
  z
    .object({
      user_id: z.string().uuid("Pick a product manager"),
      // Backend allows category_id = null for "global PM" rows (a PM with
      // permissions across every category). FE mirrors that with an explicit
      // "All categories" toggle in the form; an empty string is treated as
      // null at submit time.
      category_id: z.string().uuid("Pick a category").nullable(),
      oem_id: z.string().uuid().nullable().optional(),
      condition: z.enum(["new", "refurbished", "new_pull"]).nullable().optional(),
      permission_type: z.enum(["manage", "view"]),
      // ISO yyyy-mm-dd or null/undefined.
      effective_from: z
        .string().trim()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Use yyyy-mm-dd")
        .nullable()
        .optional(),
      effective_until: z
        .string().trim()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Use yyyy-mm-dd")
        .nullable()
        .optional(),
      notes: z
        .string().trim()
        .max(TEXTAREA_MAX, `Notes must be ${TEXTAREA_MAX} characters or fewer.`)
        .refine(hasNoEmoji, NO_EMOJI_MESSAGE)
        .refine(hasAlphanumeric, MEANINGFUL_MESSAGE)
        .nullable()
        .optional(),
    })
    .superRefine((val, ctx) => {
      const today = new Date().toISOString().slice(0, 10);
      if (
        !opts.allowPastDates &&
        val.effective_from &&
        val.effective_from < today
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Start date cannot be in the past",
          path: ["effective_from"],
        });
      }
      if (
        !opts.allowPastDates &&
        val.effective_until &&
        val.effective_until < today
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "End date cannot be in the past",
          path: ["effective_until"],
        });
      }
      if (
        val.effective_from &&
        val.effective_until &&
        val.effective_until < val.effective_from
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "End date cannot be before start date",
          path: ["effective_until"],
        });
      }
    });

export const createPMAssignmentSchema = makePMAssignmentSchema();
export const editPMAssignmentSchema = makePMAssignmentSchema({
  allowPastDates: true,
});
export type CreatePMAssignmentInput = z.infer<typeof createPMAssignmentSchema>;

// ─── Checklist Template ──────────────────────────────────────────────────────
// Mirrors backend `ChecklistItem` + `ChecklistTemplateCreate` (post-`ims_cfb1`).
//
// The backend enforces a per-kind allowlist via `extra='forbid'` plus a model
// validator: only the fields valid for that kind may be set. The schema below
// validates the full superset so RHF can render kind-specific inputs without
// rebuilding the form on each kind change; `normalizeChecklistItem()` strips
// disallowed extras before submit so the wire payload satisfies the backend
// contract without surprising the operator with a 422.

// `key` is an opaque, stable per-row identifier — never shown to the
// operator and never derived from the label. The FE generates it via
// `generateChecklistKey()` and the schema only validates the backend's
// own pattern. Operators author labels; the key is plumbing.
const KEY_PATTERN = /^[a-z][a-z0-9_]*$/;
const KEY_PATTERN_MESSAGE =
  "Key has an unexpected shape — please remove and re-add this item";

// Mirrors backend `_OPTIONS_MIN_ENTRIES` / `_OPTION_MAX_LEN` constants so
// the FE preview rejects shapes the backend would also reject.
const OPTIONS_MIN_ENTRIES = 2;
const OPTION_MAX_LEN = 100;

// Canonical Pass/Fail/N/A triplet (exact casing + order) — the only options
// shape the backend accepts as `evaluation_mode="pass_fail_na"`, which in turn
// is the only kind allowed to carry `route_tags`.
export const PASS_FAIL_NA_OPTIONS = ["Pass", "Fail", "N/A"] as const;

/** True when a select item's options are exactly the canonical Pass/Fail/N/A
 *  triplet — i.e. the "preset" select that drives WMS pass/fail routing. */
export function isPassFailNaItem(it: {
  kind?: string;
  options?: string[] | null;
}): boolean {
  if (it.kind !== "select") return false;
  const o = it.options ?? [];
  return (
    o.length === PASS_FAIL_NA_OPTIONS.length &&
    PASS_FAIL_NA_OPTIONS.every((v, i) => o[i] === v)
  );
}

export const checklistItemSchema = z
  .object({
    key: z.string().trim().min(1).max(50).regex(KEY_PATTERN, KEY_PATTERN_MESSAGE),
    label: z
      .string().trim()
      .min(1, "Label is required")
      .max(TEXT_MAX, `Label must be ${TEXT_MAX} characters or fewer.`)
      .refine(hasNoEmoji, NO_EMOJI_MESSAGE)
      .refine(
        (v) => /[A-Za-z0-9]/.test(v),
        "Label must include at least one letter or number.",
      ),
    kind: z.enum(["boolean", "text", "numeric", "select", "multi_select", "photo"]),
    required: z.boolean(),
    notes: z
      .string().trim()
      .max(TEXT_MAX, `Hint must be ${TEXT_MAX} characters or fewer.`)
      .refine(hasNoEmoji, NO_EMOJI_MESSAGE)
      .refine(hasAlphanumeric, MEANINGFUL_MESSAGE)
      .nullable()
      .optional(),
    // text
    min_length: z.number().int().min(0).max(2000).nullable().optional(),
    max_length: z.number().int().min(1).max(2000).nullable().optional(),
    // numeric — cap at the global 10-digit ceiling so the field can't
    // emit a value that overflows downstream invoice / qty columns.
    // Number checklist fields can't be negative — they hold quantities,
    // counts, dimensions, etc. that have no meaningful negative value.
    // Frontend rejects below 0; backend may still accept any range.
    min_value: z
      .number()
      .min(0, "Must be 0 or greater.")
      .max(NUMBER_MAX, `Must be ${NUMBER_MAX} or less.`)
      .nullable()
      .optional(),
    max_value: z
      .number()
      .min(0, "Must be 0 or greater.")
      .max(NUMBER_MAX, `Must be ${NUMBER_MAX} or less.`)
      .nullable()
      .optional(),
    integer_only: z.boolean(),
    // select / multi_select
    options: z
      .array(
        z
          .string().trim()
          .refine(hasNoEmoji, NO_EMOJI_MESSAGE)
          .refine(hasAlphanumeric, MEANINGFUL_MESSAGE),
      )
      .max(20)
      .nullable()
      .optional(),
    min_choices: z.number().int().min(0).max(20).nullable().optional(),
    max_choices: z.number().int().min(1).max(20).nullable().optional(),
    // photo
    min_photos: z.number().int().min(0).max(10).nullable().optional(),
    max_photos: z.number().int().min(1).max(10).nullable().optional(),
    // Evaluation mode — set to "pass_fail_na" on a canonical Pass/Fail/N/A
    // select so the backend scores it (and permits route_tags). The editor
    // doesn't surface this directly; `normalizeChecklistItem` derives it.
    evaluation_mode: z.enum(["informational", "pass_fail_na"]).nullable().optional(),
    // route_tags — per-item WMS fail routing override. Valid ONLY on a canonical
    // Pass/Fail/N/A (preset) select; the device routes here when this item is
    // failed. Empty/omitted ⇒ the WMS engine defaults the fail to repair.
    route_tags: z.array(z.enum(["repair", "paint", "spares"])).max(8).nullable().optional(),
  })
  .superRefine((it, ctx) => {
    // Mirror the backend's range / options / required-min-contradiction checks
    // so the operator sees inline errors instead of a round-trip 422.
    if (it.kind === "text") {
      if (
        it.min_length != null &&
        it.max_length != null &&
        it.min_length > it.max_length
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["max_length"],
          message: "Max length must be ≥ min length",
        });
      }
    }
    if (it.kind === "numeric") {
      if (
        it.min_value != null &&
        it.max_value != null &&
        it.min_value > it.max_value
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["max_value"],
          message: "Max value must be ≥ min value",
        });
      }
    }
    if (it.kind === "select" || it.kind === "multi_select") {
      const opts = it.options ?? [];
      const cleaned = opts.map((o) => o.trim()).filter(Boolean);
      if (cleaned.length < OPTIONS_MIN_ENTRIES) {
        ctx.addIssue({
          code: "custom",
          path: ["options"],
          message: `Add at least ${OPTIONS_MIN_ENTRIES} options`,
        });
      }
      if (cleaned.some((o) => o.length > OPTION_MAX_LEN)) {
        ctx.addIssue({
          code: "custom",
          path: ["options"],
          message: `Each option must be ≤ ${OPTION_MAX_LEN} characters`,
        });
      }
      if (new Set(cleaned).size !== cleaned.length) {
        ctx.addIssue({
          code: "custom",
          path: ["options"],
          message: "Options must be unique",
        });
      }
    }
    if (it.kind === "multi_select") {
      if (
        it.min_choices != null &&
        it.max_choices != null &&
        it.min_choices > it.max_choices
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["max_choices"],
          message: "Max choices must be ≥ min choices",
        });
      }
    }
    if (it.kind === "photo") {
      if (
        it.min_photos != null &&
        it.max_photos != null &&
        it.min_photos > it.max_photos
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["max_photos"],
          message: "Max photos must be ≥ min photos",
        });
      }
    }
    // route_tags are only meaningful on the Pass/Fail/N/A preset item (mirrors
    // backend `_check_route_tags`). Reject them on any other kind.
    if (it.route_tags && it.route_tags.length > 0 && !isPassFailNaItem(it)) {
      ctx.addIssue({
        code: "custom",
        path: ["route_tags"],
        message: "Routing is only available on a Pass/Fail item.",
      });
    }
  });
export type ChecklistItemInput = z.infer<typeof checklistItemSchema>;

export const createChecklistSchema = z.object({
  name: z
    .string().trim()
    .min(1, "Name is required")
    .max(TEXT_MAX, `Name must be ${TEXT_MAX} characters or fewer.`)
    .refine(hasNoEmoji, NO_EMOJI_MESSAGE)
    .refine((v) => /[A-Za-z]/.test(v), "Name must contain at least one letter"),
  // target_type/target_id are wired by the page based on the URL — operator
  // never sees them as fields, so the messages here only ever surface if
  // something programmatic goes wrong.
  target_type: z.enum(["category", "part"]),
  target_id: z.string().uuid("Invalid target id"),
  type_code: z
    .string({ message: "Select a checklist type." })
    .min(1, "Select a checklist type.")
    .max(30),
  items: z.array(checklistItemSchema).min(1, "Add at least one item").max(100),
  is_active: z.boolean().optional(),
});
export type CreateChecklistInput = z.infer<typeof createChecklistSchema>;

// Edit mode disables `target_type`, `target_id`, and `type_code` because
// backend's `ChecklistTemplateUpdate` rejects them (`extra='forbid'`); drop
// them from the schema so the form never validates locked-down values.
// Editable fields (name, items, is_active) keep their create-time rules.
export const updateChecklistSchema = createChecklistSchema.omit({
  target_type: true,
  target_id: true,
  type_code: true,
});

// Backend's `extra='forbid'` rejects any field outside the kind's allowlist.
// Strip non-applicable fields before submit so a `text` row never carries
// `min_value`/`options`/`min_photos`/etc. Common fields (key/label/kind/
// required/notes) always pass through; `integer_only` keeps its default.
export function normalizeChecklistItem(it: ChecklistItemInput): ChecklistItemInput {
  const base = {
    key: it.key,
    label: it.label.trim(),
    kind: it.kind,
    required: it.required,
    notes: it.notes?.trim() || null,
    integer_only: false,
  } as ChecklistItemInput;

  switch (it.kind) {
    case "boolean":
      return base;
    case "text":
      return {
        ...base,
        min_length: it.required ? CHECKLIST_TEXT_MIN_LEN : 0,
        max_length: CHECKLIST_TEXT_MAX_LEN,
      };
    case "numeric":
      return {
        ...base,
        min_value: CHECKLIST_NUMERIC_MIN,
        max_value: CHECKLIST_NUMERIC_MAX,
        integer_only: !!it.integer_only,
      };
    case "select": {
      const selectOptions = (it.options ?? []).map((o) => o.trim()).filter(Boolean);
      // A canonical Pass/Fail/N/A select is a scoring item: emit
      // `evaluation_mode='pass_fail_na'` so the backend accepts its `route_tags`
      // (the per-item WMS fail-routing override). Any other select stays
      // informational and carries no route_tags.
      const isPreset = isPassFailNaItem({ kind: "select", options: selectOptions });
      return {
        ...base,
        options: selectOptions,
        ...(isPreset
          ? {
              evaluation_mode: "pass_fail_na",
              route_tags: it.route_tags ?? [],
            }
          : {}),
      };
    }
    case "multi_select": {
      // Trim each option and drop empties — operators sometimes leave a
      // blank row in the editor that we should not persist. `max_choices`
      // then tracks the actual number of valid options the operator
      // committed to, instead of a hardcoded cap that would let
      // inspectors pick more answers than exist.
      const cleanedOptions = (it.options ?? [])
        .map((o) => o.trim())
        .filter(Boolean);
      return {
        ...base,
        options: cleanedOptions,
        min_choices: it.required ? 1 : 0,
        max_choices: cleanedOptions.length,
      };
    }
    case "photo":
      return {
        ...base,
        min_photos: it.required ? 1 : 0,
        max_photos: CHECKLIST_PHOTOS_MAX,
      };
  }
}

// Generate an opaque, backend-valid `key` for a fresh checklist item.
// The key is internal plumbing (used as the response key in
// `checklist_runs.responses`) — the operator never sees it, so we don't
// derive it from the label. A short random suffix gives uniqueness within
// a single template; collisions inside the same template would surface as
// a 422 from the backend, which is the right place for that check.
export function generateChecklistKey(): string {
  // 8 chars of base36 randomness (~41 bits) — same alphabet operators
  // already see on uniqueCode-style identifiers elsewhere in IMS.
  const suffix =
    Math.random().toString(36).slice(2, 6) +
    Math.random().toString(36).slice(2, 6);
  return `item_${suffix.padEnd(8, "0").slice(0, 8)}`;
}

// Helper: convert spec entries array → Record (null if empty)
export function specEntriesToRecord(
  entries: SpecEntry[] | undefined,
): Record<string, string> | null {
  if (!entries?.length) return null;
  const filled = entries.filter((e) => e.key.trim() && e.value.trim());
  if (!filled.length) return null;
  return Object.fromEntries(filled.map((e) => [e.key.trim(), e.value.trim()]));
}

// Helper: a Part stores only the chosen specification NAMES (the values are
// entered per variant — CP-421 E), so keep every keyed row with a blank value.
export function specEntriesToKeyRecord(
  entries: SpecEntry[] | undefined,
): Record<string, string> | null {
  const keys = (entries ?? []).map((e) => e.key.trim()).filter(Boolean);
  if (!keys.length) return null;
  return Object.fromEntries(keys.map((k) => [k, ""]));
}

// Helper: convert Record → spec entries array
export function recordToSpecEntries(
  record: Record<string, string> | null | undefined,
): SpecEntry[] {
  if (!record) return [];
  return Object.entries(record).map(([key, value]) => ({ key, value }));
}
