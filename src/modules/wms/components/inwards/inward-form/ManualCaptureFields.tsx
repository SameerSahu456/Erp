import { Input } from '@/components/ui/input'
import { Typography } from '@/components/ui/typography'

import { INWARDS_STRINGS } from '../inwards.strings'
import { FieldLabel } from './FormPrimitives'
import { WarehouseSelect } from './WarehouseSelect'
import type { InwardForm } from './useInwardForm'

/** On-call capture (staff return / warehouse transfer): no source document, so
 *  the operator types the who/where by hand and adds units in the next step. */
export function ManualCaptureFields({ f }: { f: InwardForm }) {
  const {
    isStaffReturn,
    staffDept,
    setStaffDept,
    staffEmpName,
    setStaffEmpName,
    staffEmpId,
    setStaffEmpId,
    transferFromId,
    setTransferFromId,
    returnWarehouseId,
    setReturnWarehouseId,
    warehouses,
  } = f
  return (
    <div className="grid grid-cols-1 gap-4">
      {isStaffReturn ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <FieldLabel required>{INWARDS_STRINGS.inwardInfo.sourceDeptFieldLabel}</FieldLabel>
            <Input
              value={staffDept}
              onChange={(e) => setStaffDept(e.target.value)}
              placeholder={INWARDS_STRINGS.inwardInfo.sourceDeptPlaceholder}
            />
          </div>
          <div className="space-y-2">
            <FieldLabel required>{INWARDS_STRINGS.inwardInfo.employeeNameFieldLabel}</FieldLabel>
            <Input
              value={staffEmpName}
              onChange={(e) => setStaffEmpName(e.target.value)}
              placeholder={INWARDS_STRINGS.inwardInfo.employeeNamePlaceholder}
            />
          </div>
          <div className="space-y-2">
            <FieldLabel>{INWARDS_STRINGS.inwardInfo.employeeIdFieldLabel}</FieldLabel>
            <Input
              value={staffEmpId}
              onChange={(e) => setStaffEmpId(e.target.value)}
              placeholder={INWARDS_STRINGS.inwardInfo.employeeIdPlaceholder}
            />
            <Typography variant="helper" tone="muted">
              {INWARDS_STRINGS.inwardInfo.employeeIdFieldHint}
            </Typography>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <FieldLabel required>{INWARDS_STRINGS.manualCapture.fromWarehouseLabel}</FieldLabel>
            <WarehouseSelect
              value={transferFromId}
              onChange={setTransferFromId}
              warehouses={warehouses}
            />
          </div>
          <div className="space-y-2">
            <FieldLabel required>{INWARDS_STRINGS.manualCapture.toWarehouseLabel}</FieldLabel>
            <WarehouseSelect
              value={returnWarehouseId}
              onChange={setReturnWarehouseId}
              warehouses={warehouses}
            />
          </div>
        </div>
      )}
      {isStaffReturn && (
        <div className="space-y-2 sm:max-w-sm">
          <FieldLabel required>{INWARDS_STRINGS.manualCapture.receiveIntoWarehouseLabel}</FieldLabel>
          <WarehouseSelect
            value={returnWarehouseId}
            onChange={setReturnWarehouseId}
            warehouses={warehouses}
          />
        </div>
      )}
      <Typography variant="helper" tone="muted">
        {INWARDS_STRINGS.manualCapture.footerHint}
      </Typography>
    </div>
  )
}
