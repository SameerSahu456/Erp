import { useState } from "react";
import { Pencil } from "lucide-react";

import { FormCardSkeleton } from "@/components/common/feedback/FormCardSkeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Typography } from "@/components/ui/typography";
import { LoadErrorState } from "@shared/components/feedback/LoadErrorState";
import { usePermission } from "@shared/rbac";

import { rentalsCan } from "../../permissions";
import type { AccountBillingSettings } from "../../api/settings";
import {
  useAccountBillingSettings,
  useSaveAccountBillingSettings,
} from "../../hooks/accounts/useAccountBillingSettings";
import { validateCadence, type BillingSettings } from "../../lib/cadence";
import { EarlyExitTermsCard } from "../early-exit/EarlyExitTermsCard";
import { ACCOUNTS_STRINGS as S } from "./accounts.strings";
import { toAccountCadence, toAccountPayload } from "./account-billing-helpers";
import { AccountBillingClerksCard } from "./AccountBillingClerksCard";
import { AccountBillingDialog } from "./AccountBillingDialog";
import { AccountBillingSummary } from "./AccountBillingSummary";

/** The "Billings" tab on the account detail page: billing defaults (which
 *  CASCADE onto orders configured afterwards — live contracts keep theirs)
 *  plus the early-exit terms (R18). */
export function AccountBillingsTab({ accountId }: { accountId: string }) {
  return (
    <div className="space-y-4">
      <AccountBillingSettingsCard accountId={accountId} />
      <AccountBillingClerksCard accountId={accountId} />
      <EarlyExitTermsCard accountId={accountId} />
    </div>
  );
}

function AccountBillingSettingsCard({ accountId }: { accountId: string }) {
  const query = useAccountBillingSettings(accountId);
  if (query.isLoading) return <FormCardSkeleton rows={3} />;
  if (query.isError || !query.data) {
    return <LoadErrorState error={query.error} fallback={S.account.loadError} />;
  }
  return <AccountBillingSettingsView accountId={accountId} settings={query.data} />;
}

function AccountBillingSettingsView({ accountId, settings }: { accountId: string; settings: AccountBillingSettings }) {
  const save = useSaveAccountBillingSettings(accountId);
  // Editing these defaults cascades onto every order configured for the
  // account afterwards — `rentals:manage`, the code the PUT requires.
  const canEdit = usePermission().canAny(rentalsCan.manage);
  // Null until a field is touched; the form then reads the server row, so a
  // save that clears it re-derives from what was actually stored.
  const [edited, setEdited] = useState<BillingSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const draft = edited ?? toAccountCadence(settings);
  // `id` is NULL until a row is saved — and the billing engine bills an
  // order only when this row EXISTS, so a never-configured account says so.
  const unsaved = settings.id == null;

  function close() {
    setOpen(false);
    setEdited(null);
    setError(null);
  }

  function handleSave() {
    const problem = validateCadence(draft);
    setError(problem);
    if (problem) return;
    save.mutate(toAccountPayload(draft), { onSuccess: close });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="min-w-0">
          <CardTitle>{S.account.title}</CardTitle>
          <CardDescription>{S.account.description}</CardDescription>
        </div>
        {canEdit ? (
          <Button variant="outline" onClick={() => setOpen(true)} className="shrink-0">
            <Pencil className="size-4" />
            {S.account.edit}
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        {unsaved && (
          <div className="rounded-md border border-warning/40 bg-warning/10 p-3">
            <Typography variant="body-strong">{S.account.unsavedTitle}</Typography>
            <Typography variant="helper" tone="muted">
              {S.account.unsavedBody}
            </Typography>
          </div>
        )}
        <AccountBillingSummary settings={settings} />
      </CardContent>
      <AccountBillingDialog
        open={open}
        onOpenChange={(next) => (next ? setOpen(true) : close())}
        draft={draft}
        onChange={(next) => {
          setEdited(next);
          setError(null);
        }}
        isDirty={edited !== null}
        error={error}
        saving={save.isPending}
        onSave={handleSave}
      />
    </Card>
  );
}
