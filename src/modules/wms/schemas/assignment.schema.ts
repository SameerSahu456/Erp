import { z } from "zod";

// Warehouse team assignment form; mirrors the backend schema. Only engineers take a level.
// Only a superuser can appoint a warehouse_manager (backend enforced).

export const ASSIGNMENT_ROLES = [
  "warehouse_manager",
  "store_manager",
  "mis",
  "engineer",
] as const;
export const ASSIGNMENT_LEVELS = ["l1", "l2", "l3"] as const;
export const ASSIGNMENT_CAPABILITIES = ["inspection", "repair", "qc", "outward_qc"] as const;

export const assignmentFormSchema = z
  .object({
    user_id: z.string().uuid("Pick a user."),
    role: z.enum(ASSIGNMENT_ROLES),
    level: z.enum(ASSIGNMENT_LEVELS).nullable().optional(),
    notes: z.string().max(2000).optional(),
  })
  .superRefine((value, ctx) => {
    const isManager =
      value.role === "warehouse_manager" ||
      value.role === "store_manager" ||
      value.role === "mis";
    if (isManager) {
      if (value.level) {
        ctx.addIssue({
          code: "custom",
          message: "Managers and MIS carry no level.",
          path: ["level"],
        });
      }
      return;
    }
    // role === "engineer" — level is the only required extra field now.
    if (!value.level) {
      ctx.addIssue({
        code: "custom",
        message: "Engineers require a level.",
        path: ["level"],
      });
    }
  });

export type AssignmentFormValues = z.infer<typeof assignmentFormSchema>;
