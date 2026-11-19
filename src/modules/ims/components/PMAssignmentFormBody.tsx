import { Controller, type Control, type FieldErrors, type UseFormWatch } from "react-hook-form";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AsyncSelect,
  type AsyncSelectOption,
} from "@/components/ui/async-select";
import { CategoryPicker } from "@/components/common/pickers/CategoryPicker";
import { DatePicker } from "@/components/common/pickers/DatePicker";
import { Typography } from "@/components/ui/typography";

import { useOEMOptions } from "../hooks/oems/useOEMs";
import { useUserOptions } from "../hooks/pm-assignments/usePMAssignments";
import type { CreatePMAssignmentInput } from "../schemas";
import { PM_ASSIGNMENT_STRINGS } from "./pm-assignment.strings";

// ─── Shared PM Assignment form body ────────────────────────────────────────
//
// Same JSX consumed by the inline create/edit dialog in `PMAssignmentsPage`
// AND the full-page edit at `/ims/pm-assignments/:id/edit`. Both surfaces
// must stay visually + behaviourally identical because PM assignment "edit"
// is implemented backend-side as Replace (revoke + create-new): a divergent
// dialog vs. page would let a Replace flow accept one payload shape in one
// surface and a different one in the other.
//
// Hook + Controller plumbing stays in the parent. This component owns ONLY
// the body JSX + the form-local helper components (FormSection, Field,
// PermissionRow, `todayIso`). The PM picker (`useUserOptions`) and OEM
// picker (`useOEMOptions`) are pulled from the same hook source as before
// so no behaviour shifts.

export interface PMAssignmentFormBodyProps {
  control: Control<CreatePMAssignmentInput>;
  errors: FieldErrors<CreatePMAssignmentInput>;
  watch: UseFormWatch<CreatePMAssignmentInput>;
  /** True when this submission will Replace (revoke + create-new) an
   *  existing assignment. Locks `effective_from` (the day the row took
   *  effect is part of the audit trail) and drops the today-floor on
   *  date inputs so an unchanged value doesn't trip the no-backdating
   *  guard 2-3 days into the edit. */
  isEdit: boolean;
  /** OEM AsyncSelect needs its `{id, label}` option object held outside
   *  the form's value (which only stores `oem_id`). Parent owns the
   *  state so it can also re-hydrate from a loaded row in edit mode. */
  oemOption: AsyncSelectOption | null;
  setOemOption: (o: AsyncSelectOption | null) => void;
  /** Same arrangement for the Product Manager picker. */
  pmOption: AsyncSelectOption | null;
  setPmOption: (o: AsyncSelectOption | null) => void;
}

export function PMAssignmentFormBody({
  control,
  errors,
  watch,
  isEdit,
  oemOption,
  setOemOption,
  pmOption,
  setPmOption,
}: PMAssignmentFormBodyProps) {
  return (
    <div className="flex flex-col gap-3.5 pt-1">
      {/* Lead field — pick the person first. */}
      <div className="flex flex-col gap-1">
        <Label htmlFor="pm-assignee" required>{PM_ASSIGNMENT_STRINGS.form.productManagerLabel}</Label>
        <Controller
          name="user_id"
          control={control}
          render={({ field }) => (
            <AsyncSelect
              value={
                field.value && pmOption?.id === field.value ? pmOption : null
              }
              onValueChange={(v) => {
                setPmOption(v);
                field.onChange(v?.id ?? "");
              }}
              useOptions={useUserOptions}
              toLabel={(o) => o.full_name}
              placeholder={PM_ASSIGNMENT_STRINGS.form.placeholders.pm}
              searchPlaceholder="Search PM…"
              className="h-10 w-full"
              chevron="down"
            />
          )}
        />
        {errors.user_id && (
          <Typography variant="helper" tone="danger" asChild>
            <p>{errors.user_id.message}</p>
          </Typography>
        )}
      </div>

      <FormSection>
        <div className="grid grid-cols-1 gap-x-3 gap-y-2 sm:grid-cols-2">
          <Field>
            <Label htmlFor="pm-category">{PM_ASSIGNMENT_STRINGS.form.categoryLabel}</Label>
            <Controller
              name="category_id"
              control={control}
              render={({ field }) => (
                <CategoryPicker
                  id="pm-category"
                  value={field.value ?? ""}
                  onChange={(v) => field.onChange(v || null)}
                  placeholder={PM_ASSIGNMENT_STRINGS.form.placeholders.allCategories}
                  allowAll
                  clearable
                  // Replace = revoke + create-new, so even edit mode
                  // shouldn't offer a retired category as the new scope.
                  isActive
                />
              )}
            />
            {errors.category_id && (
              <Typography variant="helper" tone="danger" asChild>
                <p>{errors.category_id.message}</p>
              </Typography>
            )}
          </Field>

          <Field>
            <Label htmlFor="pm-oem">{PM_ASSIGNMENT_STRINGS.form.oemLabel}</Label>
            <Controller
              name="oem_id"
              control={control}
              render={({ field }) => (
                <AsyncSelect
                  value={oemOption}
                  onValueChange={(v) => {
                    setOemOption(v);
                    field.onChange(v?.id ?? null);
                  }}
                  useOptions={useOEMOptions}
                  toLabel={(o) => o.name}
                  placeholder={PM_ASSIGNMENT_STRINGS.form.placeholders.allBrandOems}
                  allOption="All Brand/OEMs"
                  searchPlaceholder="Search Brand/OEMs…"
                />
              )}
            />
            {errors.oem_id && (
              <Typography variant="helper" tone="danger" asChild>
                <p>{errors.oem_id.message}</p>
              </Typography>
            )}
          </Field>

          <Field>
            <Label htmlFor="pm-condition">{PM_ASSIGNMENT_STRINGS.form.conditionLabel}</Label>
            <Controller
              name="condition"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value ?? "all"}
                  onValueChange={(v) =>
                    field.onChange(
                      v === "all" || !v
                        ? null
                        : (v as "new" | "refurbished" | "new_pull"),
                    )
                  }
                >
                  <SelectTrigger
                    id="pm-condition"
                    className="h-10 w-full"
                    clearable={!!field.value}
                    onClear={() => field.onChange(null)}
                  >
                    <SelectValue>
                      {formConditionLabel(field.value ?? "")}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any condition</SelectItem>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="refurbished">Refurbished</SelectItem>
                    <SelectItem value="new_pull">New Pull</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
        </div>
      </FormSection>

      <FormSection>
        <Controller
          name="permission_type"
          control={control}
          render={({ field }) => (
            <RadioGroup
              value={field.value}
              onValueChange={(v) =>
                field.onChange((v ?? "view") as "view" | "manage")
              }
              className="gap-0 divide-y rounded-md border"
            >
              <PermissionRow
                value="view"
                title="View"
                detail="Parts, prices, history."
              />
              <PermissionRow
                value="manage"
                title="View and edit"
                detail="Update sell price; logs history."
              />
            </RadioGroup>
          )}
        />
        {errors.permission_type && (
          <Typography variant="helper" tone="danger" asChild>
            <p>{errors.permission_type.message}</p>
          </Typography>
        )}
      </FormSection>

      {/*
        Start date / End date fields hidden per product request. Submit
        path overrides both: `effective_from = today` and
        `effective_until = null` on both create and edit. Backend tolerates
        this — see `_with_effective_from_default` + the no-backdating
        validator in `pm_service.py`. Re-enable by uncommenting the
        FormSection below if the dates ever come back into the UI.

      <FormSection>
        <div className="grid grid-cols-1 gap-x-3 gap-y-2 sm:grid-cols-2">
          <Field>
            <Label htmlFor="pm-effective-from">Start date</Label>
            <Controller
              name="effective_from"
              control={control}
              render={({ field }) => (
                <DatePicker
                  id="pm-effective-from"
                  value={field.value ?? ""}
                  onChange={(v) => field.onChange(v || null)}
                  className="tabular-nums"
                  aria-invalid={errors.effective_from ? true : undefined}
                />
              )}
            />
            {errors.effective_from && (
              <p className="text-xs text-destructive">
                {errors.effective_from.message}
              </p>
            )}
          </Field>
          <Field>
            <Label htmlFor="pm-effective-until">End date</Label>
            <Controller
              name="effective_until"
              control={control}
              render={({ field }) => (
                <DatePicker
                  id="pm-effective-until"
                  value={field.value ?? ""}
                  min={watch("effective_from") || (isEdit ? undefined : todayIso())}
                  onChange={(v) => field.onChange(v || null)}
                  className="tabular-nums"
                  aria-invalid={errors.effective_until ? true : undefined}
                />
              )}
            />
            {errors.effective_until && (
              <p className="text-xs text-destructive">
                {errors.effective_until.message}
              </p>
            )}
          </Field>
        </div>
      </FormSection>
      */}

      <FormSection label={PM_ASSIGNMENT_STRINGS.form.notesLabel}>
        <Controller
          name="notes"
          control={control}
          render={({ field }) => (
            <Textarea
              maxLength={500}
              id="pm-notes"
              value={field.value ?? ""}
              onChange={(e) =>
                field.onChange(e.target.value === "" ? null : e.target.value)
              }
              placeholder={PM_ASSIGNMENT_STRINGS.form.placeholders.notes}
              rows={2}
              aria-invalid={errors.notes ? "true" : undefined}
            />
          )}
        />
        {errors.notes && (
          <Typography variant="helper" tone="danger" asChild>
            <p>{errors.notes.message}</p>
          </Typography>
        )}
      </FormSection>
    </div>
  );
}

// ─── Form atoms ───────────────────────────────────────────────────────────

function FormSection({
  label,
  children,
}: {
  label?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-1.5">
      {label && (
        <Typography variant="caption" asChild>
          <p className="font-[550] uppercase tracking-[0.06em]">{label}</p>
        </Typography>
      )}
      {children}
    </section>
  );
}

function Field({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-1">{children}</div>;
}

function PermissionRow({
  value,
  title,
  detail,
}: {
  value: "view" | "manage";
  title: string;
  detail: string;
}) {
  // Plain row — the radio group's outer border carries grouping; the
  // divider between rows carries separation. No nested cards.
  return (
    <label
      className="flex cursor-pointer items-center gap-3 px-3 py-2 transition-colors hover:bg-muted/40"
      htmlFor={`pm-perm-${value}`}
    >
      <RadioGroupItem id={`pm-perm-${value}`} value={value} />
      <div className="min-w-0 leading-tight">
        <Typography variant="body-strong" asChild>
          <span className="leading-tight">{title}</span>
        </Typography>
        <Typography variant="helper" asChild>
          <span className="ml-2">{detail}</span>
        </Typography>
      </div>
    </label>
  );
}

function formConditionLabel(v: string): string {
  if (!v) return "Any condition";
  return v === "new"
    ? "New"
    : v === "refurbished"
      ? "Refurbished"
      : v === "new_pull"
        ? "New Pull"
        : "Any condition";
}

