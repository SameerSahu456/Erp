import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { StatsRow } from "@/components/common/display/StatsRow"
import { ListPageShell } from "@/components/page-shells"

import { MeetingFormDialog } from "../../components/meetings/MeetingFormDialog"
import { MEETINGS_STRINGS } from "../../components/meetings/meetings.strings"
import { MeetingsListBody } from "../../components/meetings/MeetingsListBody"
import { MeetingsToolbar } from "../../components/meetings/MeetingsToolbar"
import { useMeetingsList } from "../../hooks/meetings/useMeetingsList"

function MeetingsPage() {
  const list = useMeetingsList()

  return (
    <>
      <ListPageShell
        title={MEETINGS_STRINGS.list.title}
        subtitle={MEETINGS_STRINGS.list.subtitle}
        breadcrumbs={[
          { label: MEETINGS_STRINGS.list.breadcrumbCrm },
          { label: MEETINGS_STRINGS.list.breadcrumbMeetings },
        ]}
        actions={
          list.canWrite ? (
            <Button size="sm" onClick={() => list.setCreateOpen(true)}>
              <Plus className="size-3.5" data-icon="inline-start" />
              {MEETINGS_STRINGS.list.newMeeting}
            </Button>
          ) : undefined
        }
        stats={<StatsRow stats={list.stats} />}
        toolbar={
          <MeetingsToolbar
            search={list.search}
            onSearchChange={list.handleSearch}
            statusFilter={list.statusFilter}
            onStatusChange={list.handleStatus}
            typeFilter={list.typeFilter}
            onTypeChange={list.handleType}
            dateRange={list.dateRange}
            onDateRangeChange={list.handleDateRange}
          />
        }
      >
        <div className="space-y-3">
          <MeetingsListBody list={list} />
        </div>
      </ListPageShell>

      {/* Create — POST /crm/meetings. Conditionally rendered so each open
          starts from a clean form. */}
      {list.createOpen && (
        <MeetingFormDialog
          open
          onOpenChange={(o) => !o && list.setCreateOpen(false)}
          isPending={list.createMut.isPending}
          onSubmit={(body) =>
            list.createMut.mutate(body, {
              onSuccess: () => {
                list.setCreateOpen(false)
                list.setPage(1)
              },
            })
          }
        />
      )}

      {/* Edit — PATCH /crm/meetings/{id}. `key` re-seeds the form per row. */}
      {list.editingMeeting && (
        <MeetingFormDialog
          key={list.editingMeeting.id}
          open
          onOpenChange={(o) => !o && list.setEditingMeeting(null)}
          meeting={list.editingMeeting}
          isPending={list.updateMut.isPending}
          onSubmit={(body) =>
            list.updateMut.mutate(
              { id: list.editingMeeting!.id, body },
              { onSuccess: () => list.setEditingMeeting(null) },
            )
          }
        />
      )}
    </>
  )
}

export { MeetingsPage }
export default MeetingsPage
