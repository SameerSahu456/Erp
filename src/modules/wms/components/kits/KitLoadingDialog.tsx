import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Typography } from "@/components/ui/typography"
import { OperationDialog } from "@/components/common/dialogs/OperationDialog"
import { NoAccess } from "@shared/components/feedback/NoAccess"
import { isForbidden } from "@shared/api/envelope"

import { KITS_STRINGS as S } from "./kits.strings"

/** Kit dialog frame while loading or failed; a 403 reads as "no access" (§12). */
export function KitLoadingDialog({
  title,
  failed,
  error,
  onClose,
}: {
  title: string
  failed: boolean
  error: unknown
  onClose: () => void
}) {
  let body = <Skeleton className="h-16 w-full rounded-md" aria-label={S.loading} />
  if (failed && isForbidden(error)) body = <NoAccess compact description={error.message} />
  else if (failed)
    body = (
      <Typography variant="body" tone="danger">
        {S.loadFailed}
      </Typography>
    )
  return (
    <OperationDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={title}
      footer={() => (
        <Button variant="outline" onClick={onClose}>
          {S.cancel}
        </Button>
      )}
    >
      {body}
    </OperationDialog>
  )
}
