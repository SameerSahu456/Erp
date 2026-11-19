import { AlertCircle, Loader2, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Typography } from "@/components/ui/typography";
import type { CommitState } from "../../hooks/material-issue/useIssuedComponentsPanel";
import { MATERIAL_ISSUE_STRINGS as S } from "./material-issue.strings";
import { BlockReasonTooltip } from "./BlockReasonTooltip";

/** Last top-up / pull-out failure, dismissible. */
export function IssuedComponentsError({ commit }: { commit: CommitState }) {
  if (!commit.error) return null;
  return (
    <Alert variant="destructive" className="pr-10">
      <AlertCircle className="size-4" />
      <AlertDescription>
        <Typography variant="body" tone="danger">
          {commit.error}
        </Typography>
      </AlertDescription>
      <button
        type="button"
        onClick={commit.resetErrors}
        aria-label={S.issuedComponents.dismissError}
        className="absolute right-2 top-2 rounded-md p-1 text-destructive/70 transition-colors hover:bg-destructive/10 hover:text-destructive"
      >
        <X className="size-4" />
      </button>
    </Alert>
  );
}

/** Commit bar — Discard / Save the staged adds + pull-outs. */
export function IssuedComponentsCommitBar({ commit }: { commit: CommitState }) {
  const { hasChanges, saving } = commit;
  const reason = saving ? null : commit.noChangesReason;
  return (
    <div className="flex flex-wrap items-center justify-end gap-2 border-t pt-4">
      <div className="flex gap-2">
        <BlockReasonTooltip reason={reason} triggerClassName="inline-flex">
          <Button
            variant="outline"
            onClick={commit.discard}
            disabled={!hasChanges || saving}
          >
            {S.issuedComponents.discard}
          </Button>
        </BlockReasonTooltip>
        <BlockReasonTooltip reason={reason} triggerClassName="inline-flex">
          <Button onClick={commit.save} disabled={!hasChanges || saving}>
            {saving && (
              <Loader2 className="size-4 animate-spin" data-icon="inline-start" />
            )}
            {saving ? S.issuedComponents.saving : S.issuedComponents.save}
          </Button>
        </BlockReasonTooltip>
      </div>
    </div>
  );
}
