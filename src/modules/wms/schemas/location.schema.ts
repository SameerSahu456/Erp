import { z } from "zod";

import { CAPACITY_MIN, CAPACITY_MODES } from "../constants";

// Location form (rack or bin), used by LocationFormDialog

const capacityModeValues = CAPACITY_MODES.map((m) => m.value) as [
  "single",
  "multiple",
];

const nonBlank = (msg: string) =>
  z.string().trim().min(1, msg);

type CapacityFields = { capacity_mode?: "single" | "multiple"; capacity?: number };

// Storage locations need a capacity mode + capacity; "single" pins capacity to 1.
function refineCapacity(value: CapacityFields, ctx: z.RefinementCtx, missingCapacity: string) {
  if (!value.capacity_mode) {
    ctx.addIssue({
      code: "custom",
      message: "Pick a capacity mode.",
      path: ["capacity_mode"],
    });
  }
  if (value.capacity == null) {
    ctx.addIssue({
      code: "custom",
      message: missingCapacity,
      path: ["capacity"],
    });
  }
  if (value.capacity_mode === "single" && value.capacity != null && value.capacity !== 1) {
    ctx.addIssue({
      code: "custom",
      message: "Single slot means capacity = 1.",
      path: ["capacity"],
    });
  }
}

// Rack → with-bins or direct storage; bin → always storage. Mapped to backend shape on submit.
export const locationFormSchema = z
  .object({
    level: z.enum(["rack", "bin"]),
    name: nonBlank("Name is required.").max(100),
    description: z.string().max(2000).optional().or(z.literal("")),
    // Rack-only fields
    rack_mode: z.enum(["with_bins", "direct_storage"]).optional(),
    // Bin-only field
    parent_location_id: z.string().uuid().optional(),
    // Capacity (used by direct-storage racks and all bins)
    capacity_mode: z.enum(capacityModeValues).optional(),
    capacity: z
      .number({ message: "Enter a number." })
      .int("Capacity must be a whole number.")
      .min(CAPACITY_MIN, `Capacity must be at least ${CAPACITY_MIN}.`)
      .optional(),
    is_active: z.boolean(),
  })
  .superRefine((value, ctx) => {
    if (value.level === "rack") {
      if (!value.rack_mode) {
        ctx.addIssue({
          code: "custom",
          message: "Pick how this rack works.",
          path: ["rack_mode"],
        });
      }
      if (value.rack_mode === "direct_storage") {
        refineCapacity(value, ctx, "Enter the rack's capacity.");
      }
    }

    if (value.level === "bin") {
      if (!value.parent_location_id) {
        ctx.addIssue({
          code: "custom",
          message: "Pick the parent rack.",
          path: ["parent_location_id"],
        });
      }
      refineCapacity(value, ctx, "Enter the bin's capacity.");
    }
  });

export type LocationFormValues = z.infer<typeof locationFormSchema>;
