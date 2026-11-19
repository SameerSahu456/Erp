import { Pencil, Trash2 } from "lucide-react";

import { BusinessMetricsTable, type CellFormatter } from "@/components/common/tables/BusinessMetricsTable";
import { TruncatedText } from "@/components/common/display/TruncatedText";
import { Button } from "@/components/ui/button";
import { EMPTY_VALUE } from "@/shared/constants";

import type { AssignmentLevel, AssignmentRole, WarehouseAssignmentListItem } from "../../api";
import { ASSIGNMENT_LEVEL_LABELS, ASSIGNMENT_ROLE_LABELS } from "../../constants/assignment";
import { useWarehouseTeamView } from "../../hooks/warehouses/useWarehouseTeamView";
import { AssignmentFormDialog } from "./AssignmentFormDialog";
import { RemoveTeamMemberDialog } from "./RemoveTeamMemberDialog";
import { teamColumns } from "./warehouse-team.columns";
import { WAREHOUSE_TEAM_STRINGS as S } from "./warehouse-team.strings";

const ROLE_OPTIONS = (Object.keys(ASSIGNMENT_ROLE_LABELS) as AssignmentRole[]).map((value) => ({
  value,
  label: ASSIGNMENT_ROLE_LABELS[value],
}));
const LEVEL_OPTIONS = (Object.keys(ASSIGNMENT_LEVEL_LABELS) as AssignmentLevel[]).map((value) => ({
  value,
  label: ASSIGNMENT_LEVEL_LABELS[value],
}));

function MemberActions({
  member,
  isSelf,
  onEdit,
  onRemove,
}: {
  member: WarehouseAssignmentListItem;
  /** You can't remove yourself from a team (CP-466). */
  isSelf: boolean;
  onEdit: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center justify-end gap-2">
      <Button variant="outline" size="icon-sm" onClick={onEdit} aria-label={S.editAria(member.user.name)}>
        <Pencil className="size-4" />
      </Button>
      {!isSelf && (
        <Button
          variant="outline"
          size="icon-sm"
          onClick={onRemove}
          aria-label={S.removeAria(member.user.name)}
          className="text-destructive"
        >
          <Trash2 className="size-4" />
        </Button>
      )}
    </div>
  );
}

/** The warehouse's team, searched, sorted and paged by the server. */
export function WarehouseTeamTab({
  warehouseId,
  warehouseName,
}: {
  warehouseId: string;
  warehouseName: string;
}) {
  const t = useWarehouseTeamView(warehouseId);
  const members = t.teamQ.data?.items ?? [];
  const rows = members.map((member) => ({
    id: member.id,
    name: member.user.name,
    email: member.user.email,
    role: member.role,
    level: member.level,
    actions: member.id,
  }));

  const formatCell: CellFormatter = (value, key, row) => {
    if (key === "name") {
      return { display: <TruncatedText value={String(value)} className="max-w-full font-semibold" /> };
    }
    if (key === "email") {
      return { display: <TruncatedText value={String(value)} className="max-w-full" /> };
    }
    if (key === "role") {
      return { display: ASSIGNMENT_ROLE_LABELS[row.role as WarehouseAssignmentListItem["role"]] };
    }
    if (key === "level") {
      const level = row.level as WarehouseAssignmentListItem["level"];
      return { display: level ? ASSIGNMENT_LEVEL_LABELS[level] : EMPTY_VALUE };
    }
    if (key === "actions") {
      const member = members.find((candidate) => candidate.id === value);
      if (!member) return null;
      return {
        display: (
          <MemberActions
            member={member}
            isSelf={member.user.id === t.currentUserId}
            onEdit={() => t.openEdit(member)}
            onRemove={() => t.openRemove(member)}
          />
        ),
      };
    }
    return null;
  };

  return (
    <div className="flex flex-col gap-4">
      <BusinessMetricsTable
        tabs={[{ id: "team", label: S.title, columns: teamColumns(t.canManage), data: rows }]}
        cellFormatter={formatCell}
        showIndex={false}
        filterSize="default"
        searchValue={t.search}
        onSearchChange={t.changeSearch}
        searchPlaceholder={S.searchPlaceholder}
        toolbarFilters={[
          {
            key: "role",
            label: S.filters.role,
            allLabel: S.filters.allRoles,
            value: t.role,
            options: ROLE_OPTIONS,
          },
          // Level only applies to engineers, so it shows once Engineer is picked.
          ...(t.role === "engineer"
            ? [
                {
                  key: "level",
                  label: S.filters.level,
                  allLabel: S.filters.allLevels,
                  value: t.level,
                  options: LEVEL_OPTIONS,
                },
              ]
            : []),
        ]}
        onToolbarFilterChange={t.changeFilter}
        externalFiltersActive={t.filtersActive}
        onClearFilters={t.clearFilters}
        serverPagination={{
          page: t.page,
          pageSize: t.pageSize,
          total: t.teamQ.data?.total ?? 0,
          isFetching: t.teamQ.isFetching,
          onPageChange: t.setPage,
          onPageSizeChange: t.changePageSize,
          sort: t.sort,
          onSortChange: t.changeSort,
        }}
        emptyState={{
          title: S.states.emptyTitle,
          description: S.states.emptyDescription,
          action: t.canManage ? { label: S.addMember, onClick: t.openAdd } : undefined,
        }}
        error={
          t.teamQ.isError
            ? {
                title: S.states.teamErrorTitle,
                description: S.states.teamErrorDescription,
                onRetry: () => void t.teamQ.refetch(),
              }
            : undefined
        }
      />

      <AssignmentFormDialog
        open={t.formOpen}
        onOpenChange={t.setFormOpen}
        warehouseId={warehouseId}
        warehouseName={warehouseName}
        assignment={t.editing}
      />
      <RemoveTeamMemberDialog
        memberName={t.removing?.user.name}
        open={!!t.removing}
        onClose={t.closeRemove}
        reason={t.reason}
        onReasonChange={t.setReason}
        pending={t.removePending}
        onConfirm={t.confirmRemove}
      />
    </div>
  );
}
