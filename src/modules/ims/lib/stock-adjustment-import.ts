import { z } from "zod";

import {
  IMPORT_FILE_ACCEPT,
  IMPORT_FILE_MAX_BYTES,
  NOTES_MAX,
  OTHER_REASON_NOTES_MIN,
  STOCK_ADJUSTMENT_REASONS,
} from "./stock-adjustment-labels";

// Zod messages stay with the schema (§16.12 #3). Each doubles as the
// why-tooltip on a disabled "Check file" / "Create draft".
const MSG = {
  warehouse: "Select a warehouse",
  reason: "Select a reason",
  notes: "Notes are required",
  notesMax: `At most ${NOTES_MAX} characters`,
  notesOther: `At least ${OTHER_REASON_NOTES_MIN} characters for "Other"`,
  file: "Choose the filled template",
  fileType: "Only .xlsx or .csv files",
  fileSize: "The file is larger than 5 MB",
  checkFirst: "Check the file first",
  fixRows: "Fix every row with an error and check the file again",
} as const;

const EXTENSIONS = IMPORT_FILE_ACCEPT.split(",");

export const importAdjustmentSchema = z
  .object({
    warehouseId: z.string().min(1, MSG.warehouse),
    warehouseName: z.string(),
    reason: z.union([z.enum(STOCK_ADJUSTMENT_REASONS), z.literal("")]),
    notes: z.string().trim().min(1, MSG.notes).max(NOTES_MAX, MSG.notesMax),
    file: z.instanceof(File).nullable(),
  })
  .superRefine((form, ctx) => {
    const fail = (path: string, message: string) => ctx.addIssue({ code: "custom", path: [path], message });
    if (!form.reason) fail("reason", MSG.reason);
    if (form.reason === "other" && form.notes.trim().length < OTHER_REASON_NOTES_MIN) fail("notes", MSG.notesOther);
    if (!form.file) fail("file", MSG.file);
    else if (!EXTENSIONS.some((ext) => form.file?.name.toLowerCase().endsWith(ext))) fail("file", MSG.fileType);
    else if (form.file.size > IMPORT_FILE_MAX_BYTES) fail("file", MSG.fileSize);
  });

export type ImportAdjustmentForm = z.infer<typeof importAdjustmentSchema>;

/** The first reason the inputs can't be checked yet, or null when they can. */
export function importInputBlocker(values: ImportAdjustmentForm): string | null {
  const parsed = importAdjustmentSchema.safeParse(values);
  return parsed.success ? null : (parsed.error.issues[0]?.message ?? null);
}

/** Why "Create draft" is off: bad inputs, no check yet, or rows with errors. */
export function importCreateBlocker(
  values: ImportAdjustmentForm,
  preview: { lines: unknown[] | null } | undefined,
): string | null {
  const inputs = importInputBlocker(values);
  if (inputs) return inputs;
  if (!preview) return MSG.checkFirst;
  return preview.lines ? null : MSG.fixRows;
}
