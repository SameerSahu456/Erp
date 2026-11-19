import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Typography } from '@/components/ui/typography'

import { submitOnEnter } from './submitOnEnter'
import { CRM_SHARED_STRINGS } from './crm-shared.strings'

interface NoteComposerProps {
  value: string
  onChange: (value: string) => void
  onAdd: () => void
  isPending: boolean
}

// The "add a note" box — a plain textarea (no @-mention picker). Enter posts
// the note; Shift+Enter inserts a newline. The empty-content guard lives in
// the parent's onAdd handler.
export function NoteComposer({ value, onChange, onAdd, isPending }: NoteComposerProps) {
  return (
    <div className="space-y-2">
      <Textarea
        placeholder={CRM_SHARED_STRINGS.noteComposer.placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={submitOnEnter(onAdd)}
        rows={3}
        disabled={isPending}
      />
      <div className="flex items-center justify-between gap-2">
        <Typography variant="caption">{CRM_SHARED_STRINGS.noteComposer.keyboardHint}</Typography>
        <Button onClick={onAdd} disabled={!value.trim() || isPending} size="sm">
          {isPending
            ? CRM_SHARED_STRINGS.noteComposer.adding
            : CRM_SHARED_STRINGS.noteComposer.addNote}
        </Button>
      </div>
    </div>
  )
}
