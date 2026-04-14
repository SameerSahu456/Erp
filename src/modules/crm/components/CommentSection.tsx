import { useState, useRef, useCallback } from 'react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { mockComments } from '../data/comments'
import type { Comment } from '../types'
import { MOCK_USERS } from '../types'

function formatCommentDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function renderContentWithMentions(content: string): React.ReactNode {
  // Split on @mentions pattern
  const parts = content.split(/(@\w+(?:\s\w+)?)/g)
  return parts.map((part, index) => {
    if (part.startsWith('@')) {
      return (
        <span key={index} className="font-medium text-primary">
          {part}
        </span>
      )
    }
    return part
  })
}

function extractMentions(content: string): string[] {
  const mentionRegex = /@(\w+(?:\s\w+)?)/g
  const mentions: string[] = []
  let match: RegExpExecArray | null = mentionRegex.exec(content)
  while (match !== null) {
    if (match[1]) mentions.push(match[1])
    match = mentionRegex.exec(content)
  }
  return mentions
}

interface CommentSectionProps {
  entityType: Comment['entityType']
  entityId: string
  className?: string
}

function CommentSection({ entityType, entityId, className }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>(mockComments)
  const [newContent, setNewContent] = useState('')
  const [showMentionDropdown, setShowMentionDropdown] = useState(false)
  const [mentionFilter, setMentionFilter] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const filtered = comments
    .filter((c) => c.entityType === entityType && c.entityId === entityId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const filteredUsers = MOCK_USERS.filter((user) =>
    user.toLowerCase().includes(mentionFilter.toLowerCase())
  )

  const handleContentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setNewContent(value)

    // Check if user just typed @
    const cursorPos = e.target.selectionStart
    const textBeforeCursor = value.slice(0, cursorPos)
    const atIndex = textBeforeCursor.lastIndexOf('@')

    if (atIndex !== -1 && (atIndex === 0 || textBeforeCursor[atIndex - 1] === ' ')) {
      const searchText = textBeforeCursor.slice(atIndex + 1)
      if (!searchText.includes(' ') || searchText.split(' ').length <= 2) {
        setMentionFilter(searchText)
        setShowMentionDropdown(true)
        return
      }
    }

    setShowMentionDropdown(false)
  }, [])

  function handleSelectMention(user: string) {
    const textarea = textareaRef.current
    if (!textarea) return

    const cursorPos = textarea.selectionStart
    const textBeforeCursor = newContent.slice(0, cursorPos)
    const atIndex = textBeforeCursor.lastIndexOf('@')
    const textAfterCursor = newContent.slice(cursorPos)

    const newValue = textBeforeCursor.slice(0, atIndex) + '@' + user + ' ' + textAfterCursor
    setNewContent(newValue)
    setShowMentionDropdown(false)

    // Focus textarea after selection
    setTimeout(() => {
      textarea.focus()
      const newPos = atIndex + user.length + 2
      textarea.setSelectionRange(newPos, newPos)
    }, 0)
  }

  function handleAddComment() {
    if (!newContent.trim()) return

    const newComment: Comment = {
      id: `CMT-${Date.now()}`,
      content: newContent.trim(),
      user: 'Amar Daxini',
      mentions: extractMentions(newContent),
      entityType,
      entityId,
      createdAt: new Date().toISOString(),
    }

    setComments((prev) => [newComment, ...prev])
    setNewContent('')
    setShowMentionDropdown(false)
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Add comment form */}
      <div className="space-y-2">
        <div className="relative">
          <Textarea
            ref={textareaRef}
            placeholder="Write a comment... Use @ to mention someone"
            value={newContent}
            onChange={handleContentChange}
            rows={3}
          />
          {showMentionDropdown && filteredUsers.length > 0 && (
            <div className="absolute bottom-full left-0 z-50 mb-1 w-56 rounded-md border bg-popover p-1 shadow-md">
              {filteredUsers.map((user) => (
                <button
                  key={user}
                  type="button"
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                  onMouseDown={(e) => {
                    e.preventDefault()
                    handleSelectMention(user)
                  }}
                >
                  <div className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-medium text-primary">
                    {getInitials(user)}
                  </div>
                  {user}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex justify-end">
          <Button onClick={handleAddComment} disabled={!newContent.trim()} size="sm">
            Add Comment
          </Button>
        </div>
      </div>

      {/* Comments list */}
      {filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map((comment) => (
            <div key={comment.id} className="rounded-lg border bg-card p-4">
              <div className="flex items-start gap-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                  {getInitials(comment.user)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{comment.user}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatCommentDate(comment.createdAt)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm whitespace-pre-wrap">
                    {renderContentWithMentions(comment.content)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">No comments yet. Start a conversation.</p>
        </div>
      )}
    </div>
  )
}

export { CommentSection, type CommentSectionProps }
