import { Bug } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'
import { ROLE_HIERARCHY } from '@/constants/roles'

export function DevRoleSwitcher() {
  const { user, switchUser, allUsers } = useAuth()

  if (import.meta.env.PROD) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon" className="h-9 w-9 text-orange-500" />}
      >
        <Bug className="h-4 w-4" />
        <span className="sr-only">Switch role (dev)</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="text-orange-500">
          Dev: Switch User / Role
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {allUsers.map((u) => (
          <DropdownMenuItem
            key={u.id}
            onClick={() => switchUser(u.id)}
            className={cn(user.id === u.id && 'bg-accent')}
          >
            <div className="flex-1">
              <p className="text-sm font-medium">{u.name}</p>
              <p className="text-xs text-muted-foreground">
                {ROLE_HIERARCHY[u.role]?.label ?? u.role}
              </p>
            </div>
            {user.id === u.id && <span className="text-primary">&#10003;</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
