import { useState } from "react";
import { Pencil, UserRound } from "lucide-react";

import { TruncatedText } from "@/components/common/display/TruncatedText";
import { EmptyState } from "@/components/common/feedback/EmptyState";
import { FormCardSkeleton } from "@/components/common/feedback/FormCardSkeleton";
import { OperationDialog } from "@/components/common/dialogs/OperationDialog";
import { AsyncMultiSelect, type AsyncOption } from "@/components/ui/async-multi-select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Typography } from "@/components/ui/typography";
import { usePermission } from "@shared/rbac";
import { getUserDisplayName, useUserOptions } from "@modules/users";

import type { AccountBillingClerks } from "../../api/settings";
import {
  useAccountBillingClerks,
  useSaveAccountBillingClerks,
} from "../../hooks/accounts/useAccountBillingClerks";
import { rentalsCan } from "../../permissions";
import { RetryLoadError } from "../shared/RetryLoadError";
import { ACCOUNTS_STRINGS } from "./accounts.strings";

const S = ACCOUNTS_STRINGS.clerks;
/** Mirrors the backend's `MAX_BILLING_CLERKS`. */
const MAX_CLERKS = 10;

/** Active users only — nobody names a deactivated user as a clerk. */
const useClerkOptions = (search: string, options?: { enabled?: boolean }) =>
  useUserOptions(search, { is_active: true }, options);

/** The clerks as name chips, or the empty state. Shared with the agreement page. */
export function BillingClerkNames({ clerks }: { clerks: AccountBillingClerks["clerks"] }) {
  if (clerks.length === 0) {
    return <EmptyState icon={UserRound} title={S.empty} description={S.emptyHint} className="py-6" />;
  }
  return (
    <ul className="flex min-w-0 flex-wrap gap-2">
      {clerks.map((c) => (
        <li key={c.id} className="min-w-0 max-w-full">
          <Badge variant="secondary" className="max-w-full">
            <TruncatedText value={c.name} className="max-w-60" />
          </Badge>
        </li>
      ))}
    </ul>
  );
}

function ClerksDialog({
  accountId,
  current,
  onClose,
}: {
  accountId: string;
  current: AccountBillingClerks["clerks"];
  onClose: () => void;
}) {
  const save = useSaveAccountBillingClerks(accountId);
  const initial = current.map((c) => ({ id: c.id, label: c.name }));
  const [picked, setPicked] = useState<AsyncOption[]>(initial);
  const ids = picked.map((p) => p.id);
  const dirty = ids.join() !== initial.map((p) => p.id).join();
  const tooMany = ids.length > MAX_CLERKS;
  return (
    <OperationDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={S.dialogTitle}
      description={S.dialogDescription}
      isDirty={dirty}
      footer={({ requestClose }) => (
        <>
          <Button variant="outline" onClick={requestClose} disabled={save.isPending}>
            {S.cancel}
          </Button>
          <Button
            onClick={() => save.mutate(ids, { onSuccess: onClose })}
            disabled={!dirty || tooMany || save.isPending}
          >
            {S.save}
          </Button>
        </>
      )}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="billing-clerks-picker">{S.pickerLabel}</Label>
        <AsyncMultiSelect
          id="billing-clerks-picker"
          value={picked}
          onValueChange={setPicked}
          useOptions={useClerkOptions}
          toLabel={getUserDisplayName}
          placeholder={S.pickerPlaceholder}
          loadOnOpen
        />
        <Typography variant="helper" tone={tooMany ? "danger" : "muted"}>
          {tooMany ? S.tooMany(MAX_CLERKS) : S.maxHint(MAX_CLERKS)}
        </Typography>
      </div>
    </OperationDialog>
  );
}

/** Billings tab: who handles this account's rental billing. Saved on its own —
 *  never through the billing defaults, whose save makes the account billable. */
export function AccountBillingClerksCard({ accountId }: { accountId: string }) {
  const query = useAccountBillingClerks(accountId);
  // Same code as the billing defaults' PUT — `rentals:manage`.
  const canEdit = usePermission().canAny(rentalsCan.manage);
  const [open, setOpen] = useState(false);

  if (query.isLoading) return <FormCardSkeleton rows={1} />;
  const clerks = query.data?.clerks ?? [];
  return (
    <Card size="sm">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="min-w-0">
          <CardTitle>{S.title}</CardTitle>
          <CardDescription>{S.description}</CardDescription>
        </div>
        {canEdit && query.data ? (
          <Button size="sm" variant="outline" onClick={() => setOpen(true)} className="shrink-0">
            <Pencil className="size-4" />
            {S.edit}
          </Button>
        ) : null}
      </CardHeader>
      <CardContent>
        {query.isError ? (
          <RetryLoadError error={query.error} fallback={S.loadError} onRetry={() => void query.refetch()} compact />
        ) : (
          <BillingClerkNames clerks={clerks} />
        )}
      </CardContent>
      {open && <ClerksDialog accountId={accountId} current={clerks} onClose={() => setOpen(false)} />}
    </Card>
  );
}
