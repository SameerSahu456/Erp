import { useState } from "react";
import { FormProvider } from "react-hook-form";
import { FileUp } from "lucide-react";

import { FormPageShell } from "@/components/page-shells";
import { Button } from "@/components/ui/button";
import { useNavigateBack } from "@/hooks/use-navigate-back";

import { useStockAdjustmentForm } from "../../hooks/stock-adjustments/useStockAdjustmentForm";
import type { ImportAdjustmentInit } from "../../hooks/stock-adjustments/useImportAdjustment";
import type { StockAdjustment } from "../../stock-adjustments.api";
import { AdjustmentHeaderFields } from "./AdjustmentHeaderFields";
import { AdjustmentLinesEditor } from "./AdjustmentLinesEditor";
import { GeneralErrorsAlert } from "./GeneralErrorsAlert";
import { ImportAdjustmentDialog } from "./ImportAdjustmentDialog";
import { STOCK_ADJUSTMENTS_STRINGS as S } from "./stock-adjustments.strings";

const LIST_HREF = "/ims/stock-adjustments";

/** The draft form. Mounted only once the existing record (edit) is loaded,
 *  so its default values are the saved ones. */
export function StockAdjustmentForm({ existing }: { existing?: StockAdjustment }) {
  const state = useStockAdjustmentForm(existing);
  const [importInit, setImportInit] = useState<ImportAdjustmentInit | null>(null);
  const backHref = existing ? `${LIST_HREF}/${existing.id}` : LIST_HREF;
  const navigateBack = useNavigateBack(backHref);

  // Import builds its own draft, so a dirty form asks to discard first; the
  // discard resets the form so the import's navigation isn't intercepted.
  const openImport = () => {
    const init = {
      initialWarehouse: { id: state.warehouseId, name: state.warehouseName },
      initialReason: state.reason,
    };
    state.guard.attempt(() => {
      state.form.reset();
      setImportInit(init);
    });
  };

  // Offered on a NEW adjustment only.
  const importAction = existing ? undefined : (
    <Button type="button" variant="outline" onClick={openImport}>
      <FileUp className="mr-1.5 size-4" />
      {S.list.import}
    </Button>
  );

  return (
    <FormPageShell
      title={existing ? S.form.editTitle(existing.adjustment_number) : S.form.createTitle}
      subtitle={S.form.subtitle}
      backHref={backHref}
      saveLabel={S.form.save}
      saving={state.saving}
      guard={state.guard}
      onSave={() => void state.submit()}
      onCancel={navigateBack}
      footerLeft={existing ? undefined : S.form.attachmentsHint}
    >
      <FormProvider {...state.form}>
        <GeneralErrorsAlert title={S.form.generalErrors} messages={state.serverErrors.general} />
        <AdjustmentHeaderFields state={state} />
        <AdjustmentLinesEditor state={state} importAction={importAction} />
      </FormProvider>
      {importInit ? <ImportAdjustmentDialog {...importInit} onClose={() => setImportInit(null)} /> : null}
    </FormPageShell>
  );
}
