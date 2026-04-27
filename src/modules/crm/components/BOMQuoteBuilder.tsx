import { useState, useRef, Fragment } from 'react'
import { ChevronDown, ChevronRight, Plus, X, Download, Check, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  SERVER_CATALOG,
  BOM_SECTIONS,
  fmtINR,
  marginPct,
  marginClass,
  stockFor,
  sectionForSku,
  type CatalogItem,
  type BOMSection,
} from '../data/server-catalog'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface BOMLine {
  uid: string
  parent: string | null
  section: string
  sku: string
  name: string
  cost: number
  price: number
  qty: number
  discount: number
  condition: 'new' | 'refurb'
  desc?: string
  socket?: string
  memGen?: string
  bay?: string
  specs?: Record<string, string>
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

let _uid = 0
function uid(): string {
  return `bom-${++_uid}-${Date.now().toString(36)}`
}

function catalogLine(
  item: CatalogItem,
  section: string,
  parent: string | null,
  qtyOverride?: number,
): BOMLine {
  return {
    uid: uid(),
    parent,
    section,
    sku: item.sku,
    name: item.name,
    cost: item.cost,
    price: item.price,
    qty: qtyOverride ?? item.qty,
    discount: 0,
    condition: item.condition,
    desc: item.desc,
    socket: item.socket,
    memGen: item.memGen,
    bay: item.bay,
    specs: item.specs,
  }
}

function buildInitialLines(): BOMLine[] {
  const cat = SERVER_CATALOG
  const lines: BOMLine[] = []

  // Server parent
  const srv = catalogLine(cat.servers[0], 'servers', null, 2)
  lines.push(srv)

  // Children of server
  lines.push(catalogLine(cat.cpu[0], 'cpu', srv.uid, 2))
  lines.push(catalogLine(cat.ram[0], 'ram', srv.uid, 8))
  lines.push(catalogLine(cat.storage[1], 'storage', srv.uid, 4))
  lines.push(catalogLine(cat.network[0], 'network', srv.uid, 1))
  lines.push(catalogLine(cat.power[0], 'power', srv.uid, 2))

  // Standalone items
  lines.push(catalogLine(cat.network_sw[0], 'network_sw', null, 1))
  lines.push(catalogLine(cat.rack[0], 'rack', null, 1))
  lines.push(catalogLine(cat.services[0], 'services', null, 1))
  lines.push(catalogLine(cat.services[1], 'services', null, 1))

  return lines
}

function stockLabel(sku: string, need: number): { text: string; cls: string } {
  const s = stockFor(sku)
  if (s >= 999) return { text: 'Service', cls: 'ok' }
  if (s === 0) return { text: 'OOS', cls: 'oos' }
  if (s < need) return { text: `${s} in stock`, cls: 'short' }
  if (s < need * 2) return { text: `${s} in stock`, cls: 'low' }
  return { text: `${s} in stock`, cls: 'ok' }
}

/* ------------------------------------------------------------------ */
/*  Micro-components                                                   */
/* ------------------------------------------------------------------ */

function CondBadge({ condition }: { condition: 'new' | 'refurb' }) {
  return (
    <span className={`cond-badge ${condition}`}>
      {condition === 'new' ? 'New' : 'Refurb'}
    </span>
  )
}

function StockPill({ sku, need }: { sku: string; need: number }) {
  const s = stockLabel(sku, need)
  return <span className={`stock-pill ${s.cls}`}>{s.text}</span>
}

function MarginPill({ cost, price }: { cost: number; price: number }) {
  const pct = marginPct(cost, price)
  return <span className={`margin-pill ${marginClass(pct)}`}>{pct}%</span>
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

interface BOMQuoteBuilderProps {
  leadId?: string
  leadName?: string
  dealId?: string
  dealName?: string
  accountId?: string
  accountName?: string
  /** Compact mode: hides info bar, stacks sidebar below, no split grid. For embedding in wizards/dialogs. */
  compact?: boolean
  /** Start with an empty BOM (no prefilled demo data). */
  initialEmpty?: boolean
}

export function BOMQuoteBuilder({
  leadId,
  leadName,
  dealId,
  dealName,
  accountId,
  accountName,
  compact = false,
  initialEmpty = false,
}: BOMQuoteBuilderProps = {}) {
  const [quoteNumber] = useState(() => `QT-2026-${String(Math.floor(Math.random() * 9000) + 1000)}`)
  const customerDisplay = accountName || dealName || leadName || 'Tata Communications'
  const [lines, setLines] = useState<BOMLine[]>(() => initialEmpty ? [] : buildInitialLines())
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(lines.filter((l) => !l.parent).map((l) => l.uid)),
  )
  const [picker, setPicker] = useState<{
    section: string
    parentUid: string | null
  } | null>(null)
  const [swap, setSwap] = useState<{
    lineUid: string
    section: string
    query: string
    anchor: DOMRect
  } | null>(null)
  const swapAnchorRef = useRef<HTMLElement | null>(null)

  /* ---- mutations ---- */

  function updateLine(uid: string, patch: Partial<BOMLine>) {
    setLines((prev) => prev.map((l) => (l.uid === uid ? { ...l, ...patch } : l)))
  }

  function removeLine(uid: string) {
    setLines((prev) => {
      const target = prev.find((l) => l.uid === uid)
      if (!target) return prev
      // If parent, also remove children
      if (!target.parent) {
        return prev.filter((l) => l.uid !== uid && l.parent !== uid)
      }
      return prev.filter((l) => l.uid !== uid)
    })
  }

  function toggleExpand(uid: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(uid)) next.delete(uid)
      else next.add(uid)
      return next
    })
  }

  function addFromCatalog(item: CatalogItem, section: string, parentUid: string | null) {
    const newLine = catalogLine(item, section, parentUid)
    setLines((prev) => {
      if (parentUid) {
        // Insert after last child of parent
        const idx = prev.reduce(
          (last, l, i) => (l.parent === parentUid ? i : last),
          prev.findIndex((l) => l.uid === parentUid),
        )
        const next = [...prev]
        next.splice(idx + 1, 0, newLine)
        return next
      }
      // Find last line in this section or append at end
      const sectionLines = prev.filter((l) => l.section === section && !l.parent)
      if (sectionLines.length) {
        const lastSec = sectionLines[sectionLines.length - 1]
        const idx = prev.reduce(
          (last, l, i) => (l.uid === lastSec.uid || l.parent === lastSec.uid ? i : last),
          prev.findIndex((l) => l.uid === lastSec.uid),
        )
        const next = [...prev]
        next.splice(idx + 1, 0, newLine)
        return next
      }
      return [...prev, newLine]
    })
    setPicker(null)
  }

  function swapLine(lineUid: string, item: CatalogItem) {
    setLines((prev) =>
      prev.map((l) =>
        l.uid === lineUid
          ? {
              ...l,
              sku: item.sku,
              name: item.name,
              cost: item.cost,
              price: item.price,
              condition: item.condition,
              desc: item.desc,
              socket: item.socket,
              memGen: item.memGen,
              bay: item.bay,
              specs: item.specs,
            }
          : l,
      ),
    )
    setSwap(null)
  }

  /* ---- calculations ---- */

  function parentQty(parentUid: string | null): number {
    if (!parentUid) return 1
    const p = lines.find((l) => l.uid === parentUid)
    return p ? p.qty : 1
  }

  function effectiveQty(line: BOMLine): number {
    return line.qty * parentQty(line.parent)
  }

  function lineTotal(line: BOMLine): number {
    const gross = line.price * effectiveQty(line)
    return gross - (gross * line.discount / 100)
  }

  function lineCost(line: BOMLine): number {
    return line.cost * effectiveQty(line)
  }

  const grossTotal = lines.reduce((s, l) => s + l.price * effectiveQty(l), 0)
  const subtotal = lines.reduce((s, l) => s + lineTotal(l), 0)
  const totalDiscount = grossTotal - subtotal
  const discountPct = grossTotal > 0 ? Math.round((totalDiscount / grossTotal) * 100 * 100) / 100 : 0
  const totalCost = lines.reduce((s, l) => s + lineCost(l), 0)
  const gst = subtotal * 0.18
  const grandTotal = subtotal + gst

  const lineCount = lines.length

  /* ---- group lines by section ---- */

  function groupedLines(): { section: BOMSection; rows: BOMLine[] }[] {
    const groups: { section: BOMSection; rows: BOMLine[] }[] = []
    for (const sec of BOM_SECTIONS) {
      // Skip per-server sections — their items are shown inline under server parents
      if (sec.perServer) continue

      // Only include top-level (non-child) lines for this section
      const rows = lines.filter(
        (l) => l.section === sec.key && !l.parent,
      )
      // Always show the section so the "Add" button is available
      groups.push({ section: sec, rows })
    }
    return groups
  }

  /** Get children of a server parent, grouped by their section */
  function childrenOf(parentUid: string): BOMLine[] {
    return lines.filter((l) => l.parent === parentUid)
  }

  /* ---- check if a line is a "parent" (has children) ---- */

  function hasChildren(uid: string): boolean {
    return lines.some((l) => l.parent === uid)
  }

  /* ---- catalog items for a section ---- */

  function catalogItems(section: string): CatalogItem[] {
    return SERVER_CATALOG[section] ?? []
  }

  /* ---- filtered swap options ---- */

  function swapOptions(): CatalogItem[] {
    if (!swap) return []
    const items = catalogItems(swap.section)
    const current = lines.find((l) => l.uid === swap.lineUid)
    const q = swap.query.toLowerCase()
    return items.filter(
      (i) =>
        i.sku !== current?.sku &&
        (i.name.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q)),
    )
  }

  /* ---------------------------------------------------------------- */
  /*  RENDER                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div className="space-y-4">
      {/* ---- Top info bar (hidden in compact mode) ---- */}
      {!compact && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card px-5 py-4 shadow-[0_1px_3px_rgba(16,24,40,0.04),0_1px_2px_rgba(16,24,40,0.03)]">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-[14px] font-semibold tracking-tight">
              <span>{quoteNumber}</span>
              <span className="font-normal text-muted-foreground/60">·</span>
              <span className="truncate text-muted-foreground">{customerDisplay}</span>
              {leadId && (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-400">
                  Lead
                </span>
              )}
              {dealId && (
                <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-violet-700 dark:text-violet-400">
                  Deal
                </span>
              )}
            </div>
            <div className="mt-1.5 flex items-center gap-2 text-[12px] text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-amber-500" />
                Draft
              </span>
              <span className="text-muted-foreground/40">·</span>
              <span className="tabular-nums">{lineCount} line items</span>
              <span className="text-muted-foreground/40">·</span>
              <span>Valid until May 20, 2026</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-9">
              <Download className="size-3.5" data-icon="inline-start" />
              Export PDF
            </Button>
            <Button size="sm" className="h-9">
              <Check className="size-3.5" data-icon="inline-start" />
              Submit for approval
            </Button>
          </div>
        </div>
      )}

      {/* ---- Split layout (stacked in compact mode) ---- */}
      <div className={compact ? "space-y-4" : "grid grid-cols-[1fr_340px] gap-5 items-start"}>
        {/* ---- LEFT: BOM Table ---- */}
        <div className="cpt-table-wrap">
          <div className="flex items-center justify-between border-b border-border bg-secondary/40 px-5 py-3">
            <div>
              <div className="text-[13.5px] font-semibold tracking-tight">Bill of Materials</div>
              <div className="mt-0.5 text-[11.5px] text-muted-foreground">
                Click ▸ to expand parent assemblies · Inline edit qty &amp; price · Margin shown per line
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => setPicker({ section: 'servers', parentUid: null })}
              className="h-8"
            >
              <Plus className="size-3.5" data-icon="inline-start" />
              Add server
            </Button>
          </div>

          <table className="cpt-tbl" style={{ tableLayout: 'auto' }}>
            <thead>
              <tr>
                <th style={{ minWidth: 280 }}>Item</th>
                <th style={{ width: 80, textAlign: 'center' }}>Qty</th>
                <th style={{ width: 100, textAlign: 'right' }}>Unit cost</th>
                <th style={{ width: 100, textAlign: 'right' }}>Unit price</th>
                <th style={{ width: 70, textAlign: 'center' }}>Disc %</th>
                <th style={{ width: 70, textAlign: 'center' }}>Margin</th>
                <th style={{ width: 110, textAlign: 'right' }}>Line total</th>
                <th style={{ width: 36 }} />
              </tr>
            </thead>
            <tbody>
              {groupedLines().map(({ section, rows }) => (
                <SectionBlock
                  key={section.key}
                  section={section}
                  rows={rows}
                  expanded={expanded}
                  hasChildren={hasChildren}
                  childrenOf={childrenOf}
                  toggleExpand={toggleExpand}
                  updateLine={updateLine}
                  removeLine={removeLine}
                  parentQty={parentQty}
                  effectiveQty={effectiveQty}
                  lineTotal={lineTotal}
                  onSwap={(lineUid, sec, rect) =>
                    setSwap({ lineUid, section: sec, query: '', anchor: rect })
                  }
                  onAdd={(sec, parentUid) => setPicker({ section: sec, parentUid })}
                />
              ))}
            </tbody>
          </table>
        </div>

        {/* ---- RIGHT: Sidebar ---- */}
        <div className="space-y-4">
          {/* Pricing Summary */}
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_1px_3px_rgba(16,24,40,0.04),0_1px_2px_rgba(16,24,40,0.03)]">
            <div className="border-b border-border bg-secondary/40 px-4 py-2.5">
              <div className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Pricing Summary
              </div>
            </div>
            <div className="space-y-2 p-4 text-[12px]">
              <SummaryRow label="Gross total" value={fmtINR(grossTotal)} />
              <SummaryRow
                label="Total cost (internal)"
                value={fmtINR(totalCost)}
                muted
              />
              <div className="flex items-center justify-between">
                <span className="cpt-muted">Discount ({discountPct}%)</span>
                <span className={`font-medium tabular-nums ${totalDiscount > 0 ? 'text-[#B42318]' : 'cpt-muted'}`}>
                  {totalDiscount > 0 ? <>&minus;{fmtINR(totalDiscount)}</> : fmtINR(0)}
                </span>
              </div>
              <SummaryRow label="Subtotal" value={fmtINR(subtotal)} bold />
              <SummaryRow label="GST @18%" value={fmtINR(gst)} />
              <div className="-mx-4 mt-2 flex items-center justify-between border-t border-border bg-secondary/30 px-4 pt-3 pb-1 text-[13.5px] font-semibold">
                <span>Grand total</span>
                <span className="tabular-nums tracking-tight">{fmtINR(grandTotal)}</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ---- Swap Popover ---- */}
      {swap && (
        <>
          <div className="swap-pop-overlay" onClick={() => setSwap(null)} />
          <div
            className="swap-pop"
            style={{
              top: Math.max(8, swap.anchor.top - 320),
              left: Math.min(swap.anchor.left, window.innerWidth - 480),
            }}
          >
            <div className="swap-pop-head">
              <div className="flex-1 min-w-0">
                <div className="text-[11px] text-muted-foreground font-semibold uppercase tracking-[0.06em]">
                  Replace {BOM_SECTIONS.find((s) => s.key === swap.section)?.label ?? swap.section}
                </div>
                {(() => {
                  const cur = lines.find((l) => l.uid === swap.lineUid)
                  if (!cur) return null
                  return (
                    <div className="flex items-center gap-2 mt-1 text-[13px]">
                      <span className="font-semibold truncate">{cur.name}</span>
                      <CondBadge condition={cur.condition} />
                      <StockPill sku={cur.sku} need={cur.qty} />
                      <span className="cpt-muted cpt-tiny">Qty {cur.qty}</span>
                    </div>
                  )
                })()}
              </div>
              <button
                className="p-1 rounded hover:bg-[var(--secondary,#EEF0F3)] shrink-0"
                onClick={() => setSwap(null)}
              >
                <X className="size-3.5" />
              </button>
            </div>
            <div className="px-2 py-1.5">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-[var(--muted-foreground)]" />
                <input
                  className="w-full rounded border border-[var(--border,#E4E7EC)] bg-transparent py-1.5 pl-7 pr-2 text-[12.5px] outline-none focus:border-[var(--primary,#0F1B2D)]"
                  placeholder="Search..."
                  value={swap.query}
                  autoFocus
                  onChange={(e) => setSwap({ ...swap, query: e.target.value })}
                />
              </div>
            </div>
            <div className="swap-pop-body">
              {swapOptions().length === 0 && (
                <div className="text-center cpt-muted text-[12px] py-4">
                  No alternatives found
                </div>
              )}
              {swapOptions().map((item) => {
                const current = lines.find((l) => l.uid === swap.lineUid)
                const curQty = current?.qty ?? 1
                const delta = item.price - (current?.price ?? 0)
                const deltaPct = current?.price ? Math.round((delta / current.price) * 100) : 0
                return (
                  <button
                    key={item.sku}
                    className="swap-opt"
                    onClick={() => swapLine(swap.lineUid, item)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-[13px]">{item.name}</span>
                        <CondBadge condition={item.condition} />
                        <StockPill sku={item.sku} need={curQty} />
                      </div>
                      <div className="cpt-mono cpt-muted cpt-tiny mt-1">{item.sku}</div>
                      {item.specs && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {Object.values(item.specs).map((v, i) => (
                            <span key={i} className="spec-chip">{v}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <div className="font-semibold text-[13px] tabular-nums">{fmtINR(item.price)}</div>
                      <div className="cpt-muted cpt-tiny tabular-nums mt-0.5">
                        × {curQty} = {fmtINR(item.price * curQty)}
                      </div>
                      <div className={`cpt-tiny font-semibold tabular-nums mt-1 ${delta === 0 ? 'cpt-muted' : delta > 0 ? 'text-[#B42318]' : 'text-[#067647]'}`}>
                        {delta === 0 ? 'same price' : `${delta > 0 ? '+' : '−'}${fmtINR(Math.abs(delta))} (${delta > 0 ? '+' : ''}${deltaPct}%)`}
                      </div>
                      <div className="mt-1">
                        <MarginPill cost={item.cost} price={item.price} />
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </>
      )}

      {/* ---- Catalog Drawer ---- */}
      {picker && (
        <>
          <div className="bom-drawer-bg" onClick={() => setPicker(null)} />
          <div className="bom-drawer">
            <div className="bom-drawer-head">
              <span className="font-semibold text-[14px]">
                Add{' '}
                {BOM_SECTIONS.find((s) => s.key === picker.section)?.label ??
                  picker.section}
              </span>
              <button
                className="p-1 rounded hover:bg-[var(--secondary,#EEF0F3)]"
                onClick={() => setPicker(null)}
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="bom-drawer-body">
              <div className="grid grid-cols-2 gap-3">
                {catalogItems(picker.section).map((item) => {
                  const mPct = marginPct(item.cost, item.price)
                  return (
                    <button
                      key={item.sku}
                      className="cfg-option"
                      onClick={() =>
                        addFromCatalog(item, picker.section, picker.parentUid)
                      }
                    >
                      <div className="flex items-center justify-between">
                        <span className="nm">{item.name}</span>
                        <CondBadge condition={item.condition} />
                      </div>
                      <div className="sp">
                        <span className="cpt-mono">{item.sku}</span>
                        {item.desc && <> &mdash; {item.desc}</>}
                      </div>
                      {item.specs && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {Object.entries(item.specs).map(([k, v]) => (
                            <span key={k} className="spec-chip">
                              {v}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="pr flex items-center gap-2">
                        {fmtINR(item.price)}
                        <MarginPill cost={item.cost} price={item.price} />
                        <StockPill sku={item.sku} need={item.qty} />
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Section block (group header + rows + add button)                   */
/* ------------------------------------------------------------------ */

interface SectionBlockProps {
  section: BOMSection
  rows: BOMLine[]
  expanded: Set<string>
  hasChildren: (uid: string) => boolean
  childrenOf: (parentUid: string) => BOMLine[]
  toggleExpand: (uid: string) => void
  updateLine: (uid: string, patch: Partial<BOMLine>) => void
  removeLine: (uid: string) => void
  parentQty: (parentUid: string | null) => number
  effectiveQty: (line: BOMLine) => number
  lineTotal: (line: BOMLine) => number
  onSwap: (lineUid: string, section: string, rect: DOMRect) => void
  onAdd: (section: string, parentUid: string | null) => void
}

const PER_SERVER_SECTIONS = ['cpu', 'ram', 'storage', 'network', 'power'] as const

function SectionBlock({
  section,
  rows,
  expanded,
  hasChildren: hasChildrenFn,
  childrenOf,
  toggleExpand,
  updateLine,
  removeLine,
  parentQty: parentQtyFn,
  effectiveQty: effectiveQtyFn,
  lineTotal: lineTotalFn,
  onSwap,
  onAdd,
}: SectionBlockProps) {
  const isServerSection = section.key === 'servers'

  return (
    <>
      {/* Group header */}
      <tr className="bom-row bom-group-head">
        <td colSpan={8}>{section.label}</td>
      </tr>

      {rows.map((line) => {
        const isChild = !!line.parent
        const isParent = !isChild && (isServerSection || hasChildrenFn(line.uid))
        const isExpanded = expanded.has(line.uid)

        // Hide children of collapsed parents
        if (isChild && !expanded.has(line.parent!)) return null

        const eQty = effectiveQtyFn(line)
        const total = lineTotalFn(line)

        return (
          <LineRow
            key={line.uid}
            line={line}
            isParent={isParent}
            isChild={isChild}
            isExpanded={isExpanded}
            eQty={eQty}
            total={total}
            parentQtyFn={parentQtyFn}
            toggleExpand={toggleExpand}
            updateLine={updateLine}
            removeLine={removeLine}
            onSwap={onSwap}
          />
        )
      })}

      {/* For server parents: show children + add-component buttons when expanded */}
      {isServerSection && rows.filter((r) => !r.parent).map((srv) => {
        if (!expanded.has(srv.uid)) return null
        const children = childrenOf(srv.uid)
        return (
          <Fragment key={`${srv.uid}-children`}>
            {children.map((child) => (
              <LineRow
                key={child.uid}
                line={child}
                isParent={false}
                isChild={true}
                isExpanded={false}
                eQty={effectiveQtyFn(child)}
                total={lineTotalFn(child)}
                parentQtyFn={parentQtyFn}
                toggleExpand={toggleExpand}
                updateLine={updateLine}
                removeLine={removeLine}
                onSwap={onSwap}
              />
            ))}
            {/* Add component buttons */}
            <tr className="bom-row depth-1">
              <td colSpan={8} style={{ paddingLeft: 36 }}>
                <div className="flex items-center gap-2 flex-wrap">
                  {PER_SERVER_SECTIONS.map((sk) => (
                    <button
                      key={sk}
                      className="inline-flex items-center gap-1 text-[11.5px] font-medium px-2.5 py-1 rounded-md border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-primary transition-colors"
                      onClick={() => onAdd(sk, srv.uid)}
                    >
                      <Plus className="size-3" />
                      {BOM_SECTIONS.find((s) => s.key === sk)?.label.split('(')[0].split('/')[0].trim() ?? sk}
                    </button>
                  ))}
                </div>
              </td>
            </tr>
          </Fragment>
        )
      })}

      {/* Add button row for this section */}
      {!isServerSection && (
        <tr className="bom-row">
          <td colSpan={8} style={{ padding: '8px 16px' }}>
            <button
              className="inline-flex items-center gap-1 text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => onAdd(section.key, null)}
            >
              <Plus className="size-3" />
              Add {section.label.toLowerCase().replace(/\(.*\)/, '').trim()}
            </button>
          </td>
        </tr>
      )}
    </>
  )
}

/* ------------------------------------------------------------------ */
/*  Individual line row                                                */
/* ------------------------------------------------------------------ */

function LineRow({
  line,
  isParent,
  isChild,
  isExpanded,
  eQty,
  total,
  parentQtyFn,
  toggleExpand,
  updateLine,
  removeLine,
  onSwap,
}: {
  line: BOMLine
  isParent: boolean
  isChild: boolean
  isExpanded: boolean
  eQty: number
  total: number
  parentQtyFn: (parentUid: string | null) => number
  toggleExpand: (uid: string) => void
  updateLine: (uid: string, patch: Partial<BOMLine>) => void
  removeLine: (uid: string) => void
  onSwap: (lineUid: string, section: string, rect: DOMRect) => void
}) {
  return (
    <tr
      className={`bom-row ${isParent ? 'bom-parent' : ''} ${isChild ? 'depth-1' : ''}`}
    >
      {/* Item cell */}
      <td>
        <div className="flex items-center gap-2">
          {isParent && (
            <button
              className="bom-tog"
              onClick={() => toggleExpand(line.uid)}
            >
              {isExpanded ? (
                <ChevronDown className="size-3.5" />
              ) : (
                <ChevronRight className="size-3.5" />
              )}
            </button>
          )}
          {isChild && (
            <span
              style={{
                width: 14, height: 14,
                borderLeft: '1.5px solid var(--border, #E4E7EC)',
                borderBottom: '1.5px solid var(--border, #E4E7EC)',
                borderBottomLeftRadius: 4,
                marginRight: 6, marginTop: 4, flexShrink: 0,
              }}
            />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={`font-medium text-[13px] ${isChild ? 'font-normal' : ''}`}>
                {line.name}
              </span>
              <CondBadge condition={line.condition} />
              <StockPill sku={line.sku} need={eQty} />
              {isChild && (
                <button
                  className="change-link"
                  onClick={(e) => {
                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                    onSwap(line.uid, line.section, rect)
                  }}
                >
                  Change
                </button>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="cpt-mono cpt-tiny">{line.sku}</span>
              {line.specs && Object.values(line.specs).slice(0, 3).map((v, i) => (
                <span key={i} className="spec-chip">{v}</span>
              ))}
            </div>
          </div>
        </div>
      </td>

      {/* Qty */}
      <td className="text-center">
        <input
          className="qty-inp"
          type="number"
          min={1}
          value={line.qty}
          onChange={(e) =>
            updateLine(line.uid, {
              qty: Math.max(1, Number(e.target.value) || 1),
            })
          }
        />
      </td>

      {/* Unit cost */}
      <td className="text-right tabular-nums cpt-muted text-[12.5px]">
        {fmtINR(line.cost)}
      </td>

      {/* Unit price (editable) */}
      <td className="text-right tabular-nums text-[12.5px]">
        <input
          className="qty-inp"
          type="number"
          style={{ width: 90, textAlign: 'right' }}
          value={line.price}
          onChange={(e) =>
            updateLine(line.uid, {
              price: Math.max(0, Number(e.target.value) || 0),
            })
          }
        />
      </td>

      {/* Discount % */}
      <td className="text-center">
        <input
          className="qty-inp"
          type="number"
          style={{ width: 52, textAlign: 'right' }}
          min={0}
          max={100}
          value={line.discount}
          onChange={(e) =>
            updateLine(line.uid, {
              discount: Math.max(0, Math.min(100, Number(e.target.value) || 0)),
            })
          }
        />
      </td>

      {/* Margin */}
      <td className="text-center">
        <MarginPill cost={line.cost} price={line.price} />
      </td>

      {/* Line total */}
      <td className="text-right tabular-nums font-semibold text-[12.5px]">
        {fmtINR(total)}
      </td>

      {/* Remove */}
      <td className="text-center">
        <button
          className="p-1 rounded opacity-30 hover:opacity-100 hover:bg-[#FEF3F2] hover:text-[#B42318] transition-opacity"
          onClick={() => removeLine(line.uid)}
          title="Remove line"
        >
          <X className="size-3.5" />
        </button>
      </td>
    </tr>
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
