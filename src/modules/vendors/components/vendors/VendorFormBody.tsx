import { useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useNavigateBack } from '@/hooks/use-navigate-back'
import { useUnsavedChangesGuard } from '@/hooks/use-unsaved-changes-guard'
import { Check } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Typography } from '@/components/ui/typography'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { FormPageShell } from '@/components/page-shells'
import { UnsavedChangesDialog } from '@/components/common/dialogs/UnsavedChangesDialog'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { FileUpload } from '@/components/common/files/FileUpload'
import { TagInput } from '@/components/common/pickers/TagInput'
import { mockVendorRegistrations } from '@/modules/vendors/data/vendors'
import { mockCategories } from '@/modules/ims/data/categories'
import type { VendorRegistration } from '@/modules/vendors/types'
import { formatINRCompact } from "@/lib/currency"
import { VENDORS_STRINGS } from './vendors.strings'


export const STEPS = [
  { id: 'company', label: 'Company' },
  { id: 'contact', label: 'Contact' },
  { id: 'address', label: 'Address' },
  { id: 'tax', label: 'Tax & Legal' },
  { id: 'bank', label: 'Bank' },
  { id: 'terms', label: 'Terms' },
  { id: 'categories', label: 'Categories' },
  { id: 'documents', label: 'Documents' },
  { id: 'review', label: 'Review' },
]

export const COMPANY_TYPES: VendorRegistration['companyType'][] = [
  'Manufacturer',
  'Distributor',
  'Reseller',
  'Service Provider',
]

export const PAYMENT_TERMS: VendorRegistration['paymentTerms'][] = [
  'Net 15',
  'Net 30',
  'Net 45',
  'Net 60',
  'Advance',
]

export const availableCategories = mockCategories.map((c) => c.name)


export interface FormData {
  companyName: string
  companyType: string
  industry: string
  website: string
  notes: string
  primaryContact: string
  primaryEmail: string
  primaryPhone: string
  secondaryContact: string
  secondaryEmail: string
  secondaryPhone: string
  address: string
  city: string
  state: string
  pincode: string
  country: string
  gstNumber: string
  panNumber: string
  msmeRegistration: string
  tradeLicense: string
  bankAccountName: string
  bankAccountNumber: string
  bankIfscCode: string
  bankName: string
  bankBranch: string
  paymentTerms: string
  creditLimit: string
  productCategories: string[]
}

export function getInitialFormData(vendor?: VendorRegistration): FormData {
  if (vendor) {
    return {
      companyName: vendor.companyName,
      companyType: vendor.companyType,
      industry: vendor.industry,
      website: vendor.website ?? '',
      notes: vendor.notes ?? '',
      primaryContact: vendor.primaryContact,
      primaryEmail: vendor.primaryEmail,
      primaryPhone: vendor.primaryPhone,
      secondaryContact: vendor.secondaryContact ?? '',
      secondaryEmail: vendor.secondaryEmail ?? '',
      secondaryPhone: vendor.secondaryPhone ?? '',
      address: vendor.address,
      city: vendor.city,
      state: vendor.state,
      pincode: vendor.pincode,
      country: vendor.country,
      gstNumber: vendor.gstNumber,
      panNumber: vendor.panNumber,
      msmeRegistration: vendor.msmeRegistration ?? '',
      tradeLicense: vendor.tradeLicense ?? '',
      bankAccountName: vendor.bankAccountName,
      bankAccountNumber: vendor.bankAccountNumber,
      bankIfscCode: vendor.bankIfscCode,
      bankName: vendor.bankName,
      bankBranch: vendor.bankBranch,
      paymentTerms: vendor.paymentTerms,
      creditLimit: vendor.creditLimit ? String(vendor.creditLimit) : '',
      productCategories: vendor.productCategories,
    }
  }
  return {
    companyName: '',
    companyType: 'Manufacturer',
    industry: '',
    website: '',
    notes: '',
    primaryContact: '',
    primaryEmail: '',
    primaryPhone: '',
    secondaryContact: '',
    secondaryEmail: '',
    secondaryPhone: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India',
    gstNumber: '',
    panNumber: '',
    msmeRegistration: '',
    tradeLicense: '',
    bankAccountName: '',
    bankAccountNumber: '',
    bankIfscCode: '',
    bankName: '',
    bankBranch: '',
    paymentTerms: 'Net 30',
    creditLimit: '',
    productCategories: [],
  }
}


export function VendorFormBody() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const goBack = useNavigateBack('/vendors')
  const isEdit = Boolean(id) && id !== 'new'
  const existingVendor = isEdit ? mockVendorRegistrations.find((v) => v.id === id) : undefined

  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState<FormData>(() => getInitialFormData(existingVendor))
  const [uploadFiles, setUploadFiles] = useState<File[]>([])

  // Prompt before losing edits on Cancel / back / breadcrumb. Dirty once any
  // field differs from what the form opened with, or a document is staged.
  const initialFormData = useMemo(() => getInitialFormData(existingVendor), [existingVendor])
  const isDirty =
    uploadFiles.length > 0 || JSON.stringify(formData) !== JSON.stringify(initialFormData)
  const guard = useUnsavedChangesGuard({ isDirty })

  const isFirst = currentStep === 0
  const isLast = currentStep === STEPS.length - 1

  function updateField<K extends keyof FormData>(key: K, value: FormData[K]) {
    setFormData((prev) => ({ ...prev, [key]: value }))
  }

  async function handleNext() {
    if (isLast) {
      // Submitting is a clean exit — drop the guard so it doesn't prompt, then
      // pop the sentinel it pushed before leaving.
      guard.bypassOnce()
      await guard.popSentinelIfPresent()
      navigate('/vendors', { replace: true })
    } else {
      setCurrentStep((s) => s + 1)
    }
  }

  function handlePrev() {
    if (!isFirst) setCurrentStep((s) => s - 1)
  }

  function handleStepClick(index: number) {
    setCurrentStep(index)
  }

  // Field helper
  function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
    return (
      <div className={className}>
        <Label className="mb-1.5">{label}</Label>
        {children}
      </div>
    )
  }

  // --- Step content ---
  function renderStepContent() {
    switch (currentStep) {
      case 0: // Company Details
        return (
          <Card size="sm">
            <CardHeader>
              <CardTitle>{VENDORS_STRINGS.form.company.cardTitle}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label={VENDORS_STRINGS.form.company.companyName} className="sm:col-span-2">
                  <Input
                    value={formData.companyName}
                    onChange={(e) => updateField('companyName', e.target.value)}
                    placeholder={VENDORS_STRINGS.form.company.companyNamePlaceholder}
                  />
                </Field>
                <Field label={VENDORS_STRINGS.form.company.companyType}>
                  <Select
                    value={formData.companyType}
                    onValueChange={(v) => updateField('companyType', v as string)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={VENDORS_STRINGS.form.company.companyTypePlaceholder} />
                    </SelectTrigger>
                    <SelectContent>
                      {COMPANY_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label={VENDORS_STRINGS.form.company.industry}>
                  <Input
                    value={formData.industry}
                    onChange={(e) => updateField('industry', e.target.value)}
                    placeholder={VENDORS_STRINGS.form.company.industryPlaceholder}
                  />
                </Field>
                <Field label={VENDORS_STRINGS.form.company.website}>
                  <Input
                    value={formData.website}
                    onChange={(e) => updateField('website', e.target.value)}
                    placeholder={VENDORS_STRINGS.form.company.websitePlaceholder}
                  />
                </Field>
                <Field label={VENDORS_STRINGS.form.company.notes} className="sm:col-span-2">
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => updateField('notes', e.target.value)}
                    placeholder={VENDORS_STRINGS.form.company.notesPlaceholder}
                    rows={3}
                  />
                </Field>
              </div>
            </CardContent>
          </Card>
        )

      case 1: // Contact Information
        return (
          <Card size="sm">
            <CardHeader>
              <CardTitle>{VENDORS_STRINGS.form.contact.cardTitle}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <Typography variant="body-strong" className="mb-3" asChild><h4>{VENDORS_STRINGS.form.contact.primaryContact}</h4></Typography>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label={VENDORS_STRINGS.form.contact.name}>
                      <Input
                        value={formData.primaryContact}
                        onChange={(e) => updateField('primaryContact', e.target.value)}
                        placeholder={VENDORS_STRINGS.form.contact.namePlaceholder}
                      />
                    </Field>
                    <Field label={VENDORS_STRINGS.form.contact.email}>
                      <Input
                        type="email"
                        value={formData.primaryEmail}
                        onChange={(e) => updateField('primaryEmail', e.target.value)}
                        placeholder={VENDORS_STRINGS.form.contact.emailPlaceholder}
                      />
                    </Field>
                    <Field label={VENDORS_STRINGS.form.contact.phone}>
                      <Input
                        value={formData.primaryPhone}
                        onChange={(e) => updateField('primaryPhone', e.target.value)}
                        placeholder={VENDORS_STRINGS.form.contact.phonePlaceholder}
                      />
                    </Field>
                  </div>
                </div>
                <div>
                  <Typography variant="body-strong" className="mb-3" asChild><h4>{VENDORS_STRINGS.form.contact.secondaryContact}</h4></Typography>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label={VENDORS_STRINGS.form.contact.name}>
                      <Input
                        value={formData.secondaryContact}
                        onChange={(e) => updateField('secondaryContact', e.target.value)}
                        placeholder={VENDORS_STRINGS.form.contact.namePlaceholder}
                      />
                    </Field>
                    <Field label={VENDORS_STRINGS.form.contact.email}>
                      <Input
                        type="email"
                        value={formData.secondaryEmail}
                        onChange={(e) => updateField('secondaryEmail', e.target.value)}
                        placeholder={VENDORS_STRINGS.form.contact.emailPlaceholder}
                      />
                    </Field>
                    <Field label={VENDORS_STRINGS.form.contact.phone}>
                      <Input
                        value={formData.secondaryPhone}
                        onChange={(e) => updateField('secondaryPhone', e.target.value)}
                        placeholder={VENDORS_STRINGS.form.contact.phonePlaceholder}
                      />
                    </Field>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )

      case 2: // Address
        return (
          <Card size="sm">
            <CardHeader>
              <CardTitle>{VENDORS_STRINGS.form.address.cardTitle}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label={VENDORS_STRINGS.form.address.address} className="sm:col-span-2">
                  <Textarea
                    value={formData.address}
                    onChange={(e) => updateField('address', e.target.value)}
                    placeholder={VENDORS_STRINGS.form.address.addressPlaceholder}
                    rows={2}
                  />
                </Field>
                <Field label={VENDORS_STRINGS.form.address.city}>
                  <Input
                    value={formData.city}
                    onChange={(e) => updateField('city', e.target.value)}
                    placeholder={VENDORS_STRINGS.form.address.cityPlaceholder}
                  />
                </Field>
                <Field label={VENDORS_STRINGS.form.address.state}>
                  <Input
                    value={formData.state}
                    onChange={(e) => updateField('state', e.target.value)}
                    placeholder={VENDORS_STRINGS.form.address.statePlaceholder}
                  />
                </Field>
                <Field label={VENDORS_STRINGS.form.address.pincode}>
                  <Input
                    value={formData.pincode}
                    onChange={(e) => updateField('pincode', e.target.value)}
                    placeholder={VENDORS_STRINGS.form.address.pincodePlaceholder}
                  />
                </Field>
                <Field label={VENDORS_STRINGS.form.address.country}>
                  <Input
                    value={formData.country}
                    onChange={(e) => updateField('country', e.target.value)}
                    placeholder={VENDORS_STRINGS.form.address.countryPlaceholder}
                  />
                </Field>
              </div>
            </CardContent>
          </Card>
        )

      case 3: // Tax & Legal
        return (
          <Card size="sm">
            <CardHeader>
              <CardTitle>{VENDORS_STRINGS.form.tax.cardTitle}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label={VENDORS_STRINGS.form.tax.gstNumber}>
                  <Input
                    value={formData.gstNumber}
                    onChange={(e) => updateField('gstNumber', e.target.value)}
                    placeholder={VENDORS_STRINGS.form.tax.gstPlaceholder}
                  />
                </Field>
                <Field label={VENDORS_STRINGS.form.tax.panNumber}>
                  <Input
                    value={formData.panNumber}
                    onChange={(e) => updateField('panNumber', e.target.value)}
                    placeholder={VENDORS_STRINGS.form.tax.panPlaceholder}
                  />
                </Field>
                <Field label={VENDORS_STRINGS.form.tax.msmeRegistration}>
                  <Input
                    value={formData.msmeRegistration}
                    onChange={(e) => updateField('msmeRegistration', e.target.value)}
                    placeholder={VENDORS_STRINGS.form.tax.msmePlaceholder}
                  />
                </Field>
                <Field label={VENDORS_STRINGS.form.tax.tradeLicense}>
                  <Input
                    value={formData.tradeLicense}
                    onChange={(e) => updateField('tradeLicense', e.target.value)}
                    placeholder={VENDORS_STRINGS.form.tax.tradeLicensePlaceholder}
                  />
                </Field>
              </div>
            </CardContent>
          </Card>
        )

      case 4: // Bank Details
        return (
          <Card size="sm">
            <CardHeader>
              <CardTitle>{VENDORS_STRINGS.form.bank.cardTitle}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label={VENDORS_STRINGS.form.bank.accountName} className="sm:col-span-2">
                  <Input
                    value={formData.bankAccountName}
                    onChange={(e) => updateField('bankAccountName', e.target.value)}
                    placeholder={VENDORS_STRINGS.form.bank.accountNamePlaceholder}
                  />
                </Field>
                <Field label={VENDORS_STRINGS.form.bank.accountNumber}>
                  <Input
                    value={formData.bankAccountNumber}
                    onChange={(e) => updateField('bankAccountNumber', e.target.value)}
                    placeholder={VENDORS_STRINGS.form.bank.accountNumberPlaceholder}
                  />
                </Field>
                <Field label={VENDORS_STRINGS.form.bank.ifscCode}>
                  <Input
                    value={formData.bankIfscCode}
                    onChange={(e) => updateField('bankIfscCode', e.target.value)}
                    placeholder={VENDORS_STRINGS.form.bank.ifscPlaceholder}
                  />
                </Field>
                <Field label={VENDORS_STRINGS.form.bank.bankName}>
                  <Input
                    value={formData.bankName}
                    onChange={(e) => updateField('bankName', e.target.value)}
                    placeholder={VENDORS_STRINGS.form.bank.bankNamePlaceholder}
                  />
                </Field>
                <Field label={VENDORS_STRINGS.form.bank.branch}>
                  <Input
                    value={formData.bankBranch}
                    onChange={(e) => updateField('bankBranch', e.target.value)}
                    placeholder={VENDORS_STRINGS.form.bank.branchPlaceholder}
                  />
                </Field>
              </div>
            </CardContent>
          </Card>
        )

      case 5: // Terms
        return (
          <Card size="sm">
            <CardHeader>
              <CardTitle>{VENDORS_STRINGS.form.terms.cardTitle}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label={VENDORS_STRINGS.form.terms.paymentTerms}>
                  <Select
                    value={formData.paymentTerms}
                    onValueChange={(v) => updateField('paymentTerms', v as string)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={VENDORS_STRINGS.form.terms.paymentTermsPlaceholder} />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_TERMS.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label={VENDORS_STRINGS.form.terms.creditLimit}>
                  <Input
                    type="number"
                    value={formData.creditLimit}
                    onChange={(e) => updateField('creditLimit', e.target.value)}
                    placeholder={VENDORS_STRINGS.form.terms.creditLimitPlaceholder}
                  />
                </Field>
              </div>
            </CardContent>
          </Card>
        )

      case 6: // Product Categories
        return (
          <Card size="sm">
            <CardHeader>
              <CardTitle>{VENDORS_STRINGS.form.categories.cardTitle}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Typography variant="body" tone="muted" asChild>
                  <p>
                    {VENDORS_STRINGS.form.categories.description}
                  </p>
                </Typography>
                <TagInput
                  value={formData.productCategories}
                  onChange={(tags) => updateField('productCategories', tags)}
                  placeholder={VENDORS_STRINGS.form.categories.addCategoryPlaceholder}
                />
                <div className="space-y-2">
                  <Typography variant="helper" tone="muted" asChild><p>{VENDORS_STRINGS.form.categories.quickAddLabel}</p></Typography>
                  <div className="flex flex-wrap gap-1.5">
                    {availableCategories.map((cat) => {
                      const isSelected = formData.productCategories.includes(cat)
                      return (
                        <Badge
                          key={cat}
                          variant={isSelected ? 'default' : 'outline'}
                          className="cursor-pointer"
                          onClick={() => {
                            if (isSelected) {
                              updateField(
                                'productCategories',
                                formData.productCategories.filter((c) => c !== cat)
                              )
                            } else {
                              updateField('productCategories', [...formData.productCategories, cat])
                            }
                          }}
                        >
                          {isSelected && <Check className="size-3 mr-0.5" />}
                          {cat}
                        </Badge>
                      )
                    })}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )

      case 7: // Documents
        return (
          <Card size="sm">
            <CardHeader>
              <CardTitle>{VENDORS_STRINGS.form.documents.cardTitle}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Typography variant="body" tone="muted" asChild>
                  <p>
                    {VENDORS_STRINGS.form.documents.description}
                  </p>
                </Typography>
                <FileUpload
                  accept=".pdf,.jpg,.jpeg,.png"
                  maxSize={10 * 1024 * 1024}
                  multiple
                  value={uploadFiles}
                  onChange={setUploadFiles}
                />
              </div>
            </CardContent>
          </Card>
        )

      case 8: // Review & Submit
        return (
          <Card size="sm">
            <CardHeader>
              <CardTitle>{VENDORS_STRINGS.form.review.cardTitle}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Company */}
                <div className="space-y-2">
                  <Typography variant="body-strong" className="border-b pb-1" asChild><h4>{VENDORS_STRINGS.form.review.sections.companyDetails}</h4></Typography>
                  <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <ReviewField label={VENDORS_STRINGS.form.review.fields.companyName} value={formData.companyName} />
                    <ReviewField label={VENDORS_STRINGS.form.review.fields.type} value={formData.companyType} />
                    <ReviewField label={VENDORS_STRINGS.form.review.fields.industry} value={formData.industry} />
                    <ReviewField label={VENDORS_STRINGS.form.review.fields.website} value={formData.website || '—'} />
                  </dl>
                </div>

                {/* Contact */}
                <div className="space-y-2">
                  <Typography variant="body-strong" className="border-b pb-1" asChild><h4>{VENDORS_STRINGS.form.review.sections.contactInformation}</h4></Typography>
                  <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <ReviewField label={VENDORS_STRINGS.form.review.fields.primaryContact} value={formData.primaryContact} />
                    <ReviewField label={VENDORS_STRINGS.form.review.fields.email} value={formData.primaryEmail} />
                    <ReviewField label={VENDORS_STRINGS.form.review.fields.phone} value={formData.primaryPhone} />
                    {formData.secondaryContact && (
                      <ReviewField label={VENDORS_STRINGS.form.review.fields.secondaryContact} value={formData.secondaryContact} />
                    )}
                  </dl>
                </div>

                {/* Address */}
                <div className="space-y-2">
                  <Typography variant="body-strong" className="border-b pb-1" asChild><h4>{VENDORS_STRINGS.form.review.sections.address}</h4></Typography>
                  <Typography variant="body" tone="muted" asChild>
                    <p>
                      {formData.address}, {formData.city}, {formData.state} {formData.pincode},{' '}
                      {formData.country}
                    </p>
                  </Typography>
                </div>

                {/* Tax & Legal */}
                <div className="space-y-2">
                  <Typography variant="body-strong" className="border-b pb-1" asChild><h4>{VENDORS_STRINGS.form.review.sections.taxLegal}</h4></Typography>
                  <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <ReviewField label={VENDORS_STRINGS.form.review.fields.gstNumber} value={formData.gstNumber} />
                    <ReviewField label={VENDORS_STRINGS.form.review.fields.pan} value={formData.panNumber} />
                    {formData.msmeRegistration && (
                      <ReviewField label={VENDORS_STRINGS.form.review.fields.msme} value={formData.msmeRegistration} />
                    )}
                    {formData.tradeLicense && (
                      <ReviewField label={VENDORS_STRINGS.form.review.fields.tradeLicense} value={formData.tradeLicense} />
                    )}
                  </dl>
                </div>

                {/* Bank */}
                <div className="space-y-2">
                  <Typography variant="body-strong" className="border-b pb-1" asChild><h4>{VENDORS_STRINGS.form.review.sections.bankDetails}</h4></Typography>
                  <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <ReviewField label={VENDORS_STRINGS.form.review.fields.accountName} value={formData.bankAccountName} />
                    <ReviewField label={VENDORS_STRINGS.form.review.fields.accountNumber} value={formData.bankAccountNumber} />
                    <ReviewField label={VENDORS_STRINGS.form.review.fields.ifsc} value={formData.bankIfscCode} />
                    <ReviewField label={VENDORS_STRINGS.form.review.fields.bank} value={`${formData.bankName}, ${formData.bankBranch}`} />
                  </dl>
                </div>

                {/* Terms */}
                <div className="space-y-2">
                  <Typography variant="body-strong" className="border-b pb-1" asChild><h4>{VENDORS_STRINGS.form.review.sections.terms}</h4></Typography>
                  <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <ReviewField label={VENDORS_STRINGS.form.review.fields.paymentTerms} value={formData.paymentTerms} />
                    <ReviewField
                      label={VENDORS_STRINGS.form.review.fields.creditLimit}
                      value={formData.creditLimit ? formatINRCompact(Number(formData.creditLimit)) : VENDORS_STRINGS.detail.paymentTerms.notApplicable}
                    />
                  </dl>
                </div>

                {/* Categories */}
                <div className="space-y-2">
                  <Typography variant="body-strong" className="border-b pb-1" asChild><h4>{VENDORS_STRINGS.form.review.sections.productCategories}</h4></Typography>
                  <div className="flex flex-wrap gap-1.5">
                    {formData.productCategories.length > 0 ? (
                      formData.productCategories.map((cat) => (
                        <Badge key={cat} variant="secondary">
                          {cat}
                        </Badge>
                      ))
                    ) : (
                      <Typography variant="body" tone="muted" asChild><span>{VENDORS_STRINGS.form.review.noCategoriesSelected}</span></Typography>
                    )}
                  </div>
                </div>

                {/* Documents */}
                <div className="space-y-2">
                  <Typography variant="body-strong" className="border-b pb-1" asChild><h4>{VENDORS_STRINGS.form.review.sections.documents}</h4></Typography>
                  <Typography variant="body" tone="muted" asChild>
                    <p>
                      {uploadFiles.length > 0
                        ? VENDORS_STRINGS.form.review.filesReadyToUpload(uploadFiles.length)
                        : isEdit
                          ? VENDORS_STRINGS.form.review.existingDocuments(existingVendor?.documents.length ?? 0)
                          : VENDORS_STRINGS.form.review.noDocumentsUploaded}
                    </p>
                  </Typography>
                </div>
              </div>
            </CardContent>
          </Card>
        )

      default:
        return null
    }
  }

  return (
    <FormPageShell
      title={isEdit ? VENDORS_STRINGS.form.titles.edit : VENDORS_STRINGS.form.titles.register}
      subtitle={
        isEdit
          ? VENDORS_STRINGS.form.subtitles.editing(existingVendor?.companyName ?? '')
          : VENDORS_STRINGS.form.subtitles.register
      }
      breadcrumbs={[
        { label: VENDORS_STRINGS.form.breadcrumbs.vendors, href: '/vendors' },
        { label: isEdit ? existingVendor?.companyName ?? VENDORS_STRINGS.form.breadcrumbs.edit : VENDORS_STRINGS.form.breadcrumbs.new },
      ]}
      backHref="/vendors"
      footerLeft={
        <span>
          {VENDORS_STRINGS.form.footer.stepProgress(currentStep + 1, STEPS.length, STEPS[currentStep]?.label ?? '')}
        </span>
      }
      footerActions={
        <>
          <Button variant="outline" onClick={() => guard.attempt(goBack)}>
            {VENDORS_STRINGS.form.footer.cancel}
          </Button>
          <Button variant="outline" onClick={handlePrev} disabled={isFirst}>
            {VENDORS_STRINGS.form.footer.previous}
          </Button>
          <Button onClick={handleNext}>{isLast ? VENDORS_STRINGS.form.footer.submit : VENDORS_STRINGS.form.footer.next}</Button>
        </>
      }
    >
      {/* Step progress */}
      <div className="flex items-center overflow-x-auto pb-2">
        {STEPS.map((step, index) => {
          const isCompleted = index < currentStep
          const isActive = index === currentStep
          const isPending = index > currentStep

          return (
            <div key={step.id} className="flex items-center">
              <button
                type="button"
                onClick={() => handleStepClick(index)}
                className="flex flex-col items-center gap-1.5"
              >
                <div
                  className={[
                    'flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-all',
                    isCompleted && 'bg-primary text-primary-foreground',
                    isActive && 'border-2 border-primary bg-primary/10 text-primary',
                    isPending && 'border-2 border-muted-foreground/30 bg-muted text-muted-foreground',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {isCompleted ? <Check className="size-4" /> : index + 1}
                </div>
                <span
                  className={[
                    'text-xs font-medium whitespace-nowrap',
                    isActive && 'text-primary',
                    isCompleted && 'text-foreground',
                    isPending && 'text-muted-foreground',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {step.label}
                </span>
              </button>
              {index < STEPS.length - 1 && (
                <div className="mx-2 mt-[-18px] flex flex-1 items-center min-w-[20px]">
                  <div
                    className={[
                      'h-0.5 w-full transition-colors',
                      index < currentStep ? 'bg-primary' : 'bg-muted-foreground/30',
                    ].join(' ')}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Step content */}
      <div className="min-h-[200px]">{renderStepContent()}</div>

      <UnsavedChangesDialog
        open={guard.dialogOpen}
        onOpenChange={guard.onDialogOpenChange}
        onConfirm={guard.onConfirmDiscard}
      />
    </FormPageShell>
  )
}

function ReviewField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-ui text-muted-foreground">{label}</dt>
      <Typography variant="body" asChild><dd>{value || '—'}</dd></Typography>
    </div>
  )
}


