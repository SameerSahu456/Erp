import { FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { MaterialIssueHeaderState } from "../../hooks/material-issue/useMaterialIssueForm";
import { WIRED_ISSUE_TYPES } from "../../constants/material-issue-status";
import { MATERIAL_ISSUE_STRINGS as S } from "./material-issue.strings";
import { MI_NOTE_MAX_LENGTH } from "./returnable-lines";
import { MaterialIssueSourcePicker } from "./MaterialIssueSourcePicker";
import { type FormFieldError, FIELD_SOURCE } from "./material-issue-form-helpers";
import { IssueTypeTiles } from "./IssueTypeTiles";
import { MaterialIssueAssignmentFields } from "./MaterialIssueAssignmentFields";
import { CharCounter, InlineFieldError, RequiredLabel } from "./MaterialIssueFieldBits";

interface MaterialIssueHeaderCardProps {
  header: MaterialIssueHeaderState;
  isEdit: boolean;
  formError: FormFieldError | null;
}

export function MaterialIssueHeaderCard({
  header,
  isEdit,
  formError,
}: MaterialIssueHeaderCardProps) {
  const { issueType, source, notes } = header;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="size-4 text-primary" />
          {S.form.header.section}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <IssueTypeTiles
          value={issueType}
          locked={isEdit}
          onSelect={header.selectIssueType}
        />

        {/* Source document (locked once created) */}
        <div className="space-y-1.5" id={FIELD_SOURCE}>
          <RequiredLabel>{S.form.header.sourceDoc}</RequiredLabel>
          {isEdit ? (
            <Input value={source?.label ?? ""} disabled />
          ) : (
            WIRED_ISSUE_TYPES.includes(issueType) && (
              <MaterialIssueSourcePicker
                key={issueType}
                issueType={issueType}
                value={source}
                onValueChange={header.selectSource}
              />
            )
          )}
          <InlineFieldError error={formError} target={FIELD_SOURCE} />
        </div>

        <MaterialIssueAssignmentFields
          header={header}
          isEdit={isEdit}
          formError={formError}
        />

        <div className="space-y-1.5">
          <Label>{S.form.header.notes}</Label>
          <Textarea
            value={notes}
            onChange={(e) => header.setNotes(e.target.value)}
            placeholder={S.form.header.notesPlaceholder}
            maxLength={MI_NOTE_MAX_LENGTH}
          />
          <CharCounter>
            {S.form.header.counter(notes.length, MI_NOTE_MAX_LENGTH)}
          </CharCounter>
        </div>
      </CardContent>
    </Card>
  );
}
