import { X } from "lucide-react";

import { MATERIAL_ISSUE_STRINGS as S } from "./material-issue.strings";

// The per-row × that drops a staged item off the list.
export function RowRemove({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={S.issuedComponents.removeStagedAria}
      onClick={onClick}
      className="ml-auto shrink-0 rounded-sm p-0.5 text-muted-foreground transition-colors hover:text-destructive"
    >
      <X className="size-3.5" />
    </button>
  );
}
