import { useUser } from '@modules/users'
import { useCategory, useOEMsByIds } from '@modules/ims'

import { cn } from '@/lib/utils'
import { UI } from '@/shared/constants'
import { ExpandableText } from '@/components/common/display/ExpandableText'

import { useAccount } from '../../hooks/accounts/useAccounts'
import { useContact } from '../../hooks/contacts/useContacts'
import { useLead } from '../../hooks/leads/useLeads'
import { useDeal } from '../../hooks/deals/useDeals'
import {
  FK_KEY_TO_ENTITY,
  formatDiffValue,
  isEmptyValue,
  isUuid,
  isUuidArray,
  type EntityKind,
} from './auditTrailHelpers'
import { CRM_SHARED_STRINGS } from './crm-shared.strings'

// Backend audit snapshots store raw UUIDs for relational fields. These leaf
// components resolve every known FK to a human name on demand so the diff is
// readable. Any UUID-looking value under an unknown key is hidden — the user
// explicitly does NOT want bare IDs in the timeline.

function NamePlaceholder({ id, loading }: { id: string; loading: boolean }) {
  return (
    <span className="text-muted-foreground" title={id}>
      {loading
        ? CRM_SHARED_STRINGS.auditResolvedName.loading
        : CRM_SHARED_STRINGS.auditResolvedName.unknown}
    </span>
  )
}

function UserName({ id }: { id: string }) {
  const q = useUser(id)
  if (q.data) {
    const { first_name, last_name } = q.data
    return <span>{last_name ? `${first_name} ${last_name}` : first_name}</span>
  }
  return <NamePlaceholder id={id} loading={q.isLoading} />
}

function AccountName({ id }: { id: string }) {
  const q = useAccount(id)
  if (q.data?.name) return <span>{q.data.name}</span>
  return <NamePlaceholder id={id} loading={q.isLoading} />
}

function ContactName({ id }: { id: string }) {
  const q = useContact(id)
  const c = q.data as { name?: string; first_name?: string; last_name?: string } | undefined
  if (c?.name) return <span>{c.name}</span>
  if (c?.first_name)
    return <span>{c.last_name ? `${c.first_name} ${c.last_name}` : c.first_name}</span>
  return <NamePlaceholder id={id} loading={q.isLoading} />
}

function LeadName({ id }: { id: string }) {
  const q = useLead(id)
  const data = q.data as { company_name?: string | null; code?: string; name?: string } | undefined
  const label = data?.company_name || data?.name || data?.code
  if (label) return <span>{label}</span>
  return <NamePlaceholder id={id} loading={q.isLoading} />
}

function DealName({ id }: { id: string }) {
  const q = useDeal(id)
  const data = q.data as { name?: string; code?: string } | undefined
  const label = data?.name || data?.code
  if (label) return <span>{label}</span>
  return <NamePlaceholder id={id} loading={q.isLoading} />
}

function CategoryName({ id }: { id: string }) {
  const q = useCategory(id)
  if (q.data?.name) return <span>{q.data.name}</span>
  return <NamePlaceholder id={id} loading={q.isLoading} />
}

function OEMName({ id }: { id: string }) {
  // OEM module only exposes a batch-by-ids hook; call with a single id.
  const [q] = useOEMsByIds([id])
  if (q?.data?.name) return <span>{q.data.name}</span>
  return <NamePlaceholder id={id} loading={!!q?.isLoading} />
}

export function ResolvedName({ entity, id }: { entity: EntityKind; id: string }) {
  switch (entity) {
    case 'user':
      return <UserName id={id} />
    case 'account':
      return <AccountName id={id} />
    case 'contact':
      return <ContactName id={id} />
    case 'lead':
      return <LeadName id={id} />
    case 'deal':
      return <DealName id={id} />
    case 'category':
      return <CategoryName id={id} />
    case 'oem':
      return <OEMName id={id} />
  }
}

function ResolvedNames({ entity, ids }: { entity: EntityKind; ids: string[] }) {
  return (
    <>
      {ids.map((id, i) => (
        <span key={id}>
          {i > 0 && ', '}
          <ResolvedName entity={entity} id={id} />
        </span>
      ))}
    </>
  )
}

/** True for a non-null, non-array object. */
function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/** `manufacturer_serial` / `_atomic_lines` → "Manufacturer serial" / "Atomic lines". */
function humaniseNestedKey(key: string): string {
  return key
    .replace(/^_+/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

/** A single leaf (non-object) value, rendered as plain readable text — never
 *  a raw UUID, never JSON. Reuses FK name-resolution + reference-hiding. */
// Scalar diff value. Short strings stay inline (unchanged diff layout); a long
// rich-text value (e.g. a pasted description) is clamped to RICH_TEXT_CLAMP_LIMIT
// characters behind a "Show more" toggle that reveals the whole thing at once.
function ScalarLeaf({ v }: { v: unknown }) {
  const text = formatDiffValue(v)
  if (text.length <= UI.RICH_TEXT_CLAMP_LIMIT) {
    return <span className="[overflow-wrap:anywhere]">{text}</span>
  }
  return (
    <ExpandableText
      text={text}
      chunkSize={UI.RICH_TEXT_CLAMP_LIMIT}
      expandMode="all"
      className="min-w-0"
      showMoreLabel={CRM_SHARED_STRINGS.auditResolvedName.showMore}
      showLessLabel={CRM_SHARED_STRINGS.auditResolvedName.showLess}
      renderContent={(t) => (
        <span className="block [overflow-wrap:anywhere] whitespace-pre-wrap">{t}</span>
      )}
    />
  )
}

function LeafValue({ k, v }: { k: string; v: unknown }) {
  if (isEmptyValue(v)) return <span className="text-muted-foreground">—</span>
  const entity = FK_KEY_TO_ENTITY[k]
  if (entity && isUuid(v)) return <ResolvedName entity={entity} id={v} />
  if (entity && isUuidArray(v)) return <ResolvedNames entity={entity} ids={v} />
  if (isUuid(v) || isUuidArray(v)) {
    return (
      <span className="text-muted-foreground">
        {CRM_SHARED_STRINGS.auditResolvedName.referenceHidden}
      </span>
    )
  }
  if (Array.isArray(v)) {
    return <span className="[overflow-wrap:anywhere]">{v.map(formatDiffValue).join(', ')}</span>
  }
  return <ScalarLeaf v={v} />
}

/**
 * Render a structured audit value (object / array) as a human-readable list of
 * "Label: value" rows — NOT JSON. Nested objects/arrays indent under their
 * label. Everything wraps (`[overflow-wrap:anywhere]` + `min-w-0`) so a long
 * value breaks down instead of scrolling sideways. Uses block-display <span>s
 * so it stays valid inside the inline <span> wrappers DiffValue renders into.
 */
function StructuredValue({ k, v, depth }: { k: string; v: unknown; depth: number }) {
  if (isPlainObject(v)) {
    const entries = Object.entries(v).filter(([, val]) => !isEmptyValue(val))
    if (entries.length === 0) return <span className="text-muted-foreground">—</span>
    return (
      <span className={cn('block min-w-0 space-y-1', depth > 0 && 'mt-1 border-l pl-2.5')}>
        {entries.map(([key, val]) => (
          <span key={key} className="block min-w-0">
            <span className="font-medium text-foreground">{humaniseNestedKey(key)}: </span>
            <StructuredValue k={key} v={val} depth={depth + 1} />
          </span>
        ))}
      </span>
    )
  }

  if (Array.isArray(v)) {
    // Array of primitives → a simple comma list. Array of objects → numbered rows.
    const hasObjects = v.some((el) => el !== null && typeof el === 'object')
    if (!hasObjects) return <LeafValue k={k} v={v} />
    return (
      <span className={cn('block min-w-0 space-y-1', depth > 0 && 'mt-1 border-l pl-2.5')}>
        {v.map((el, i) => (
          <span key={i} className="block min-w-0">
            <span className="font-medium text-muted-foreground">{i + 1}. </span>
            <StructuredValue k={k} v={el} depth={depth + 1} />
          </span>
        ))}
      </span>
    )
  }

  return <LeafValue k={k} v={v} />
}

export function DiffValue({ k, v }: { k: string; v: unknown }) {
  if (isEmptyValue(v)) return <span className="text-muted-foreground">—</span>

  const entity = FK_KEY_TO_ENTITY[k]
  if (entity) {
    if (isUuid(v)) return <ResolvedName entity={entity} id={v} />
    if (isUuidArray(v)) return <ResolvedNames entity={entity} ids={v} />
  }

  // Unknown-key UUID(s) → never render the raw ID; show a discreet placeholder.
  if (isUuid(v) || isUuidArray(v)) {
    return (
      <span className="text-muted-foreground">
        {CRM_SHARED_STRINGS.auditResolvedName.referenceHidden}
      </span>
    )
  }

  // Structured values (objects, or arrays containing objects) → a readable
  // field list (Label: value), never a JSON dump.
  if (isPlainObject(v) || (Array.isArray(v) && v.some((el) => el !== null && typeof el === 'object'))) {
    return <StructuredValue k={k} v={v} depth={0} />
  }

  // Array of plain strings/numbers → comma-separated, not JSON.
  if (Array.isArray(v)) {
    return <span className="[overflow-wrap:anywhere]">{v.map(formatDiffValue).join(', ')}</span>
  }

  return <ScalarLeaf v={v} />
}
