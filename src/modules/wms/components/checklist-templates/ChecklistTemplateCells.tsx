import { useNavigate } from "react-router-dom";
import { Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Typography } from "@/components/ui/typography";
import { StatusBadge } from "@/components/common/display/StatusBadge";
import { ChecklistActiveSwitch } from "@modules/ims";

import { CHECKLIST_TEMPLATES_STRINGS } from "./checklist-templates.strings";

const C = CHECKLIST_TEMPLATES_STRINGS.list.cell;
const EMPTY = "—";

/** "Category: X" / "Part: X" cell; a missing target renders a muted dash. */
export function ChecklistAssignedToCell({ prefix, label }: { prefix: string; label: string | null | undefined }) {
  return (
    <span>
      <Typography variant="body" tone="muted" asChild>
        <span>{prefix}</span>
      </Typography>{" "}
      {label ? (
        <Typography variant="body" asChild>
          <span>{label}</span>
        </Typography>
      ) : (
        <Typography variant="body" tone="muted" asChild>
          <span>{EMPTY}</span>
        </Typography>
      )}
    </span>
  );
}

/** Active column: authors toggle it in place; read-only viewers see a badge. */
export function ChecklistActiveCell({
  template,
  canManage,
}: {
  template: { id: string; name: string; is_active: boolean };
  canManage: boolean;
}) {
  if (canManage) return <ChecklistActiveSwitch template={template} />;
  return (
    <StatusBadge variant={template.is_active ? "success" : "neutral"}>
      {template.is_active ? C.active : C.inactive}
    </StatusBadge>
  );
}

/** Row-level Edit affordance (callers render it only for authors). */
export function ChecklistRowEditAction({ id, name }: { id: string; name: string }) {
  const navigate = useNavigate();
  return (
    <TooltipProvider>
      <div className="flex items-center justify-end gap-1">
        <Tooltip>
          <TooltipTrigger render={<span className="inline-flex" />}>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/wms/checklists/${id}/edit`);
              }}
              aria-label={C.editAriaLabel(name)}
            >
              <Pencil className="size-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{C.editTitle}</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
