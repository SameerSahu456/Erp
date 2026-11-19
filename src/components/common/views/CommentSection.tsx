import { useEffect, useMemo, useRef, useState } from 'react'
import { Send, Trash2 } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Typography } from '@/components/ui/typography'
import { TablePagination } from '@/components/common/tables/TablePagination'
import { UnsavedChangesDialog } from '@/components/common/dialogs/UnsavedChangesDialog'
import { useUnsavedChangesGuard } from '@/hooks/use-unsaved-changes-guard'
import { PAGINATION } from '@/shared/constants'
import { useAuth } from '@shared/auth/use-auth'
import { usePermission } from '@shared/rbac'
import { useUser, getUserDisplayName } from '@modules/users'
import { formatIST } from '@shared/lib/date'
import { useScrollToHashTarget } from '@shared/notifications/use-scroll-to-hash-target'
import { LoadErrorState } from '@/shared/components/feedback/LoadErrorState'

import { crmCan } from '@modules/crm/permissions'
import { MentionInput } from '@modules/crm/components/shared/MentionInput'
import { ExpandableMentionText } from '@modules/crm/components/shared/ExpandableMentionText'

import { COMMENT_SECTION_STRINGS as S } from './comment-section.strings'

import {
  useCreateComment,
  useDeleteComment,
  useEntityComments,
} from '@modules/crm/hooks/shared/useComments'
import type { CommentEntityType, CrmCommentWire } from '@modules/crm/api'

interface CommentSectionProps {
  entityType: CommentEntityType
  entityId: string
  className?: string
  /** Placeholder for the add-comment input. Defaults to the comment-style
   *  prompt; pass a custom one where this section is surfaced under a
   *  different label (e.g. a "Messages" tab). */
  placeholder?: string
  /** Singular/plural noun for the user-facing copy — header, empty state,
   *  loading/error text and the add button. Defaults to "comment"/"comments";
   *  pass {singular:'message', plural:'messages'} for a "Messages" tab. */
  noun?: { singular: string; plural: string }
  /**
   * Layout variant.
   * - 'comments' (default) — section header, composer on top, newest-first
   *   list below. Used on Lead / Deal / Account / Vendor / Rental detail pages.
   * - 'chat' — no header, oldest-first scrollable thread with the composer
   *   pinned at the bottom (messaging-app style). Used by the Material
   *   Inquiry "Messages" tab.
   */
  variant?: 'comments' | 'chat'
}

// "Ajay Jaiswar" → "AJ", "Madonna" → "MA", "" → "?".
function getInitials(name: string | null | undefined): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return ((parts[0]![0] ?? '') + (parts[parts.length - 1]![0] ?? '')).toUpperCase()
}

// Monochrome avatar — matches the topbar `UserMenu` and sidebar logo
// so every initials bubble in the app reads the same. We deliberately
// don't hash to a color palette: the rest of the UI is black/white and
// rainbow chips would clash.
const AVATAR_CLASS = 'bg-primary text-primary-foreground'

function formatCommentDate(iso: string): string {
  // Date + time (IST) so the listing shows when each comment was posted.
  return formatIST(iso)
}

function CommentSection({
  entityType,
  entityId,
  className,
  placeholder = 'Write a comment… type @ to mention a user',
  noun = { singular: 'comment', plural: 'comments' },
  variant = 'comments',
}: CommentSectionProps) {
  const { user: currentUser } = useAuth()
  const isChat = variant === 'chat'
  // Comment write (post / delete) is gated on `crm:manage` server-side for
  // every entity type (see crmCan.writeComment). Hide the composer + delete
  // affordances when the user lacks it so they can't trigger a 403. `can()`
  // grants superusers via the Layer-2 bypass.
  const { can } = usePermission()
  const canWriteComment = can(crmCan.writeComment)

  // Numbered pagination (Coding-guideline §16.7) — both the default
  // 'comments' layout and the MI 'chat' layout page through the API one page
  // at a time with the shared `TablePagination` footer. `page` resets to 1
  // on post so the newest comment (list is newest-first) is visible.
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(PAGINATION.DEFAULT_PAGE_SIZE)

  const { data, isLoading, isError, error, isFetching } = useEntityComments(
    entityType,
    entityId,
    { page, pageSize },
  )

  const createMut = useCreateComment(entityType, entityId)
  const deleteMut = useDeleteComment(entityType, entityId)

  const [newContent, setNewContent] = useState('')

  // Backend returns newest-first; re-sort defensively. Recomputed only when
  // the current page's items change.
  const comments = useMemo<CrmCommentWire[]>(() => {
    const all = data?.items ?? []
    return all.slice().sort((a, b) => b.created_at.localeCompare(a.created_at))
  }, [data?.items])
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  // The chat layout renders oldest-first within the page so the newest
  // message of the page sits just above the composer, like a messaging
  // thread; older pages are reachable through the footer.
  const displayed = useMemo(
    () => (isChat ? comments.slice().reverse() : comments),
    [comments, isChat],
  )

  // Notification deep-link: when the URL hash matches a comment row
  // (e.g. `#comment-<uuid>`), scroll it into view and flash a ring. Under
  // numbered pagination the hook page-walks to the page holding the row.
  // No-op if the hash doesn't start with `comment-`, so it's safe to call
  // regardless of which entity's tab is open.
  useScrollToHashTarget({
    ready: comments.length,
    expectedPrefix: 'comment',
    isFetching,
    paginated: { page, totalPages, setPage },
  })

  // Chat layout keeps the thread pinned to the newest message once the
  // initial fetch resolves. Keyed only on isChat/isLoading so loading older
  // history (pagination) never yanks the scroll position.
  const scrollRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    if (!isChat || isLoading) return
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [isChat, isLoading])

  function handleAddComment() {
    const content = newContent.trim()
    if (!content) return
    createMut.mutate(
      { content },
      {
        onSuccess: () => {
          setNewContent('')
          // Newest-first → jump to page 1 so the just-posted row is on the
          // visible page even if the user had paged back.
          setPage(1)
          if (isChat) {
            // Let React paint the new row before pinning to the bottom.
            requestAnimationFrame(() => {
              const el = scrollRef.current
              if (el) el.scrollTop = el.scrollHeight
            })
          }
        },
      },
    )
  }

  function handleDelete(commentId: string) {
    deleteMut.mutate(commentId)
  }

  // Dirty whenever the user has typed something into the composer.
  // Guards refresh / sidebar nav / browser back / DetailTabs switch so the
  // text isn't dropped silently.
  const isDirty = newContent.trim() !== ''
  const guard = useUnsavedChangesGuard({
    isDirty,
    onDiscard: () => setNewContent(''),
  })

  // Capitalized noun forms for the header and the add button.
  const pluralLabel =
    noun.plural.charAt(0).toUpperCase() + noun.plural.slice(1)
  const singularLabel =
    noun.singular.charAt(0).toUpperCase() + noun.singular.slice(1)

  // ── Shared list pieces — reused by both layouts ───────────────────
  const rows = displayed.map((comment) => {
    const isAuthor =
      !!currentUser?.id && currentUser.id === comment.created_by_id
    // Delete also needs `crm:manage` — author alone would show a button that
    // 403s for a read-only viewer.
    const canDelete =
      (isAuthor || !!currentUser?.is_superuser) && canWriteComment
    const isDeleting =
      deleteMut.isPending && deleteMut.variables === comment.id
    return (
      <CommentRow
        key={comment.id}
        comment={comment}
        canDelete={canDelete}
        isDeleting={isDeleting}
        onDelete={() => handleDelete(comment.id)}
        chat={isChat}
      />
    )
  })

  // Numbered pagination footer — shared with the CRM list pages
  // (Prev/Next + page-size selector). Shown for both layouts once there's
  // at least one comment.
  const footer =
    total > 0 ? (
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
    ) : null

  const loadingState = (
    <Typography
      variant="body"
      tone="muted"
      align="center"
      className="rounded-lg border border-dashed p-8"
      asChild
    >
      <div>{S.loading(noun.plural)}</div>
    </Typography>
  )

  const errorState = (
    <LoadErrorState error={error} fallback={S.error(noun.plural)} />
  )

  const emptyState = (
    <div className="rounded-lg border border-dashed p-8 text-center">
      <Typography variant="body" tone="muted">{S.empty.noItems(noun.plural)}</Typography>
      <Typography variant="helper" className="mt-1" asChild>
        <p>{S.empty.startConversation}</p>
      </Typography>
    </div>
  )

  // ── Chat layout — thread on top, composer pinned at the bottom ─────
  if (isChat) {
    const currentName = currentUser ? getUserDisplayName(currentUser) : 'You'
    return (
      <div className={cn('flex flex-col', className)}>
        {/* Thread — scrollable, oldest → newest top to bottom. */}
        <div
          ref={scrollRef}
          className="max-h-[600px] space-y-4 overflow-y-auto"
        >
          {isLoading ? (
            loadingState
          ) : isError ? (
            errorState
          ) : displayed.length > 0 ? (
            <>{rows}</>
          ) : (
            emptyState
          )}
        </div>
        {footer}

        {/* Composer — pinned below the thread (erp-demo Messages style).
            `@` triggers a user picker; selected users become canonical
            mention tokens the backend's regex extracts. Hidden without
            `crm:manage` (the POST gate). */}
        {canWriteComment && (
          <div className="mt-4 space-y-2 border-t pt-4">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold select-none',
                  AVATAR_CLASS,
                )}
                aria-hidden="true"
              >
                {getInitials(currentName)}
              </div>
              <span className="text-xs font-medium">{currentName}</span>
            </div>
            <div className="flex items-end gap-2">
              <MentionInput
                className="min-w-0 flex-1"
                placeholder={placeholder}
                value={newContent}
                onChange={setNewContent}
                onSubmit={handleAddComment}
                rows={2}
                disabled={createMut.isPending}
              />
              <Button
                size="sm"
                onClick={handleAddComment}
                disabled={!newContent.trim() || createMut.isPending}
                className="h-9 self-end"
                aria-label={S.sendAriaLabel(noun.singular)}
              >
                <Send className="size-4" />
              </Button>
            </div>
            <Typography variant="caption">
              {S.mentionHint}
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

  // ── Default 'comments' layout — header, composer on top, list below ─
  return (
    <div className={cn('space-y-4', className)}>
      <Typography
        variant="body-strong"
        tone="muted"
        className="font-ui uppercase tracking-wide"
        asChild
      >
        <h3>{pluralLabel}</h3>
      </Typography>

      {/* Add comment form — `@` triggers a user picker; selected users are
          inserted as canonical mention tokens that the backend's regex
          extracts (see MentionInput.MENTION_TOKEN_RE for the format).
          Hidden without `crm:manage` (the POST gate). */}
      {canWriteComment && (
      <div className="space-y-2">
        <MentionInput
          placeholder={placeholder}
          value={newContent}
          onChange={setNewContent}
          onSubmit={handleAddComment}
          rows={3}
          disabled={createMut.isPending}
        />
        <div className="flex items-center justify-between gap-2">
          <Typography variant="caption">
            {S.mentionHint}
          </Typography>
          <Button
            onClick={handleAddComment}
            disabled={!newContent.trim() || createMut.isPending}
            size="sm"
          >
            {createMut.isPending ? S.adding : S.addButton(singularLabel)}
          </Button>
        </div>
      </div>
      )}

      {/* List */}
      {isLoading ? (
        loadingState
      ) : isError ? (
        errorState
      ) : displayed.length > 0 ? (
        <div className="space-y-3">
          {rows}
          {footer}
        </div>
      ) : (
        emptyState
      )}

      <UnsavedChangesDialog
        open={guard.dialogOpen}
        onOpenChange={guard.onDialogOpenChange}
        onConfirm={guard.onConfirmDiscard}
      />
    </div>
  )
}

// One row = one TanStack `useUser` lookup (auto-deduped across rows
// authored by the same user). The fetched display name powers both the
// avatar initials and the meta line — keeping the lookup at row scope
// avoids passing a parent-level user map down.
function CommentRow({
  comment,
  canDelete,
  isDeleting,
  onDelete,
  chat = false,
}: {
  comment: CrmCommentWire
  canDelete: boolean
  isDeleting: boolean
  onDelete: () => void
  /** Chat layout — flat row (no bordered card), smaller avatar. */
  chat?: boolean
}) {
  const enabled = !!comment.created_by_id
  const { data: author, isLoading: authorLoading } = useUser(
    enabled ? comment.created_by_id! : '',
  )

  const displayName = author ? getUserDisplayName(author) : null
  const initials = getInitials(displayName)

  return (
    <div
      // `id` is the scroll target for notification deep links — see
      // shared/notifications/routing.ts (`#comment-<id>`).
      id={`comment-${comment.id}`}
      className={cn(
        'flex items-start gap-3 rounded-lg',
        // Comments render as bordered cards; chat messages render flat so
        // the thread reads as one continuous conversation.
        !chat && 'border bg-card p-4',
      )}
    >
      {/* Initials avatar — solid mono fill, same look as the topbar
          user-menu avatar; keeps the page's black/white theme. */}
      <div
        className={cn(
          'flex shrink-0 items-center justify-center rounded-full text-xs font-semibold select-none',
          chat ? 'size-8' : 'size-9',
          AVATAR_CLASS,
        )}
        aria-hidden="true"
        title={displayName ?? undefined}
      >
        {initials}
      </div>

      <div className="min-w-0 flex-1">
        {/* Header line: name (top), then timestamp. Mirrors the visual
            rhythm of common comment UIs (Slack/GitHub) — name first so
            readers can scan attribution before the body. */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">
              {!comment.created_by_id
                ? S.row.system
                : authorLoading
                  ? S.row.loading
                  : (displayName ?? S.row.unknownUser)}
            </span>
            <span>&middot;</span>
            <span>{formatCommentDate(comment.created_at)}</span>
          </div>
          {/* Comments are immutable — only delete is possible, and only
              for the author or a superuser. */}
          {canDelete && (
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={onDelete}
              disabled={isDeleting}
              aria-label={S.row.deleteAriaLabel}
            >
              <Trash2 />
            </Button>
          )}
        </div>

        <div className="mt-1.5">
          <ExpandableMentionText content={comment.content} />
        </div>
      </div>
    </div>
  )
}

export { CommentSection, type CommentSectionProps }
