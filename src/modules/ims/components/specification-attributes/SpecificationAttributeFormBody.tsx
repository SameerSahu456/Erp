import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Typography } from "@/components/ui/typography";
import { TagInput } from "@/components/common/pickers/TagInput";
import { CategoryMultiPicker } from "@/components/common/pickers/CategoryMultiPicker";
import { FormPageShell } from "@/components/page-shells";
import { useFormUnsavedGuard } from "@/shared/hooks";
import { useNavigateBack } from "@/hooks/use-navigate-back";
import { asUuid } from "@shared/lib/validation";

import {
  useCreateSpecificationAttribute,
  useSpecificationAttribute,
  useUpdateSpecificationAttribute,
} from "../../hooks/specification-attributes/useSpecificationAttributes";
import { SPEC_ATTRIBUTES_STRINGS } from "./specification-attributes.strings";

const F = SPEC_ATTRIBUTES_STRINGS.form;
const LIST_HREF = "/ims/specification-attributes";

// Caps mirror the backend: the name becomes a part/variant specs key
// (50 chars), each suggested value a specs value (200), at most 100 values.
const NAME_MAX = 50;
const VALUE_MAX = 200;
const VALUES_MAX = 100;

const specificationAttributeSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Name is required.")
      .max(NAME_MAX, `Name must be ${NAME_MAX} characters or fewer.`)
      .regex(/^[\p{L}\p{N}]/u, "Name must start with a letter or number."),
    values: z
      .array(z.string().trim().min(1).max(VALUE_MAX, `Each value must be ${VALUE_MAX} characters or fewer.`))
      .max(VALUES_MAX, `At most ${VALUES_MAX} suggested values.`),
    is_active: z.boolean(),
    // Categories to map the attribute to on creation (create flow only).
    category_ids: z.array(z.string()),
  })
  // An active attribute must offer at least one suggested value, else there's
  // nothing to pick when it's used (CP-421). A draft (inactive) may have none.
  .superRefine((val, ctx) => {
    if (val.is_active && val.values.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["values"],
        message: "Add at least one suggested value before this attribute can be active.",
      });
    }
  });
type SpecificationAttributeFormInput = z.infer<typeof specificationAttributeSchema>;

export function SpecificationAttributeFormBody() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  // §11.1 — a malformed route id keeps the query disabled and falls through
  // to the not-found state below instead of sending a non-UUID to the API.
  const validId = asUuid(id) ?? "";
  const navigate = useNavigate();

  const { data: attr, isLoading, isError } = useSpecificationAttribute(validId);
  const create = useCreateSpecificationAttribute();
  const update = useUpdateSpecificationAttribute(validId);

  const form = useForm<SpecificationAttributeFormInput>({
    resolver: zodResolver(specificationAttributeSchema),
    mode: "onBlur",
    defaultValues: { name: "", values: [], is_active: true, category_ids: [] },
  });
  const isActive = useWatch({ control: form.control, name: "is_active" });
  const values = useWatch({ control: form.control, name: "values" });
  const categoryIds = useWatch({ control: form.control, name: "category_ids" });

  useEffect(() => {
    if (!isEdit || !attr) return;
    // Prefill the saved category mapping so the edit form shows and can change
    // it (the single GET returns `category_ids`).
    form.reset({
      name: attr.name,
      values: attr.values,
      is_active: attr.is_active,
      category_ids: attr.category_ids ?? [],
    });
  }, [isEdit, attr, form]);

  const guard = useFormUnsavedGuard(form);
  const navigateBack = useNavigateBack(LIST_HREF);

  async function onSubmit(v: SpecificationAttributeFormInput) {
    try {
      const payload = {
        name: v.name.trim(),
        values: v.values.map((x) => x.trim()).filter(Boolean),
        is_active: v.is_active,
        category_ids: v.category_ids,
      };
      if (isEdit) await update.mutateAsync(payload);
      else await create.mutateAsync(payload);
      form.reset(v);
      guard.bypassOnce();
      await guard.popSentinelIfPresent();
      // No detail page for a master row — land on the list with the form
      // swapped out of history so Back skips it.
      navigate(LIST_HREF, { replace: true });
    } catch (e) {
      // The mutation hooks already toast the backend message; a duplicate
      // name also gets pinned to the field so it's clear what to change.
      const message = e instanceof Error ? e.message : F.saveFallbackError;
      if (/already exists/i.test(message)) {
        form.setError("name", { message }, { shouldFocus: true });
      } else if (!(e instanceof Error)) {
        toast.error(message);
      }
    }
  }

  if (isEdit && isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }
  if (isEdit && (isError || !attr)) {
    return (
      <Typography asChild variant="body" tone="muted">
        <div className="p-6">{F.loadError}</div>
      </Typography>
    );
  }

  const isPending = isEdit ? update.isPending : create.isPending;
  const errors = form.formState.errors;
  const valuesError =
    errors.values?.message ??
    (Array.isArray(errors.values) ? errors.values.find((x) => x?.message)?.message : undefined);

  return (
    <FormPageShell
      title={isEdit ? F.editTitle(attr?.name ?? "") : F.createTitle}
      backHref={LIST_HREF}
      saveLabel={isEdit ? F.saveChanges : F.createSubmit}
      saving={isPending}
      guard={guard}
      onSave={() => void form.handleSubmit(onSubmit)()}
      onCancel={navigateBack}
    >
      <div className="rounded-xl border bg-card shadow-sm">
        <div className="space-y-5 px-6 py-5">
          <div className="space-y-1.5">
            <Label htmlFor="spec-attr-name" required>
              {F.nameLabel}
            </Label>
            <Input
              id="spec-attr-name"
              {...form.register("name")}
              placeholder={F.namePlaceholder}
              maxLength={NAME_MAX}
              autoFocus
              aria-invalid={errors.name ? true : undefined}
            />
            {errors.name ? (
              <Typography variant="caption" tone="danger">
                {errors.name.message}
              </Typography>
            ) : (
              <Typography variant="helper">{F.nameHelperText}</Typography>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="spec-attr-values" required={!!isActive}>
              {F.valuesLabel}
            </Label>
            <TagInput
              value={values ?? []}
              onChange={(next) =>
                form.setValue(
                  "values",
                  // Same value typed twice in a different case is one value.
                  next.filter(
                    (v, i) => next.findIndex((x) => x.toLowerCase() === v.toLowerCase()) === i,
                  ),
                  { shouldDirty: true, shouldValidate: true },
                )
              }
              placeholder={F.valuesPlaceholder}
              ariaLabel={F.valuesLabel}
            />
            {valuesError ? (
              <Typography variant="caption" tone="danger">
                {valuesError}
              </Typography>
            ) : (
              <Typography variant="helper">{F.valuesHelperText}</Typography>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="spec-attr-categories">{F.categoriesLabel}</Label>
            <CategoryMultiPicker
              id="spec-attr-categories"
              value={categoryIds ?? []}
              onChange={(ids) =>
                form.setValue("category_ids", ids, { shouldDirty: true })
              }
              placeholder={F.categoriesPlaceholder}
            />
            <Typography variant="helper">{F.categoriesHelperText}</Typography>
          </div>

          {isEdit && (
            <div className="flex items-center justify-between rounded-lg border bg-muted/20 px-4 py-3">
              <div className="flex flex-col gap-0.5">
                <Typography variant="body-strong">{F.activeLabel}</Typography>
                <Typography asChild variant="helper">
                  <p>{F.activeHelperText}</p>
                </Typography>
              </div>
              <Switch
                checked={!!isActive}
                onCheckedChange={(v) => form.setValue("is_active", v, { shouldDirty: true })}
                aria-label={F.activeAriaLabel}
              />
            </div>
          )}
        </div>
      </div>
    </FormPageShell>
  );
}
