import { useEffect } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Typography } from "@/components/ui/typography";
import { FormPageShell } from "@/components/page-shells";
import { useFormUnsavedGuard } from "@/shared/hooks";
import { useNavigateBack } from "@/hooks/use-navigate-back";
import { useNumberField } from "@/hooks/use-number-field";

import type { HSNCodeCreate, HSNCodeUpdate } from "../../api";
import {
  useCreateHSNCode,
  useHSNCode,
  useUpdateHSNCode,
} from "../../hooks/parts/useHSN";
import { HSN_CODES_STRINGS } from "./hsn-codes.strings";


// Backend constraints (see
// `migrations/.../202604281100_procurement_hsn_codes.py`):
//   - code: VARCHAR(10), UNIQUE
//   - description: TEXT (nullable)
//   - gst_rate: NUMERIC(5,2), 0 <= rate <= 100
//   - is_active: BOOLEAN (default true)
//
// Frontend: HSN code is just `required` (the regex + min/max-digit gate
// was dropped 2026-05-29 per product request — operators can paste
// codes in whatever shape the tax notice they're working from uses).
// The "4 to 8 digits" line below the input is informational only.
// `maxLength={10}` stays as a hard input cap matching the backend
// VARCHAR(10) column so paste-overflow can't 422 the request.
export const HSN_CODE_BACKEND_MAX_LENGTH = 10;
export const DESCRIPTION_MAX = 500;

export const hsnCreateSchema = z.object({
  // IMS form-spec (2026-09): HSN code is digits-only, 4-6 digits. Mirrors the
  // backend `^\d{4,6}$` pattern.
  code: z
    .string()
    .trim()
    .min(1, "HSN code is required.")
    .regex(/^\d{4,6}$/, "HSN code must be 4 to 6 digits."),
  gst_rate: z.coerce
    .number({ error: "GST % must be a number." })
    .gt(0, "GST % must be greater than 0.")
    .max(100, "GST % cannot exceed 100."),
  description: z
    .string()
    .trim()
    .max(
      DESCRIPTION_MAX,
      `Description must be ${DESCRIPTION_MAX} characters or fewer.`,
    )
    .optional(),
  is_active: z.boolean(),
});

// Code is editable in both create and edit modes — operators can correct
// the actual tax classification number on an existing row. Same validation
// rules apply on both, so the create schema does double duty.
export type HSNFormInput = z.infer<typeof hsnCreateSchema>;


export function HSNCodeFormBody() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();

  const { data: hsn, isLoading, isError } = useHSNCode(id ?? "");
  const create = useCreateHSNCode();
  const update = useUpdateHSNCode(id ?? "");

  // `gst_rate` uses `z.coerce.number()`, so the schema's INPUT type is
  // `unknown` (the raw field value) while its OUTPUT is `number`. RHF needs
  // all three generics — input, context, output — so `handleSubmit` hands
  // `onSubmit` the parsed `number`, not the raw input. Without this the
  // resolver's `unknown` input clashes with a single-generic `number` form.
  const form = useForm<
    z.input<typeof hsnCreateSchema>,
    unknown,
    HSNFormInput
  >({
    resolver: zodResolver(hsnCreateSchema),
    // Validate as the operator tabs out of fields instead of waiting for
    // the Save click — matches Parts/Variants/OEMs forms.
    mode: "onBlur",
    // `is_active` defaults to `true` on create — matches the backend's
    // server-side default. Edit mode hydrates from the loaded row below.
    defaultValues: { code: "", description: "", is_active: true },
  });
  const isActive = useWatch({ control: form.control, name: "is_active" });

  // Hydrate the form when the edit-mode payload lands. `gst_rate` is a
  // string on the wire; the form input is `<input type="number">`, so
  // coerce to Number here for a clean reset. `description` may be null
  // server-side — fall back to "" so the controlled Textarea stays valid.
  useEffect(() => {
    if (!isEdit || !hsn) return;
    form.reset({
      code: hsn.code,
      gst_rate: Number(hsn.gst_rate),
      description: hsn.description ?? "",
      is_active: hsn.is_active,
    });
  }, [isEdit, hsn, form]);

  // Unified guard: accurate dirty detection (deep-compare, ignores
  // spurious `shouldDirty:true` writes from controlled components on
  // mount) plus sidebar / Link / browser-back interception. The form
  // page only owns the Cancel button and the discard dialog wiring.
  const guard = useFormUnsavedGuard(form);
  // Cancel + the shell's back-arrow both return to where the user came from,
  // falling back to the HSN-codes list on a deep link. The shell wraps this
  // through the same discard guard.
  const navigateBack = useNavigateBack("/ims/hsn-codes");

  async function onSubmit(values: HSNFormInput) {
    try {
      const trimmedDescription = (values.description ?? "").trim();
      const description = trimmedDescription.length > 0 ? trimmedDescription : null;

      if (isEdit) {
        // `code` is now editable post-create per product request. The
        // generated `HSNCodeUpdate` types `code` as optional, so the payload
        // assigns directly to it — no cast needed. If the backend still
        // rejects a changed code (`extra='forbid'`), the catch block below
        // surfaces the 422 verbatim via toast.
        const payload: HSNCodeUpdate = {
          code: values.code.trim(),
          gst_rate: values.gst_rate,
          description,
          is_active: values.is_active,
        };
        await update.mutateAsync(payload);
        // `reset` clears RHF dirty for the next render; `bypassOnce`
        // flips the guard's popstate ref synchronously so the
        // `navigate(-1)` below doesn't trip the discard-changes dialog.
        form.reset(values);
        guard.bypassOnce();
        navigate(-1);
      } else {
        // Digits-only code per validation above; just trim whitespace
        // (the user might paste with a stray space). New rows always
        // go in `is_active: true` — backend default + user convention.
        const payload: HSNCodeCreate = {
          code: values.code.trim(),
          gst_rate: values.gst_rate,
          description,
          is_active: true,
        };
        await create.mutateAsync(payload);
        form.reset(values);
        guard.bypassOnce();
        // Land back on the list with /new swapped out of history so Back
        // skips the form.
        navigate("/ims/hsn-codes", { replace: true });
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : HSN_CODES_STRINGS.form.saveFallbackError;
      toast.error(message);
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
  if (isEdit && (isError || !hsn)) {
    return (
      <Typography asChild variant="body" tone="muted">
        <div className="p-6">
          {HSN_CODES_STRINGS.form.loadError}
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
          ? HSN_CODES_STRINGS.form.editTitle(hsn?.code ?? "")
          : HSN_CODES_STRINGS.form.createTitle
      }
      backHref="/ims/hsn-codes"
      saveLabel={
        isEdit
          ? HSN_CODES_STRINGS.form.saveChanges
          : HSN_CODES_STRINGS.form.createSubmit
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
          <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="hsn-code" required>{HSN_CODES_STRINGS.form.codeLabel}</Label>
              <Input
                id="hsn-code"
                {...form.register("code")}
                placeholder={HSN_CODES_STRINGS.form.codePlaceholder}
                autoFocus
                maxLength={HSN_CODE_BACKEND_MAX_LENGTH}
                inputMode="numeric"
                className="font-mono"
              />
              {errors.code ? (
                <Typography variant="helper" tone="danger">
                  {errors.code.message}
                </Typography>
              ) : (
                <Typography variant="helper">
                  {HSN_CODES_STRINGS.form.codeHelperText}
                </Typography>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="hsn-gst" required>{HSN_CODES_STRINGS.form.gstLabel}</Label>
              <div className="relative">
                <Controller
                  control={form.control}
                  name="gst_rate"
                  render={({ field }) => (
                    <GstRateField
                      value={Number(field.value ?? 0)}
                      onChange={field.onChange}
                      invalid={!!errors.gst_rate}
                    />
                  )}
                />
                <Typography
                  asChild
                  variant="body"
                  tone="muted"
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"
                >
                  <span>%</span>
                </Typography>
              </div>
              {errors.gst_rate ? (
                <Typography variant="helper" tone="danger">
                  {errors.gst_rate.message}
                </Typography>
              ) : (
                <Typography variant="helper">
                  {HSN_CODES_STRINGS.form.gstHelperText}
                </Typography>
              )}
            </div>
          </div>

          {/* Description — full-width, optional. 500-char hard cap matches
              every other IMS textarea (parts, variants, OEMs). */}
          <div className="space-y-1.5">
            <Label htmlFor="hsn-description">{HSN_CODES_STRINGS.form.descriptionLabel}</Label>
            <Textarea
              id="hsn-description"
              maxLength={DESCRIPTION_MAX}
              {...form.register("description")}
              placeholder={HSN_CODES_STRINGS.form.descriptionPlaceholder}
              rows={3}
              className="resize-none"
              aria-invalid={errors.description ? true : undefined}
            />
            {errors.description ? (
              <Typography variant="helper" tone="danger">
                {errors.description.message}
              </Typography>
            ) : (
              <Typography variant="helper">
                {HSN_CODES_STRINGS.form.descriptionHelperText}
              </Typography>
            )}
          </div>

          {/* Active toggle — edit-only. New HSN codes always come out
              active; the backend default + the create payload both set
              `is_active: true`, so there's no toggle on the create form. */}
          {isEdit && (
            <div className="flex items-center justify-between rounded-lg border bg-muted/20 px-4 py-3">
              <div className="flex flex-col gap-0.5">
                <Typography variant="body-strong">
                  {HSN_CODES_STRINGS.form.activeLabel}
                </Typography>
                <Typography asChild variant="helper">
                  <p>{HSN_CODES_STRINGS.form.activeHelperText}</p>
                </Typography>
              </div>
              <Switch
                checked={!!isActive}
                onCheckedChange={(v) =>
                  form.setValue("is_active", v, { shouldDirty: true })
                }
                aria-label={HSN_CODES_STRINGS.form.activeAriaLabel}
              />
            </div>
          )}
        </div>
      </div>
    </FormPageShell>
  );
}

// GST-rate input, wired through the shared `useNumberField` hook. Kept as a
// top-level component (not an inline `Controller` render callback) so the hook
// obeys the rules of hooks; the parent drives it via `<Controller>` above,
// passing the numeric value + RHF `onChange`. `max: 100` mirrors the backend
// `gst_rate <= 100` bound the field previously enforced via `max={100}`.
function GstRateField({
  value,
  onChange,
  invalid,
}: {
  value: number;
  onChange: (next: number) => void;
  invalid: boolean;
}) {
  const gstField = useNumberField(value, onChange, {
    decimal: true,
    decimals: 2,
    max: 100,
  });
  return (
    <Input
      {...gstField}
      id="hsn-gst"
      placeholder={HSN_CODES_STRINGS.form.gstPlaceholder}
      className="pr-8 tabular-nums"
      aria-invalid={invalid ? "true" : undefined}
    />
  );
}

