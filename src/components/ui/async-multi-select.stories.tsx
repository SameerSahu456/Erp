import * as React from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'

import { AsyncMultiSelect, type AsyncOption } from './async-multi-select'

const meta = {
  title: 'Forms/AsyncMultiSelect',
  component: AsyncMultiSelect,
  tags: ['autodocs'],
} satisfies Meta<typeof AsyncMultiSelect>

export default meta
type Story = StoryObj

const OEMS = [
  { id: 'oem-siemens', name: 'Siemens' },
  { id: 'oem-abb', name: 'ABB' },
  { id: 'oem-schneider', name: 'Schneider Electric' },
  { id: 'oem-bosch', name: 'Bosch' },
  { id: 'oem-honeywell', name: 'Honeywell' },
]

// Static stand-in for a `useInfiniteQuery` hook: returns the single-page
// infinite-query shape AsyncMultiSelect expects, filtered by the (debounced)
// search string. No network, no QueryClient needed.
function useOemOptions(search: string) {
  return React.useMemo(() => {
    const q = search.trim().toLowerCase()
    const items = q
      ? OEMS.filter((o) => o.name.toLowerCase().includes(q))
      : OEMS
    return {
      data: { pages: [{ items }] },
      isLoading: false,
      isError: false,
      hasNextPage: false,
      isFetchingNextPage: false,
      fetchNextPage: () => {},
    }
  }, [search])
}

function Demo() {
  const [value, setValue] = React.useState<AsyncOption[]>([
    { id: 'oem-abb', label: 'ABB' },
  ])
  return (
    <div className="w-72">
      <AsyncMultiSelect
        value={value}
        onValueChange={setValue}
        useOptions={useOemOptions}
        toLabel={(o) => o.name}
        placeholder="Select OEMs…"
      />
    </div>
  )
}

export const Default: Story = {
  render: () => <Demo />,
}

// `matchBy="label"` — for fields that round-trip bare name strings with no
// usable id (e.g. account `categories_interested`). The pre-selected value
// hydrates as `{id: name, label: name}`; matching by label means the option
// still shows as checked even though its real id ('oem-abb') differs from the
// stored id ('ABB'). With the default `matchBy="id"` this row would render
// unchecked and toggling would create a duplicate.
function MatchByLabelDemo() {
  const [value, setValue] = React.useState<AsyncOption[]>([
    { id: 'ABB', label: 'ABB' },
  ])
  return (
    <div className="w-72">
      <AsyncMultiSelect
        value={value}
        onValueChange={setValue}
        useOptions={useOemOptions}
        toLabel={(o) => o.name}
        placeholder="Select by name…"
        matchBy="label"
      />
    </div>
  )
}

export const MatchByLabel: Story = {
  render: () => <MatchByLabelDemo />,
}

// `onItemsLoaded` — fires with the full set of loaded rows as option pages
// stream in. Used by delta-membership pickers (e.g. "manage child accounts")
// to auto-check rows that already belong to the set without pre-fetching the
// whole membership list. Here we treat OEMs whose id ends in a vowel as
// "already members" and auto-select them the moment they load.
function OnItemsLoadedDemo() {
  const [value, setValue] = React.useState<AsyncOption[]>([])
  const seededRef = React.useRef(new Set<string>())
  const isMember = (o: { id: string }) => /[aeiou]$/.test(o.id)

  const onItemsLoaded = React.useCallback(
    (items: Array<{ id: string; name: string }>) => {
      const seeded = seededRef.current
      const fresh: AsyncOption[] = []
      for (const it of items) {
        if (isMember(it) && !seeded.has(it.id)) {
          seeded.add(it.id)
          fresh.push({ id: it.id, label: it.name })
        }
      }
      if (fresh.length) {
        setValue((prev) => {
          const have = new Set(prev.map((p) => p.id))
          const add = fresh.filter((c) => !have.has(c.id))
          return add.length ? [...prev, ...add] : prev
        })
      }
    },
    [],
  )

  return (
    <div className="w-72">
      <AsyncMultiSelect
        value={value}
        onValueChange={setValue}
        useOptions={useOemOptions}
        onItemsLoaded={onItemsLoaded}
        toLabel={(o) => o.name}
        placeholder="Members auto-check on load…"
      />
    </div>
  )
}

export const OnItemsLoaded: Story = {
  render: () => <OnItemsLoadedDemo />,
}

// `summary` — overrides the trigger's "N options selected" text. Use when the
// `value` count would mislead (e.g. a delta-membership picker whose value only
// holds loaded rows, so the true total comes from an API `total`). Here we show
// a fixed total instead of the loaded count.
function SummaryDemo() {
  const [value, setValue] = React.useState<AsyncOption[]>([
    { id: 'oem-abb', label: 'ABB' },
  ])
  return (
    <div className="w-72">
      <AsyncMultiSelect
        value={value}
        onValueChange={setValue}
        useOptions={useOemOptions}
        toLabel={(o) => o.name}
        placeholder="Select OEMs…"
        summary="48 linked OEMs"
      />
    </div>
  )
}

export const SummaryOverride: Story = {
  render: () => <SummaryDemo />,
}

// `id` lands on the trigger, so a `<label htmlFor>` focuses and names the picker.
function WithLabelDemo() {
  const [value, setValue] = React.useState<AsyncOption[]>([])
  return (
    <div className="w-72 space-y-1.5">
      <label htmlFor="story-oem">OEM</label>
      <AsyncMultiSelect
        id="story-oem"
        value={value}
        onValueChange={setValue}
        useOptions={useOemOptions}
        toLabel={(o) => o.name}
        placeholder="Any OEM"
      />
    </div>
  )
}

export const WithLabel: Story = {
  render: () => <WithLabelDemo />,
}
