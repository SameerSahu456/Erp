import { useMemo } from "react";
import { WMS_LIST_MAX_CELL_CHARS } from "../../constants";
import {
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Plug,
  Replace,
} from "lucide-react";

import { StatusBadge } from "@/components/common/display/StatusBadge";
import {
  BusinessMetricsTable,
  type TabConfig,
  type CellFormatter,
} from "@/components/common/tables/BusinessMetricsTable";
import {
  StatsRow,
  type StatCardData,
} from "@/components/common/display/StatsRow";
import { ListPageShell } from "@/components/page-shells";
import { mockRelatedParts } from "../../data/related-parts";
import { mockParts } from "@/modules/ims/data/parts";
import type { PartRelationType } from "../../types";
import { BOM_STRINGS } from "../../components/bom/bom.strings";
import { RELATED_PARTS_PAGE_STRINGS } from "./related-parts-page.strings";

const RELATION_LABELS: Record<PartRelationType, string> = {
  REPLACEMENT: "Replacement",
  ALTERNATIVE: "Alternative",
  UPGRADE: "Upgrade",
  DOWNGRADE: "Downgrade",
  COMPATIBLE: "Compatible",
};

const RELATION_VARIANT: Record<
  PartRelationType,
  "success" | "warning" | "info" | "neutral" | "error"
> = {
  REPLACEMENT: "warning",
  ALTERNATIVE: "info",
  UPGRADE: "success",
  DOWNGRADE: "neutral",
  COMPATIBLE: "info",
};

const RELATION_ICON: Record<PartRelationType, React.ReactNode> = {
  REPLACEMENT: <Replace className="size-3.5" />,
  ALTERNATIVE: <RefreshCw className="size-3.5" />,
  UPGRADE: <ArrowUpRight className="size-3.5" />,
  DOWNGRADE: <ArrowDownRight className="size-3.5" />,
  COMPATIBLE: <Plug className="size-3.5" />,
};

const columns = [
  {
    key: "sourcePart",
    label: BOM_STRINGS.relatedParts.columns.sourcePart,
    sortable: true,
  },
  { key: "relation", label: BOM_STRINGS.relatedParts.columns.relation },
  {
    key: "relatedPart",
    label: BOM_STRINGS.relatedParts.columns.relatedPart,
    sortable: true,
  },
  { key: "sourceBrand", label: BOM_STRINGS.relatedParts.columns.sourceBrand },
  { key: "relatedBrand", label: BOM_STRINGS.relatedParts.columns.relatedBrand },
  { key: "category", label: BOM_STRINGS.relatedParts.columns.category },
  {
    key: "priority",
    label: BOM_STRINGS.relatedParts.columns.priority,
    align: "right" as const,
    sortable: true,
  },
  { key: "notes", label: BOM_STRINGS.relatedParts.columns.notes },
  { key: "status", label: BOM_STRINGS.relatedParts.columns.status },
];

function RelatedPartsPage() {
  const rows = useMemo(
    () =>
      mockRelatedParts.map((rp) => {
        const source = mockParts.find((p) => p.id === rp.partId);
        const related = mockParts.find((p) => p.id === rp.relatedPartId);
        return {
          id: rp.id,
          sourcePart: source?.name ?? rp.partId,
          sourcePartId: rp.partId,
          sourceBrand: source?.brand ?? "—",
          relation: rp.relationType,
          relatedPart: related?.name ?? rp.relatedPartId,
          relatedPartId: rp.relatedPartId,
          relatedBrand: related?.brand ?? "—",
          category: source?.categoryName ?? "—",
          priority: rp.priority,
          notes: rp.notes ?? "—",
          status: rp.isActive ? "Active" : "Inactive",
        };
      }),
    [],
  );

  const alternatives = useMemo(
    () => rows.filter((r) => r.relation === "ALTERNATIVE"),
    [rows],
  );
  const upgrades = useMemo(
    () => rows.filter((r) => r.relation === "UPGRADE"),
    [rows],
  );
  const downgrades = useMemo(
    () => rows.filter((r) => r.relation === "DOWNGRADE"),
    [rows],
  );
  const compatible = useMemo(
    () => rows.filter((r) => r.relation === "COMPATIBLE"),
    [rows],
  );

  const stats: StatCardData[] = [
    {
      label: BOM_STRINGS.relatedParts.stats.totalMappings,
      value: rows.length,
      accent: "primary" as const,
    },
    {
      label: BOM_STRINGS.relatedParts.stats.alternatives,
      value: alternatives.length,
      accent: "info" as const,
    },
    {
      label: BOM_STRINGS.relatedParts.stats.upgrades,
      value: upgrades.length,
      accent: "violet" as const,
    },
    {
      label: BOM_STRINGS.relatedParts.stats.compatible,
      value: compatible.length,
      accent: "success" as const,
    },
  ];

  const tabs: TabConfig[] = [
    {
      id: "all",
      label: BOM_STRINGS.relatedParts.tabs.all(rows.length),
      columns,
      data: rows,
    },
    {
      id: "alternatives",
      label: BOM_STRINGS.relatedParts.tabs.alternatives(alternatives.length),
      columns,
      data: alternatives,
    },
    {
      id: "upgrades",
      label: BOM_STRINGS.relatedParts.tabs.upgrades(upgrades.length),
      columns,
      data: upgrades,
    },
    {
      id: "downgrades",
      label: BOM_STRINGS.relatedParts.tabs.downgrades(downgrades.length),
      columns,
      data: downgrades,
    },
    {
      id: "compatible",
      label: BOM_STRINGS.relatedParts.tabs.compatible(compatible.length),
      columns,
      data: compatible,
    },
  ];

  const cellFormatter: CellFormatter = (value, key) => {
    if (key === "sourcePart") {
      return {
        display: <span className="font-medium">{value as string}</span>,
      };
    }
    if (key === "relation") {
      const rel = value as PartRelationType;
      return {
        display: (
          <StatusBadge variant={RELATION_VARIANT[rel]}>
            <span className="mr-1">{RELATION_ICON[rel]}</span>
            {RELATION_LABELS[rel]}
          </StatusBadge>
        ),
      };
    }
    if (key === "relatedPart") {
      return {
        display: (
          <span className="flex items-center gap-1 font-medium">
            <ArrowRight className="size-3 text-muted-foreground" />
            {value as string}
          </span>
        ),
      };
    }
    if (key === "status") {
      return {
        display: (
          <StatusBadge variant={value === "Active" ? "success" : "neutral"}>
            {value as string}
          </StatusBadge>
        ),
      };
    }
    if (key === "priority") {
      return {
        display: (
          <span className="inline-flex size-6 items-center justify-center rounded-full bg-muted text-xs font-medium">
            {value as number}
          </span>
        ),
      };
    }
    return null;
  };

  return (
    <ListPageShell
      title={BOM_STRINGS.relatedParts.title}
      subtitle={BOM_STRINGS.relatedParts.subtitle}
      breadcrumbs={[
        { label: RELATED_PARTS_PAGE_STRINGS.breadcrumbs.wms },
        { label: RELATED_PARTS_PAGE_STRINGS.breadcrumbs.bom, href: "/wms/bom" },
        { label: RELATED_PARTS_PAGE_STRINGS.breadcrumbs.relatedParts },
      ]}
      stats={<StatsRow stats={stats} />}
    >
      <BusinessMetricsTable
          maxCellChars={WMS_LIST_MAX_CELL_CHARS}
          filterSize="default"
        tabs={tabs}
        cellFormatter={cellFormatter}
        persistKey="wms-related-parts"
        searchPlaceholder={RELATED_PARTS_PAGE_STRINGS.searchPlaceholder}
        emptyState={{
          title: BOM_STRINGS.relatedParts.empty.title,
          description: BOM_STRINGS.relatedParts.empty.description,
        }}
      />
    </ListPageShell>
  );
}

export { RelatedPartsPage };
export default RelatedPartsPage;
