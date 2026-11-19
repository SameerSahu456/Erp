import { Link } from "react-router-dom";
import { Pencil, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EntityHeader } from "@/components/page-shells/EntityHeader";
import { formatIST_date } from "@shared/lib/date";

import type { Warehouse } from "../../api";
import { displayName } from "./warehouse-display";
import { WAREHOUSE_LOCATIONS_STRINGS as S } from "./warehouse-locations.strings";
import { WAREHOUSE_TEAM_STRINGS } from "./warehouse-team.strings";

interface Props {
  warehouse: Warehouse;
  canEditWarehouse: boolean;
  canManageLocations: boolean;
  onAddLocation: () => void;
  /** On the Team Members tab the only action is adding a member. */
  onTeamTab: boolean;
  canManageTeam: boolean;
  onAddMember: () => void;
}

function TeamActions({ canManageTeam, onAddMember }: Pick<Props, "canManageTeam" | "onAddMember">) {
  if (!canManageTeam) return null;
  return (
    <Button onClick={onAddMember}>
      <Plus className="mr-1.5 size-4" />
      {WAREHOUSE_TEAM_STRINGS.addMember}
    </Button>
  );
}

/** Warehouse name, status and the page's main actions. */
export function WarehouseLocationsHeader({ warehouse, ...p }: Props) {
  return (
    <EntityHeader
      title={displayName(warehouse.name)}
      subtitle={S.header.subtitle(warehouse.code, formatIST_date(warehouse.created_at))}
      status={{
        label: warehouse.is_active ? S.header.statusActive : S.header.statusInactive,
        variant: warehouse.is_active ? "success" : "neutral",
      }}
      backHref="/wms/locations"
      actions={
        p.onTeamTab ? (
          <TeamActions canManageTeam={p.canManageTeam} onAddMember={p.onAddMember} />
        ) : (
          <div className="flex items-center gap-2">
            {p.canEditWarehouse && (
              <Button variant="outline" render={<Link to={`/wms/locations/${warehouse.id}/edit`} />}>
                <Pencil className="mr-1.5 size-4" />
                {S.header.editButton}
              </Button>
            )}
            {p.canManageLocations && (
              <Button onClick={p.onAddLocation}>
                <Plus className="mr-1.5 size-4" />
                {S.header.addRackBinButton}
              </Button>
            )}
          </div>
        )
      }
    />
  );
}
