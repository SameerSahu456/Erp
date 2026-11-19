import { Building2, User } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DocumentUploadField } from '@/components/common/files/DocumentUploadField'
import { useTransformedInput } from '@/shared/hooks'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CategoryMultiSelect } from '@modules/ims'
import { isDecimalInput, REVENUE_MAX_INTEGER_DIGITS } from '@/modules/crm/lib/validation'

import {
  ACCOUNT_DOC_ALLOWED_MIMES,
  ACCOUNT_DOC_LABELS,
  ACCOUNT_DOC_MAX_BYTES,
  ACCOUNT_DOC_TYPES,
} from '@/modules/crm/constants/account-documents'
import {
  ACCOUNT_TAGS,
  ACCOUNT_TYPE_VALUES,
  COMPANY_SIZE_OPTIONS,
  INDUSTRY_OPTIONS,
  type AccountTagWire,
  type AccountTypeWire,
} from '../../api'
import type { ClosedWonController } from '../../hooks/close-won/useClosedWonWizard'
import { sanitizePhoneDigits } from '../../lib/validation'
import { CLOSE_WON_STRINGS } from './close-won.strings'

const S = CLOSE_WON_STRINGS.accountStep

// Closed-Won wizard Step 1 — Account + primary contact details + KYC documents
// (leads-only branch). Extracted verbatim from ClosedWonWizardBody; all state
// and handlers come from the `f` controller.
export function ClosedWonAccountStep({ f }: { f: ClosedWonController }) {
  const {
    accountName,
    accountType,
    categoriesInterested,
    companySize,
    contactEmail,
    contactError,
    contactPhone,
    department,
    designation,
    documents,
    duplicateAccount,
    employees,
    firstName,
    gstError,
    gstNumber,
    industry,
    isLead,
    lastName,
    leadQuery,
    panError,
    panNumber,
    revenue,
    setAccountName,
    setAccountType,
    setCategoriesInterested,
    setCompanySize,
    setContactEmail,
    setContactPhone,
    setDepartment,
    setDesignation,
    setEmployees,
    setFirstName,
    setGstNumber,
    setIndustry,
    setLastName,
    setPanNumber,
    setRevenue,
    setDocument,
    setTag,
    setWebsite,
    tag,
    website,
  } = f

  // These three uppercase every keystroke, which sends the caret to the end
  // of the field on any mid-string edit — see `useTransformedInput`.
  const upper = (v: string) => v.toUpperCase()
  const accountNameInput = useTransformedInput(upper, setAccountName)
  const panInput = useTransformedInput(upper, setPanNumber)
  const gstInput = useTransformedInput(upper, setGstNumber)

  // GST is mandatory, but — like the other required fields (name/industry/
  // type) — the empty state is enforced silently by the disabled Next button.
  // Only surface the inline GST error once the user has typed (i.e. a format
  // problem), so it doesn't flash on a pristine step you've just landed on.
  const showGstError = !!gstError && gstNumber.trim() !== ""

  return (
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
              {/* Left: Account + Contact stacked */}
              <div className="space-y-6 xl:col-span-8">
                {/* Account Details */}
                <Card>
                  <CardContent className="p-5">
                    <div className="mb-4 flex items-center gap-2.5">
                      <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
                        <Building2 className="size-4 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-[13.5px] font-semibold leading-tight">{S.account.heading}</h3>
                        <p className="text-xs text-muted-foreground">{S.account.subtitle}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-x-5 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
                      <div className="space-y-2 sm:col-span-2 lg:col-span-3">
                        <Label>{S.account.nameLabel} <span className="text-destructive">*</span></Label>
                        <Input value={accountName} {...accountNameInput} placeholder={S.account.namePlaceholder} maxLength={255} />
                        {duplicateAccount && (
                          <p className="text-[11.5px] text-amber-600 dark:text-amber-400">
                            {S.account.duplicateBefore}<span className="font-semibold">"{duplicateAccount.name}"</span>
                            {/* ({duplicateAccount.code}) already exists. Continuing will create a duplicate. */}
                            {S.account.duplicateAfter}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>{S.account.industryLabel} <span className="text-destructive">*</span></Label>
                        <Select
                          value={industry || null}
                          onValueChange={(v) => setIndustry(v ?? '')}
                        >
                          <SelectTrigger className="w-full"><SelectValue placeholder={S.account.industryPlaceholder} /></SelectTrigger>
                          <SelectContent>
                            {INDUSTRY_OPTIONS.map((ind) => <SelectItem key={ind} value={ind}>{ind}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>{S.account.typeLabel} <span className="text-destructive">*</span></Label>
                        <Select
                          value={accountType || null}
                          onValueChange={(v) => setAccountType((v ?? '') as AccountTypeWire | '')}
                          disabled={isLead && !!leadQuery.data?.channel_type}
                        >
                          <SelectTrigger className="w-full"><SelectValue placeholder={S.account.typePlaceholder} /></SelectTrigger>
                          <SelectContent>
                            {ACCOUNT_TYPE_VALUES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>{S.account.companySizeLabel}</Label>
                        <Select
                          value={companySize || null}
                          onValueChange={(v) => setCompanySize(v ?? '')}
                        >
                          <SelectTrigger className="w-full"><SelectValue placeholder={S.account.companySizePlaceholder} /></SelectTrigger>
                          <SelectContent>
                            {COMPANY_SIZE_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>{S.account.employeesLabel}</Label>
                        <Input
                          type="number"
                          min={0}
                          max={10000000}
                          value={employees}
                          onChange={(e) => {
                            const raw = e.target.value
                            if (!raw) {
                              setEmployees('')
                              return
                            }
                            const n = Number(raw)
                            // Backend AccountInlineData.employees: 0 … 10,000,000.
                            setEmployees(
                              Number.isNaN(n)
                                ? ''
                                : Math.min(10_000_000, Math.max(0, Math.trunc(n))),
                            )
                          }}
                          placeholder={S.account.employeesPlaceholder}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{S.account.tagLabel} <span className="text-destructive">*</span></Label>
                        <Select
                          value={tag}
                          onValueChange={(v) => v && setTag(v as AccountTagWire)}
                        >
                          <SelectTrigger className="w-full" clearable={false}><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {ACCOUNT_TAGS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>{S.account.websiteLabel}</Label>
                        <Input
                          placeholder={S.account.websitePlaceholder}
                          value={website}
                          maxLength={255}
                          onChange={(e) => setWebsite(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{S.account.revenueLabel}</Label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">₹</span>
                          <Input
                            type="text"
                            inputMode="decimal"
                            placeholder={S.account.revenuePlaceholder}
                            className="pl-7"
                            value={revenue}
                            onChange={(e) => {
                              // Cap integer digits at the backend's
                              // `Decimal(max_digits=18, decimal_places=2)`
                              // limit so a long paste can't reach the submit
                              // path (where it would become scientific
                              // notation and 400).
                              const v = e.target.value
                              if (isDecimalInput(v, 2, REVENUE_MAX_INTEGER_DIGITS)) setRevenue(v)
                            }}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>{S.account.panLabel}</Label>
                        <Input
                          value={panNumber}
                          {...panInput}
                          maxLength={10}
                          placeholder={S.account.panPlaceholder}
                          className={cn("font-mono uppercase tracking-wide", panError && "border-destructive focus-visible:ring-destructive/40")}
                          aria-invalid={!!panError}
                          aria-describedby={panError ? 'pan-error' : undefined}
                        />
                        {panError ? (
                          <p id="pan-error" className="text-[11.5px] text-destructive">{panError}</p>
                        ) : (
                          <></>
                          // <p className="text-[11.5px] text-muted-foreground">10 chars · 5 letters · 4 digits · 1 letter</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>{S.account.gstLabel} <span className="text-destructive">*</span></Label>
                        <Input
                          value={gstNumber}
                          {...gstInput}
                          maxLength={15}
                          placeholder={S.account.gstPlaceholder}
                          className={cn("font-mono uppercase tracking-wide", showGstError && "border-destructive focus-visible:ring-destructive/40")}
                          aria-invalid={showGstError}
                          aria-describedby={showGstError ? 'gst-error' : undefined}
                        />
                        {showGstError ? (
                          <p id="gst-error" className="text-[11.5px] text-destructive">{gstError}</p>
                        ) : (
                          <></>
                          // <p className="text-[11.5px] text-muted-foreground">15 chars · state + PAN + entity + Z + check</p>
                        )}
                      </div>
                      <div className="space-y-2 sm:col-span-2 lg:col-span-3">
                        <Label>{S.account.categoriesInterestedLabel}</Label>
                        <CategoryMultiSelect
                          value={categoriesInterested}
                          onValueChange={setCategoriesInterested}
                          placeholder={S.account.categoriesInterestedPlaceholder}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Contact Details */}
                <Card>
                  <CardContent className="p-5">
                    <div className="mb-4 flex items-center gap-2.5">
                      <div className="flex size-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
                        <User className="size-4" />
                      </div>
                      <div>
                        <h3 className="text-[13.5px] font-semibold leading-tight">{S.contact.heading}</h3>
                        <p className="text-xs text-muted-foreground">{S.contact.subtitle}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-x-5 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
                      <div className="space-y-2">
                        <Label>{S.contact.firstNameLabel}</Label>
                        <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder={S.contact.firstNamePlaceholder} maxLength={120} />
                      </div>
                      <div className="space-y-2">
                        <Label>{S.contact.lastNameLabel}</Label>
                        <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder={S.contact.lastNamePlaceholder} maxLength={120} />
                      </div>
                      <div className="space-y-2">
                        <Label>{S.contact.emailLabel}</Label>
                        <Input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder={S.contact.emailPlaceholder} maxLength={255} />
                      </div>
                      <div className="space-y-2">
                        <Label>{S.contact.phoneLabel}</Label>
                        <Input value={contactPhone} inputMode="numeric" maxLength={10} onChange={(e) => setContactPhone(sanitizePhoneDigits(e.target.value))} placeholder={S.contact.phonePlaceholder} />
                      </div>
                      <div className="space-y-2">
                        <Label>{S.contact.designationLabel}</Label>
                        <Input value={designation} onChange={(e) => setDesignation(e.target.value)} placeholder={S.contact.designationPlaceholder} maxLength={100} />
                      </div>
                      <div className="space-y-2">
                        <Label>{S.contact.departmentLabel}</Label>
                        <Input value={department} onChange={(e) => setDepartment(e.target.value)} placeholder={S.contact.departmentPlaceholder} maxLength={100} />
                      </div>
                    </div>
                    {contactError && (
                      <p className="mt-3 text-[11.5px] text-destructive">
                        {contactError}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Right: Documents (sticky) */}
              <div className="xl:col-span-4">
                <div className="xl:sticky xl:top-[5.25rem]">
                  <Card>
                    <CardContent className="p-5">
                      {(() => {
                        const docCount = Object.values(documents).filter(Boolean).length
                        return (
                          <div className="mb-1 flex items-start justify-between gap-3">
                            <div>
                              <h3 className="text-[13.5px] font-semibold leading-tight">{S.documents.heading}</h3>
                              <p className="text-xs text-muted-foreground">{S.documents.subtitle}</p>
                            </div>
                            <Badge variant={docCount ? 'secondary' : 'outline'} className="shrink-0 text-[11px]">
                              {docCount}/{ACCOUNT_DOC_TYPES.length}
                            </Badge>
                          </div>
                        )
                      })()}
                      <div className="mt-4 grid grid-cols-2 gap-3">
                        {ACCOUNT_DOC_TYPES.map((docType) => (
                          <DocumentUploadField
                            key={docType}
                            variant="card"
                            label={ACCOUNT_DOC_LABELS[docType]}
                            value={documents[docType]}
                            onChange={(file) => setDocument(docType, file)}
                            allowedMimes={ACCOUNT_DOC_ALLOWED_MIMES}
                            maxBytes={ACCOUNT_DOC_MAX_BYTES}
                          />
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
  )
}
