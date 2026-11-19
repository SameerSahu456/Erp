import { useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Typography } from "@/components/ui/typography";
import { usePermission } from "@shared/rbac";

import type { RentalSettings } from "../../api/settings";
import { useSaveRentalSettings } from "../../hooks/configuration/useRentalSettings";
import { BILLING_GRACE_MAX, BILLING_GRACE_MIN } from "../../constants/billing";
import { rentalsCan } from "../../permissions";
import { RENTALS_COMMON_STRINGS as C } from "../shared/common.strings";
import { CONFIGURATION_STRINGS } from "./configuration.strings";

const S = CONFIGURATION_STRINGS.agreementDefaults;

interface Draft {
  grace: string;
  returnGrace: string;
  requireSigned: boolean;
}

const draftOf = (s: RentalSettings): Draft => ({
  grace: String(s.default_billing_grace_days),
  returnGrace: String(s.default_return_grace_days),
  requireSigned: s.require_signed_document_for_active,
});

const isDays = (raw: string) => {
  const n = Number(raw);
  return raw.trim() !== "" && Number.isInteger(n) && n >= BILLING_GRACE_MIN && n <= BILLING_GRACE_MAX;
};

/** Default dispatch + return grace days and the signed-document approval
 *  switch. Saves on its own, like the return-policy card beside it. */
export function AgreementDefaultsCard({
  settings,
}: {
  settings: RentalSettings;
}) {
  const save = useSaveRentalSettings();
  const { canAny } = usePermission();
  const canEdit = canAny(rentalsCan.editSettings);
  // Null until touched; the form reads the server row until then.
  const [edited, setEdited] = useState<Draft | null>(null);

  const draft = edited ?? draftOf(settings);
  const graceValid = isDays(draft.grace);
  const returnGraceValid = isDays(draft.returnGrace);
  const dirty =
    draft.grace !== String(settings.default_billing_grace_days) ||
    draft.returnGrace !== String(settings.default_return_grace_days) ||
    draft.requireSigned !== settings.require_signed_document_for_active;
  const disabled = !canEdit || save.isPending;

  const submit = () =>
    save.mutate(
      {
        default_billing_grace_days: Number(draft.grace),
        default_return_grace_days: Number(draft.returnGrace),
        require_signed_document_for_active: draft.requireSigned,
      },
      { onSuccess: () => setEdited(null) },
    );

  return (
    <Card>
      <CardHeader>
        <div className="min-w-0">
          <CardTitle>{S.title}</CardTitle>
          <CardDescription>{S.description}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex min-w-0 flex-col gap-1.5">
          <Label htmlFor="default-billing-grace-days">{S.graceLabel}</Label>
          <Input
            id="default-billing-grace-days"
            inputMode="numeric"
            value={draft.grace}
            onChange={(e) => setEdited({ ...draft, grace: e.target.value })}
            disabled={disabled}
            aria-invalid={!graceValid}
          />
          <Typography variant="helper" tone={graceValid ? "muted" : "danger"}>
            {graceValid ? S.graceHelp : S.graceInvalid}
          </Typography>
        </div>

        <div className="flex min-w-0 flex-col gap-1.5">
          <Label htmlFor="default-return-grace-days">{S.returnGraceLabel}</Label>
          <Input
            id="default-return-grace-days"
            inputMode="numeric"
            value={draft.returnGrace}
            onChange={(e) => setEdited({ ...draft, returnGrace: e.target.value })}
            disabled={disabled}
            aria-invalid={!returnGraceValid}
          />
          <Typography variant="helper" tone={returnGraceValid ? "muted" : "danger"}>
            {returnGraceValid ? S.returnGraceHelp : S.graceInvalid}
          </Typography>
        </div>

        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-1">
            <Label htmlFor="require-signed-document">
              {S.requireSignedLabel}
            </Label>
            <Typography variant="helper">{S.requireSignedHelp}</Typography>
          </div>
          <Switch
            id="require-signed-document"
            checked={draft.requireSigned}
            onCheckedChange={(v) =>
              setEdited({ ...draft, requireSigned: v === true })
            }
            disabled={disabled}
          />
        </div>

        {canEdit ? (
          <Button
            onClick={submit}
            disabled={!dirty || !graceValid || !returnGraceValid || save.isPending}
          >
            {save.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            {save.isPending ? C.saving : C.save}
          </Button>
        ) : (
          <Typography variant="helper" tone="muted">
            {S.readOnly}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
