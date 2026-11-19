import { RotateCcw } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Typography } from "@/components/ui/typography";

import { useReturnWorkspace } from "./returnWorkspaceContext";
import { MATERIAL_ISSUE_STRINGS as S } from "./material-issue.strings";

const W = S.returnWorkspace;

// Notes are captured per unit inline, so Return only asks to confirm.
export function ReturnSubmitButton() {
  const { active, count, missingLocations, canSubmit, submitting, submit, errorMessage, confirmOpen, setConfirmOpen } =
    useReturnWorkspace();

  if (!active) return null;

  // Why-tooltip reason (§0.9) — the first unmet DATA gate shared by the trigger
  // and the confirm button; null when both are met.
  let blockReason: string | null = null;
  if (count === 0) blockReason = W.noUnitsSelected;
  else if (missingLocations > 0) blockReason = W.missingLocations(missingLocations);

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger render={<span className="inline-flex" />}>
            <Button size="sm" onClick={() => setConfirmOpen(true)} disabled={blockReason != null}>
              <RotateCcw className="size-3.5" data-icon="inline-start" />
              {count > 0 ? W.submitCount(count) : W.submit}
            </Button>
          </TooltipTrigger>
          {blockReason && <TooltipContent>{blockReason}</TooltipContent>}
        </Tooltip>
      </TooltipProvider>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{W.dialogTitle(count)}</DialogTitle>
            <DialogDescription>{W.confirmBody(count)}</DialogDescription>
          </DialogHeader>

          {errorMessage && (
            <Alert variant="destructive">
              <AlertDescription>
                <Typography variant="body">{errorMessage}</Typography>
              </AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              {W.cancel}
            </Button>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger render={<span className="inline-flex" />}>
                  <Button onClick={submit} disabled={!canSubmit || submitting}>
                    <RotateCcw className="size-4" data-icon="inline-start" />
                    {W.submit}
                  </Button>
                </TooltipTrigger>
                {blockReason && !submitting && <TooltipContent>{blockReason}</TooltipContent>}
              </Tooltip>
            </TooltipProvider>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
