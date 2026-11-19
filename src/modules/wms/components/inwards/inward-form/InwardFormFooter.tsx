import { Check, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Typography } from "@/components/ui/typography";

import type { InwardForm } from "./useInwardForm";
import { INWARDS_STRINGS } from "../inwards.strings";

const F = INWARDS_STRINGS.footer;

// Why Save/Create is disabled (§0.9) — the DATA/validation gate only, never the
// in-flight mutation; worded to the first unmet serial gate (BOM → tracked → duplicate).
function serialBlockReason(f: InwardForm): string | null {
  return firstReason([
    [f.bomIncomplete, F.bomSerialHint],
    [f.serialIncomplete, F.serialHint],
    [f.hasDuplicateSerials, F.duplicateSerialHint],
  ]);
}

function NextAction({ f }: { f: InwardForm }) {
  const blocked = !f.isEdit && !f.canContinue;
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger render={<span className="inline-flex" />}>
          <Button onClick={() => f.setStep(1)} disabled={blocked}>
            {F.nextLineItems}
          </Button>
        </TooltipTrigger>
        {blocked && <TooltipContent>{F.nextDisabledHint}</TooltipContent>}
      </Tooltip>
    </TooltipProvider>
  );
}

// Block Save while a tracked line is missing its serial — otherwise buildPoLines
// silently drops that zero-unit line (create mode already guards via canSubmit).
function SaveAction({ f }: { f: InwardForm }) {
  const { updateDraft, stagedCount } = f;
  const reason = serialBlockReason(f);
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger render={<span className="inline-flex" />}>
          <Button onClick={f.handleSave} disabled={updateDraft.isPending || reason !== null}>
            {updateDraft.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" data-icon="inline-start" />
                {F.saving}
              </>
            ) : (
              <>
                <Check className="size-4" data-icon="inline-start" />
                {F.saveChanges}
                {stagedCount > 0 ? F.unitCountSuffix(stagedCount) : ""}
              </>
            )}
          </Button>
        </TooltipTrigger>
        {reason && !updateDraft.isPending && <TooltipContent>{reason}</TooltipContent>}
      </Tooltip>
    </TooltipProvider>
  );
}

function CreateAction({ f }: { f: InwardForm }) {
  const reason = serialBlockReason(f);
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger render={<span className="inline-flex" />}>
          <Button onClick={f.handleCreate} disabled={!f.canSubmit}>
            {f.createBatch.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" data-icon="inline-start" />
                {F.creating}
              </>
            ) : (
              <>
                <Check className="size-4" data-icon="inline-start" />
                {createLabel(f.stagedCount, f.isReturn)}
              </>
            )}
          </Button>
        </TooltipTrigger>
        {reason && !f.createBatch.isPending && <TooltipContent>{reason}</TooltipContent>}
      </Tooltip>
    </TooltipProvider>
  );
}

// The step-dependent primary action — Next (step 1), Save (edit), or Create.
function PrimaryAction({ f }: { f: InwardForm }) {
  if (f.step === 0) return <NextAction f={f} />;
  if (f.isEdit) return <SaveAction f={f} />;
  return <CreateAction f={f} />;
}

/** The first reason whose condition holds, or null. */
function firstReason(checks: [boolean, string][]): string | null {
  return checks.find(([hit]) => hit)?.[1] ?? null;
}

/** Create-button label: "Create batch · N units" with staged units, else the
 *  empty-batch wording. */
function createLabel(stagedCount: number, isReturn: boolean): string {
  if (stagedCount > 0) {
    return `${isReturn ? F.receiveReturn : F.createBatch}${F.unitCountSuffix(stagedCount)}`;
  }
  return isReturn ? F.createReturnBatch : F.createEmptyBatch;
}

/** Footer navigation: all actions right-aligned — the BOM-incomplete hint,
 *  Cancel, and the step-dependent primary action, with Cancel sitting beside the
 *  primary button rather than off on the far left. */
export function InwardFormFooter({ f }: { f: InwardForm }) {
  const {
    goCancel,
    step,
    bomIncomplete,
    serialIncomplete,
    hasDuplicateSerials,
  } = f;
  return (
    // §3.2 — a sticky, full-width bottom bar (mirrors FormPageShell's footer)
    // so the actions stay reachable while scrolling a long line-item form,
    // instead of a static right-aligned row that scrolls away.
    <div className="sticky bottom-0 left-0 right-0 z-30 -mx-5 -mb-5 mt-2 border-t border-border bg-card/95 px-5 py-3 shadow-[0_-4px_16px_-6px_rgb(var(--shadow-rgb)/0.06),0_-1px_0_rgb(var(--shadow-rgb)/0.04)] backdrop-blur supports-[backdrop-filter]:bg-card/80 lg:-mx-7 lg:-mb-7 lg:px-7">
      <div className="mx-auto flex max-w-[1600px] items-center justify-end gap-3">
        {step === 1 && bomIncomplete && (
          <Typography variant="helper" tone="danger">
            {F.bomSerialHint}
          </Typography>
        )}
        {step === 1 && !bomIncomplete && serialIncomplete && (
          <Typography variant="helper" tone="danger">
            {F.serialHint}
          </Typography>
        )}
        {step === 1 &&
          !bomIncomplete &&
          !serialIncomplete &&
          hasDuplicateSerials && (
            <Typography variant="helper" tone="danger">
              {F.duplicateSerialHint}
            </Typography>
          )}
        <Button variant="outline" onClick={goCancel}>
          {F.cancel}
        </Button>
        <PrimaryAction f={f} />
      </div>
    </div>
  );
}
