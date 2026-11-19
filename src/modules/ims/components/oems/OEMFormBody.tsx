import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Typography } from "@/components/ui/typography";
import { FormPageShell } from "@/components/page-shells";

import type { OEMCreate, OEMUpdate } from "../../api";
import { useCreateOEM, useOEM, useUpdateOEM } from "../../hooks/oems/useOEMs";
import { OEMS_STRINGS } from "./oems.strings";
import { useFormUnsavedGuard } from "@/shared/hooks";
import { useNavigateBack } from "@/hooks/use-navigate-back";
import { oemCreateSchema, type OEMFormInput } from "../../schemas";


export function OEMFormBody() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();

  const { data: oem, isLoading, isError } = useOEM(id ?? "");
  const create = useCreateOEM();
  const update = useUpdateOEM(id ?? "");

  const form = useForm<OEMFormInput>({
    resolver: zodResolver(oemCreateSchema),
    // Match Parts/Variants: validate as the operator tabs out of fields
    // instead of waiting for the Save click.
    mode: "onBlur",
    defaultValues: { is_active: true, code: "", name: "" },
  });
  const isActive = useWatch({ control: form.control, name: "is_active" });

  // Hydrate the form when the edit-mode payload lands.
  useEffect(() => {
    if (!isEdit || !oem) return;
    form.reset({
      code: oem.code,
      name: oem.name,
      notes: (oem as { notes?: string | null }).notes ?? "",
      is_active: oem.is_active,
    });
  }, [isEdit, oem, form]);

  // Unified guard: accurate dirty detection (deep-compare, ignores
  // spurious `shouldDirty:true` writes from controlled components on
  // mount) plus sidebar / Link / browser-back interception. The form
  // page only owns the Cancel button and the discard dialog wiring.
  const guard = useFormUnsavedGuard(form);
  // Cancel + the shell's back-arrow both return to where the user came from,
  // falling back to the OEM list on a deep link. The shell wraps this through
  // the same discard guard.
  const navigateBack = useNavigateBack("/ims/oems");

  async function onSubmit(values: OEMFormInput) {
    try {
      if (isEdit) {
        // The generated `OEMUpdate` types `name` and `code` as optional, so
        // the payload assigns directly to it — no cast needed. We attach
        // `name` / `code` ONLY when the operator actually changed them, to
        // keep Notes-only / Active-only saves minimal. The backend may still
        // reject a changed name/code (audit-trail lock — see
        // app/modules/ims/schemas/oem.py); that 422 surfaces verbatim via the
        // catch below, the accepted trade-off for editable inputs.
        const trimmedName = values.name.trim();
        const trimmedCode = (values.code ?? "").trim();
        const nameChanged = !!oem && trimmedName !== oem.name;
        const codeChanged = !!oem && trimmedCode !== oem.code;
        const payload: OEMUpdate = {
          notes: values.notes?.trim() || null,
          is_active: values.is_active,
          ...(nameChanged ? { name: trimmedName } : {}),
          ...(codeChanged ? { code: trimmedCode } : {}),
        };
        await update.mutateAsync(payload);
        // `reset` clears RHF dirty for the next render; `bypassOnce`
        // flips the guard's popstate ref synchronously so the
        // navigate-back doesn't trip the discard-changes dialog.
        form.reset(values);
        guard.bypassOnce();
        navigate(-1);
      } else {
        // IMS form-spec (2026-09): Code is mandatory on create — the schema
        // now enforces min(1), so there is no blank-Code fallback to Name.
        const trimmedCode = (values.code ?? "").trim();
        const trimmedName = values.name.trim();
        const payload: OEMCreate = {
          code: trimmedCode,
          name: trimmedName,
          notes: values.notes?.trim() || null,
          is_active: values.is_active,
        };
        const created = await create.mutateAsync(payload);
        form.reset(values);
        guard.bypassOnce();
        // Pop the guard's dirty-sentinel before navigating: the sentinel
        // sits on top of `/new`, so the `replace: true` below would
        // otherwise swap the sentinel and leave `/new` in history. Back
        // from the detail page would then land on the empty form.
        await guard.popSentinelIfPresent();
        // Land on the new OEM's detail page; `replace: true` now swaps
        // `/new` itself (not the sentinel), so Back skips the form and
        // returns to the OEM listing.
        navigate(`/ims/oems/${created.id}`, { replace: true });
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to save OEM";
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
  if (isEdit && (isError || !oem)) {
    return (
      <Typography asChild variant="body" tone="muted">
        <div className="p-6">
          {OEMS_STRINGS.form.loadError}
        </div>
      </Typography>
    );
  }

  const isPending = isEdit ? update.isPending : create.isPending;
  const errors = form.formState.errors;

  return (
    <FormPageShell
      title={
        isEdit
          ? OEMS_STRINGS.form.editTitle(oem?.name ?? "—")
          : OEMS_STRINGS.form.addTitle
      }
      backHref="/ims/oems"
      saveLabel={
        isEdit
          ? OEMS_STRINGS.form.actions.saveChanges
          : OEMS_STRINGS.form.actions.createOEM
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
          {/* Name + Code — lead row. */}
          <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="oem-name" required>{OEMS_STRINGS.form.fields.name}</Label>
              <Input
                id="oem-name"
                // eslint-disable-next-line i18next/no-literal-string
                {...form.register("name")}
                placeholder={OEMS_STRINGS.form.fields.namePlaceholder}
                autoFocus={!isEdit}
              />
              {errors.name ? (
                <Typography asChild variant="helper" tone="danger">
                  <p>{errors.name.message}</p>
                </Typography>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="oem-code" required>{OEMS_STRINGS.form.fields.code}</Label>
              <Input
                id="oem-code"
                // eslint-disable-next-line i18next/no-literal-string
                {...form.register("code")}
                placeholder={OEMS_STRINGS.form.fields.codePlaceholder}
                className="font-mono"
              />
              {errors.code ? (
                <Typography asChild variant="helper" tone="danger">
                  <p>{errors.code.message}</p>
                </Typography>
              ) : null}
            </div>
          </div>

          {/* Notes — full row */}
          <div className="space-y-1.5">
            <Label htmlFor="oem-notes">{OEMS_STRINGS.form.fields.notes}</Label>
            <Textarea
              maxLength={500}
              id="oem-notes"
              // eslint-disable-next-line i18next/no-literal-string
              {...form.register("notes")}
              placeholder={OEMS_STRINGS.form.fields.notesPlaceholder}
              rows={3}
              className="resize-none"
              aria-invalid={errors.notes ? true : undefined}
            />
            {errors.notes && (
              <Typography asChild variant="helper" tone="danger">
                <p>{errors.notes.message}</p>
              </Typography>
            )}
          </div>

          {/* Active toggle — edit-only. New OEMs always come out active. */}
          {isEdit && (
            <div className="flex items-center justify-between rounded-lg border bg-muted/20 px-4 py-3">
              <div className="flex flex-col gap-0.5">
                <Typography variant="body-strong">
                  {OEMS_STRINGS.form.fields.activeLabel}
                </Typography>
                <Typography asChild variant="helper">
                  <p>
                    {OEMS_STRINGS.form.fields.activeDescription}
                  </p>
                </Typography>
              </div>
              <Switch
                checked={!!isActive}
                onCheckedChange={(v) =>
                  form.setValue("is_active", v, { shouldDirty: true })
                }
                aria-label={OEMS_STRINGS.form.fields.activeAriaLabel}
              />
            </div>
          )}
        </div>
      </div>
    </FormPageShell>
  );
}

