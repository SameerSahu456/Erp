import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AsyncSelect } from "@/components/ui/async-select";
import type { MaterialIssueHeaderState } from "../../hooks/material-issue/useMaterialIssueForm";
import type { AssignmentLevel } from "../../api";
import { ASSIGNMENT_LEVEL_LABELS } from "../../constants/assignment";
import { MATERIAL_ISSUE_STRINGS as S } from "./material-issue.strings";
import {
  type FormFieldError,
  FIELD_WAREHOUSE,
  FIELD_ENGINEER,
} from "./material-issue-form-helpers";
import { CharCounter, InlineFieldError, RequiredLabel } from "./MaterialIssueFieldBits";

const EXTERNAL_TICKET_MAX_LENGTH = 100;

interface MaterialIssueAssignmentFieldsProps {
  header: MaterialIssueHeaderState;
  isEdit: boolean;
  formError: FormFieldError | null;
}

/** Warehouse + Assign-to-engineer + Ticket share a row. */
export function MaterialIssueAssignmentFields({
  header,
  isEdit,
  formError,
}: MaterialIssueAssignmentFieldsProps) {
  const { warehouseId, engineerId, externalTicket } = header;
  const warehouseValue = warehouseId
    ? {
        id: warehouseId,
        label:
          header.warehouses.find((w) => w.warehouse_id === warehouseId)?.name ??
          "—",
      }
    : null;
  const engineerValue = engineerId
    ? {
        id: engineerId,
        label:
          header.engineers.find((a) => a.user.id === engineerId)?.user.name ??
          "—",
      }
    : null;
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div className="space-y-1.5">
        <RequiredLabel>{S.form.header.warehouse}</RequiredLabel>
        <AsyncSelect
          id={FIELD_WAREHOUSE}
          value={warehouseValue}
          disabled={isEdit}
          onValueChange={(next) => header.selectWarehouse(next?.id ?? "")}
          useOptions={header.useWarehouseOptions}
          toLabel={(o) => o.label}
          placeholder={S.form.header.warehousePlaceholder}
          searchPlaceholder={S.form.header.warehousePlaceholder}
        />
        <InlineFieldError error={formError} target={FIELD_WAREHOUSE} />
      </div>

      <div className="space-y-1.5">
        <RequiredLabel>{S.form.header.issuedTo}</RequiredLabel>
        <AsyncSelect
          id={FIELD_ENGINEER}
          value={engineerValue}
          disabled={isEdit ? false : !warehouseId}
          onValueChange={(next) => header.selectEngineer(next?.id ?? "")}
          useOptions={header.useEngineerOptions}
          toLabel={(o) => o.label}
          // Name + L1/L2/L3 level badge per option — mirrors the device-assign
          // dropdowns so the issuer can pick by seniority (CP-193 #10).
          renderItem={(o) => (
            <span className="flex min-w-0 items-center gap-2">
              <span className="min-w-0 truncate">{o.label}</span>
              {o.level ? (
                <Badge variant="secondary" size="sm" className="shrink-0">
                  {ASSIGNMENT_LEVEL_LABELS[o.level as AssignmentLevel] ??
                    String(o.level).toUpperCase()}
                </Badge>
              ) : null}
            </span>
          )}
          placeholder={
            warehouseId
              ? S.form.header.issuedToPlaceholder
              : S.form.header.issuedToNeedsWarehouse
          }
          searchPlaceholder={S.form.header.issuedToPlaceholder}
        />
        <InlineFieldError error={formError} target={FIELD_ENGINEER} />
      </div>

      <div className="space-y-1.5">
        <Label>{S.form.header.externalTicket}</Label>
        <Input
          value={externalTicket}
          onChange={(e) => header.setExternalTicket(e.target.value)}
          placeholder={S.form.header.externalTicketPlaceholder}
          maxLength={EXTERNAL_TICKET_MAX_LENGTH}
        />
        <CharCounter>
          {S.form.header.counter(externalTicket.length, EXTERNAL_TICKET_MAX_LENGTH)}
        </CharCounter>
      </div>
    </div>
  );
}
