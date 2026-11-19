import { useNavigate } from "react-router-dom";
import { MapPin, MoreHorizontal, Pencil, Power, Trash2 } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Typography } from "@/components/ui/typography";
import { StatusBadge } from "@/components/common/display/StatusBadge";
import { titleCaseWords } from "@/shared/lib/text";

import { CONDITION_LABELS, CONDITION_VARIANT } from "../../constants/condition";
import { WAREHOUSES_BODY_STRINGS as S } from "./warehouses-body.strings";

export function WarehouseLocationCell({ city, state }: { city: string; state: string }) {
  return (
    <Typography variant="body" asChild>
      <span className="flex min-w-0 items-center gap-1.5">
        <MapPin className="size-3.5 shrink-0 text-muted-foreground" />
        <span className="min-w-0 truncate">
          {titleCaseWords(city)}, {titleCaseWords(state)}
        </span>
      </span>
    </Typography>
  );
}

export function WarehouseConditionsCell({ conditions }: { conditions: string[] }) {
  return (
    <div className="flex flex-nowrap gap-1">
      {conditions.length === 0 ? (
        <Typography variant="body" tone="muted" asChild>
          <span>—</span>
        </Typography>
      ) : (
        conditions.map((c) => (
          <StatusBadge key={c} variant={CONDITION_VARIANT[c] ?? "neutral"}>
            {CONDITION_LABELS[c] ?? c}
          </StatusBadge>
        ))
      )}
    </div>
  );
}

interface RowActionsProps {
  id: string;
  name: string;
  active: boolean;
  togglePending: boolean;
  deletePending: boolean;
  onToggle: () => void;
  onDelete: () => void;
}

/** Edit / (de)activate / delete — rendered only for warehouse managers. A click
 *  in this cell must not also open the warehouse. */
export function WarehouseRowActions(p: RowActionsProps) {
  const navigate = useNavigate();
  return (
    <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={S.actions.menuAria(p.name)}
          className="flex size-8 items-center justify-center rounded-md hover:bg-accent/50"
        >
          <MoreHorizontal className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => navigate(`/wms/locations/${p.id}/edit`)}>
            <Pencil className="size-4" />
            {S.actions.editTitle}
          </DropdownMenuItem>
          <DropdownMenuItem disabled={p.togglePending} onClick={p.onToggle}>
            <Power className="size-4" />
            {S.actions.activateDeactivateTitle(p.active)}
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" disabled={p.deletePending} onClick={p.onDelete}>
            <Trash2 className="size-4" />
            {S.actions.deleteTitle}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
