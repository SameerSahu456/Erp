import { FormPageShell } from "@/components/page-shells";
import { FilePreviewDialog } from "@modules/attachments";

import { useDispatchCreateForm } from "../../hooks/dispatches/useDispatchCreateForm";
import { DISPATCH_CREATE_STRINGS as S } from "./dispatch-create.strings";
import { StepTabs } from "./StepTabs";
import { DispatchInfoCard } from "./DispatchInfoCard";
import { DispatchCreateLogisticsCard } from "./DispatchCreateLogisticsCard";
import { DispatchReadyUnitsCard } from "./DispatchReadyUnitsCard";
import { DispatchCreateFooter } from "./DispatchCreateFooter";

/** Dispatch create — a 2-step wizard (mirrors Inward): step 1 picks the source
 *  document + captures logistics; step 2 selects the ready-for-dispatch units.
 *  Logistics are optional here and remain editable on the dispatch detail. */
export function DispatchCreateBody() {
  const form = useDispatchCreateForm();
  const { step } = form;

  return (
    // FormPageShell owns the sticky action bar (PAGE-UI §3) and the unsaved-changes dialog.
    <FormPageShell
      title={S.title}
      subtitle={S.stepSubtitle(
        step + 1,
        (step === 0 ? S.stepSource : S.stepUnits).toLowerCase(),
      )}
      backHref="/wms/dispatches"
      guard={form.guard}
      footerActions={<DispatchCreateFooter form={form} />}
      className="gap-5"
    >
      <StepTabs step={step} setStep={form.setStep} step2Enabled={form.canProceed} />

      <div className="flex flex-1 flex-col gap-5">
        {step === 0 ? (
          <>
            <DispatchInfoCard src={form.src} />
            <DispatchCreateLogisticsCard logistics={form.logistics} docs={form.docs} />
          </>
        ) : (
          <DispatchReadyUnitsCard src={form.src} />
        )}
      </div>

      <FilePreviewDialog
        target={form.docs.preview}
        onOpenChange={(open) => {
          if (!open) form.docs.closePreview();
        }}
      />
    </FormPageShell>
  );
}
