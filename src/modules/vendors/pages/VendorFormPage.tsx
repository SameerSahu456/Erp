import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Check } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { FileUpload } from '@/components/common/FileUpload'
import { TagInput } from '@/components/common/TagInput'
import { mockVendorRegistrations } from '@/modules/vendors/data/vendors'
import { mockCategories } from '@/modules/ims/data/categories'
import type { VendorRegistration } from '@/modules/vendors/types'

const STEPS = [
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

const COMPANY_TYPES: VendorRegistration['companyType'][] = [
  'Manufacturer',
  'Distributor',
  'Reseller',
  'Service Provider',
]

const PAYMENT_TERMS: VendorRegistration['paymentTerms'][] = [
  'Net 15',
  'Net 30',
  'Net 45',
  'Net 60',
  'Advance',
]

const availableCategories = mockCategories.map((c) => c.name)

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value)

interface FormData {
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

function getInitialFormData(vendor?: VendorRegistration): FormData {
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

function VendorFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isEdit = Boolean(id) && id !== 'new'
  const existingVendor = isEdit ? mockVendorRegistrations.find((v) => v.id === id) : undefined

  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState<FormData>(() => getInitialFormData(existingVendor))
  const [uploadFiles, setUploadFiles] = useState<File[]>([])

  const isFirst = currentStep === 0
  const isLast = currentStep === STEPS.length - 1

  function updateField<K extends keyof FormData>(key: K, value: FormData[K]) {
    setFormData((prev) => ({ ...prev, [key]: value }))
  }

  function handleNext() {
    if (isLast) {
      navigate('/vendors')
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
              <CardTitle>Company Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Company Name" className="sm:col-span-2">
                  <Input
                    value={formData.companyName}
                    onChange={(e) => updateField('companyName', e.target.value)}
                    placeholder="Enter company name"
                  />
                </Field>
                <Field label="Company Type">
                  <Select
                    value={formData.companyType}
                    onValueChange={(v) => updateField('companyType', v as string)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select type" />
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
                <Field label="Industry">
                  <Input
                    value={formData.industry}
                    onChange={(e) => updateField('industry', e.target.value)}
                    placeholder="e.g. IT Hardware"
                  />
                </Field>
                <Field label="Website">
                  <Input
                    value={formData.website}
                    onChange={(e) => updateField('website', e.target.value)}
                    placeholder="https://"
                  />
                </Field>
                <Field label="Notes" className="sm:col-span-2">
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => updateField('notes', e.target.value)}
                    placeholder="Additional notes..."
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
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-medium mb-3">Primary Contact</h4>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="Name">
                      <Input
                        value={formData.primaryContact}
                        onChange={(e) => updateField('primaryContact', e.target.value)}
                        placeholder="Full name"
                      />
                    </Field>
                    <Field label="Email">
                      <Input
                        type="email"
                        value={formData.primaryEmail}
                        onChange={(e) => updateField('primaryEmail', e.target.value)}
                        placeholder="email@example.com"
                      />
                    </Field>
                    <Field label="Phone">
                      <Input
                        value={formData.primaryPhone}
                        onChange={(e) => updateField('primaryPhone', e.target.value)}
                        placeholder="+91 XXXXX XXXXX"
                      />
                    </Field>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-3">Secondary Contact (Optional)</h4>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="Name">
                      <Input
                        value={formData.secondaryContact}
                        onChange={(e) => updateField('secondaryContact', e.target.value)}
                        placeholder="Full name"
                      />
                    </Field>
                    <Field label="Email">
                      <Input
                        type="email"
                        value={formData.secondaryEmail}
                        onChange={(e) => updateField('secondaryEmail', e.target.value)}
                        placeholder="email@example.com"
                      />
                    </Field>
                    <Field label="Phone">
                      <Input
                        value={formData.secondaryPhone}
                        onChange={(e) => updateField('secondaryPhone', e.target.value)}
                        placeholder="+91 XXXXX XXXXX"
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
              <CardTitle>Address</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Address" className="sm:col-span-2">
                  <Textarea
                    value={formData.address}
                    onChange={(e) => updateField('address', e.target.value)}
                    placeholder="Street address"
                    rows={2}
                  />
                </Field>
                <Field label="City">
                  <Input
                    value={formData.city}
                    onChange={(e) => updateField('city', e.target.value)}
                    placeholder="City"
                  />
                </Field>
                <Field label="State">
                  <Input
                    value={formData.state}
                    onChange={(e) => updateField('state', e.target.value)}
                    placeholder="State"
                  />
                </Field>
                <Field label="Pincode">
                  <Input
                    value={formData.pincode}
                    onChange={(e) => updateField('pincode', e.target.value)}
                    placeholder="PIN Code"
                  />
                </Field>
                <Field label="Country">
                  <Input
                    value={formData.country}
                    onChange={(e) => updateField('country', e.target.value)}
                    placeholder="Country"
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
              <CardTitle>Tax & Legal</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="GST Number">
                  <Input
                    value={formData.gstNumber}
                    onChange={(e) => updateField('gstNumber', e.target.value)}
                    placeholder="e.g. 29AABCD1234E1Z5"
                  />
                </Field>
                <Field label="PAN Number">
                  <Input
                    value={formData.panNumber}
                    onChange={(e) => updateField('panNumber', e.target.value)}
                    placeholder="e.g. AABCD1234E"
                  />
                </Field>
                <Field label="MSME Registration">
                  <Input
                    value={formData.msmeRegistration}
                    onChange={(e) => updateField('msmeRegistration', e.target.value)}
                    placeholder="UDYAM number (optional)"
                  />
                </Field>
                <Field label="Trade License">
                  <Input
                    value={formData.tradeLicense}
                    onChange={(e) => updateField('tradeLicense', e.target.value)}
                    placeholder="Trade license number (optional)"
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
              <CardTitle>Bank Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Account Name" className="sm:col-span-2">
                  <Input
                    value={formData.bankAccountName}
                    onChange={(e) => updateField('bankAccountName', e.target.value)}
                    placeholder="Account holder name"
                  />
                </Field>
                <Field label="Account Number">
                  <Input
                    value={formData.bankAccountNumber}
                    onChange={(e) => updateField('bankAccountNumber', e.target.value)}
                    placeholder="Account number"
                  />
                </Field>
                <Field label="IFSC Code">
                  <Input
                    value={formData.bankIfscCode}
                    onChange={(e) => updateField('bankIfscCode', e.target.value)}
                    placeholder="e.g. HDFC0001234"
                  />
                </Field>
                <Field label="Bank Name">
                  <Input
                    value={formData.bankName}
                    onChange={(e) => updateField('bankName', e.target.value)}
                    placeholder="Bank name"
                  />
                </Field>
                <Field label="Branch">
                  <Input
                    value={formData.bankBranch}
                    onChange={(e) => updateField('bankBranch', e.target.value)}
                    placeholder="Branch name"
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
              <CardTitle>Payment Terms</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Payment Terms">
                  <Select
                    value={formData.paymentTerms}
                    onValueChange={(v) => updateField('paymentTerms', v as string)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select terms" />
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
                <Field label="Credit Limit (₹)">
                  <Input
                    type="number"
                    value={formData.creditLimit}
                    onChange={(e) => updateField('creditLimit', e.target.value)}
                    placeholder="e.g. 5000000"
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
              <CardTitle>Product Categories</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Select the product categories this vendor supplies. Type to add custom categories.
                </p>
                <TagInput
                  value={formData.productCategories}
                  onChange={(tags) => updateField('productCategories', tags)}
                  placeholder="Add category..."
                />
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Quick add from IMS categories:</p>
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
              <CardTitle>Documents</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Upload required documents: GST Certificate, PAN Card, MSME Certificate,
                  Cancelled Cheque, Bank Statement, etc.
                </p>
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
              <CardTitle>Review & Submit</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Company */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium border-b pb-1">Company Details</h4>
                  <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <ReviewField label="Company Name" value={formData.companyName} />
                    <ReviewField label="Type" value={formData.companyType} />
                    <ReviewField label="Industry" value={formData.industry} />
                    <ReviewField label="Website" value={formData.website || '-'} />
                  </dl>
                </div>

                {/* Contact */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium border-b pb-1">Contact Information</h4>
                  <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <ReviewField label="Primary Contact" value={formData.primaryContact} />
                    <ReviewField label="Email" value={formData.primaryEmail} />
                    <ReviewField label="Phone" value={formData.primaryPhone} />
                    {formData.secondaryContact && (
                      <ReviewField label="Secondary Contact" value={formData.secondaryContact} />
                    )}
                  </dl>
                </div>

                {/* Address */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium border-b pb-1">Address</h4>
                  <p className="text-sm text-muted-foreground">
                    {formData.address}, {formData.city}, {formData.state} {formData.pincode},{' '}
                    {formData.country}
                  </p>
                </div>

                {/* Tax & Legal */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium border-b pb-1">Tax & Legal</h4>
                  <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <ReviewField label="GST Number" value={formData.gstNumber} />
                    <ReviewField label="PAN" value={formData.panNumber} />
                    {formData.msmeRegistration && (
                      <ReviewField label="MSME" value={formData.msmeRegistration} />
                    )}
                    {formData.tradeLicense && (
                      <ReviewField label="Trade License" value={formData.tradeLicense} />
                    )}
                  </dl>
                </div>

                {/* Bank */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium border-b pb-1">Bank Details</h4>
                  <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <ReviewField label="Account Name" value={formData.bankAccountName} />
                    <ReviewField label="Account Number" value={formData.bankAccountNumber} />
                    <ReviewField label="IFSC" value={formData.bankIfscCode} />
                    <ReviewField label="Bank" value={`${formData.bankName}, ${formData.bankBranch}`} />
                  </dl>
                </div>

                {/* Terms */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium border-b pb-1">Terms</h4>
                  <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <ReviewField label="Payment Terms" value={formData.paymentTerms} />
                    <ReviewField
                      label="Credit Limit"
                      value={formData.creditLimit ? formatCurrency(Number(formData.creditLimit)) : 'N/A'}
                    />
                  </dl>
                </div>

                {/* Categories */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium border-b pb-1">Product Categories</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {formData.productCategories.length > 0 ? (
                      formData.productCategories.map((cat) => (
                        <Badge key={cat} variant="secondary">
                          {cat}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">No categories selected</span>
                    )}
                  </div>
                </div>

                {/* Documents */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium border-b pb-1">Documents</h4>
                  <p className="text-sm text-muted-foreground">
                    {uploadFiles.length > 0
                      ? `${uploadFiles.length} file(s) ready to upload`
                      : isEdit
                        ? `${existingVendor?.documents.length ?? 0} existing document(s)`
                        : 'No documents uploaded'}
                  </p>
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display font-semibold">
            {isEdit ? 'Edit Vendor' : 'Register Vendor'}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {isEdit
              ? `Editing ${existingVendor?.companyName}`
              : 'Complete all steps to register a new vendor'}
          </p>
        </div>
        <Button variant="outline" render={<Link to="/vendors" />}>
          Cancel
        </Button>
      </div>

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

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={handlePrev} disabled={isFirst}>
          Previous
        </Button>
        <Button onClick={handleNext}>{isLast ? 'Submit' : 'Next'}</Button>
      </div>
    </div>
  )
}

function ReviewField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-ui text-muted-foreground">{label}</dt>
      <dd className="text-sm">{value || '-'}</dd>
    </div>
  )
}

export default VendorFormPage
