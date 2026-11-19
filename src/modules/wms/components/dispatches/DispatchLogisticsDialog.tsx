import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/common/pickers/DatePicker";
import { istTodayDateParam } from "@shared/lib/date";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { OperationDialog } from "../shared/OperationDialog";
import { FormField } from "../shared/FormField";
import type { DispatchLogisticsEditState } from "../../hooks/dispatches/useDispatchLogisticsEdit";
import type { DeliveryDetails } from "./dispatch-detail-helpers";
import {
  DISPATCH_DETAIL_STRINGS as S,
  DISPATCH_MODES,
  FREIGHT_PAID_BY,
} from "./dispatch-detail.strings";

interface LabeledSelectProps {
  field: "mode" | "freight_paid_by";
  options: readonly { value: string; label: string }[];
  edit: DispatchLogisticsEditState;
}

/** A logistics enum select that shows the option LABEL, not its raw value
 *  (PAGE-UI §7.2). */
function LabeledSelect({ field, options, edit }: LabeledSelectProps) {
  const current = edit.logi[field];
  return (
    <Select
      value={current ?? ""}
      onValueChange={(v) => edit.set(field, v ?? "")}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder={S.none}>
          {options.find((o) => o.value === current)?.label ?? S.none}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

type TextKey = keyof Pick<
  DeliveryDetails,
  "courier_tracking_number" | "courier" | "docket_number"
>;

function LogisticsTextInput({
  field,
  placeholder,
  edit,
  invalid,
}: {
  field: TextKey;
  placeholder: string;
  edit: DispatchLogisticsEditState;
  invalid?: boolean;
}) {
  return (
    <Input
      value={edit.logi[field] ?? ""}
      onChange={(e) => edit.set(field, e.target.value)}
      placeholder={placeholder}
      aria-invalid={invalid}
    />
  );
}

interface DispatchLogisticsDialogProps {
  edit: DispatchLogisticsEditState;
  /** Invoice Amount locks only for a cancelled DR. */
  lockInvoice: boolean;
}

export function DispatchLogisticsDialog({
  edit,
  lockInvoice,
}: DispatchLogisticsDialogProps) {
  return (
    <OperationDialog
      open={edit.editOpen}
      onOpenChange={(next) => !next && edit.closeEdit()}
      title={S.editLogisticsTitle}
      description={S.editLogisticsDesc}
      className="sm:max-w-2xl"
      isDirty={edit.editDirty}
      footer={({ requestClose }) => (
        <>
          <Button variant="outline" onClick={requestClose} disabled={edit.isSaving}>
            {S.dialogCancel}
          </Button>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger render={<span className="inline-flex" />}>
                <Button
                  onClick={edit.saveLogistics}
                  disabled={edit.isSaving || edit.awbMissing}
                >
                  {edit.isSaving && (
                    <Loader2 className="size-4 animate-spin" data-icon="inline-start" />
                  )}
                  {edit.isSaving ? S.saving : S.saveChanges}
                </Button>
              </TooltipTrigger>
              {edit.awbMissing && <TooltipContent>{S.awbRequired}</TooltipContent>}
            </Tooltip>
          </TooltipProvider>
        </>
      )}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label={S.awb}
          required={edit.awbRequired}
          error={edit.awbMissing ? S.awbRequired : null}
        >
          <LogisticsTextInput
            field="courier_tracking_number"
            placeholder={S.awbPlaceholder}
            edit={edit}
            invalid={edit.awbMissing}
          />
        </FormField>
        <FormField label={S.courier}>
          <LogisticsTextInput field="courier" placeholder={S.courierPlaceholder} edit={edit} />
        </FormField>
        <FormField label={S.docket}>
          <LogisticsTextInput field="docket_number" placeholder={S.docketPlaceholder} edit={edit} />
        </FormField>
        <FormField label={S.mode}>
          <LabeledSelect field="mode" options={DISPATCH_MODES} edit={edit} />
        </FormField>
        <FormField label={S.packages}>
          {/* Whole packages (§3.2/§9). */}
          <Input {...edit.packagesField} />
        </FormField>
        <FormField label={S.freightCharges}>
          <Input {...edit.freightChargesField} />
        </FormField>
        <FormField label={S.freightPaidBy}>
          <LabeledSelect
            field="freight_paid_by"
            options={FREIGHT_PAID_BY}
            edit={edit}
           
          />
        </FormField>
        <FormField label={S.deliveryDate}>
          <DatePicker
            value={(edit.logi.delivery_date ?? "").slice(0, 10)}
            onChange={(v) => edit.set("delivery_date", v)}
            // A delivery can't have happened yet in the future.
            max={istTodayDateParam()}
          />
        </FormField>
        <FormField label={S.invoiceAmount}>
          <Input {...edit.invoiceAmountField} disabled={lockInvoice} />
        </FormField>
      </div>
    </OperationDialog>
  );
}
