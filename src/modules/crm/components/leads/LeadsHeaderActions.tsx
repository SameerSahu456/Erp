import { LayoutGrid, List, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { PermissionGuard } from "@shared/rbac"

import { crmCan } from "../../permissions"
import { LEADS_STRINGS as S } from "./leads.strings"

interface LeadsHeaderActionsProps {
  view: "kanban" | "list"
  onViewChange: (view: "kanban" | "list") => void
  onAddLead: () => void
}

// erp-demo style: view toggle + Add button live in the header actions slot,
// not bundled into the toolbar.
export function LeadsHeaderActions({
  view,
  onViewChange,
  onAddLead,
}: LeadsHeaderActionsProps) {
  return (
    <>
      <div
        className="inline-flex items-center gap-0.5 rounded-lg border border-border bg-secondary/60 p-0.5 shadow-[0_1px_2px_rgb(var(--shadow-rgb)/0.04)]"
        role="tablist"
        aria-label={S.header.viewModeLabel}
      >
        <button
          type="button"
          onClick={() => onViewChange("kanban")}
          aria-label={S.header.kanbanLabel}
          aria-pressed={view === "kanban"}
          className={cn(
            "inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[12px] font-medium transition-all",
            view === "kanban"
              ? "bg-card text-foreground shadow-[0_1px_2px_rgb(var(--shadow-rgb)/0.06)]"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <LayoutGrid className="size-3.5" />
          {S.header.kanban}
        </button>
        <button
          type="button"
          onClick={() => onViewChange("list")}
          aria-label={S.header.listLabel}
          aria-pressed={view === "list"}
          className={cn(
            "inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[12px] font-medium transition-all",
            view === "list"
              ? "bg-card text-foreground shadow-[0_1px_2px_rgb(var(--shadow-rgb)/0.06)]"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <List className="size-3.5" />
          {S.header.list}
        </button>
      </div>
      <PermissionGuard required={[...crmCan.writeLead]}>
        <Button onClick={onAddLead} className="h-9">
          <Plus className="mr-1 size-4" />
          {S.header.addLead}
        </Button>
      </PermissionGuard>
    </>
  )
}
