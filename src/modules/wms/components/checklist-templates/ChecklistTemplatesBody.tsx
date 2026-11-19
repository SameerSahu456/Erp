import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Typography } from "@/components/ui/typography";
import { StatusBadge } from "@/components/common/display/StatusBadge";
import { ListPageShell } from "@/components/page-shells";
import {
  BusinessMetricsTable,
  type CellFormatter,
} from "@/components/common/tables/BusinessMetricsTable";
import { usePermission } from "@shared/rbac";
import { imsCan } from "@modules/ims";

import { WMS_LIST_MAX_CELL_CHARS } from "../../constants";
import { wmsCan } from "../../permissions";
import { CHECKLIST_TEMPLATES_STRINGS } from "./checklist-templates.strings";
import { checklistTypeVariant } from "./checklist-templates.columns";
import { useChecklistTemplatesList, type ChecklistAssignedTo } from "../../hooks/checklist-templates/useChecklistTemplatesList";
import { ChecklistActiveCell, ChecklistAssignedToCell, ChecklistRowEditAction } from "./ChecklistTemplateCells";

const L = CHECKLIST_TEMPLATES_STRINGS.list;
const NEW_PATH = "/wms/checklists/new";

function partLabel(meta: ChecklistAssignedTo) {
  if (meta.targetPath && meta.targetName) return `${meta.targetPath} · ${meta.targetName}`;
  return meta.targetName ?? meta.targetPath;
}

export function ChecklistTemplatesBody() {
  const navigate = useNavigate();
  // Matches the create/edit route guards, so read-only users don't hit a 403.
  const canManage = usePermission().can([...imsCan.write, ...wmsCan.checklistManage]);
  const list = useChecklistTemplatesList();
  const { lv, templatesQuery } = list;

  const cellFormatter: CellFormatter = (value, key, row) => {
    if (key === "name") {
      // Plain text — the whole row already opens the template (onRowClick).
      return { display: <Typography variant="body-strong">{String(value)}</Typography> };
    }
    if (key === "type") {
      const variant = checklistTypeVariant(String(row.typeCode ?? ""));
      return { display: <StatusBadge variant={variant}>{String(value)}</StatusBadge> };
    }
    if (key === "assignedTo") {
      const meta = value as ChecklistAssignedTo;
      const isCategory = meta.targetType === "category";
      return {
        display: (
          <ChecklistAssignedToCell
            prefix={isCategory ? L.cell.categoryPrefix : L.cell.partPrefix}
            label={isCategory ? list.categoryById.get(meta.targetId)?.name : partLabel(meta)}
          />
        ),
      };
    }
    if (key === "active") {
      const template = { id: String(row.id), name: String(row.name ?? ""), is_active: Boolean(value) };
      return { display: <ChecklistActiveCell template={template} canManage={canManage} /> };
    }
    if (key === "actions") {
      if (!canManage) return { display: null };
      const name = String(row.name ?? L.cell.nameFallback);
      return { display: <ChecklistRowEditAction id={String(value)} name={name} /> };
    }
    return null;
  };

  return (
    <ListPageShell
      title={L.title}
      subtitle={L.subtitle}
      actions={
        canManage ? (
          <Button onClick={() => navigate(NEW_PATH)}>
            <Plus className="size-4" data-icon="inline-start" />
            {L.createTemplate}
          </Button>
        ) : undefined
      }
    >
      <BusinessMetricsTable
        maxCellChars={WMS_LIST_MAX_CELL_CHARS}
        filterSize="default"
        tabs={list.tabs}
        cellFormatter={cellFormatter}
        persistKey="wms-checklists"
        searchPlaceholder={L.searchPlaceholder}
        // Controlled tab — the view store's `activeTab` is the single source of
        // truth (BMT's own persisted tab would otherwise drift).
        activeTab={list.activeTab}
        onRowClick={(row) => navigate(`/wms/checklists/${row.id}`)}
        // Server-side wiring: tab/search/page changes refetch with new params.
        onTabChange={lv.setActiveTab}
        searchValue={list.search}
        onSearchChange={lv.setSearch}
        serverPagination={{
          page: list.page,
          pageSize: list.pageSize,
          total: list.total,
          isFetching: templatesQuery.isFetching,
          onPageChange: lv.setPage,
          onPageSizeChange: lv.setPageSize,
          // Server-side sort on `name` (the API allow-list) — resets to page 1.
          sort: { column: list.sortColumn, direction: list.sortDirection },
          onSortChange: lv.setSort,
        }}
        error={
          templatesQuery.isError
            ? {
                title: L.empty.loadError,
                description: L.empty.loadErrorDescription,
                onRetry: () => void templatesQuery.refetch(),
              }
            : undefined
        }
        emptyState={{
          title: L.empty.noTemplates,
          description: L.empty.noTemplatesDescription,
          action: canManage
            ? { label: L.empty.createTemplate, onClick: () => navigate(NEW_PATH) }
            : undefined,
        }}
      />
    </ListPageShell>
  );
}
