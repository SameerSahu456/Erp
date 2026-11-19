import { Link } from "react-router-dom"
import { Eye, Pencil, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PermissionGuard } from "@shared/rbac"

import { crmCan } from "../../permissions"
import { DEAL_STAGES } from "../../types"
import { dealStageLabel } from "../../constants/deal-stages"
import { DEALS_STRINGS } from "./deals.strings"
import type { useDealDetail } from "../../hooks/deals/useDealDetail"

type Detail = ReturnType<typeof useDealDetail>

interface DealDetailHeaderActionsProps {
  deal: NonNullable<Detail["deal"]>
  /** Permission AND not view-only — gates the stage select. */
  canWriteDeal: boolean
  /** View-only (reached via an @mention): renders no write actions. */
  isReadOnly: boolean
  activeStage: string
  onStageChange: (value: string) => void
  deleteDialogOpen: boolean
  onDeleteDialogChange: (open: boolean) => void
  onDelete: () => void
}

export function DealDetailHeaderActions({
  deal,
  canWriteDeal,
  isReadOnly,
  activeStage,
  onStageChange,
  deleteDialogOpen,
  onDeleteDialogChange,
  onDelete,
}: DealDetailHeaderActionsProps) {
  // View-only: no write actions at all. The page shows a banner explaining why.
  if (isReadOnly) return null
  return (
    <>
      {/* Stage Update — needs deal-write, like every other stage move. */}
      {canWriteDeal && activeStage !== "Closed Won" && activeStage !== "Closed Lost" && (
        <Select value={activeStage} onValueChange={(v) => v && onStageChange(v)}>
          <SelectTrigger size="sm" className="w-32 text-[12.5px]" clearable={false}>
            <SelectValue placeholder={DEALS_STRINGS.detail.moveStagePlaceholder} />
          </SelectTrigger>
          <SelectContent>
            {DEAL_STAGES.map((s) => (
              <SelectItem key={s} value={s}>{dealStageLabel(s)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* A Closed Won deal is settled (and has a Sales Order) — no edit, but
          it can still be opened in the read-only form view. */}
      {activeStage === "Closed Won" && (
        <PermissionGuard required={[...crmCan.readDeal]}>
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            render={<Link to={`/crm/deals/${deal.id}/view`} />}
          >
            <Eye className="size-3.5" data-icon="inline-start" />
            {DEALS_STRINGS.detail.view}
          </Button>
        </PermissionGuard>
      )}
      {activeStage !== "Closed Won" && (
        <PermissionGuard required={[...crmCan.writeDeal]}>
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            render={<Link to={`/crm/deals/${deal.id}/edit`} />}
          >
            <Pencil className="size-3.5" data-icon="inline-start" />
            {DEALS_STRINGS.detail.edit}
          </Button>
        </PermissionGuard>
      )}
      {/* `is_deletable` is the backend deletion guard — false once a Sales
          Order is raised for this deal, in which case there is no delete
          affordance at all (server also rejects with DEAL_HAS_SALES_ORDER). */}
      {deal.isDeletable && (
        <PermissionGuard required={[...crmCan.deleteDeal]}>
          <Dialog open={deleteDialogOpen} onOpenChange={onDeleteDialogChange}>
            <DialogTrigger render={<Button variant="destructive" size="sm" className="h-8" />}>
              <Trash2 className="size-3.5" data-icon="inline-start" />
              {DEALS_STRINGS.detail.delete}
            </DialogTrigger>
            <DialogContent className="sm:max-w-sm">
              <DialogHeader>
                <DialogTitle>{DEALS_STRINGS.delete.title}</DialogTitle>
                <DialogDescription>
                  {DEALS_STRINGS.delete.bodyBefore}
                  {deal.name}
                  {DEALS_STRINGS.delete.bodyAfter}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => onDeleteDialogChange(false)}>
                  {DEALS_STRINGS.delete.cancel}
                </Button>
                <Button variant="destructive" onClick={onDelete}>
                  {DEALS_STRINGS.delete.confirm}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </PermissionGuard>
      )}
    </>
  )
}
