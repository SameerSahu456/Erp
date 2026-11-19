import { useState } from "react"
import { Lock, Send } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Typography } from "@/components/ui/typography"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

import { useRequestAccountAccess } from "../../hooks/accounts/useAccessRequests"

/**
 * Per-row "Request Access" affordance on the All-Accounts table, shown only for
 * accounts the current user does not own. Opens a lean dialog that collects a
 * reason and raises the request. The reason is sent to the backend now so it is
 * captured at the source (the backend will persist it in a later update).
 */
export function RequestAccessCell({
  accountId,
  accountName,
  reRequest = false,
}: {
  accountId: string
  accountName: string
  /**
   * Render the "Re-request" variant (lock + "Re-request" label), shown when the
   * viewer's previous request was rejected. Defaults to the first-time
   * "Request Access" affordance.
   */
  reRequest?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState("")
  const requestMut = useRequestAccountAccess()

  function submit() {
    if (!reason.trim()) return
    requestMut.mutate(
      { accountId, requestedNotes: reason.trim() },
      {
        onSuccess: () => {
          setOpen(false)
          setReason("")
        },
      },
    )
  }

  return (
    <>
      <div className="flex justify-end">
        <Button
          size="sm"
          variant="outline"
          className="h-7"
          onClick={(e) => {
            e.stopPropagation()
            setOpen(true)
          }}
        >
          <Lock className="size-3.5" />
          {reRequest ? "Re-request" : "Request Access"}
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="sm:max-w-md"
          onClick={(e) => e.stopPropagation()}
        >
          <DialogHeader>
            <DialogTitle>Request access</DialogTitle>
            <DialogDescription>
              Ask the account manager for permission to view{" "}
              <span className="font-medium text-foreground">{accountName}</span>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5">
            <Label htmlFor="access-reason">
              Reason
              <Typography variant="helper" tone="muted" asChild>
                <span className="ml-1.5 font-normal">— required, helps the approver decide</span>
              </Typography>
            </Label>
            <Textarea
              id="access-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why do you need access to this account?"
              rows={3}
              className="max-h-40 w-full resize-none overflow-y-auto"
              autoFocus
            />
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={requestMut.isPending}
            >
              Cancel
            </Button>
            <Button onClick={submit} disabled={requestMut.isPending || !reason.trim()}>
              <Send className="mr-1.5 size-4" />
              Send request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
