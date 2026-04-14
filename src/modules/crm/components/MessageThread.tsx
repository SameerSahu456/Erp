import { useState, useRef, useEffect } from 'react'
import { Send } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { MaterialInquiryMessage } from '../types'

interface MessageThreadProps {
  messages: MaterialInquiryMessage[]
  onSendMessage?: (content: string) => void
  currentUser?: string
  currentRole?: 'sales' | 'procurement' | 'product_manager'
  className?: string
}

const ROLE_CONFIG = {
  sales: {
    label: 'Sales',
    avatarClass: 'bg-primary text-primary-foreground',
    badgeVariant: 'default' as const,
  },
  procurement: {
    label: 'Procurement',
    avatarClass: 'bg-green-600 text-white',
    badgeVariant: 'secondary' as const,
  },
  product_manager: {
    label: 'Product Manager',
    avatarClass: 'bg-amber-500 text-white',
    badgeVariant: 'outline' as const,
  },
} as const

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function formatTimestamp(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function highlightMentions(content: string): React.ReactNode {
  const parts = content.split(/(@\w[\w\s]*?\w(?=\s|,|$|\.|\u2014))/g)
  return parts.map((part, i) => {
    if (part.startsWith('@')) {
      return (
        <span key={i} className="font-medium text-primary">
          {part}
        </span>
      )
    }
    return part
  })
}

function MessageThread({
  messages,
  onSendMessage,
  currentUser = 'Amit Patel',
  currentRole = 'sales',
  className,
}: MessageThreadProps) {
  const [newMessage, setNewMessage] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages.length])

  function handleSend() {
    const trimmed = newMessage.trim()
    if (!trimmed || !onSendMessage) return
    onSendMessage(trimmed)
    setNewMessage('')
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className={cn('flex flex-col', className)}>
      {/* Messages */}
      <div ref={scrollRef} className="max-h-[600px] space-y-4 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <p className="text-sm text-muted-foreground">
              No messages yet. Start the conversation.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const config = ROLE_CONFIG[msg.role]
            return (
              <div key={msg.id} className="flex gap-3">
                {/* Avatar */}
                <div
                  className={cn(
                    'flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                    config.avatarClass
                  )}
                >
                  {getInitials(msg.user)}
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold">{msg.user}</span>
                    <Badge variant={config.badgeVariant} className="text-[10px] px-1.5 py-0">
                      {config.label}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatTimestamp(msg.createdAt)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm leading-relaxed">
                    {highlightMentions(msg.content)}
                  </p>
                  {msg.attachmentNote && (
                    <p className="mt-1 text-xs italic text-muted-foreground">
                      {msg.attachmentNote}
                    </p>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Send Message Form */}
      {onSendMessage && (
        <div className="mt-4 space-y-2 border-t pt-4">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                'flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold',
                ROLE_CONFIG[currentRole].avatarClass
              )}
            >
              {getInitials(currentUser)}
            </div>
            <span className="text-xs font-medium">{currentUser}</span>
            <Badge
              variant={ROLE_CONFIG[currentRole].badgeVariant}
              className="text-[10px] px-1.5 py-0"
            >
              {ROLE_CONFIG[currentRole].label}
            </Badge>
          </div>
          <div className="flex gap-2">
            <Textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message... (Ctrl+Enter to send)"
              rows={2}
              className="min-h-[60px] flex-1 resize-none"
            />
            <Button
              size="sm"
              onClick={handleSend}
              disabled={!newMessage.trim()}
              className="self-end"
            >
              <Send className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export { MessageThread }
export type { MessageThreadProps }
