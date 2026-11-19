import { useFormState } from "react-hook-form";

import { Label } from "@/components/ui/label";
import { Typography } from "@/components/ui/typography";
import { Switch } from "@/components/ui/switch";
import { AsyncSelect } from "@/components/ui/async-select";
import { cn } from "@/lib/utils";

import type { useLocationForm } from "../../hooks/warehouses/useLocationForm";
import { FormField } from "../shared/FormField";
import { LOCATIONS_STRINGS } from "./locations.strings";
import { ChoiceCard } from "../shared/ChoiceCard";

const F = LOCATIONS_STRINGS.form;

type LocationFormState = ReturnType<typeof useLocationForm>;

/** Rack / Bin chooser — locked on edit (backend doesn't allow changing level). */
export function LocationLevelField({
  f,
  lockedLevel,
}: {
  f: LocationFormState;
  lockedLevel: string | undefined;
}) {
  const { form, isEdit, level } = f;
  const pick = (next: "rack" | "bin") => () =>
    !isEdit && form.setValue("level", next, { shouldValidate: true });
  return (
    <FormField label={F.typeLabel} required>
      <div className="grid grid-cols-2 gap-2">
        <ChoiceCard
          selected={level === "rack"}
          onClick={pick("rack")}
          title={F.rackTitle}
          subtitle={F.rackSubtitle}
          radio
          disabled={isEdit && lockedLevel !== "rack"}
        />
        <ChoiceCard
          selected={level === "bin"}
          onClick={pick("bin")}
          title={F.binTitle}
          subtitle={F.binSubtitle}
          radio
          disabled={isEdit && lockedLevel !== "bin"}
        />
      </div>
    </FormField>
  );
}

export function ParentRackField({ f }: { f: LocationFormState }) {
  const { form, isEdit } = f;
  const parent = f.selectedParentRack;
  const { errors } = useFormState({ control: form.control });
  return (
    <FormField
      label={F.parentRackLabel}
      required
      htmlFor="loc-parent"
      error={errors.parent_location_id?.message}
      helper={F.parentRackHelp}
    >
      <AsyncSelect
        id="loc-parent"
        value={parent}
        onValueChange={(o) => {
          f.setPickedParent(o);
          form.setValue("parent_location_id", o?.id ?? undefined, { shouldValidate: true });
        }}
        useOptions={f.useParentRackOptions}
        toLabel={(o) => o.name}
        placeholder={F.parentRackPlaceholder}
        searchPlaceholder={F.parentRackPlaceholder}
        clearable={false}
        disabled={isEdit}
        loadOnOpen
        className={cn("w-full", errors.parent_location_id && "border-destructive")}
      />
    </FormField>
  );
}

export function LocationActiveToggle({ f }: { f: LocationFormState }) {
  return (
    <div className="flex items-center justify-between rounded-lg border bg-muted/20 px-4 py-3">
      <div className="flex min-w-0 flex-col gap-0.5">
        <Label htmlFor="loc-active" className="cursor-pointer">
          {F.activeLabel}
        </Label>
        <Typography variant="helper" tone="muted" asChild>
          <p>{F.activeHelp}</p>
        </Typography>
      </div>
      <Switch
        id="loc-active"
        checked={f.isActive}
        onCheckedChange={(v) => f.form.setValue("is_active", v, { shouldValidate: true })}
        aria-label={F.activeAriaLabel}
      />
    </div>
  );
}
