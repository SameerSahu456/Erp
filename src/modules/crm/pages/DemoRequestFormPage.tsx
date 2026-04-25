import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronDown,
  ChevronRight,
  Package,
  Package2,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FormPageShell } from '@/components/page'
import { useNavigateBack } from '@/hooks/use-navigate-back'

import { demoRequests } from '../data/demo-requests'
import { accounts } from '../data/accounts'
import { contacts } from '../data/contacts'
import { mockParts } from '@/modules/ims/data/parts'
import { mockPricing } from '@/modules/ims/data/pricing'
import { getDefaultVariantForPart } from '@/modules/ims/data/variants'
import { PM_CATEGORIES } from '@/modules/procurement/pm-approvals-shared'
import type { DemoRequest, DemoRequestItem } from '../types'

interface BomComponentDraft {
  id: string
  partId: string
  partName: string
  partSku: string
  brand: string
  category: string
  qty: number
  unitPrice: number
}

interface DraftLine {
  id: string
  partId: string
  partName: string
  partSku: string
  brand: string
  category: string
  subcategory?: string
  qty: number
  unitPrice: number
  isServer: boolean
  bomExpanded: boolean
  bomComponents: BomComponentDraft[]
}

function genId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function isServerPart(partId: string): boolean {
  const part = mockParts.find((p) => p.id === partId)
  if (!part) return false
  // Servers are full machines (no hardwareType — those are sub-components like CPU/RAM)
  // and live under a "Server" subcategory ("Rack Servers", "Tower Servers", ...).
  if (part.hardwareType) return false
  return (part.subcategoryName ?? '').toLowerCase().includes('server')
}

function lookupSeedPrice(partId: string): number {
  const entry = mockPricing.find((p) => p.partId === partId && p.variant === 'new' && !p.tag)
    ?? mockPricing.find((p) => p.partId === partId && p.variant === 'new')
    ?? mockPricing.find((p) => p.partId === partId)
  return entry?.sellPrice ?? 0
}

function pickPMForCategory(category: string): { name: string; email: string } {
  for (const [pm, cats] of Object.entries(PM_CATEGORIES)) {
    if (cats.includes(category)) {
      return { name: pm, email: `${pm.split(' ')[0]?.toLowerCase()}@comprinttech.com` }
    }
  }
  return { name: 'Vikram Singh', email: 'vikram@comprinttech.com' }
}

function nextDemoNumber(): string {
  const year = new Date().getFullYear()
  const prefix = `DEMO-${year}-`
  const used = demoRequests
    .map((d) => d.demoNumber)
    .filter((n) => n.startsWith(prefix))
    .map((n) => Number(n.slice(prefix.length)))
    .filter((n) => Number.isFinite(n))
  const next = (used.length > 0 ? Math.max(...used) : 0) + 1
  return `${prefix}${String(next).padStart(3, '0')}`
}

function formatAddressLine(addr: { line1: string; line2?: string; city: string; state: string; pincode: string }): string {
  return [addr.line1, addr.line2, addr.city, addr.state, addr.pincode].filter(Boolean).join(', ')
}

function DemoRequestFormPage() {
  const navigate = useNavigate()
  const goBack = useNavigateBack('/crm/demo-requests')

  const [demoNumber] = useState(nextDemoNumber)
  const [accountId, setAccountId] = useState('')
  const [contactId, setContactId] = useState('')
  const [contactName, setContactName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [shippingAddress, setShippingAddress] = useState('')
  const [expectedReturnDate, setExpectedReturnDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 14)
    return d.toISOString().slice(0, 10)
  })
  const [requestedBy, setRequestedBy] = useState('Sneha Desai')
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<DraftLine[]>([])

  // Item search state (top-level adder)
  const [partSearch, setPartSearch] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const searchBoxRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (!searchBoxRef.current) return
      if (!searchBoxRef.current.contains(e.target as Node)) {
        setSearchOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const selectedAccount = useMemo(() => accounts.find((a) => a.id === accountId), [accountId])
  const accountContacts = useMemo(
    () => contacts.filter((c) => c.accountId === accountId || c.accountIds?.includes(accountId)),
    [accountId],
  )
  const accountAddresses = useMemo(
    () => (selectedAccount?.addresses ?? []).filter((a) => a.type === 'Shipping'),
    [selectedAccount],
  )

  const partResults = useMemo(() => {
    const q = partSearch.trim().toLowerCase()
    if (!q) {
      return mockParts.filter((p) => p.isActive).slice(0, 8)
    }
    return mockParts
      .filter((p) => p.isActive)
      .filter((p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.categoryName.toLowerCase().includes(q) ||
        (p.aliases ?? []).some((a) => a.toLowerCase().includes(q)),
      )
      .slice(0, 12)
  }, [partSearch])

  function handleAccountChange(id: string) {
    setAccountId(id)
    const acc = accounts.find((a) => a.id === id)
    const primaryContact = contacts.find((c) => c.accountId === id || c.accountIds?.includes(id))
    if (primaryContact) {
      setContactId(primaryContact.id)
      setContactName(primaryContact.name)
      setContactPhone(primaryContact.phone)
      setContactEmail(primaryContact.email)
    } else {
      setContactId('')
      setContactName('')
      setContactPhone('')
      setContactEmail('')
    }
    const defaultShipping = acc?.addresses?.find((a) => a.type === 'Shipping' && a.isDefault)
      ?? acc?.addresses?.find((a) => a.type === 'Shipping')
    setShippingAddress(defaultShipping ? formatAddressLine(defaultShipping) : '')
  }

  function handleContactChange(id: string) {
    setContactId(id)
    const c = contacts.find((x) => x.id === id)
    if (c) {
      setContactName(c.name)
      setContactPhone(c.phone)
      setContactEmail(c.email)
    }
  }

  function handleShippingPick(addrId: string) {
    const addr = selectedAccount?.addresses?.find((a) => a.id === addrId)
    if (addr) setShippingAddress(formatAddressLine(addr))
  }

  function addPart(partId: string) {
    const part = mockParts.find((p) => p.id === partId)
    if (!part) return
    setLines((prev) => {
      const existing = prev.find((l) => l.partId === partId)
      if (existing) {
        return prev.map((l) => (l.id === existing.id ? { ...l, qty: l.qty + 1 } : l))
      }
      return [
        ...prev,
        {
          id: genId('DRI'),
          partId: part.id,
          partName: part.name,
          partSku: part.sku,
          brand: part.brand,
          category: part.categoryName,
          subcategory: part.subcategoryName,
          qty: 1,
          unitPrice: 0,
          isServer: isServerPart(part.id),
          bomExpanded: false,
          bomComponents: [],
        },
      ]
    })
    setPartSearch('')
    setSearchOpen(false)
  }

  function updateLine(id: string, patch: Partial<DraftLine>) {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)))
  }

  function removeLine(id: string) {
    setLines((prev) => prev.filter((l) => l.id !== id))
  }

  function toggleBom(id: string) {
    setLines((prev) =>
      prev.map((l) => (l.id === id ? { ...l, bomExpanded: !l.bomExpanded } : l)),
    )
  }

  function addBomComponent(lineId: string, partId: string) {
    const part = mockParts.find((p) => p.id === partId)
    if (!part) return
    setLines((prev) =>
      prev.map((l) => {
        if (l.id !== lineId) return l
        const existing = l.bomComponents.find((c) => c.partId === partId)
        if (existing) {
          return {
            ...l,
            bomComponents: l.bomComponents.map((c) =>
              c.id === existing.id ? { ...c, qty: c.qty + 1 } : c,
            ),
          }
        }
        return {
          ...l,
          bomComponents: [
            ...l.bomComponents,
            {
              id: genId('DRC'),
              partId: part.id,
              partName: part.name,
              partSku: part.sku,
              brand: part.brand,
              category: part.categoryName,
              qty: 1,
              unitPrice: 0,
            },
          ],
        }
      }),
    )
  }

  function updateBomComponent(lineId: string, componentId: string, patch: Partial<BomComponentDraft>) {
    setLines((prev) =>
      prev.map((l) =>
        l.id !== lineId
          ? l
          : {
              ...l,
              bomComponents: l.bomComponents.map((c) =>
                c.id === componentId ? { ...c, ...patch } : c,
              ),
            },
      ),
    )
  }

  function removeBomComponent(lineId: string, componentId: string) {
    setLines((prev) =>
      prev.map((l) =>
        l.id !== lineId
          ? l
          : { ...l, bomComponents: l.bomComponents.filter((c) => c.id !== componentId) },
      ),
    )
  }

  const totalQty = lines.reduce((s, l) => {
    const lineQty = Number.isFinite(l.qty) ? l.qty : 0
    const compQty = l.bomComponents.reduce(
      (cs, c) => cs + (Number.isFinite(c.qty) ? c.qty : 0),
      0,
    )
    return s + lineQty + compQty
  }, 0)
  const totalAmount = lines.reduce((s, l) => {
    const lineAmt =
      (Number.isFinite(l.qty) ? l.qty : 0) *
      (Number.isFinite(l.unitPrice) ? l.unitPrice : 0)
    const compAmt = l.bomComponents.reduce(
      (cs, c) =>
        cs +
        (Number.isFinite(c.qty) ? c.qty : 0) *
          (Number.isFinite(c.unitPrice) ? c.unitPrice : 0),
      0,
    )
    return s + lineAmt + compAmt
  }, 0)

  function buildItems(): DemoRequestItem[] {
    const out: DemoRequestItem[] = []
    let lineNo = 0
    for (const l of lines) {
      if (!l.partId || l.qty <= 0) continue
      lineNo += 1
      const variant = getDefaultVariantForPart(l.partId)
      const unitPrice = Math.max(0, l.unitPrice)
      out.push({
        id: `${demoNumber}-L${String(lineNo).padStart(2, '0')}`,
        variantId: variant?.id ?? 'VAR-UNKNOWN',
        condition: variant?.condition ?? 'New',
        variantSku: variant?.variantSku ?? l.partSku,
        partId: l.partId,
        partName: l.partName,
        partSku: l.partSku,
        category: l.category,
        brand: l.brand,
        qty: l.qty,
        unitPrice,
        amount: unitPrice * l.qty,
      })
      // Emit BOM components as additional line items, tagged so the parent is
      // still recognisable downstream.
      l.bomComponents
        .filter((c) => c.partId && c.qty > 0)
        .forEach((c, ci) => {
          const cVariant = getDefaultVariantForPart(c.partId)
          const cUnitPrice = Math.max(0, c.unitPrice)
          out.push({
            id: `${demoNumber}-L${String(lineNo).padStart(2, '0')}-C${String(ci + 1).padStart(2, '0')}`,
            variantId: cVariant?.id ?? 'VAR-UNKNOWN',
            condition: cVariant?.condition ?? 'New',
            variantSku: cVariant?.variantSku ?? c.partSku,
            partId: c.partId,
            partName: c.partName,
            partSku: c.partSku,
            category: c.category,
            brand: c.brand,
            qty: c.qty,
            unitPrice: cUnitPrice,
            amount: cUnitPrice * c.qty,
          })
        })
    }
    return out
  }

  function handleSubmit() {
    if (!accountId) {
      toast.error('Select an account')
      return
    }
    if (!contactName || !contactPhone || !contactEmail) {
      toast.error('Contact name, phone, and email are required')
      return
    }
    if (!shippingAddress.trim()) {
      toast.error('Shipping address is required')
      return
    }
    if (!expectedReturnDate) {
      toast.error('Expected return date is required')
      return
    }
    const items = buildItems()
    if (items.length === 0) {
      toast.error('Add at least one demo item')
      return
    }

    const account = selectedAccount!
    const firstCategory = items[0]?.category ?? ''
    const pm = pickPMForCategory(firstCategory)

    const newDemo: DemoRequest = {
      id: demoNumber,
      demoNumber,
      accountId: account.id,
      accountName: account.name,
      contactName,
      contactPhone,
      contactEmail,
      items,
      status: 'Pending PM Approval',
      productManager: pm.name,
      productManagerEmail: pm.email,
      shippingAddress,
      expectedReturnDate,
      isOverdue: false,
      requestedBy,
      createdAt: new Date().toISOString(),
      notes: notes || undefined,
    }

    demoRequests.push(newDemo)
    toast.success(`${demoNumber} created — pending PM approval`)
    navigate(`/crm/demo-requests/${newDemo.id}`)
  }

  const SALES_OWNERS = ['Sneha Desai', 'Amit Patel', 'Rahul Verma'] as const

  const canSave =
    Boolean(accountId) &&
    Boolean(contactName.trim()) &&
    Boolean(contactPhone.trim()) &&
    Boolean(contactEmail.trim()) &&
    Boolean(shippingAddress.trim()) &&
    Boolean(expectedReturnDate) &&
    lines.length > 0

  return (
    <FormPageShell
      title="New Demo Request"
      subtitle="Customer, demo items, and logistics — submit for PM approval."
      breadcrumbs={[
        { label: 'CRM' },
        { label: 'Demo Requests', href: '/crm/demo-requests' },
        { label: 'New Demo Request' },
      ]}
      backHref="/crm/demo-requests"
      badges={
        <span className="inline-flex items-center rounded-md border border-border bg-muted/40 px-2 py-0.5 font-mono text-[12px] text-muted-foreground">
          {demoNumber}
        </span>
      }
      onSave={handleSubmit}
      onCancel={goBack}
      saveLabel="Submit for PM Approval"
      canSave={canSave}
      footerLeft={
        canSave ? (
          <span>
            {totalQty} unit{totalQty === 1 ? '' : 's'} ·{' '}
            <span className="font-medium tabular-nums text-foreground">
              ₹{totalAmount.toLocaleString('en-IN')}
            </span>
          </span>
        ) : (
          <span className="text-destructive/80">
            Account, contact, shipping address, return date, and at least one item are required.
          </span>
        )
      }
    >
      <form
        id="demo-request-form"
        onSubmit={(e) => {
          e.preventDefault()
          handleSubmit()
        }}
        className="flex flex-col gap-5"
      >
      {/* Customer */}
      <Card>
        <CardHeader className="border-b">
          <div>
            <CardTitle>Customer</CardTitle>
            <CardDescription>
              Account, contact, and shipping address for the demo unit.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-1.5">
              <Label htmlFor="account">Account</Label>
              <Select value={accountId} onValueChange={(v) => v && handleAccountChange(v)}>
                <SelectTrigger id="account" className="w-full">
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contact">Contact</Label>
              <Select
                value={contactId}
                onValueChange={(v) => v && handleContactChange(v)}
                disabled={!accountId || accountContacts.length === 0}
              >
                <SelectTrigger id="contact" className="w-full">
                  <SelectValue placeholder={accountId ? 'Select contact' : 'Pick an account first'} />
                </SelectTrigger>
                <SelectContent>
                  {accountContacts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} — {c.designation}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contactName">Contact name</Label>
              <Input
                id="contactName"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Full name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contactPhone">Contact phone</Label>
              <Input
                id="contactPhone"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+91 ..."
              />
            </div>
            <div className="space-y-1.5 md:col-span-2 xl:col-span-2">
              <Label htmlFor="contactEmail">Contact email</Label>
              <Input
                id="contactEmail"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="name@company.com"
              />
            </div>
            {accountAddresses.length > 0 && (
              <div className="space-y-1.5 md:col-span-2 xl:col-span-2">
                <Label>Saved shipping addresses</Label>
                <Select onValueChange={(v) => { if (typeof v === 'string') handleShippingPick(v) }}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Pick a saved shipping address" />
                  </SelectTrigger>
                  <SelectContent>
                    {accountAddresses.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.label} — {a.city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5 md:col-span-2 xl:col-span-4">
              <Label htmlFor="shipping">Shipping address</Label>
              <Textarea
                id="shipping"
                value={shippingAddress}
                onChange={(e) => setShippingAddress(e.target.value)}
                rows={2}
                placeholder="Site address where the demo unit should be delivered"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Items */}
      <Card>
        <CardHeader className="border-b">
          <div>
            <CardTitle>Demo items</CardTitle>
            <CardDescription>
              Search a part and add it as a line. Enter quantity and unit price manually for each line.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pb-4">
          {/* Search bar */}
          <div ref={searchBoxRef} className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={partSearch}
              onChange={(e) => {
                setPartSearch(e.target.value)
                setSearchOpen(true)
              }}
              onFocus={() => setSearchOpen(true)}
              placeholder="Search parts by name, Part no, brand, or category..."
              className="pl-9 pr-9"
              autoComplete="off"
            />
            {partSearch && (
              <button
                type="button"
                onClick={() => setPartSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="size-3.5" />
              </button>
            )}

            {searchOpen && (
              <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-80 overflow-y-auto rounded-md border bg-popover shadow-lg">
                {partResults.length === 0 ? (
                  <p className="px-3 py-4 text-center text-xs text-muted-foreground">
                    No parts match &ldquo;{partSearch}&rdquo;.
                  </p>
                ) : (
                  <ul className="divide-y">
                    {partResults.map((p) => {
                      const seed = lookupSeedPrice(p.id)
                      const alreadyAdded = lines.some((l) => l.partId === p.id)
                      return (
                        <li key={p.id}>
                          <button
                            type="button"
                            onClick={() => addPart(p.id)}
                            className="flex w-full items-start gap-3 px-3 py-2.5 text-left hover:bg-muted/60"
                          >
                            <Package className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="truncate text-sm font-medium">{p.name}</span>
                                {alreadyAdded && (
                                  <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                                    +1 qty
                                  </span>
                                )}
                              </div>
                              <div className="mt-0.5 truncate text-xs text-muted-foreground">
                                {p.sku} · {p.brand} · {p.categoryName}
                              </div>
                            </div>
                            {seed > 0 && (
                              <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                                ₹{seed.toLocaleString('en-IN')}
                              </span>
                            )}
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* Lines */}
          {lines.length === 0 ? (
            <div className="rounded-md border border-dashed bg-muted/20 px-4 py-8 text-center">
              <Package className="mx-auto size-6 text-muted-foreground/60" />
              <p className="mt-2 text-sm text-muted-foreground">No items yet</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Use the search above to add a part.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Part</th>
                    <th className="w-24 px-3 py-2 text-right font-medium">Qty</th>
                    <th className="w-36 px-3 py-2 text-right font-medium">Unit price (₹)</th>
                    <th className="w-32 px-3 py-2 text-right font-medium">Amount</th>
                    <th className="w-10 px-2 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {lines.map((line) => (
                    <LineRow
                      key={line.id}
                      line={line}
                      onChangeLine={(patch) => updateLine(line.id, patch)}
                      onRemoveLine={() => removeLine(line.id)}
                      onToggleBom={() => toggleBom(line.id)}
                      onAddBomComponent={(partId) => addBomComponent(line.id, partId)}
                      onUpdateBomComponent={(componentId, patch) =>
                        updateBomComponent(line.id, componentId, patch)
                      }
                      onRemoveBomComponent={(componentId) =>
                        removeBomComponent(line.id, componentId)
                      }
                    />
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t bg-muted/30">
                    <td className="px-3 py-2 text-xs text-muted-foreground" colSpan={2}>
                      {totalQty} unit{totalQty === 1 ? '' : 's'} across {lines.length} line
                      {lines.length === 1 ? '' : 's'}
                    </td>
                    <td className="px-3 py-2 text-right text-xs text-muted-foreground">Total</td>
                    <td className="px-3 py-2 text-right font-semibold tabular-nums">
                      ₹{totalAmount.toLocaleString('en-IN')}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Logistics */}
      <Card>
        <CardHeader className="border-b">
          <div>
            <CardTitle>Logistics</CardTitle>
            <CardDescription>
              Return date, owner, and any context that helps the PM approve quickly.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="returnDate">Expected return date</Label>
              <Input
                id="returnDate"
                type="date"
                value={expectedReturnDate}
                onChange={(e) => setExpectedReturnDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="requestedBy">Requested by</Label>
              <Select value={requestedBy} onValueChange={(v) => v && setRequestedBy(v)}>
                <SelectTrigger id="requestedBy" className="w-full">
                  <SelectValue placeholder="Select owner" />
                </SelectTrigger>
                <SelectContent>
                  {SALES_OWNERS.map((o) => (
                    <SelectItem key={o} value={o}>{o}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 md:col-span-2 xl:col-span-3">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Context for PM (e.g., why this demo, customer history, urgency)"
              />
            </div>
          </div>
        </CardContent>
      </Card>
      </form>
    </FormPageShell>
  )
}

function LineRow({
  line,
  onChangeLine,
  onRemoveLine,
  onToggleBom,
  onAddBomComponent,
  onUpdateBomComponent,
  onRemoveBomComponent,
}: {
  line: DraftLine
  onChangeLine: (patch: Partial<DraftLine>) => void
  onRemoveLine: () => void
  onToggleBom: () => void
  onAddBomComponent: (partId: string) => void
  onUpdateBomComponent: (componentId: string, patch: Partial<BomComponentDraft>) => void
  onRemoveBomComponent: (componentId: string) => void
}) {
  const componentCount = line.bomComponents.length
  return (
    <>
      <tr className="align-middle">
        <td className="px-3 py-2">
          <div className="font-medium">{line.partName}</div>
          <div className="text-xs text-muted-foreground">
            {line.partSku} · {line.brand} · {line.subcategory ?? line.category}
          </div>
          {line.isServer && (
            <button
              type="button"
              onClick={onToggleBom}
              className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
            >
              {line.bomExpanded ? (
                <ChevronDown className="size-3" />
              ) : (
                <ChevronRight className="size-3" />
              )}
              <Package2 className="size-3" />
              {line.bomExpanded ? 'Hide BOM' : 'View BOM'}
              {componentCount > 0 && (
                <span className="ml-1 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] tabular-nums text-primary">
                  {componentCount} component{componentCount === 1 ? '' : 's'}
                </span>
              )}
            </button>
          )}
        </td>
        <td className="px-3 py-2 text-right">
          <Input
            type="number"
            min={1}
            value={line.qty}
            onChange={(e) => onChangeLine({ qty: Math.max(1, Number(e.target.value) || 0) })}
            className="h-8 text-right"
          />
        </td>
        <td className="px-3 py-2 text-right">
          <Input
            type="number"
            min={0}
            step="0.01"
            value={line.unitPrice}
            onChange={(e) =>
              onChangeLine({ unitPrice: Math.max(0, Number(e.target.value) || 0) })
            }
            className="h-8 text-right"
          />
        </td>
        <td className="px-3 py-2 text-right tabular-nums">
          ₹{(line.qty * line.unitPrice).toLocaleString('en-IN')}
        </td>
        <td className="px-2 py-2 text-right">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onRemoveLine}
            aria-label="Remove line"
            className="size-8"
          >
            <Trash2 className="size-4" />
          </Button>
        </td>
      </tr>
      {line.isServer && line.bomExpanded && (
        <tr>
          <td colSpan={5} className="bg-muted/20 p-0">
            <div className="space-y-3 px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="inline-flex size-6 items-center justify-center rounded bg-primary/10 text-primary">
                  <Package2 className="size-3.5" />
                </span>
                <div>
                  <div className="text-xs font-semibold">BOM components</div>
                  <div className="text-[11px] text-muted-foreground">
                    Search and add the components fitted into this server. Qty and price are manual.
                  </div>
                </div>
              </div>

              <BomSearchAndAdd
                excludePartIds={new Set(line.bomComponents.map((c) => c.partId))}
                onPick={onAddBomComponent}
              />

              {line.bomComponents.length > 0 && (
                <div className="overflow-hidden rounded-md border bg-background">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/40 text-[10px] uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <th className="px-3 py-1.5 text-left font-medium">Component</th>
                        <th className="w-20 px-3 py-1.5 text-right font-medium">Qty</th>
                        <th className="w-32 px-3 py-1.5 text-right font-medium">Unit price (₹)</th>
                        <th className="w-28 px-3 py-1.5 text-right font-medium">Amount</th>
                        <th className="w-8 px-2 py-1.5" />
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {line.bomComponents.map((c) => (
                        <tr key={c.id} className="align-middle">
                          <td className="px-3 py-1.5">
                            <div className="font-medium">{c.partName}</div>
                            <div className="text-[10px] text-muted-foreground">
                              {c.partSku} · {c.brand}
                            </div>
                          </td>
                          <td className="px-3 py-1.5 text-right">
                            <Input
                              type="number"
                              min={1}
                              value={c.qty}
                              onChange={(e) =>
                                onUpdateBomComponent(c.id, {
                                  qty: Math.max(1, Number(e.target.value) || 0),
                                })
                              }
                              className="h-7 text-right"
                            />
                          </td>
                          <td className="px-3 py-1.5 text-right">
                            <Input
                              type="number"
                              min={0}
                              step="0.01"
                              value={c.unitPrice}
                              onChange={(e) =>
                                onUpdateBomComponent(c.id, {
                                  unitPrice: Math.max(0, Number(e.target.value) || 0),
                                })
                              }
                              className="h-7 text-right"
                            />
                          </td>
                          <td className="px-3 py-1.5 text-right tabular-nums">
                            ₹{(c.qty * c.unitPrice).toLocaleString('en-IN')}
                          </td>
                          <td className="px-2 py-1.5 text-right">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => onRemoveBomComponent(c.id)}
                              aria-label="Remove component"
                              className="size-7"
                            >
                              <Trash2 className="size-3.5" />
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
    </>
  )
}

function BomSearchAndAdd({
  excludePartIds,
  onPick,
}: {
  excludePartIds: Set<string>
  onPick: (partId: string) => void
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (!wrapRef.current) return
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    const pool = mockParts.filter((p) => p.isActive)
    if (!q) return pool.slice(0, 8)
    return pool
      .filter((p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.categoryName.toLowerCase().includes(q) ||
        (p.aliases ?? []).some((a) => a.toLowerCase().includes(q)),
      )
      .slice(0, 12)
  }, [query])

  return (
    <div ref={wrapRef} className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        placeholder="Search components (CPU, RAM, SSD, NIC, ...)"
        className="h-8 pl-8 pr-8 text-xs"
        autoComplete="off"
      />
      {query && (
        <button
          type="button"
          onClick={() => setQuery('')}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
          aria-label="Clear search"
        >
          <X className="size-3" />
        </button>
      )}
      {open && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-72 overflow-y-auto rounded-md border bg-popover shadow-lg">
          {results.length === 0 ? (
            <p className="px-3 py-3 text-center text-[11px] text-muted-foreground">
              No parts match &ldquo;{query}&rdquo;.
            </p>
          ) : (
            <ul className="divide-y">
              {results.map((p) => {
                const already = excludePartIds.has(p.id)
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onPick(p.id)
                        setQuery('')
                        setOpen(false)
                      }}
                      className="flex w-full items-start gap-2 px-3 py-2 text-left text-xs hover:bg-muted/60"
                    >
                      <Package className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate font-medium">{p.name}</span>
                          {already && (
                            <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                              +1 qty
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 truncate text-[10px] text-muted-foreground">
                          {p.sku} · {p.brand} · {p.categoryName}
                          {p.hardwareType ? ` · ${p.hardwareType}` : ''}
                        </div>
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

export { DemoRequestFormPage }
export default DemoRequestFormPage
