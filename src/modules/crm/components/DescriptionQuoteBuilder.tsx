import { useState } from 'react'
import { Plus, Trash2, Download, Check, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { IMS_CATEGORIES } from '../types'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface DescLine {
  uid: string
  item: string
  description: string
  category: string
  qty: number
  rate: number
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

let _uid = 0
function uid(): string {
  return `dq-${++_uid}-${Date.now().toString(36)}`
}

function emptyLine(): DescLine {
  return { uid: uid(), item: '', description: '', category: '', qty: 1, rate: 0 }
}

function fmtINR(v: number): string {
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(2)} Cr`
  if (v >= 100000) return `₹${(v / 100000).toFixed(2)} L`
  return `₹${v.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function formatCurrency(value: number): string {
  return value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface DescriptionQuoteBuilderProps {
  leadId?: string
  leadName?: string
  dealId?: string
  dealName?: string
  accountId?: string
  accountName?: string
  compact?: boolean
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export function DescriptionQuoteBuilder({
  leadId,
  leadName,
  dealId,
  dealName,
  accountId,
  accountName,
  compact = false,
}: DescriptionQuoteBuilderProps) {
  const [quoteNumber] = useState(() => `QT-2026-${String(Math.floor(Math.random() * 9000) + 1000)}`)
  const customerDisplay = accountName || dealName || leadName || '—'
  const [lines, setLines] = useState<DescLine[]>([emptyLine()])
  const [discountPct, setDiscountPct] = useState(5)
  const [searchQuery, setSearchQuery] = useState('')

  /* ---- mutations ---- */

  function updateLine(lineUid: string, patch: Partial<DescLine>) {
    setLines((prev) => prev.map((l) => (l.uid === lineUid ? { ...l, ...patch } : l)))
  }

  function addLine() {
    setLines((prev) => [...prev, emptyLine()])
  }

  function removeLine(lineUid: string) {
    setLines((prev) => {
      if (prev.length <= 1) return prev
      return prev.filter((l) => l.uid !== lineUid)
    })
  }

  /* ---- calculations ---- */

  const subtotal = lines.reduce((s, l) => s + l.qty * l.rate, 0)
  const discount = subtotal * discountPct / 100
  const afterDisc = subtotal - discount
  const gst = afterDisc * 0.18
  const grandTotal = afterDisc + gst

  const lineCount = lines.filter((l) => l.item.trim() !== '').length

  /* ---- filtered lines for search ---- */
  const filteredLines = searchQuery
    ? lines.filter(
        (l) =>
          l.item.toLowerCase().includes(searchQuery.toLowerCase()) ||
          l.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          l.category.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : lines

  /* ---------------------------------------------------------------- */
  /*  RENDER                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div className="space-y-4">
      {/* ---- Top info bar (hidden in compact mode) ---- */}
      {!compact && (
        <div className="flex items-center justify-between rounded-xl border bg-accent/40 px-5 py-3.5">
          <div>
            <div className="flex items-center gap-2 text-[13.5px] font-semibold">
              <span>{quoteNumber}</span>
              <span className="text-muted-foreground font-normal">·</span>
              <span>{customerDisplay}</span>
              {leadId && <span className="cond-badge new" style={{ fontSize: 9 }}>Lead</span>}
              {dealId && <span className="cond-badge new" style={{ fontSize: 9 }}>Deal</span>}
            </div>
            <div className="cpt-muted text-[12px] mt-1">
              Draft · {lineCount} line items · Valid until May 20, 2026
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Download className="size-3.5" data-icon="inline-start" />
              Export PDF
            </Button>
            <Button size="sm">
              <Check className="size-3.5" data-icon="inline-start" />
              Submit for approval
            </Button>
          </div>
        </div>
      )}

      {/* ---- Split layout ---- */}
      <div className={compact ? 'space-y-4' : 'grid grid-cols-[1fr_340px] gap-5 items-start'}>
        {/* ---- LEFT: Line Items Table ---- */}
        <div className="cpt-table-wrap rounded-lg border border-[var(--border,#E4E7EC)] bg-[var(--card,#fff)]">
          <div className="cpt-card-header">
            <div>
              <div className="cpt-card-title">Line Items</div>
              <div className="cpt-card-sub">
                Add items with description, category, quantity and rate
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <input
                  className="rounded-md border border-[var(--border,#E4E7EC)] bg-transparent py-1.5 pl-8 pr-3 text-[12.5px] outline-none focus:border-[var(--primary,#0F1B2D)] w-48"
                  placeholder="Search items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button size="sm" onClick={addLine}>
                <Plus className="size-3.5" data-icon="inline-start" />
                Add item
              </Button>
            </div>
          </div>

          <table className="cpt-tbl" style={{ tableLayout: 'auto' }}>
            <thead>
              <tr>
                <th style={{ width: 40, textAlign: 'center' }}>#</th>
                <th style={{ minWidth: 180 }}>Item</th>
                <th style={{ minWidth: 220 }}>Description</th>
                <th style={{ width: 150 }}>Category</th>
                <th style={{ width: 80, textAlign: 'right' }}>Qty</th>
                <th style={{ width: 120, textAlign: 'right' }}>Rate (₹)</th>
                <th style={{ width: 120, textAlign: 'right' }}>Amount (₹)</th>
                <th style={{ width: 36 }} />
              </tr>
            </thead>
            <tbody>
              {filteredLines.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-muted-foreground text-sm">
                    {searchQuery ? 'No matching items found' : 'No items added yet. Click "Add item" to start.'}
                  </td>
                </tr>
              )}
              {filteredLines.map((line, idx) => {
                const amount = line.qty * line.rate
                return (
                  <tr key={line.uid} className="bom-row">
                    <td className="text-center text-muted-foreground text-[12.5px]">{idx + 1}</td>
                    <td>
                      <Input
                        placeholder="Item name"
                        value={line.item}
                        onChange={(e) => updateLine(line.uid, { item: e.target.value })}
                        className="h-8 text-[13px]"
                      />
                    </td>
                    <td>
                      <Input
                        placeholder="Description"
                        value={line.description}
                        onChange={(e) => updateLine(line.uid, { description: e.target.value })}
                        className="h-8 text-[13px]"
                      />
                    </td>
                    <td>
                      <Select
                        value={line.category}
                        onValueChange={(val) => updateLine(line.uid, { category: val })}
                      >
                        <SelectTrigger className="h-8 text-[12.5px]">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          {IMS_CATEGORIES.map((cat) => (
                            <SelectItem key={cat} value={cat}>
                              {cat}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td>
                      <Input
                        type="number"
                        min={1}
                        className="h-8 text-right text-[13px]"
                        value={line.qty}
                        onChange={(e) =>
                          updateLine(line.uid, { qty: Math.max(1, Number(e.target.value) || 1) })
                        }
                      />
                    </td>
                    <td>
                      <Input
                        type="number"
                        min={0}
                        className="h-8 text-right text-[13px]"
                        value={line.rate}
                        onChange={(e) =>
                          updateLine(line.uid, { rate: Math.max(0, Number(e.target.value) || 0) })
                        }
                      />
                    </td>
                    <td className="text-right tabular-nums font-semibold text-[12.5px]">
                      ₹{formatCurrency(amount)}
                    </td>
                    <td className="text-center">
                      <button
                        className="p-1 rounded opacity-30 hover:opacity-100 hover:bg-[#FEF3F2] hover:text-[#B42318] transition-opacity"
                        onClick={() => removeLine(line.uid)}
                        title="Remove line"
                        disabled={lines.length <= 1}
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {/* Add row button at the bottom of the table */}
          <div className="px-4 py-3 border-t border-[var(--border,#E4E7EC)]">
            <button
              className="inline-flex items-center gap-1 text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors"
              onClick={addLine}
            >
              <Plus className="size-3" />
              Add line item
            </button>
          </div>
        </div>

        {/* ---- RIGHT: Sidebar ---- */}
        <div className="space-y-4">
          {/* Pricing Summary */}
          <div className="rounded-lg border border-[var(--border,#E4E7EC)] bg-[var(--card,#fff)] p-5">
            <div className="text-[14px] font-semibold mb-4">Pricing Summary</div>
            <div className="space-y-3 text-[13px]">
              <SummaryRow label="Subtotal" value={fmtINR(subtotal)} />
              <div className="flex items-center justify-between">
                <span className="cpt-muted">Discount</span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    className="qty-inp"
                    style={{ width: 48, textAlign: 'right' }}
                    value={discountPct}
                    min={0}
                    max={100}
                    onChange={(e) =>
                      setDiscountPct(Math.max(0, Math.min(100, Number(e.target.value) || 0)))
                    }
                  />
                  <span className="cpt-muted">%</span>
                  <span className="text-[#B42318] ml-1 font-medium tabular-nums">
                    &minus;{fmtINR(discount)}
                  </span>
                </div>
              </div>
              <SummaryRow label="After discount" value={fmtINR(afterDisc)} bold />
              <SummaryRow label="GST @18%" value={fmtINR(gst)} />
              <div className="border-t border-[var(--border,#E4E7EC)] pt-3 flex items-center justify-between font-semibold text-[14px]">
                <span>Grand total</span>
                <span className="tabular-nums">{fmtINR(grandTotal)}</span>
              </div>
            </div>
          </div>

          {/* Items by Category */}
          <div className="rounded-lg border border-[var(--border,#E4E7EC)] bg-[var(--card,#fff)] p-5">
            <div className="text-[14px] font-semibold mb-4">Items by Category</div>
            <div className="space-y-2.5 text-[13px]">
              {(() => {
                const catMap = new Map<string, { count: number; total: number }>()
                for (const l of lines) {
                  const cat = l.category || 'Uncategorized'
                  const existing = catMap.get(cat) ?? { count: 0, total: 0 }
                  existing.count += l.qty
                  existing.total += l.qty * l.rate
                  catMap.set(cat, existing)
                }
                return Array.from(catMap.entries()).map(([cat, { count, total }]) => (
                  <div key={cat} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="cpt-muted">{cat}</span>
                      <span className="text-[11px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        {count} qty
                      </span>
                    </div>
                    <span className="font-medium tabular-nums">{fmtINR(total)}</span>
                  </div>
                ))
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Summary row helper                                                 */
/* ------------------------------------------------------------------ */

function SummaryRow({
  label,
  value,
  muted,
  bold,
}: {
  label: string
  value: string
  muted?: boolean
  bold?: boolean
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="cpt-muted">{label}</span>
      <span
        className={`tabular-nums ${muted ? 'cpt-muted' : ''} ${
          bold ? 'font-semibold' : 'font-medium'
        }`}
      >
        {value}
      </span>
    </div>
  )
}
