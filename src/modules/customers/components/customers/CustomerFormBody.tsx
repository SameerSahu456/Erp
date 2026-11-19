import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useNavigateBack } from '@/hooks/use-navigate-back'
import { Check, Plus, Trash2 } from 'lucide-react'

import { CUSTOMERS_STRINGS } from './customers.strings'

const S = CUSTOMERS_STRINGS

import { Button } from '@/components/ui/button'
import { Typography } from '@/components/ui/typography'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FormPageShell } from '@/components/page-shells'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { FileUpload } from '@/components/common/files/FileUpload'
import { StatusBadge } from '@/components/common/display/StatusBadge'
import { mockCustomerRegistrations } from '@/modules/customers/data/customers'
import type { CustomerRegistration, ShippingAddress, CustomerContact } from '@/modules/customers/types'
import { formatINRCompact } from "@/lib/currency";


export const STEPS = [
  { id: 'company', label: 'Company' },
  { id: 'billing', label: 'Billing' },
  { id: 'shipping', label: 'Shipping' },
  { id: 'contacts', label: 'Contacts' },
  { id: 'credit', label: 'Credit' },
  { id: 'documents', label: 'Documents' },
  { id: 'review', label: 'Review' },
]

export const CUSTOMER_TYPES: CustomerRegistration['type'][] = ['Company', 'Individual']
export const PAYMENT_TERMS: CustomerRegistration['paymentTerms'][] = ['Net 15', 'Net 30', 'Net 45', 'Net 60', 'Advance', 'COD']
export const PRICING_TIERS: CustomerRegistration['pricingTier'][] = ['Standard', 'Silver', 'Gold', 'Platinum']
export const CONTACT_ROLES: CustomerContact['role'][] = ['Billing', 'Technical', 'Decision Maker', 'Procurement', 'General']


export interface FormData {
  type: string
  companyName: string
  industry: string
  website: string
  billingAddress: string
  billingCity: string
  billingState: string
  billingPincode: string
  shippingAddresses: ShippingAddress[]
  contacts: CustomerContact[]
  creditLimit: string
  paymentTerms: string
  pricingTier: string
}

export function getInitialFormData(customer?: CustomerRegistration): FormData {
  if (customer) {
    return {
      type: customer.type,
      companyName: customer.companyName,
      industry: customer.industry ?? '',
      website: customer.website ?? '',
      billingAddress: customer.billingAddress,
      billingCity: customer.billingCity,
      billingState: customer.billingState,
      billingPincode: customer.billingPincode,
      shippingAddresses: [...customer.shippingAddresses],
      contacts: [...customer.contacts],
      creditLimit: String(customer.creditLimit),
      paymentTerms: customer.paymentTerms,
      pricingTier: customer.pricingTier,
    }
  }
  return {
    type: 'Company',
    companyName: '',
    industry: '',
    website: '',
    billingAddress: '',
    billingCity: '',
    billingState: '',
    billingPincode: '',
    shippingAddresses: [],
    contacts: [],
    creditLimit: '',
    paymentTerms: 'Net 30',
    pricingTier: 'Standard',
  }
}


export function CustomerFormBody() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const goBack = useNavigateBack('/customers')
  const isEdit = Boolean(id) && id !== 'new'
  const existingCustomer = isEdit ? mockCustomerRegistrations.find((c) => c.id === id) : undefined

  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState<FormData>(() => getInitialFormData(existingCustomer))
  const [uploadFiles, setUploadFiles] = useState<File[]>([])

  const isFirst = currentStep === 0
  const isLast = currentStep === STEPS.length - 1

  function updateField<K extends keyof FormData>(key: K, value: FormData[K]) {
    setFormData((prev) => ({ ...prev, [key]: value }))
  }

  function handleNext() {
    if (isLast) {
      navigate('/customers')
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

  // Shipping address helpers
  function addShippingAddress() {
    const newAddr: ShippingAddress = {
      id: `SA-NEW-${Date.now()}`,
      label: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
      contactPerson: '',
      contactPhone: '',
      isDefault: formData.shippingAddresses.length === 0,
    }
    updateField('shippingAddresses', [...formData.shippingAddresses, newAddr])
  }

  function removeShippingAddress(idx: number) {
    const updated = formData.shippingAddresses.filter((_, i) => i !== idx)
    updateField('shippingAddresses', updated)
  }

  function updateShippingAddress(idx: number, field: keyof ShippingAddress, value: string | boolean) {
    const updated = formData.shippingAddresses.map((addr, i) => {
      if (i !== idx) {
        if (field === 'isDefault' && value === true) return { ...addr, isDefault: false }
        return addr
      }
      return { ...addr, [field]: value }
    })
    updateField('shippingAddresses', updated)
  }

  // Contact helpers
  function addContact() {
    const newContact: CustomerContact = {
      id: `CC-NEW-${Date.now()}`,
      name: '',
      email: '',
      phone: '',
      designation: '',
      role: 'General',
      isPrimary: formData.contacts.length === 0,
    }
    updateField('contacts', [...formData.contacts, newContact])
  }

  function removeContact(idx: number) {
    const updated = formData.contacts.filter((_, i) => i !== idx)
    updateField('contacts', updated)
  }

  function updateContact(idx: number, field: keyof CustomerContact, value: string | boolean) {
    const updated = formData.contacts.map((c, i) => {
      if (i !== idx) {
        if (field === 'isPrimary' && value === true) return { ...c, isPrimary: false }
        return c
      }
      return { ...c, [field]: value }
    })
    updateField('contacts', updated)
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

  // KYC checklist mock (display-only)
  const kycItems = [
    'Company Registration',
    'Tax Compliance',
    'Credit Check',
    'Reference Check',
    'Address Verification',
    'Financial Stability',
  ]

  function renderStepContent() {
    switch (currentStep) {
      case 0: // Company Details
        return (
          <Card size="sm">
            <CardHeader>
              <CardTitle>{S.form.steps.company.cardTitle}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label={S.form.steps.company.fields.customerType}>
                  <Select
                    value={formData.type}
                    onValueChange={(v) => updateField('type', v as string)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={S.form.steps.company.fields.customerTypePlaceholder} />
                    </SelectTrigger>
                    <SelectContent>
                      {CUSTOMER_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label={S.form.steps.company.fields.companyName}>
                  <Input
                    value={formData.companyName}
                    onChange={(e) => updateField('companyName', e.target.value)}
                    placeholder={S.form.steps.company.fields.companyNamePlaceholder}
                  />
                </Field>
                <Field label={S.form.steps.company.fields.industry}>
                  <Input
                    value={formData.industry}
                    onChange={(e) => updateField('industry', e.target.value)}
                    placeholder={S.form.steps.company.fields.industryPlaceholder}
                  />
                </Field>
                <Field label={S.form.steps.company.fields.website}>
                  <Input
                    value={formData.website}
                    onChange={(e) => updateField('website', e.target.value)}
                    placeholder={S.form.steps.company.fields.websitePlaceholder}
                  />
                </Field>
              </div>
            </CardContent>
          </Card>
        )

      case 1: // Billing Address
        return (
          <Card size="sm">
            <CardHeader>
              <CardTitle>{S.form.steps.billing.cardTitle}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label={S.form.steps.billing.fields.address} className="sm:col-span-2">
                  <Input
                    value={formData.billingAddress}
                    onChange={(e) => updateField('billingAddress', e.target.value)}
                    placeholder={S.form.steps.billing.fields.addressPlaceholder}
                  />
                </Field>
                <Field label={S.form.steps.billing.fields.city}>
                  <Input
                    value={formData.billingCity}
                    onChange={(e) => updateField('billingCity', e.target.value)}
                    placeholder={S.form.steps.billing.fields.cityPlaceholder}
                  />
                </Field>
                <Field label={S.form.steps.billing.fields.state}>
                  <Input
                    value={formData.billingState}
                    onChange={(e) => updateField('billingState', e.target.value)}
                    placeholder={S.form.steps.billing.fields.statePlaceholder}
                  />
                </Field>
                <Field label={S.form.steps.billing.fields.pincode}>
                  <Input
                    value={formData.billingPincode}
                    onChange={(e) => updateField('billingPincode', e.target.value)}
                    placeholder={S.form.steps.billing.fields.pincodePlaceholder}
                  />
                </Field>
              </div>
            </CardContent>
          </Card>
        )

      case 2: // Shipping Addresses
        return (
          <Card size="sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{S.form.steps.shipping.cardTitle}</CardTitle>
                <Button variant="outline" size="sm" onClick={addShippingAddress}>
                  <Plus className="mr-1 size-3.5" />
                  {S.form.steps.shipping.addAddress}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {formData.shippingAddresses.length === 0 ? (
                <div className="rounded-lg border border-dashed p-8 text-center">
                  <Typography variant="body" tone="muted" asChild>
                    <p>
                      {S.form.steps.shipping.empty}
                    </p>
                  </Typography>
                </div>
              ) : (
                <div className="space-y-4">
                  {formData.shippingAddresses.map((addr, idx) => (
                    <Card key={addr.id} size="sm" className="border-muted">
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-muted-foreground">
                              {S.form.steps.shipping.addressLabel(idx)}
                            </span>
                            {addr.isDefault && (
                              <Badge variant="default" className="text-[10px]">{S.form.steps.shipping.defaultBadge}</Badge>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeShippingAddress(idx)}
                          >
                            <Trash2 className="size-3.5 text-destructive" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <Field label={S.form.steps.shipping.fields.label}>
                            <Input
                              value={addr.label}
                              onChange={(e) => updateShippingAddress(idx, 'label', e.target.value)}
                              placeholder={S.form.steps.shipping.fields.labelPlaceholder}
                            />
                          </Field>
                          <Field label={S.form.steps.shipping.fields.address}>
                            <Input
                              value={addr.address}
                              onChange={(e) => updateShippingAddress(idx, 'address', e.target.value)}
                              placeholder={S.form.steps.shipping.fields.addressPlaceholder}
                            />
                          </Field>
                          <Field label={S.form.steps.shipping.fields.city}>
                            <Input
                              value={addr.city}
                              onChange={(e) => updateShippingAddress(idx, 'city', e.target.value)}
                              placeholder={S.form.steps.shipping.fields.cityPlaceholder}
                            />
                          </Field>
                          <Field label={S.form.steps.shipping.fields.state}>
                            <Input
                              value={addr.state}
                              onChange={(e) => updateShippingAddress(idx, 'state', e.target.value)}
                              placeholder={S.form.steps.shipping.fields.statePlaceholder}
                            />
                          </Field>
                          <Field label={S.form.steps.shipping.fields.pincode}>
                            <Input
                              value={addr.pincode}
                              onChange={(e) => updateShippingAddress(idx, 'pincode', e.target.value)}
                              placeholder={S.form.steps.shipping.fields.pincodePlaceholder}
                            />
                          </Field>
                          <Field label={S.form.steps.shipping.fields.contactPerson}>
                            <Input
                              value={addr.contactPerson}
                              onChange={(e) => updateShippingAddress(idx, 'contactPerson', e.target.value)}
                              placeholder={S.form.steps.shipping.fields.contactPersonPlaceholder}
                            />
                          </Field>
                          <Field label={S.form.steps.shipping.fields.contactPhone}>
                            <Input
                              value={addr.contactPhone}
                              onChange={(e) => updateShippingAddress(idx, 'contactPhone', e.target.value)}
                              placeholder={S.form.steps.shipping.fields.contactPhonePlaceholder}
                            />
                          </Field>
                          <div className="flex items-end pb-1">
                            <label className="flex items-center gap-2 text-sm">
                              <Checkbox
                                checked={addr.isDefault}
                                onCheckedChange={(checked) =>
                                  updateShippingAddress(idx, 'isDefault', checked === true)
                                }
                              />
                              {S.form.steps.shipping.fields.defaultAddress}
                            </label>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )

      case 3: // Contacts
        return (
          <Card size="sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{S.form.steps.contacts.cardTitle}</CardTitle>
                <Button variant="outline" size="sm" onClick={addContact}>
                  <Plus className="mr-1 size-3.5" />
                  {S.form.steps.contacts.addContact}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {formData.contacts.length === 0 ? (
                <div className="rounded-lg border border-dashed p-8 text-center">
                  <Typography variant="body" tone="muted" asChild>
                    <p>
                      {S.form.steps.contacts.empty}
                    </p>
                  </Typography>
                </div>
              ) : (
                <div className="space-y-4">
                  {formData.contacts.map((contact, idx) => (
                    <Card key={contact.id} size="sm" className="border-muted">
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-muted-foreground">
                              {S.form.steps.contacts.contactLabel(idx)}
                            </span>
                            {contact.isPrimary && (
                              <Badge variant="default" className="text-[10px]">{S.form.steps.contacts.primaryBadge}</Badge>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeContact(idx)}
                          >
                            <Trash2 className="size-3.5 text-destructive" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <Field label={S.form.steps.contacts.fields.name}>
                            <Input
                              value={contact.name}
                              onChange={(e) => updateContact(idx, 'name', e.target.value)}
                              placeholder={S.form.steps.contacts.fields.namePlaceholder}
                            />
                          </Field>
                          <Field label={S.form.steps.contacts.fields.email}>
                            <Input
                              type="email"
                              value={contact.email}
                              onChange={(e) => updateContact(idx, 'email', e.target.value)}
                              placeholder={S.form.steps.contacts.fields.emailPlaceholder}
                            />
                          </Field>
                          <Field label={S.form.steps.contacts.fields.phone}>
                            <Input
                              value={contact.phone}
                              onChange={(e) => updateContact(idx, 'phone', e.target.value)}
                              placeholder={S.form.steps.contacts.fields.phonePlaceholder}
                            />
                          </Field>
                          <Field label={S.form.steps.contacts.fields.designation}>
                            <Input
                              value={contact.designation}
                              onChange={(e) => updateContact(idx, 'designation', e.target.value)}
                              placeholder={S.form.steps.contacts.fields.designationPlaceholder}
                            />
                          </Field>
                          <Field label={S.form.steps.contacts.fields.role}>
                            <Select
                              value={contact.role}
                              onValueChange={(v) => { if (v !== null) updateContact(idx, 'role', v) }}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder={S.form.steps.contacts.fields.rolePlaceholder} />
                              </SelectTrigger>
                              <SelectContent>
                                {CONTACT_ROLES.map((r) => (
                                  <SelectItem key={r} value={r}>
                                    {r}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </Field>
                          <div className="flex items-end pb-1">
                            <label className="flex items-center gap-2 text-sm">
                              <Checkbox
                                checked={contact.isPrimary}
                                onCheckedChange={(checked) =>
                                  updateContact(idx, 'isPrimary', checked === true)
                                }
                              />
                              {S.form.steps.contacts.fields.primaryContact}
                            </label>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )

      case 4: // Credit Terms
        return (
          <Card size="sm">
            <CardHeader>
              <CardTitle>{S.form.steps.credit.cardTitle}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label={S.form.steps.credit.fields.creditLimit}>
                  <Input
                    type="number"
                    value={formData.creditLimit}
                    onChange={(e) => updateField('creditLimit', e.target.value)}
                    placeholder={S.form.steps.credit.fields.creditLimitPlaceholder}
                  />
                </Field>
                <Field label={S.form.steps.credit.fields.paymentTerms}>
                  <Select
                    value={formData.paymentTerms}
                    onValueChange={(v) => updateField('paymentTerms', v as string)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={S.form.steps.credit.fields.paymentTermsPlaceholder} />
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
                <Field label={S.form.steps.credit.fields.pricingTier}>
                  <Select
                    value={formData.pricingTier}
                    onValueChange={(v) => updateField('pricingTier', v as string)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={S.form.steps.credit.fields.pricingTierPlaceholder} />
                    </SelectTrigger>
                    <SelectContent>
                      {PRICING_TIERS.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            </CardContent>
          </Card>
        )

      case 5: // Documents & KYC
        return (
          <div className="space-y-6">
            <Card size="sm">
              <CardHeader>
                <CardTitle>{S.form.steps.documents.uploadCardTitle}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Typography variant="body" tone="muted" asChild>
                    <p>
                      {S.form.steps.documents.uploadHint}
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

            <Card size="sm">
              <CardHeader>
                <CardTitle>{S.form.steps.documents.kycCardTitle}</CardTitle>
              </CardHeader>
              <CardContent>
                <Typography variant="body" tone="muted" className="mb-4" asChild>
                  <p>
                    {S.form.steps.documents.kycHint}
                  </p>
                </Typography>
                <div className="space-y-2">
                  {kycItems.map((item) => (
                    <div
                      key={item}
                      className="flex items-center justify-between rounded-md border px-3 py-2"
                    >
                      <Typography variant="body" tone="default" asChild><span>{item}</span></Typography>
                      <StatusBadge variant="warning">{S.form.steps.documents.kycPending}</StatusBadge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )

      case 6: // Review & Submit
        return (
          <Card size="sm">
            <CardHeader>
              <CardTitle>{S.form.steps.review.cardTitle}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Company */}
                <div className="space-y-2">
                  <Typography variant="body-strong" className="border-b pb-1" asChild><h4>{S.form.steps.company.reviewTitle}</h4></Typography>
                  <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <ReviewField label={S.form.steps.review.typeLabel} value={formData.type} />
                    <ReviewField label={S.form.steps.review.companyNameLabel} value={formData.companyName} />
                    <ReviewField label={S.form.steps.review.industryLabel} value={formData.industry || '—'} />
                    <ReviewField label={S.form.steps.review.websiteLabel} value={formData.website || '—'} />
                  </dl>
                </div>

                {/* Billing */}
                <div className="space-y-2">
                  <Typography variant="body-strong" className="border-b pb-1" asChild><h4>{S.form.steps.billing.reviewTitle}</h4></Typography>
                  <Typography variant="body" tone="muted" asChild>
                    <p>
                      {formData.billingAddress}, {formData.billingCity},{' '}
                      {formData.billingState} {formData.billingPincode}
                    </p>
                  </Typography>
                </div>

                {/* Shipping */}
                <div className="space-y-2">
                  <Typography variant="body-strong" className="border-b pb-1" asChild>
                    <h4>
                      {S.form.steps.shipping.reviewTitle(formData.shippingAddresses.length)}
                    </h4>
                  </Typography>
                  {formData.shippingAddresses.length > 0 ? (
                    <div className="overflow-x-auto rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{S.form.steps.shipping.tableHeaders.label}</TableHead>
                            <TableHead>{S.form.steps.shipping.tableHeaders.city}</TableHead>
                            <TableHead>{S.form.steps.shipping.tableHeaders.contact}</TableHead>
                            <TableHead>{S.form.steps.shipping.tableHeaders.default}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {formData.shippingAddresses.map((addr) => (
                            <TableRow key={addr.id}>
                              <TableCell className="font-medium">{addr.label || '—'}</TableCell>
                              <TableCell>{addr.city || '—'}</TableCell>
                              <TableCell>{addr.contactPerson || '—'}</TableCell>
                              <TableCell>
                                {addr.isDefault ? (
                                  <Badge variant="default" className="text-[10px]">{S.form.steps.shipping.yes}</Badge>
                                ) : (
                                  '-'
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <Typography variant="body" tone="muted" asChild><p>{S.form.steps.shipping.noShippingAddresses}</p></Typography>
                  )}
                </div>

                {/* Contacts */}
                <div className="space-y-2">
                  <Typography variant="body-strong" className="border-b pb-1" asChild>
                    <h4>
                      {S.form.steps.contacts.reviewTitle(formData.contacts.length)}
                    </h4>
                  </Typography>
                  {formData.contacts.length > 0 ? (
                    <div className="overflow-x-auto rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{S.form.steps.contacts.tableHeaders.name}</TableHead>
                            <TableHead>{S.form.steps.contacts.tableHeaders.email}</TableHead>
                            <TableHead>{S.form.steps.contacts.tableHeaders.role}</TableHead>
                            <TableHead>{S.form.steps.contacts.tableHeaders.primary}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {formData.contacts.map((c) => (
                            <TableRow key={c.id}>
                              <TableCell className="font-medium">{c.name || '—'}</TableCell>
                              <TableCell>{c.email || '—'}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-[10px]">{c.role}</Badge>
                              </TableCell>
                              <TableCell>
                                {c.isPrimary ? (
                                  <Badge variant="default" className="text-[10px]">{S.form.steps.contacts.yes}</Badge>
                                ) : (
                                  '-'
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <Typography variant="body" tone="muted" asChild><p>{S.form.steps.contacts.noContacts}</p></Typography>
                  )}
                </div>

                {/* Credit Terms */}
                <div className="space-y-2">
                  <Typography variant="body-strong" className="border-b pb-1" asChild><h4>{S.form.steps.credit.reviewTitle}</h4></Typography>
                  <dl className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <ReviewField
                      label={S.form.steps.credit.fields.creditLimitReview}
                      value={formData.creditLimit ? formatINRCompact(Number(formData.creditLimit)) : 'N/A'}
                    />
                    <ReviewField label={S.form.steps.credit.fields.paymentTermsReview} value={formData.paymentTerms} />
                    <ReviewField label={S.form.steps.credit.fields.pricingTierReview} value={formData.pricingTier} />
                  </dl>
                </div>

                {/* Documents */}
                <div className="space-y-2">
                  <Typography variant="body-strong" className="border-b pb-1" asChild><h4>{S.form.steps.documents.reviewTitle}</h4></Typography>
                  <Typography variant="body" tone="muted" asChild>
                    <p>
                      {uploadFiles.length > 0
                        ? S.form.steps.documents.filesReady(uploadFiles.length)
                        : isEdit
                          ? S.form.steps.documents.existingDocuments(existingCustomer?.documents.length ?? 0)
                          : S.form.steps.documents.noDocuments}
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
      title={isEdit ? S.form.editTitle : S.form.registerTitle}
      subtitle={
        isEdit
          ? S.form.editSubtitle(existingCustomer?.companyName ?? '')
          : S.form.registerSubtitle
      }
      breadcrumbs={[
        { label: S.breadcrumbs.customers, href: '/customers' },
        { label: isEdit ? existingCustomer?.companyName ?? S.breadcrumbs.edit : S.breadcrumbs.new },
      ]}
      backHref="/customers"
      footerLeft={
        <span>
          {S.form.stepProgress(currentStep + 1, STEPS.length, STEPS[currentStep]?.label ?? '')}
        </span>
      }
      footerActions={
        <>
          <Button variant="outline" onClick={goBack}>
            {S.form.cancel}
          </Button>
          <Button variant="outline" onClick={handlePrev} disabled={isFirst}>
            {S.form.previous}
          </Button>
          <Button onClick={handleNext}>{isLast ? S.form.submit : S.form.next}</Button>
        </>
      }
    >
      {/* Step progress */}
      <div className="flex items-center overflow-x-auto pb-2">
        {STEPS.map((step, index) => {
          const isCompleted = index < currentStep
          const isActive = index === currentStep
          const isStepPending = index > currentStep

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
                    isStepPending && 'border-2 border-muted-foreground/30 bg-muted text-muted-foreground',
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
                    isStepPending && 'text-muted-foreground',
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


