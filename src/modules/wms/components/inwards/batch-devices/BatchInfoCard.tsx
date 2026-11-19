import type { ReactNode } from "react";
import { Box, CalendarDays, Layers, MapPin, Package, Tag, User } from "lucide-react";

import { Typography } from "@/components/ui/typography";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { OverflowPillList } from "@/components/common/display/OverflowPillList";
import { formatIST_date } from "@shared/lib/date";
import { INWARD_TYPE_LABELS } from "../../../constants";
import { INWARDS_STRINGS } from "../inwards.strings";
import type { BatchDevicesView } from "../../../hooks/inwards/useBatchDevices";
import type { BatchDerivedView } from "./batch-view-helpers";
import { BatchSourceSection } from "./BatchSourceSection";
import {
  batchDateIso,
  batchRollups,
  categoryLabel,
  receivedByText,
  warehouseText,
} from "./batch-info-helpers";

type InfoItem = {
  icon: typeof Layers;
  label: string;
  value: string;
  node?: ReactNode;
};

/** Batch Information card — core attributes, catalog rollups, and the source. */
export function BatchInfoCard({
  view,
  derived,
}: {
  view: BatchDevicesView;
  derived: BatchDerivedView;
}) {
  const { batch, inwardType } = derived;
  const summary = batch.line_items_summary;
  const { categories, categoriesText, brandsText, conditionsText } =
    batchRollups(batch);

  // Catalog rollups: from received devices once finalized, else from staged lines.
  const catalogItems: InfoItem[] = [
    {
      icon: Layers,
      label: INWARDS_STRINGS.batchDevices.categoryLabel,
      // Multiple categories collapse into the shared "pill + overflow" chip
      // (first category + "+N", full list on hover) — same as IMS Parts aliases.
      value: categoriesText,
      node: (
        <OverflowPillList
          items={categories}
          getItemKey={(c) => c.id}
          getItemLabel={categoryLabel}
          size="default"
          summaryLabel={INWARDS_STRINGS.batchDevices.categories}
          hoverTitle={INWARDS_STRINGS.batchDevices.categories}
        />
      ),
    },
    {
      icon: Tag,
      label: INWARDS_STRINGS.batchDevices.brandLabel,
      value: brandsText,
    },
    {
      icon: Box,
      label: INWARDS_STRINGS.batchDevices.conditionsLabel,
      value: conditionsText,
    },
    {
      icon: Package,
      label: INWARDS_STRINGS.batchDevices.unitsLabel,
      value: String(summary?.total_units ?? view.lines.length),
    },
  ];

  // Core batch attributes — always present.
  const infoItems: InfoItem[] = [
    {
      icon: Tag,
      label: INWARDS_STRINGS.batchDevices.inwardTypeLabel,
      value: INWARD_TYPE_LABELS[inwardType] ?? inwardType,
    },
    ...catalogItems,
    {
      icon: MapPin,
      label: INWARDS_STRINGS.batchDevices.warehouseLabel,
      value: warehouseText(batch),
    },
    {
      icon: User,
      label: INWARDS_STRINGS.batchDevices.receivedByLabel,
      value: receivedByText(batch),
    },
    {
      icon: CalendarDays,
      label: batch.closed_at
        ? INWARDS_STRINGS.batchDevices.closedLabel
        : INWARDS_STRINGS.batchDevices.createdLabel,
      value: formatIST_date(batchDateIso(batch)),
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{INWARDS_STRINGS.batchDevices.batchInformation}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {infoItems.map((item) => (
            <div key={item.label} className="flex items-start gap-2">
              <item.icon className="mt-0.5 size-4 text-muted-foreground" />
              <div className="min-w-0">
                <Typography variant="helper">{item.label}</Typography>
                {item.node ? (
                  <div className="mt-1">{item.node}</div>
                ) : (
                  <Typography variant="body-strong" className="break-words">
                    {item.value}
                  </Typography>
                )}
              </div>
            </div>
          ))}
        </div>

        <BatchSourceSection view={view} derived={derived} />
      </CardContent>
    </Card>
  );
}
