import { Loader2 } from "lucide-react";

import { OperationDialog } from "@/components/common/dialogs/OperationDialog";
import { Button } from "@/components/ui/button";
import { Typography } from "@/components/ui/typography";

import type { BillingSettings } from "../../lib/cadence";
import { BillingCadenceFields } from "../shared/BillingCadenceFields";
import { ACCOUNTS_STRINGS as S } from "./accounts.strings";
import { RENTALS_COMMON_STRINGS as C } from "../shared/common.strings";

interface AccountBillingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draft: BillingSettings;
  onChange: (next: BillingSettings) => void;
  /** `edited !== null` — guards Esc / backdrop / x / Cancel. */
  isDirty: boolean;
  error: string | null;
  saving: boolean;
  onSave: () => void;
}

/** Edit the account's billing defaults. */
export function AccountBillingDialog({
  open,
  onOpenChange,
  draft,
  onChange,
  isDirty,
  error,
  saving,
  onSave,
}: AccountBillingDialogProps) {
  return (
    <OperationDialog
      open={open}
      onOpenChange={onOpenChange}
      title={S.account.dialogTitle}
      description={S.account.dialogDescription}
      className="sm:max-w-2xl"
      isDirty={isDirty}
      footer={({ requestClose }) => (
        <>
          <Button variant="outline" onClick={requestClose} disabled={saving}>
            {C.cancel}
          </Button>
          {/* Not gated on dirty: saving the defaults unchanged is itself the
              decision that makes this account's orders billable. */}
          <Button onClick={onSave} disabled={saving}>
            {saving && <Loader2 className="size-4 animate-spin" />}
            {saving ? C.saving : S.account.save}
          </Button>
        </>
      )}
    >
      <BillingCadenceFields idPrefix="acct-billing" value={draft} onChange={onChange} disabled={saving} />
      {error && (
        <Typography variant="helper" tone="danger">
          {error}
        </Typography>
      )}
    </OperationDialog>
  );
}
