import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { useNavigateBack } from "@/hooks/use-navigate-back";
import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes-guard";
import { asUuid } from "@shared/lib/validation";
import { applyServerFieldErrors } from "@shared/api/server-field-errors";

import {
  warehouseFormSchema,
  warehouseUpdateSchema,
  type WarehouseConditionInput,
  type WarehouseFormInput,
} from "../../schemas";
import { useWarehouse, useCreateWarehouse, useUpdateWarehouse } from "./useWarehouses";
import { WAREHOUSE_FORM_STRINGS } from "../../components/warehouses/warehouse-form.strings";

const LIST_PATH = "/wms/locations";

const EMPTY_VALUES: WarehouseFormInput = {
  name: "",
  code: "",
  description: "",
  category_ids: [],
  conditions: [],
  address_line1: "",
  address_line2: "",
  city: "",
  state: "",
  pincode: "",
  country: "India",
};

/** State owner for the warehouse create/edit form (§17). */
export function useWarehouseForm() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  // §11.1: a malformed id keeps queries disabled and shows not-found.
  const validId = asUuid(id) ?? "";
  const navigate = useNavigate();

  const existingQuery = useWarehouse(validId);
  const existing = existingQuery.data;
  const create = useCreateWarehouse();
  const update = useUpdateWarehouse(validId);
  const isPending = isEdit ? update.isPending : create.isPending;

  const form = useForm<WarehouseFormInput>({
    // Edit mode relaxes `code` — it's immutable / disabled.
    resolver: zodResolver(isEdit ? warehouseUpdateSchema : warehouseFormSchema),
    defaultValues: EMPTY_VALUES,
  });
  const { handleSubmit, formState, setError, reset } = form;

  // Hydrate the form when the existing warehouse lands (edit mode).
  useEffect(() => {
    if (!isEdit || !existing) return;
    reset(
      {
        name: existing.name,
        code: existing.code,
        description: existing.description ?? "",
        category_ids: existing.category_ids,
        conditions: existing.conditions as WarehouseConditionInput[],
        address_line1: existing.address_line1,
        address_line2: existing.address_line2 ?? "",
        city: existing.city,
        state: existing.state,
        pincode: existing.pincode,
        country: existing.country,
      },
      // A plain reset drops every field's registration and counts on the next render to
      // register them again; the React Compiler skips that re-render, so typing never
      // reached the form and Save sent the old name and description.
      { keepFieldsRef: true },
    );
  }, [isEdit, existing, reset]);

  // Unsaved-changes guard, shared with FormPageShell's back-arrow and Cancel (§10).
  const guard = useUnsavedChangesGuard({ isDirty: formState.isDirty });
  // Cancel + back-arrow return to where the user came from, falling back to
  // the list root on a deep link (§10).
  const navigateBack = useNavigateBack(LIST_PATH);

  // Editing a warehouse that no longer exists → toast + a friendly not-found
  // page instead of a broken empty form (§3).
  const editMissing = isEdit && !existingQuery.isLoading && !existing;
  useEffect(() => {
    if (editMissing) toast.error(WAREHOUSE_FORM_STRINGS.notFound.message);
  }, [editMissing]);

  async function onSubmit(values: WarehouseFormInput) {
    const payload = {
      name: values.name.trim(),
      description: values.description?.trim() || null,
      category_ids: values.category_ids,
      conditions: values.conditions,
      address_line1: values.address_line1.trim(),
      address_line2: values.address_line2?.trim() || null,
      city: values.city.trim(),
      state: values.state.trim(),
      pincode: values.pincode.trim(),
      country: values.country.trim(),
    };
    try {
      const saved =
        isEdit && existing
          ? // `code` is immutable — never sent on update.
            await update.mutateAsync(payload)
          : await create.mutateAsync({
              ...payload,
              code: values.code.trim(),
              is_active: true,
            });
      // Saved: skip the discard guard, then go to the detail page.
      guard.bypassOnce();
      await guard.popSentinelIfPresent();
      navigate(`${LIST_PATH}/${saved.id}`, { replace: true });
    } catch (err) {
      // Show server validation errors on their fields; stay on the form.
      applyServerFieldErrors(err, setError);
    }
  }

  return {
    form,
    isEdit,
    existing,
    isLoading: isEdit && existingQuery.isLoading,
    editMissing,
    isPending,
    guard,
    navigateBack,
    listPath: LIST_PATH,
    save: () => void handleSubmit(onSubmit)(),
  };
}
