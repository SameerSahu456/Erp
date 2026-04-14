import { cn } from "@/lib/utils"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  AvatarGroup as AvatarGroupWrapper,
  AvatarGroupCount,
} from "@/components/ui/avatar"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface AvatarGroupUser {
  name: string
  avatar?: string
}

interface AvatarGroupProps {
  users: AvatarGroupUser[]
  max?: number
  className?: string
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

function AvatarGroupComponent({ users, max = 4, className }: AvatarGroupProps) {
  const visible = users.slice(0, max)
  const overflow = users.slice(max)

  return (
    <TooltipProvider>
      <AvatarGroupWrapper className={cn(className)}>
        {visible.map((user, index) => (
          <Tooltip key={index}>
            <TooltipTrigger
              render={
                <Avatar>
                  {user.avatar ? (
                    <AvatarImage src={user.avatar} alt={user.name} />
                  ) : null}
                  <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                </Avatar>
              }
            />
            <TooltipContent>{user.name}</TooltipContent>
          </Tooltip>
        ))}
        {overflow.length > 0 && (
          <Tooltip>
            <TooltipTrigger
              render={
                <AvatarGroupCount>+{overflow.length}</AvatarGroupCount>
              }
            />
            <TooltipContent>
              {overflow.map((user) => user.name).join(", ")}
            </TooltipContent>
          </Tooltip>
        )}
      </AvatarGroupWrapper>
    </TooltipProvider>
  )
}

export {
  AvatarGroupComponent as AvatarGroup,
  type AvatarGroupProps,
  type AvatarGroupUser,
}
