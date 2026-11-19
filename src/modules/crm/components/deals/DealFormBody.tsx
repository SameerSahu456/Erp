import { useMemo } from "react"
import { Building2, Target, UserCog } from "lucide-react"

import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import { Label } from "@/components/ui/label"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FieldError } from "@/components/common/forms/FieldError"
import { useTransformedInput } from "@/shared/hooks"
import { exceedsMoneyDigits, isDecimalInput } from "@/shared/lib/validation"
import { AsyncMultiSelect } from "@/components/ui/async-multi-select"
import { AsyncSelect } from "@/components/ui/async-select"
import { DatePicker } from "@/components/common/pickers/DatePicker"
import { todayDateParam } from "@shared/lib/date"
import { getUserDisplayName } from "@modules/users"
import { CategoryMultiSelect, useOEMOptions } from "@modules/ims"

import { type DealChannelType, type DealPriority, type DealStage, type DealTag, DEAL_TAG_LIST } from "../../api"
import { DealAccountSelect } from "../../components/deals/DealAccountSelect"
import { DealContactSelect } from "../../components/deals/DealContactSelect"
import { ClosedLostReasonFields } from "../shared/ClosedLostReasonFields"
import { DEAL_SOURCES, PRIORITIES } from "./dealForm.constants"
import { sourceLabel } from "../leads/leadForm.constants"
import { DEALS_STRINGS } from "./deals.strings"
import type { DealFormController } from "../../hooks/deals/useDealForm"

export function DealFormBody({ f }: { f: DealFormController }) {
  const {
    title,
    accountId,
    contactId,
    ownerId,
    presalesManagerId,
    stage,
    priority,
    channelType,
    tags,
    value,
    requirement,
    location,
    source,
    closureDate,
    closedLostReason,
    setTitle,
    setAccountId,
    setContactId,
    setOwnerId,
    setPresalesManagerId,
    setStage,
    setPriority,
    setTags,
    setCategories,
    oems,
    setOems,
    setValue,
    setRequirement,
    setLocation,
    setSource,
    setClosureDate,
    setClosedLostReason,
    setPresalesPickedLabel,
    categoriesForDisplay,
    channelTypeOptions,
    handleChannelTypeChange,
    isChannelTypeLocked,
    isEdit,
    isView,
    selectedAccountQuery,
    headerAccountName,
    ownerDisplay,
    ownerItems,
    ownersQuery,
    presalesManagerDisplay,
    stageOptions,
    useOwnerOptions,
    usePresalesOptions,
    errors,
    clearError,
  } = f

  // Uppercasing each keystroke moves the caret to the end of the field
  // unless it is restored — see `useTransformedInput`.
  const locationInput = useTransformedInput((v) => v.toUpperCase(), setLocation)

  // Free-text source: union the suggested list with the current value so a
  // value inherited from a lead (outside DEAL_SOURCES) still renders selected.
  const sourceOptions = useMemo(() => {
    const values = new Set<string>(DEAL_SOURCES)
    if (source.trim()) values.add(source.trim())
    return [...values]
  }, [source])

  return (
    // View mode: a native disabled fieldset disables every nested control.
    <fieldset
      disabled={isView}
      className={cn(
        "m-0 min-w-0 space-y-4 border-0 p-0",
        // View mode keeps controls inert but fully legible: undo the shared
        // 50–60% disabled fade and the browser's greyed disabled text colour.
        isView &&
          "[&_:disabled]:opacity-100! [&_.opacity-60]:opacity-100! [&_input:disabled]:text-foreground [&_input:disabled]:[-webkit-text-fill-color:var(--foreground)] [&_textarea:disabled]:[-webkit-text-fill-color:var(--foreground)]",
      )}
    >
      <Card>
        <CardHeader>
          <CardTitle>
            {isView
              ? DEALS_STRINGS.form.viewTitle
              : isEdit
                ? DEALS_STRINGS.form.editTitle
                : DEALS_STRINGS.form.newTitle}
          </CardTitle>
        </CardHeader>
        <CardContent>

          {/* erp-demo layout: three columns side-by-side, each with its own
              SectionHeader at the top and fields stacked below. */}
          <div className="grid grid-cols-1 gap-x-7 gap-y-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Column 1 — Account & Contact */}
            <div className="space-y-4">
              <SectionHeader icon={Building2} label={DEALS_STRINGS.form.sections.accountContact} />

              <div className="space-y-1.5">
                <Label className="font-ui">
                  {DEALS_STRINGS.form.fields.account} <span className="text-destructive">*</span>
                </Label>
                <DealAccountSelect
                  value={accountId}
                  fallbackLabel={headerAccountName}
                  onValueChange={(nextId) => {
                    setAccountId(nextId)
                    clearError("accountId")
                    setContactId(null)
                  }}
                />
                <FieldError id="deal-account-error" message={errors.accountId} />
              </div>

              <div className="space-y-1.5">
                <Label className="font-ui">
                  {DEALS_STRINGS.form.fields.contact} <span className="text-destructive">*</span>
                </Label>
                <DealContactSelect
                  value={contactId}
                  onValueChange={(nextId) => {
                    setContactId(nextId)
                    clearError("contactId")
                  }}
                  accountId={accountId ?? undefined}
                />
                <FieldError id="deal-contact-error" message={errors.contactId} />
              </div>

              {/* Read-only: comes from the selected account, never edited here. */}
              {isView && (
                <div className="space-y-1.5">
                  <Label htmlFor="deal-account-website" className="font-ui">
                    {DEALS_STRINGS.form.fields.website}
                  </Label>
                  <Input
                    id="deal-account-website"
                    value={selectedAccountQuery.data?.website ?? ""}
                    placeholder="—"
                    readOnly
                    tabIndex={-1}
                    className="bg-muted/40 text-muted-foreground"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="deal-title" className="font-ui">
                  {DEALS_STRINGS.form.fields.title} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="deal-title"
                  placeholder={DEALS_STRINGS.form.placeholders.title}
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value)
                    clearError("title")
                  }}
                  maxLength={255}
                  aria-invalid={Boolean(errors.title)}
                  aria-describedby={errors.title ? "deal-title-error" : undefined}
                />
                <FieldError id="deal-title-error" message={errors.title} />
              </div>

              {/* Read-only: comes from the selected account, never edited here. */}
              {isView && (
                <div className="space-y-1.5">
                  <Label htmlFor="deal-account-website" className="font-ui">
                    {DEALS_STRINGS.form.fields.website}
                  </Label>
                  <Input
                    id="deal-account-website"
                    value={selectedAccountQuery.data?.website ?? ""}
                    placeholder="—"
                    readOnly
                    tabIndex={-1}
                    className="bg-muted/40 text-muted-foreground"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="deal-location" className="font-ui">{DEALS_STRINGS.form.fields.location}</Label>
                <Input
                  id="deal-location"
                  placeholder={DEALS_STRINGS.form.placeholders.location}
                  value={location}
                  {...locationInput}
                  className="uppercase"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="font-ui">{DEALS_STRINGS.form.fields.type}</Label>
                <Select
                  value={channelType || null}
                  onValueChange={(val) =>
                    handleChannelTypeChange((val as DealChannelType) ?? "")
                  }
                  disabled={isChannelTypeLocked}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={DEALS_STRINGS.form.placeholders.type} />
                  </SelectTrigger>
                  <SelectContent>
                    {channelTypeOptions.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Column 2 — Deal & Pricing */}
            <div className="space-y-4">
              <SectionHeader icon={Target} label={DEALS_STRINGS.form.sections.dealPricing} accent="violet" />

              <div className="space-y-1.5">
                <Label className="font-ui">{DEALS_STRINGS.form.fields.stage}</Label>
                <Select
                  value={stage}
                  onValueChange={(val) => val && setStage(val as DealStage)}
                >
                  <SelectTrigger className="w-full" clearable={false}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {stageOptions.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="deal-value" className="font-ui">
                  {DEALS_STRINGS.form.fields.value}
                </Label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    &#8377;
                  </span>
                  <Input
                    id="deal-value"
                    type="text"
                    inputMode="decimal"
                    placeholder={DEALS_STRINGS.form.placeholders.value}
                    className="pl-7"
                    value={value}
                    onChange={(e) => {
                      const v = e.target.value
                      if (!isDecimalInput(v)) return
                      // Same cap as the lead value: 14 digits total, 12 before the point.
                      if (exceedsMoneyDigits(v, 14)) return
                      setValue(v)
                      clearError("value")
                    }}
                    aria-invalid={Boolean(errors.value)}
                    aria-describedby={errors.value ? "deal-value-error" : undefined}
                  />
                </div>
                <FieldError id="deal-value-error" message={errors.value} />
              </div>

              <div className="space-y-1.5">
                <Label className="font-ui">{DEALS_STRINGS.form.fields.priority}</Label>
                <Select
                  value={priority || null}
                  onValueChange={(val) =>
                    setPriority((val ?? "") as DealPriority | "")
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={DEALS_STRINGS.form.placeholders.priority} />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="font-ui">{DEALS_STRINGS.form.fields.source}</Label>
                <Select
                  value={source || null}
                  onValueChange={(val) => setSource(val ?? "")}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={DEALS_STRINGS.form.placeholders.source}>
                      {source ? sourceLabel(source) : DEALS_STRINGS.form.placeholders.source}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {sourceOptions.map((s) => (
                      <SelectItem key={s} value={s}>
                        {sourceLabel(s)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="deal-closure-date" className="font-ui">{DEALS_STRINGS.form.fields.closureDate}</Label>
                <DatePicker
                  id="deal-closure-date"
                  value={closureDate}
                  onChange={(v) => {
                    setClosureDate(v)
                    clearError("closureDate")
                  }}
                  min={todayDateParam()}
                  placeholder={DEALS_STRINGS.form.placeholders.closureDate}
                  aria-invalid={Boolean(errors.closureDate)}
                />
                <FieldError message={errors.closureDate} />
              </div>
            </div>

            {/* Column 3 — Assignment */}
            <div className="space-y-4">
              <SectionHeader icon={UserCog} label={DEALS_STRINGS.form.sections.assignment} accent="emerald" />

              <div className="space-y-1.5">
                <Label className="font-ui">
                  {DEALS_STRINGS.form.fields.owner} <span className="text-destructive">*</span>
                </Label>
                <AsyncSelect
                  id="deal-owner"
                  clearable={false}
                  disabled={!accountId}
                  value={ownerId ? { id: ownerId, label: ownerDisplay } : null}
                  onValueChange={(next) => {
                    setOwnerId(next?.id ?? "")
                    clearError("ownerId")
                  }}
                  useOptions={useOwnerOptions}
                  toLabel={(o) => o.name}
                  placeholder={
                    accountId
                      ? ownersQuery.isLoading
                        ? DEALS_STRINGS.form.placeholders.ownerLoading
                        : ownerItems.length === 0
                          ? DEALS_STRINGS.form.placeholders.ownerNone
                          : DEALS_STRINGS.form.placeholders.ownerSelect
                      : DEALS_STRINGS.form.placeholders.ownerSelectAccountFirst
                  }
                  searchPlaceholder={DEALS_STRINGS.form.placeholders.ownerSearch}
                  className={errors.ownerId ? "border-destructive" : undefined}
                />
                <FieldError message={errors.ownerId} />
              </div>

              <div className="space-y-1.5">
                <Label className="font-ui">{DEALS_STRINGS.form.fields.presalesManager}</Label>
                <AsyncSelect
                  id="deal-presales-manager"
                  loadOnOpen
                  value={
                    presalesManagerId
                      ? { id: presalesManagerId, label: presalesManagerDisplay }
                      : null
                  }
                  onValueChange={(next) => {
                    setPresalesManagerId(next?.id ?? "")
                    setPresalesPickedLabel(next?.label ?? "")
                  }}
                  useOptions={usePresalesOptions}
                  toLabel={getUserDisplayName}
                  placeholder={DEALS_STRINGS.form.placeholders.presalesManager}
                  searchPlaceholder={DEALS_STRINGS.form.placeholders.presalesManagerSearch}
                />
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
                entityType="deal"
                idPrefix="deal"
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{DEALS_STRINGS.form.sections.requirementsCategories}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-x-5 gap-y-5 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label className="font-ui">{DEALS_STRINGS.form.fields.orderType}</Label>
                <Select
                  value={tags[0] ?? null}
                  onValueChange={(value) =>
                    setTags(value ? [value as DealTag] : [])
                  }
                >
                  <SelectTrigger
                    className="w-full"
                    clearable={tags.length > 0}
                    onClear={() => setTags([])}
                  >
                    <SelectValue placeholder={DEALS_STRINGS.form.placeholders.orderType} />
                  </SelectTrigger>
                  <SelectContent>
                    {DEAL_TAG_LIST.map((tag) => (
                      <SelectItem key={tag} value={tag}>
                        {tag}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="font-ui">{DEALS_STRINGS.form.fields.oems}</Label>
                <AsyncMultiSelect
                  value={oems}
                  onValueChange={setOems}
                  useOptions={useOEMOptions}
                  toLabel={(oem) => oem.name}
                  placeholder={DEALS_STRINGS.form.placeholders.oems}
                  loadOnOpen
                />
              </div>

              <div className="space-y-1.5">
                <Label className="font-ui">
                  {DEALS_STRINGS.form.fields.categories} <span className="text-destructive">*</span>
                </Label>
                <CategoryMultiSelect
                  value={categoriesForDisplay}
                  onValueChange={(next) => {
                    setCategories(next)
                    clearError("categories")
                  }}
                  placeholder={DEALS_STRINGS.form.placeholders.categories}
                />
                <FieldError message={errors.categories} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="deal-requirement" className="font-ui">
                {DEALS_STRINGS.form.fields.description}
              </Label>
              <RichTextEditor
                placeholder={DEALS_STRINGS.form.placeholders.description}
                value={requirement}
                onChange={(html) => setRequirement(html)}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </fieldset>
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
