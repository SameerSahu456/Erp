import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Typography } from "@/components/ui/typography";
import { StatusBadge } from "@/components/common/display/StatusBadge";
import { TruncatedText } from "@/components/common/display/TruncatedText";
import { EMPTY_VALUE } from "@/shared/constants";

import type { MoveStockPageState } from "../../hooks/stock-transfer/useMoveStockPage";
import { CONDITION_VARIANT, formatCondition } from "../../constants/condition";
import type { MovableUnit } from "./move-stock-helpers";
import { MOVE_STOCK_PAGE_STRINGS as P, STOCK_TRANSFER_STRINGS as S } from "./stock-transfer.strings";

function HeadCell({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <TableHead className={className}>
      {/* Normal-case small grey header, as in the Inward form's line tables. */}
      <Typography variant="caption" tone="muted">
        {children}
      </Typography>
    </TableHead>
  );
}

function UnitRow({
  unit: u,
  checked,
  isTransfer,
  onToggle,
}: {
  unit: MovableUnit;
  checked: boolean;
  isTransfer: boolean;
  onToggle: (id: string) => void;
}) {
  return (
    <TableRow data-state={checked ? "selected" : undefined} className="cursor-pointer" onClick={() => onToggle(u.id)}>
      <TableCell className="w-10" onClick={(e) => e.stopPropagation()}>
        <Checkbox checked={checked} onCheckedChange={() => onToggle(u.id)} aria-label={u.internalSerial} />
      </TableCell>
      <TableCell className="max-w-60">
        <Typography variant="body-strong" className="block">
          {u.internalSerial}
        </Typography>
        {/* No maker serial → leave the line empty, not a dash (same as transfer details). */}
        {u.manufacturerSerial && (
          <TruncatedText value={u.manufacturerSerial} className="max-w-full text-muted-foreground" />
        )}
        {/* Table cells don't wrap by default; without whitespace-normal the note ran over the next column. */}
        {isTransfer && u.status === "in_operations" && (
          <Typography variant="caption" tone="warning" className="block whitespace-normal">
            {S.transferRestartsInspection}
          </Typography>
        )}
      </TableCell>
      <TableCell className="max-w-60">
        <TruncatedText value={u.variantLabel || u.partName} className="max-w-full" />
        <TruncatedText value={u.skuCode || u.partNumber || EMPTY_VALUE} className="max-w-full text-muted-foreground" />
      </TableCell>
      <TableCell className="max-w-40">
        <TruncatedText value={u.categoryName} className="max-w-full" />
      </TableCell>
      <TableCell>
        {u.condition ? (
          <StatusBadge variant={CONDITION_VARIANT[u.condition] ?? "neutral"}>{formatCondition(u.condition)}</StatusBadge>
        ) : (
          EMPTY_VALUE
        )}
      </TableCell>
      <TableCell className="max-w-44">
        {u.locationName ? (
          <Badge variant="outline" className="max-w-full">
            <TruncatedText value={u.locationName} className="max-w-full" />
          </Badge>
        ) : (
          <Badge variant="grey-soft">{S.unassigned}</Badge>
        )}
      </TableCell>
    </TableRow>
  );
}

/** The units of the picked variant (filtered by the serial search in serial
 *  mode). In variant mode the quantity ticks rows here, which stay editable. */
export function MoveStockUnitsTable({ p }: { p: MoveStockPageState }) {
  const { move } = p;
  const sel = move.selection;
  return (
    // A wide 2-D table: it scrolls inside its own box (§8.7), never the page.
    // `[&>div]:overflow-visible` turns off the shared Table's own overflow-x
    // wrapper so this div is the only scroll box and the sticky header holds.
    <div className="max-h-[30rem] overflow-auto rounded-lg border border-border [&>div]:overflow-visible">
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-muted">
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-10">
              <Checkbox checked={sel.allFilteredSelected} onCheckedChange={sel.toggleAllFiltered} aria-label={P.selectAll} />
            </TableHead>
            <HeadCell>{P.colBarcode}</HeadCell>
            <HeadCell>{P.colPartVariant}</HeadCell>
            <HeadCell>{P.colCategory}</HeadCell>
            <HeadCell>{P.colCondition}</HeadCell>
            <HeadCell>{P.colRackBin}</HeadCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {p.units.map((u) => (
            <UnitRow
              key={u.id}
              unit={u}
              checked={sel.selected.has(u.id)}
              isTransfer={move.isTransfer}
              onToggle={sel.toggle}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
