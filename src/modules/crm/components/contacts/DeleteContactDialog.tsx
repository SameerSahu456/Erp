import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

import { CONTACTS_STRINGS } from "./contacts.strings"

interface DeleteContactDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contactName: string
  onDelete: () => void
  isPending: boolean
}

export function DeleteContactDialog({
  open,
  onOpenChange,
  contactName,
  onDelete,
  isPending,
}: DeleteContactDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{CONTACTS_STRINGS.delete.title}</DialogTitle>
          <DialogDescription>
            {CONTACTS_STRINGS.delete.bodyBefore}
            <strong>{contactName}</strong>
            {CONTACTS_STRINGS.delete.bodyAfter}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {CONTACTS_STRINGS.delete.cancel}
          </Button>
          <Button
            variant="destructive"
            onClick={onDelete}
            disabled={isPending}
          >
            {isPending ? CONTACTS_STRINGS.delete.confirming : CONTACTS_STRINGS.delete.confirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
