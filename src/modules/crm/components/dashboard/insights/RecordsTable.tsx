import { formatINRShort } from '@/lib/currency'
import { formatIST_date } from '@/shared/lib/date'

import type { RecordsResponse } from '../../../api/dashboard'
import {
  BODY_ROW_CLASS,
  HEAD_ROW_CLASS,
  NumTd,
  RefTd,
  TABLE_CLASS,
  THEAD_CLASS,
  TextTd,
  Th,
} from './insight-table'
import { INSIGHTS_STRINGS } from './insights.strings'

// ── Dynamic table ───────────────────────────────────────────────────────────
// Renders WHATEVER the endpoint returns. Columns are derived from the row keys,
// so a new field on any panel shows up here with no component change — there is
// no per-shape column list to keep in sync with the backend.
//
// Two rules shape the output:
//  1. A raw UUID is never a column. An `*_id` field pairs with its human label
//     (`deal_id` + `deal_number`) and renders as ONE cell showing the label,
//     linked to that record's detail page. An id with no label field, and a
//     label whose id is null, both degrade to plain text rather than a dead link.
//  2. Cell rendering is inferred from the key + value: `*_at` → date,
//     value/amount/total → abbreviated currency, booleans → Yes/—, everything
//     else → truncating text.
//
// Lifted from the former `SummaryDrilldownDialog` when the drill-down moved from
// a modal to `/crm/insights/records/:tile`. The derivation rules are unchanged;
// only the surface colour and the link target moved (see `THEAD_CLASS`/`RefTd`).

const NONE = INSIGHTS_STRINGS.summary.noValue
const C = INSIGHTS_STRINGS.records.columns

type Row = Record<string, unknown>

/** `*_id` → the label field it pairs with + where that record lives. */
const ENTITY_LINKS: { idKey: string; labelKey: string; route: (id: string) => string }[] = [
  { idKey: 'deal_id', labelKey: 'deal_number', route: (id) => `/crm/deals/${id}` },
  {
    idKey: 'sales_order_id',
    labelKey: 'sales_order_number',
    route: (id) => `/crm/sales-orders/${id}`,
  },
  { idKey: 'account_id', labelKey: 'account_name', route: (id) => `/crm/accounts/${id}` },
  { idKey: 'lead_id', labelKey: 'lead_code', route: (id) => `/crm/leads/${id}` },
  { idKey: 'quote_id', labelKey: 'quote_number', route: (id) => `/crm/quotes/${id}` },
]

/**
 * A POLYMORPHIC reference: `<x>_id` + `<x>_number` + `<x>_type`, where the type
 * column picks the module PER ROW.
 *
 * The LEADS panel (`lead:total`) is the one that needs this. Converting a lead
 * soft-deletes it, so a converted row's own `lead_code` would link to a detail
 * page that no longer resolves — the backend therefore ships ONE reference that
 * points at the Deal once converted and at the Lead until then, and tells us
 * which via `record_type`. See `LeadItem` in the backend's records schema.
 *
 * The type column is routing metadata, never a column of its own — a "Record
 * Type" column reading "lead"/"deal" is wire detail leaking into the UI.
 */
const POLY_LINKS: {
  idKey: string
  labelKey: string
  typeKey: string
  paths: Record<string, string>
}[] = [
  {
    idKey: 'record_id',
    labelKey: 'record_number',
    typeKey: 'record_type',
    paths: { lead: 'leads', deal: 'deals' },
  },
]

/** A row's own `id` is a different entity per panel, so it resolves from the
 *  response `type` rather than from the key name.
 *
 *  NO `lead` entry, deliberately: the lead panel's own `id` is the soft-deleted
 *  lead on every converted row, so linking it would produce a dead page. That
 *  panel routes through `POLY_LINKS` (`record_*`) instead, which is exactly why
 *  the backend collapsed `lead_code` + `deal_number` into one reference. */
const SELF_ROUTE: Record<string, { path: string; labelKeys: string[] }> = {
  quote: { path: 'quotes', labelKeys: ['quote_number'] },
  deal: { path: 'deals', labelKeys: ['deal_number'] },
  sales_order: { path: 'sales-orders', labelKeys: ['sales_order_number'] },
}

type CellKind = 'link' | 'text' | 'money' | 'number' | 'date' | 'bool'

interface Column {
  /** Field whose value is displayed. */
  key: string
  label: string
  kind: CellKind
  /** Link target for this row, when the column is an entity reference. */
  href?: (row: Row) => string | null
}

const MONEY_KEY = /(^value$|_value$|_amount$|_total$)/
const DATE_KEY = /(_at$|^date$|_date$)/

function inferKind(key: string, sample: unknown): CellKind {
  if (DATE_KEY.test(key)) return 'date'
  if (MONEY_KEY.test(key)) return 'money'
  if (typeof sample === 'boolean') return 'bool'
  if (typeof sample === 'number') return 'number'
  return 'text'
}

/** Column header. Known API fields get authored copy from `insights.strings`
 *  (§16.12); anything the backend adds later falls back to a humanised key, so
 *  a new field is readable immediately instead of blocking on a strings edit. */
function headerLabel(key: string): string {
  const authored = (C as Record<string, string | undefined>)[key]
  if (authored) return authored
  return key
    .replace(/_id$/, '')
    .replace(/_number$/, ' #')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim()
}

/**
 * Every field a link column will absorb — the label it displays, plus (for a
 * polymorphic reference) the type field that only picks the route.
 *
 * Computed in a PRE-PASS, before any column is built. Marking a field consumed
 * as the loop reached its id made the whole derivation depend on the API
 * emitting `x_id` BEFORE `x_number`: a payload ordering the label first
 * rendered it once as plain text (unclickable, because the loop had not seen
 * the id yet) and then AGAIN as a link — two columns with the same React key.
 * `OrderItem` happens to order ids first, which is why the deal panel worked
 * and nothing forced this to be fixed until a payload ordered them otherwise.
 */
function consumedFields(keys: string[], type: string): Set<string> {
  const consumed = new Set<string>()
  for (const key of keys) {
    if (key === 'id') {
      const labelKey = SELF_ROUTE[type]?.labelKeys.find((k) => keys.includes(k))
      if (labelKey) consumed.add(labelKey)
      continue
    }
    const poly = POLY_LINKS.find((l) => l.idKey === key)
    if (poly && keys.includes(poly.labelKey)) {
      consumed.add(poly.labelKey)
      consumed.add(poly.typeKey)
      continue
    }
    const link = ENTITY_LINKS.find((l) => l.idKey === key)
    if (link && keys.includes(link.labelKey)) consumed.add(link.labelKey)
  }
  return consumed
}

/** Derive the column list from the first row, preserving the API's key order. */
function deriveColumns(items: Row[], type: string): Column[] {
  const first = items[0]
  if (!first) return []
  const keys = Object.keys(first)
  // Label / type fields absorbed by a link column must not also render alone.
  const consumed = consumedFields(keys, type)
  const columns: Column[] = []

  for (const key of keys) {
    if (consumed.has(key)) continue

    // 1. `id` — the row's own record.
    if (key === 'id') {
      const self = SELF_ROUTE[type]
      const labelKey = self?.labelKeys.find((k) => keys.includes(k))
      if (self && labelKey) {
        columns.push({
          key: labelKey,
          label: headerLabel(labelKey),
          kind: 'link',
          href: (r) => (r.id ? `/crm/${self.path}/${String(r.id)}` : null),
        })
        continue
      }
      // No label to show and no route — a bare UUID column helps nobody.
      continue
    }

    // 2. A polymorphic `<x>_id` + `<x>_number` + `<x>_type` triple.
    const poly = POLY_LINKS.find((l) => l.idKey === key)
    if (poly && keys.includes(poly.labelKey)) {
      columns.push({
        key: poly.labelKey,
        label: headerLabel(poly.labelKey),
        kind: 'link',
        href: (r) => {
          const path = poly.paths[String(r[poly.typeKey] ?? '')]
          // An unknown `record_type` degrades to plain text rather than
          // guessing a module and routing the user to a 404.
          return r[poly.idKey] && path ? `/crm/${path}/${String(r[poly.idKey])}` : null
        },
      })
      continue
    }

    // 3. `*_id` paired with a label field.
    const link = ENTITY_LINKS.find((l) => l.idKey === key)
    if (link && keys.includes(link.labelKey)) {
      columns.push({
        key: link.labelKey,
        label: headerLabel(link.labelKey),
        kind: 'link',
        href: (r) => (r[link.idKey] ? link.route(String(r[link.idKey])) : null),
      })
      continue
    }
    // An id we can't resolve to a label is dropped, not shown as a UUID.
    if (link || key.endsWith('_id')) continue

    columns.push({
      key,
      label: headerLabel(key),
      kind: inferKind(key, first[key]),
    })
  }

  return columns
}

// NO whole-row click. A single row routinely carries SEVERAL linkable ids — an
// order row has a deal, a sales order AND an account — so a row-level click has
// to guess which one the user meant, and whichever it picks is wrong most of the
// time. The reference columns are the navigation: each id links to its OWN
// record, and the cell that was clicked is the record that opens.

interface TableProps {
  items: Row[]
  type: string
}

export function RecordsTable({ data }: { data: RecordsResponse }) {
  const items = data.items as unknown as Row[]
  return <DynamicTable items={items} type={data.type} />
}

// Table chrome (`Th` / `RefTd` / `TextTd` / `NumTd` + the row classes) lives in
// `insight-table.tsx`, shared with the KPI-tile account breakdown so the two
// drill-through surfaces cannot drift apart. `RefTd` is the ONLY navigation in
// this table — see the no-row-click note above.

function Cell({ col, row }: { col: Column; row: Row }) {
  const raw = row[col.key]

  if (col.kind === 'link') {
    const href = col.href?.(row)
    const text = raw == null || raw === '' ? NONE : String(raw)
    // A reference with no id (e.g. an account-origin order has no deal) renders
    // as plain text — never a link that goes nowhere.
    return href && text !== NONE ? <RefTd text={text} href={href} /> : <TextTd text={text} nowrap />
  }
  if (raw == null || raw === '') return <TextTd text={NONE} nowrap />
  if (col.kind === 'date') return <TextTd text={formatIST_date(String(raw))} nowrap />
  if (col.kind === 'money') return <NumTd text={formatINRShort(Number(raw))} />
  if (col.kind === 'number') return <NumTd text={String(raw)} />
  if (col.kind === 'bool') return <TextTd text={raw ? C.yes : NONE} nowrap />
  return <TextTd text={String(raw)} />
}

function DynamicTable({ items, type }: TableProps) {
  const columns = deriveColumns(items, type)
  return (
    <table className={TABLE_CLASS}>
      <thead className={THEAD_CLASS}>
        <tr className={HEAD_ROW_CLASS}>
          {/* Alignment is derived from `kind`, not listed per column, so a new
              money/count column lands right-aligned without anyone remembering
              to say so — and the header can never disagree with `Cell`, which
              switches on the same field. */}
          {columns.map((col) => (
            <Th
              key={col.key}
              label={col.label}
              align={col.kind === 'money' || col.kind === 'number' ? 'right' : 'left'}
            />
          ))}
        </tr>
      </thead>
      <tbody>
        {items.map((row, index) => (
          <tr
            // Rows are one-per-record, so any id on the row is unique; the
            // index is the last resort for a payload carrying none.
            key={String(row.sales_order_id ?? row.id ?? index)}
            className={BODY_ROW_CLASS}
          >
            {columns.map((col) => (
              <Cell key={col.key} col={col} row={row} />
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
