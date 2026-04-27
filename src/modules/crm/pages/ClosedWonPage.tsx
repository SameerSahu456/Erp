import { Fragment, useState, useRef } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useNavigateBack } from '@/hooks/use-navigate-back'
import {
  ArrowLeft, Check, ChevronDown, ChevronRight, Plus, Building2, ShoppingCart,
  Upload, FileText, X, Package, ClipboardList, MapPin, User,
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
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/components/ui/command'
import { cn } from '@/lib/utils'
import { IMS_CATEGORIES } from '../types'
import type { AccountAddress } from '../types'
import { PartPickerDialog } from '../components/PartPickerDialog'
import type { PartPickerResult } from '../components/PartPickerDialog'
import { mockBOMs } from '@/modules/wms/data/boms'
import { mockParts } from '@/modules/ims/data/parts'
import { mockVariants } from '@/modules/ims/data/variants'
import { AddAddressDialog } from '../components/AddAddressDialog'
import { deals } from '../data/deals'
import { leads } from '../data/leads'
import { accounts } from '../data/accounts'
import { demoRequests } from '../data/demo-requests'
import { persistSOAndPOFromDemo, type ConvertedLine } from '../lib/demo-conversion'

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
  category?: string
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

interface BOMComponent {
  id: string
  partId?: string
  partName: string
  partSku?: string
  condition?: string
  qty: number
  position?: string
  isOptional?: boolean
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

const partCategoryMap = new Map(mockParts.map((p) => [p.id, p.categoryName]))

function findBOMForPart(partId?: string) {
  if (!partId) return undefined
  return mockBOMs.find(
    (b) => b.parentPartId === partId && b.type === 'ASSEMBLY' && b.status === 'Active',
  )
}

const SERVER_CATEGORY = 'Servers'

// ── Inline component search (used inside expanded BOM panel) ──

const VARIANT_SEARCH_OPTIONS = (() => {
  const partMap = new Map(mockParts.map((p) => [p.id, p]))
  return mockVariants
    .filter((v) => v.isActive)
    .map((v) => {
      const part = partMap.get(v.partId)
      if (!part) return null
      return {
        variantId: v.id,
        variantSku: v.variantSku,
        partName: part.name,
        partSku: part.sku,
        condition: v.condition,
        category: part.categoryName,
        brand: part.brand ?? '',
      }
    })
    .filter((o): o is NonNullable<typeof o> => o !== null)
})()

function BomComponentSearch({
  excludePartIds,
  onPick,
}: {
  excludePartIds: Set<string>
  onPick: (variantId: string) => void
}) {
  const [query, setQuery] = useState('')
  return (
    <div
      className="rounded-md border bg-muted/40 [&_[data-slot=command]]:bg-transparent! [&_[data-slot=command-list]]:bg-transparent! [&_[data-slot=command-group]]:bg-transparent! [&_[data-slot=command-item]:not([data-selected=true])]:bg-transparent!"
    >
      <Command shouldFilter={true}>
        <CommandInput
          value={query}
          onValueChange={setQuery}
          placeholder="Search parts to add as a component…"
        />
        {query.length > 0 && (
          <CommandList className="max-h-60">
            <CommandEmpty>No matching parts.</CommandEmpty>
            <CommandGroup>
              {VARIANT_SEARCH_OPTIONS.map((o) => {
                const isAlreadyAdded = !!o.partName && excludePartIds.has(
                  mockVariants.find((v) => v.id === o.variantId)?.partId ?? '',
                )
                return (
                  <CommandItem
                    key={o.variantId}
                    value={`${o.partName} ${o.partSku} ${o.variantSku} ${o.brand} ${o.category}`}
                    disabled={isAlreadyAdded}
                    onSelect={() => {
                      if (isAlreadyAdded) return
                      onPick(o.variantId)
                      setQuery('')
                    }}
                  >
                    <div className={cn('flex w-full min-w-0 items-center gap-2', isAlreadyAdded && 'opacity-50')}>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[12.5px] font-medium">{o.partName}</div>
                        <div className="mt-0.5 flex items-center gap-1.5 text-[10.5px] text-muted-foreground">
                          <span className="font-mono">{o.variantSku}</span>
                          <span>·</span>
                          <span>{o.condition}</span>
                          {o.brand && (<><span>·</span><span className="truncate">{o.brand}</span></>)}
                        </div>
                      </div>
                      {isAlreadyAdded && <Check className="size-3.5 shrink-0 text-primary" />}
                    </div>
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        )}
      </Command>
    </div>
  )
}

// ── Main Component ──

function ClosedWonPage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const entityType = (searchParams.get('type') as 'lead' | 'deal' | 'demo' | null) ?? 'deal'
  const isLead = entityType === 'lead'
  const isDemo = entityType === 'demo'

  // Resolve entity
  const deal = entityType === 'deal' ? deals.find((d) => d.id === id) : undefined
  const lead = isLead ? leads.find((l) => l.id === id) : undefined
  const demo = isDemo ? demoRequests.find((d) => d.id === id) : undefined
  const entity = deal ?? lead ?? demo

  const entityName = deal?.name ?? lead?.name ?? demo?.demoNumber ?? ''
  const entityValue = deal?.value ?? lead?.value ?? 0
  const entityCompany = lead?.company ?? demo?.accountName ?? ''
  const existingAccountName = deal?.accountName ?? demo?.accountName ?? ''
  const existingAccountId = deal?.accountId ?? demo?.accountId

  const backPath = isLead
    ? `/crm/leads/${id}`
    : isDemo
      ? `/crm/demo-requests/${id}`
      : `/crm/deals/${id}`
  const goBack = useNavigateBack(backPath)

  const [currentStep, setCurrentStep] = useState(1)

  // Account form state (leads only)
  const [accountName, setAccountName] = useState(entityCompany)
  const [industry, setIndustry] = useState('')
  const [accountType, setAccountType] = useState<string>('')
  const [companySize, setCompanySize] = useState('')
  const [employees, setEmployees] = useState<number | ''>('')
  const [city, setCity] = useState('')
  const [accountOwner, setAccountOwner] = useState('Amit Patel')

  // Contact details — pre-filled from the demo when source is a demo request.
  const initialContactFirst = demo?.contactName?.split(/\s+/)[0] ?? ''
  const initialContactLast = demo ? demo.contactName.split(/\s+/).slice(1).join(' ') : ''
  const [firstName, setFirstName] = useState(initialContactFirst)
  const [lastName, setLastName] = useState(initialContactLast)
  const [contactEmail, setContactEmail] = useState(demo?.contactEmail ?? '')
  const [contactPhone, setContactPhone] = useState(demo?.contactPhone ?? '')
  const [designation, setDesignation] = useState('')
  const [department, setDepartment] = useState('')

  // Document uploads
  const [documents, setDocuments] = useState<DocumentUpload[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadingDocType, setUploadingDocType] = useState('')

  // Sales Order form state — pre-fill from demo line items if applicable.
  const [orderDate, setOrderDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [lineItems, setLineItems] = useState<SOLineItem[]>(() => {
    if (!demo) return []
    return demo.items.map((item) => ({
      id: genId(),
      type: 'ims_part' as const,
      partId: item.partId,
      partName: item.partName,
      partSku: item.partSku,
      brand: item.brand,
      variantType: item.condition,
      category: partCategoryMap.get(item.partId),
      item: item.partName,
      description: `${item.partSku} · ${item.brand} · ${item.condition}`,
      qty: item.qty,
      rate: item.unitPrice ?? 0,
    }))
  })
  const [bomExpanded, setBomExpanded] = useState<Record<string, boolean>>({})
  const [bomComponents, setBomComponents] = useState<Record<string, BOMComponent[]>>({})
  const [notes, setNotes] = useState(demo?.notes ?? '')
  const [categoriesInterested, setCategoriesInterested] = useState<string[]>(
    demo ? Array.from(new Set(demo.items.map((i) => i.category))).filter(Boolean) : [],
  )
  const [dispatchMethod, setDispatchMethod] = useState('')
  const [paymentTerms, setPaymentTerms] = useState('')
  const [orderType, setOrderType] = useState('')
  const [warranty, setWarranty] = useState('')

  // Addresses — aggregate from lead/deal/account + locally added
  const [localAddresses, setLocalAddresses] = useState<AccountAddress[]>([])
  const [addAddressOpen, setAddAddressOpen] = useState(false)
  const [addAddressType, setAddAddressType] = useState<'Billing' | 'Shipping'>('Billing')

  const accountObj = existingAccountId ? accounts.find((a) => a.id === existingAccountId) : undefined
  type TaggedAddress = AccountAddress & { source: string }
  const allAddresses: TaggedAddress[] = (() => {
    const result: TaggedAddress[] = []
    for (const a of accountObj?.addresses ?? []) result.push({ ...a, source: 'Account' })
    for (const a of lead?.addresses ?? []) if (!result.some((r) => r.id === a.id)) result.push({ ...a, source: 'Lead' })
    for (const a of deal?.addresses ?? []) if (!result.some((r) => r.id === a.id)) result.push({ ...a, source: 'Deal' })
    for (const a of localAddresses) if (!result.some((r) => r.id === a.id)) result.push({ ...a, source: 'New' })
    return result
  })()

  const billingAddressPool = allAddresses.filter((a) => a.type === 'Billing')
  const shippingAddressPool = allAddresses.filter((a) => a.type === 'Shipping')

  const [selectedBillingIds, setSelectedBillingIds] = useState<string[]>(
    () => billingAddressPool.filter((a) => a.isDefault).map((a) => a.id)
  )
  const [selectedShippingIds, setSelectedShippingIds] = useState<string[]>(
    () => shippingAddressPool.filter((a) => a.isDefault).map((a) => a.id)
  )
  const [manualBillingAddress, setManualBillingAddress] = useState('')
  // For demo source, the demo already records a shipping address — use it as the default.
  const [manualShippingAddress, setManualShippingAddress] = useState(demo?.shippingAddress ?? '')

  function toggleAddress(id: string, type: 'billing' | 'shipping') {
    const setter = type === 'billing' ? setSelectedBillingIds : setSelectedShippingIds
    setter((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  }

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
    const label = isLead ? 'Lead' : isDemo ? 'Demo request' : 'Deal'
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <h2 className="font-display text-xl font-semibold">{label} not found</h2>
        <Button variant="outline" onClick={goBack}>Go Back</Button>
      </div>
    )
  }

  // Line item CRUD
  function updateLineItem(lineItemId: string, updates: Partial<SOLineItem>) {
    setLineItems((prev) => prev.map((li) => li.id === lineItemId ? { ...li, ...updates } : li))
  }

  function handlePartPickerSelect(result: PartPickerResult) {
    const bom = partsWithBOM.find((b) => b.partId === result.partId)
    const patch: Partial<SOLineItem> = {
      partId: result.partId,
      partName: result.partName,
      partSku: result.partSku,
      brand: result.brand,
      variantType: result.variantType,
      category: result.category,
      bomId: bom?.bomId,
      bomName: bom?.bomName,
      item: result.partName,
      description: `${result.partSku} · ${result.brand} · ${result.variantType}`,
      rate: result.unitPrice,
    }
    if (partPickerTargetId) {
      updateLineItem(partPickerTargetId, patch)
    } else {
      setLineItems((prev) => [
        ...prev,
        { ...createEmptySOItem(), ...patch, type: 'ims_part' as const },
      ])
    }
    setPartPickerTargetId(null)
  }

  function openPartPickerForNew() {
    setPartPickerTargetId(null)
    setPartPickerOpen(true)
  }

  function removeLineItem(lineItemId: string) {
    setLineItems((prev) => prev.filter((li) => li.id !== lineItemId))
    setBomExpanded((prev) => {
      const next = { ...prev }
      delete next[lineItemId]
      return next
    })
    setBomComponents((prev) => {
      const next = { ...prev }
      delete next[lineItemId]
      return next
    })
  }

  function toggleBomExpansion(lineItemId: string) {
    setBomComponents((prev) => {
      if (prev[lineItemId]) return prev
      const line = lineItems.find((li) => li.id === lineItemId)
      const sourceBom = findBOMForPart(line?.partId)
      if (!sourceBom) return prev
      const initial: BOMComponent[] = sourceBom.items.map((item) => ({
        id: `bc-${Date.now()}-${item.id}`,
        partId: item.partId,
        partName: item.partName,
        partSku: item.partSku,
        condition: item.condition,
        qty: item.quantity,
        position: item.position,
        isOptional: item.isOptional,
      }))
      return { ...prev, [lineItemId]: initial }
    })
    setBomExpanded((prev) => ({ ...prev, [lineItemId]: !prev[lineItemId] }))
  }

  function addBomComponentByVariant(lineItemId: string, variantId: string) {
    const variant = mockVariants.find((v) => v.id === variantId)
    if (!variant) return
    const part = mockParts.find((p) => p.id === variant.partId)
    if (!part) return
    const newComp: BOMComponent = {
      id: `bc-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      partId: part.id,
      partName: part.name,
      partSku: part.sku,
      condition: variant.condition,
      qty: 1,
    }
    setBomComponents((prev) => ({
      ...prev,
      [lineItemId]: [...(prev[lineItemId] ?? []), newComp],
    }))
  }

  function updateBomComponent(lineItemId: string, componentId: string, patch: Partial<BOMComponent>) {
    setBomComponents((prev) => ({
      ...prev,
      [lineItemId]: (prev[lineItemId] ?? []).map((c) => c.id === componentId ? { ...c, ...patch } : c),
    }))
  }

  function removeBomComponent(lineItemId: string, componentId: string) {
    setBomComponents((prev) => ({
      ...prev,
      [lineItemId]: (prev[lineItemId] ?? []).filter((c) => c.id !== componentId),
    }))
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

    const validLines = lineItems.filter(
      (li) => (li.item.trim() !== '' || li.partName) && li.qty > 0,
    )
    const soTotal = validLines.reduce((sum, li) => sum + li.qty * li.rate, 0)

    const fmtTotal = new Intl.NumberFormat('en-IN', {
      style: 'currency', currency: 'INR', maximumFractionDigits: 0,
    }).format(soTotal)

    if (isDemo && demo) {
      if (demo.salesOrderId) {
        toast.info('A sales order has already been created for this demo')
        navigate(`/crm/sales-orders/${demo.salesOrderId}`)
        return
      }
      const converted: ConvertedLine[] = validLines.map((li) => ({
        partId: li.partId,
        partName: li.partName ?? li.item,
        partSku: li.partSku,
        brand: li.brand,
        variantSku: li.partSku,
        condition: (li.variantType as ConvertedLine['condition']) ?? 'New',
        qty: li.qty,
        rate: li.rate,
        description: li.description,
      }))
      const dispatchNotes = notes
        ? `${notes}\n— Generated from demo ${demo.demoNumber}`
        : `Generated from demo ${demo.demoNumber}.`
      const { so, po } = persistSOAndPOFromDemo(demo, converted, { dispatchNotes })
      toast.success(`${so.orderNumber} created from ${demo.demoNumber} — ${fmtTotal}`, {
        description: `Back-to-back ${po.poNumber} raised on ${po.vendorName}.`,
        action: {
          label: 'View SO',
          onClick: () => navigate(`/crm/sales-orders/${so.id}`),
        },
      })
      navigate(`/crm/demo-requests/${demo.id}`)
      return
    }

    if (isLead) {
      toast.success(`Lead "${entityName}" closed won — Account & Sales Order created`)
    } else {
      toast.success(`Deal "${entityName}" closed won — ${fmtTotal}`)
    }

    navigate(backPath)
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col">
      {/* ── Top bar (sticky, full-width) ── */}
      <div className="sticky top-0 z-20 border-b border-border bg-card/95 shadow-[0_1px_2px_rgba(16,24,40,0.04)] backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="flex items-center justify-between gap-6 px-6 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={goBack}
              aria-label="Go back"
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-all hover:-translate-y-px hover:border-primary/25 hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ArrowLeft className="size-4" />
            </button>
            <div className="min-w-0">
              <h1 className="truncate text-[15px] font-semibold leading-tight tracking-tight">
                {isDemo ? 'Convert demo to Sales Order' : 'Close Won'} &mdash; {entityName}
              </h1>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {isLead
                  ? 'Create an account and sales order to close this lead.'
                  : isDemo
                    ? `Pricing pre-filled from ${entityName} — back-to-back PO will be raised on the vendor.`
                    : `Create a sales order for ${existingAccountName || 'this deal'}.`}
              </p>
            </div>
          </div>

          {/* Inline step indicator (md+) */}
          <div className="hidden items-center gap-2 md:flex">
            {isLead && (
              <>
                <button
                  type="button"
                  onClick={() => currentStep > 1 && setCurrentStep(1)}
                  className={cn(
                    'flex items-center gap-2 rounded-lg px-3 py-1.5 text-[12.5px] font-medium transition-all',
                    currentStep === 1
                      ? 'bg-primary/10 text-primary ring-1 ring-primary/20'
                      : 'cursor-pointer bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-400',
                  )}
                >
                  <span
                    className={cn(
                      'inline-flex size-5 items-center justify-center rounded-full text-[10px] font-bold',
                      currentStep === 1
                        ? 'bg-primary/15 text-primary'
                        : 'bg-emerald-600/20 text-emerald-700 dark:bg-emerald-400/20 dark:text-emerald-400'
                    )}
                  >
                    {currentStep > 1 ? <Check className="size-3" strokeWidth={3} /> : '1'}
                  </span>
                  Account
                </button>
                <div
                  className={cn(
                    'h-px w-6 transition-colors',
                    currentStep > 1 ? 'bg-emerald-500/50' : 'bg-border',
                  )}
                />
              </>
            )}
            <div
              className={cn(
                'flex items-center gap-2 rounded-lg px-3 py-1.5 text-[12.5px] font-medium transition-all',
                isOnSOStep
                  ? 'bg-primary/10 text-primary ring-1 ring-primary/20'
                  : 'bg-muted text-muted-foreground',
              )}
            >
              <span
                className={cn(
                  'inline-flex size-5 items-center justify-center rounded-full text-[10px] font-bold',
                  isOnSOStep ? 'bg-primary/15 text-primary' : 'bg-card text-muted-foreground'
                )}
              >
                {isLead ? '2' : '1'}
              </span>
              Sales Order
            </div>
          </div>
        </div>
      </div>

      {/* ── Main content (full-width grid) ── */}
      <div className="flex-1 px-6 py-6 pb-28">
        <div className="mx-auto w-full max-w-[1600px]">

          {/* ════ Step 1: Account (leads only) ════ */}
          {isLead && currentStep === 1 && (
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
                        <h3 className="text-[13.5px] font-semibold leading-tight">Account Details</h3>
                        <p className="text-xs text-muted-foreground">Company information for the new account</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-x-5 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
                      <div className="space-y-2 sm:col-span-2 lg:col-span-3">
                        <Label>Account Name <span className="text-destructive">*</span></Label>
                        <Input value={accountName} onChange={(e) => setAccountName(e.target.value)} placeholder="Company name" />
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
                        <h3 className="text-[13.5px] font-semibold leading-tight">Primary Contact</h3>
                        <p className="text-xs text-muted-foreground">Main point of contact at the account</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-x-5 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
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
                  </CardContent>
                </Card>
              </div>

              {/* Right: Documents (sticky) */}
              <div className="xl:col-span-4">
                <div className="xl:sticky xl:top-[5.25rem]">
                  <Card>
                    <CardContent className="p-5">
                      <div className="mb-1 flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-[13.5px] font-semibold leading-tight">Documents</h3>
                          <p className="text-xs text-muted-foreground">PDF, JPG, PNG · up to 20 MB</p>
                        </div>
                        <Badge variant={documents.length ? 'secondary' : 'outline'} className="shrink-0 text-[11px]">
                          {documents.length}/{DOCUMENT_TYPES.length}
                        </Badge>
                      </div>
                      <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleFileSelect} />
                      <div className="mt-4 grid grid-cols-2 gap-3">
                        {DOCUMENT_TYPES.map((docType) => {
                          const uploaded = documents.find((d) => d.type === docType.label)
                          return (
                            <div
                              key={docType.id}
                              className={cn(
                                'rounded-xl border p-3 text-center transition-colors',
                                uploaded
                                  ? 'border-primary/40 bg-primary/5'
                                  : 'border-dashed hover:border-primary/30 hover:bg-muted/30',
                              )}
                            >
                              {uploaded ? (
                                <div className="space-y-1.5">
                                  <FileText className="mx-auto size-5 text-primary" />
                                  <p className="truncate text-[12px] font-medium">{docType.label}</p>
                                  <p className="text-[10px] text-muted-foreground">{formatFileSize(uploaded.size)}</p>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 px-1.5 text-[11px] text-destructive hover:text-destructive"
                                    onClick={() => removeDocument(documents.indexOf(uploaded))}
                                  >
                                    <X className="mr-1 size-3" /> Remove
                                  </Button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  className="w-full space-y-1.5 py-1"
                                  onClick={() => { setUploadingDocType(docType.label); fileInputRef.current?.click() }}
                                >
                                  <Upload className="mx-auto size-5 text-muted-foreground" />
                                  <p className="text-[12px] font-medium">{docType.label}</p>
                                </button>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          )}

          {/* ════ Sales Order step ════ */}
          {isOnSOStep && (
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
              {/* Left: Main form */}
              <div className="space-y-6 xl:col-span-8">
                {/* Order Details */}
                <Card>
                  <CardContent className="p-5">
                    <div className="mb-4 flex items-center gap-2.5">
                      <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
                        <ShoppingCart className="size-4 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-[13.5px] font-semibold leading-tight">Order Details</h3>
                        <p className="text-xs text-muted-foreground">Configure the sales order terms</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-x-5 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
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
                      <div className="mt-4 flex flex-wrap gap-2">
                        {categoriesInterested.map((cat) => (
                          <Badge key={cat} variant="secondary" className="cursor-pointer px-2.5 py-1 text-xs" onClick={() => toggleCategory(cat)}>
                            {cat}<X className="ml-1.5 size-3" />
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Line Items */}
                <Card>
                  <CardContent className="p-5">
                    <div className="mb-4 flex items-center gap-2.5">
                      <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
                        <ClipboardList className="size-4 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-[13.5px] font-semibold leading-tight">Line Items</h3>
                        <p className="text-xs text-muted-foreground">Search and add parts. Servers can expand into their BOM.</p>
                      </div>
                      <Button variant="outline" size="sm" className="h-8 text-xs" onClick={openPartPickerForNew}>
                        <Plus className="mr-1 size-3.5" /> Add Line Item
                      </Button>
                    </div>

                    {lineItems.length === 0 ? (
                      <div className="rounded-lg border border-dashed py-10 text-center">
                        <Package className="mx-auto mb-2 size-6 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">No line items yet</p>
                        <p className="text-xs text-muted-foreground">Click "Add Line Item" to search and add parts.</p>
                      </div>
                    ) : (
                      <div className="overflow-hidden rounded-lg border">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b bg-muted/30 text-[10.5px] uppercase tracking-wide text-muted-foreground">
                              <th className="px-3 py-2 text-left font-medium">Item</th>
                              <th className="w-20 px-3 py-2 text-right font-medium">Qty</th>
                              <th className="w-28 px-3 py-2 text-right font-medium">Rate</th>
                              <th className="w-28 px-3 py-2 text-right font-medium">Total</th>
                              <th className="w-10 px-1 py-2" />
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {lineItems.map((line) => {
                              const category = line.category ?? partCategoryMap.get(line.partId ?? '')
                              const isServer = category === SERVER_CATEGORY
                              const bom = isServer ? findBOMForPart(line.partId) : undefined
                              const expanded = !!bomExpanded[line.id]
                              const lineTotal = line.qty * line.rate
                              return (
                                <Fragment key={line.id}>
                                  <tr>
                                    <td className="px-3 py-2 align-top">
                                      <div className="text-[13px] font-medium leading-tight">{line.partName ?? line.item ?? 'Unnamed item'}</div>
                                      {(line.partSku || line.brand || line.variantType) && (
                                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                                          {line.partSku && <span className="font-mono">{line.partSku}</span>}
                                          {line.brand && <span>· {line.brand}</span>}
                                          {line.variantType && <Badge variant="outline" className="text-[10px]">{line.variantType}</Badge>}
                                          {category && <Badge variant="secondary" className="text-[10px]">{category}</Badge>}
                                        </div>
                                      )}
                                      {bom && (
                                        <button
                                          type="button"
                                          onClick={() => toggleBomExpansion(line.id)}
                                          className="wms-link-btn mt-1.5 inline-flex items-center gap-1 text-[11px]"
                                        >
                                          {expanded ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
                                          <Package className="size-3" />
                                          {expanded ? 'Hide BOM' : 'View BOM'} · {bom.name}
                                          <Badge variant="outline" className="ml-1 text-[10px]">
                                            {(bomComponents[line.id] ?? bom.items).length} component{(bomComponents[line.id] ?? bom.items).length === 1 ? '' : 's'}
                                          </Badge>
                                        </button>
                                      )}
                                    </td>
                                    <td className="px-3 py-2 align-top">
                                      <Input
                                        type="number"
                                        min={0}
                                        value={line.qty}
                                        onChange={(e) => updateLineItem(line.id, { qty: Number(e.target.value) || 0 })}
                                        className="ml-auto h-8 w-16 text-right text-xs"
                                      />
                                    </td>
                                    <td className="px-3 py-2 align-top">
                                      <Input
                                        type="number"
                                        min={0}
                                        value={line.rate}
                                        onChange={(e) => updateLineItem(line.id, { rate: Number(e.target.value) || 0 })}
                                        className="ml-auto h-8 w-24 text-right text-xs"
                                      />
                                    </td>
                                    <td className="px-3 py-2 align-top text-right text-[13px] font-medium tabular-nums">
                                      &#8377;{fmtCurrency(lineTotal)}
                                    </td>
                                    <td className="px-1 py-2 align-top">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="size-8 text-muted-foreground hover:text-destructive"
                                        onClick={() => removeLineItem(line.id)}
                                        aria-label="Remove line item"
                                      >
                                        <X className="size-4" />
                                      </Button>
                                    </td>
                                  </tr>
                                  {expanded && bom && (
                                    <tr>
                                      <td colSpan={5} className="bg-muted/15 p-0">
                                        <div className="border-t px-4 py-3">
                                          <div className="mb-2.5 flex items-center gap-2">
                                            <span className="inline-flex size-6 items-center justify-center rounded-md bg-primary/10 text-primary">
                                              <Package className="size-3" />
                                            </span>
                                            <div className="flex-1">
                                              <div className="text-[12px] font-semibold">{bom.name}</div>
                                              <div className="text-[10.5px] text-muted-foreground">
                                                <span className="font-mono">{bom.bomNumber}</span> · {(bomComponents[line.id] ?? []).length} component{(bomComponents[line.id] ?? []).length === 1 ? '' : 's'}
                                              </div>
                                            </div>
                                          </div>

                                          <div className="mb-2.5">
                                            <BomComponentSearch
                                              excludePartIds={new Set(
                                                (bomComponents[line.id] ?? [])
                                                  .map((c) => c.partId)
                                                  .filter((id): id is string => !!id),
                                              )}
                                              onPick={(variantId) => addBomComponentByVariant(line.id, variantId)}
                                            />
                                          </div>
                                          {(bomComponents[line.id] ?? []).length === 0 ? (
                                            <div className="rounded-md border border-dashed bg-background py-6 text-center">
                                              <Package className="mx-auto mb-1 size-4 text-muted-foreground" />
                                              <p className="text-[11px] text-muted-foreground">No components yet — click "Add Component" to search and add.</p>
                                            </div>
                                          ) : (
                                            <div className="overflow-hidden rounded-md border bg-background">
                                              <table className="w-full text-xs">
                                                <thead>
                                                  <tr className="border-b bg-muted/30 text-[10px] uppercase tracking-wide text-muted-foreground">
                                                    <th className="px-2.5 py-1.5 text-left font-medium">Component</th>
                                                    <th className="w-16 px-2.5 py-1.5 text-right font-medium">Qty</th>
                                                    <th className="px-2.5 py-1.5 text-left font-medium">Position</th>
                                                    <th className="w-9 px-1 py-1.5" />
                                                  </tr>
                                                </thead>
                                                <tbody className="divide-y">
                                                  {(bomComponents[line.id] ?? []).map((c) => (
                                                    <tr key={c.id}>
                                                      <td className="px-2.5 py-1.5">
                                                        <div className="text-[12px] font-medium leading-tight">{c.partName}</div>
                                                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
                                                          {c.partSku && <span className="font-mono">{c.partSku}</span>}
                                                          {c.condition && <Badge variant="outline" className="text-[9px]">{c.condition}</Badge>}
                                                          {c.isOptional && <Badge variant="outline" className="text-[9px]">Optional</Badge>}
                                                        </div>
                                                      </td>
                                                      <td className="px-2.5 py-1.5">
                                                        <Input
                                                          type="number"
                                                          min={0}
                                                          value={c.qty}
                                                          onChange={(e) => updateBomComponent(line.id, c.id, { qty: Number(e.target.value) || 0 })}
                                                          className="ml-auto h-7 w-14 text-right text-[11px]"
                                                        />
                                                      </td>
                                                      <td className="px-2.5 py-1.5 text-[11px] text-muted-foreground">{c.position ?? '—'}</td>
                                                      <td className="px-1 py-1.5">
                                                        <Button
                                                          variant="ghost"
                                                          size="icon"
                                                          className="size-7 text-muted-foreground hover:text-destructive"
                                                          onClick={() => removeBomComponent(line.id, c.id)}
                                                          aria-label="Remove component"
                                                        >
                                                          <X className="size-3.5" />
                                                        </Button>
                                                      </td>
                                                    </tr>
                                                  ))}
                                                </tbody>
                                              </table>
                                            </div>
                                          )}
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </Fragment>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Addresses */}
                <Card>
                  <CardContent className="p-5">
                    <div className="mb-4 flex items-center gap-2.5">
                      <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
                        <MapPin className="size-4 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-[13.5px] font-semibold leading-tight">Addresses</h3>
                        <p className="text-xs text-muted-foreground">Pick billing &amp; shipping addresses</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                      {/* Billing */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-medium">Billing</Label>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => { setAddAddressType('Billing'); setAddAddressOpen(true) }}
                          >
                            <Plus className="mr-1 size-3" /> Add
                          </Button>
                        </div>
                        {billingAddressPool.length > 0 ? (
                          <div className="space-y-2">
                            {billingAddressPool.map((addr) => {
                              const checked = selectedBillingIds.includes(addr.id)
                              return (
                                <label
                                  key={addr.id}
                                  className={cn(
                                    'flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2 transition-colors',
                                    checked ? 'border-primary bg-primary/5' : 'hover:bg-muted/50',
                                  )}
                                >
                                  <input type="checkbox" checked={checked} onChange={() => toggleAddress(addr.id, 'billing')} className="mt-0.5 size-4 accent-primary" />
                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <span className="text-[13px] font-medium">{addr.label}</span>
                                      <Badge variant="outline" className="text-[10px]">{addr.source}</Badge>
                                      {addr.isDefault && <Badge variant="secondary" className="text-[10px]">Default</Badge>}
                                    </div>
                                    <p className="mt-0.5 line-clamp-2 text-[11.5px] text-muted-foreground">
                                      {addr.line1}{addr.line2 ? `, ${addr.line2}` : ''} · {addr.city}, {addr.state} — {addr.pincode}
                                    </p>
                                  </div>
                                </label>
                              )
                            })}
                          </div>
                        ) : (
                          <div className="rounded-lg border border-dashed p-3 text-center">
                            <MapPin className="mx-auto mb-1 size-4 text-muted-foreground" />
                            <p className="text-xs text-muted-foreground">No billing addresses available.</p>
                            <p className="text-xs text-muted-foreground">Click "Add" to create one.</p>
                          </div>
                        )}
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Or enter manually</Label>
                          <Textarea
                            value={manualBillingAddress}
                            onChange={(e) => setManualBillingAddress(e.target.value)}
                            placeholder="Type a billing address…"
                            rows={2}
                            className="resize-none text-sm"
                          />
                        </div>
                      </div>
                      {/* Shipping */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-medium">Shipping</Label>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => { setAddAddressType('Shipping'); setAddAddressOpen(true) }}
                          >
                            <Plus className="mr-1 size-3" /> Add
                          </Button>
                        </div>
                        {shippingAddressPool.length > 0 ? (
                          <div className="space-y-2">
                            {shippingAddressPool.map((addr) => {
                              const checked = selectedShippingIds.includes(addr.id)
                              return (
                                <label
                                  key={addr.id}
                                  className={cn(
                                    'flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2 transition-colors',
                                    checked ? 'border-primary bg-primary/5' : 'hover:bg-muted/50',
                                  )}
                                >
                                  <input type="checkbox" checked={checked} onChange={() => toggleAddress(addr.id, 'shipping')} className="mt-0.5 size-4 accent-primary" />
                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <span className="text-[13px] font-medium">{addr.label}</span>
                                      <Badge variant="outline" className="text-[10px]">{addr.source}</Badge>
                                      {addr.isDefault && <Badge variant="secondary" className="text-[10px]">Default</Badge>}
                                    </div>
                                    <p className="mt-0.5 line-clamp-2 text-[11.5px] text-muted-foreground">
                                      {addr.line1}{addr.line2 ? `, ${addr.line2}` : ''} · {addr.city}, {addr.state} — {addr.pincode}
                                    </p>
                                  </div>
                                </label>
                              )
                            })}
                          </div>
                        ) : (
                          <div className="rounded-lg border border-dashed p-3 text-center">
                            <MapPin className="mx-auto mb-1 size-4 text-muted-foreground" />
                            <p className="text-xs text-muted-foreground">No shipping addresses available.</p>
                            <p className="text-xs text-muted-foreground">Click "Add" to create one.</p>
                          </div>
                        )}
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Or enter manually</Label>
                          <Textarea
                            value={manualShippingAddress}
                            onChange={(e) => setManualShippingAddress(e.target.value)}
                            placeholder="Type a shipping address…"
                            rows={2}
                            className="resize-none text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

              </div>

              {/* Right: Sticky summary rail */}
              <div className="xl:col-span-4">
                <div className="space-y-4 xl:sticky xl:top-[5.25rem]">
                  {/* Account & Deal banner */}
                  <Card>
                    <CardContent className="p-5">
                      <div className="flex items-center gap-3">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                          <Building2 className="size-5 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Account</p>
                          <p className="truncate text-sm font-semibold">{isLead ? (accountName || '—') : existingAccountName || 'N/A'}</p>
                        </div>
                      </div>
                      <Separator className="my-3" />
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">{isDemo ? 'Demo Value' : 'Deal Value'}</p>
                        <p className="text-sm font-semibold">&#8377;{fmtCurrency(entityValue)}</p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Order Summary */}
                  <Card>
                    <CardContent className="p-4">
                      <h4 className="mb-2.5 text-[12.5px] font-semibold">Order Summary</h4>
                      <div className="space-y-1.5 text-[12px]">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Line Items</span>
                          <span className="font-medium tabular-nums">{lineItems.length}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Subtotal</span>
                          <span className="font-medium tabular-nums">&#8377;{fmtCurrency(subtotal)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">GST (18%)</span>
                          <span className="font-medium tabular-nums">&#8377;{fmtCurrency(gst)}</span>
                        </div>
                        <Separator className="my-1.5" />
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">Total</span>
                          <span className="text-[13px] font-bold tabular-nums text-primary">&#8377;{fmtCurrency(grandTotal)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Notes */}
                  <Card>
                    <CardContent className="p-4">
                      <h4 className="mb-2 text-[12.5px] font-semibold">Notes</h4>
                      <Textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Additional notes or special instructions…"
                        rows={3}
                        className="resize-none text-[12px]"
                      />
                    </CardContent>
                  </Card>

                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Sticky bottom action bar ── */}
      <div className="sticky bottom-0 z-10 border-t border-border bg-card/95 px-6 py-3 shadow-[0_-4px_16px_-6px_rgba(16,24,40,0.06),0_-1px_0_rgba(16,24,40,0.04)] backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between gap-4">
          <div className="min-w-0 text-[12.5px]">
            {isLead && currentStep === 1 ? (
              isAccountValid ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 font-medium text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
                  <Check className="size-3.5" /> Account ready — continue to Sales Order.
                </span>
              ) : (
                <span className="text-muted-foreground">Fill required account fields to continue.</span>
              )
            ) : isOnSOStep ? (
              isSOValid ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 font-medium text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
                  <Check className="size-3.5" /> Order ready — total &#8377;{fmtCurrency(grandTotal)}.
                </span>
              ) : (
                <span className="text-muted-foreground">Add at least one line item with quantity &amp; rate.</span>
              )
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={goBack}>Cancel</Button>
            {isLead && isOnSOStep && (
              <Button variant="outline" onClick={() => setCurrentStep(1)}>
                <ArrowLeft className="mr-2 size-4" /> Back
              </Button>
            )}
            {isLead && currentStep === 1 ? (
              <Button onClick={handleNext} className="px-6" disabled={!isAccountValid}>
                Continue to Sales Order &rarr;
              </Button>
            ) : (
              <Button onClick={handleComplete} variant="success" className="px-6" disabled={!isSOValid}>
                <Check className="mr-2 size-4" /> Complete
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Part Number Picker Dialog */}
      <PartPickerDialog
        open={partPickerOpen}
        onOpenChange={setPartPickerOpen}
        onSelect={handlePartPickerSelect}
        title="Select Part Number"
      />

      {/* Add Address Dialog */}
      <AddAddressDialog
        open={addAddressOpen}
        onOpenChange={setAddAddressOpen}
        accountAddresses={accountObj?.addresses}
        existingIds={allAddresses.map((a) => a.id)}
        defaultType={addAddressType}
        onAdd={(addr) => {
          setLocalAddresses((prev) => [...prev, addr])
          toast.success(`Address "${addr.label}" added`)
        }}
      />
    </div>
  )
}

export default ClosedWonPage
