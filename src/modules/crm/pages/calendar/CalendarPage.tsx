import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ListPageShell } from "@/components/page-shells/ListPageShell"

import { MeetingFormDialog } from "../../components/meetings/MeetingFormDialog"
import { TaskFormDialog } from "../../components/tasks/TaskFormDialog"
import { CalendarDayDetail } from "../../components/calendar/CalendarDayDetail"
import { CalendarGrid } from "../../components/calendar/CalendarGrid"
import { CALENDAR_STRINGS } from "../../components/calendar/calendar.strings"
import { useCalendarPage } from "../../hooks/calendar/useCalendarPage"

function CalendarPage() {
  const cal = useCalendarPage()

  return (
    <>
      <ListPageShell
        title={CALENDAR_STRINGS.page.title}
        subtitle={CALENDAR_STRINGS.page.subtitle}
        actions={
          cal.canCreate && (
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button size="sm" />}>
                <Plus className="size-3.5" data-icon="inline-start" />
                {CALENDAR_STRINGS.page.new}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {cal.canCreateMeeting && (
                  <DropdownMenuItem onClick={() => cal.setCreateKind("meeting")}>
                    {CALENDAR_STRINGS.page.newMeeting}
                  </DropdownMenuItem>
                )}
                {cal.canCreateTask && (
                  <DropdownMenuItem onClick={() => cal.setCreateKind("task")}>
                    {CALENDAR_STRINGS.page.newTask}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )
        }
      >
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <CalendarGrid cal={cal} />
          <CalendarDayDetail cal={cal} />
        </div>
      </ListPageShell>

      {/* Create — routes to the Meeting or Task API per the chosen type. */}
      {cal.createKind === "meeting" && (
        <MeetingFormDialog
          open
          onOpenChange={(o) => !o && cal.setCreateKind(null)}
          isPending={cal.createMeetingMut.isPending}
          onSubmit={(body) =>
            cal.createMeetingMut.mutate(body, {
              onSuccess: () => cal.setCreateKind(null),
            })
          }
        />
      )}

      {cal.createKind === "task" && (
        <TaskFormDialog
          mode="create"
          scope="global"
          open
          onOpenChange={(o) => !o && cal.setCreateKind(null)}
          isPending={cal.createTaskMut.isPending}
          onSubmit={(body) =>
            cal.createTaskMut.mutate(body, {
              onSuccess: () => cal.setCreateKind(null),
            })
          }
        />
      )}
    </>
  )
}

export { CalendarPage }
export default CalendarPage
