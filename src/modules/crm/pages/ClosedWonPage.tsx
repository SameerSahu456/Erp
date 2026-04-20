import { useState, useRef } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft, Check, Plus, Trash2, Building2, ShoppingCart,
  Upload, FileText, X, Package, Search, Tag, Cpu,
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { IMS_CATEGORIES } from '../types'
import { PartPickerDialog } from '../components/PartPickerDialog'
import type { PartPickerResult } from '../components/PartPickerDialog'
import { mockBOMs } from '@/modules/wms/data/boms'
import { deals } from '../data/deals'
import { leads } from '../data/leads'

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

// ── Line Item types ──

type SOLineItemType = 'ims_part' | 'description'

interface SOLineItem {
  id: string
  type: SOLineItemType
  partId?: string
  partName?: string
  partSku?: string
  brand?: string
  variantType?: string
  bomId?: string
  bomName?: string
  item: string
  description: string
  qty: number
  rate: number
}

interface DocumentUpload {
  name: string
  type: string
  size: number
  file: File
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

function ClosedWonPage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const entityType = searchParams.get('type') as 'lead' | 'deal' ?? 'deal'
  const isLead = entityType === 'lead'

  // Resolve entity
  const deal = !isLead ? deals.find((d) => d.id === id) : undefined
  const lead = isLead ? leads.find((l) => l.id === id) : undefined
  const entity = deal ?? lead

  const entityName = deal?.name ?? lead?.name ?? ''
  const entityValue = deal?.value ?? lead?.value ?? 0
  const entityCompany = lead?.company ?? ''
  const existingAccountName = deal?.accountName ?? ''

  const backPath = isLead ? `/crm/leads/${id}` : `/crm/deals/${id}`

  const [currentStep, setCurrentStep] = useState(1)

  // Account form state (leads only)
  const [accountName, setAccountName] = useState(entityCompany)
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

  if (!entity) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <h2 className="font-display text-xl font-semibold">{isLead ? 'Lead' : 'Deal'} not found</h2>
        <Button variant="outline" onClick={() => navigate(backPath)}>Go Back</Button>
      </div>
    )
  }

  // Line item CRUD
  function updateLineItem(lineItemId: string, updates: Partial<SOLineItem>) {
    setLineItems((prev) => prev.map((li) => li.id === lineItemId ? { ...li, ...updates } : li))
  }

  function switchLineItemType(lineItemId: string, type: SOLineItemType) {
    setLineItems((prev) => prev.map((li) =>
      li.id === lineItemId
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

    const soTotal = lineItems
      .filter((li) => (li.item.trim() !== '' || li.partName) && li.qty > 0)
      .reduce((sum, li) => sum + li.qty * li.rate, 0)

    const fmtTotal = new Intl.NumberFormat('en-IN', {
      style: 'currency', currency: 'INR', maximumFractionDigits: 0,
    }).format(soTotal)

    if (isLead) {
      toast.success(`Lead "${entityName}" closed won — Account & Sales Order created`)
    } else {
      toast.success(`Deal "${entityName}" closed won — ${fmtTotal}`)
    }

    navigate(backPath)
  }

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      {/* ── Top bar ── */}
      <div className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="flex items-center justify-between px-8 py-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => navigate(backPath)}>
              <ArrowLeft className="size-4" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold">Close Won &mdash; {entityName}</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {isLead
                  ? 'Create an account and sales order to close this lead.'
                  : `Create a sales order for ${existingAccountName || 'this deal'}.`}
              </p>
            </div>
          </div>
          <Button variant="ghost" onClick={() => navigate(backPath)}>Cancel</Button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-4 px-8 pb-4">
          {isLead && (
            <>
              <button
                type="button"
                onClick={() => currentStep > 1 && setCurrentStep(1)}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                  currentStep === 1
                    ? 'bg-primary/10 text-primary'
                    : 'bg-[#dfffea] text-[#17c653] cursor-pointer hover:bg-[#d0f5dd]'
                )}
              >
                {currentStep > 1 ? <Check className="size-4" /> : <Building2 className="size-4" />}
                1. Account
              </button>
              <div className={cn('h-0.5 w-8', currentStep > 1 ? 'bg-primary' : 'bg-border')} />
            </>
          )}
          <div className={cn(
            'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
            isOnSOStep ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
          )}>
            <ShoppingCart className="size-4" />
            {isLead ? '2' : '1'}. Sales Order
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="mx-auto max-w-7xl px-8 py-8">

        {/* ════ Step 1: Account (leads only) — single card ════ */}
        {isLead && currentStep === 1 && (
          <Card>
            <CardContent className="p-8">
              {/* ── Account Details ── */}
              <h3 className="text-base font-semibold mb-6">Account Details</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-10 gap-y-5">
                <div className="space-y-2 lg:col-span-2">
                  <Label>Account Name <span className="text-destructive">*</span></Label>
                  <Input value={accountName} onChange={(e) => setAccountName(e.target.value)} placeholder="Company name" className="max-w-lg" />
                </div>
                <div className="space-y-2">
                  <Label>Industry <span className="text-destructive">*</span></Label>
                  <Select value={industry} onValueChange={setIndustry}>
                    <SelectTrigger><SelectValue placeholder="Select industry" /></SelectTrigger>
                    <SelectContent>
                      {INDUSTRIES.map((ind) => <SelectItem key={ind} value={ind}>{ind}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Type <span className="text-destructive">*</span></Label>
                  <Select value={accountType} onValueChange={setAccountType}>
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      {ACCOUNT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Company Size</Label>
                  <Select value={companySize} onValueChange={setCompanySize}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {COMPANY_SIZES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Employees</Label>
                  <Input type="number" min={1} value={employees} onChange={(e) => setEmployees(e.target.value ? Number(e.target.value) : '')} placeholder="Count" />
                </div>
                <div className="space-y-2">
                  <Label>City <span className="text-destructive">*</span></Label>
                  <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" />
                </div>
                <div className="space-y-2">
                  <Label>Account Owner</Label>
                  <Input value={accountOwner} onChange={(e) => setAccountOwner(e.target.value)} placeholder="Owner name" />
                </div>
              </div>

              <Separator className="my-8" />

              {/* ── Contact Details ── */}
              <h3 className="text-base font-semibold mb-6">Contact Details</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-10 gap-y-5">
                <div className="space-y-2">
                  <Label>First Name</Label>
                  <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First name" />
                </div>
                <div className="space-y-2">
                  <Label>Last Name</Label>
                  <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Last name" />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="email@company.com" />
                </div>
                <div className="space-y-2">
                  <Label>Contact Number</Label>
                  <Input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="+91 XXXXX XXXXX" />
                </div>
                <div className="space-y-2">
                  <Label>Designation</Label>
                  <Input value={designation} onChange={(e) => setDesignation(e.target.value)} placeholder="e.g. IT Manager" />
                </div>
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Input value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="e.g. IT, Procurement" />
                </div>
              </div>

              <Separator className="my-8" />

              {/* ── Document Upload ── */}
              <h3 className="text-base font-semibold mb-6">Document Upload</h3>
              <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleFileSelect} />
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                {DOCUMENT_TYPES.map((docType) => {
                  const uploaded = documents.find((d) => d.type === docType.label)
                  return (
                    <div key={docType.id} className={cn('rounded-xl border p-4 text-center transition-colors', uploaded ? 'border-primary/40 bg-primary/5' : 'border-dashed hover:border-primary/30 hover:bg-muted/30')}>
                      {uploaded ? (
                        <div className="space-y-2">
                          <FileText className="mx-auto size-6 text-primary" />
                          <p className="text-sm font-medium truncate">{docType.label}</p>
                          <p className="text-xs text-muted-foreground">{formatFileSize(uploaded.size)}</p>
                          <Button variant="ghost" size="sm" className="text-xs text-destructive hover:text-destructive" onClick={() => removeDocument(documents.indexOf(uploaded))}>
                            <X className="size-3.5 mr-1" /> Remove
                          </Button>
                        </div>
                      ) : (
                        <button type="button" className="w-full space-y-2 py-1" onClick={() => { setUploadingDocType(docType.label); fileInputRef.current?.click() }}>
                          <Upload className="mx-auto size-6 text-muted-foreground" />
                          <p className="text-sm font-medium">{docType.label}</p>
                          <p className="text-xs text-muted-foreground">PDF, JPG, PNG</p>
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>

              <Separator className="my-8" />

              {/* ── Submit ── */}
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Fill in the account details above, then proceed to create the sales order.</p>
                <Button onClick={handleNext} className="px-8">
                  Submit &amp; Continue to Sales Order &rarr;
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ════ Sales Order Step — single card ════ */}
        {isOnSOStep && (
          <Card>
            <CardContent className="p-8">
              {/* Account + Deal value banner */}
              <div className="flex items-center gap-5 rounded-xl border bg-muted/30 px-6 py-4 mb-8">
                <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                  <Building2 className="size-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Account</p>
                  <p className="text-base font-semibold mt-0.5">{isLead ? accountName : existingAccountName || 'N/A'}</p>
                </div>
                <Separator orientation="vertical" className="h-10 mx-2" />
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Deal Value</p>
                  <p className="text-base font-semibold mt-0.5">&#8377;{fmtCurrency(entityValue)}</p>
                </div>
              </div>

              {/* ── Order Details ── */}
              <h3 className="text-base font-semibold mb-6">Order Details</h3>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-x-10 gap-y-5 mb-5">
                <div className="space-y-2">
                  <Label>Order Date</Label>
                  <Input type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Order Type</Label>
                  <Select value={orderType} onValueChange={(v) => { setOrderType(v); setWarranty('') }}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {ORDER_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Warranty</Label>
                  <Select value={warranty} onValueChange={setWarranty} disabled={!orderType || (WARRANTY_OPTIONS[orderType]?.length ?? 0) === 0}>
                    <SelectTrigger><SelectValue placeholder={orderType === 'Rental' ? 'N/A' : 'Select'} /></SelectTrigger>
                    <SelectContent>
                      {(WARRANTY_OPTIONS[orderType] ?? []).map((w) => <SelectItem key={w} value={w}>{w}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Dispatch Method</Label>
                  <Select value={dispatchMethod} onValueChange={setDispatchMethod}>
                    <SelectTrigger><SelectValue placeholder="Select dispatch method" /></SelectTrigger>
                    <SelectContent>
                      {DISPATCH_METHODS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Payment Terms</Label>
                  <Select value={paymentTerms} onValueChange={setPaymentTerms}>
                    <SelectTrigger><SelectValue placeholder="Select payment terms" /></SelectTrigger>
                    <SelectContent>
                      {PAYMENT_TERMS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Categories Interested</Label>
                  <Select onValueChange={(val) => toggleCategory(val)} value="">
                    <SelectTrigger>
                      <SelectValue placeholder={categoriesInterested.length > 0 ? `${categoriesInterested.length} selected` : 'Select categories'} />
                    </SelectTrigger>
                    <SelectContent>
                      {IMS_CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          <span className="flex items-center gap-2">
                            {categoriesInterested.includes(cat) && <Check className="size-4 text-primary" />}
                            {cat}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {categoriesInterested.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-5">
                  {categoriesInterested.map((cat) => (
                    <Badge key={cat} variant="secondary" className="text-xs cursor-pointer px-2.5 py-1" onClick={() => toggleCategory(cat)}>
                      {cat}<X className="ml-1.5 size-3" />
                    </Badge>
                  ))}
                </div>
              )}

              <Separator className="my-8" />

              {/* ── Quote / Line Items ── */}
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-base font-semibold">Quote / Line Items</h3>
                <Button variant="outline" onClick={() => setLineItems((prev) => [...prev, createEmptySOItem()])}>
                  <Plus className="mr-2 size-4" />
                  Add Item
                </Button>
              </div>

              <div className="space-y-4">
                {lineItems.map((li, idx) => (
                  <div key={li.id} className="rounded-xl border bg-muted/20 p-5">
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex items-center gap-3">
                        <span className="flex size-8 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">
                          {idx + 1}
                        </span>
                        <div className="flex rounded-lg border p-0.5">
                          <button
                            type="button"
                            onClick={() => switchLineItemType(li.id, 'ims_part')}
                            title="IMS Part"
                            className={cn(
                              'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                              li.type === 'ims_part' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
                            )}
                          >
                            <Package className="size-4" />
                            IMS Part
                          </button>
                          <button
                            type="button"
                            onClick={() => switchLineItemType(li.id, 'description')}
                            title="Manual entry"
                            className={cn(
                              'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                              li.type === 'description' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
                            )}
                          >
                            <FileText className="size-4" />
                            Manual
                          </button>
                        </div>
                        {li.type === 'ims_part' && li.partId && (
                          <div className="flex items-center gap-1.5">
                            {li.variantType && (
                              <Badge className={cn('text-xs px-2 py-0.5', VARIANT_COLORS[li.variantType] ?? 'bg-muted text-muted-foreground')}>
                                <Tag className="size-3 mr-1" />{li.variantType}
                              </Badge>
                            )}
                            {li.bomId && (
                              <Badge className="text-xs px-2 py-0.5 bg-[#f1f0ff] text-[#7239ea]">
                                <Cpu className="size-3 mr-1" />BOM
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => {
                          if (lineItems.length <= 1) return
                          setLineItems((prev) => prev.filter((x) => x.id !== li.id))
                        }}
                        disabled={lineItems.length <= 1}
                        className="text-muted-foreground hover:text-destructive shrink-0"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>

                    {li.type === 'ims_part' ? (
                      li.partId ? (
                        <button
                          type="button"
                          onClick={() => openPartPicker(li.id)}
                          className="flex w-full items-center gap-3 rounded-lg border bg-background px-4 py-3 text-left transition-colors hover:bg-muted/50 mb-4"
                        >
                          <Package className="size-5 shrink-0 text-primary" />
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium truncate">{li.partName}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">{li.partSku} &middot; {li.brand}</div>
                          </div>
                          <Search className="size-4 shrink-0 text-muted-foreground" />
                        </button>
                      ) : (
                        <Button
                          variant="outline"
                          className="w-full justify-start gap-2 font-normal text-muted-foreground h-11 mb-4"
                          onClick={() => openPartPicker(li.id)}
                        >
                          <Search className="size-4" />
                          Search IMS part catalog...
                        </Button>
                      )
                    ) : (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-4">
                        <div className="space-y-2">
                          <Label className="text-sm text-muted-foreground">Item Name</Label>
                          <Input placeholder="Enter item name" value={li.item} onChange={(e) => updateLineItem(li.id, { item: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm text-muted-foreground">Description</Label>
                          <Input placeholder="Brief description" value={li.description} onChange={(e) => updateLineItem(li.id, { description: e.target.value })} />
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-3 gap-5">
                      <div className="space-y-2">
                        <Label className="text-sm text-muted-foreground">Quantity</Label>
                        <Input
                          type="number"
                          min={1}
                          value={li.qty}
                          onChange={(e) => updateLineItem(li.id, { qty: Number(e.target.value) || 0 })}
                          className="text-right"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm text-muted-foreground">Rate (&#8377;)</Label>
                        <Input
                          type="number"
                          min={0}
                          value={li.rate}
                          onChange={(e) => updateLineItem(li.id, { rate: Number(e.target.value) || 0 })}
                          className="text-right"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm text-muted-foreground">Amount</Label>
                        <div className="flex h-9 items-center justify-end rounded-md border bg-muted/40 px-3 text-sm font-semibold tabular-nums">
                          &#8377;{fmtCurrency(li.qty * li.rate)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="mt-8 ml-auto w-80">
                <div className="rounded-xl border bg-muted/20 p-5">
                  <div className="space-y-3 text-sm">
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
                    <Separator />
                    <div className="flex justify-between text-base font-semibold pt-1">
                      <span>Grand Total</span>
                      <span className="tabular-nums">&#8377;{fmtCurrency(grandTotal)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <Separator className="my-8" />

              {/* ── Billing Address ── */}
              <h3 className="text-base font-semibold mb-6">Billing Address</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-10 gap-y-5">
                <div className="space-y-2 lg:col-span-2">
                  <Label>Street Address</Label>
                  <Input value={street} onChange={(e) => setStreet(e.target.value)} placeholder="Street address" className="max-w-lg" />
                </div>
                <div className="space-y-2">
                  <Label>City</Label>
                  <Input value={billCity} onChange={(e) => setBillCity(e.target.value)} placeholder="City" />
                </div>
                <div className="space-y-2">
                  <Label>State</Label>
                  <Input value={state} onChange={(e) => setState(e.target.value)} placeholder="State" />
                </div>
                <div className="space-y-2">
                  <Label>PIN Code</Label>
                  <Input value={zipCode} onChange={(e) => setZipCode(e.target.value)} placeholder="PIN code" />
                </div>
                <div className="space-y-2">
                  <Label>Country</Label>
                  <Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Country" />
                </div>
              </div>

              <Separator className="my-8" />

              {/* ── Notes ── */}
              <h3 className="text-base font-semibold mb-4">Notes</h3>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Additional notes or special instructions..." rows={4} className="max-w-2xl" />

              <Separator className="my-8" />

              {/* ── Actions ── */}
              <div className="flex items-center justify-between">
                {isLead ? (
                  <Button variant="outline" onClick={() => setCurrentStep(1)}>
                    <ArrowLeft className="size-4 mr-2" />
                    Back to Account
                  </Button>
                ) : (
                  <div />
                )}
                <Button onClick={handleComplete} variant="success" className="px-8">
                  <Check className="size-4 mr-2" />
                  Complete
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* IMS Part Picker Dialog */}
      <PartPickerDialog
        open={partPickerOpen}
        onOpenChange={setPartPickerOpen}
        onSelect={handlePartPickerSelect}
        title="Select Part from IMS"
      />
    </div>
  )
}

export default ClosedWonPage
