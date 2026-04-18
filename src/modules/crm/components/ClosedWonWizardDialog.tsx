import { useState, useRef } from 'react'
import { Check, Plus, Trash2, Building2, ShoppingCart, Upload, FileText, X, Package, Search, Tag, Cpu } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { IMS_CATEGORIES } from '../types'
import { PartPickerDialog } from './PartPickerDialog'
import type { PartPickerResult } from './PartPickerDialog'
import { mockBOMs } from '@/modules/wms/data/boms'
import type { BOMItem } from '@/modules/wms/types'

// ── Types ──

interface ClosedWonResult {
  account?: {
    name: string
    industry: string
    type: 'Enterprise' | 'SMB' | 'Startup' | 'Government'
    companySize: string
    employees: number
    city: string
    owner: string
    contact: {
      firstName: string
      lastName: string
      email: string
      phone: string
      designation: string
      department: string
    }
    documents: DocumentUpload[]
  }
  salesOrder: {
    lineItems: Array<{ item: string; description: string; qty: number; rate: number }>
    notes: string
    categoriesInterested: string[]
    dispatchMethod: string
    paymentTerms: string
    billingAddress: { street: string; city: string; state: string; zipCode: string; country: string }
    orderType: string
    warranty: string
  }
}

interface DocumentUpload {
  name: string
  type: string
  size: number
  file: File
}

interface ClosedWonWizardDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entityType: 'lead' | 'deal'
  entityName: string
  entityValue: number
  entityCompany?: string
  existingAccountId?: string
  existingAccountName?: string
  onComplete: (result: ClosedWonResult) => void
}

// ── Constants ──

const INDUSTRIES = [
  'IT Services', 'Banking', 'Manufacturing', 'Telecom',
  'Government', 'Healthcare', 'Retail', 'Other',
] as const

const ACCOUNT_TYPES = ['Enterprise', 'SMB', 'Startup', 'Government'] as const
const COMPANY_SIZES = ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'] as const

const DOCUMENT_TYPES = [
  { id: 'gst', label: 'GST Certificate' },
  { id: 'pan', label: 'PAN Card' },
  { id: 'aadhar', label: 'Aadhar Card' },
  { id: 'msme', label: 'MSME Certificate' },
  { id: 'bank', label: 'Bank Statement' },
] as const

const DISPATCH_METHODS = ['Courier', 'Self Pickup', 'Company Vehicle', 'Third Party Logistics'] as const
const PAYMENT_TERMS = ['Advance', 'Net 15', 'Net 30', 'Net 45', 'Net 60', '50% Advance + 50% on Delivery'] as const
const ORDER_TYPES = ['New', 'Refurb', 'Rental'] as const

const WARRANTY_OPTIONS: Record<string, string[]> = {
  New: ['3 Years', '4 Years', '5 Years'],
  Refurb: ['3 Months', '1 Year'],
  Rental: [],
}

const MAX_FILE_SIZE = 20 * 1024 * 1024
const ALLOWED_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png']

// ── Line Item with IMS support ──

type SOLineItemType = 'ims_part' | 'description'

interface SOLineItem {
  id: string
  type: SOLineItemType
  // IMS Part fields
  partId?: string
  partName?: string
  partSku?: string
  brand?: string
  variantType?: string
  bomId?: string
  bomName?: string
  // Description fields
  item: string
  description: string
  qty: number
  rate: number
}

function genId() {
  return `soli-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function createEmptySOItem(): SOLineItem {
  return { id: genId(), type: 'description', item: '', description: '', qty: 1, rate: 0 }
}

function fmtCurrency(n: number) {
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const partsWithBOM = mockBOMs
  .filter((b) => b.type === 'ASSEMBLY' && b.status === 'Active')
  .map((b) => ({ bomId: b.id, bomName: b.name, partId: b.parentPartId }))

const VARIANT_COLORS: Record<string, string> = {
  New: 'bg-[#dfffea] text-[#17c653]',
  Refurbished: 'bg-[#fff8dd] text-[#f6b100]',
  'New Pool': 'bg-[#f1f0ff] text-[#7239ea]',
}

// ── Main Component ──

function ClosedWonWizardDialog({
  open,
  onOpenChange,
  entityType,
  entityName,
  entityValue,
  entityCompany,
  existingAccountId,
  existingAccountName,
  onComplete,
}: ClosedWonWizardDialogProps) {
  const isLead = entityType === 'lead'
  const [currentStep, setCurrentStep] = useState(1)

  // Account form state (leads only)
  const [accountName, setAccountName] = useState(entityCompany ?? '')
  const [industry, setIndustry] = useState('')
  const [accountType, setAccountType] = useState<string>('')
  const [companySize, setCompanySize] = useState('')
  const [employees, setEmployees] = useState<number | ''>('')
  const [city, setCity] = useState('')
  const [accountOwner, setAccountOwner] = useState('Amit Patel')

  // Contact details
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [designation, setDesignation] = useState('')
  const [department, setDepartment] = useState('')

  // Document uploads
  const [documents, setDocuments] = useState<DocumentUpload[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadingDocType, setUploadingDocType] = useState('')

  // Sales Order form state
  const [orderDate, setOrderDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [lineItems, setLineItems] = useState<SOLineItem[]>([createEmptySOItem()])
  const [notes, setNotes] = useState('')
  const [categoriesInterested, setCategoriesInterested] = useState<string[]>([])
  const [dispatchMethod, setDispatchMethod] = useState('')
  const [paymentTerms, setPaymentTerms] = useState('')
  const [orderType, setOrderType] = useState('')
  const [warranty, setWarranty] = useState('')

  // Billing address
  const [street, setStreet] = useState('')
  const [billCity, setBillCity] = useState('')
  const [state, setState] = useState('')
  const [zipCode, setZipCode] = useState('')
  const [country, setCountry] = useState('India')

  // Part picker
  const [partPickerOpen, setPartPickerOpen] = useState(false)
  const [partPickerTargetId, setPartPickerTargetId] = useState<string | null>(null)

  const subtotal = lineItems.reduce((sum, li) => sum + li.qty * li.rate, 0)
  const gst = subtotal * 0.18
  const grandTotal = subtotal + gst

  // Validation
  const isAccountValid = accountName.trim() !== '' && industry !== '' && accountType !== '' && city.trim() !== ''
  const isSOValid = lineItems.some((li) => (li.item.trim() !== '' || li.partName) && li.qty > 0 && li.rate > 0)
  const isOnSOStep = isLead ? currentStep === 2 : currentStep === 1

  // Line item CRUD
  function updateLineItem(id: string, updates: Partial<SOLineItem>) {
    setLineItems((prev) => prev.map((li) => li.id === id ? { ...li, ...updates } : li))
  }

  function switchLineItemType(id: string, type: SOLineItemType) {
    setLineItems((prev) => prev.map((li) =>
      li.id === id
        ? { ...li, type, partId: undefined, partName: undefined, partSku: undefined, brand: undefined, variantType: undefined, bomId: undefined, bomName: undefined, item: '', description: '', rate: 0 }
        : li
    ))
  }

  function openPartPicker(lineItemId: string) {
    setPartPickerTargetId(lineItemId)
    setPartPickerOpen(true)
  }

  function handlePartPickerSelect(result: PartPickerResult) {
    if (!partPickerTargetId) return
    const bom = partsWithBOM.find((b) => b.partId === result.partId)
    updateLineItem(partPickerTargetId, {
      partId: result.partId,
      partName: result.partName,
      partSku: result.partSku,
      brand: result.brand,
      variantType: result.variantType,
      bomId: bom?.bomId,
      bomName: bom?.bomName,
      item: result.partName,
      description: `${result.partSku} · ${result.brand} · ${result.variantType}`,
      rate: result.unitPrice,
    })
    setPartPickerTargetId(null)
  }

  // Document handling
  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      toast.error('Only PDF, JPG, and PNG files are allowed')
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error('File size must be under 20 MB')
      return
    }
    setDocuments((prev) => [
      ...prev,
      { name: `${uploadingDocType} - ${file.name}`, type: uploadingDocType, size: file.size, file },
    ])
    setUploadingDocType('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function removeDocument(index: number) {
    setDocuments((prev) => prev.filter((_, i) => i !== index))
  }

  function toggleCategory(cat: string) {
    setCategoriesInterested((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    )
  }

  function handleNext() {
    if (!isAccountValid) {
      toast.error('Please fill all required account fields.')
      return
    }
    setCurrentStep(2)
  }

  function handleComplete() {
    if (!isSOValid) {
      toast.error('Please add at least one valid line item.')
      return
    }

    const result: ClosedWonResult = {
      salesOrder: {
        lineItems: lineItems
          .filter((li) => (li.item.trim() !== '' || li.partName) && li.qty > 0)
          .map((li) => ({
            item: li.partName ?? li.item,
            description: li.description,
            qty: li.qty,
            rate: li.rate,
          })),
        notes,
        categoriesInterested,
        dispatchMethod,
        paymentTerms,
        billingAddress: { street, city: billCity, state, zipCode, country },
        orderType,
        warranty,
      },
    }

    if (isLead) {
      result.account = {
        name: accountName.trim(),
        industry,
        type: accountType as 'Enterprise' | 'SMB' | 'Startup' | 'Government',
        companySize,
        employees: typeof employees === 'number' ? employees : 0,
        city: city.trim(),
        owner: accountOwner.trim(),
        contact: { firstName, lastName, email: contactEmail, phone: contactPhone, designation, department },
        documents,
      }
    }

    onComplete(result)

    // Reset
    setCurrentStep(1)
    setAccountName(entityCompany ?? '')
    setIndustry('')
    setAccountType('')
    setCompanySize('')
    setEmployees('')
    setCity('')
    setAccountOwner('Amit Patel')
    setFirstName('')
    setLastName('')
    setContactEmail('')
    setContactPhone('')
    setDesignation('')
    setDepartment('')
    setDocuments([])
    setOrderDate(new Date().toISOString().slice(0, 10))
    setLineItems([createEmptySOItem()])
    setNotes('')
    setCategoriesInterested([])
    setDispatchMethod('')
    setPaymentTerms('')
    setOrderType('')
    setWarranty('')
    setStreet('')
    setBillCity('')
    setState('')
    setZipCode('')
    setCountry('India')
  }

  function handleCancel() {
    onOpenChange(false)
    setCurrentStep(1)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-3xl p-0 gap-0 max-h-[90vh] flex flex-col">
          {/* Header */}
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle className="text-lg">
              Close Won &mdash; {entityName}
            </DialogTitle>
            <p className="text-[13px] text-muted-foreground mt-1">
              {isLead
                ? 'Create an account and sales order to close this lead.'
                : `Create a sales order for ${existingAccountName ?? 'this deal'}.`}
            </p>
          </DialogHeader>

          {/* Step Indicator */}
          <div className="px-6 pb-4">
            <div className="flex items-center gap-3">
              {isLead && (
                <>
                  <div className={cn(
                    'flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors',
                    currentStep === 1 ? 'bg-primary/10 text-primary' : 'bg-[#dfffea] text-[#17c653]'
                  )}>
                    {currentStep > 1 ? <Check className="size-3.5" /> : <Building2 className="size-3.5" />}
                    <span>1. Account</span>
                  </div>
                  <div className={cn('h-0.5 w-8', currentStep > 1 ? 'bg-primary' : 'bg-border')} />
                </>
              )}
              <div className={cn(
                'flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors',
                isOnSOStep ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
              )}>
                <ShoppingCart className="size-3.5" />
                <span>{isLead ? '2' : '1'}. Sales Order</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {/* ── Step 1: Account Creation (leads only) ── */}
            {isLead && currentStep === 1 && (
              <div className="space-y-6">
                {/* Account Details */}
                <div>
                  <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                    Account Details
                  </h4>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-[13px]">
                        Account Name <span className="text-destructive">*</span>
                      </Label>
                      <Input value={accountName} onChange={(e) => setAccountName(e.target.value)} placeholder="Company name" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-[13px]">Industry <span className="text-destructive">*</span></Label>
                        <Select value={industry} onValueChange={setIndustry}>
                          <SelectTrigger><SelectValue placeholder="Select industry" /></SelectTrigger>
                          <SelectContent>
                            {INDUSTRIES.map((ind) => (<SelectItem key={ind} value={ind}>{ind}</SelectItem>))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[13px]">Type <span className="text-destructive">*</span></Label>
                        <Select value={accountType} onValueChange={setAccountType}>
                          <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                          <SelectContent>
                            {ACCOUNT_TYPES.map((t) => (<SelectItem key={t} value={t}>{t}</SelectItem>))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-[13px]">Company Size</Label>
                        <Select value={companySize} onValueChange={setCompanySize}>
                          <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent>
                            {COMPANY_SIZES.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[13px]">Employees</Label>
                        <Input type="number" min={1} value={employees} onChange={(e) => setEmployees(e.target.value ? Number(e.target.value) : '')} placeholder="Count" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[13px]">City <span className="text-destructive">*</span></Label>
                        <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[13px]">Account Owner</Label>
                      <Input value={accountOwner} onChange={(e) => setAccountOwner(e.target.value)} placeholder="Owner name" />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Contact Details */}
                <div>
                  <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">Contact Details</h4>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-[13px]">First Name</Label>
                        <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First name" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[13px]">Last Name</Label>
                        <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Last name" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-[13px]">Email</Label>
                        <Input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="email@company.com" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[13px]">Contact Number</Label>
                        <Input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="+91 XXXXX XXXXX" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-[13px]">Designation</Label>
                        <Input value={designation} onChange={(e) => setDesignation(e.target.value)} placeholder="e.g. IT Manager" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[13px]">Department</Label>
                        <Input value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="e.g. IT, Procurement" />
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Document Upload */}
                <div>
                  <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">Document Upload</h4>
                  <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleFileSelect} />
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {DOCUMENT_TYPES.map((docType) => {
                      const uploaded = documents.find((d) => d.type === docType.label)
                      return (
                        <div key={docType.id} className={cn('rounded-lg border p-3 text-center transition-colors', uploaded ? 'border-primary/40 bg-primary/5' : 'border-dashed')}>
                          {uploaded ? (
                            <div className="space-y-1">
                              <FileText className="mx-auto size-5 text-primary" />
                              <p className="text-[11px] font-medium truncate">{docType.label}</p>
                              <p className="text-[10px] text-muted-foreground">{formatFileSize(uploaded.size)}</p>
                              <Button variant="ghost" size="sm" className="h-6 text-[10px] text-destructive hover:text-destructive" onClick={() => removeDocument(documents.indexOf(uploaded))}>
                                <X className="size-3 mr-1" /> Remove
                              </Button>
                            </div>
                          ) : (
                            <button type="button" className="w-full space-y-1" onClick={() => { setUploadingDocType(docType.label); fileInputRef.current?.click() }}>
                              <Upload className="mx-auto size-5 text-muted-foreground" />
                              <p className="text-[11px] font-medium">{docType.label}</p>
                              <p className="text-[10px] text-muted-foreground">PDF, JPG, PNG</p>
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ── Sales Order Step ── */}
            {isOnSOStep && (
              <div className="space-y-5">
                {/* Account reference banner */}
                <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/30 px-4 py-3">
                  <Building2 className="size-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Account</p>
                    <p className="text-sm font-medium">{isLead ? accountName : existingAccountName ?? 'N/A'}</p>
                  </div>
                  <div className="ml-auto text-right">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Deal Value</p>
                    <p className="text-sm font-medium">&#8377;{fmtCurrency(entityValue)}</p>
                  </div>
                </div>

                {/* Categories Interested */}
                <div className="space-y-2">
                  <Label className="text-[13px]">Categories Interested</Label>
                  <Select onValueChange={(val) => toggleCategory(val)} value="">
                    <SelectTrigger>
                      <SelectValue placeholder={categoriesInterested.length > 0 ? `${categoriesInterested.length} selected` : 'Select categories'} />
                    </SelectTrigger>
                    <SelectContent>
                      {IMS_CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          <span className="flex items-center gap-2">
                            {categoriesInterested.includes(cat) && <Check className="size-3.5 text-primary" />}
                            {cat}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {categoriesInterested.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {categoriesInterested.map((cat) => (
                        <Badge key={cat} variant="secondary" className="text-[11px] cursor-pointer" onClick={() => toggleCategory(cat)}>
                          {cat}<X className="ml-1 size-3" />
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Order Date + Order Type + Warranty */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[13px]">Order Date</Label>
                    <Input type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[13px]">Order Type</Label>
                    <Select value={orderType} onValueChange={(v) => { setOrderType(v); setWarranty('') }}>
                      <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                      <SelectContent>
                        {ORDER_TYPES.map((t) => (<SelectItem key={t} value={t}>{t}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[13px]">Warranty</Label>
                    <Select value={warranty} onValueChange={setWarranty} disabled={!orderType || (WARRANTY_OPTIONS[orderType]?.length ?? 0) === 0}>
                      <SelectTrigger><SelectValue placeholder={orderType === 'Rental' ? 'N/A' : 'Select'} /></SelectTrigger>
                      <SelectContent>
                        {(WARRANTY_OPTIONS[orderType] ?? []).map((w) => (<SelectItem key={w} value={w}>{w}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Dispatch + Payment Terms */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[13px]">Dispatch Method</Label>
                    <Select value={dispatchMethod} onValueChange={setDispatchMethod}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {DISPATCH_METHODS.map((d) => (<SelectItem key={d} value={d}>{d}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[13px]">Payment Terms</Label>
                    <Select value={paymentTerms} onValueChange={setPaymentTerms}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {PAYMENT_TERMS.map((p) => (<SelectItem key={p} value={p}>{p}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Billing Address */}
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">Billing Address</p>
                  <div className="space-y-3">
                    <Input value={street} onChange={(e) => setStreet(e.target.value)} placeholder="Street address" />
                    <div className="grid grid-cols-2 gap-4">
                      <Input value={billCity} onChange={(e) => setBillCity(e.target.value)} placeholder="City" />
                      <Input value={state} onChange={(e) => setState(e.target.value)} placeholder="State" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <Input value={zipCode} onChange={(e) => setZipCode(e.target.value)} placeholder="PIN code" />
                      <Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Country" />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* ── Quote / Line Items — IMS Part Picker integrated ── */}
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                    Quote / Line Items
                  </p>
                  <div className="space-y-2">
                    {lineItems.map((li, idx) => (
                      <div key={li.id} className="rounded-lg border border-border/60 bg-background p-3">
                        <div className="flex items-start gap-3">
                          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-muted-foreground mt-0.5">
                            {idx + 1}
                          </span>
                          <div className="flex-1 space-y-2">
                            {/* Type toggle */}
                            <div className="flex items-center gap-2">
                              <div className="flex shrink-0 rounded-md border p-0.5">
                                <button
                                  type="button"
                                  onClick={() => switchLineItemType(li.id, 'ims_part')}
                                  className={cn(
                                    'flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium transition-colors',
                                    li.type === 'ims_part' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
                                  )}
                                >
                                  <Package className="size-3" />
                                  IMS Part
                                </button>
                                <button
                                  type="button"
                                  onClick={() => switchLineItemType(li.id, 'description')}
                                  className={cn(
                                    'flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium transition-colors',
                                    li.type === 'description' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
                                  )}
                                >
                                  <FileText className="size-3" />
                                  Manual
                                </button>
                              </div>

                              {/* IMS Part badges */}
                              {li.type === 'ims_part' && li.partId && (
                                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                  {li.variantType && (
                                    <Badge className={cn('text-[10px] shrink-0', VARIANT_COLORS[li.variantType] ?? 'bg-muted text-muted-foreground')}>
                                      <Tag className="size-2.5 mr-0.5" />{li.variantType}
                                    </Badge>
                                  )}
                                  {li.bomId && (
                                    <Badge className="text-[10px] bg-[#f1f0ff] text-[#7239ea] shrink-0">
                                      <Cpu className="size-2.5 mr-0.5" />BOM
                                    </Badge>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Item selector */}
                            {li.type === 'ims_part' ? (
                              li.partId ? (
                                <button
                                  type="button"
                                  onClick={() => openPartPicker(li.id)}
                                  className="flex w-full items-center gap-2 rounded-md border bg-background px-3 py-2 text-left transition-colors hover:bg-muted/50"
                                >
                                  <Package className="size-3.5 shrink-0 text-primary" />
                                  <div className="min-w-0 flex-1">
                                    <div className="text-[13px] font-medium truncate">{li.partName}</div>
                                    <div className="text-[11px] text-muted-foreground">{li.partSku} &middot; {li.brand}</div>
                                  </div>
                                  <Search className="size-3 shrink-0 text-muted-foreground" />
                                </button>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="w-full justify-start gap-2 font-normal text-muted-foreground h-9"
                                  onClick={() => openPartPicker(li.id)}
                                >
                                  <Search className="size-3.5" />
                                  Search IMS part catalog...
                                </Button>
                              )
                            ) : (
                              <div className="grid grid-cols-2 gap-2">
                                <Input placeholder="Item name" value={li.item} onChange={(e) => updateLineItem(li.id, { item: e.target.value })} className="h-8 text-[13px]" />
                                <Input placeholder="Description" value={li.description} onChange={(e) => updateLineItem(li.id, { description: e.target.value })} className="h-8 text-[13px]" />
                              </div>
                            )}

                            {/* Qty × Rate = Amount */}
                            <div className="flex items-center gap-2">
                              <div className="w-20">
                                <Input type="number" min={1} placeholder="Qty" value={li.qty} onChange={(e) => updateLineItem(li.id, { qty: Number(e.target.value) || 0 })} className="h-8 text-[13px] text-right" />
                              </div>
                              <span className="text-xs text-muted-foreground">&times;</span>
                              <div className="w-28">
                                <Input type="number" min={0} placeholder="Rate" value={li.rate} onChange={(e) => updateLineItem(li.id, { rate: Number(e.target.value) || 0 })} className="h-8 text-[13px] text-right" />
                              </div>
                              <span className="text-xs text-muted-foreground">=</span>
                              <span className="text-[13px] font-semibold tabular-nums min-w-[80px] text-right">
                                &#8377;{fmtCurrency(li.qty * li.rate)}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                onClick={() => {
                                  if (lineItems.length <= 1) return
                                  setLineItems((prev) => prev.filter((x) => x.id !== li.id))
                                }}
                                disabled={lineItems.length <= 1}
                                className="ml-auto text-muted-foreground hover:text-destructive"
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button variant="outline" size="sm" className="mt-2" onClick={() => setLineItems((prev) => [...prev, createEmptySOItem()])}>
                    <Plus className="mr-1 size-3.5" />
                    Add Item
                  </Button>
                </div>

                {/* Totals */}
                <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
                  <div className="space-y-1.5 text-[13px]">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="font-medium tabular-nums">&#8377;{fmtCurrency(subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">CGST (9%)</span>
                      <span className="tabular-nums">&#8377;{fmtCurrency(gst / 2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">SGST (9%)</span>
                      <span className="tabular-nums">&#8377;{fmtCurrency(gst / 2)}</span>
                    </div>
                    <Separator className="my-1.5" />
                    <div className="flex justify-between text-sm font-semibold">
                      <span>Grand Total</span>
                      <span className="tabular-nums">&#8377;{fmtCurrency(grandTotal)}</span>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-1.5">
                  <Label className="text-[13px]">Notes</Label>
                  <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Additional notes..." rows={2} className="text-[13px]" />
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 border-t px-6 py-4">
            {isLead && currentStep === 2 && (
              <Button variant="outline" size="sm" onClick={() => setCurrentStep(1)}>Back</Button>
            )}
            <Button variant="ghost" size="sm" onClick={handleCancel}>Cancel</Button>
            {isOnSOStep ? (
              <Button size="sm" onClick={handleComplete} variant="success">
                <Check className="size-3.5 mr-1" />
                Complete
              </Button>
            ) : (
              <Button size="sm" onClick={handleNext}>Next</Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* IMS Part Picker Dialog */}
      <PartPickerDialog
        open={partPickerOpen}
        onOpenChange={setPartPickerOpen}
        onSelect={handlePartPickerSelect}
        title="Select Part from IMS"
      />
    </>
  )
}

export { ClosedWonWizardDialog }
export type { ClosedWonWizardDialogProps, ClosedWonResult }
