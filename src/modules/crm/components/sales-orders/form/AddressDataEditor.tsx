import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import type { SalesOrderAddressData } from "../../../api"
import { SALES_ORDERS_STRINGS as S } from "../sales-orders.strings"

export function AddressDataEditor({
  label,
  required,
  value,
  onChange,
  readOnly,
}: {
  label: string
  required?: boolean
  value: SalesOrderAddressData
  onChange: (v: SalesOrderAddressData) => void
  readOnly: boolean
}) {
  function patch(p: Partial<SalesOrderAddressData>) {
    onChange({ ...value, ...p })
  }
  return (
    <div className="rounded-lg border p-4">
      <div className="mb-3 text-sm font-medium">
        {label} {required && <span className="text-destructive">*</span>}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor={`${label}-line1`}>
            {S.addressEditor.line1} {required && <span className="text-destructive">*</span>}
          </Label>
          <Input
            id={`${label}-line1`}
            value={value.line1}
            disabled={readOnly}
            onChange={(e) => patch({ line1: e.target.value })}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor={`${label}-line2`}>{S.addressEditor.line2}</Label>
          <Input
            id={`${label}-line2`}
            value={value.line2 ?? ""}
            disabled={readOnly}
            onChange={(e) => patch({ line2: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${label}-city`}>
            {S.addressEditor.city} {required && <span className="text-destructive">*</span>}
          </Label>
          <Input
            id={`${label}-city`}
            value={value.city}
            disabled={readOnly}
            onChange={(e) => patch({ city: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${label}-state`}>
            {S.addressEditor.state} {required && <span className="text-destructive">*</span>}
          </Label>
          <Input
            id={`${label}-state`}
            value={value.state}
            disabled={readOnly}
            onChange={(e) => patch({ state: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${label}-pincode`}>
            {S.addressEditor.pincode} {required && <span className="text-destructive">*</span>}
          </Label>
          <Input
            id={`${label}-pincode`}
            value={value.pincode}
            disabled={readOnly}
            onChange={(e) => patch({ pincode: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${label}-label`}>{S.addressEditor.labelField}</Label>
          <Input
            id={`${label}-label`}
            value={value.label ?? ""}
            placeholder={S.addressEditor.labelPlaceholder}
            disabled={readOnly}
            onChange={(e) => patch({ label: e.target.value })}
          />
        </div>
      </div>
    </div>
  )
}
