import { Trash2 } from "lucide-react"

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

import { LEADS_STRINGS as S } from "./leads.strings"

interface DeleteLeadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  leadName: string
  onDelete: () => void
  isPending: boolean
}

export function DeleteLeadDialog({
  open,
  onOpenChange,
  leadName,
  onDelete,
  isPending,
}: DeleteLeadDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger render={<Button variant="destructive" size="sm" className="h-8" />}>
        <Trash2 className="size-3.5" data-icon="inline-start" />
        {S.delete.trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{S.delete.title}</DialogTitle>
          <DialogDescription>
            {S.delete.bodyBefore}{leadName}{S.delete.bodyAfter}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {S.delete.cancel}
          </Button>
          <Button
            variant="destructive"
            onClick={onDelete}
            disabled={isPending}
          >
            {isPending ? S.delete.confirming : S.delete.confirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
