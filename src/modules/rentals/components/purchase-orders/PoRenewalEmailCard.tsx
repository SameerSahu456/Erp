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
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Typography } from "@/components/ui/typography";
import { LoadErrorState } from "@shared/components/feedback/LoadErrorState";
import { usePermission } from "@shared/rbac";

import type { PoRenewalSettings } from "../../api/settings";
import {
  usePoRenewalSettings,
  useSavePoRenewalSettings,
} from "../../hooks/purchase-orders/usePurchaseOrders";
import { rentalsCan } from "../../permissions";
import { RENTALS_COMMON_STRINGS } from "../shared/common.strings";
import { PURCHASE_ORDER_STRINGS as STRINGS } from "./purchase-orders.strings";

const S = STRINGS.renewal;

type Draft = Pick<
  PoRenewalSettings,
  "enabled" | "subject" | "body" | "billing_emails" | "rental_sales_emails"
>;

function toDraft(settings: PoRenewalSettings): Draft {
  return {
    enabled: settings.enabled,
    subject: settings.subject,
    body: settings.body,
    billing_emails: settings.billing_emails,
    rental_sales_emails: settings.rental_sales_emails,
  };
}

/** The PO renewal email: on/off, its template with `{merge}` fields, and
 *  the shared mailboxes always copied (legacy-parity spec §3.5). Saves on
 *  its own, like the return-policy card beside it. */
export function PoRenewalEmailCard() {
  const query = usePoRenewalSettings();
  const save = useSavePoRenewalSettings();
  const { canAny } = usePermission();
  const canEdit = canAny(rentalsCan.poRenewalSettings);
  // Null until touched; the form reads the server row until then.
  const [edited, setEdited] = useState<Draft | null>(null);
  const settings = query.data;

  if (query.isLoading) {
    return (
      <Card className="lg:col-span-2">
        <CardContent className="py-6">
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );
  }
  if (query.isError || !settings) {
    return (
      <Card className="lg:col-span-2">
        <CardContent className="py-6">
          <LoadErrorState error={query.error} fallback={S.loadError} />
        </CardContent>
      </Card>
    );
  }

  const draft = edited ?? toDraft(settings);
  const dirty = JSON.stringify(draft) !== JSON.stringify(toDraft(settings));
  const valid = draft.subject.trim() !== "" && draft.body.trim() !== "";
  const set = (patch: Partial<Draft>) => setEdited({ ...draft, ...patch });
  const disabled = !canEdit || save.isPending;

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <div className="min-w-0">
          <CardTitle>{S.title}</CardTitle>
          <CardDescription>{S.description}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!settings.smtp_configured ? (
          <Typography variant="helper" tone="warning">
            {S.smtpMissing}
          </Typography>
        ) : null}
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="po-renewal-enabled">{S.enabled}</Label>
          <Switch
            id="po-renewal-enabled"
            checked={draft.enabled}
            onCheckedChange={(v) => set({ enabled: v === true })}
            disabled={disabled}
          />
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <Label htmlFor="po-renewal-subject">{S.subject}</Label>
          <Input
            id="po-renewal-subject"
            maxLength={300}
            value={draft.subject}
            onChange={(e) => set({ subject: e.target.value })}
            disabled={disabled}
          />
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <Label htmlFor="po-renewal-body">{S.body}</Label>
          <Textarea
            id="po-renewal-body"
            rows={8}
            maxLength={5000}
            value={draft.body}
            onChange={(e) => set({ body: e.target.value })}
            disabled={disabled}
          />
          <Typography
            variant="helper"
            tone="muted"
            className="[overflow-wrap:anywhere]"
          >
            {S.mergeFieldsLine(settings.merge_fields)}
          </Typography>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex min-w-0 flex-col gap-1.5">
            <Label htmlFor="po-renewal-billing">{S.billingEmails}</Label>
            <Input
              id="po-renewal-billing"
              value={draft.billing_emails}
              onChange={(e) => set({ billing_emails: e.target.value })}
              disabled={disabled}
            />
            <Typography variant="helper" tone="muted">
              {S.emailsHelp}
            </Typography>
          </div>
          <div className="flex min-w-0 flex-col gap-1.5">
            <Label htmlFor="po-renewal-sales">{S.rentalSalesEmails}</Label>
            <Input
              id="po-renewal-sales"
              value={draft.rental_sales_emails}
              onChange={(e) => set({ rental_sales_emails: e.target.value })}
              disabled={disabled}
            />
            <Typography variant="helper" tone="muted">
              {S.emailsHelp}
            </Typography>
          </div>
        </div>
        {canEdit ? (
          <Button
            onClick={() =>
              save.mutate(draft, { onSuccess: () => setEdited(null) })
            }
            disabled={!dirty || !valid || save.isPending}
          >
            {save.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            {save.isPending ? RENTALS_COMMON_STRINGS.saving : S.save}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
