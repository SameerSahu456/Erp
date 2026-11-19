import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { DispatchCreateFormState } from "../../hooks/dispatches/useDispatchCreateForm";
import { DISPATCH_CREATE_STRINGS as S } from "./dispatch-create.strings";

/** Wizard footer actions: Cancel/Next on step 0, Back/Create on step 1. */
export function DispatchCreateFooter({ form }: { form: DispatchCreateFormState }) {
  if (form.step === 0) {
    return (
      <>
        <Button variant="outline" onClick={form.cancel}>
          {S.cancel}
        </Button>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger render={<span className="inline-flex" />}>
              <Button onClick={() => form.setStep(1)} disabled={!form.canProceed}>
                {S.next}
              </Button>
            </TooltipTrigger>
            {form.nextBlockReason && (
              <TooltipContent>{form.nextBlockReason}</TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </>
    );
  }
  const { busy } = form;
  return (
    <>
      <Button variant="outline" onClick={() => form.setStep(0)}>
        {S.back}
      </Button>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger render={<span className="inline-flex" />}>
            <Button
              onClick={form.handleCreate}
              disabled={busy || form.src.selected.size === 0}
            >
              {busy ? S.creating : S.createBtn}
            </Button>
          </TooltipTrigger>
          {form.createBlockReason && !busy && (
            <TooltipContent>{form.createBlockReason}</TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>
    </>
  );
}
