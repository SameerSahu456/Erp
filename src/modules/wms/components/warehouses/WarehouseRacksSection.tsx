import { ConfirmDialog } from "@/components/common/dialogs/ConfirmDialog";
import { BusinessMetricsTable } from "@/components/common/tables/BusinessMetricsTable";

import { useRackTable, type LocationDeleteTarget } from "../../hooks/warehouses/useRackTable";
import { LocationFormDialog } from "../locations/LocationFormDialog";
import { LOCATIONS_STRINGS } from "../locations/locations.strings";
import { RackTableRow, type RackRowActions } from "../locations/RackTableRow";
import { WAREHOUSE_LOCATIONS_STRINGS as S } from "./warehouse-locations.strings";
import { rackColumns, RACK_TYPE_OPTIONS } from "./warehouse-racks.columns";

const D = LOCATIONS_STRINGS.delete;

function deleteCopy(target: LocationDeleteTarget | null) {
  if (target?.kind === "bin") {
    return { title: D.confirmBinTitle, description: D.confirmBinDescription(target.name) };
  }
  return { title: D.confirmRackTitle, description: D.confirmRackDescription(target?.name ?? "") };
}

interface Props {
  warehouseId: string;
  canManage: boolean;
}

/** The warehouse's racks: searched, filtered and paged by the server; a row opens
 *  in place to its bins or stock. */
export function WarehouseRacksSection({ warehouseId, canManage }: Props) {
  const t = useRackTable(warehouseId);
  const racks = t.racksQ.data?.items ?? [];
  const columns = rackColumns(canManage);
  const actions: RackRowActions = {
    canManage,
    onEdit: t.setEditTarget,
    onDelete: t.setDeleteTarget,
  };
  const copy = deleteCopy(t.deleteTarget);

  return (
    <>
      <BusinessMetricsTable
        tabs={[
          {
            id: "racks",
            label: S.tabs.racksAndBins,
            columns,
            data: racks.map((rack) => ({ ...rack })),
          },
        ]}
        showIndex={false}
        filterSize="default"
        searchValue={t.search}
        onSearchChange={t.changeSearch}
        searchPlaceholder={S.racks.searchPlaceholder}
        toolbarFilters={[
          {
            key: "kind",
            label: S.racks.filters.typeLabel,
            allLabel: S.racks.filters.typeAll,
            value: t.kind,
            options: RACK_TYPE_OPTIONS,
          },
        ]}
        onToolbarFilterChange={t.changeFilter}
        onClearFilters={t.clearFilters}
        externalFiltersActive={t.filtersActive}
        renderRow={(row, { colSpan }) => {
          const rack = racks.find((candidate) => candidate.id === row.id);
          if (!rack) return null;
          return (
            <RackTableRow
              rack={rack}
              isOpen={t.openRackId === rack.id}
              onToggle={() => t.toggleRack(rack.id)}
              openBinId={t.openBinId}
              onToggleBin={t.toggleBin}
              colSpan={colSpan}
              actions={actions}
            />
          );
        }}
        serverPagination={{
          page: t.page,
          pageSize: t.pageSize,
          total: t.racksQ.data?.total ?? 0,
          isFetching: t.racksQ.isFetching,
          onPageChange: t.setPage,
          onPageSizeChange: t.changePageSize,
          sort: t.sort,
          onSortChange: t.changeSort,
        }}
        emptyState={{
          title: S.states.noMatchesTitle,
          description: S.states.noMatchesDescription,
        }}
        error={
          t.racksQ.isError
            ? {
                title: S.states.racksErrorTitle,
                description: S.states.racksErrorDescription,
                onRetry: () => void t.racksQ.refetch(),
              }
            : undefined
        }
      />

      <LocationFormDialog
        open={!!t.editing}
        onOpenChange={(open) => {
          if (!open) t.setEditTarget(null);
        }}
        warehouseId={warehouseId}
        location={t.editing}
        parentRackName={t.editTarget?.parentRackName}
      />

      <ConfirmDialog
        open={!!t.deleteTarget}
        onOpenChange={(open) => {
          if (!open) t.setDeleteTarget(null);
        }}
        variant="destructive"
        title={copy.title}
        description={copy.description}
        confirmLabel={D.confirm}
        cancelLabel={D.cancel}
        onConfirm={t.confirmDelete}
      />
    </>
  );
}
