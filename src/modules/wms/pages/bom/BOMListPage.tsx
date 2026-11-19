import { useMemo } from "react";
import { WMS_LIST_MAX_CELL_CHARS } from "../../constants";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Eye } from "lucide-react";

import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/common/display/StatusBadge";
import {
  BusinessMetricsTable,
  type TabConfig,
  type CellFormatter,
} from "@/components/common/tables/BusinessMetricsTable";
import { StatsRow, type StatCardData } from "@/components/common/display/StatsRow";
import { ListPageShell } from "@/components/page-shells";
import { mockBOMs } from "../../data/boms";
import type { BOMStatus, BOMType } from "../../types";
import { formatIST_date } from "@shared/lib/date";
import { BOM_STRINGS } from "../../components/bom/bom.strings";
import { BOM_LIST_PAGE_STRINGS } from "./bom-list-page.strings";

function formatDate(dateStr: string) {
  return formatIST_date(dateStr);
}

function formatCurrency(amount?: number) {
  if (!amount) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

const STATUS_VARIANT: Record<
  BOMStatus,
  "success" | "warning" | "info" | "neutral" | "error"
> = {
  Draft: "neutral",
  Active: "success",
  Revision: "warning",
  Obsolete: "error",
};

const TYPE_VARIANT: Record<BOMType, "info" | "warning"> = {
  ASSEMBLY: "info",
  DISASSEMBLY: "warning",
};

const columns = [
  { key: "bomNumber", label: BOM_STRINGS.list.columns.bomNumber, sortable: true },
  { key: "name", label: BOM_STRINGS.list.columns.name, sortable: true },
  { key: "type", label: BOM_STRINGS.list.columns.type, filterable: true },
  { key: "parentPart", label: BOM_STRINGS.list.columns.product },
  {
    key: "components",
    label: BOM_STRINGS.list.columns.components,
    align: "right" as const,
  },
  {
    key: "version",
    label: BOM_STRINGS.list.columns.version,
    align: "right" as const,
  },
  {
    key: "estimatedCost",
    label: BOM_STRINGS.list.columns.estCost,
    align: "right" as const,
    sortable: true,
  },
  { key: "status", label: BOM_STRINGS.list.columns.status, filterable: true },
  { key: "createdAt", label: BOM_STRINGS.list.columns.created, sortable: true },
  { key: "actions", label: "" },
];

function BOMListPage() {
  const navigate = useNavigate();

  const rows = useMemo(
    () =>
      mockBOMs.map((b) => ({
        id: b.id,
        bomNumber: b.bomNumber,
        name: b.name,
        type: b.type,
        parentPart: b.parentPartName,
        components: b.items.length,
        version: `v${b.version}`,
        estimatedCost: b.estimatedCost,
        estimatedCostDisplay: formatCurrency(b.estimatedCost),
        status: b.status,
        createdAt: formatDate(b.createdAt),
      })),
    [],
  );

  const assemblyBOMs = useMemo(
    () => rows.filter((r) => r.type === "ASSEMBLY"),
    [rows],
  );
  const disassemblyBOMs = useMemo(
    () => rows.filter((r) => r.type === "DISASSEMBLY"),
    [rows],
  );
  const activeBOMs = useMemo(
    () => rows.filter((r) => r.status === "Active"),
    [rows],
  );

  const stats: StatCardData[] = [
    {
      label: BOM_STRINGS.list.stats.totalBOMs,
      value: rows.length,
      accent: "primary" as const,
    },
    {
      label: BOM_STRINGS.list.stats.assembly,
      value: assemblyBOMs.length,
      accent: "info" as const,
    },
    {
      label: BOM_STRINGS.list.stats.disassembly,
      value: disassemblyBOMs.length,
      accent: "violet" as const,
    },
    {
      label: BOM_STRINGS.list.stats.active,
      value: activeBOMs.length,
      accent: "success" as const,
    },
  ];

  const tabs: TabConfig[] = [
    {
      id: "all",
      label: BOM_STRINGS.list.tabs.allBOMs(rows.length),
      columns,
      data: rows,
    },
    {
      id: "assembly",
      label: BOM_STRINGS.list.tabs.assembly(assemblyBOMs.length),
      columns,
      data: assemblyBOMs,
    },
    {
      id: "disassembly",
      label: BOM_STRINGS.list.tabs.disassembly(disassemblyBOMs.length),
      columns,
      data: disassemblyBOMs,
    },
  ];

  const cellFormatter: CellFormatter = (value, key, row) => {
    if (key === "bomNumber") {
      return {
        display: (
          <Link
            to={`/wms/bom/${row.id}`}
            onClick={(e) => e.stopPropagation()}
            className="font-medium wms-link"
          >
            {value as string}
          </Link>
        ),
      };
    }
    if (key === "type") {
      const t = value as BOMType;
      return {
        display: (
          <StatusBadge variant={TYPE_VARIANT[t]}>
            {t === "ASSEMBLY"
              ? BOM_STRINGS.list.typeLabels.assembly
              : BOM_STRINGS.list.typeLabels.disassembly}
          </StatusBadge>
        ),
      };
    }
    if (key === "status") {
      return {
        display: (
          <StatusBadge variant={STATUS_VARIANT[value as BOMStatus]}>
            {value as string}
          </StatusBadge>
        ),
      };
    }
    if (key === "estimatedCost") {
      return { display: <span>{row.estimatedCostDisplay as string}</span> };
    }
    if (key === "actions") {
      return {
        display: (
          <Link
            onClick={(e) => e.stopPropagation()}
            to={`/wms/bom/${row.id}`}
            className="inline-flex items-center gap-1 text-xs font-medium wms-link"
          >
            <Eye className="size-3.5" />
            {BOM_STRINGS.list.actions.view}
          </Link>
        ),
      };
    }
    return null;
  };

  return (
    <ListPageShell
      title={BOM_STRINGS.list.title}
      subtitle={BOM_STRINGS.list.subtitle}
      breadcrumbs={[
        { label: BOM_LIST_PAGE_STRINGS.breadcrumbs.wms },
        { label: BOM_LIST_PAGE_STRINGS.breadcrumbs.bom },
      ]}
      actions={
        <Button onClick={() => navigate("/wms/bom/new")}>
          <Plus className="size-4" data-icon="inline-start" />
          {BOM_STRINGS.list.createBOM}
        </Button>
      }
      stats={<StatsRow stats={stats} />}
    >
      <BusinessMetricsTable
          maxCellChars={WMS_LIST_MAX_CELL_CHARS}
          filterSize="default"
        showIndex
        tabs={tabs}
        cellFormatter={cellFormatter}
        persistKey="wms-bom"
        searchPlaceholder={BOM_LIST_PAGE_STRINGS.searchPlaceholder}
        onRowClick={(row) => navigate(`/wms/bom/${row.id}`)}
        emptyState={{
          title: BOM_STRINGS.list.empty.title,
          description: BOM_STRINGS.list.empty.description,
          action: {
            label: BOM_STRINGS.list.empty.action,
            onClick: () => navigate("/wms/bom/new"),
          },
        }}
      />
    </ListPageShell>
  );
}

export { BOMListPage };
export default BOMListPage;
