import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"

import { UserActivityTimeline } from "./UserActivityTimeline"
import { USER_ACTIVITY_STRINGS as S } from "./user-activity.strings"

interface UserActivityLogProps {
  /** Actor whose feed is shown — drives the API query. */
  userId: string | null
  /** Display name, used only for the sheet header copy. */
  userName: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function UserActivityLog({ userId, userName, open, onOpenChange }: UserActivityLogProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b">
          <SheetTitle>{S.log.title}</SheetTitle>
          <SheetDescription>{userName ? S.log.description(userName) : ""}</SheetDescription>
        </SheetHeader>

        {/* min-h-0 + flex-1 bounds the sheet body; the timeline (fillHeight)
            owns its own scroll so the numbered pager stays pinned to the
            bottom instead of scrolling away with the list. */}
        <div className="min-h-0 flex-1">
          {userId && (
            <UserActivityTimeline
              userId={userId}
              mode="pager"
              stackFilters
              fillHeight
              urlKey="log"
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
