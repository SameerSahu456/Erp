import { Briefcase } from "lucide-react"

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
import { isDecimalInput, isIntegerInput } from "@/modules/crm/lib/validation"

import { COMPANY_SIZE_OPTIONS, type CompanySizeWire } from "../../api"
import type { AccountFormController } from "../../hooks/accounts/useAccountForm"
import { ACCOUNTS_STRINGS as S } from "./accounts.strings"
import { SectionHeader } from "../shared/SectionHeader"

export function AccountSizeRevenueSection({ form }: { form: AccountFormController }) {
  const {
    companySize, setCompanySize,
    employees, setEmployees,
    revenue, setRevenue,
    errors, clearError,
  } = form

  return (
    <div className="space-y-4">
      <SectionHeader icon={Briefcase} label={S.sizeRevenue.sectionLabel} accent="violet" />

      <div className="space-y-1.5">
        <Label className="font-ui">{S.sizeRevenue.companySize}</Label>
        <Select
          value={companySize || null}
          onValueChange={(v) =>
            setCompanySize((v ?? "") as CompanySizeWire | "")
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={S.sizeRevenue.companySizePlaceholder} />
          </SelectTrigger>
          <SelectContent>
            {COMPANY_SIZE_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="account-employees" className="font-ui">
          {S.sizeRevenue.employees}
        </Label>
        <Input
          id="account-employees"
          type="text"
          inputMode="numeric"
          placeholder={S.sizeRevenue.employeesPlaceholder}
          value={employees}
          onChange={(e) => {
            const v = e.target.value
            if (!isIntegerInput(v)) return
            setEmployees(v)
            clearError("employees")
          }}
          aria-invalid={Boolean(errors.employees)}
          aria-describedby={
            errors.employees ? "account-employees-error" : undefined
          }
        />
        <FieldError
          id="account-employees-error"
          message={errors.employees}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="account-revenue" className="font-ui">
          {S.sizeRevenue.annualRevenue}
        </Label>
        <div className="relative">
          <Typography variant="body" tone="muted" asChild>
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2">
              ₹
            </span>
          </Typography>
          <Input
            id="account-revenue"
            type="text"
            inputMode="decimal"
            placeholder="0"
            className="pl-7"
            value={revenue}
            onChange={(e) => {
              const v = e.target.value
              if (!isDecimalInput(v)) return
              setRevenue(v)
              clearError("revenue")
            }}
            aria-invalid={Boolean(errors.revenue)}
            aria-describedby={
              errors.revenue ? "account-revenue-error" : undefined
            }
          />
        </div>
        <FieldError id="account-revenue-error" message={errors.revenue} />
      </div>
    </div>
  )
}
