import type { MouseEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Typography } from "@/components/ui/typography";
import { StatusBadge } from "@/components/common/display/StatusBadge";
import { OverflowPillList } from "@/components/common/display/OverflowPillList";

import { EditablePriceCell } from "../stock/EditablePriceCell";
import { formatINR } from "../../lib/format";
import { PARTS_STRINGS } from "./parts.strings";
import { conditionVariant } from "./parts-body-helpers";
import { partRowHref } from "./parts-list.columns";

const L = PARTS_STRINGS.list;
type Row = Record<string, unknown>;

export function PartsDash() {
  return (
    <Typography asChild variant="body" tone="muted">
      <span>{L.dash}</span>
    </Typography>
  );
}

export function PartSkuLink({ row, value }: { row: Row; value: string }) {
  return (
    <Typography asChild variant="helper" tone="primary">
      <Link to={partRowHref(row)} className="font-mono hover:underline">
        {value}
      </Link>
    </Typography>
  );
}

export function PartTypeBadge({ value }: { value: string }) {
  return (
    <StatusBadge variant={value === L.rowType.parent ? "info" : "neutral"}>{value}</StatusBadge>
  );
}

export function PartAliasesCell({ aliases }: { aliases: string[] | undefined }) {
  return (
    <OverflowPillList
      items={aliases ?? []}
      getItemKey={(a) => String(a)}
      getItemLabel={(a) => String(a)}
      size="default"
      summaryLabel={L.summaryLabel}
      hoverTitle={L.hoverTitle}
    />
  );
}

export function PartConditionCell({ value }: { value: unknown }) {
  if (value === L.dash || value == null) return <PartsDash />;
  return <StatusBadge variant={conditionVariant(value as string)}>{String(value)}</StatusBadge>;
}

export function PartQtyCell({ value }: { value: unknown }) {
  if (value == null) return <PartsDash />;
  return (
    <Typography asChild variant="body" tone="inherit" numeric>
      <span>{String(value)}</span>
    </Typography>
  );
}

/** Variant rows edit inline for price writers; parent rows (no own price) stay read-only. */
export function PartPriceCell({ row, value, canEditPrice }: { row: Row; value: unknown; canEditPrice: boolean }) {
  if (value == null) return <PartsDash />;
  if (row._kind === "variant" && canEditPrice) {
    return <EditablePriceCell variantId={row._id as string} value={value as number} />;
  }
  return (
    <Typography asChild variant="body-strong" tone="inherit" numeric>
      <span>{formatINR(value as number)}</span>
    </Typography>
  );
}

interface RowActionsProps {
  label: string;
  editHref: string;
  editTitle: string;
  deleteTitle: string;
  testIdPrefix: "part" | "variant";
  deleteDisabled: boolean;
  onDelete: () => void;
}

/** Edit + Delete icon buttons; clicks never bubble to the row's navigation. */
export function PartRowActions(props: RowActionsProps) {
  const navigate = useNavigate();
  const stop = (e: MouseEvent) => e.stopPropagation();
  return (
    <div className="inline-flex items-center gap-1" onClick={stop}>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
        onClick={(e) => {
          stop(e);
          navigate(props.editHref);
        }}
        aria-label={L.editAriaLabel(props.label)}
        title={props.editTitle}
        data-testid={`${props.testIdPrefix}-edit-button`}
      >
        <Pencil className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
        onClick={(e) => {
          stop(e);
          props.onDelete();
        }}
        disabled={props.deleteDisabled}
        aria-label={L.deleteAriaLabel(props.label)}
        title={props.deleteTitle}
        data-testid={`${props.testIdPrefix}-delete-button`}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
