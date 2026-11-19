import { useEffect, useMemo, useState } from 'react'

import { cn } from '@/lib/utils'
import { Popover } from '@/components/ui/popover'
import { PopoverSelectTrigger } from '@/components/ui/popover-select-trigger'
import { useDebounce } from '@/shared/hooks'
import { UI, PAGINATION } from '@/shared/constants'

import { useLeadsInfinite } from '../../hooks/leads/useLeads'
import { useDealsInfinite } from '../../hooks/deals/useDeals'
import { InfiniteScrollPickerContent } from '../shared/InfiniteScrollPickerContent'
import { TASKS_STRINGS } from './tasks.strings'
import type { TaskEntityType, CrmLeadListItem, DealListItem } from '../../api'

// Searchable, API-backed picker for the Task form's `entity_id` field.
// Switches its data source on `entityType`:
//   • 'lead' → `useLeadsInfinite` (paginated by funnel filters)
//   • 'deal' → `useDealsInfinite` (paginated by pipeline filters)
//
// Both queries page through `PAGINATION.DEFAULT_PAGE_SIZE` rows and load
// more when the sentinel intersects the scroll viewport. Search is
// debounced before being sent to the backend.
//
// `value` is the chosen entity id; `displayName` is shown when the picker
// is collapsed. The parent owns hydration of `displayName` (for a known id
// that isn't yet in the loaded page) — for fresh picks we use the row's
// `name` directly via `onSelect`.

interface TaskEntityPickerProps {
  entityType: TaskEntityType
  value: string | null
  displayName?: string | null
  onSelect: (id: string, name: string) => void
  onClear: () => void
  disabled?: boolean
}

export function TaskEntityPicker({
  entityType,
  value,
  displayName,
  onSelect,
  onClear,
  disabled,
}: TaskEntityPickerProps) {
  const [open, setOpen] = useState(false)
  const [rawSearch, setRawSearch] = useState('')
  const debouncedSearch = useDebounce(rawSearch.trim(), UI.DEBOUNCE_SEARCH_MS)

  // Cap both queries with the global page size and pass the search through
  // the API's `search` filter (server-side). Coding-guideline §16.11.
  const leadsQuery = useLeadsInfinite(
    { search: debouncedSearch || undefined, page_size: PAGINATION.DEFAULT_PAGE_SIZE },
    { enabled: open && entityType === 'lead' },
  )
  const dealsQuery = useDealsInfinite(
    { search: debouncedSearch || undefined, page_size: PAGINATION.DEFAULT_PAGE_SIZE },
    { enabled: open && entityType === 'deal' },
  )

  // Pick the active query by entityType. Keeping the two queries separate
  // (rather than under one `data?.pages` flatMap) makes TS happy with the
  // disjoint row types — leads vs deals never mix in the same render.
  const active = entityType === 'lead' ? leadsQuery : dealsQuery
  const { isLoading, isError, error, hasNextPage, isFetchingNextPage, fetchNextPage } =
    active

  const leadRows = useMemo<CrmLeadListItem[]>(
    () => (leadsQuery.data?.pages ?? []).flatMap((p) => p.items),
    [leadsQuery.data?.pages],
  )
  const dealRows = useMemo<DealListItem[]>(
    () => (dealsQuery.data?.pages ?? []).flatMap((p) => p.items),
    [dealsQuery.data?.pages],
  )
  // One union list feeds the shared picker body; renderItem branches on
  // entityType so leads and deals never mix in the same render.
  const items: Array<CrmLeadListItem | DealListItem> =
    entityType === 'lead' ? leadRows : dealRows

  // Reset search when the entity_type flips — otherwise the user sees
  // "no matches" from a stale query string.
  useEffect(() => {
    setRawSearch('')
  }, [entityType])

  function pick(id: string, name: string) {
    onSelect(id, name)
    setOpen(false)
    setRawSearch('')
  }

  function clear(e: React.MouseEvent) {
    e.stopPropagation()
    onClear()
  }

  const isLead = entityType === 'lead'
  const singularLabel = isLead
    ? TASKS_STRINGS.entityPicker.leadSingular
    : TASKS_STRINGS.entityPicker.dealSingular
  const pluralLabel = isLead
    ? TASKS_STRINGS.entityPicker.leadsPlural
    : TASKS_STRINGS.entityPicker.dealsPlural

  const triggerLabel =
    value && displayName
      ? displayName
      : TASKS_STRINGS.entityPicker.pick(singularLabel)

  return (
    <Popover open={open} onOpenChange={(o) => !disabled && setOpen(o)}>
      <PopoverSelectTrigger
        hasValue={!!value}
        onClear={clear}
        disabled={disabled}
        clearLabel={TASKS_STRINGS.entityPicker.clearLabel(singularLabel)}
      >
        {triggerLabel}
      </PopoverSelectTrigger>
      <InfiniteScrollPickerContent
        search={{
          value: rawSearch,
          onChange: setRawSearch,
          placeholder: isLead
            ? TASKS_STRINGS.entityPicker.searchLead
            : TASKS_STRINGS.entityPicker.searchDeal,
        }}
        query={{ isLoading, isError, error, hasNextPage, isFetchingNextPage, fetchNextPage }}
        items={items}
        errorText={TASKS_STRINGS.entityPicker.loadError(pluralLabel)}
        emptyText={
          rawSearch
            ? TASKS_STRINGS.entityPicker.emptySearch
            : TASKS_STRINGS.entityPicker.empty(pluralLabel)
        }
        renderItem={(item) =>
          entityType === 'lead' ? (
            <LeadRow item={item as CrmLeadListItem} selected={item.id === value} onPick={pick} />
          ) : (
            <DealRow item={item as DealListItem} selected={item.id === value} onPick={pick} />
          )
        }
      />
    </Popover>
  )
}

function LeadRow({
  item,
  selected,
  onPick,
}: {
  item: CrmLeadListItem
  selected: boolean
  onPick: (id: string, name: string) => void
}) {
  // Display priority: company → contact → lead_code (always non-empty).
  const display =
    item.company_name?.trim() ||
    item.contact_name?.trim() ||
    item.lead_code
  return (
    <button
      type="button"
      onClick={() => onPick(item.id, display)}
      className={cn(
        'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm',
        'hover:bg-accent',
        selected && 'bg-accent/50',
      )}
    >
      <span className="min-w-0 flex-1 truncate">{display}</span>
      <span className="shrink-0 text-[10px] text-muted-foreground">
        {item.lead_code}
      </span>
    </button>
  )
}

function DealRow({
  item,
  selected,
  onPick,
}: {
  item: DealListItem
  selected: boolean
  onPick: (id: string, name: string) => void
}) {
  const display = item.title?.trim() || item.deal_number
  return (
    <button
      type="button"
      onClick={() => onPick(item.id, display)}
      className={cn(
        'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm',
        'hover:bg-accent',
        selected && 'bg-accent/50',
      )}
    >
      <span className="min-w-0 flex-1 truncate">{display}</span>
      <span className="shrink-0 text-[10px] text-muted-foreground">
        {item.deal_number}
      </span>
    </button>
  )
}
