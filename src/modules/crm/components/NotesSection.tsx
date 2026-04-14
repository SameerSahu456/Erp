import { useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { mockNotes } from '../data/notes'
import type { Note } from '../types'

function formatNoteDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

interface NotesSectionProps {
  entityType: 'lead' | 'deal' | 'account' | 'contact'
  entityId: string
  className?: string
}

function NotesSection({ entityType, entityId, className }: NotesSectionProps) {
  const [notes, setNotes] = useState<Note[]>(mockNotes)
  const [newContent, setNewContent] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')

  const filtered = notes
    .filter((n) => n.entityType === entityType && n.entityId === entityId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  function handleAddNote() {
    if (!newContent.trim()) return

    const newNote: Note = {
      id: `NOTE-${Date.now()}`,
      content: newContent.trim(),
      user: 'Amar Daxini',
      createdAt: new Date().toISOString(),
      entityType,
      entityId,
    }

    setNotes((prev) => [newNote, ...prev])
    setNewContent('')
  }

  function handleDelete(noteId: string) {
    setNotes((prev) => prev.filter((n) => n.id !== noteId))
  }

  function handleStartEdit(note: Note) {
    setEditingId(note.id)
    setEditContent(note.content)
  }

  function handleSaveEdit(noteId: string) {
    if (!editContent.trim()) return

    setNotes((prev) =>
      prev.map((n) =>
        n.id === noteId
          ? { ...n, content: editContent.trim(), updatedAt: new Date().toISOString() }
          : n
      )
    )
    setEditingId(null)
    setEditContent('')
  }

  function handleCancelEdit() {
    setEditingId(null)
    setEditContent('')
  }

  return (
    <div className={cn('space-y-4', className)}>
      <h3 className="text-sm font-ui font-medium text-muted-foreground uppercase tracking-wide">
        Notes
      </h3>

      {/* Add note form */}
      <div className="space-y-2">
        <Textarea
          placeholder="Write a note..."
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
          rows={3}
        />
        <div className="flex justify-end">
          <Button onClick={handleAddNote} disabled={!newContent.trim()} size="sm">
            Add Note
          </Button>
        </div>
      </div>

      {/* Notes list */}
      {filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map((note) => (
            <div
              key={note.id}
              className="rounded-lg border bg-card p-4"
            >
              {editingId === note.id ? (
                <div className="space-y-2">
                  <Textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={3}
                  />
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={handleCancelEdit}>
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleSaveEdit(note.id)}
                      disabled={!editContent.trim()}
                    >
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{note.user}</span>
                      <span>&middot;</span>
                      <span>{formatNoteDate(note.createdAt)}</span>
                      {note.updatedAt && (
                        <>
                          <span>&middot;</span>
                          <span className="italic">edited</span>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => handleStartEdit(note)}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => handleDelete(note.id)}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">No notes yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Add a note to keep track of important details.
          </p>
        </div>
      )}
    </div>
  )
}

export { NotesSection, type NotesSectionProps }
