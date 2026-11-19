import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ClipboardCheck, FolderTree, ListChecks, Package, Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Typography } from "@/components/ui/typography";
import { StatusBadge } from "@/components/common/display/StatusBadge";
import { DetailPageShell } from "@/components/page-shells";
import { EmptyState } from "@/components/common/feedback/EmptyState";
import { NoAccess } from "@/shared/components/feedback/NoAccess";
import { isForbidden, isNotFound } from "@shared/api/envelope";
import { ChecklistPreviewList } from "@modules/ims";

import { CHECKLIST_TEMPLATES_STRINGS } from "./checklist-templates.strings";
import { checklistTypeVariant } from "./checklist-templates.columns";
import { InfoField } from "../shared/InfoField";
import { useChecklistTemplatePreview } from "../../hooks/checklist-templates/useChecklistTemplatePreview";

const P = CHECKLIST_TEMPLATES_STRINGS.preview;
const LIST_PATH = "/wms/checklists";
const SKELETON_ROWS = 3;

function StateShell({ subtitle, children }: { subtitle?: string; children: ReactNode }) {
  return (
    <DetailPageShell title={P.title} subtitle={subtitle} backHref={LIST_PATH} titleCopyable={false}>
      {children}
    </DetailPageShell>
  );
}

// Bad id or deleted record → a friendly not-found body whose action leads back
// to the list (§2/§0.6), never a dead-end retry.
function NotFoundState({ onBack }: { onBack: () => void }) {
  return (
    <StateShell>
      <EmptyState
        title={P.notFoundTitle}
        description={P.notFoundSubtitle}
        action={{ label: P.backToList, onClick: onBack }}
      />
    </StateShell>
  );
}

export function ChecklistTemplatePreviewBody() {
  const navigate = useNavigate();
  const { templateQuery, template, typeLabel, targetName, canManage } = useChecklistTemplatePreview();

  if (templateQuery.isLoading) {
    return (
      <StateShell subtitle={P.loadingSubtitle}>
        <Card>
          <CardContent className="space-y-3 pt-6">
            {Array.from({ length: SKELETON_ROWS }, (_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-md" />
            ))}
          </CardContent>
        </Card>
      </StateShell>
    );
  }
  // No access (403) → a no-access body, never "doesn't exist" (§2).
  if (isForbidden(templateQuery.error)) {
    return (
      <StateShell>
        <NoAccess />
      </StateShell>
    );
  }
  // 404 — e.g. deleted from Parts › Checklist while this page was open.
  if (isNotFound(templateQuery.error)) return <NotFoundState onBack={() => navigate(LIST_PATH)} />;
  // A genuine fetch failure is distinct from a missing record (§12).
  if (templateQuery.isError) {
    return (
      <StateShell>
        <EmptyState
          title={P.loadErrorTitle}
          description={P.loadErrorSubtitle}
          action={{ label: P.retry, onClick: () => void templateQuery.refetch() }}
        />
      </StateShell>
    );
  }
  if (!template) return <NotFoundState onBack={() => navigate(LIST_PATH)} />;

  const isCategory = template.target_type === "category";
  const requiredCount = template.items.filter((i) => i.required).length;

  return (
    <DetailPageShell
      title={template.name}
      status={{
        label: template.is_active ? P.status.active : P.status.inactive,
        variant: template.is_active ? "success" : "neutral",
      }}
      backHref={LIST_PATH}
      titleCopyable={false}
      actions={
        // §5 — Edit is an author action; read-only viewers don't see it.
        canManage ? (
          <Button onClick={() => navigate(`${LIST_PATH}/${template.id}/edit`)}>
            <Pencil className="size-4" data-icon="inline-start" />
            {P.editButton}
          </Button>
        ) : undefined
      }
    >
      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{P.cards.templateDetails}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-3">
              <InfoField
                icon={ClipboardCheck}
                label={P.fields.type}
                value={
                  <StatusBadge variant={checklistTypeVariant(template.type_code)}>
                    {typeLabel ?? template.type_code}
                  </StatusBadge>
                }
              />
              <InfoField
                icon={isCategory ? FolderTree : Package}
                label={isCategory ? P.fields.category : P.fields.part}
                value={targetName}
              />
              <InfoField
                icon={ListChecks}
                label={P.fields.items}
                value={
                  <span className="flex flex-col gap-0.5">
                    <span className="tabular-nums">{P.itemsSuffix(template.items.length)}</span>
                    <Typography variant="helper" tone="muted" className="tabular-nums">
                      {P.requiredCount(requiredCount)}
                    </Typography>
                  </span>
                }
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="space-y-0.5">
              <CardTitle>{P.cards.checklistItems}</CardTitle>
              <Typography variant="helper" tone="muted">
                {P.cards.checklistItemsHint}
              </Typography>
            </div>
          </CardHeader>
          <CardContent>
            <ChecklistPreviewList items={template.items} />
          </CardContent>
        </Card>
      </div>
    </DetailPageShell>
  );
}
