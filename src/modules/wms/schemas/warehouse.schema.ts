import { z } from "zod";

// Warehouse form

// Mirrors app/modules/wms/schemas/warehouse.py — the frontend validates
// up-front so the operator sees inline errors instead of a 422 round-trip.

// Backend: `^[A-Z][A-Z0-9_-]{1,19}$` — starts with an uppercase letter,
// then uppercase letters / digits / underscore / hyphen, total 2-20 chars.
const WAREHOUSE_CODE_PATTERN = /^[A-Z][A-Z0-9_-]{1,19}$/;
const WAREHOUSE_CODE_MESSAGE =
  "Start with an uppercase letter, then uppercase letters, numbers, - or _ (2–20 chars).";

// Indian PIN code — exactly 6 numeric digits (no letters/spaces/symbols).
const PINCODE_PATTERN = /^\d{6}$/;
const PINCODE_MESSAGE = "Pincode must be exactly 6 digits.";
export const PINCODE_DIGITS_MESSAGE = "Wrong input, only numeric values allowed.";

// Letters, spaces, hyphens, apostrophes and periods only (e.g. "St. Thomas").
const PLACE_NAME_PATTERN = /^[A-Za-z][A-Za-z\s.'-]*$/;
const PLACE_NAME_MESSAGE =
  "Only letters are allowed (no numbers or special characters).";

const NAME_MAX = 200;
export const WAREHOUSE_DESCRIPTION_MAX = 2000;
const ADDRESS_LINE_MAX = 255;
const CITY_MAX = 100;
const STATE_MAX = 100;
const COUNTRY_MAX = 100;

export const warehouseConditionEnum = z.enum(["new", "refurbished", "new_pull"]);
export type WarehouseConditionInput = z.infer<typeof warehouseConditionEnum>;

export const warehouseFormSchema = z.object({
  name: z
    .string()
    .min(1, "Warehouse name is required.")
    .max(NAME_MAX, `Name must be ${NAME_MAX} characters or fewer.`),
  code: z
    .string()
    .min(2, "Code must be at least 2 characters.")
    .max(20, "Code must be 20 characters or fewer.")
    .regex(WAREHOUSE_CODE_PATTERN, WAREHOUSE_CODE_MESSAGE),
  description: z
    .string()
    .max(WAREHOUSE_DESCRIPTION_MAX, `Description must be ${WAREHOUSE_DESCRIPTION_MAX} characters or fewer.`)
    .nullable()
    .optional(),
  // Backend requires ≥1 category and ≥1 condition.
  category_ids: z
    .array(z.string().uuid())
    .min(1, "Pick at least one category."),
  conditions: z
    .array(warehouseConditionEnum)
    .min(1, "Pick at least one stock condition."),
  address_line1: z
    .string()
    .min(1, "Address line 1 is required.")
    .max(ADDRESS_LINE_MAX, `Must be ${ADDRESS_LINE_MAX} characters or fewer.`),
  address_line2: z
    .string()
    .max(ADDRESS_LINE_MAX, `Must be ${ADDRESS_LINE_MAX} characters or fewer.`)
    .nullable()
    .optional(),
  city: z
    .string()
    .min(1, "City is required.")
    .max(CITY_MAX, `Must be ${CITY_MAX} characters or fewer.`)
    .regex(PLACE_NAME_PATTERN, PLACE_NAME_MESSAGE),
  state: z
    .string()
    .min(1, "State is required.")
    .max(STATE_MAX, `Must be ${STATE_MAX} characters or fewer.`)
    .regex(PLACE_NAME_PATTERN, PLACE_NAME_MESSAGE),
  pincode: z
    .string()
    .min(1, "Pincode is required.")
    // Digits first, so letters or symbols get their own message before the length one.
    .regex(/^\d*$/, PINCODE_DIGITS_MESSAGE)
    .regex(PINCODE_PATTERN, PINCODE_MESSAGE),
  country: z
    .string()
    .min(1, "Country is required.")
    .max(COUNTRY_MAX, `Must be ${COUNTRY_MAX} characters or fewer.`)
    .regex(PLACE_NAME_PATTERN, PLACE_NAME_MESSAGE),
});
export type WarehouseFormInput = z.infer<typeof warehouseFormSchema>;

// Edit mode: `code` is immutable and never sent, so relax it; `extend` avoids a cast (§14.7).
export const warehouseUpdateSchema = warehouseFormSchema.extend({ code: z.string() });
