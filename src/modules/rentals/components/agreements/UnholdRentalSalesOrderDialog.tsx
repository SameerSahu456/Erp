import { useState } from "react";

import { DatePicker } from "@/components/common/pickers/DatePicker";
import { istTodayDateParam } from "@shared/lib/date";

import { useUnholdSo } from "../../hooks/agreements/useAgreement";
import { AGREEMENTS_STRINGS as S } from "./agreements.strings";
import { ActionDialog, type ActionProps } from "./ActionDialog";
import { ActionField } from "./ActionField";

const U = S.actions.unhold;

export function UnholdRentalSalesOrderDialog({ salesOrderId, open, onOpenChange, onDone }: ActionProps) {
  const [unholdDay, setUnholdDay] = useState(istTodayDateParam());
  const mut = useUnholdSo();

  function submit() {
    mut.mutate(
      { id: salesOrderId, unhold_day: unholdDay },
      {
        onSuccess: () => {
          onOpenChange(false);
          onDone?.();
        },
      },
    );
  }

  return (
    <ActionDialog
      isDirty={unholdDay !== istTodayDateParam()}
      open={open}
      onOpenChange={onOpenChange}
      title={U.title}
      description={U.description}
      submitLabel={U.submit}
      pending={mut.isPending}
      error={mut.error}
      canSubmit={!!unholdDay}
      onSubmit={submit}
    >
      <ActionField label={U.unholdDay} htmlFor="unhold-day">
        <DatePicker id="unhold-day" value={unholdDay} onChange={setUnholdDay} />
      </ActionField>
    </ActionDialog>
  );
}
