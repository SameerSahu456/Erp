import { CellTooltip } from "./CellTooltip"

// Comma-joined {id, name} refs for a table cell (e.g. "Approved by"). Renders an
// em-dash when there is nobody to show; a ref whose name can't be resolved is
// skipped rather than printed as "null".
export function UserNamesCell({
  users,
}: {
  users: readonly { id: string; name: string | null }[] | null | undefined
}) {
  const names = (users ?? []).map((u) => u.name).filter((n): n is string => !!n)
  if (names.length === 0) return <span className="block truncate text-muted-foreground">—</span>
  const label = names.join(", ")
  return (
    <CellTooltip text={label} className="truncate">
      {label}
    </CellTooltip>
  )
}
