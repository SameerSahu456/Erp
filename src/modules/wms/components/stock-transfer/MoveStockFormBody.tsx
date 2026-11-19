import { FormPageShell } from "@/components/page-shells";

import { TRANSFERS_LIST_PATH, useMoveStockPage } from "../../hooks/stock-transfer/useMoveStockPage";
import { DestinationBand, MoveStockFooterSummary, NoteBand, TransferTypeBand } from "./MoveStockPageSections";
import { MoveStockUnitsBand } from "./MoveStockUnitsBand";
import { MOVE_STOCK_PAGE_STRINGS as P, STOCK_TRANSFER_STRINGS as S } from "./stock-transfer.strings";

/** Full-page Move Stock (from Warehouse Transfers). Same move logic as the
 *  dialog on the part / variant / device / batch pages, laid out as a form. */
export function MoveStockFormBody() {
  const p = useMoveStockPage();
  const { move } = p;
  return (
    <FormPageShell
      title={P.title}
      subtitle={p.transferType === "external" ? S.descriptionTransfer : S.descriptionRelocate}
      backHref={TRANSFERS_LIST_PATH}
      guard={p.guard}
      onCancel={p.cancel}
      onSave={() => void p.submit()}
      saveLabel={P.move}
      saving={move.isPending}
      canSave={move.selection.selected.size > 0}
      footerLeft={<MoveStockFooterSummary p={p} />}
    >
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <TransferTypeBand p={p} />
        <DestinationBand p={p} />
        <MoveStockUnitsBand p={p} />
        <NoteBand p={p} />
      </div>
    </FormPageShell>
  );
}
