import { useEffect, useRef, useState } from "react";
import { useController, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import { CategoryPicker } from "@/components/common/pickers/CategoryPicker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Typography } from "@/components/ui/typography";
import { FormPageShell } from "@/components/page-shells";
import { cn } from "@/lib/utils";

import { ApiError } from "@shared/api/envelope";

import { useCategory } from "../../hooks/categories/useCategories";
import { PARTS_STRINGS } from "./parts.strings";
import { SF } from "./part-form-helpers";
import { HsnAsyncSelect } from "../../components/parts/HsnAsyncSelect";
import { useCreatePart, usePart, useUpdatePart } from "../../hooks/parts/useParts";
import { useOEM, useOEMOptions } from "../../hooks/oems/useOEMs";
import { AsyncSelect, type AsyncSelectOption } from "@/components/ui/async-select";
import { createPartSchema, recordToSpecEntries, specEntriesToKeyRecord, updatePartSchema, type CreatePartInput } from "../../schemas";
import {
  SpecificationsEditor,
  type SpecRowErrors,
} from "../../components/parts/SpecificationsEditor";
import { AttachmentsPanel, type AttachmentsPanelHandle } from "@/shared/components/AttachmentsPanel";
import { asUuid } from "@shared/lib/validation";
import { TagInput } from "@/components/common/pickers/TagInput";
import { useFormUnsavedGuard } from "@/shared/hooks";
import { useNavigateBack } from "@/hooks/use-navigate-back";

export function PartFormBody() {
  const { partId } = useParams<{ partId: string }>();
  const isEdit = !!partId;
  // §11.1 — `:partId` is untrusted. Validate before it reaches the API so a
  // malformed id keeps the read/update queries disabled rather than drawing a
  // 422 validator message back from the backend.
  const validPartId = asUuid(partId) ?? "";
  const navigate = useNavigate();

  // Pre-fill the Brand/OEM on create when the form is launched from an
  // OEM detail page — that route adds `?oem_id=<id>` to the URL. The
  // field stays editable so an operator can swap brand mid-create if
  // they realize the model belongs under a different OEM. Read only
  // once on mount; we don't track query-string changes after that, so
  // a navigation that just tweaks the query string while staying on
  // the form won't reset an in-progress edit.
  const [searchParams] = useSearchParams();
  const prefilledOemId = searchParams.get("oem_id") ?? null;

  const { data: existingPart } = usePart(validPartId);
  const create = useCreatePart();
  const update = useUpdatePart(validPartId);

  // CategoryPicker owns its catalog hydration on open. The single-id fetches
  // here only hydrate the AsyncSelect trigger labels + the category's
  // specification attributes
  // when an existing part is being edited — no full-list preloads.

  // AsyncSelect needs a {id, label} option; the form schema only carries id.
  // We track the label the user just picked here. The actual option fed to
  // AsyncSelect is derived below — falls back to existingPart.oem_name on
  // edit mode, so no setState-in-effect synchronisation is needed.
  const [oemPickedLabel, setOemPickedLabel] = useState<{ id: string; label: string } | null>(null);

  const form = useForm<CreatePartInput>({
    // In edit mode `part_number`, `category_id`, and `oem_id` are disabled
    // (immutable post-create per the backend's PartUpdate `extra='forbid'`);
    // the update schema drops them from validation so the form never blocks
    // save on values the user can't change.
    resolver: zodResolver(
      (isEdit ? updatePartSchema : createPartSchema) as unknown as typeof createPartSchema,
    ),
    // `onBlur` surfaces validation errors as soon as the user leaves
    // each field, instead of holding them all until they click Save.
    // Stops the "I typed a space, why didn't it complain?" confusion
    // on part_number and other regex-bound text inputs.
    mode: "onBlur",
    defaultValues: {
      is_active: true,
      is_tracking: true,
      // Only seed on create — in edit mode the part's own oem_id wins
      // via the form.reset effect below, and we don't want a stray
      // `?oem_id=` in the URL to override a saved value.
      ...(isEdit ? {} : { oem_id: prefilledOemId ?? undefined }),
    },
  });
  const isTracking = useWatch({ control: form.control, name: "is_tracking" });
  const isActive = useWatch({ control: form.control, name: "is_active" });
  const categoryId = useWatch({ control: form.control, name: "category_id" });
  const oemId = useWatch({ control: form.control, name: "oem_id" });
  const hsnId = useWatch({ control: form.control, name: "hsn_code_id" });
  // Aliases live entirely on the form — no parallel `useState` (avoids the
  // cascading-render warning when seeding from existingPart inside useEffect).
  const aliases = useWatch({ control: form.control, name: "aliases" }) ?? [];
  const specController = useController({ control: form.control, name: "spec_entries" });

  const { data: selectedCategory } = useCategory(categoryId ?? "");

  // Fetch the OEM by id ONLY when the trigger label can't be resolved
  // from cheaper sources — the just-picked label, or the embedded
  // oem_name on existingPart in edit mode. This covers the create-mode
  // prefill from `?oem_id=<id>` so the trigger shows the real brand
  // name instead of the "Selected Brand/OEM" placeholder.
  const needsOemLabelFetch =
    !!oemId &&
    oemPickedLabel?.id !== oemId &&
    !(existingPart?.oem_id === oemId && existingPart.oem_name);
  const { data: fetchedOem } = useOEM(needsOemLabelFetch ? oemId! : "");

  // Derive AsyncSelect's option from form id + most-recent picked label,
  // falling back to existingPart's denormalized name in edit mode, then
  // to the on-demand fetch above.
  const oemOption: AsyncSelectOption | null = oemId
    ? oemPickedLabel?.id === oemId
      ? oemPickedLabel
      : existingPart?.oem_id === oemId && existingPart.oem_name
        ? { id: oemId, label: existingPart.oem_name }
        : fetchedOem?.id === oemId && fetchedOem.name
          ? { id: oemId, label: fetchedOem.name }
          : { id: oemId, label: "Selected Brand/OEM" }
    : null;

  // Hydrate once when the part lands. Without the guard, every refetch would
  // reset the form and wipe in-progress edits.
  useEffect(() => {
    if (isEdit && existingPart) {
      form.reset({
        part_number: existingPart.part_number,
        name: existingPart.name,
        description: existingPart.description ?? undefined,
        aliases: existingPart.aliases ?? [],
        category_id: existingPart.category_id ?? "",
        oem_id: existingPart.oem_id ?? "",
        hsn_code_id: existingPart.hsn_code_id ?? undefined,
        is_active: existingPart.is_active,
        is_tracking: existingPart.is_tracking ?? false,
        spec_entries: recordToSpecEntries(existingPart.specs),
      });
    }
  }, [isEdit, existingPart, form]);

  // Attachments live in a staged buffer inside AttachmentsPanel; we
  // flush them on Save via the imperative handle below, AFTER Zod
  // validation has already passed (RHF only invokes onSubmit when
  // validation succeeds). Pending state bubbles up so the form's
  // leave-prompt also covers attachment edits made without touching
  // any other field.
  const attachmentsRef = useRef<AttachmentsPanelHandle>(null);
  const [attachmentsDirty, setAttachmentsDirty] = useState(false);

  async function onSubmit(values: CreatePartInput) {
    const { spec_entries, ...rest } = values;
    const basePayload = {
      ...rest,
      // Trim optional free text; a whitespace-only value became "blank" at
      // validation, so clean it on the wire too — description → its
      // trimmed value, aliases → trimmed with blanks dropped.
      description: rest.description?.trim() ?? undefined,
      aliases: aliases.map((a) => a.trim()).filter((a) => a.length > 0),
      specs: specEntriesToKeyRecord(spec_entries),
      is_tracking: rest.is_tracking ?? true,
    };
    try {
      if (isEdit) {
        // PartUpdate's `extra='forbid'` rejects all immutable fields:
        //   - part_number (referenced by invoices/quotes/POs/audit logs)
        //   - category_id (catalog placement; moving breaks reports)
        //   - oem_id (same rationale as category_id)
        const updatePayload = { ...basePayload } as Partial<typeof basePayload>;
        delete (updatePayload as Record<string, unknown>).part_number;
        delete (updatePayload as Record<string, unknown>).category_id;
        delete (updatePayload as Record<string, unknown>).oem_id;
        await update.mutateAsync(updatePayload);
        // Flush staged attachment uploads / deletes only after the
        // resource update succeeds, so partial saves don't strand
        // attachments without their parent change.
        try {
          await attachmentsRef.current?.commit();
        } catch (err) {
          toast.error(
            err instanceof Error
              ? PARTS_STRINGS.toasts.attachmentsSyncFailed(err.message)
              : PARTS_STRINGS.toasts.attachmentsSyncFailedGeneric,
          );
          // Stay on the form so the user can retry the attachment
          // flush via Save again without losing the form state.
          return;
        }
        // `reset` clears RHF dirty for the next render; `bypassOnce`
        // flips the guard's popstate ref synchronously so the navigate
        // doesn't trip the discard-changes dialog after a successful
        // save.
        form.reset(values);
        guard.bypassOnce();
        navigate(-1);
      } else {
        // Backend's PartCreate carries a `default_variant_condition` field that
        // controls the auto-spawned default variant's condition (defaults to
        // "new" server-side). The form doesn't collect it yet, so we let the
        // backend default apply rather than hard-coding "new" on the wire.
        // `{ replace: true }` swaps the /new URL out of history so the back
        // button skips the form and returns to wherever the operator came from.
        const part = await create.mutateAsync(basePayload);
        // Flush any staged attachment uploads against the freshly-created
        // part. If this fails, the part still exists — surface a toast and
        // navigate to the detail page so the operator can retry uploads
        // there without re-entering the form.
        try {
          await attachmentsRef.current?.commit(part.id);
        } catch (err) {
          toast.error(
            err instanceof Error
              ? PARTS_STRINGS.toasts.attachmentsUploadFailed(err.message)
              : PARTS_STRINGS.toasts.attachmentsUploadFailedGeneric,
          );
        }
        form.reset(values);
        guard.bypassOnce();
        // Pop the guard's dirty-sentinel before navigating — without
        // this, `replace: true` swaps the sentinel and leaves `/new` in
        // history, so Back from the detail page lands on the empty form.
        await guard.popSentinelIfPresent();
        navigate(`/ims/parts/${part.id}`, { replace: true });
      }
    } catch (e) {
      // Map known backend conflicts to inline field errors so the operator
      // sees "Already in use" under the offending input instead of a
      // toast that disappears in 3 seconds. The mutation's own `onError`
      // still fires a toast for surfaces that don't catch here.
      if (e instanceof ApiError) {
        if (e.businessCode === "PART_NUMBER_DUPLICATE") {
          form.setError("part_number", {
            type: "server",
            message: e.envMessage || "This part number is already in use.",
          });
          form.setFocus("part_number");
          return;
        }
        const fieldErrors = e.errors ?? [];
        for (const err of fieldErrors) {
          if (err.field && err.field in form.getValues()) {
            form.setError(err.field as keyof CreatePartInput, {
              type: "server",
              message: err.message || "Invalid value",
            });
          }
        }
      }
      // Let the mutation's onError toast pick up anything we didn't map.
    }
  }

  const isPending = isEdit ? update.isPending : create.isPending;

  // Unified guard: accurate dirty detection (deep-compare against form
  // defaults, ignores spurious `shouldDirty:true` writes from controlled
  // components on mount) plus sidebar / Link / browser-back interception.
  // `attachmentsDirty` is folded in so staged image edits also block
  // leaving — the hook ORs it into the form's own dirty state.
  const guard = useFormUnsavedGuard(form, { extraDirty: attachmentsDirty });
  // Cancel + header back-arrow return to where the user came from (the parts
  // list with its scroll/filters), falling back to the list root on a deep
  // link. The shell routes BOTH through `guard` so the discard prompt fires.
  const navigateBack = useNavigateBack("/ims/parts");

  return (
    <FormPageShell
      title={isEdit ? SF.editTitle(existingPart?.name) : SF.createTitle}
      backHref="/ims/parts"
      saveLabel={isEdit ? SF.footer.saveChanges : SF.footer.createPart}
      saving={isPending}
      guard={guard}
      onSave={() => void form.handleSubmit(onSubmit)()}
      onCancel={navigateBack}
    >
      {/* Not a native <form>: submission fires from the shell's Save button
          (handleSubmit) so Enter in a single-line input never submits. */}
      <div className="rounded-lg border bg-card">
        <div className="border-b px-6 py-4">
          <Typography variant="card-title">
            {isEdit ? SF.sectionEditLabel : SF.sectionCreateLabel}
          </Typography>
        </div>

        <div className="space-y-5 px-6 py-5">
          {/* ── Identity ─────────────────────────────────────────────── */}
          {/* Part number + Name on one row — primary identifiers read
              together at a glance. Part number is immutable post-create. */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[260px_1fr]">
            <div className="space-y-1.5">
              <Label htmlFor="part_number" required>{SF.fields.partNumber}</Label>
              <Input
                id="part_number"
                {...form.register("part_number")}
                placeholder={SF.fields.partNumberPlaceholder}
                disabled={isEdit}
                // First non-muted field on create — matches the
                // OEM / Category / HSN / Variant form pattern. On
                // edit this input is `disabled` so we shift focus
                // to Part name instead (next non-muted field).
                autoFocus={!isEdit}
              />
              {form.formState.errors.part_number && (
                <Typography variant="helper" tone="danger">
                  {form.formState.errors.part_number.message}
                </Typography>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="name" required>{SF.fields.partName}</Label>
              <Input
                id="name"
                {...form.register("name")}
                placeholder={SF.fields.partNamePlaceholder}
                // First non-muted field on edit (Part number is
                // immutable post-create, so it's disabled in edit
                // mode). Create flow focuses Part number above.
                autoFocus={isEdit}
              />
              {form.formState.errors.name && (
                <Typography variant="helper" tone="danger">
                  {form.formState.errors.name.message}
                </Typography>
              )}
            </div>
          </div>

          {/* Aliases — alternate identifiers sit with the primary ones,
              before the long-form description. Uses the shared TagInput
              so the chip styling matches every other tag-style field
              in the project. */}
          <div className="space-y-1.5">
            <Label>{SF.fields.aliases}</Label>
            <TagInput
              value={aliases}
              onChange={(next) =>
                form.setValue("aliases", next, { shouldDirty: true })
              }
              placeholder={SF.fields.aliasesPlaceholder}
            />
            {form.formState.errors.aliases ? (
              <Typography variant="helper" tone="danger">
                {SF.fields.aliasesError}
              </Typography>
            ) : (
              <Typography variant="helper">
                {SF.fields.aliasesHelper}
              </Typography>
            )}
          </div>

          {/* Description — long-form context after the identifiers. */}
          <div className="space-y-1.5">
            <Label htmlFor="description">{SF.fields.description}</Label>
            <Textarea
              maxLength={500}
              id="description"
              {...form.register("description")}
              placeholder={SF.fields.descriptionPlaceholder}
              rows={3}
            />
          </div>

          {/* ── Classification ───────────────────────────────────────── */}
          {/* Category + OEM + HSN share one row — all three are
              "where does this part fit" data and read together. Category
              and OEM are immutable post-create per backend PartUpdate;
              HSN is editable after creation (drives GST). */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label required>{SF.fields.category}</Label>
              <CategoryPicker
                value={categoryId}
                // Backend rejects null on create. Treat clear as empty string
                // so Zod's required-uuid validator surfaces a field error.
                onChange={(v) =>
                  form.setValue("category_id", v, {
                    shouldValidate: true,
                    shouldDirty: true,
                  })
                }
                placeholder={SF.fields.categoryPlaceholder}
                disabled={isEdit}
                // Form-level filter — operators shouldn't be able to
                // assign a new part to a retired category. Edit mode
                // disables the picker entirely (category is immutable
                // post-create), so the inactive-label-rendering edge
                // case doesn't apply here.
                isActive
              />
              {form.formState.errors.category_id ? (
                <Typography variant="helper" tone="danger">
                  {form.formState.errors.category_id.message}
                </Typography>
              ) : isEdit ? (
                <Typography variant="helper">
                  {SF.fields.categoryImmutableHint}
                </Typography>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="oem" required>{SF.fields.brandOem}</Label>
              <AsyncSelect
                value={oemOption}
                onValueChange={(v) => {
                  setOemPickedLabel(v ? { id: v.id, label: v.label } : null);
                  form.setValue("oem_id", v?.id ?? "", {
                    shouldValidate: true,
                    shouldDirty: true,
                  });
                }}
                useOptions={useOEMOptions}
                toLabel={(o) => o.name}
                placeholder={SF.fields.brandOemPlaceholder}
                searchPlaceholder={SF.fields.brandOemSearchPlaceholder}
                disabled={isEdit}
              />
              {form.formState.errors.oem_id ? (
                <Typography variant="helper" tone="danger">
                  {form.formState.errors.oem_id.message}
                </Typography>
              ) : isEdit ? (
                <Typography variant="helper">
                  {SF.fields.brandOemImmutableHint}
                </Typography>
              ) : null}
            </div>
            {/* HsnAsyncSelect owns both labels (HSN Code + GST) so the
                two captions share a row above the paired fields.
                Don't add an outer <Label> here — it would double up. */}
            <div className="space-y-1.5">
              <HsnAsyncSelect
                id="hsn_code_id"
                label={SF.fields.hsnCode}
                required
                value={hsnId ?? ""}
                onChange={(id) =>
                  form.setValue("hsn_code_id", id ?? "", {
                    shouldValidate: true,
                    shouldDirty: true,
                  })
                }
              />
              {form.formState.errors.hsn_code_id && (
                <Typography variant="helper" tone="danger">
                  {form.formState.errors.hsn_code_id.message}
                </Typography>
              )}
            </div>
          </div>

          {/* ── Details ──────────────────────────────────────────────── */}
          {/* Specifications — keys pre-populated from category template
              if available. Sits after classification because the suggested
              keys depend on the picked category. */}
          <div className="space-y-1.5">
            <Label>{SF.fields.specifications}</Label>
            <SpecificationsEditor
              entries={specController.field.value ?? []}
              onChange={specController.field.onChange}
              categoryAttributes={selectedCategory?.specification_attributes}
              categoryName={selectedCategory?.name}
              rowErrors={form.formState.errors.spec_entries as SpecRowErrors}
              valueless
            />
            {selectedCategory?.specification_attributes?.length ? (
              <Typography variant="helper">
                {SF.fields.specsTemplateHint(selectedCategory.name)}
              </Typography>
            ) : (
              <Typography variant="helper">{SF.fields.specsHelper}</Typography>
            )}
          </div>

          {/* ── Behavior ─────────────────────────────────────────────── */}
          {/* Edit shows Active + Serialised side by side; create hides
              Active (new parts default to true) and Serialised spans the
              row. */}
          <div
            className={cn(
              "grid gap-3",
              isEdit ? "md:grid-cols-2" : "grid-cols-1",
            )}
          >
            {isEdit && (
              <div className="flex items-center justify-between rounded-lg border px-4 py-3">
                <div className="pr-3">
                  <Typography variant="body-strong">{SF.fields.active}</Typography>
                  <Typography variant="helper">
                    {SF.fields.activeHelper}
                  </Typography>
                </div>
                <Switch
                  checked={!!isActive}
                  onCheckedChange={(v) =>
                    form.setValue("is_active", v, { shouldDirty: true })
                  }
                  aria-label={SF.fields.activeAriaLabel}
                />
              </div>
            )}

            <div className="flex items-center justify-between rounded-lg border px-4 py-3">
              <div className="pr-3">
                <Typography variant="body-strong">{SF.fields.serialisedTracking}</Typography>
                <Typography variant="helper">
                  {SF.fields.serialisedTrackingHelper}
                </Typography>
              </div>
              <Switch
                checked={!!isTracking}
                onCheckedChange={(v) =>
                  form.setValue("is_tracking", v, { shouldDirty: true })
                }
                aria-label={SF.fields.serialisedTrackingAriaLabel}
              />
            </div>
          </div>

          {/* Media — staged uploads / deletes inside the panel are
              only persisted when the user clicks Save (and only after
              form validation passes). In create mode entityId is empty
              until the part is created; the panel handles that by
              skipping its fetch and queuing all uploads locally, and
              onSubmit passes the freshly-created id into commit(). */}
          <div className="space-y-1.5">
            <Label>{SF.fields.media}</Label>
            <AttachmentsPanel
              ref={attachmentsRef}
              entityType="ims_part"
              entityId={partId ?? ""}
              mode="staged"
              onPendingChange={setAttachmentsDirty}
            />
          </div>
        </div>
      </div>
    </FormPageShell>
  );
}

