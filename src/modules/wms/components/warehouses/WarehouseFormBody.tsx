import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { Typography } from "@/components/ui/typography";
import { EmptyState } from "@/components/common/feedback/EmptyState";
import { FormPageShell } from "@/components/page-shells";

import { useWarehouseForm } from "../../hooks/warehouses/useWarehouseForm";
import { WarehouseCapabilityFields, WarehouseIdentityFields } from "./WarehouseIdentityFields";
import { WarehouseAddressFields } from "./WarehouseAddressFields";
import { WAREHOUSE_FORM_STRINGS } from "./warehouse-form.strings";

const S = WAREHOUSE_FORM_STRINGS;

function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3 px-6 py-5">
      <Typography variant="card-title">{title}</Typography>
      {children}
    </section>
  );
}

export function WarehouseFormBody() {
  const f = useWarehouseForm();

  if (f.isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[480px] w-full rounded-xl" />
      </div>
    );
  }
  if (f.editMissing) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title={S.notFound.title}
        description={S.notFound.message}
        action={{ label: S.notFound.back, onClick: f.navigateBack }}
      />
    );
  }

  return (
    <FormPageShell
      title={f.isEdit ? S.header.editTitle : S.header.newTitle}
      subtitle={f.isEdit ? undefined : S.header.createSubtitle}
      backHref={f.listPath}
      saveLabel={f.isEdit ? S.actions.saveChanges : S.actions.createWarehouse}
      saving={f.isPending}
      guard={f.guard}
      onSave={f.save}
      onCancel={f.navigateBack}
    >
      {/* Not a native <form>: submission fires from the shell's Save button
          (handleSubmit) so Enter in a single-line input never submits (§3, P2). */}
      <div className="divide-y divide-border rounded-xl border bg-card shadow-sm">
        <FormSection title={S.sections.details}>
          <WarehouseIdentityFields form={f.form} isEdit={f.isEdit} />
        </FormSection>
        <FormSection title={S.sections.capabilities}>
          <WarehouseCapabilityFields form={f.form} />
        </FormSection>
        <FormSection title={S.sections.address}>
          <WarehouseAddressFields form={f.form} />
        </FormSection>
      </div>
    </FormPageShell>
  );
}
