import { Loader2 } from "lucide-react";

import { OperationDialog } from "@/components/common/dialogs/OperationDialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Typography } from "@/components/ui/typography";

import {
  useImportAdjustment,
  type ImportAdjustmentInit,
  type ImportAdjustmentState,
} from "../../hooks/stock-adjustments/useImportAdjustment";
import { ImportAdjustmentFields } from "./ImportAdjustmentFields";
import { ImportPreviewTable } from "./ImportPreviewTable";
import { STOCK_ADJUSTMENTS_STRINGS as S } from "./stock-adjustments.strings";
import { WhyDisabled } from "./WhyDisabled";

const I = S.import;

function ImportFooter({ state, requestClose }: { state: ImportAdjustmentState; requestClose: () => void }) {
  return (
    <>
      <Button variant="outline" onClick={requestClose} disabled={state.creating}>
        {I.cancel}
      </Button>
      <WhyDisabled reason={state.previewBlocker}>
        <Button
          variant="outline"
          onClick={() => void state.runPreview()}
          disabled={!!state.previewBlocker || state.previewing}
        >
          {state.previewing ? <Loader2 className="mr-1.5 size-4 animate-spin" aria-hidden /> : null}
          {I.preview}
        </Button>
      </WhyDisabled>
      <WhyDisabled reason={state.createBlocker}>
        <Button
          onClick={() => void state.createDraft()}
          disabled={!!state.createBlocker || state.creating || state.previewing}
        >
          {state.creating ? <Loader2 className="mr-1.5 size-4 animate-spin" aria-hidden /> : null}
          {I.createDraft}
        </Button>
      </WhyDisabled>
    </>
  );
}

function ImportResult({ state }: { state: ImportAdjustmentState }) {
  const { result } = state;
  if (!result) return null;
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Typography variant="body-strong" tone={result.error_rows > 0 ? "danger" : "success"}>
          {I.summary(result.total_rows, result.error_rows)}
        </Typography>
        <div className="flex items-center gap-2">
          <Switch id="sai-errors-only" checked={state.errorsOnly} onCheckedChange={state.setErrorsOnly} />
          <Label htmlFor="sai-errors-only">{I.errorsOnly}</Label>
        </div>
      </div>
      {result.lines == null ? <Typography variant="helper" tone="danger">{I.blocked}</Typography> : null}
      <ImportPreviewTable rows={state.rows} />
    </div>
  );
}

/** Excel/CSV import (D11). Mounted only while open, so each opening starts
 *  clean. It can't be closed mid-create; the hook navigates to the new draft. */
export function ImportAdjustmentDialog({
  onClose,
  ...init
}: ImportAdjustmentInit & { onClose: () => void }) {
  const state = useImportAdjustment(init);
  return (
    <OperationDialog
      open
      onOpenChange={(open) => {
        if (!open && !state.creating) onClose();
      }}
      isDirty={state.form.formState.isDirty && !state.creating}
      title={I.title}
      description={I.description}
      footer={({ requestClose }) => <ImportFooter state={state} requestClose={requestClose} />}
      className="sm:max-w-4xl"
    >
      <div className="space-y-4">
        <ImportAdjustmentFields state={state} />
        <ImportResult state={state} />
      </div>
    </OperationDialog>
  );
}
