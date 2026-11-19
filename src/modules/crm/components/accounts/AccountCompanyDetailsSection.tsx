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
import { useTransformedInput } from "@/shared/hooks"

import { ACCOUNT_TAGS, type AccountTagWire, type AccountTypeWire } from "../../api"
import type { AccountFormController } from "../../hooks/accounts/useAccountForm"
import { ACCOUNTS_STRINGS as S } from "./accounts.strings"
import { GST_LENGTH, PAN_LENGTH } from "./accountForm.constants"
import { SectionHeader } from "../shared/SectionHeader"

export function AccountCompanyDetailsSection({ form }: { form: AccountFormController }) {
  const {
    name, setName,
    industry, setIndustry, industryOptions,
    accountType, setAccountType, handleAccountTypeChange, accountTypeOptions, isAccountTypeLocked,
    tag, setTag,
    website, setWebsite,
    pan, setPan,
    gst, setGst,
    errors, clearError,
  } = form

  // Account names are stored and shown in UPPERCASE, so every keystroke is
  // rewritten — which moves the caret to the end unless it is restored. See
  // `useTransformedInput`.
  const nameInput = useTransformedInput(
    (value) => value.toUpperCase(),
    (value) => {
      setName(value)
      clearError("name")
    },
  )

  return (
    <div className="space-y-4">
      <SectionHeader icon={Building2} label={S.company.sectionLabel} />
      <div className="space-y-1.5">
        <Label htmlFor="account-name" className="font-ui">
          {S.company.name} <span className="text-destructive">*</span>
        </Label>
        <Input
          id="account-name"
          placeholder={S.company.namePlaceholder}
          value={name}
          maxLength={255}
          // Free text — accept spaces, digits, any characters.
          {...nameInput}
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? "account-name-error" : undefined}
        />
        <FieldError id="account-name-error" message={errors.name} />
      </div>

      <div className="space-y-1.5">
        <Label className="font-ui">
          {S.company.industry} <span className="text-destructive">*</span>
        </Label>
        <Select
          value={industry || null}
          onValueChange={(v) => {
            setIndustry(v ?? "")
            clearError("industry")
          }}
        >
          <SelectTrigger
            className="w-full"
            aria-invalid={Boolean(errors.industry)}
            aria-describedby={
              errors.industry ? "account-industry-error" : undefined
            }
          >
            <SelectValue placeholder={S.company.industryPlaceholder} />
          </SelectTrigger>
          <SelectContent>
            {industryOptions.map((ind) => (
              <SelectItem key={ind} value={ind}>
                {ind}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FieldError
          id="account-industry-error"
          message={errors.industry}
        />
      </div>

      <div className="space-y-1.5">
        <Label className="font-ui">
          {S.company.type} <span className="text-destructive">*</span>
        </Label>
        <Select
          value={accountType || null}
          onValueChange={(v) => {
            if (v) handleAccountTypeChange(v as AccountTypeWire)
            else {
              setAccountType("")
              clearError("accountType")
            }
          }}
          disabled={isAccountTypeLocked}
        >
          <SelectTrigger
            className="w-full"
            clearable={Boolean(accountType) && !isAccountTypeLocked}
            onClear={() => {
              setAccountType("")
              clearError("accountType")
            }}
            aria-invalid={Boolean(errors.accountType)}
            aria-describedby={
              errors.accountType ? "account-type-error" : undefined
            }
          >
            <SelectValue placeholder={S.company.typePlaceholder} />
          </SelectTrigger>
          <SelectContent>
            {accountTypeOptions.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FieldError
          id="account-type-error"
          message={errors.accountType}
        />
      </div>

      <div className="space-y-1.5">
        <Label className="font-ui">
          {S.company.tag} <span className="text-destructive">*</span>
        </Label>
        <Select
          value={tag || null}
          onValueChange={(v) => {
            setTag((v as AccountTagWire) ?? "")
            clearError("tag")
          }}
        >
          <SelectTrigger
            className="w-full"
            clearable={Boolean(tag)}
            onClear={() => {
              setTag("")
              clearError("tag")
            }}
            aria-invalid={Boolean(errors.tag)}
            aria-describedby={errors.tag ? "account-tag-error" : undefined}
          >
            <SelectValue placeholder={S.company.tagPlaceholder} />
          </SelectTrigger>
          <SelectContent>
            {ACCOUNT_TAGS.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FieldError id="account-tag-error" message={errors.tag} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="account-website" className="font-ui">
          {S.company.website}
        </Label>
        <Input
          id="account-website"
          placeholder={S.company.websitePlaceholder}
          value={website}
          maxLength={500}
          onChange={(e) => {
            setWebsite(e.target.value)
            clearError("website")
          }}
          aria-invalid={Boolean(errors.website)}
        />
        <FieldError message={errors.website} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="account-pan" className="font-ui">
          {S.company.pan}
        </Label>
        <Input
          id="account-pan"
          autoCapitalize="characters"
          maxLength={PAN_LENGTH}
          placeholder={S.company.panPlaceholder}
          value={pan}
          onChange={(e) => {
            // PAN is stored uppercase, alphanumeric only.
            const v = e.target.value
              .toUpperCase()
              .replace(/[^A-Z0-9]/g, "")
              .slice(0, PAN_LENGTH)
            setPan(v)
            clearError("pan_number")
          }}
          aria-invalid={Boolean(errors.pan_number)}
          aria-describedby={errors.pan_number ? "account-pan-error" : undefined}
        />
        <FieldError id="account-pan-error" message={errors.pan_number} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="account-gst" className="font-ui">
          {S.company.gst} <span className="text-destructive">*</span>
        </Label>
        <Input
          id="account-gst"
          autoCapitalize="characters"
          maxLength={GST_LENGTH}
          placeholder={S.company.gstPlaceholder}
          value={gst}
          onChange={(e) => {
            // GST is stored uppercase, alphanumeric only.
            const v = e.target.value
              .toUpperCase()
              .replace(/[^A-Z0-9]/g, "")
              .slice(0, GST_LENGTH)
            setGst(v)
            clearError("gst_number")
          }}
          aria-invalid={Boolean(errors.gst_number)}
          aria-describedby={errors.gst_number ? "account-gst-error" : undefined}
        />
        <FieldError id="account-gst-error" message={errors.gst_number} />
      </div>
    </div>
  )
}
