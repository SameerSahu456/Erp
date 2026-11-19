import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MATERIAL_ISSUE_STRINGS as S } from "./material-issue.strings";
import type { DemandLine } from "./material-issue-form-helpers";

interface AddLineItemSelectProps {
  addable: DemandLine[];
  remainingFor: (line: DemandLine) => number;
  availableFor: (line: DemandLine) => number | null;
  onAdd: (sourceLineId: string) => void;
}

/** Pick a source line → adds a row for it (you see which one). */
export function AddLineItemSelect({
  addable,
  remainingFor,
  availableFor,
  onAdd,
}: AddLineItemSelectProps) {
  return (
    <div className="space-y-1.5 rounded-lg border border-dashed bg-muted/20 p-3">
      <Label>{S.form.lines.addLineItem}</Label>
      <Select
        value={undefined}
        onValueChange={(v) => {
          if (v) onAdd(v);
        }}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder={S.form.lines.addLinePlaceholder} />
        </SelectTrigger>
        <SelectContent>
          {addable.map((a) => {
            const avail = availableFor(a);
            return (
              <SelectItem key={a.sourceLineId} value={a.sourceLineId}>
                {a.label} · {S.form.lines.pending} {remainingFor(a)}
                {avail !== null && ` · ${avail} ${S.form.lines.availableHere}`}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}
