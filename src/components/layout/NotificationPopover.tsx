import { useState } from 'react'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

interface Notification {
  id: string
  title: string
  description: string
  time: string
  read: boolean
}

const MOCK_NOTIFICATIONS: Notification[] = [
  { id: '1', title: 'New PO #1234 approved', description: 'Purchase order for Server Rack has been approved by Finance.', time: '2 min ago', read: false },
  { id: '2', title: 'QC Failed - Device #5678', description: 'Device failed quality check. Rework required.', time: '15 min ago', read: false },
  { id: '3', title: 'Lead "Acme Corp" moved to Won', description: 'Deal closed at $45,000. Invoice pending.', time: '1 hour ago', read: false },
  { id: '4', title: 'Low stock alert: SSD 1TB', description: 'Stock level below threshold (5 units remaining).', time: '3 hours ago', read: true },
  { id: '5', title: 'Rental contract expiring', description: 'Contract #RC-2024-089 expires in 3 days.', time: '5 hours ago', read: true },
]

export function NotificationPopover() {
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const unreadCount = MOCK_NOTIFICATIONS.filter((n) => !n.read).length
  const filtered = filter === 'unread' ? MOCK_NOTIFICATIONS.filter((n) => !n.read) : MOCK_NOTIFICATIONS

  return (
    <Popover>
      <PopoverTrigger
        render={<Button variant="ghost" size="icon" className="h-9 w-9 relative" />}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <Badge className="absolute -top-0.5 -right-0.5 h-4 w-4 p-0 flex items-center justify-center text-[10px] bg-destructive text-destructive-foreground">
            {unreadCount}
          </Badge>
        )}
        <span className="sr-only">Notifications</span>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between p-3 border-b border-border">
          <h4 className="font-semibold text-sm font-sans">Notifications</h4>
          <div className="flex gap-1">
            <Button variant={filter === 'all' ? 'secondary' : 'ghost'} size="sm" className="h-7 text-xs" onClick={() => setFilter('all')}>All</Button>
            <Button variant={filter === 'unread' ? 'secondary' : 'ghost'} size="sm" className="h-7 text-xs" onClick={() => setFilter('unread')}>Unread</Button>
          </div>
        </div>
        <ScrollArea className="h-80">
          {filtered.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-8">No notifications</p>
          ) : (
            filtered.map((notification) => (
              <div key={notification.id} className={cn('flex gap-3 p-3 border-b border-border/50 hover:bg-accent/50 cursor-pointer transition-colors', !notification.read && 'bg-primary/5')}>
                {!notification.read && <div className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />}
                <div className={cn('flex-1 min-w-0', notification.read && 'ml-5')}>
                  <p className="text-sm font-medium truncate">{notification.title}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">{notification.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">{notification.time}</p>
                </div>
              </div>
            ))
          )}
        </ScrollArea>
        <div className="p-2 border-t border-border">
          <Button variant="ghost" size="sm" className="w-full text-xs text-primary">View All Notifications</Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
