import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import type { AsyncSelectOption } from "@/components/ui/async-select";
import { applyServerFieldErrors } from "@shared/api/server-field-errors";

import type { AssignmentRole, WarehouseAssignmentListItem } from "../../api";
import { assignmentFormSchema, type AssignmentFormValues } from "../../schemas";
import { deriveAssignmentCapabilities } from "../../lib/assignment-capabilities";
import { useCreateWarehouseAssignment, useUpdateWarehouseAssignment } from "./useWarehouseTeam";
import { useAssignableUserOptions } from "./useEngineerPickerOptions";

function defaultsFor(assignment: WarehouseAssignmentListItem | undefined): AssignmentFormValues {
  if (!assignment) return { user_id: "", role: "engineer", level: null, notes: "" };
  return {
    user_id: assignment.user.id,
    role: assignment.role,
    level: assignment.level,
    notes: assignment.notes ?? "",
  };
}

interface Args {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  warehouseId: string;
  assignment?: WarehouseAssignmentListItem;
}

/** State owner for the add / edit team-member dialog (§17); capabilities derive from level. */
export function useAssignmentForm({ open, onOpenChange, warehouseId, assignment }: Args) {
  const isEdit = !!assignment;
  const create = useCreateWarehouseAssignment(warehouseId);
  const update = useUpdateWarehouseAssignment(warehouseId);

  const form = useForm<AssignmentFormValues>({
    resolver: zodResolver(assignmentFormSchema),
    defaultValues: defaultsFor(assignment),
  });

  // The picked user option — kept so the trigger shows the name even though
  // the row may not be on the currently-loaded pages (§16.11 #5).
  const [pickedUser, setPickedUser] = useState<AsyncSelectOption | null>(null);
  // Clear the picked user on (re)open during render — the adjust-state-on-
  // prop-change pattern, not setState-in-effect.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setPickedUser(null);
  }

  // RHF's reset is an external store write, so it stays in the effect.
  useEffect(() => {
    if (open) form.reset(defaultsFor(assignment));
  }, [open, assignment, form]);

  const [role, level] = useWatch({ control: form.control, name: ["role", "level"] });

  // Only engineers carry a level — clear it for every other role so a stale
  // value can't leak into submit.
  useEffect(() => {
    if (role !== "engineer") form.setValue("level", null);
  }, [role, form]);

  // Picker is scoped to the role currently selected (BR-2).
  const useUserOptions = useAssignableUserOptions(role);

  const changeRole = (next: AssignmentRole) => {
    form.setValue("role", next, { shouldValidate: true });
    // A new role re-scopes the user picker (BR-2) — the picked user is no
    // longer valid, so clear it instead of leaving a stale name.
    form.setValue("user_id", "");
    setPickedUser(null);
  };

  async function onSubmit(values: AssignmentFormValues) {
    const capabilities = deriveAssignmentCapabilities(values.role, values.level);
    const notes = values.notes?.trim() || null;
    const levelValue = values.level ?? null;
    try {
      if (isEdit && assignment) {
        await update.mutateAsync({
          userId: assignment.user.id,
          body: { level: levelValue, capabilities, notes },
        });
      } else {
        await create.mutateAsync({ user_id: values.user_id, role: values.role, level: levelValue, capabilities, notes });
      }
      onOpenChange(false);
    } catch (e) {
      // Server validation lands on the field; any non-field error was already
      // toasted by the hook (notifyMutationError). Stay open to fix + retry.
      applyServerFieldErrors(e, form.setError);
    }
  }

  return {
    form,
    isEdit,
    isPending: isEdit ? update.isPending : create.isPending,
    role,
    level,
    changeRole,
    pickedUser,
    setPickedUser,
    useUserOptions,
    // The footer button lives outside a <form>, so it invokes this directly.
    submit: form.handleSubmit(onSubmit),
  };
}
