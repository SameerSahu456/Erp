import type { ReactNode } from "react";

import { OverflowPillList } from "@/components/common/display/OverflowPillList";
import { StatusBadge } from "@/components/common/display/StatusBadge";
import { Typography } from "@/components/ui/typography";
import { EMPTY_VALUE } from "@/shared/constants";

import type { Warehouse } from "../../api";
import { displayName } from "./warehouse-display";
import { CONDITION_LABELS, CONDITION_VARIANT } from "../../constants/condition";
import { WAREHOUSE_LOCATIONS_STRINGS as S } from "./warehouse-locations.strings";

function InfoBlock({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0 space-y-1 md:px-5 md:first:pl-0 md:last:pr-0">
      <Typography variant="caption" tone="muted">
        {label}
      </Typography>
      {children}
    </div>
  );
}

/** Where the warehouse is and what it may hold. */
export function WarehouseInfoCard({
  warehouse,
  eligibleCategories,
}: {
  warehouse: Warehouse;
  eligibleCategories: string[];
}) {
  const address = [
    displayName(warehouse.address_line1),
    displayName(warehouse.address_line2),
    `${displayName(warehouse.city)}, ${displayName(warehouse.state)} ${warehouse.pincode}`,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3.5 shadow-sm">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)] md:gap-0 md:divide-x md:divide-border">
        <InfoBlock label={S.info.address}>
          <Typography variant="body" className="break-words">
            {address}
          </Typography>
        </InfoBlock>
        <InfoBlock label={S.info.conditions}>
          {warehouse.conditions.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1.5">
              {warehouse.conditions.map((condition) => (
                <StatusBadge key={condition} variant={CONDITION_VARIANT[condition] ?? "neutral"}>
                  {CONDITION_LABELS[condition] ?? condition}
                </StatusBadge>
              ))}
            </div>
          ) : (
            <Typography variant="body" tone="muted">
              {EMPTY_VALUE}
            </Typography>
          )}
        </InfoBlock>
        <InfoBlock label={S.info.categories}>
          {/* Same pill + "+N" + hover list as the GRN list's Category column. */}
          <OverflowPillList
            items={eligibleCategories}
            getItemLabel={(name) => name}
            size="default"
            emptyLabel={EMPTY_VALUE}
          />
        </InfoBlock>
      </div>
      {warehouse.description && (
        <div className="mt-3 space-y-1 border-t border-border pt-3">
          <Typography variant="caption" tone="muted">
            {S.info.description}
          </Typography>
          <Typography variant="body" className="whitespace-pre-wrap break-words">
            {warehouse.description}
          </Typography>
        </div>
      )}
    </div>
  );
}
