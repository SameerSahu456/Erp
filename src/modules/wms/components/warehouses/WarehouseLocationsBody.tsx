import { AlertTriangle, Rows3 } from "lucide-react";

import { PageHeader } from "@/components/page-shells";
import { DetailTabs } from "@/components/page-shells/DetailTabs";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/feedback/EmptyState";

import {
  useWarehouseLocationsView,
  WAREHOUSE_TEAM_TAB,
} from "../../hooks/warehouses/useWarehouseLocationsView";
import { LocationFormDialog } from "../locations/LocationFormDialog";
import { AssignmentFormDialog } from "./AssignmentFormDialog";
import { displayName } from "./warehouse-display";
import { WAREHOUSE_LOCATIONS_STRINGS as S } from "./warehouse-locations.strings";
import { WarehouseInfoCard } from "./WarehouseInfoCard";
import { WarehouseLocationsHeader } from "./WarehouseLocationsHeader";
import { WarehouseRacksSection } from "./WarehouseRacksSection";
import { WarehouseTeamTab } from "./WarehouseTeamTab";
import {
  WarehouseStorageSummaryPanel,
  WarehouseStorageSummarySkeleton,
} from "./WarehouseStorageSummary";

export function WarehouseLocationsBody() {
  const v = useWarehouseLocationsView();
  const { warehouseQ, summaryQ } = v;

  if (warehouseQ.isLoading) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <WarehouseStorageSummarySkeleton />
      </div>
    );
  }

  if (warehouseQ.isError || !warehouseQ.data) {
    return (
      <div className="flex flex-col gap-3">
        <PageHeader title={S.header.fallbackTitle} backHref="/wms/locations" />
        <EmptyState
          icon={AlertTriangle}
          title={S.states.warehouseErrorTitle}
          description={S.states.warehouseErrorDescription}
          action={{ label: S.states.retry, onClick: () => void warehouseQ.refetch() }}
        />
      </div>
    );
  }

  const warehouse = warehouseQ.data;
  const openAdd = () => v.setAddLocationOpen(true);
  const hasNoRacks = summaryQ.data?.rack_count === 0;
  const noRacks = (
    <EmptyState
      icon={Rows3}
      title={S.states.noRacksTitle}
      description={
        v.canManageLocations ? S.states.noRacksDescription : S.states.noRacksReadOnlyDescription
      }
      action={
        v.canManageLocations ? { label: S.header.addRackBinButton, onClick: openAdd } : undefined
      }
    />
  );

  return (
    <div className="flex flex-col gap-3">
      <WarehouseLocationsHeader
        warehouse={warehouse}
        canEditWarehouse={v.canEditWarehouse}
        canManageLocations={v.canManageLocations}
        onAddLocation={openAdd}
        onTeamTab={v.onTeamTab}
        canManageTeam={v.canManageTeam}
        onAddMember={() => v.setAddMemberOpen(true)}
      />
      <WarehouseInfoCard warehouse={warehouse} eligibleCategories={v.eligibleCategories} />
      <WarehouseStorageSummaryPanel query={summaryQ} />

      {/* No racks yet: the tabs still show for team viewers, so Team Members stays reachable. */}
      {hasNoRacks && !v.canSeeTeam ? (
        noRacks
      ) : (
        <DetailTabs
          contentClassName="mt-3"
          tabs={[
            {
              id: "racks",
              label: S.tabs.racksAndBins,
              bare: true,
              content: hasNoRacks ? (
                noRacks
              ) : (
                <WarehouseRacksSection
                  warehouseId={warehouse.id}
                  // Rack / bin Edit and Delete are hidden for everyone (user
                  // decision 2026-11-11); `v.canManageLocations` brings the menu back.
                  canManage={false}
                />
              ),
            },
            ...(v.canSeeTeam
              ? [
                  {
                    id: WAREHOUSE_TEAM_TAB,
                    label: S.tabs.team,
                    bare: true,
                    content: (
                      <WarehouseTeamTab
                        warehouseId={warehouse.id}
                        warehouseName={displayName(warehouse.name)}
                      />
                    ),
                  },
                ]
              : []),
          ]}
        />
      )}

      <LocationFormDialog
        open={v.addLocationOpen}
        onOpenChange={v.setAddLocationOpen}
        warehouseId={warehouse.id}
        initialLevel="rack"
      />
      {/* Opened only by the header's Add team member button, which needs TEAM_MANAGE. */}
      <AssignmentFormDialog
        open={v.addMemberOpen}
        onOpenChange={v.setAddMemberOpen}
        warehouseId={warehouse.id}
        warehouseName={displayName(warehouse.name)}
      />
    </div>
  );
}
