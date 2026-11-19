import { useNavigate, useParams } from "react-router-dom";

import { Skeleton } from "@/components/ui/skeleton";
import { Typography } from "@/components/ui/typography";

import { CreateChecklistDialog } from "../../components/checklists/CreateChecklistDialog";
import { useChecklist } from "../../hooks/checklists/useChecklists";
import { CHECKLISTS_STRINGS } from "../../components/checklists/checklists.strings";

// Full-page Checklist create / edit form. Routes:
//   /ims/parts/:partId/checklists/new
//   /ims/parts/:partId/checklists/:templateId/edit
//
// The form itself — fields, the heavy item-editor, save, and the
// FormPageShell chrome + unsaved-changes guard — lives in
// CreateChecklistDialog's `variant='page'` branch. This page only loads the
// template for edit mode and hands the close action (navigate back) to the
// child via `onOpenChange`.
export default function ChecklistFormPage() {
  const { partId = "", templateId } = useParams<{
    partId: string;
    templateId?: string;
  }>();
  const isEdit = !!templateId;
  const navigate = useNavigate();

  const { data: template, isLoading, isError } = useChecklist(templateId ?? "");

  if (isEdit && isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }
  if (isEdit && (isError || !template)) {
    return (
      <Typography asChild variant="body" tone="muted">
        <div className="p-6">{CHECKLISTS_STRINGS.formPage.loadError}</div>
      </Typography>
    );
  }

  return (
    <CreateChecklistDialog
      // `open` is unused in page variant but the prop is required.
      open
      onOpenChange={(o) => {
        if (!o) navigate(-1);
      }}
      partId={partId}
      editTemplate={template}
      variant="page"
    />
  );
}
