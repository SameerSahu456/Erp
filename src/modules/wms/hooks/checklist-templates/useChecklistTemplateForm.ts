import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { applyServerFieldErrors } from "@shared/api/server-field-errors";
import { asUuid } from "@shared/lib/validation";
import { useNavigateBack } from "@/hooks/use-navigate-back";
import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes-guard";
import {
  createChecklistSchema,
  normalizeChecklistItem,
  useChecklist,
  useChecklistTypes,
  useCreateChecklist,
  useUpdateChecklist,
  type ChecklistItem,
  type ChecklistTemplate,
  type ChecklistTemplateUpdate,
  type CreateChecklistInput,
} from "@modules/ims";

import { CHECKLIST_TEMPLATE_FORM_STRINGS } from "../../components/checklist-templates/checklist-template-form.strings";
import { CHECKLIST_QC_TYPE_CODES, hydrateItems, makeBlankItem } from "../../components/checklist-templates/checklist-template-form-helpers";

const LIST_PATH = "/wms/checklists";
const QC_CODES: readonly string[] = CHECKLIST_QC_TYPE_CODES;

// Edit mode: type_code/target_id are disabled and never sent, so relax them; `extend` avoids a cast (§14.7).
const editChecklistSchema = createChecklistSchema.extend({
  target_id: z.string(),
  type_code: z.string(),
});

const DEFAULT_VALUES: CreateChecklistInput = {
  name: "",
  target_type: "category",
  target_id: "",
  type_code: "",
  items: [makeBlankItem()],
  is_active: true,
};

/** State owner for the checklist-template create/edit form (§17). */
export function useChecklistTemplateForm() {
  // §11.1 — edit mode is decided by the route SHAPE; a malformed `:id` is
  // still edit mode but resolves to the not-found state, never a 422.
  const { id: rawId } = useParams<{ id: string }>();
  const id = asUuid(rawId) ?? "";
  const isEdit = rawId !== undefined;
  const navigate = useNavigate();
  // Cancel + back-arrow return to the origin with its state restored,
  // falling back to the list on a deep link (§10).
  const navigateBack = useNavigateBack(LIST_PATH);

  const existingQuery = useChecklist(id);
  const existing = existingQuery.data;
  const create = useCreateChecklist();
  const update = useUpdateChecklist(id);
  const isPending = isEdit ? update.isPending : create.isPending;

  const { data: types, isLoading: typesLoading } = useChecklistTypes();
  // Only surface Inward QC + Outward QC (retired types hidden) AND only
  // active ones. Codes are the exact UPPERCASE backend type_codes.
  const activeTypes = useMemo(
    () => (types ?? []).filter((t) => t.is_active && QC_CODES.includes(t.code)),
    [types],
  );

  const form = useForm<CreateChecklistInput>({
    resolver: zodResolver(isEdit ? editChecklistSchema : createChecklistSchema),
    defaultValues: DEFAULT_VALUES,
  });
  const { handleSubmit, reset, formState, setError, getValues } = form;
  // §3/§5 — guard every way out of a dirty form; FormPageShell routes its
  // Cancel and back-arrow through this same guard.
  const guard = useUnsavedChangesGuard({ isDirty: formState.isDirty });

  // Hydrate the form once the existing template lands in edit mode.
  useEffect(() => {
    if (!isEdit || !existing) return;
    reset({
      name: existing.name,
      target_type: existing.target_type,
      target_id: existing.target_id,
      type_code: existing.type_code,
      items: hydrateItems(existing.items),
      is_active: existing.is_active,
    });
  }, [isEdit, existing, reset]);

  // Preview: a template snapshot of the form values, so it renders without a round-trip.
  const [previewOpen, setPreviewOpen] = useState(false);
  const [preview, setPreview] = useState<{
    template: ChecklistTemplate | null;
    typeLabel?: string;
  }>({ template: null });

  function openPreview() {
    const values = getValues();
    const now = new Date().toISOString();
    const template: ChecklistTemplate | null =
      values.items && values.items.length > 0
        ? {
            id: existing?.id ?? "preview",
            name: values.name || CHECKLIST_TEMPLATE_FORM_STRINGS.untitledChecklist,
            target_type: values.target_type,
            target_id: values.target_id || "",
            type_code: values.type_code || "",
            items: values.items.map(normalizeChecklistItem) as ChecklistItem[],
            is_active: true,
            created_by: existing?.created_by ?? "",
            created_at: existing?.created_at ?? now,
            updated_at: existing?.updated_at ?? now,
          }
        : null;
    const typeLabel = activeTypes.find((t) => t.code === values.type_code)?.label;
    setPreview({ template, typeLabel });
    setPreviewOpen(true);
  }

  async function onSubmit(values: CreateChecklistInput) {
    try {
      if (isEdit && existing) {
        // Backend's ChecklistTemplateUpdate (extra='forbid') rejects identity
        // fields; only name / items / is_active are mutable post-create.
        const updatePayload: ChecklistTemplateUpdate = {
          name: values.name.trim(),
          items: values.items.map(normalizeChecklistItem),
          is_active: values.is_active ?? true,
        };
        await update.mutateAsync(updatePayload);
        guard.bypassOnce();
        await guard.popSentinelIfPresent();
        // Edit: pop the /edit URL off history so Back from the destination
        // goes to wherever they came from, not back into the form.
        navigate(-1);
        return;
      }
      const created = await create.mutateAsync({
        name: values.name.trim(),
        target_type: values.target_type,
        target_id: values.target_id,
        type_code: values.type_code,
        items: values.items.map(normalizeChecklistItem),
        is_active: true,
      });
      guard.bypassOnce();
      await guard.popSentinelIfPresent();
      // §10 — land on the new template's detail and REPLACE the /new URL.
      navigate(`${LIST_PATH}/${created.id}`, { replace: true });
    } catch (e) {
      // Server validation lands on the field; any non-field error was already
      // toasted by the hook (notifyMutationError). Stay on the form to fix it.
      applyServerFieldErrors(e, setError);
    }
  }

  return {
    form,
    isEdit,
    existing,
    isLoading: isEdit && existingQuery.isLoading,
    notFound: isEdit && !existingQuery.isLoading && !existing,
    isPending,
    typesLoading,
    activeTypes,
    guard,
    navigateBack,
    listPath: LIST_PATH,
    save: () => void handleSubmit(onSubmit)(),
    preview,
    previewOpen,
    setPreviewOpen,
    openPreview,
  };
}
