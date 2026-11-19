import { Loader2 } from "lucide-react";

import { OperationDialog } from "@/components/common/dialogs/OperationDialog";
import { Button } from "@/components/ui/button";

import { useNewExportForm } from "../../hooks/exports/useNewExportForm";
import { NewExportFields } from "./NewExportFields";
import { EXPORTS_STRINGS } from "./exports.strings";

const S = EXPORTS_STRINGS.create;

/** "New export" on My Exports — the same request the page Export menus send,
 *  with the filters chosen here instead of read from a list page. */
export function NewExportDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { form, isStock, setOpen, submit, pending } = useNewExportForm(onOpenChange);
  return (
    <OperationDialog
      open={open}
      onOpenChange={setOpen}
      title={S.title}
      description={S.description}
      isDirty={form.formState.isDirty}
      footer={({ requestClose }) => (
        <>
          <Button variant="outline" onClick={requestClose} disabled={pending}>
            {S.cancel}
          </Button>
          <Button onClick={() => void submit()} disabled={pending}>
            {pending ? <Loader2 className="mr-1.5 size-4 animate-spin" aria-hidden /> : null}
            {S.submit}
          </Button>
        </>
      )}
    >
      <NewExportFields form={form} isStock={isStock} />
    </OperationDialog>
  );
}
