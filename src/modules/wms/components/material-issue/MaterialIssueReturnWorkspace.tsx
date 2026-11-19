import type { ReactNode } from "react";
import { RotateCcw, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { UnsavedChangesDialog } from "@/components/common/dialogs/UnsavedChangesDialog";

import type { MaterialIssueResponse } from "../../api";
import { useMaterialIssueReturnWorkspace } from "../../hooks/material-issue/useMaterialIssueReturnWorkspace";
import { ReturnWorkspaceContext, useReturnWorkspace } from "./returnWorkspaceContext";
import { MATERIAL_ISSUE_STRINGS as S } from "./material-issue.strings";

// Provides the return workspace state and hosts its discard prompt.
export function MaterialIssueReturnProvider({
  materialIssue,
  children,
}: {
  materialIssue: MaterialIssueResponse;
  children: ReactNode;
}) {
  const { value, cancelGuard } = useMaterialIssueReturnWorkspace(materialIssue);
  return (
    <ReturnWorkspaceContext.Provider value={value}>
      {children}
      <UnsavedChangesDialog
        open={cancelGuard.confirmOpen}
        onOpenChange={cancelGuard.setConfirmOpen}
        onConfirm={cancelGuard.confirmDiscard}
      />
    </ReturnWorkspaceContext.Provider>
  );
}

// The page-actions trigger — enters / leaves return mode. Only rendered for
// issued MIs.
export function ReturnModeButton() {
  const { active, start, cancel } = useReturnWorkspace();
  const Icon = active ? X : RotateCcw;
  return (
    <Button variant="outline" onClick={active ? cancel : start}>
      <Icon className="size-4" data-icon="inline-start" />
      {active ? S.returnWorkspace.cancel : S.returnWorkspace.start}
    </Button>
  );
}
