import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Check, Plus, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
import { FileUpload } from '@/components/common/FileUpload'
import { StatusBadge } from '@/components/common/StatusBadge'
import { mockCustomerRegistrations } from '@/modules/customers/data/customers'
import type { CustomerRegistration, ShippingAddress, CustomerContact } from '@/modules/customers/types'

const STEPS = [
  { id: 'company', label: 'Company' },
  { id: 'billing', label: 'Billing' },
  { id: 'shipping', label: 'Shipping' },
  { id: 'contacts', label: 'Contacts' },
  { id: 'credit', label: 'Credit' },
  { id: 'documents', label: 'Documents' },
  { id: 'review', label: 'Review' },
]

const CUSTOMER_TYPES: CustomerRegistration['type'][] = ['Company', 'Individual']
const PAYMENT_TERMS: CustomerRegistration['paymentTerms'][] = ['Net 15', 'Net 30', 'Net 45', 'Net 60', 'Advance', 'COD']
const PRICING_TIERS: CustomerRegistration['pricingTier'][] = ['Standard', 'Silver', 'Gold', 'Platinum']
const CONTACT_ROLES: CustomerContact['role'][] = ['Billing', 'Technical', 'Decision Maker', 'Procurement', 'General']

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value)

interface FormData {
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

function getInitialFormData(customer?: CustomerRegistration): FormData {
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

function CustomerFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
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
              <CardTitle>Company Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Customer Type">
                  <Select
                    value={formData.type}
                    onValueChange={(v) => updateField('type', v as string)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select type" />
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
                <Field label="Company Name">
                  <Input
                    value={formData.companyName}
                    onChange={(e) => updateField('companyName', e.target.value)}
                    placeholder="Enter company name"
                  />
                </Field>
                <Field label="Industry">
                  <Input
                    value={formData.industry}
                    onChange={(e) => updateField('industry', e.target.value)}
                    placeholder="e.g. IT Services"
                  />
                </Field>
                <Field label="Website">
                  <Input
                    value={formData.website}
                    onChange={(e) => updateField('website', e.target.value)}
                    placeholder="https://"
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
              <CardTitle>Billing Address</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Address" className="sm:col-span-2">
                  <Input
                    value={formData.billingAddress}
                    onChange={(e) => updateField('billingAddress', e.target.value)}
                    placeholder="Street address"
                  />
                </Field>
                <Field label="City">
                  <Input
                    value={formData.billingCity}
                    onChange={(e) => updateField('billingCity', e.target.value)}
                    placeholder="City"
                  />
                </Field>
                <Field label="State">
                  <Input
                    value={formData.billingState}
                    onChange={(e) => updateField('billingState', e.target.value)}
                    placeholder="State"
                  />
                </Field>
                <Field label="Pincode">
                  <Input
                    value={formData.billingPincode}
                    onChange={(e) => updateField('billingPincode', e.target.value)}
                    placeholder="PIN Code"
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
                <CardTitle>Shipping Addresses</CardTitle>
                <Button variant="outline" size="sm" onClick={addShippingAddress}>
                  <Plus className="mr-1 size-3.5" />
                  Add Address
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {formData.shippingAddresses.length === 0 ? (
                <div className="rounded-lg border border-dashed p-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    No shipping addresses added yet. Click &quot;Add Address&quot; to begin.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {formData.shippingAddresses.map((addr, idx) => (
                    <Card key={addr.id} size="sm" className="border-muted">
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-muted-foreground">
                              Address #{idx + 1}
                            </span>
                            {addr.isDefault && (
                              <Badge variant="default" className="text-[10px]">Default</Badge>
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
                          <Field label="Label">
                            <Input
                              value={addr.label}
                              onChange={(e) => updateShippingAddress(idx, 'label', e.target.value)}
                              placeholder="e.g. Head Office"
                            />
                          </Field>
                          <Field label="Address">
                            <Input
                              value={addr.address}
                              onChange={(e) => updateShippingAddress(idx, 'address', e.target.value)}
                              placeholder="Street address"
                            />
                          </Field>
                          <Field label="City">
                            <Input
                              value={addr.city}
                              onChange={(e) => updateShippingAddress(idx, 'city', e.target.value)}
                              placeholder="City"
                            />
                          </Field>
                          <Field label="State">
                            <Input
                              value={addr.state}
                              onChange={(e) => updateShippingAddress(idx, 'state', e.target.value)}
                              placeholder="State"
                            />
                          </Field>
                          <Field label="Pincode">
                            <Input
                              value={addr.pincode}
                              onChange={(e) => updateShippingAddress(idx, 'pincode', e.target.value)}
                              placeholder="PIN Code"
                            />
                          </Field>
                          <Field label="Contact Person">
                            <Input
                              value={addr.contactPerson}
                              onChange={(e) => updateShippingAddress(idx, 'contactPerson', e.target.value)}
                              placeholder="Full name"
                            />
                          </Field>
                          <Field label="Contact Phone">
                            <Input
                              value={addr.contactPhone}
                              onChange={(e) => updateShippingAddress(idx, 'contactPhone', e.target.value)}
                              placeholder="+91 XXXXX XXXXX"
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
                              Default address
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
                <CardTitle>Contacts</CardTitle>
                <Button variant="outline" size="sm" onClick={addContact}>
                  <Plus className="mr-1 size-3.5" />
                  Add Contact
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {formData.contacts.length === 0 ? (
                <div className="rounded-lg border border-dashed p-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    No contacts added yet. Click &quot;Add Contact&quot; to begin.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {formData.contacts.map((contact, idx) => (
                    <Card key={contact.id} size="sm" className="border-muted">
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-muted-foreground">
                              Contact #{idx + 1}
                            </span>
                            {contact.isPrimary && (
                              <Badge variant="default" className="text-[10px]">Primary</Badge>
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
                          <Field label="Name">
                            <Input
                              value={contact.name}
                              onChange={(e) => updateContact(idx, 'name', e.target.value)}
                              placeholder="Full name"
                            />
                          </Field>
                          <Field label="Email">
                            <Input
                              type="email"
                              value={contact.email}
                              onChange={(e) => updateContact(idx, 'email', e.target.value)}
                              placeholder="email@example.com"
                            />
                          </Field>
                          <Field label="Phone">
                            <Input
                              value={contact.phone}
                              onChange={(e) => updateContact(idx, 'phone', e.target.value)}
                              placeholder="+91 XXXXX XXXXX"
                            />
                          </Field>
                          <Field label="Designation">
                            <Input
                              value={contact.designation}
                              onChange={(e) => updateContact(idx, 'designation', e.target.value)}
                              placeholder="e.g. Manager - IT"
                            />
                          </Field>
                          <Field label="Role">
                            <Select
                              value={contact.role}
                              onValueChange={(v) => { if (v !== null) updateContact(idx, 'role', v) }}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select role" />
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
                              Primary contact
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
              <CardTitle>Credit Terms</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Credit Limit (₹)">
                  <Input
                    type="number"
                    value={formData.creditLimit}
                    onChange={(e) => updateField('creditLimit', e.target.value)}
                    placeholder="e.g. 5000000"
                  />
                </Field>
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
                <Field label="Pricing Tier">
                  <Select
                    value={formData.pricingTier}
                    onValueChange={(v) => updateField('pricingTier', v as string)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select tier" />
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
                <CardTitle>Document Upload</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Upload required documents: PAN Card, GST Certificate, Credit Application,
                    Address Proof, etc.
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

            <Card size="sm">
              <CardHeader>
                <CardTitle>KYC Checklist (Preview)</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  KYC verification will be performed after submission.
                </p>
                <div className="space-y-2">
                  {kycItems.map((item) => (
                    <div
                      key={item}
                      className="flex items-center justify-between rounded-md border px-3 py-2"
                    >
                      <span className="text-sm">{item}</span>
                      <StatusBadge variant="warning">Pending</StatusBadge>
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
              <CardTitle>Review & Submit</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Company */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium border-b pb-1">Company Details</h4>
                  <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <ReviewField label="Type" value={formData.type} />
                    <ReviewField label="Company Name" value={formData.companyName} />
                    <ReviewField label="Industry" value={formData.industry || '-'} />
                    <ReviewField label="Website" value={formData.website || '-'} />
                  </dl>
                </div>

                {/* Billing */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium border-b pb-1">Billing Address</h4>
                  <p className="text-sm text-muted-foreground">
                    {formData.billingAddress}, {formData.billingCity},{' '}
                    {formData.billingState} {formData.billingPincode}
                  </p>
                </div>

                {/* Shipping */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium border-b pb-1">
                    Shipping Addresses ({formData.shippingAddresses.length})
                  </h4>
                  {formData.shippingAddresses.length > 0 ? (
                    <div className="overflow-x-auto rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Label</TableHead>
                            <TableHead>City</TableHead>
                            <TableHead>Contact</TableHead>
                            <TableHead>Default</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {formData.shippingAddresses.map((addr) => (
                            <TableRow key={addr.id}>
                              <TableCell className="font-medium">{addr.label || '-'}</TableCell>
                              <TableCell>{addr.city || '-'}</TableCell>
                              <TableCell>{addr.contactPerson || '-'}</TableCell>
                              <TableCell>
                                {addr.isDefault ? (
                                  <Badge variant="default" className="text-[10px]">Yes</Badge>
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
                    <p className="text-sm text-muted-foreground">No shipping addresses added</p>
                  )}
                </div>

                {/* Contacts */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium border-b pb-1">
                    Contacts ({formData.contacts.length})
                  </h4>
                  {formData.contacts.length > 0 ? (
                    <div className="overflow-x-auto rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Primary</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {formData.contacts.map((c) => (
                            <TableRow key={c.id}>
                              <TableCell className="font-medium">{c.name || '-'}</TableCell>
                              <TableCell>{c.email || '-'}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-[10px]">{c.role}</Badge>
                              </TableCell>
                              <TableCell>
                                {c.isPrimary ? (
                                  <Badge variant="default" className="text-[10px]">Yes</Badge>
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
                    <p className="text-sm text-muted-foreground">No contacts added</p>
                  )}
                </div>

                {/* Credit Terms */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium border-b pb-1">Credit Terms</h4>
                  <dl className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <ReviewField
                      label="Credit Limit"
                      value={formData.creditLimit ? formatCurrency(Number(formData.creditLimit)) : 'N/A'}
                    />
                    <ReviewField label="Payment Terms" value={formData.paymentTerms} />
                    <ReviewField label="Pricing Tier" value={formData.pricingTier} />
                  </dl>
                </div>

                {/* Documents */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium border-b pb-1">Documents</h4>
                  <p className="text-sm text-muted-foreground">
                    {uploadFiles.length > 0
                      ? `${uploadFiles.length} file(s) ready to upload`
                      : isEdit
                        ? `${existingCustomer?.documents.length ?? 0} existing document(s)`
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
            {isEdit ? 'Edit Customer' : 'Register Customer'}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {isEdit
              ? `Editing ${existingCustomer?.companyName}`
              : 'Complete all steps to register a new customer'}
          </p>
        </div>
        <Button variant="outline" render={<Link to="/customers" />}>
          Cancel
        </Button>
      </div>

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

export default CustomerFormPage
