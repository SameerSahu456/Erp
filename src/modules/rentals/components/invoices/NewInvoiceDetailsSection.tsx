import type { ReactNode } from "react";
import { Receipt } from "lucide-react";

import { DatePicker } from "@/components/common/pickers/DatePicker";
import { AsyncSelect } from "@/components/ui/async-select";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Typography } from "@/components/ui/typography";
import { useAccountOptions } from "@modules/crm";

import type { NewRentalInvoiceState } from "../../hooks/invoices/useNewRentalInvoice";
import { INVOICE_STRINGS as S } from "./invoices.strings";
import { SectionHeader } from "../shared/SectionHeader";

const D = S.newInvoice.details;

function Field(props: { label: string; htmlFor: string; help?: string; required?: boolean; children: ReactNode }) {
  return (
    <div className="min-w-0 space-y-1.5">
      <Label htmlFor={props.htmlFor} required={props.required}>
        {props.label}
      </Label>
      {props.children}
      {props.help ? (
        <Typography variant="helper" tone="muted">
          {props.help}
        </Typography>
      ) : null}
    </div>
  );
}

type DetailsForm = Pick<
  NewRentalInvoiceState,
  "account" | "pickAccount" | "billUpTo" | "setBillUpTo" | "issueDate" | "setIssueDate" | "creditDays" | "setCreditDays"
>;

/** Account, bill-up-to day, the derived period, issue date and credit terms. */
export function NewInvoiceDetailsSection({ form, period }: { form: DetailsForm; period: string | undefined }) {
  return (
    <Card>
      <SectionHeader icon={Receipt} title={D.title} subtitle={D.subtitle} />
      <CardContent>
        <div className="grid grid-cols-1 gap-x-8 gap-y-6 lg:grid-cols-2">
          <Field label={D.account} htmlFor="inv-account" required>
            {/* Server-searched and paged (§16.11); the option carries the id. */}
            <AsyncSelect
              id="inv-account"
              value={form.account ? { id: form.account.id, label: form.account.name } : null}
              onValueChange={form.pickAccount}
              useOptions={useAccountOptions}
              toLabel={(a) => a.name}
              placeholder={D.accountPlaceholder}
              searchPlaceholder={D.accountSearchPlaceholder}
              clearable
            />
          </Field>
          <Field label={D.billUpTo} htmlFor="inv-bill-up-to" help={D.billUpToHelp} required>
            <DatePicker id="inv-bill-up-to" value={form.billUpTo} onChange={form.setBillUpTo} />
          </Field>
          {/* Derived, never typed: each order's anchor to the date above —
              so not marked required; there is nothing for the user to fill. */}
          <Field label={D.period} htmlFor="inv-period" help={D.periodHelp}>
            <Input id="inv-period" readOnly value={period ?? ""} placeholder={D.periodPlaceholder} />
          </Field>
          <Field label={D.issueDate} htmlFor="inv-issue-date" help={D.issueDateHelp}>
            <DatePicker id="inv-issue-date" value={form.issueDate} onChange={form.setIssueDate} />
          </Field>
          <Field label={D.creditTerms} htmlFor="inv-credit" help={D.creditTermsHelp}>
            <Input
              id="inv-credit"
              type="number"
              inputMode="numeric"
              min={0}
              max={365}
              placeholder={D.creditTermsPlaceholder}
              value={form.creditDays}
              onChange={(e) => form.setCreditDays(e.target.value)}
            />
          </Field>
        </div>
      </CardContent>
    </Card>
  );
}
