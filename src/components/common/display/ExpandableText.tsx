import * as React from 'react'

import { cn } from '@/lib/utils'
import { Typography } from '@/components/ui/typography'
import { UI } from '@/shared/constants'

export interface ExpandableTextProps {
  /** The full text to render. */
  text: string
  /** How many (displayed) characters to reveal per step. Defaults to the shared
   *  `UI.TEXT_REVEAL_CHUNK_SIZE` — the first `chunkSize` chars show immediately;
   *  in `chunk` mode each "Show more" click reveals another `chunkSize`. */
  chunkSize?: number
  /** What a "Show more" click reveals:
   *  - `chunk` (default): the next `chunkSize` characters.
   *  - `all`: the entire remaining text at once. */
  expandMode?: 'chunk' | 'all'
  /** Class applied to the wrapper element (around text + toggle). */
  className?: string
  /** Custom renderer for the currently-visible slice. Default renders a plain
   *  wrapping `<p>`. Pass this to render mentions, markdown, etc. */
  renderContent?: (visibleText: string) => React.ReactNode
  /** Measure the *displayed* length of the full text. Override when the raw
   *  string differs from what the user sees (e.g. mention tokens). Default:
   *  raw string length. */
  measureLength?: (text: string) => number
  /** Return the raw substring whose displayed length is `≤ displayLimit`,
   *  without splitting an atomic token. Override alongside `measureLength`.
   *  Default: `text.slice(0, displayLimit)`. */
  sliceTo?: (text: string, displayLimit: number) => string
  /** Toggle label shown when more text is hidden. */
  showMoreLabel?: string
  /** Toggle label shown when everything is revealed (collapses back). */
  showLessLabel?: string
}

const defaultRenderContent = (visibleText: string) => (
  <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">{visibleText}</p>
)

const defaultMeasureLength = (text: string) => text.length
const defaultSliceTo = (text: string, displayLimit: number) => text.slice(0, displayLimit)

/**
 * Progressive-reveal text. Shows the first `chunkSize` characters and a
 * "Show more" toggle. In `chunk` mode each click reveals another `chunkSize`;
 * in `all` mode a single click reveals everything. Once everything is visible
 * the toggle becomes "Show less" and collapses back to one chunk.
 *
 * Reusable across modules — for plain text just pass `text`; for specialised
 * rendering (mentions, etc.) pass `renderContent` + `measureLength` + `sliceTo`
 * so the character budget is counted against what the user actually sees.
 */
export function ExpandableText({
  text,
  chunkSize = UI.TEXT_REVEAL_CHUNK_SIZE,
  expandMode = 'chunk',
  className,
  renderContent = defaultRenderContent,
  measureLength = defaultMeasureLength,
  sliceTo = defaultSliceTo,
  showMoreLabel = 'Show more',
  showLessLabel = 'Show less',
}: ExpandableTextProps) {
  const [limit, setLimit] = React.useState(chunkSize)

  // Reset the reveal when the underlying text (or chunk size) changes — e.g. an
  // inline edit — so a freshly-edited note doesn't stay stuck expanded. Done by
  // adjusting state during render (React's recommended pattern) rather than in
  // an effect, which avoids an extra paint of the stale reveal.
  const [prev, setPrev] = React.useState({ text, chunkSize })
  if (prev.text !== text || prev.chunkSize !== chunkSize) {
    setPrev({ text, chunkSize })
    setLimit(chunkSize)
  }

  const fullLength = React.useMemo(() => measureLength(text), [measureLength, text])

  // Short enough to show in full — no toggle, no slicing.
  if (fullLength <= chunkSize) {
    return <div className={className}>{renderContent(text)}</div>
  }

  const hasMore = limit < fullLength
  const isExpanded = limit > chunkSize
  const visible = hasMore ? sliceTo(text, limit) : text

  const handleToggle = () => {
    setLimit((current) => {
      // Already fully revealed → collapse back to the first chunk.
      if (current >= fullLength) return chunkSize
      // Expanding: `all` jumps straight to the end; `chunk` steps by one chunk.
      return expandMode === 'all' ? fullLength : current + chunkSize
    })
  }

  return (
    <div className={className}>
      {renderContent(hasMore ? `${visible}…` : visible)}
      {(hasMore || isExpanded) && (
        <button
          type="button"
          onClick={handleToggle}
          className={cn(
            'mt-1 inline-flex text-primary transition-colors hover:underline',
            'focus-visible:underline focus-visible:outline-none',
          )}
        >
          <Typography variant="caption" tone="inherit">
            {hasMore ? showMoreLabel : showLessLabel}
          </Typography>
        </button>
      )}
    </div>
  )
}
