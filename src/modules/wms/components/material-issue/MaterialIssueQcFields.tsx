import { Check, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Typography } from "@/components/ui/typography";

import type { useMaterialIssueQc } from "../../hooks/material-issue/useMaterialIssueQc";
import { ChecklistFields } from "../operations/ChecklistFields";
import { StagePhotoUpload } from "../operations/StagePhotoUpload";
import { MATERIAL_ISSUE_STRINGS as S } from "./material-issue.strings";
import { MI_NOTE_MAX_LENGTH } from "./returnable-lines";
import type { QcVerdict } from "./material-issue-qc-helpers";

type QcController = ReturnType<typeof useMaterialIssueQc>;

// The outward-QC verdicts, rendered as a tactile selector.
const QC_VERDICTS = [
  { key: "pass", label: S.qc.resultPass, icon: Check },
  { key: "fail", label: S.qc.resultFail, icon: X },
] as const;

// Selected-state classes per verdict (token-only). Unselected is a plain outline.
const VERDICT_SELECTED: Record<QcVerdict, string> = {
  pass: "border-success bg-success/10 text-success",
  fail: "border-destructive bg-destructive/10 text-destructive",
};

/** Checklist (or its loading line), the verdict picker, photos and notes. */
export function MaterialIssueQcFields({ qc }: { qc: QcController }) {
  return (
    <>
      {qc.checklistLoading ? (
        <Typography variant="helper" tone="muted" asChild>
          <p>{S.qc.checklistLoading}</p>
        </Typography>
      ) : (
        qc.hasChecklist &&
        qc.checklistItems.length > 0 && (
          <div className="min-w-0 space-y-2">
            <Label>{S.qc.checklistLabel}</Label>
            <ChecklistFields
              items={qc.checklistItems}
              value={qc.responses}
              onChange={qc.setResponses}
              opId={qc.op?.id}
            />
          </div>
        )
      )}

      {qc.resultRequired && !qc.checklistLoading && (
        <QcVerdictPicker result={qc.result} onChange={qc.setResult} />
      )}

      {qc.op && (
        <StagePhotoUpload
          value={qc.photoFiles}
          onChange={qc.setPhotoFiles}
          label={S.qc.photoLabel}
          optional
        />
      )}

      <div className="min-w-0 space-y-1.5">
        <Label htmlFor="mi-qc-notes">{S.qc.notesLabel}</Label>
        <Textarea
          id="mi-qc-notes"
          value={qc.notes}
          onChange={(e) => qc.setNotes(e.target.value)}
          placeholder={S.qc.notesPlaceholder}
          rows={2}
          maxLength={MI_NOTE_MAX_LENGTH}
        />
        <div className="flex justify-end">
          <Typography variant="helper" tone="muted">
            {S.charCount(qc.notes.length, MI_NOTE_MAX_LENGTH)}
          </Typography>
        </div>
      </div>
    </>
  );
}

function QcVerdictPicker({
  result,
  onChange,
}: {
  result: QcVerdict | null;
  onChange: (v: QcVerdict) => void;
}) {
  return (
    <div className="min-w-0 space-y-1.5">
      <Label required>{S.qc.resultLabel}</Label>
      {/* Compact 3-up segmented choice: one row, icon + label inline,
          semantic tint on the selected verdict. */}
      <div className="grid grid-cols-2 gap-1.5">
        {QC_VERDICTS.map((v) => {
          const selected = result === v.key;
          return (
            <button
              key={v.key}
              type="button"
              onClick={() => onChange(v.key)}
              aria-pressed={selected}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-md border px-2 py-2 transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-ring",
                selected
                  ? VERDICT_SELECTED[v.key]
                  : "border-input text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <v.icon className="size-4 shrink-0" />
              <Typography variant="body-strong" tone="inherit" asChild>
                <span>{v.label}</span>
              </Typography>
            </button>
          );
        })}
      </div>
      <Typography variant="helper" tone="muted" asChild>
        <p>{S.qc.resultHelp}</p>
      </Typography>
    </div>
  );
}
