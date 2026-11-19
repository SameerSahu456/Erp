import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { toast } from "sonner";

import { CategoryPicker } from "@/components/common/pickers/CategoryPicker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Typography } from "@/components/ui/typography";
import { FormPageShell } from "@/components/page-shells";
import { asUuid } from "@shared/lib/validation";

import type { CategoryCreate, CategoryUpdate } from "../../api";
import {
  useCategory,
  useCreateCategory,
  useUpdateCategory,
} from "../../hooks/categories/useCategories";
import {
  createCategorySchema,
  normalizeIdentifierName,
  type CreateCategoryInput,
} from "../../schemas";
import { SpecAttributesPicker } from "../specification-attributes/SpecAttributesPicker";
import { SPEC_ATTRIBUTES_STRINGS } from "../specification-attributes/specification-attributes.strings";
import { useFormUnsavedGuard } from "@/shared/hooks";
import { useNavigateBack } from "@/hooks/use-navigate-back";
import { CATEGORIES_STRINGS } from "./categories.strings";


// Full-page Category create / edit form. Routes:
//   /ims/categories/new
//   /ims/categories/new?parent_id=<uuid>     — "Add subcategory under X"
//   /ims/categories/:id/edit
//
// When `?parent_id=…` is present on create, the Parent Category picker
// is prefilled to that id and locked (same UX the old in-dialog
// `lockedParentId` prop drove).

export function CategoryFormBody() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const lockedParentId = searchParams.get("parent_id") ?? null;
  const isEdit = !!id;
  // §11.1 — the route `:id` is untrusted. A malformed one keeps the query
  // disabled (empty id) and falls through to the edit-not-found guard below,
  // so the backend never sees a non-UUID it would answer with a 422.
  const validId = asUuid(id) ?? "";
  const navigate = useNavigate();

  const { data: editCategory, isLoading, isError } = useCategory(validId);
  const create = useCreateCategory();
  const update = useUpdateCategory(validId);

  const form = useForm<CreateCategoryInput>({
    resolver: zodResolver(createCategorySchema),
    mode: "onBlur",
    defaultValues: {
      parent_id: lockedParentId ?? undefined,
      is_active: true,
      // Backend default. BOM eligibility is opt-in — only categories
      // that actually need assembly modeling flip it on.
      is_bom_eligible: false,
      specification_attributes: [],
    },
  });
  const parentId = useWatch({ control: form.control, name: "parent_id" });
  const isActive = useWatch({ control: form.control, name: "is_active" });
  const isBomEligible = useWatch({
    control: form.control,
    name: "is_bom_eligible",
  });
  const specAttributes = useWatch({
    control: form.control,
    name: "specification_attributes",
  });

  // Hydrate the form when the edit payload arrives.
  //
  // `name` is normalised on the way in so a stored value with trailing
  // spaces or internal double-spaces shows up in the input the same way
  // the create form would have saved it. Without this the user sees the
  // dirty stored value, clicks Save without touching it, and the
  // already-dirty name round-trips back to the DB unchanged (the schema
  // transform only fires on values that pass through validation, and
  // an untouched field stays clean from the form's perspective).
  useEffect(() => {
    if (!isEdit || !editCategory) return;
    form.reset({
      name: normalizeIdentifierName(editCategory.name),
      parent_id: editCategory.parent_id ?? undefined,
      description: editCategory.description ?? undefined,
      is_active: editCategory.is_active,
      // `is_bom_eligible` was added after the last `pnpm api:gen`; the
      // Category type override in api.ts marks it optional. Default to
      // `false` for legacy categories that pre-date the field.
      is_bom_eligible: editCategory.is_bom_eligible ?? false,
      specification_attributes: (editCategory.specification_attributes ?? []).map(
        (a) => ({ id: a.id, label: a.name }),
      ),
    });
  }, [isEdit, editCategory, form]);

  // Unified guard: accurate dirty detection (deep-compare, ignores
  // spurious `shouldDirty:true` writes from controlled components on
  // mount) plus sidebar / Link / browser-back interception. The form
  // page only owns the Cancel button and the discard dialog wiring.
  const guard = useFormUnsavedGuard(form);
  // Cancel + the shell's back-arrow both return to where the user came from
  // (the list with its scroll/filters), falling back to the list root on a
  // deep link. The shell wraps this through the same discard guard.
  const navigateBack = useNavigateBack("/ims/categories");

  async function onSubmit(values: CreateCategoryInput) {
    // `values.name` is already the cleaned form — the schema runs
    // `normalizeIdentifierName` via `.transform()` before validation,
    // so trailing/double whitespace can't reach this point. Description
    // still has to be hand-trimmed because the schema leaves it raw
    // (only the identifier name is normalised).
    try {
      if (isEdit) {
        const updatePayload: CategoryUpdate = {
          name: values.name,
          parent_id: values.parent_id ?? null,
          description: values.description?.trim() || null,
          is_active: values.is_active,
          is_bom_eligible: values.is_bom_eligible,
          specification_attribute_ids: values.specification_attributes.map((a) => a.id),
        };
        await update.mutateAsync(updatePayload);
        // `reset` clears RHF dirty; `bypassOnce` flips the guard's
        // popstate ref synchronously so navigate doesn't trip the
        // discard-changes dialog after a successful save. Pop the dirty
        // sentinel before the `replace` so it swaps the /edit entry (not
        // the sentinel) and Back from the detail page skips the form.
        form.reset(values);
        guard.bypassOnce();
        await guard.popSentinelIfPresent();
        navigate(`/ims/categories/${id}`, { replace: true });
      } else {
        const payload: CategoryCreate = {
          name: values.name,
          parent_id: values.parent_id ?? null,
          description: values.description?.trim() || null,
          // Backend defaults `display_order` to 0 when omitted but the
          // generated CategoryCreate marks it as required; supply it
          // explicitly so the type matches the wire contract.
          display_order: 0,
          is_active: values.is_active,
          is_bom_eligible: values.is_bom_eligible,
          specification_attribute_ids: values.specification_attributes.map((a) => a.id),
        };
        const created = await create.mutateAsync(payload);
        form.reset(values);
        guard.bypassOnce();
        // Pop the guard's dirty-sentinel before navigating: the sentinel
        // sits on top of `/new`, so the `replace: true` below would
        // otherwise swap the sentinel and leave `/new` in history. Back
        // from the detail page would then land on the empty form.
        await guard.popSentinelIfPresent();
        navigate(`/ims/categories/${created.id}`, { replace: true });
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : CATEGORIES_STRINGS.form.toast.saveFailedDefault;
      toast.error(message);
    }
  }

  if (isEdit && isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }
  if (isEdit && (isError || !editCategory)) {
    return (
      <Typography asChild variant="body" tone="muted">
        <div className="p-6">
          {CATEGORIES_STRINGS.form.loadError}
        </div>
      </Typography>
    );
  }

  const isPending = isEdit ? update.isPending : create.isPending;
  const errors = form.formState.errors;
  const titleSuffix = isEdit
    ? CATEGORIES_STRINGS.form.titleSuffixEdit(editCategory?.name ?? "—")
    : lockedParentId
      ? CATEGORIES_STRINGS.form.titleSuffixCreate
      : "";
  const baseTitle = isEdit
    ? CATEGORIES_STRINGS.form.titleEdit
    : CATEGORIES_STRINGS.form.titleCreate;
  const title = titleSuffix ? `${baseTitle} ${titleSuffix}` : baseTitle;

  return (
    <FormPageShell
      title={title}
      backHref="/ims/categories"
      saveLabel={
        isEdit
          ? CATEGORIES_STRINGS.form.actions.saveEdit
          : CATEGORIES_STRINGS.form.actions.saveCreate
      }
      saving={isPending}
      guard={guard}
      onSave={() => void form.handleSubmit(onSubmit)()}
      onCancel={navigateBack}
    >
      {/* Not a native <form>: submission fires from the shell's Save button
          (handleSubmit) so Enter in a single-line input never submits. */}
      <div className="rounded-xl border bg-card shadow-sm">
        <div className="space-y-5 px-6 py-5">
          {/* Name + Parent category */}
          <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="cat-name" required>{CATEGORIES_STRINGS.form.fields.name}</Label>
              <Input
                id="cat-name"
                {...form.register("name")}
                placeholder={CATEGORIES_STRINGS.form.fields.namePlaceholder}
                autoFocus
              />
              {errors.name && (
                <Typography asChild variant="helper" tone="danger">
                  <p>{errors.name.message}</p>
                </Typography>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>{CATEGORIES_STRINGS.form.fields.parentCategory}</Label>
              <CategoryPicker
                value={parentId ?? ""}
                onChange={(v) =>
                  form.setValue("parent_id", v || null, { shouldDirty: true })
                }
                placeholder={CATEGORIES_STRINGS.form.fields.parentPlaceholder}
                allowAll
                l1Only
                excludeId={editCategory?.id ?? null}
                disabled={!isEdit && !!lockedParentId}
                // Form-level filter — a new subcategory shouldn't be
                // parented under a retired L1. Caveat: if you're editing
                // a subcategory whose existing parent is now inactive,
                // the trigger label can't render that parent's name
                // (it's filtered out of the options). The picker will
                // appear empty until the operator picks a new active
                // parent. Treat that as a prompt to re-home the row.
                isActive
              />
              <Typography asChild variant="helper">
                <p>
                  {!isEdit && lockedParentId
                    ? CATEGORIES_STRINGS.form.fields.parentHelperLocked
                    : CATEGORIES_STRINGS.form.fields.parentHelperDefault}
                </p>
              </Typography>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="cat-desc">{CATEGORIES_STRINGS.form.fields.description}</Label>
            <Textarea
              maxLength={500}
              id="cat-desc"
              {...form.register("description")}
              placeholder={CATEGORIES_STRINGS.form.fields.descriptionPlaceholder}
              rows={2}
              className="resize-none"
            />
            {errors.description && (
              <Typography asChild variant="helper" tone="danger">
                <p>{errors.description.message}</p>
              </Typography>
            )}
          </div>

          {/* Specification attributes — offered first (and prefilled on new
              records) in the Specifications editor of this category's parts
              and variants. Order here is the display order there. */}
          <div className="space-y-1.5">
            <Label htmlFor="cat-spec-attributes">{SPEC_ATTRIBUTES_STRINGS.picker.categoryLabel}</Label>
            <SpecAttributesPicker
              id="cat-spec-attributes"
              value={specAttributes ?? []}
              onChange={(next) =>
                form.setValue("specification_attributes", next, {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
            />
            {errors.specification_attributes ? (
              <Typography asChild variant="helper" tone="danger">
                <p>{errors.specification_attributes.message}</p>
              </Typography>
            ) : (
              <Typography asChild variant="helper">
                <p>{SPEC_ATTRIBUTES_STRINGS.picker.categoryHelper}</p>
              </Typography>
            )}
          </div>

          {/* Active toggle — edit-only. New categories default to active. */}
          {isEdit && (
            <div className="flex items-center justify-between rounded-lg border bg-muted/20 px-4 py-3">
              <div>
                <Typography variant="body-strong">{CATEGORIES_STRINGS.form.fields.activeLabel}</Typography>
                <Typography asChild variant="helper">
                  <p>
                    {CATEGORIES_STRINGS.form.fields.activeHelper}
                  </p>
                </Typography>
              </div>
              <Switch
                checked={!!isActive}
                onCheckedChange={(v) =>
                  form.setValue("is_active", v, { shouldDirty: true })
                }
                aria-label={CATEGORIES_STRINGS.form.fields.activeAriaLabel}
              />
            </div>
          )}

          {/* BOM eligibility — available on both create and edit. Toggling
              on lets PMs declare a Reference BOM on variants under this
              category; the variant detail BOM tab gates its editor on this
              flag. No subcategory inheritance — each category opts in
              explicitly. */}
          <div className="flex items-center justify-between rounded-lg border bg-muted/20 px-4 py-3">
            <div>
              <Typography variant="body-strong">{CATEGORIES_STRINGS.form.fields.bomLabel}</Typography>
              <Typography asChild variant="helper">
                <p>
                  {CATEGORIES_STRINGS.form.fields.bomHelper}
                </p>
              </Typography>
            </div>
            <Switch
              checked={!!isBomEligible}
              onCheckedChange={(v) =>
                form.setValue("is_bom_eligible", v, { shouldDirty: true })
              }
              aria-label={CATEGORIES_STRINGS.form.fields.bomAriaLabel}
            />
          </div>
        </div>
      </div>
    </FormPageShell>
  );
}

