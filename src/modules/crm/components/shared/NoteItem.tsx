import { Pencil, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useUser, getUserDisplayName } from '@modules/users'
import { formatIST } from '@shared/lib/date'

import { ExpandableMentionText } from './ExpandableMentionText'
import { submitOnEnter } from './submitOnEnter'
import type { CrmNoteWire } from '../../api'
import { CRM_SHARED_STRINGS } from './crm-shared.strings'

// Hydrates the author's display name from `created_by_id`. TanStack dedups
// identical `useUser(id)` calls across a page, so multiple notes by the same
// author cost one network request.
function NoteAuthor({ userId }: { userId: string | null }) {
  const enabled = !!userId
  const { data, isLoading } = useUser(enabled ? userId : '')
  if (!userId) return <span>{CRM_SHARED_STRINGS.noteItem.system}</span>
  if (isLoading)
    return <span className="text-muted-foreground">{CRM_SHARED_STRINGS.noteItem.loading}</span>
  if (!data) return <span className="text-muted-foreground">{CRM_SHARED_STRINGS.noteItem.unknown}</span>
  return <span>{getUserDisplayName(data)}</span>
}

interface NoteItemEdit {
  active: boolean
  content: string
  saving: boolean
  onContentChange: (value: string) => void
  onStart: () => void
  onCancel: () => void
  onSave: () => void
}

interface NoteItemProps {
  note: CrmNoteWire
  canEdit: boolean
  canDelete: boolean
  isDeleting: boolean
  edit: NoteItemEdit
  onDelete: () => void
}

// One note in the list — display mode (mention pills + author/date + actions)
// or inline edit mode. Edit state is owned by NotesSection and passed in.
export function NoteItem({ note, canEdit, canDelete, isDeleting, edit, onDelete }: NoteItemProps) {
  return (
    <div
      // Scroll target for notification deep links — see
      // shared/notifications/routing.ts (`#note-<id>`).
      id={`note-${note.id}`}
      className="rounded-lg border bg-card p-4"
    >
      {edit.active ? (
        <div className="space-y-2">
          <Textarea
            value={edit.content}
            onChange={(e) => edit.onContentChange(e.target.value)}
            onKeyDown={submitOnEnter(edit.onSave)}
            rows={3}
            disabled={edit.saving}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={edit.onCancel} disabled={edit.saving}>
              {CRM_SHARED_STRINGS.noteItem.cancel}
            </Button>
            <Button
              size="sm"
              onClick={edit.onSave}
              disabled={!edit.content.trim() || edit.saving}
            >
              {edit.saving ? CRM_SHARED_STRINGS.noteItem.saving : CRM_SHARED_STRINGS.noteItem.save}
            </Button>
          </div>
        </div>
      ) : (
        <>
          {/* Renders mention tokens as styled name pills. Display name is
              embedded in the token at write time — no useUser() lookup.
              Long notes reveal 500 chars at a time via a Show more toggle. */}
          <ExpandableMentionText content={note.content} />
          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <NoteAuthor userId={note.created_by_id} />
              <span>&middot;</span>
              <span>{formatIST(note.created_at)}</span>
              {note.updated_at !== note.created_at && (
                <>
                  <span>&middot;</span>
                  <span className="italic">{CRM_SHARED_STRINGS.noteItem.edited}</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-1">
              {/* Pencil shown only to the author. The backend also enforces an
                  edit window — a click past it surfaces the 403 via toast. */}
              {canEdit && (
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={edit.onStart}
                  aria-label={CRM_SHARED_STRINGS.noteItem.editAriaLabel}
                >
                  <Pencil />
                </Button>
              )}
              {canDelete && (
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={onDelete}
                  disabled={isDeleting}
                  aria-label={CRM_SHARED_STRINGS.noteItem.deleteAriaLabel}
                >
                  <Trash2 />
                </Button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
