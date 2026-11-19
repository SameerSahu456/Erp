import { useMemo, useState } from 'react'

import { cn } from '@/lib/utils'
import { Typography } from '@/components/ui/typography'
import { TablePagination } from '@/components/common/tables/TablePagination'
import { UnsavedChangesDialog } from '@/components/common/dialogs/UnsavedChangesDialog'
import { useUnsavedChangesGuard } from '@/hooks/use-unsaved-changes-guard'
import { PAGINATION } from '@/shared/constants'
import { useAuth } from '@shared/auth/use-auth'
import { usePermission } from '@shared/rbac'
import { useScrollToHashTarget } from '@shared/notifications/use-scroll-to-hash-target'
import { LoadErrorState } from '@/shared/components/feedback/LoadErrorState'

import { crmCan } from '../../permissions'
import { NoteComposer } from './NoteComposer'
import { NoteItem } from './NoteItem'
import {
  useCreateNote,
  useDeleteNote,
  useEntityNotes,
  useUpdateNote,
} from '../../hooks/shared/useNotes'
import type { CrmNoteWire, NoteEntityType } from '../../api'
import { CRM_SHARED_STRINGS } from './crm-shared.strings'

interface NotesSectionProps {
  entityType: NoteEntityType
  entityId: string
  className?: string
  /** View-only access (user reached the lead/deal only via an @mention):
   *  hides every write affordance. Defaults to false. */
  readOnly?: boolean
}

function NotesSection({ entityType, entityId, className, readOnly = false }: NotesSectionProps) {
  const { user: currentUser } = useAuth()
  // Notes write (create / edit / delete) is gated on `crm:manage` server-side
  // for every entity type (see crmCan.writeNote). Hide the composer + per-note
  // edit/delete affordances when the user lacks it so they can't click into a
  // guaranteed 403. `can()` already grants superusers via the Layer-2 bypass.
  const { can } = usePermission()
  const canWriteNote = can(crmCan.writeNote) && !readOnly

  // Numbered pagination (Coding-guideline §16.7) — one page at a time, with
  // the shared `TablePagination` footer below the list. `page` resets to 1
  // on create so the newest note (list is newest-first) is visible.
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(PAGINATION.DEFAULT_PAGE_SIZE)

  const { data, isLoading, isError, error, isFetching } = useEntityNotes(
    entityType,
    entityId,
    { page, pageSize },
  )

  const createMut = useCreateNote(entityType, entityId)
  const updateMut = useUpdateNote(entityType, entityId)
  const deleteMut = useDeleteNote(entityType, entityId)

  const [newContent, setNewContent] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')

  // Backend returns newest-first; re-sort defensively. Recomputed only when
  // the current page's items change.
  const notes = useMemo<CrmNoteWire[]>(() => {
    const all = data?.items ?? []
    return all.slice().sort((a, b) => b.created_at.localeCompare(a.created_at))
  }, [data?.items])
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  // Notification deep-link: scroll-and-highlight when the URL hash points at
  // one of these notes (e.g. `#note-<uuid>` from a Note @-mention
  // notification). Under numbered pagination the hook page-walks to the page
  // holding the row.
  useScrollToHashTarget({
    ready: notes.length,
    expectedPrefix: 'note',
    isFetching,
    paginated: { page, totalPages, setPage },
  })

  function handleAddNote() {
    const content = newContent.trim()
    if (!content) return
    createMut.mutate(
      { content },
      {
        onSuccess: () => {
          setNewContent('')
          setPage(1)
        },
      },
    )
  }

  function handleStartEdit(note: CrmNoteWire) {
    setEditingId(note.id)
    setEditContent(note.content)
  }

  function handleCancelEdit() {
    setEditingId(null)
    setEditContent('')
  }

  function handleSaveEdit(noteId: string) {
    const content = editContent.trim()
    if (!content) return
    updateMut.mutate(
      { noteId, content },
      {
        onSuccess: () => {
          setEditingId(null)
          setEditContent('')
        },
      },
    )
  }

  function handleDelete(noteId: string) {
    deleteMut.mutate(noteId)
  }

  // Dirty when the user has typed a new note or is mid-edit on an existing
  // one. Guards refresh / sidebar nav / browser back / DetailTabs switch
  // so typed text isn't silently dropped.
  const editingOriginal = useMemo(
    () => (editingId ? notes.find((n) => n.id === editingId)?.content ?? '' : ''),
    [editingId, notes],
  )
  const isDirty =
    newContent.trim() !== '' ||
    (editingId !== null && editContent !== editingOriginal)
  const guard = useUnsavedChangesGuard({
    isDirty,
    onDiscard: () => {
      setNewContent('')
      setEditingId(null)
      setEditContent('')
    },
  })

  return (
    <div className={cn('space-y-4', className)}>
      <Typography
        variant="body-strong"
        tone="muted"
        className="font-ui uppercase tracking-wide"
        asChild
      >
        <h3>{CRM_SHARED_STRINGS.notesSection.heading}</h3>
      </Typography>

      {canWriteNote && (
        <NoteComposer
          value={newContent}
          onChange={setNewContent}
          onAdd={handleAddNote}
          isPending={createMut.isPending}
        />
      )}

      {/* List */}
      {isLoading ? (
        <Typography
          variant="body"
          tone="muted"
          align="center"
          className="rounded-lg border border-dashed p-8"
          asChild
        >
          <div>{CRM_SHARED_STRINGS.notesSection.loading}</div>
        </Typography>
      ) : isError ? (
        <LoadErrorState
          error={error}
          fallback={CRM_SHARED_STRINGS.notesSection.loadError}
        />
      ) : notes.length > 0 ? (
        <div className="space-y-3">
          {notes.map((note) => {
            const isAuthor =
              !!currentUser?.id && currentUser.id === note.created_by_id
            const isEditing = editingId === note.id
            return (
              <NoteItem
                key={note.id}
                note={note}
                // Edit/delete also need `crm:manage` — the author check alone
                // would surface buttons that 403 for a read-only viewer.
                canEdit={isAuthor && canWriteNote}
                canDelete={
                  (isAuthor || !!currentUser?.is_superuser) && canWriteNote
                }
                isDeleting={deleteMut.isPending && deleteMut.variables === note.id}
                edit={{
                  active: isEditing,
                  content: editContent,
                  saving: updateMut.isPending && isEditing,
                  onContentChange: setEditContent,
                  onStart: () => handleStartEdit(note),
                  onCancel: handleCancelEdit,
                  onSave: () => handleSaveEdit(note.id),
                }}
                onDelete={() => handleDelete(note.id)}
              />
            )
          })}
          {total > 0 && (
            <TablePagination
              page={page}
              totalPages={totalPages}
              pageSize={pageSize}
              total={total}
              isFetching={isFetching}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size)
                setPage(1)
              }}
            />
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <Typography variant="body" tone="muted">
            {CRM_SHARED_STRINGS.notesSection.emptyTitle}
          </Typography>
          <Typography variant="helper" className="mt-1" asChild>
            <p>
              {canWriteNote
                ? CRM_SHARED_STRINGS.notesSection.emptyDescription
                : CRM_SHARED_STRINGS.notesSection.emptyDescriptionReadOnly}
            </p>
          </Typography>
        </div>
      )}

      <UnsavedChangesDialog
        open={guard.dialogOpen}
        onOpenChange={guard.onDialogOpenChange}
        onConfirm={guard.onConfirmDiscard}
      />
    </div>
  )
}

export { NotesSection, type NotesSectionProps }
