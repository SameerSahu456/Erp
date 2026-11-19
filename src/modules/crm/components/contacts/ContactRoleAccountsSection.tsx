import { Building2 } from "lucide-react"

import { FieldError } from "@/components/common/forms/FieldError"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Typography } from "@/components/ui/typography"

import { CONTACT_STATUSES, type ContactStatus } from "../../api"
import type { ContactFormController } from "../../hooks/contacts/useContactForm"
import { CONTACT_STATUS_LABELS } from "../../constants/contact-status"
import { CONTACTS_STRINGS } from "./contacts.strings"
import { ContactAccountsSelect } from "./ContactAccountsSelect"
import { SectionHeader } from "../shared/SectionHeader"

export function ContactRoleAccountsSection({ form }: { form: ContactFormController }) {
  const {
    isEdit,
    designation, setDesignation,
    department, setDepartment,
    departmentOptions,
    status, setStatus,
    accountOptions, setAccountOptions,
    primaryAccountId, setPrimaryAccountId,
    lockedAccountIds,
    errors, clearError,
  } = form

  return (
    <div className="space-y-4">
      <SectionHeader icon={Building2} label={CONTACTS_STRINGS.form.role.sectionLabel} accent="emerald" />

      <div className="space-y-1.5">
        <Label htmlFor="contact-designation" className="font-ui">
          {CONTACTS_STRINGS.form.role.designation}
        </Label>
        <Input
          id="contact-designation"
          placeholder={CONTACTS_STRINGS.form.role.designationPlaceholder}
          value={designation}
          onChange={(e) => setDesignation(e.target.value)}
          maxLength={100}
        />
      </div>

      <div className="space-y-1.5">
        <Label className="font-ui">{CONTACTS_STRINGS.form.role.department}</Label>
        <Select
          value={department || null}
          onValueChange={(v) => setDepartment(v ?? "")}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={CONTACTS_STRINGS.form.role.departmentPlaceholder} />
          </SelectTrigger>
          <SelectContent>
            {departmentOptions.map((d) => (
              <SelectItem key={d} value={d}>
                {d}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="font-ui">
          {CONTACTS_STRINGS.form.role.status} <span className="text-destructive">*</span>
        </Label>
        <Select
          value={status}
          onValueChange={(v) => v && setStatus(v as ContactStatus)}
        >
          <SelectTrigger className="w-full" clearable={false}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CONTACT_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {CONTACT_STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="font-ui">
          {CONTACTS_STRINGS.form.role.linkedAccounts}{" "}
          {!isEdit && <span className="text-destructive">*</span>}
        </Label>
        <ContactAccountsSelect
          value={accountOptions}
          onValueChange={(next) => {
            setAccountOptions(next)
            clearError("primaryAccountId")
            clearError("accountOptions")
          }}
          primaryAccountId={primaryAccountId}
          onPrimaryAccountChange={(id) => {
            setPrimaryAccountId(id)
            clearError("primaryAccountId")
          }}
          lockedIds={lockedAccountIds}
        />
        {lockedAccountIds.length > 0 && (
          <Typography variant="caption" asChild>
            <p>{CONTACTS_STRINGS.form.role.lockedHint}</p>
          </Typography>
        )}
        <FieldError
          id="contact-accounts-error"
          message={errors.accountOptions ?? errors.primaryAccountId}
        />
      </div>
    </div>
  )
}
