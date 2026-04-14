import { useState, useMemo, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Trash2, Wand2, Plus } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { mockWarehouses } from '../data/warehouses'
import { mockCategories } from '@/modules/ims/data/categories'
import type { InwardType } from '../types'

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

const INWARD_TYPES: { value: InwardType; label: string }[] = [
  { value: 'PURCHASE_ORDER', label: 'Purchase Order' },
  { value: 'RENTAL_RETURN', label: 'Rental Return' },
  { value: 'DEMO_RETURN', label: 'Demo Return' },
  { value: 'INTERNAL_TRANSFER', label: 'Internal Transfer' },
  { value: 'ADVANCE_RETURN', label: 'Advance Return' },
  { value: 'REFURB_PURCHASE', label: 'Refurb Purchase' },
]

const STOCK_VARIANTS = [
  { value: 'New', label: 'New' },
  { value: 'Refurbished', label: 'Refurbished' },
  { value: 'New Pool', label: 'New Pool' },
] as const

const CATEGORIES = mockCategories.map((c) => c.name)
const BRANDS = ['Dell', 'HP', 'Lenovo', 'Apple', 'Cisco', 'Synology', 'Fortinet', 'APC'] as const

const ITEM_CONDITIONS = ['Good', 'Damaged', 'Untested'] as const
type ItemCondition = (typeof ITEM_CONDITIONS)[number]

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface InwardItem {
  id: string
  serialNumber: string
  barcode: string
  model: string
  condition: ItemCondition
  notes: string
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function suggestStockVariant(inwardType: InwardType): string {
  switch (inwardType) {
    case 'PURCHASE_ORDER':
      return 'New'
    case 'REFURB_PURCHASE':
      return 'Refurbished'
    case 'RENTAL_RETURN':
    case 'ADVANCE_RETURN':
      return 'Refurbished'
    case 'DEMO_RETURN':
      return 'New Pool'
    case 'INTERNAL_TRANSFER':
      return 'Refurbished'
    default:
      return 'New'
  }
}

function generateBatchNumber() {
  const num = Math.floor(1000 + Math.random() * 9000)
  return `BATCH-2026-${num}`
}

function generateBarcode(cat: string, br: string): string {
  const catPrefix =
    cat === 'Laptops'
      ? 'L'
      : cat === 'Desktops'
        ? 'D'
        : cat === 'Servers'
          ? 'S'
          : cat.charAt(0).toUpperCase()
  const brandPrefix = br.slice(0, 3).toUpperCase()
  const num = Math.floor(1000 + Math.random() * 9000)
  return `${catPrefix}-${brandPrefix}-${num}`
}

let _itemIdCounter = 0
function createEmptyItem(): InwardItem {
  _itemIdCounter += 1
  return {
    id: `item-${Date.now()}-${_itemIdCounter}`,
    serialNumber: '',
    barcode: '',
    model: '',
    condition: 'Untested',
    notes: '',
  }
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

function InwardFormPage() {
  const navigate = useNavigate()

  /* --- Basic info state --- */
  const [batchNumber] = useState(generateBatchNumber)
  const [inwardType, setInwardType] = useState<InwardType>('PURCHASE_ORDER')
  const [category, setCategory] = useState<string>(CATEGORIES[0] ?? 'Laptops')
  const [subcategory, setSubcategory] = useState<string>('')
  const [brand, setBrand] = useState<string>(BRANDS[0])
  const [notes, setNotes] = useState('')
  const [stockVariant, setStockVariant] = useState<string>('New')

  /* --- Conditional fields --- */
  const [poNumber, setPoNumber] = useState('')
  const [vendorName, setVendorName] = useState('')
  const [sourceName, setSourceName] = useState('')
  const [sourceRef, setSourceRef] = useState('')
  const [sourceDept, setSourceDept] = useState('')

  /* --- Delivery / vehicle details --- */
  const [vehicleNumber, setVehicleNumber] = useState('')
  const [driverName, setDriverName] = useState('')
  const [driverPhone, setDriverPhone] = useState('')
  const [dcNumber, setDcNumber] = useState('')
  const [invoiceRef, setInvoiceRef] = useState('')
  const [receivedDate, setReceivedDate] = useState(
    new Date().toISOString().split('T')[0],
  )
  const [receivedTime, setReceivedTime] = useState(
    new Date().toTimeString().slice(0, 5),
  )

  /* --- Items --- */
  const [items, setItems] = useState<InwardItem[]>([createEmptyItem()])

  /* --- Warehouse & location --- */
  const [warehouseId, setWarehouseId] = useState(mockWarehouses[0]?.id ?? 'wh-001')
  const [rowId, setRowId] = useState('')
  const [rackId, setRackId] = useState('')
  const [binId, setBinId] = useState('')

  /* --- Derived data --- */
  const selectedWarehouse = useMemo(
    () => mockWarehouses.find((w) => w.id === warehouseId),
    [warehouseId],
  )

  const selectedRow = useMemo(
    () => selectedWarehouse?.rows.find((r) => r.id === rowId),
    [selectedWarehouse, rowId],
  )

  const selectedRack = useMemo(
    () => selectedRow?.racks.find((r) => r.id === rackId),
    [selectedRow, rackId],
  )

  const subcategories = useMemo(() => {
    const cat = mockCategories.find((c) => c.name === category)
    if (!cat?.subcategories) return []
    return cat.subcategories.map((s) => s.name)
  }, [category])

  /* --- Handlers --- */
  const handleInwardTypeChange = (val: string | null) => {
    if (!val) return
    const newType = val as InwardType
    setInwardType(newType)
    setStockVariant(suggestStockVariant(newType))
    setPoNumber('')
    setVendorName('')
    setSourceName('')
    setSourceRef('')
    setSourceDept('')
  }

  const handleWarehouseChange = (val: string | null) => {
    if (!val) return
    setWarehouseId(val)
    setRowId('')
    setRackId('')
    setBinId('')
  }

  const handleRowChange = (val: string | null) => {
    if (!val) return
    setRowId(val)
    setRackId('')
    setBinId('')
  }

  const handleRackChange = (val: string | null) => {
    if (!val) return
    setRackId(val)
    setBinId('')
  }

  /* --- Item helpers --- */
  const updateItem = useCallback(
    (id: string, field: keyof InwardItem, value: string) => {
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
      )
    },
    [],
  )

  const removeItem = useCallback((id: string) => {
    setItems((prev) => {
      const next = prev.filter((item) => item.id !== id)
      return next.length === 0 ? [createEmptyItem()] : next
    })
  }, [])

  const addItem = useCallback(() => {
    setItems((prev) => [...prev, createEmptyItem()])
  }, [])

  const addFiveItems = useCallback(() => {
    setItems((prev) => [
      ...prev,
      createEmptyItem(),
      createEmptyItem(),
      createEmptyItem(),
      createEmptyItem(),
      createEmptyItem(),
    ])
  }, [])

  const autogenerateBarcode = useCallback(
    (id: string) => {
      const bc = generateBarcode(category, brand)
      updateItem(id, 'barcode', bc)
    },
    [category, brand, updateItem],
  )

  /* --- Submit --- */
  function handleCreate() {
    const validItems = items.filter((i) => i.serialNumber.trim() !== '')
    if (validItems.length === 0) {
      toast.error('Add at least one item with a serial number')
      return
    }

    toast.success('Batch created successfully', {
      description: `${batchNumber} with ${validItems.length} item${validItems.length > 1 ? 's' : ''}`,
    })
    navigate(`/wms/inward/batch-new/devices`)
  }

  function handleCancel() {
    navigate('/wms/inward')
  }

  const validItemCount = items.filter((i) => i.serialNumber.trim() !== '').length

  /* --- Render --- */
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon-sm" render={<Link to="/wms/inward" />}>
          <ArrowLeft />
        </Button>
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            Create Inward / GRN
          </h1>
          <p className="text-sm text-muted-foreground">
            Create a new inward batch with item-level details
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>New Batch Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* ============================================================ */}
          {/*  Section 1: Basic Info                                       */}
          {/* ============================================================ */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Left column */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="batch-number" className="font-ui">
                  Batch Number
                </Label>
                <Input
                  id="batch-number"
                  value={batchNumber}
                  readOnly
                  className="bg-muted"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="font-ui">
                  Inward Type <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={inwardType}
                  onValueChange={handleInwardTypeChange}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INWARD_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="font-ui">
                  Category <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={category}
                  onValueChange={(val) => {
                    if (val) {
                      setCategory(val)
                      setSubcategory('')
                    }
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {subcategories.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="font-ui">Subcategory</Label>
                  <Select
                    value={subcategory}
                    onValueChange={(val) => {
                      if (val) setSubcategory(val)
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select subcategory..." />
                    </SelectTrigger>
                    <SelectContent>
                      {subcategories.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="font-ui">
                  Stock Variant <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={stockVariant}
                  onValueChange={(val) => {
                    if (val) setStockVariant(val)
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STOCK_VARIANTS.map((v) => (
                      <SelectItem key={v.value} value={v.value}>
                        {v.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Right column */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="font-ui">
                  Brand <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={brand}
                  onValueChange={(val) => {
                    if (val) setBrand(val)
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BRANDS.map((b) => (
                      <SelectItem key={b} value={b}>
                        {b}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Conditional fields based on inward type */}
              {inwardType === 'PURCHASE_ORDER' && (
                <>
                  <div className="space-y-1.5">
                    <Label className="font-ui">PO Number</Label>
                    <Input
                      placeholder="e.g., PO-2026-1001"
                      value={poNumber}
                      onChange={(e) => setPoNumber(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="font-ui">Vendor Name</Label>
                    <Input
                      placeholder="e.g., Dell India Pvt Ltd"
                      value={vendorName}
                      onChange={(e) => setVendorName(e.target.value)}
                    />
                  </div>
                </>
              )}

              {(inwardType === 'RENTAL_RETURN' || inwardType === 'DEMO_RETURN') && (
                <>
                  <div className="space-y-1.5">
                    <Label className="font-ui">
                      {inwardType === 'RENTAL_RETURN' ? 'Customer Name' : 'Source Name'}
                    </Label>
                    <Input
                      placeholder={
                        inwardType === 'RENTAL_RETURN'
                          ? 'e.g., TCS Pune Office'
                          : 'e.g., Infosys Demo'
                      }
                      value={sourceName}
                      onChange={(e) => setSourceName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="font-ui">Reference #</Label>
                    <Input
                      placeholder={
                        inwardType === 'RENTAL_RETURN'
                          ? 'e.g., Rental contract ID'
                          : 'e.g., DEMO-2026-042'
                      }
                      value={sourceRef}
                      onChange={(e) => setSourceRef(e.target.value)}
                    />
                  </div>
                </>
              )}

              {inwardType === 'INTERNAL_TRANSFER' && (
                <div className="space-y-1.5">
                  <Label className="font-ui">Source Department</Label>
                  <Input
                    placeholder="e.g., IT Department"
                    value={sourceDept}
                    onChange={(e) => setSourceDept(e.target.value)}
                  />
                </div>
              )}

              {inwardType === 'ADVANCE_RETURN' && (
                <>
                  <div className="space-y-1.5">
                    <Label className="font-ui">Customer Name</Label>
                    <Input
                      placeholder="e.g., Wipro Ltd"
                      value={sourceName}
                      onChange={(e) => setSourceName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="font-ui">Reference #</Label>
                    <Input
                      placeholder="e.g., ADV-2026-087"
                      value={sourceRef}
                      onChange={(e) => setSourceRef(e.target.value)}
                    />
                  </div>
                </>
              )}

              {inwardType === 'REFURB_PURCHASE' && (
                <div className="space-y-1.5">
                  <Label className="font-ui">Vendor Name</Label>
                  <Input
                    placeholder="e.g., GreenIT Recyclers"
                    value={vendorName}
                    onChange={(e) => setVendorName(e.target.value)}
                  />
                </div>
              )}
            </div>
          </div>

          {/* ============================================================ */}
          {/*  Section 2: Delivery Details                                 */}
          {/* ============================================================ */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Delivery Details</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1.5">
                <Label className="font-ui">Vehicle Number</Label>
                <Input
                  placeholder="e.g., MH-02-AB-1234"
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="font-ui">Driver Name</Label>
                <Input
                  placeholder="e.g., Ramesh Kumar"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="font-ui">Driver Phone</Label>
                <Input
                  placeholder="e.g., 9876543210"
                  value={driverPhone}
                  onChange={(e) => setDriverPhone(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="font-ui">Delivery Challan / DC Number</Label>
                <Input
                  placeholder="e.g., DC-2026-0456"
                  value={dcNumber}
                  onChange={(e) => setDcNumber(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="font-ui">Invoice Reference</Label>
                <Input
                  placeholder="Vendor invoice number (optional)"
                  value={invoiceRef}
                  onChange={(e) => setInvoiceRef(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="font-ui">Received Date</Label>
                  <Input
                    type="date"
                    value={receivedDate}
                    onChange={(e) => setReceivedDate(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-ui">Received Time</Label>
                  <Input
                    type="time"
                    value={receivedTime}
                    onChange={(e) => setReceivedTime(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ============================================================ */}
          {/*  Section 3: Items Table                                      */}
          {/* ============================================================ */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">
                Items{' '}
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  {validItemCount} item{validItemCount !== 1 ? 's' : ''} added
                </span>
              </h3>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={addFiveItems}>
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Add 5 Items
                </Button>
                <Button variant="outline" size="sm" onClick={addItem}>
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Add Item
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground w-10">
                      #
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                      Serial Number <span className="text-destructive">*</span>
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                      Barcode
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                      Model
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground w-32">
                      Condition
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                      Notes
                    </th>
                    <th className="px-3 py-2 text-center font-medium text-muted-foreground w-14">
                      Remove
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={item.id} className="border-b last:border-b-0">
                      <td className="px-3 py-2 text-muted-foreground">{idx + 1}</td>
                      <td className="px-3 py-1.5">
                        <Input
                          className="h-8 text-sm"
                          placeholder="e.g., SN-12345678"
                          value={item.serialNumber}
                          onChange={(e) =>
                            updateItem(item.id, 'serialNumber', e.target.value)
                          }
                        />
                      </td>
                      <td className="px-3 py-1.5">
                        <div className="flex gap-1">
                          <Input
                            className="h-8 text-sm"
                            placeholder="e.g., L-DEL-4521"
                            value={item.barcode}
                            onChange={(e) =>
                              updateItem(item.id, 'barcode', e.target.value)
                            }
                          />
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="h-8 w-8 shrink-0"
                            title="Auto-generate barcode"
                            onClick={() => autogenerateBarcode(item.id)}
                          >
                            <Wand2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                      <td className="px-3 py-1.5">
                        <Input
                          className="h-8 text-sm"
                          placeholder="e.g., Latitude 5540"
                          value={item.model}
                          onChange={(e) =>
                            updateItem(item.id, 'model', e.target.value)
                          }
                        />
                      </td>
                      <td className="px-3 py-1.5">
                        <Select
                          value={item.condition}
                          onValueChange={(val) => {
                            if (val) updateItem(item.id, 'condition', val)
                          }}
                        >
                          <SelectTrigger className="h-8 w-full text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ITEM_CONDITIONS.map((c) => (
                              <SelectItem key={c} value={c}>
                                {c}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-3 py-1.5">
                        <Input
                          className="h-8 text-sm"
                          placeholder="Optional notes"
                          value={item.notes}
                          onChange={(e) =>
                            updateItem(item.id, 'notes', e.target.value)
                          }
                        />
                      </td>
                      <td className="px-3 py-1.5 text-center">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => removeItem(item.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ============================================================ */}
          {/*  Section 4: Warehouse & Location                             */}
          {/* ============================================================ */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Warehouse & Location</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1.5">
                <Label className="font-ui">
                  Warehouse <span className="text-destructive">*</span>
                </Label>
                <Select value={warehouseId} onValueChange={handleWarehouseChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {mockWarehouses.map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.name} ({w.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="font-ui">Row</Label>
                <Select value={rowId} onValueChange={handleRowChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select row..." />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedWarehouse?.rows.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="font-ui">Rack</Label>
                <Select value={rackId} onValueChange={handleRackChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select rack..." />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedRow?.racks.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name} ({r.capacityUsed}% full)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="font-ui">Bin</Label>
                <Select
                  value={binId}
                  onValueChange={(val) => {
                    if (val) setBinId(val)
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select bin..." />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedRack?.bins.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name} ({b.status} - {b.itemCount}/{b.maxItems})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* ============================================================ */}
          {/*  Section 5: Notes                                            */}
          {/* ============================================================ */}
          <div className="space-y-1.5">
            <Label htmlFor="batch-notes" className="font-ui">
              Notes
            </Label>
            <Textarea
              id="batch-notes"
              placeholder="Optional notes about this batch..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </CardContent>
        <CardFooter className="justify-end gap-2">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={validItemCount === 0}>
            Create Batch
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

export { InwardFormPage }
export default InwardFormPage
