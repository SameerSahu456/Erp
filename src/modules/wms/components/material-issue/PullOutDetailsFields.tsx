import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PullOutDestination } from "./issued-components-panel-helpers";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Typography } from "@/components/ui/typography";
import type { PullOutState } from "../../hooks/material-issue/useIssuedComponentsPanel";
import { RackBinLocationPicker } from "../shared/RackBinLocationPicker";
import { MATERIAL_ISSUE_STRINGS as S } from "./material-issue.strings";
import { MI_NOTE_MAX_LENGTH } from "./returnable-lines";

/** Optional manufacturer serial of the part being pulled out. */
export function PullOutSerialField({ rm }: { rm: PullOutState }) {
  return (
    <div className="min-w-0 space-y-1.5">
      <Label htmlFor="mi-panel-rm-serial">{S.pullOut.serialOptionalLabel}</Label>
      <Input
        id="mi-panel-rm-serial"
        value={rm.serial}
        onChange={(e) => rm.setSerial(e.target.value)}
        placeholder={S.pullOut.serialPlaceholder}
      />
    </div>
  );
}

const DESTINATIONS: PullOutDestination[] = ["available", "repair", "scrap"];

/** Where the pulled part goes next: QC (default), repair or scrap. */
export function PullOutDestinationField({ rm }: { rm: PullOutState }) {
  return (
    <div className="min-w-0 space-y-1.5">
      <Label>{S.pullOut.destinationLabel}</Label>
      <Select
        value={rm.destination}
        onValueChange={(v) => rm.setDestination((v ?? "available") as PullOutDestination)}
      >
        <SelectTrigger className="w-full">
          <SelectValue>{S.pullOut.destinations[rm.destination]}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {DESTINATIONS.map((d) => (
            <SelectItem key={d} value={d}>
              {S.pullOut.destinations[d]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/** Destination rack/bin + note for a pull-out (shown once a part is picked). */
export function PullOutDetailsFields({
  rm,
  warehouseId,
}: {
  rm: PullOutState;
  warehouseId: string;
}) {
  return (
    <>
      <RackBinLocationPicker
        warehouseId={warehouseId}
        enabled={rm.hasPart}
        value={rm.location}
        onChange={(id) => {
          if (!id) rm.clearLocation();
          else rm.setLocation(id);
        }}
        onPick={rm.pickLocation}
      />

      <div className="min-w-0 space-y-1.5">
        <Label htmlFor="mi-panel-rm-note">{S.issuedComponents.removeNoteLabel}</Label>
        <Textarea
          id="mi-panel-rm-note"
          value={rm.note}
          onChange={(e) => rm.setNote(e.target.value)}
          placeholder={S.issuedComponents.removeNotePlaceholder}
          rows={2}
          maxLength={MI_NOTE_MAX_LENGTH}
        />
        <div className="flex justify-end">
          <Typography variant="helper" tone="muted">
            {S.charCount(rm.note.length, MI_NOTE_MAX_LENGTH)}
          </Typography>
        </div>
      </div>
    </>
  );
}
