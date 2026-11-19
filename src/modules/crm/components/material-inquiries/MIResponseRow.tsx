import { useNavigate } from "react-router-dom"
import { Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { TableCell, TableRow } from "@/components/ui/table"
import { formatINRCompact } from "@/lib/currency"
import { formatIST_date } from "@shared/lib/date"

import { useDeleteMIResponse } from "@modules/procurement"
import type { MIResponseFullViewWire } from "@modules/procurement"

import { PMDecisionBadge } from "./PMDecisionBadge"
import { MATERIAL_INQUIRIES_STRINGS as S } from "./material-inquiries.strings"

export function MIResponseRow({
  miId,
  itemId,
  response,
}: {
  miId: string
  itemId: string
  response: MIResponseFullViewWire
}) {
  const navigate = useNavigate()
  const deleteMut = useDeleteMIResponse(miId)
  const canDelete = response.pm_status === "pending"

  return (
    <TableRow
      onClick={() =>
        navigate(`/crm/material-inquiries/${miId}/responses/${response.id}`)
      }
      className="cursor-pointer transition-colors hover:bg-muted/40"
    >
      <TableCell>
        <p className="text-sm font-medium">{response.vendor.name}</p>
        <p className="text-[10px] font-mono text-muted-foreground">
          {response.vendor.code}
        </p>
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {response.qty_available}
        {response.qty_allocated > 0 && (
          <span className="ml-1 text-[10px] text-muted-foreground">
            {S.responseRow.allocatedSuffix(response.qty_allocated)}
          </span>
        )}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {formatINRCompact(response.cost_price, { decimals: true })}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {response.sell_price != null
          ? `${formatINRCompact(response.sell_price, { decimals: true })}`
          : <span className="text-muted-foreground text-xs">—</span>}
      </TableCell>
      <TableCell className="text-xs">
        {response.available_date ? formatIST_date(response.available_date) : "—"}
      </TableCell>
      <TableCell>
        <PMDecisionBadge status={response.pm_status} />
      </TableCell>
      <TableCell>
        {canDelete && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={(e) => {
              e.stopPropagation()
              deleteMut.mutate({ respId: response.id, itemId })
            }}
            disabled={deleteMut.isPending}
            className="text-muted-foreground hover:text-destructive"
            title={S.responseRow.deleteTitle}
          >
            <Trash2 className="size-3.5" />
          </Button>
        )}
      </TableCell>
    </TableRow>
  )
}
