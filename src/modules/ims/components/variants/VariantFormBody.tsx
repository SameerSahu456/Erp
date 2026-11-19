import { useEffect, useMemo, useRef, useState } from "react";
import { Controller, useController, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Typography } from "@/components/ui/typography";
import { FormPageShell } from "@/components/page-shells";
import { TagInput } from "@/components/common/pickers/TagInput";

import { HsnAsyncSelect } from "../../components/parts/HsnAsyncSelect";
import { useCategory } from "../../hooks/categories/useCategories";
import { usePart } from "../../hooks/parts/useParts";
import { useUpdatePrice } from "../../hooks/parts/usePrice";
import {
  useCreateVariant,
  useUpdateVariant,
  useVariant,
} from "../../hooks/variants/useVariants";
import {
  createVariantSchema,
  PRICE_MIN,
  recordToSpecEntries,
  specEntriesToRecord,
  updateVariantSchema,
  type CreateVariantInput,
} from "../../schemas";
import {
  SpecificationsEditor,
  type SpecRowErrors,
} from "../../components/parts/SpecificationsEditor";
import { useFormUnsavedGuard } from "@/shared/hooks";
import { useNavigateBack } from "@/hooks/use-navigate-back";
import { useNumberField } from "@/hooks/use-number-field";
import { logger } from "@shared/lib/logger";
import {
  AttachmentsPanel,
  type AttachmentsPanelHandle,
} from "@/shared/components/AttachmentsPanel";
import { VARIANTS_STRINGS } from "./variants.strings";

export function VariantFormBody() {
  const { partId = "", variantId } = useParams<{
    partId: string;
    variantId: string;
  }>();
  const isEdit = !!variantId;
  const navigate = useNavigate();

  const { data: part } = usePart(partId);
  // Every variant belongs to a part, and every part to exactly one category
  // (both NOT NULL, category immutable) — its specification attributes drive
  // the Specifications key dropdown.
  const { data: category } = useCategory(part?.category_id ?? "");
  const { data: existingVariant } = useVariant(variantId ?? "");
  // No full-list preload — AsyncSelect pages 25 codes at a time and the
  // single-id fetch below hydrates the trigger label when the selected
  // code hasn't been paged in yet (edit-mode round-trip).
  const create = useCreateVariant(partId);
  const update = useUpdateVariant(variantId ?? "");
  const updatePrice = useUpdatePrice(variantId ?? "");

  const form = useForm<CreateVariantInput>({
    // In edit mode `sku_code` and `condition` are disabled (immutable
    // post-create per backend's PartVariantUpdate `extra='forbid'`); the
    // update schema drops them so the form never blocks save on values
    // the user can't change.
    resolver: zodResolver(
      (isEdit
        ? updateVariantSchema
        : createVariantSchema) as unknown as typeof createVariantSchema,
    ),
    // Validate on blur so name / SKU / price errors surface as the
    // operator tabs between fields — matches PartFormPage. Default
    // RHF `onSubmit` mode delays every message until a Save click.
    mode: "onBlur",
    defaultValues: {
      is_active: true,
      aliases: [],
      spec_entries: [],
    },
  });

  const specController = useController({
    control: form.control,
    name: "spec_entries",
  });
  const aliasesController = useController({
    control: form.control,
    name: "aliases",
  });
  const isActive = useWatch({ control: form.control, name: "is_active" });
  const condition = useWatch({ control: form.control, name: "condition" });
  const hsnCodeId = useWatch({ control: form.control, name: "hsn_code_id" });

  // Hydrate form when variant data lands (edit mode)
  useEffect(() => {
    if (isEdit && existingVariant) {
      form.reset({
        name: existingVariant.name,
        sku_code: existingVariant.sku_code ?? "",
        description: existingVariant.description ?? undefined,
        condition: existingVariant.condition as
          "new" | "refurbished" | "new_pull",
        sell_price:
          existingVariant.sell_price != null
            ? Number(existingVariant.sell_price)
            : undefined,
        aliases: existingVariant.aliases ?? [],
        hsn_code_id:
          ((existingVariant as Record<string, unknown>)
            .hsn_code_id as string) ?? "",
        is_active: existingVariant.is_active,
        spec_entries: recordToSpecEntries(existingVariant.specs),
      });
    }
  }, [isEdit, existingVariant, form]);

  // The attributes a variant may carry are the ones chosen on its PART (the
  // part stores the names; the variant supplies the values — CP-421 E). Resolve
  // the part's spec-key names to the category's attribute rows (for the value
  // suggestions); names the category no longer lists are dropped.
  const partAttributes = useMemo(() => {
    const keys = new Set(Object.keys(part?.specs ?? {}).map((k) => k.toLowerCase()));
    return (category?.specification_attributes ?? []).filter((a) =>
      keys.has(a.name.toLowerCase()),
    );
  }, [part, category]);

  // A NEW variant starts with one row per part-attribute (value blank) so the
  // operator just fills the values. Runs once the part lands, and only while
  // the spec rows are still empty so it never clobbers edits.
  useEffect(() => {
    if (isEdit || !part) return;
    const keys = Object.keys(part.specs ?? {});
    if (keys.length && (form.getValues("spec_entries") ?? []).length === 0) {
      form.setValue(
        "spec_entries",
        keys.map((k) => ({ key: k, value: "" })),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, part]);

  // Attachments commit handle — flushed on Save AFTER form validation
  // passes and the variant PATCH succeeds.
  const attachmentsRef = useRef<AttachmentsPanelHandle>(null);
  const [attachmentsDirty, setAttachmentsDirty] = useState(false);

  async function onSubmit(values: CreateVariantInput) {
    const { spec_entries, sku_code, ...rest } = values;
    const trimmedSku = (sku_code ?? "").trim();
    const basePayload = {
      ...rest,
      // Schema trims each alias; drop any that trimmed to blank so a stray
      // space never reaches the API as an empty entry (IMS trim sweep).
      aliases: (rest.aliases ?? []).map((a) => a.trim()).filter((a) => a.length > 0),
      ...(trimmedSku ? { sku_code: trimmedSku } : {}),
      currency: "INR",
      specs: specEntriesToRecord(spec_entries),
    };

    try {
      if (isEdit) {
        // PATCH split: the backend routes `sell_price` through its own audit-
        // logged endpoint (PATCH /variants/{id}/price) and rejects it on the
        // generic /variants/{id} PATCH via extra='forbid'. Send each dirty
        // field through its proper endpoint; call both in parallel when both
        // a price change and other fields changed in the same edit.
        const dirty = form.formState.dirtyFields;
        const updatePayload: Record<string, unknown> = {};

        if (dirty.name) updatePayload.name = basePayload.name;
        if (dirty.description)
          updatePayload.description = basePayload.description;
        if (dirty.aliases) updatePayload.aliases = basePayload.aliases;
        // condition is immutable post-create — backend rejects it via extra='forbid'.
        // sell_price routes through the price endpoint below, not this PATCH.
        if (dirty.hsn_code_id)
          updatePayload.hsn_code_id = basePayload.hsn_code_id;
        if (dirty.is_active) updatePayload.is_active = basePayload.is_active;
        if (dirty.spec_entries) updatePayload.specs = basePayload.specs;

        const calls: Array<Promise<unknown>> = [];
        if (Object.keys(updatePayload).length > 0) {
          calls.push(update.mutateAsync(updatePayload));
        }
        if (dirty.sell_price && basePayload.sell_price != null) {
          calls.push(
            updatePrice.mutateAsync({ new_price: basePayload.sell_price }),
          );
        }

        // `replace: true` swaps the form URL out of history. Without this
        // the detail page's back button jumps the user to the form they
        // just submitted instead of where they were before opening it.
        if (calls.length > 0) {
          await Promise.all(calls);
        }
        // Flush staged attachment changes — runs even when no form
        // field changed (operator may have only added/removed images).
        try {
          await attachmentsRef.current?.commit();
        } catch (err) {
          toast.error(
            err instanceof Error
              ? VARIANTS_STRINGS.toast.attachmentSyncFailedWithReason(
                  err.message,
                )
              : VARIANTS_STRINGS.toast.attachmentSyncFailed,
          );
          return;
        }
        // Return to the previous page (the variant detail, or the parts
        // table if the edit was opened from there). A `replace` to the
        // detail URL duplicated the history entry — the detail page's back
        // button then needed two clicks to escape. The update mutation
        // invalidates the variant query, so the detail shows fresh data.
        //
        // `reset` clears RHF dirty for the next render; `bypassOnce`
        // flips the guard's popstate ref synchronously so the navigate
        // doesn't trip the discard-changes dialog after a successful
        // save.
        form.reset(values);
        guard.bypassOnce();
        navigate(-1);
      } else {
        const saved = await create.mutateAsync(basePayload);
        // Flush any staged attachments against the freshly-created variant.
        // Partial-failure path mirrors PartFormPage: surface a toast but
        // still navigate to the detail page so the operator can retry.
        try {
          await attachmentsRef.current?.commit(saved.id);
        } catch (err) {
          toast.error(
            err instanceof Error
              ? VARIANTS_STRINGS.toast.attachmentUploadFailedWithReason(
                  err.message,
                )
              : VARIANTS_STRINGS.toast.attachmentUploadFailed,
          );
        }
        form.reset(values);
        guard.bypassOnce();
        // Pop the guard's dirty-sentinel before navigating — without
        // this, `replace: true` swaps the sentinel and leaves `/new` in
        // history, so Back from the variant detail page lands on the
        // empty form.
        await guard.popSentinelIfPresent();
        navigate(`/ims/parts/${partId}/variants/${saved.id}`, {
          replace: true,
        });
      }
    } catch (e) {
      logger.error("Variant save failed", e);
      toast.error(
        e instanceof Error ? e.message : VARIANTS_STRINGS.toast.saveFailed,
      );
    }
  }

  const isPending = isEdit
    ? update.isPending || updatePrice.isPending
    : create.isPending;
  const errors = form.formState.errors;

  // Unified guard: accurate dirty detection (deep-compare against form
  // defaults, ignores spurious `shouldDirty:true` writes from controlled
  // components on mount) plus sidebar / Link / browser-back interception.
  // Staged attachment edits are folded in so image-only changes also
  // block leaving.
  const guard = useFormUnsavedGuard(form, { extraDirty: attachmentsDirty });
  // Cancel + header back-arrow return to where the user came from (the parent
  // part's page), falling back to it on a deep link. The shell routes BOTH
  // through `guard` so the discard prompt fires.
  const navigateBack = useNavigateBack(`/ims/parts/${partId}`);

  return (
    <FormPageShell
      title={
        isEdit
          ? part?.name
            ? VARIANTS_STRINGS.pageTitle.editWithPart(part.name)
            : VARIANTS_STRINGS.pageTitle.editFallback
          : VARIANTS_STRINGS.pageTitle.addVariant
      }
      backHref={`/ims/parts/${partId}`}
      saveLabel={
        isEdit
          ? VARIANTS_STRINGS.footer.saveChanges
          : VARIANTS_STRINGS.footer.createVariant
      }
      saving={isPending}
      guard={guard}
      onSave={() => void form.handleSubmit(onSubmit)()}
      onCancel={navigateBack}
    >
      {/* Not a native <form>: submission fires from the shell's Save button
          (handleSubmit) so Enter in a single-line input never submits. The
          parent part name is folded into the shell title (e.g. "Edit Variant
          of HPE ProLiant DL360 Gen11"). */}
      <div className="rounded-lg border bg-card">
        <div className="border-b px-6 py-4">
          <Typography variant="card-title">
            {isEdit
              ? VARIANTS_STRINGS.formSection.editHeading
              : VARIANTS_STRINGS.formSection.newHeading}
          </Typography>
        </div>

        <div className="space-y-5 px-6 py-5">
          {/* Part Name + Variant name + SKU code — three columns. The
              two name fields share the flexible space (1fr each); SKU
              stays at 220px because it's a fixed-shape identifier.
              Part Name is read-only context (not in the payload) —
              shown so the form doesn't read as floating in isolation. */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_1fr_220px]">
            <div className="space-y-1.5">
              <Label htmlFor="part">{VARIANTS_STRINGS.fields.partName}</Label>
              <Input
                id="part"
                value={part?.name ?? ""}
                disabled
                readOnly
                placeholder={
                  part ? undefined : VARIANTS_STRINGS.fields.partNameLoading
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="name" required>
                {VARIANTS_STRINGS.fields.variantName}
              </Label>
              <Input
                id="name"
                {...form.register("name")}
                placeholder={VARIANTS_STRINGS.fields.variantNamePlaceholder(
                  part?.name ??
                    VARIANTS_STRINGS.fields.variantNameFallbackPart,
                )}
                autoFocus
              />
              {errors.name && (
                <Typography variant="helper" tone="danger">
                  {errors.name.message}
                </Typography>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sku_code" required>
                {VARIANTS_STRINGS.fields.skuCode}
              </Label>
              <Input
                id="sku_code"
                {...form.register("sku_code")}
                placeholder={VARIANTS_STRINGS.fields.skuCodePlaceholder}
                disabled={isEdit}
                className="font-mono"
                aria-invalid={errors.sku_code ? "true" : undefined}
              />
              {errors.sku_code ? (
                <Typography variant="helper" tone="danger">
                  {errors.sku_code.message}
                </Typography>
              ) : (
                <Typography variant="helper">
                  {isEdit
                    ? VARIANTS_STRINGS.fields.skuImmutable
                    : VARIANTS_STRINGS.fields.skuManufacturer}
                </Typography>
              )}
            </div>
          </div>

          {/* Condition is immutable post-create — backend PartVariantUpdate
              excludes it via extra='forbid'. Sell price stays editable. */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="condition" required>
                {VARIANTS_STRINGS.fields.condition}
              </Label>
              <Select
                value={condition ?? ""}
                onValueChange={(v) =>
                  form.setValue(
                    "condition",
                    (v ?? "new") as "new" | "refurbished" | "new_pull",
                    { shouldValidate: true, shouldDirty: true },
                  )
                }
                disabled={isEdit}
              >
                <SelectTrigger
                  id="condition"
                  className="w-full"
                  clearable={!isEdit && !!condition}
                  onClear={() =>
                    form.setValue(
                      "condition",
                      undefined as unknown as
                        "new" | "refurbished" | "new_pull",
                      { shouldValidate: true, shouldDirty: true },
                    )
                  }
                >
                  <SelectValue>
                    {condition === "refurbished" ? (
                      VARIANTS_STRINGS.fields.conditionRefurbished
                    ) : condition === "new_pull" ? (
                      VARIANTS_STRINGS.fields.conditionNewPull
                    ) : condition === "new" ? (
                      VARIANTS_STRINGS.fields.conditionNew
                    ) : (
                      <span className="text-muted-foreground">
                        {VARIANTS_STRINGS.fields.conditionPlaceholder}
                      </span>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">
                    {VARIANTS_STRINGS.fields.conditionNew}
                  </SelectItem>
                  <SelectItem value="refurbished">
                    {VARIANTS_STRINGS.fields.conditionRefurbished}
                  </SelectItem>
                  <SelectItem value="new_pull">
                    {VARIANTS_STRINGS.fields.conditionNewPull}
                  </SelectItem>
                </SelectContent>
              </Select>
              {errors.condition ? (
                <Typography variant="helper" tone="danger">
                  {errors.condition.message ??
                    VARIANTS_STRINGS.fields.conditionPickError}
                </Typography>
              ) : isEdit ? (
                <Typography variant="helper">
                  {VARIANTS_STRINGS.fields.conditionImmutable}
                </Typography>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sell_price">
                {VARIANTS_STRINGS.fields.sellPrice}
                <Typography variant="helper" className="ml-1.5 font-normal">
                  {VARIANTS_STRINGS.fields.sellPriceMinHint(PRICE_MIN)}
                </Typography>
              </Label>
              <div className="relative">
                <Typography asChild variant="body" tone="muted">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2">₹</span>
                </Typography>
                <Controller
                  control={form.control}
                  name="sell_price"
                  render={({ field }) => (
                    <SellPriceField
                      value={Number(field.value ?? 0)}
                      onChange={field.onChange}
                      invalid={!!errors.sell_price}
                    />
                  )}
                />
              </div>
              {errors.sell_price && (
                <Typography variant="helper" tone="danger">
                  {errors.sell_price.message}
                </Typography>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="description">
              {VARIANTS_STRINGS.fields.description}
            </Label>
            <Textarea
              maxLength={500}
              id="description"
              {...form.register("description")}
              placeholder={VARIANTS_STRINGS.fields.descriptionPlaceholder}
              rows={2}
              className="resize-none"
            />
          </div>

          {/* Aliases */}
          <div className="space-y-1.5">
            <Label>{VARIANTS_STRINGS.fields.aliases}</Label>
            <TagInput
              value={aliasesController.field.value ?? []}
              onChange={(tags) => aliasesController.field.onChange(tags)}
              placeholder={VARIANTS_STRINGS.fields.aliasesPlaceholder}
            />
            {errors.aliases && (
              <Typography variant="helper" tone="danger">
                {errors.aliases.message ??
                  VARIANTS_STRINGS.fields.aliasesError}
              </Typography>
            )}
          </div>

          {/* HSN Code — mandatory. AsyncSelect loads 25 codes per page;
              scroll for more. `useHSNCodes()` hydrates the trigger label
              when the selected code hasn't been paged in yet (edit-mode
              round-trip). */}
          {/* HsnAsyncSelect owns both labels (HSN Code + GST) so the
              two captions share a row above the paired fields.
              Don't add an outer <Label> here — it would double up. */}
          <div className="space-y-1.5">
            <HsnAsyncSelect
              id="hsn_code_id"
              label={VARIANTS_STRINGS.fields.hsnCode}
              required
              value={hsnCodeId ?? ""}
              onChange={(id) =>
                form.setValue("hsn_code_id", id ?? "", {
                  shouldValidate: true,
                  // Without shouldDirty the edit-submit's dirty-fields
                  // filter skips this change and the PATCH leaves
                  // hsn_code_id unchanged.
                  shouldDirty: true,
                })
              }
            />
            {errors.hsn_code_id && (
              <Typography variant="helper" tone="danger">
                {errors.hsn_code_id.message}
              </Typography>
            )}
          </div>

          {/* Specifications */}
          <div className="space-y-1.5">
            <Label>{VARIANTS_STRINGS.fields.specifications}</Label>
            <SpecificationsEditor
              entries={specController.field.value ?? []}
              onChange={specController.field.onChange}
              categoryAttributes={partAttributes}
              categoryName={category?.name}
              rowErrors={errors.spec_entries as SpecRowErrors}
            />
            <Typography variant="helper">
              {partAttributes.length
                ? VARIANTS_STRINGS.fields.specsPartHint
                : VARIANTS_STRINGS.fields.specsNoPartAttrs}
            </Typography>
          </div>

          {/* Active toggle — only meaningful while editing. New variants
              default to active; the toggle is hidden on create. */}
          {isEdit && (
            <div className="flex items-center justify-between rounded-lg border bg-muted/20 px-4 py-3">
              <div>
                <Typography variant="body-strong">
                  {VARIANTS_STRINGS.fields.active}
                </Typography>
                <Typography variant="helper">
                  {VARIANTS_STRINGS.fields.activeHint}
                </Typography>
              </div>
              <Switch
                checked={!!isActive}
                onCheckedChange={(v) =>
                  form.setValue("is_active", v, { shouldDirty: true })
                }
                aria-label={VARIANTS_STRINGS.fields.activeAriaLabel}
              />
            </div>
          )}

          {/* Media — staged uploads / deletes are only persisted when
              the user clicks Save (and only after form validation
              passes). In create mode entityId is empty until the
              variant is created; the panel queues everything locally
              and onSubmit feeds the new id into commit(). */}
          <div className="space-y-1.5">
            <Label>{VARIANTS_STRINGS.fields.media}</Label>
            <AttachmentsPanel
              ref={attachmentsRef}
              entityType="ims_part_variant"
              entityId={variantId ?? ""}
              mode="staged"
              onPendingChange={setAttachmentsDirty}
            />
          </div>
        </div>
      </div>
    </FormPageShell>
  );
}

// Sell-price input, wired through the shared `useNumberField` hook. Kept as a
// top-level component (not an inline `Controller` render callback) so the hook
// obeys the rules of hooks; the parent drives it via `<Controller>` above,
// passing the numeric value + RHF `onChange`.
function SellPriceField({
  value,
  onChange,
  invalid,
}: {
  value: number;
  onChange: (next: number) => void;
  invalid: boolean;
}) {
  const priceField = useNumberField(value, onChange, {
    decimal: true,
    decimals: 2,
  });
  return (
    <Input
      {...priceField}
      id="sell_price"
      className="pl-7 tabular-nums"
      placeholder={VARIANTS_STRINGS.fields.sellPricePlaceholder}
      aria-invalid={invalid ? "true" : undefined}
    />
  );
}

// HSN picker is now the shared <HsnAsyncSelect> from
// ../components/HsnAsyncSelect — keeps the GST badge in the trigger and
// the search/clearable UX in sync across the Parts form, this Variant
// page, and the VariantFormDialog.
