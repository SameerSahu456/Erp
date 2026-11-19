import { Building2, Target, UserCog } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { FieldError } from "@/components/common/forms/FieldError"
import { FormCardSkeleton } from "@/components/common/feedback/FormCardSkeleton"
import { AsyncMultiSelect } from "@/components/ui/async-multi-select"
import { AsyncSelect } from "@/components/ui/async-select"
import { DatePicker } from "@/components/common/pickers/DatePicker"
import { LoadErrorState } from "@/shared/components/feedback/LoadErrorState"
import { useTransformedInput } from "@/shared/hooks"
import { todayDateParam } from "@shared/lib/date"
import { isDecimalInput, isIntegerInput, sanitizePhoneDigits } from "@/modules/crm/lib/validation"
import { exceedsMoneyDigits } from "@/shared/lib/validation"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import { CategoryMultiSelect, useOEMOptions } from "@modules/ims"
import { getUserDisplayName } from "@modules/users"

import {
  CRM_TAG_LIST,
  LEAD_DETAILS_REQUIRED_STAGES,
  LEAD_OWNER_REQUIRED_STAGES,
  LEAD_STAGES,
} from "../../types"
import type { CrmTag, CustomerType, Lead } from "../../types"
import { leadStageLabel } from "../../constants/lead-stages"
import { ClosedLostReasonFields } from "../shared/ClosedLostReasonFields"
import { COMPANY_SIZES, NONE_VALUE, sourceLabel } from "./leadForm.constants"
import { LEADS_STRINGS as S } from "./leads.strings"
import type { LeadFormController } from "../../hooks/leads/useLeadForm"

export function LeadFormBody({ f }: { f: LeadFormController }) {
  const {
    name,
    email,
    phone,
    company,
    stage,
    value,
    source,
    closureDate,
    closedLostReason,
    description,
    categories,
    oems,
    location,
    companySize,
    website,
    employees,
    assignedTo,
    presalesManager,
    priority,
    customerType,
    tags,
    bde,
    setName,
    setEmail,
    setPhone,
    setCompany,
    setStage,
    setValue,
    setSource,
    setClosureDate,
    setClosedLostReason,
    setDescription,
    setCategories,
    setOems,
    setLocation,
    setCompanySize,
    setWebsite,
    setEmployees,
    setAssignedTo,
    setPresalesManager,
    setPriority,
    setTags,
    setBde,
    setAssignedToLabel,
    setPresalesManagerLabel,
    setBdeLabel,
    assignedToDisplay,
    bdeDisplay,
    customerTypeOptions,
    handleCustomerTypeChange,
    isCustomerTypeLocked,
    isEdit,
    leadQuery,
    loadingLead,
    presalesManagerDisplay,
    useSourceOptions,
    useAssignedToOptions,
    useBdeOptions,
    usePresalesOptions,
    errors,
    clearError,
  } = f

  // Required-field markers follow the stage rule enforced by useLeadForm:
  // Name / Company / email-or-phone / Type / Categories / Description from
  // Qualified onward, Assigned To from
  // Qualified onward plus Closed Lost.
  const detailsRequired = LEAD_DETAILS_REQUIRED_STAGES.includes(stage)
  const ownerRequired = LEAD_OWNER_REQUIRED_STAGES.includes(stage)

  // Both fields uppercase every keystroke, which moves the caret to the end of
  // the input unless it is restored — see `useTransformedInput`.
  const companyInput = useTransformedInput(
    (v) => v.toUpperCase(),
    (v) => {
      // Company names render uppercase across the CRM — store the canonical
      // uppercase form so search, sort, and badges all stay consistent
      // regardless of how sales typed it. Mirrors AccountFormPage.
      setCompany(v)
      clearError("company")
    },
  )
  const locationInput = useTransformedInput((v) => v.toUpperCase(), setLocation)

  return (
    <>
      {loadingLead ? (
        <FormCardSkeleton sections={3} rows={6} />
      ) : leadQuery.isError ? (
        <LoadErrorState error={leadQuery.error} fallback={S.form.loadError} />
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>{isEdit ? S.form.editTitle : S.form.newTitle}</CardTitle>
            </CardHeader>
            <CardContent>
              {/* erp-demo layout: three columns side-by-side, each with its own
                  SectionHeader at the top and fields stacked below. */}
              <div className="grid grid-cols-1 gap-x-7 gap-y-6 md:grid-cols-2 lg:grid-cols-3">
                {/* Column 1 — Contact & Company */}
                <div className="space-y-4">
                  <SectionHeader icon={Building2} label={S.form.sections.contactCompany} />

                  <div className="space-y-1.5">
                    <Label htmlFor="lead-name" className="font-ui">
                     {S.form.fields.name}{" "}
                     {detailsRequired && <span className="text-destructive">*</span>}
                    </Label>
                    <Input
                      id="lead-name"
                      placeholder={S.form.placeholders.name}
                      value={name}
                      maxLength={255}
                      onChange={(event) => {
                        // Free text — accept spaces, digits, any characters.
                        setName(event.target.value)
                        clearError("name")
                      }}
                      aria-invalid={Boolean(errors.name)}
                      aria-describedby={errors.name ? "lead-name-error" : undefined}
                    />
                    <FieldError id="lead-name-error" message={errors.name} />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="lead-company" className="font-ui">
                      {S.form.fields.companyName}{" "}
                      {detailsRequired && <span className="text-destructive">*</span>}
                    </Label>
                    <Input
                      id="lead-company"
                      placeholder={S.form.placeholders.companyName}
                      value={company}
                      maxLength={255}
                      {...companyInput}
                      aria-invalid={Boolean(errors.company)}
                      aria-describedby={errors.company ? "lead-company-error" : undefined}
                    />
                    <FieldError id="lead-company-error" message={errors.company} />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="lead-email" className="font-ui">
                      {S.form.fields.email}
                    </Label>
                    <Input
                      id="lead-email"
                      type="email"
                      placeholder={S.form.placeholders.email}
                      value={email}
                      maxLength={255}
                      onChange={(event) => {
                        setEmail(event.target.value)
                        clearError("contact")
                        clearError("email")
                      }}
                      aria-invalid={Boolean(errors.email || errors.contact)}
                      aria-describedby={
                        errors.email
                          ? "lead-email-error"
                          : errors.contact
                            ? "lead-contact-error"
                            : undefined
                      }
                    />
                    <FieldError id="lead-email-error" message={errors.email} />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="lead-phone" className="font-ui">
                      {S.form.fields.contactNumber}
                    </Label>
                    <Input
                      id="lead-phone"
                      inputMode="numeric"
                      maxLength={10}
                      placeholder={S.form.placeholders.phone}
                      value={phone}
                      onChange={(event) => {
                        setPhone(sanitizePhoneDigits(event.target.value))
                        clearError("contact")
                        clearError("phone")
                      }}
                      aria-invalid={Boolean(errors.phone || errors.contact)}
                      aria-describedby={
                        errors.phone
                          ? "lead-phone-error"
                          : errors.contact
                            ? "lead-contact-error"
                            : undefined
                      }
                    />
                    <FieldError id="lead-phone-error" message={errors.phone} />
                    <FieldError id="lead-contact-error" message={errors.contact} />
                    {detailsRequired && !errors.contact && (
                      <p className="text-xs text-muted-foreground">
                        {S.form.hints.reachRequired}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="lead-website" className="font-ui">{S.form.fields.website}</Label>
                    <Input
                      id="lead-website"
                      placeholder={S.form.placeholders.website}
                      value={website}
                      maxLength={500}
                      onChange={(event) => {
                        setWebsite(event.target.value)
                        clearError("website")
                      }}
                      aria-invalid={Boolean(errors.website)}
                    />
                    <FieldError message={errors.website} />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="lead-location" className="font-ui">{S.form.fields.location}</Label>
                    <Input
                      id="lead-location"
                      placeholder={S.form.placeholders.location}
                      value={location}
                      {...locationInput}
                      className="uppercase"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="font-ui">
                      {S.form.fields.type}{" "}
                      {detailsRequired && <span className="text-destructive">*</span>}
                    </Label>
                    <Select
                      value={customerType || null}
                      onValueChange={(value) => handleCustomerTypeChange(value as CustomerType)}
                      disabled={isCustomerTypeLocked}
                    >
                      <SelectTrigger
                        className="w-full"
                        aria-invalid={Boolean(errors.customerType)}
                      >
                        <SelectValue placeholder={S.form.placeholders.type} />
                      </SelectTrigger>
                      <SelectContent>
                        {customerTypeOptions.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FieldError message={errors.customerType} />
                  </div>
                </div>

                {/* Column 2 — Lead & Pricing */}
                <div className="space-y-4">
                  <SectionHeader icon={Target} label={S.form.sections.leadPricing} accent="violet" />

                  <div className="space-y-1.5">
                    <Label className="font-ui">{S.form.fields.companySize}</Label>
                    <Select value={companySize || NONE_VALUE} onValueChange={(value) => setCompanySize(!value || value === NONE_VALUE ? "" : value)}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={S.form.placeholders.companySize}>
                          {companySize || S.form.placeholders.companySize}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE_VALUE}>{S.form.none}</SelectItem>
                        {COMPANY_SIZES.map((size) => (
                          <SelectItem key={size} value={size}>
                            {size}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="lead-employees" className="font-ui">{S.form.fields.employees}</Label>
                    <Input
                      id="lead-employees"
                      type="text"
                      inputMode="numeric"
                      placeholder={S.form.placeholders.employees}
                      value={employees}
                      onChange={(event) => {
                        const v = event.target.value
                        if (!isIntegerInput(v)) return
                        if (v.length > 14) return
                        setEmployees(v)
                        clearError("employees")
                      }}
                      aria-invalid={Boolean(errors.employees)}
                    />
                    <FieldError message={errors.employees} />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="font-ui">{S.form.fields.stage}</Label>
                    <Select
                      value={stage}
                      onValueChange={(value) => setStage(value as Lead["stage"])}
                      disabled={!isEdit}
                    >
                      <SelectTrigger className="w-full" clearable={false}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LEAD_STAGES.map((leadStage) => (
                          <SelectItem key={leadStage} value={leadStage}>
                            {leadStageLabel(leadStage)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="lead-value" className="font-ui">{S.form.fields.value}</Label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                        {S.form.rupeeSymbol}
                      </span>
                      <Input
                        id="lead-value"
                        type="text"
                        inputMode="decimal"
                        placeholder={S.form.placeholders.value}
                        className="pl-7"
                        value={value}
                        onChange={(event) => {
                          const v = event.target.value
                          if (!isDecimalInput(v)) return
                          // Backend cap NUMERIC(14,2): 14 digits in total, 12 before the decimal point.
                          if (exceedsMoneyDigits(v, 14)) return
                          setValue(v)
                          clearError("value")
                        }}
                        aria-invalid={Boolean(errors.value)}
                      />
                    </div>
                    <FieldError message={errors.value} />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="font-ui">{S.form.fields.priority}</Label>
                    <Select
                      value={priority || null}
                      onValueChange={(value) => setPriority(value as Lead["priority"])}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={S.form.placeholders.priority} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="High">{S.form.priorityHigh}</SelectItem>
                        <SelectItem value="Medium">{S.form.priorityMedium}</SelectItem>
                        <SelectItem value="Low">{S.form.priorityLow}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="font-ui">{S.form.fields.source}</Label>
                    <AsyncSelect
                      value={source ? { id: source, label: sourceLabel(source) } : null}
                      onValueChange={(option) => setSource(option?.id ?? "")}
                      useOptions={useSourceOptions}
                      toLabel={(option) => option.name}
                      placeholder={S.form.placeholders.source}
                      searchPlaceholder={S.form.placeholders.searchSource}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="lead-closure-date" className="font-ui">{S.form.fields.closureDate}</Label>
                    <DatePicker
                      id="lead-closure-date"
                      value={closureDate}
                      onChange={(v) => {
                        setClosureDate(v)
                        clearError("closureDate")
                      }}
                      min={todayDateParam()}
                      placeholder={S.form.placeholders.closureDate}
                      aria-invalid={Boolean(errors.closureDate)}
                    />
                    <FieldError message={errors.closureDate} />
                  </div>
                </div>

                {/* Column 3 — Assignment & Type */}
                <div className="space-y-4">
                  <SectionHeader icon={UserCog} label={S.form.sections.assignmentType} accent="emerald" />

                  <div className="space-y-1.5">
                    <Label className="font-ui">
                      {S.form.fields.assignedTo}{" "}
                      {ownerRequired && <span className="text-destructive">*</span>}
                    </Label>
                    <AsyncSelect
                      id="lead-assigned-to"
                      loadOnOpen
                      // Clearable only while the stage doesn't require an owner
                      // (Qualified onward + Closed Lost); the validator gates it.
                      clearable={!ownerRequired}
                      value={assignedTo ? { id: assignedTo, label: assignedToDisplay } : null}
                      onValueChange={(next) => {
                        setAssignedTo(next?.id ?? "")
                        setAssignedToLabel(next?.label ?? "")
                        clearError("assigned_to")
                      }}
                      useOptions={useAssignedToOptions}
                      toLabel={getUserDisplayName}
                      placeholder={S.form.placeholders.assignedTo}
                      searchPlaceholder={S.form.placeholders.assignedToSearch}
                      className={errors.assigned_to ? "border-destructive" : undefined}
                    />
                    <FieldError
                      id="lead-assigned-to-error"
                      message={errors.assigned_to}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="font-ui">{S.form.fields.presalesManager}</Label>
                    <AsyncSelect
                      id="lead-presales-manager"
                      loadOnOpen
                      value={
                        presalesManager
                          ? { id: presalesManager, label: presalesManagerDisplay }
                          : null
                      }
                      onValueChange={(next) => {
                        setPresalesManager(next?.id ?? "")
                        setPresalesManagerLabel(next?.label ?? "")
                      }}
                      useOptions={usePresalesOptions}
                      toLabel={getUserDisplayName}
                      placeholder={S.form.placeholders.presalesManager}
                      searchPlaceholder={S.form.placeholders.presalesManagerSearch}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="font-ui">{S.form.fields.bde}</Label>
                    <AsyncSelect
                      id="lead-bde"
                      loadOnOpen
                      value={bde ? { id: bde, label: bdeDisplay } : null}
                      onValueChange={(next) => {
                        setBde(next?.id ?? "")
                        setBdeLabel(next?.label ?? "")
                        clearError("bde")
                      }}
                      useOptions={useBdeOptions}
                      toLabel={getUserDisplayName}
                      placeholder={S.form.placeholders.bde}
                      searchPlaceholder={S.form.placeholders.bdeSearch}
                      className={errors.bde ? "border-destructive" : undefined}
                    />
                    <FieldError id="lead-bde-error" message={errors.bde} />
                  </div>
                </div>
              </div>

              {stage === "Closed Lost" && (
                <div className="mt-6">
                  <ClosedLostReasonFields
                    value={closedLostReason}
                    onChange={setClosedLostReason}
                    error={errors.closedLostReason}
                    onClearError={() => clearError("closedLostReason")}
                    entityType="lead"
                    idPrefix="lead"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{S.form.sections.requirements}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-5">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label className="font-ui">{S.form.fields.orderType}</Label>
                    <Select
                      value={tags[0] ?? null}
                      onValueChange={(value) =>
                        setTags(value ? [value as CrmTag] : [])
                      }
                    >
                      <SelectTrigger
                        className="w-full"
                        clearable={tags.length > 0}
                        onClear={() => setTags([])}
                      >
                        <SelectValue placeholder={S.form.placeholders.orderType} />
                      </SelectTrigger>
                      <SelectContent>
                        {CRM_TAG_LIST.map((tag) => (
                          <SelectItem key={tag} value={tag}>
                            {tag}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="font-ui">{S.form.fields.oems}</Label>
                    <AsyncMultiSelect
                      value={oems}
                      onValueChange={setOems}
                      useOptions={useOEMOptions}
                      toLabel={(oem) => oem.name}
                      placeholder={S.form.placeholders.oems}
                      loadOnOpen
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="font-ui">
                      {S.form.fields.categories}{" "}
                      {detailsRequired && <span className="text-destructive">*</span>}
                    </Label>
                    <CategoryMultiSelect
                      value={categories}
                      onValueChange={(next) => {
                        setCategories(next)
                        clearError("categories")
                      }}
                      placeholder={S.form.placeholders.categories}
                    />
                    <FieldError message={errors.categories} />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="font-ui">
                    {S.form.fields.description}{" "}
                    {detailsRequired && <span className="text-destructive">*</span>}
                  </Label>
                  <RichTextEditor
                    placeholder={S.form.placeholders.description}
                    value={description}
                    onChange={(html) => {
                      setDescription(html)
                      clearError("description")
                    }}
                  />
                  <FieldError
                    id="lead-description-error"
                    message={errors.description}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </>
  )
}

function SectionHeader({
  icon: Icon,
  label,
  accent = "primary",
}: {
  icon: React.ElementType
  label: string
  accent?: "primary" | "emerald" | "violet"
}) {
  const tone =
    accent === "emerald"
      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
      : accent === "violet"
        ? "bg-violet-500/10 text-violet-600 dark:text-violet-400"
        : "bg-primary/10 text-primary"

  return (
    <div className="flex items-center gap-2 border-b border-border/70 pb-3">
      <span
        className={`inline-flex size-7 shrink-0 items-center justify-center rounded-lg ${tone}`}
      >
        <Icon className="size-3.5" strokeWidth={2} />
      </span>
      <h3 className="text-[12.5px] font-semibold uppercase tracking-[0.06em] text-foreground">
        {label}
      </h3>
    </div>
  )
}
