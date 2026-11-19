import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFormState, useWatch } from "react-hook-form";

import type { WarehouseLocation } from "../../api";
import { RACK_MODES } from "../../constants";
import { useLocationForm } from "../../hooks/warehouses/useLocationForm";
import { CountedTextarea } from "../shared/CountedTextarea";
import { OperationDialog } from "../shared/OperationDialog";
import { FormField } from "../shared/FormField";
import { LOCATIONS_STRINGS } from "./locations.strings";
import { ChoiceCard } from "../shared/ChoiceCard";
import { LocationCapacityFields } from "./LocationCapacityFields";
import { LocationActiveToggle, LocationLevelField, ParentRackField } from "./LocationFormSections";

const F = LOCATIONS_STRINGS.form;
const LOCATION_DESCRIPTION_MAX = 2000;

interface LocationFormDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  warehouseId: string;
  /** Pre-fills the form when editing an existing location. */
  location?: WarehouseLocation;
  /** Names the locked parent of a bin being edited. */
  parentRackName?: string;
  initialLevel?: "rack" | "bin";
}

function saveLabel(isPending: boolean, isEdit: boolean, isRack: boolean) {
  if (isPending) return F.saving;
  if (isEdit) return F.saveChanges;
  return isRack ? F.createRack : F.createBin;
}

function LocationFormFields({
  f,
  lockedLevel,
}: {
  f: ReturnType<typeof useLocationForm>;
  lockedLevel: string | undefined;
}) {
  const { form, isEdit, level } = f;
  const { errors } = useFormState({ control: form.control });
  const isRack = level === "rack";
  const showCapacity = level === "bin" || (isRack && f.rackMode === "direct_storage");
  const description = useWatch({ control: form.control, name: "description" });
  return (
      <div className="flex flex-col gap-5">
        <LocationLevelField f={f} lockedLevel={lockedLevel} />

        <div className={level === "bin" ? "grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2" : ""}>
          <FormField
            label={isRack ? F.nameLabelRack : F.nameLabelBin}
            required
            htmlFor="loc-name"
            error={errors.name?.message}
          >
            <Input
              id="loc-name"
              {...form.register("name")}
              placeholder={isRack ? F.namePlaceholderRack : F.namePlaceholderBin}
              aria-invalid={errors.name ? true : undefined}
              autoFocus={!isEdit}
            />
          </FormField>
          {level === "bin" && <ParentRackField f={f} />}
        </div>

        {isRack && (
          <FormField label={F.rackModeLabel} required error={errors.rack_mode?.message}>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {RACK_MODES.map((mode) => (
                <ChoiceCard
                  key={mode.value}
                  selected={f.rackMode === mode.value}
                  onClick={() => form.setValue("rack_mode", mode.value, { shouldValidate: true })}
                  title={mode.label}
                  subtitle={mode.helper}
                  radio
                />
              ))}
            </div>
          </FormField>
        )}

        {showCapacity && <LocationCapacityFields form={form} capacityMode={f.capacityMode} />}

        <FormField label={F.descriptionLabel} htmlFor="loc-desc">
          <CountedTextarea
            id="loc-desc"
            {...form.register("description")}
            value={description ?? ""}
            limit={LOCATION_DESCRIPTION_MAX}
            placeholder={F.descriptionPlaceholder}
            rows={2}
            className="resize-none"
          />
        </FormField>

        {isEdit && <LocationActiveToggle f={f} />}
      </div>
  );
}

/**
 * Mode-aware location form. Wireframes 3.2 + 3.3 collapsed into one dialog.
 *
 * Operator vocabulary:
 *  - "Holds bins"   ↔ backend can_store_stock=false (rack-with-bins)
 *  - "Stores items
 *     directly"     ↔ backend can_store_stock=true  (direct-storage rack)
 *  - "Single slot"  ↔ capacity_mode=single, capacity=1
 *  - "Multiple slots" ↔ capacity_mode=multiple, capacity>=1
 *
 * Bins always store stock; that's enforced by the schema.
 */
export function LocationFormDialog({ initialLevel = "rack", ...props }: LocationFormDialogProps) {
  const { open, onOpenChange, location } = props;
  const f = useLocationForm({ ...props, initialLevel });
  const { form, isEdit, isPending, level } = f;
  const isRack = level === "rack";

  return (
    <OperationDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? F.titleEdit : F.titleNew}
      description={isEdit ? F.descriptionEdit : F.descriptionNew}
      className="sm:max-w-xl"
      isDirty={form.formState.isDirty}
      footer={({ requestClose }) => (
        <>
          <Button variant="outline" onClick={requestClose} disabled={isPending}>
            {F.cancel}
          </Button>
          <Button onClick={f.submit} disabled={isPending}>
            {isPending && <Loader2 className="size-4 animate-spin" data-icon="inline-start" />}
            {saveLabel(isPending, isEdit, isRack)}
          </Button>
        </>
      )}
    >
      <LocationFormFields f={f} lockedLevel={location?.level} />
    </OperationDialog>
  );
}
