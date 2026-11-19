import type { Control } from "react-hook-form";
import { Eye } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FormPageShell } from "@/components/page-shells";
import { EmptyState } from "@/components/common/feedback/EmptyState";
import {
  ChecklistItemsEditor,
  ChecklistPreviewDialog,
  type ChecklistFormShape,
} from "@modules/ims";

import { CHECKLIST_TEMPLATES_STRINGS } from "./checklist-templates.strings";
import { CHECKLIST_TEMPLATE_FORM_STRINGS } from "./checklist-template-form.strings";
import { ChecklistTemplateDetailsCard } from "./ChecklistTemplateDetailsCard";
import { useChecklistTemplateForm } from "../../hooks/checklist-templates/useChecklistTemplateForm";

const S = CHECKLIST_TEMPLATES_STRINGS.form;

export function ChecklistTemplateFormBody() {
  const f = useChecklistTemplateForm();
  const { control, register, setValue, formState } = f.form;

  if (f.isLoading) {
    return (
      <FormPageShell title={S.editTitle} subtitle={S.loadingSubtitle} backHref={f.listPath} hideFooter>
        <div className="flex flex-col gap-6">
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </FormPageShell>
    );
  }
  if (f.notFound) {
    return (
      <FormPageShell title={S.editTitle} backHref={f.listPath} hideFooter>
        <EmptyState title={S.notFoundTitle} description={S.notFoundSubtitle} />
      </FormPageShell>
    );
  }

  const heading = f.isEdit
    ? CHECKLIST_TEMPLATE_FORM_STRINGS.editHeading(
        f.existing?.name ?? CHECKLIST_TEMPLATE_FORM_STRINGS.nameFallback,
      )
    : S.createTitle;

  return (
    <FormPageShell
      title={heading}
      subtitle={f.isEdit ? undefined : S.createSubtitle}
      backHref={f.listPath}
      saveLabel={f.isEdit ? S.buttons.updateTemplate : S.buttons.createTemplate}
      // Not gated on validity — a bad submit runs the resolver and RHF focuses
      // the first invalid field (§3). `saving` blocks double-submit.
      saving={f.isPending}
      // The shell's back-arrow AND Cancel both prompt on a dirty form.
      guard={f.guard}
      // No <form> element: submit imperatively so Enter never submits (§3).
      onSave={f.save}
      onCancel={f.navigateBack}
    >
      {/* Full-page width so the cards line up with the sticky footer (§3.2). */}
      <div className="flex flex-col gap-6">
        <ChecklistTemplateDetailsCard
          form={f.form}
          isEdit={f.isEdit}
          typesLoading={f.typesLoading}
          activeTypes={f.activeTypes}
        />

        {/* Card clips overflow by default, which would stop the items
            toolbar from sticking. */}
        <Card className="overflow-visible">
          <CardHeader>
            <CardTitle>{S.cards.checklistItems}</CardTitle>
          </CardHeader>
          <CardContent>
            {/* The IMS editor is typed against the narrow ChecklistFormShape and
                documents a boundary cast for callers (see
                ims/components/checklists/checklist-items-editor-helpers.ts). */}
            <ChecklistItemsEditor
              control={control as unknown as Control<ChecklistFormShape>}
              register={register as never}
              setValue={setValue as never}
              itemErrors={formState.errors.items}
              heading={S.fields.itemsHeading}
              headerActions={
                <Button type="button" variant="outline" size="sm" onClick={f.openPreview}>
                  <Eye className="mr-1.5 h-3.5 w-3.5" />
                  {S.buttons.preview}
                </Button>
              }
            />
          </CardContent>
        </Card>

        <ChecklistPreviewDialog
          open={f.previewOpen}
          onOpenChange={f.setPreviewOpen}
          template={f.preview.template}
          typeLabel={f.preview.typeLabel}
        />
      </div>
    </FormPageShell>
  );
}
