import { z } from "zod";

// Material Issue: mirrors app/modules/wms/schemas/material_issue.py.

export const WIRED_ISSUE_TYPE_VALUES = [
  "sale_issue",
  "demo_issue",
  "replacement_issue",
] as const;

// One unit per line (post-D14). `ref` lets a component name its parent; no serial = auto-pick.
export const materialIssueLineSchema = z.object({
  ref: z.string().min(1),
  parent_ref: z.string().nullish(),
  parent_item_id: z.string().uuid().nullish(),
  source_line_id: z.string().uuid().nullish(),
  part_variant_id: z.string().uuid("Pick a part variant."),
  serial: z.string().min(1).nullish(),
  substitution_reason: z.string().nullish(),
  notes: z.string().nullish(),
});

export type MaterialIssueLineForm = z.infer<typeof materialIssueLineSchema>;

export const materialIssueFormSchema = z.object({
  issue_type: z.enum(WIRED_ISSUE_TYPE_VALUES, {
    message: "Pick an issue type.",
  }),
  source_entity_id: z.string().uuid("Pick a source document."),
  warehouse_id: z.string().uuid("Pick the issuing warehouse."),
  issued_to_user_id: z.string().uuid("Pick the engineer receiving material."),
  external_ticket_number: z
    .string()
    .max(100, "Max 100 characters.")
    .nullish(),
  notes: z.string().nullish(),
  line_items: z
    .array(materialIssueLineSchema)
    .min(1, "Add at least one line item."),
});

export type MaterialIssueForm = z.infer<typeof materialIssueFormSchema>;

// Header-only patch (draft edit of non-line fields).
export const materialIssueHeaderPatchSchema = z.object({
  notes: z.string().nullish(),
  issued_to_user_id: z.string().uuid().nullish(),
  external_ticket_number: z.string().max(100).nullish(),
});

export type MaterialIssueHeaderPatchForm = z.infer<
  typeof materialIssueHeaderPatchSchema
>;
