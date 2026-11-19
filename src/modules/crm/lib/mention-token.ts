// Mention token format used by the CRM notes API. Mirrors the backend
// regex at `comprint-erp-backend/app/modules/crm/utils/mentions.py:17`:
//
//     @\[([^\]]+)\]\(([0-9a-f-]{36})\)
//
// Bare `@<uuid>` does NOT match — the backend extractor needs the
// `@[Display Name](uuid)` token shape, otherwise the recipient won't
// receive a mention notification.

export const MENTION_TOKEN_RE = /@\[([^\]]+)\]\(([0-9a-f-]{36})\)/g

export function buildMentionToken(displayName: string, userId: string): string {
  // Strip `]` from the display name to keep the token regex unambiguous.
  // The backend captures `[^\]]+` so a bracket inside the name would
  // truncate the token mid-string.
  const safeName = displayName.replace(/\]/g, '')
  return `@[${safeName}](${userId})`
}

// A mention token `@[Name](uuid)` renders to the user as `@Name`, so the raw
// string is longer than what's on screen. `ExpandableText`'s character budget
// must count *displayed* characters, and a truncation cut must never land
// inside a token (that would leak raw `@[Nam…` syntax). The two helpers below
// give it a mention-aware length and slice.

interface MentionPiece {
  raw: string
  /** Displayed length: a token counts as `@Name`, plain text counts verbatim. */
  display: number
  /** Atomic pieces (tokens) may not be split by a truncation cut. */
  atomic: boolean
}

function splitMentionPieces(content: string): MentionPiece[] {
  const pieces: MentionPiece[] = []
  const re = new RegExp(MENTION_TOKEN_RE.source, 'g')
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(content))) {
    if (m.index > last) {
      const raw = content.slice(last, m.index)
      pieces.push({ raw, display: raw.length, atomic: false })
    }
    // Rendered form is `@` + the display name (see MentionContent).
    pieces.push({ raw: m[0], display: 1 + m[1].length, atomic: true })
    last = m.index + m[0].length
  }
  if (last < content.length) {
    const raw = content.slice(last)
    pieces.push({ raw, display: raw.length, atomic: false })
  }
  return pieces
}

/** Displayed length of mention content (tokens counted as `@Name`). */
export function mentionDisplayLength(content: string): number {
  return splitMentionPieces(content).reduce((sum, p) => sum + p.display, 0)
}

/**
 * Return the raw substring of `content` whose *displayed* length is
 * `≤ displayLimit`, never splitting a mention token. Feed the result to
 * `MentionContent` so partial tokens never render as raw syntax.
 */
export function sliceMentionByDisplay(content: string, displayLimit: number): string {
  let used = 0
  let out = ''
  for (const piece of splitMentionPieces(content)) {
    if (used + piece.display <= displayLimit) {
      out += piece.raw
      used += piece.display
      continue
    }
    // Overshoot: keep an atomic token whole only if it still fits, otherwise
    // stop before it; for plain text, cut at the exact remaining budget.
    if (!piece.atomic) out += piece.raw.slice(0, displayLimit - used)
    break
  }
  return out
}
