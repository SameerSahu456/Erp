import { CellTooltip } from "./CellTooltip"
import { UserRoles } from "./UserRoles"

// Table cell for a person: the name, with their role(s) underneath (first role
// plus a "+N" hover for the rest). Em-dash when the name can't be resolved.
export function UserNameRoleCell({
  name,
  roles,
}: {
  name: string | null | undefined
  roles?: readonly string[] | null
}) {
  if (!name) return <span className="block truncate text-muted-foreground">—</span>
  return (
    <div className="min-w-0 space-y-0.5">
      <CellTooltip text={name} className="truncate font-medium">
        {name}
      </CellTooltip>
      <UserRoles roles={roles} />
    </div>
  )
}
