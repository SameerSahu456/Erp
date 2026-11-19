import { Controller, useFormState } from "react-hook-form";
import { Loader2 } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Typography } from "@/components/ui/typography";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AsyncSelect } from "@/components/ui/async-select";
import { cn } from "@/lib/utils";

import type { AssignmentRole, WarehouseAssignmentListItem } from "../../api";
import { ASSIGNMENT_LEVELS } from "../../schemas";
import { useAssignmentForm } from "../../hooks/warehouses/useAssignmentForm";
import { ASSIGNMENT_LEVEL_LABELS, ASSIGNMENT_ROLE_LABELS } from "../../constants/assignment";
import { OperationDialog } from "../shared/OperationDialog";
import { FormField } from "../shared/FormField";
import { ASSIGNMENT_FORM_DIALOG_STRINGS as S } from "./assignment-form-dialog.strings";

const ROLES = Object.keys(ASSIGNMENT_ROLE_LABELS) as AssignmentRole[];
const NOTES_ROWS = 2;
const INITIALS_FALLBACK = "?";

type FormState = ReturnType<typeof useAssignmentForm>;

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || INITIALS_FALLBACK;
}

interface AssignmentFormDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  warehouseId: string;
  warehouseName: string;
  /** Pre-fills the form when editing. Role is immutable on edit (BR-5). */
  assignment?: WarehouseAssignmentListItem;
}

function saveLabel(isPending: boolean, isEdit: boolean) {
  if (isPending) return S.saving;
  return isEdit ? S.saveChanges : S.addMember;
}

/** Role — locked on edit (immutable, BR-5). */
function RoleField({ f }: { f: FormState }) {
  return (
    <FormField label={S.fields.role} required helper={f.isEdit ? S.roleHelpEdit : S.roleHelpAdd}>
      <Select
        items={ASSIGNMENT_ROLE_LABELS}
        value={f.role}
        onValueChange={(v) => f.changeRole(v as AssignmentRole)}
        disabled={f.isEdit}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder={S.placeholders.role} />
        </SelectTrigger>
        <SelectContent>
          {ROLES.map((r) => (
            <SelectItem key={r} value={r}>
              {ASSIGNMENT_ROLE_LABELS[r]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FormField>
  );
}

/** The person being edited: shown, not changeable. */
function LockedUserField({ assignment }: { assignment: WarehouseAssignmentListItem }) {
  return (
    <FormField label={S.fields.user} required helper={S.userHelpEdit}>
      <div className="flex h-10 min-w-0 items-center gap-2.5 rounded-md border border-input bg-muted/20 px-3">
        <Avatar className="size-6 shrink-0">
          <AvatarFallback>{initials(assignment.user.name)}</AvatarFallback>
        </Avatar>
        <Typography variant="body" truncate asChild>
          <span className="min-w-0 flex-1">{assignment.user.name}</span>
        </Typography>
        <Typography variant="helper" tone="muted" truncate asChild>
          <span className="min-w-0 shrink">{assignment.user.email}</span>
        </Typography>
      </div>
    </FormField>
  );
}

function UserPickerField({ f }: { f: FormState }) {
  const { errors } = useFormState({ control: f.form.control });
  return (
    <FormField
      label={S.fields.user}
      required
      helper={S.userHelpAdd}
      error={errors.user_id?.message}
    >
      <Controller
        control={f.form.control}
        name="user_id"
        render={({ field }) => (
          <AsyncSelect
            key={f.role}
            value={field.value && f.pickedUser?.id === field.value ? f.pickedUser : null}
            onValueChange={(v) => {
              f.setPickedUser(v);
              field.onChange(v?.id ?? "");
            }}
            useOptions={f.useUserOptions}
            toLabel={(o) => o.label}
            placeholder={S.placeholders.user}
            searchPlaceholder={S.placeholders.userSearch}
            className={cn("h-10 w-full", errors.user_id && "border-destructive")}
            chevron="down"
            loadOnOpen
          />
        )}
      />
    </FormField>
  );
}

/** Level — engineers only. */
function LevelField({ f }: { f: FormState }) {
  const { errors } = useFormState({ control: f.form.control });
  return (
    <FormField label={S.fields.level} required error={errors.level?.message}>
      <Select
        items={ASSIGNMENT_LEVEL_LABELS}
        value={f.level ?? ""}
        onValueChange={(v) =>
          f.form.setValue("level", v as (typeof ASSIGNMENT_LEVELS)[number], { shouldValidate: true })
        }
      >
        <SelectTrigger className="w-full" aria-invalid={errors.level ? true : undefined}>
          <SelectValue placeholder={S.placeholders.level} />
        </SelectTrigger>
        <SelectContent>
          {ASSIGNMENT_LEVELS.map((l) => (
            <SelectItem key={l} value={l}>
              {ASSIGNMENT_LEVEL_LABELS[l]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FormField>
  );
}

/**
 * Add / edit a warehouse team member. Role drives the shape:
 *   store_manager / mis / warehouse_manager → just the user.
 *   engineer            → level (l1/l2/l3) only.
 * Dynamic assignment (2026-09): capabilities are DERIVED from level at submit
 * as DB placeholders, so there is no capability picker.
 */
export function AssignmentFormDialog(props: AssignmentFormDialogProps) {
  const { open, onOpenChange, assignment, warehouseName } = props;
  const f = useAssignmentForm(props);
  const { form, isEdit, isPending, role } = f;

  return (
    <OperationDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? S.titleEdit : S.titleAdd}
      description={isEdit ? S.descriptionEdit : S.descriptionAdd(warehouseName)}
      isDirty={form.formState.isDirty}
      footer={({ requestClose }) => (
        <>
          <Button variant="outline" onClick={requestClose} disabled={isPending}>
            {S.cancel}
          </Button>
          <Button onClick={f.submit} disabled={isPending}>
            {isPending && <Loader2 className="size-4 animate-spin" data-icon="inline-start" />}
            {saveLabel(isPending, isEdit)}
          </Button>
        </>
      )}
    >
      <div className="flex flex-col gap-5">
        {assignment ? (
          <>
            <LockedUserField assignment={assignment} />
            <RoleField f={f} />
          </>
        ) : (
          <>
            <RoleField f={f} />
            <UserPickerField f={f} />
          </>
        )}
        {role === "engineer" && <LevelField f={f} />}
        <FormField label={S.fields.notes} htmlFor="assign-notes">
          <Textarea
            id="assign-notes"
            {...form.register("notes")}
            placeholder={S.placeholders.notes}
            rows={NOTES_ROWS}
            className="resize-none"
          />
        </FormField>
      </div>
    </OperationDialog>
  );
}
