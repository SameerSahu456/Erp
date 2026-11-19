import { ExpandableText } from '@/components/common/display/ExpandableText'

import { MentionContent } from './MentionInput'
import { mentionDisplayLength, sliceMentionByDisplay } from '../../lib/mention-token'

interface ExpandableMentionTextProps {
  /** Raw note/comment content (may contain `@[Name](uuid)` mention tokens). */
  content: string
  /** Characters shown before the "Show more" toggle appears. Defaults to the
   *  shared `UI.TEXT_REVEAL_CHUNK_SIZE`. */
  chunkSize?: number
  /** What "Show more" reveals. Notes & comments default to `all` (one click
   *  reveals the full text); pass `chunk` for stepped 500-at-a-time reveal. */
  expandMode?: 'chunk' | 'all'
  className?: string
}

/**
 * Mention-aware progressive-reveal text for notes & comments. Wraps the generic
 * `ExpandableText` with a mention renderer and a display-length budget so the
 * cut counts what the user sees (`@Name`, not the raw `@[Name](uuid)` token)
 * and never splits a token mid-string. Defaults to `all` mode — one "Show more"
 * click reveals the entire note/comment.
 */
export function ExpandableMentionText({
  content,
  chunkSize,
  expandMode = 'all',
  className,
}: ExpandableMentionTextProps) {
  return (
    <ExpandableText
      text={content}
      chunkSize={chunkSize}
      expandMode={expandMode}
      className={className}
      measureLength={mentionDisplayLength}
      sliceTo={sliceMentionByDisplay}
      renderContent={(visible) => <MentionContent content={visible} />}
    />
  )
}
