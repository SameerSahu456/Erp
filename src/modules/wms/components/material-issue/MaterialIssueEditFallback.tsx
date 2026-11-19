import { FormPageShell } from "@/components/page-shells";
import { FormCardSkeleton } from "@/components/common/feedback/FormCardSkeleton";
import { Typography } from "@/components/ui/typography";
import { isForbidden, isNotFound } from "@shared/api/envelope";
import { LoadErrorState } from "@shared/components/feedback/LoadErrorState";
import { NoAccess } from "@/shared/components/feedback/NoAccess";
import { EmptyState } from "@/components/common/feedback/EmptyState";
import type { MaterialIssueResponse } from "../../api";
import { MATERIAL_ISSUE_STRINGS as S } from "./material-issue.strings";

/** Why an edit form has no draft to show: no access, a load failure (with
 *  the reason), or the record genuinely isn't there. */
function EditDraftUnavailable({ error, isError }: { error: unknown; isError: boolean }) {
  if (isForbidden(error)) return <NoAccess />;
  if (isError && !isNotFound(error)) {
    return <LoadErrorState error={error} fallback={S.form.editLoadFailed} />;
  }
  return <EmptyState title={S.detail.notFound} />;
}

interface MaterialIssueEditFallbackProps {
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  draft: MaterialIssueResponse | undefined;
}

/** Edit-mode states before the form can render; an empty form without a draft would offer a no-op Save. */
export function MaterialIssueEditFallback({
  isLoading,
  isError,
  error,
  draft,
}: MaterialIssueEditFallbackProps) {
  let content = (
    <Typography variant="body" tone="danger">
      {S.form.editLocked}
    </Typography>
  );
  if (isLoading) content = <FormCardSkeleton />;
  else if (!draft) content = <EditDraftUnavailable error={error} isError={isError} />;
  return (
    <FormPageShell
      title={S.form.editTitle}
      backHref="/wms/material-issue"
      footerActions={<span />}
    >
      {content}
    </FormPageShell>
  );
}
