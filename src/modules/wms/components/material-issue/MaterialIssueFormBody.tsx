import { useNavigateBack } from "@/hooks/use-navigate-back";
import { FormPageShell } from "@/components/page-shells";
import { useMaterialIssueForm } from "../../hooks/material-issue/useMaterialIssueForm";
import { MATERIAL_ISSUE_STRINGS as S } from "./material-issue.strings";
import { MaterialIssueEditFallback } from "./MaterialIssueEditFallback";
import { MaterialIssueFormFooter } from "./MaterialIssueFormFooter";
import { MaterialIssueHeaderCard } from "./MaterialIssueHeaderCard";
import { MaterialIssueLinesCard } from "./MaterialIssueLinesCard";

export function MaterialIssueFormBody() {
  // §10: go back to where the user came from, not a hard-coded detail page.
  const navigateBack = useNavigateBack("/wms/material-issue");
  const form = useMaterialIssueForm();
  const { isEdit, detailQuery, draft, guard } = form;

  if (isEdit && (detailQuery.isLoading || !draft || draft.status !== "draft")) {
    return (
      <MaterialIssueEditFallback
        isLoading={detailQuery.isLoading}
        isError={detailQuery.isError}
        error={detailQuery.error}
        draft={draft}
      />
    );
  }

  return (
    <FormPageShell
      title={isEdit ? S.form.editTitle : S.form.createTitle}
      subtitle={isEdit ? S.form.editSubtitle : S.form.createSubtitle}
      backHref="/wms/material-issue"
      guard={guard}
      footerActions={
        <MaterialIssueFormFooter
          isEdit={isEdit}
          isSubmitting={form.isSubmitting}
          onCancel={() => guard.attempt(navigateBack)}
          onSubmit={form.submit}
        />
      }
    >
      {/* Tighter than the shell's default gap-6 stack: pull the block up and
          keep a compact 16px rhythm between the Details and Line Items cards. */}
      <div className="-mt-2 space-y-4">
        <MaterialIssueHeaderCard
          header={form.header}
          isEdit={isEdit}
          formError={form.formError}
        />
        <MaterialIssueLinesCard
          lines={form.lines}
          warehouseId={form.header.warehouseId}
          formError={form.formError}
        />
      </div>
    </FormPageShell>
  );
}
