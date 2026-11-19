import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

import { ACCOUNTS_STRINGS as S } from "./accounts.strings"

interface DeleteAccountDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  accountName: string
  onDelete: () => void
  isPending: boolean
}

export function DeleteAccountDialog({
  open,
  onOpenChange,
  accountName,
  onDelete,
  isPending,
}: DeleteAccountDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{S.delete.title}</DialogTitle>
          <DialogDescription>
            {S.delete.bodyBefore}
            <strong>{accountName}</strong>
            {S.delete.bodyAfter}
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
