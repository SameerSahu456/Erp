import { AsyncSelect } from "@/components/ui/async-select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Typography } from "@/components/ui/typography";
import { TableSearchInput } from "@/components/common/tables/TableSearchInput";
import { useNumberField } from "@/hooks/use-number-field";
import type { VariantListItem } from "@modules/ims";

import type { MoveStockPageState } from "../../hooks/stock-transfer/useMoveStockPage";
import { formatCondition } from "../../constants/condition";
import { FormBand } from "./MoveStockPageSections";
import { MoveStockUnitsTable } from "./MoveStockUnitsTable";
import { MOVE_STOCK_PAGE_STRINGS as P, STOCK_TRANSFER_STRINGS as S } from "./stock-transfer.strings";

function VariantPicker({ p }: { p: MoveStockPageState }) {
  return (
    <div className="w-full space-y-2 sm:max-w-md">
      <Label htmlFor="mv-variant" required>
        {P.variantLabel}
      </Label>
      <AsyncSelect<VariantListItem>
        id="mv-variant"
        value={p.variant}
        onValueChange={p.changeVariant}
        useOptions={p.useVariantOptions}
        toLabel={(v) => v.name}
        // Part name on top, variant name below (no SKU), as on the transfer details page.
        renderItem={(v) => (
          <span className="flex min-w-0 flex-col">
            <span className="truncate">{v.part_name || v.name}</span>
            <Typography variant="caption" tone="muted" className="truncate">
              {v.name}
            </Typography>
          </span>
        )}
        placeholder={P.variantPlaceholder}
        searchPlaceholder={P.variantSearch}
        disabled={!p.source.id}
        loadOnOpen
        className="w-full"
      />
    </div>
  );
}

/** One toolbar row for the one list: search on the left, quantity on the right.
 *  "Select all" is the table header's checkbox; the quantity is how many are
 *  ticked, and typing N ticks the first N rows shown. */
function UnitsToolbar({ p }: { p: MoveStockPageState }) {
  const sel = p.move.selection;
  const qtyField = useNumberField(p.quantity, p.setQuantity, { max: sel.filtered.length });
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <TableSearchInput
        value={sel.search}
        onChange={sel.setSearch}
        placeholder={P.unitSearch}
        clearAriaLabel={S.clearSearch}
        className="w-full sm:max-w-sm"
      />
      <div className="flex items-center gap-2">
        <Label htmlFor="mv-qty">{P.quantity}</Label>
        <Input id="mv-qty" {...qtyField} placeholder={P.quantityPlaceholder} className="w-56" />
      </div>
    </div>
  );
}

function UnitsBody({ p }: { p: MoveStockPageState }) {
  const { move } = p;
  const sel = move.selection;
  if (move.poolLoading) return <Skeleton className="h-40 w-full rounded-lg" />;
  if (move.pool.length === 0) {
    return (
      <Typography variant="body" tone="muted" className="py-6 text-center">
        {S.emptyUnits}
      </Typography>
    );
  }
  if (sel.filtered.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-6">
        <Typography variant="body" tone="muted">
          {S.noSearchMatch}
        </Typography>
        <Button variant="outline" size="sm" onClick={() => sel.setSearch("")}>
          {S.clearSearch}
        </Button>
      </div>
    );
  }
  return <MoveStockUnitsTable p={p} />;
}

/** The picked variant: name, condition, SKU and how many can move. */
function VariantCard({ p }: { p: MoveStockPageState }) {
  const { move } = p;
  const first = move.pool[0];
  const condition = formatCondition(first?.condition);
  // The From warehouse is right above, so the count needs no "in <warehouse>".
  const meta = [first?.skuCode, P.movableIn(move.pool.length, "")].filter(Boolean).join(" · ");
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="space-y-1 border-b border-border px-4 py-3.5">
        <div className="flex min-w-0 items-center gap-2">
          <Typography variant="card-title" truncate>
            {first?.variantLabel || p.variant?.label}
          </Typography>
          {condition && (
            <Badge variant="grey-soft" className="shrink-0">
              {condition}
            </Badge>
          )}
        </div>
        <Typography variant="helper" tone="muted">
          {meta}
        </Typography>
      </div>
      <div className="space-y-4 p-4">
        <UnitsToolbar p={p} />
        <UnitsBody p={p} />
      </div>
    </div>
  );
}

export function MoveStockUnitsBand({ p }: { p: MoveStockPageState }) {
  return (
    <FormBand>
      {/* Section heading as on the Inward form: card title + one-line helper. */}
      <div>
        <Typography variant="card-title">{P.unitsTitle}</Typography>
        <Typography variant="helper" tone="muted">
          {P.unitsHelp}
        </Typography>
      </div>
      <VariantPicker p={p} />
      {p.variant ? (
        <VariantCard p={p} />
      ) : (
        <Typography variant="body" tone="muted">
          {p.source.id ? P.pickVariantFirst : P.pickSourceFirst}
        </Typography>
      )}
    </FormBand>
  );
}
