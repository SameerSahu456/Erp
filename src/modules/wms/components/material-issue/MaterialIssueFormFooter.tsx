import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MATERIAL_ISSUE_STRINGS as S } from "./material-issue.strings";

interface MaterialIssueFormFooterProps {
  isEdit: boolean;
  isSubmitting: boolean;
  onCancel: () => void;
  onSubmit: (thenIssue: boolean) => void;
}

function SaveLabel({ isEdit, isSubmitting }: { isEdit: boolean; isSubmitting: boolean }) {
  if (isSubmitting) return <>{S.form.footer.saving}</>;
  return <>{isEdit ? S.form.footer.saveChanges : S.form.footer.saveDraft}</>;
}

export function MaterialIssueFormFooter({
  isEdit,
  isSubmitting,
  onCancel,
  onSubmit,
}: MaterialIssueFormFooterProps) {
  return (
    <div className="flex gap-2">
      <Button variant="outline" onClick={onCancel}>
        {S.form.footer.cancel}
      </Button>
      <Button
        variant="outline"
        onClick={() => onSubmit(false)}
        disabled={isSubmitting}
      >
        {isSubmitting && (
          <Loader2 className="size-4 animate-spin" data-icon="inline-start" />
        )}
        <SaveLabel isEdit={isEdit} isSubmitting={isSubmitting} />
      </Button>
      <Button onClick={() => onSubmit(true)} disabled={isSubmitting}>
        {isSubmitting && (
          <Loader2 className="size-4 animate-spin" data-icon="inline-start" />
        )}
        {S.form.footer.saveAndIssue}
      </Button>
    </div>
  );
}
