import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Typography } from "@/components/ui/typography";

import {
  REPLACEMENT_PART_FITTED_BY_LABEL,
  type ReplacementPartFittedBy,
} from "../../constants/replacement-request-status";
import type { DispatchFinaliseState } from "../../hooks/dispatches/useDispatchFinalise";
import { DISPATCH_DETAIL_STRINGS as S } from "./dispatch-detail.strings";

const FITTERS = Object.keys(REPLACEMENT_PART_FITTED_BY_LABEL) as ReplacementPartFittedBy[];

/** Before a replacement part ships into the customer's device: who fits it.
 *  Either way it is recorded as fitted when the dispatch is finalised. */
export function DispatchFitterDialog({ finalise }: { finalise: DispatchFinaliseState }) {
  return (
    <Dialog open={finalise.askOpen} onOpenChange={finalise.onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{S.fitterDialog.title}</DialogTitle>
          <DialogDescription>{S.fitterDialog.description}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-1.5 pt-1">
          <Label required>{S.fitterDialog.label}</Label>
          <RadioGroup
            value={finalise.fittedBy ?? ""}
            onValueChange={(v) => finalise.setFittedBy(v as ReplacementPartFittedBy)}
            className="flex flex-col gap-2"
          >
            {FITTERS.map((who) => (
              <label key={who} className="flex items-center gap-2">
                <RadioGroupItem value={who} />
                <Typography variant="body">{REPLACEMENT_PART_FITTED_BY_LABEL[who]}</Typography>
              </label>
            ))}
          </RadioGroup>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => finalise.onOpenChange(false)}>
            {S.fitterDialog.dismiss}
          </Button>
          <Button
            onClick={() => void finalise.confirm()}
            disabled={!finalise.fittedBy || finalise.isPending}
          >
            {finalise.isPending && (
              <Loader2 className="size-4 animate-spin" data-icon="inline-start" />
            )}
            {S.fitterDialog.confirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
