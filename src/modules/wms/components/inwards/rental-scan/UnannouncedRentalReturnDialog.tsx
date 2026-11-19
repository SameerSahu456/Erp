import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { PackagePlus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { AsyncSelect, type AsyncSelectOption } from "@/components/ui/async-select"
import { OperationDialog } from "@/components/common/dialogs/OperationDialog"
import { useAccountOptions } from "@modules/crm"

import { useCreateUnannouncedRentalReturn } from "../../../hooks/inwards/useRentalReturnInward"
import { WarehouseSelect } from "../inward-form/WarehouseSelect"
import type { InwardForm } from "../inward-form/useInwardForm"
import { RENTAL_SCAN_STRINGS } from "./rental-scan.strings"

const S = RENTAL_SCAN_STRINGS.unannounced

type Props = Pick<InwardForm, "warehouses" | "useScopedWarehouseOptions" | "warehouseOptionsKey">

/**
 * Boxes arrived from a customer with no return request (R7). Picks the
 * customer and the receiving warehouse, opens the batch (the server creates
 * an `unannounced` request for it) and goes straight to scanning.
 */
export function UnannouncedRentalReturnDialog(props: Props) {
  const navigate = useNavigate()
  const create = useCreateUnannouncedRentalReturn()
  const [open, setOpen] = useState(false)
  const [account, setAccount] = useState<AsyncSelectOption | null>(null)
  const [warehouse, setWarehouse] = useState({ id: "", name: "" })

  const start = async () => {
    if (!account || !warehouse.id) return
    const batch = await create.mutateAsync({ account_id: account.id, to_warehouse_id: warehouse.id })
    setOpen(false)
    navigate(`/wms/inward/${batch.id}/rental-scan`)
  }

  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        <PackagePlus className="size-4" data-icon="inline-start" />
        {S.action}
      </Button>
      <OperationDialog
        open={open}
        onOpenChange={setOpen}
        title={S.title}
        description={S.description}
        isDirty={!!account || !!warehouse.id}
        footer={({ requestClose }) => (
          <>
            <Button variant="outline" onClick={requestClose} disabled={create.isPending}>
              {S.cancel}
            </Button>
            <Button onClick={() => void start()} disabled={!account || !warehouse.id || create.isPending}>
              {S.confirm}
            </Button>
          </>
        )}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label required>{S.customer}</Label>
            <AsyncSelect
              value={account}
              onValueChange={setAccount}
              useOptions={useAccountOptions}
              toLabel={(a) => a.name}
              placeholder={S.customerPlaceholder}
              className="w-full"
            />
          </div>
          <div className="space-y-2">
            <Label required>{S.warehouse}</Label>
            <WarehouseSelect
              key={props.warehouseOptionsKey}
              value={warehouse.id}
              label={warehouse.name}
              onChange={(id, name) => setWarehouse({ id, name })}
              warehouses={props.warehouses}
              useOptions={props.useScopedWarehouseOptions}
            />
          </div>
        </div>
      </OperationDialog>
    </>
  )
}
