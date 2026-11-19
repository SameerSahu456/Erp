import { useEffect, useMemo } from "react";
import {
  useForm,
  useWatch,
  type Control,
  type UseFormSetValue,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Typography } from "@/components/ui/typography";
import { FormPageShell } from "@/components/page-shells";

import {
  useCreateChecklist,
  useChecklistTypes,
  useUpdateChecklist,
} from "../../hooks/checklists/useChecklists";
import { useDialogDirtyGuard } from "@/shared/hooks";
import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes-guard";
import { DiscardChangesAlertDialog } from "@/shared/components/DiscardChangesAlertDialog";
import {
  createChecklistSchema,
  generateChecklistKey,
  normalizeChecklistItem,
  updateChecklistSchema,
  type ChecklistItemInput,
  type CreateChecklistInput,
} from "../../schemas";
import type {
  ChecklistItem,
  ChecklistTemplate,
  ChecklistTemplateUpdate,
} from "../../api";
import { isQcChecklistType } from "../../lib/checklist-types";
import { ChecklistItemsEditor } from "./ChecklistItemsEditor";
import { type ChecklistFormShape } from "./checklist-items-editor-helpers";
import { CHECKLISTS_STRINGS } from "./checklists.strings";

export function CreateChecklistDialog({
  open,
  onOpenChange,
  partId,
  editTemplate,
  onCreated,
  onUpdated,
  variant = "dialog",
  onDirtyChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  partId: string;
  /** When supplied, the dialog renders in edit mode against this template.
   *  Identity (`target_type` / `target_id` / `type_code`) is immutable per
   *  the backend's `ChecklistTemplateUpdate` (extra='forbid' rejects them),
   *  so the Type select is disabled and those fields are stripped from
   *  the wire payload on save. */
  editTemplate?: ChecklistTemplate;
  onCreated?: (template: ChecklistTemplate) => void;
  onUpdated?: (template: ChecklistTemplate) => void;
  /** When 'page', renders inside a plain section instead of a Dialog —
   *  used by the standalone /ims/parts/:partId/checklists routes. The
   *  page wrapper still calls `onOpenChange(false)` after save / cancel
   *  to trigger the route navigation. */
  variant?: "dialog" | "page";
  /** Fires whenever the internal RHF `isDirty` flag flips. Used by
   *  ChecklistFormPage to wire its header Back button + browser-level
   *  unsaved-changes prompts against the form state owned in here. */
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const isEdit = !!editTemplate;
  const create = useCreateChecklist();
  const update = useUpdateChecklist(editTemplate?.id ?? "");
  const isPending = isEdit ? update.isPending : create.isPending;

  const { data: types, isLoading: typesLoading } = useChecklistTypes();
  const activeTypes = useMemo(
    () => (types ?? []).filter((t) => t.is_active),
    [types],
  );
  const typeOptions = typeOptionsFor(activeTypes, isEdit);

  const form = useForm<CreateChecklistInput>({
    // In edit mode `type_code`, `target_type`, and `target_id` are disabled
    // (backend's ChecklistTemplateUpdate `extra='forbid'` rejects them);
    // the update schema drops them so the form never blocks save on values
    // the user can't change.
    resolver: zodResolver(
      (isEdit
        ? updateChecklistSchema
        : createChecklistSchema) as unknown as typeof createChecklistSchema,
    ),
    defaultValues: {
      name: "",
      target_type: "part",
      target_id: partId,
      type_code: "",
      items: [makeBlankItem()],
      is_active: true,
    },
  });

  const { control, handleSubmit, register, reset, formState, setValue } = form;

  useEffect(() => {
    onDirtyChange?.(formState.isDirty);
  }, [formState.isDirty, onDirtyChange]);

  useEffect(() => {
    if (!open) return;
    if (editTemplate) {
      reset({
        name: editTemplate.name,
        target_type: editTemplate.target_type,
        target_id: editTemplate.target_id,
        type_code: editTemplate.type_code,
        items: hydrateItems(editTemplate.items),
        is_active: editTemplate.is_active,
      });
    } else {
      reset({
        name: "",
        target_type: "part",
        target_id: partId,
        type_code: "",
        items: [makeBlankItem()],
        is_active: true,
      });
    }
  }, [open, partId, editTemplate, reset]);

  async function onSubmit(values: CreateChecklistInput) {
    try {
      if (isEdit && editTemplate) {
        const updatePayload: ChecklistTemplateUpdate = {
          name: values.name.trim(),
          items: values.items.map(normalizeChecklistItem),
          is_active: values.is_active ?? true,
        };
        const updated = await update.mutateAsync(updatePayload);
        onUpdated?.(updated);
      } else {
        const payload = {
          name: values.name.trim(),
          target_type: "part" as const,
          target_id: partId,
          type_code: values.type_code,
          items: values.items.map(normalizeChecklistItem),
          is_active: values.is_active ?? true,
        };
        const created = await create.mutateAsync(payload);
        onCreated?.(created);
      }
      // Reset the form to the just-submitted values BEFORE closing /
      // navigating — `isDirty` flips false and the parent page's
      // `useUnsavedChangesGuard` (driven via `onDirtyChange` above) sees
      // a clean form, so the `onOpenChange(false)` → `navigate(-1)`
      // call that follows doesn't trip the discard-changes dialog.
      reset(values);
      // Suppress the page-variant guard's popstate handler for the navigation
      // the close triggers after a successful save (no-op in dialog variant).
      pageGuard.bypassOnce();
      onOpenChange(false);
    } catch (e) {
      const message =
        e instanceof Error
          ? e.message
          : isEdit
            ? CHECKLISTS_STRINGS.createDialog.toast.updateFailed
            : CHECKLISTS_STRINGS.createDialog.toast.createFailed;
      toast.error(message);
    }
  }

  const errors = formState.errors;
  const { guardedOnOpenChange, confirmOpen, confirmDiscard, cancelDiscard } =
    useDialogDirtyGuard(form.formState.isDirty, onOpenChange);

  // The page variant (standalone /ims/parts/:partId/checklists route) renders
  // inside FormPageShell, which owns the sticky footer + unsaved-changes guard.
  // Feeding `isDirty: false` when not in page mode keeps every effect inside
  // this guard inert, so the dialog variant is untouched (it keeps
  // useDialogDirtyGuard above).
  const pageGuard = useUnsavedChangesGuard({
    isDirty: variant === "page" && formState.isDirty,
  });

  const heading = isEdit ? CHECKLISTS_STRINGS.createDialog.editHeading : CHECKLISTS_STRINGS.createDialog.newHeading;
  const subhead = isEdit
    ? CHECKLISTS_STRINGS.createDialog.editSubhead
    : CHECKLISTS_STRINGS.createDialog.newSubhead;

  // Split top-form (Name + Type) and items editor so the page variant
  // can put them in different flex slots: top-form stays pinned, items
  // editor takes the scrollable middle. Dialog variant composes both
  // into `formBody` and scrolls the whole thing together.
  const topForm = (
    <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label htmlFor="cl-name" required>{CHECKLISTS_STRINGS.createDialog.nameLabel}</Label>
        <Input
          id="cl-name"
          {...register("name")}
          placeholder={CHECKLISTS_STRINGS.createDialog.namePlaceholder}
          autoFocus
          aria-invalid={errors.name ? "true" : undefined}
        />
        {errors.name && (
          <Typography asChild variant="helper" tone="danger">
            <p>{errors.name.message}</p>
          </Typography>
        )}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="cl-type" required>{CHECKLISTS_STRINGS.createDialog.typeLabel}</Label>
        <TypeSelect
          control={control}
          setValue={setValue}
          disabled={typesLoading || isEdit}
          types={typeOptions}
        />
        {errors.type_code ? (
          <Typography asChild variant="helper" tone="danger">
            <p>{errors.type_code.message}</p>
          </Typography>
        ) : isEdit ? (
          <Typography asChild variant="helper">
            <p>{CHECKLISTS_STRINGS.createDialog.typeImmutableHint}</p>
          </Typography>
        ) : null}
      </div>
    </div>
  );

  const itemsEditor = (
    <ChecklistItemsEditor
      control={control as unknown as Control<ChecklistFormShape>}
      register={register as never}
      setValue={setValue as never}
      itemErrors={errors.items}
    />
  );

  const formBody = (
    <>
      {topForm}
      {itemsEditor}
    </>
  );

  if (variant === "page") {
    return (
      <FormPageShell
        title={
          isEdit
            ? CHECKLISTS_STRINGS.formPage.editTitle
            : CHECKLISTS_STRINGS.formPage.addTitle
        }
        backHref={`/ims/parts/${partId}`}
        // Cancel + back both leave via the parent's onOpenChange(false) →
        // navigate(-1); the shell routes both through the guard so a dirty
        // form prompts to discard first.
        onBack={() => onOpenChange(false)}
        onCancel={() => onOpenChange(false)}
        onSave={() => void handleSubmit(onSubmit)()}
        saving={isPending}
        saveLabel={
          isEdit
            ? CHECKLISTS_STRINGS.createDialog.saveChanges
            : CHECKLISTS_STRINGS.createDialog.createChecklist
        }
        guard={pageGuard}
      >
        {/* Native <form> kept so Enter submits; the shell's Save button
            (outside the form) fires the same handleSubmit. Heading + Name/Type
            pin at the top; the items editor flows below and the page scrolls
            under the shell's sticky footer. The items editor's own toolbar
            (Collapse / Add) is sticky, so it pins as you scroll. */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="rounded-xl border bg-card shadow-sm"
        >
          <div className="border-b px-6 py-4">
            <Typography variant="card-title">{heading}</Typography>
            <Typography asChild variant="helper" className="mt-0.5">
              <p>{subhead}</p>
            </Typography>
          </div>
          <div className="border-b px-6 py-4">{topForm}</div>
          <div className="px-6 py-4">{itemsEditor}</div>
        </form>
      </FormPageShell>
    );
  }

  return (
    <Dialog open={open} onOpenChange={guardedOnOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 sm:max-w-3xl">
        <DialogHeader className="border-b pb-3">
          <Typography asChild variant="body-lg">
            <DialogTitle>{heading}</DialogTitle>
          </Typography>
          <Typography asChild variant="helper">
            <p>{subhead}</p>
          </Typography>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="flex-1 space-y-5 overflow-y-auto px-1 py-4">
            {formBody}
          </div>

          <DialogFooter className="border-t pt-3 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => guardedOnOpenChange(false)}
              disabled={isPending}
            >
              {CHECKLISTS_STRINGS.createDialog.cancel}
            </Button>
            <Button type="submit" disabled={isPending} throttleMs={500}>
              {isPending
                ? isEdit
                  ? CHECKLISTS_STRINGS.createDialog.saving
                  : CHECKLISTS_STRINGS.createDialog.creating
                : isEdit
                  ? CHECKLISTS_STRINGS.createDialog.saveChanges
                  : CHECKLISTS_STRINGS.createDialog.createChecklist}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
      <DiscardChangesAlertDialog
        open={confirmOpen}
        onConfirm={confirmDiscard}
        onCancel={cancelDiscard}
      />
    </Dialog>
  );
}

function hydrateItems(items: ChecklistItem[]): ChecklistItemInput[] {
  if (!items || items.length === 0) return [makeBlankItem()];
  return items.map((it) => ({
    key: it.key || generateChecklistKey(),
    label: it.label,
    kind: it.kind,
    required: it.required,
    notes: it.notes ?? undefined,
    integer_only: !!it.integer_only,
    min_length: it.min_length ?? undefined,
    max_length: it.max_length ?? undefined,
    min_value: it.min_value ?? undefined,
    max_value: it.max_value ?? undefined,
    options: it.options ?? undefined,
    min_choices: it.min_choices ?? undefined,
    max_choices: it.max_choices ?? undefined,
    min_photos: it.min_photos ?? undefined,
    max_photos: it.max_photos ?? undefined,
    // Carry the WMS fail-routing tags so editing a tagged template preserves
    // them (re-derived/validated on submit via normalizeChecklistItem).
    evaluation_mode: it.evaluation_mode ?? undefined,
    route_tags: it.route_tags ?? undefined,
  }));
}

function makeBlankItem(): ChecklistItemInput {
  return {
    key: generateChecklistKey(),
    label: "",
    kind: "text",
    required: true,
    integer_only: false,
  };
}

/** Create offers only Inward / Outward QC (as WMS Checklist Management does);
 *  edit keeps the full list so a locked legacy type still shows its label. */
function typeOptionsFor<T extends { code: string }>(types: T[], isEdit: boolean): T[] {
  return isEdit ? types : types.filter((t) => isQcChecklistType(t.code));
}

function TypeSelect({
  control,
  setValue,
  types,
  disabled,
}: {
  control: Control<CreateChecklistInput>;
  setValue: UseFormSetValue<CreateChecklistInput>;
  types: { code: string; label: string }[];
  disabled?: boolean;
}) {
  const value = useWatch({ control, name: "type_code" });
  return (
    <Select
      value={value || undefined}
      onValueChange={(v) =>
        setValue("type_code", v ?? "", { shouldValidate: true, shouldDirty: true })
      }
      disabled={disabled}
    >
      <SelectTrigger
        id="cl-type"
        className="h-10 w-full"
        clearable={!!value}
        onClear={() =>
          setValue("type_code", "", { shouldValidate: true, shouldDirty: true })
        }
      >
        {value ? (
          <span className="truncate">
            {types.find((t) => t.code === value)?.label ?? value}
          </span>
        ) : (
          <span className="text-muted-foreground">{CHECKLISTS_STRINGS.createDialog.selectTypePlaceholder}</span>
        )}
      </SelectTrigger>
      <SelectContent>
        {types.map((t) => (
          <SelectItem key={t.code} value={t.code}>
            {t.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
