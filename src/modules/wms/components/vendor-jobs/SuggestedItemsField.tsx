import { useState } from 'react'
import { Plus, X } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Typography } from '@/components/ui/typography'

import { SERVICE_SECTIONS_STRINGS as S } from './service-sections.strings'

const D = S.dialog
// Past this many items the list scrolls inside a fixed height.
const MAX_UNSCROLLED_ITEMS = 5

/** Suggested-items editor: add/remove items; scrolls past five so the modal stays bounded. */
export function SuggestedItemsField({
  value,
  onChange,
}: {
  value: string[]
  onChange: (next: string[]) => void
}) {
  const [draft, setDraft] = useState('')
  const add = () => {
    const trimmed = draft.trim()
    if (trimmed && !value.includes(trimmed)) onChange([...value, trimmed])
    setDraft('')
  }
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Input
          id="item_suggestions"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={D.itemsPlaceholder}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add()
            }
          }}
        />
        <Button
          type="button"
          variant="outline"
          className="shrink-0"
          disabled={!draft.trim()}
          onClick={add}
        >
          <Plus className="size-4" data-icon="inline-start" />
          {D.itemsAdd}
        </Button>
      </div>
      {value.length > 0 ? (
        <>
          <Typography variant="caption" tone="muted">
            {D.itemsCount(value.length)}
          </Typography>
          {/* One contained list with hairline dividers; the scroll region lives
              INSIDE the rounded border so past five items it scrolls cleanly
              without the modal growing. */}
          <div className="overflow-hidden rounded-lg border border-border">
            <ul
              className={cn(
                'divide-y divide-border',
                value.length > MAX_UNSCROLLED_ITEMS && 'max-h-52 overflow-y-auto',
              )}
            >
              {value.map((item, index) => (
                <li
                  key={`${item}-${index}`}
                  className="group flex items-center justify-between gap-2 px-3 py-2 transition-colors hover:bg-muted/40"
                >
                  <Typography variant="body" className="min-w-0 truncate">
                    {item}
                  </Typography>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="shrink-0 text-muted-foreground opacity-70 transition hover:text-destructive hover:opacity-100"
                    aria-label={D.itemsRemove(item)}
                    onClick={() => onChange(value.filter((_, i) => i !== index))}
                  >
                    <X className="size-4" />
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        </>
      ) : null}
    </div>
  )
}
