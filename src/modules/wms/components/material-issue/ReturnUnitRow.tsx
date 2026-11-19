import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Typography } from "@/components/ui/typography";
import { TruncatedSerial } from "@/components/common/display/TruncatedSerial";
import { cn } from "@/lib/utils";

import { RackBinLocationPicker } from "../shared/RackBinLocationPicker";
import { useReturnWorkspace } from "./returnWorkspaceContext";
import { MATERIAL_ISSUE_STRINGS as S } from "./material-issue.strings";
import { MI_NOTE_MAX_LENGTH } from "./returnable-lines";

const W = S.returnWorkspace;
const NOTE_ROWS = 2;

interface Props {
  lineId: string;
  title: string;
  serial: string;
  disabled?: boolean;
  onToggle: () => void;
  emphasis?: boolean;
}

// One unit row: checkbox + identity, plus location / note / re-test once selected for return.
export function ReturnUnitRow({ lineId, title, serial, disabled, onToggle, emphasis }: Props) {
  const ws = useReturnWorkspace();
  const checked = ws.selectedIds.has(lineId);
  const note = ws.noteFor(lineId);
  const sendToQc = ws.qcFor(lineId);

  return (
    <div className="space-y-2 py-2">
      <label className={cn("flex min-w-0 items-center gap-2.5", disabled ? "cursor-default" : "cursor-pointer")}>
        <Checkbox checked={checked} disabled={disabled} onCheckedChange={onToggle} />
        <span className="min-w-0">
          <Typography variant={emphasis ? "body-strong" : "body"} truncate asChild>
            <span className="block">{title}</span>
          </Typography>
          <Typography variant="mono" tone="muted" asChild>
            <TruncatedSerial value={serial} className="max-w-full" mono={false} />
          </Typography>
        </span>
      </label>
      {checked && (
        <div className="space-y-2 pl-7">
          <RackBinLocationPicker
            warehouseId={ws.warehouseId}
            enabled
            value={ws.locationFor(lineId)}
            onChange={(v) => ws.setLocation(lineId, v)}
          />
          <div className="min-w-0 space-y-1">
            <Label>{W.noteLabel}</Label>
            <Textarea
              value={note}
              onChange={(e) => ws.setNote(lineId, e.target.value)}
              placeholder={W.notePlaceholder}
              rows={NOTE_ROWS}
              maxLength={MI_NOTE_MAX_LENGTH}
            />
            <Typography variant="caption" tone="muted" asChild>
              <span className="block text-right">{W.noteCount(note.length, MI_NOTE_MAX_LENGTH)}</span>
            </Typography>
          </div>
          {/* Asked per unit: a machine an engineer opened and stripped is not
              the same question as the untouched RAM beside it. Off by default. */}
          <label className="flex min-w-0 cursor-pointer items-start gap-2.5">
            <Checkbox checked={sendToQc} onCheckedChange={() => ws.setQc(lineId, !sendToQc)} />
            <span className="min-w-0">
              <Typography variant="body" asChild>
                <span className="block">{W.sendToQcLabel}</span>
              </Typography>
              <Typography variant="helper" tone="muted" asChild>
                <span className="block">{sendToQc ? W.sendToQcOnHelp : W.sendToQcOffHelp}</span>
              </Typography>
            </span>
          </label>
        </div>
      )}
    </div>
  );
}
