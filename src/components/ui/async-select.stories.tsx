import * as React from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'

import {
  AsyncSelect,
  makeStaticAsyncOptions,
  type AsyncSelectOption,
} from './async-select'

const meta = {
  title: 'Forms/AsyncSelect',
  component: AsyncSelect,
  tags: ['autodocs'],
} satisfies Meta<typeof AsyncSelect>

export default meta
type Story = StoryObj

// `makeStaticAsyncOptions` adapts a plain array into the infinite-query shape
// AsyncSelect expects, so the story renders the full searchable UI with no
// backend round-trip (mirrors CrmDataTable's column-filter usage).
const WAREHOUSES = [
  { id: 'whse-mum', name: 'Mumbai DC' },
  { id: 'whse-del', name: 'Delhi DC' },
  { id: 'whse-blr', name: 'Bengaluru DC' },
  { id: 'whse-hyd', name: 'Hyderabad DC' },
  { id: 'whse-che', name: 'Chennai DC' },
]

const useWarehouseOptions = makeStaticAsyncOptions(WAREHOUSES, (w) => w.name)

function Demo() {
  const [value, setValue] = React.useState<AsyncSelectOption | null>({
    id: 'whse-mum',
    label: 'Mumbai DC',
  })
  return (
    <div className="w-72">
      <AsyncSelect
        value={value}
        onValueChange={setValue}
        useOptions={useWarehouseOptions}
        toLabel={(w) => w.name}
        placeholder="Select warehouse…"
        allOption="All warehouses"
        searchPlaceholder="Search warehouses…"
      />
    </div>
  )
}

export const Default: Story = {
  render: () => <Demo />,
}

// An empty source with caller-supplied copy — the Material Issue serial picker
// says "No available unit for this variant here." instead of "No options".
const useNoOptions = makeStaticAsyncOptions<{ id: string; name: string }>([], (w) => w.name)

export const CustomEmptyText: Story = {
  render: () => (
    <div className="w-72">
      <AsyncSelect
        value={null}
        onValueChange={() => {}}
        useOptions={useNoOptions}
        toLabel={(w) => w.name}
        placeholder="Select unit…"
        emptyText="No available unit for this variant here."
      />
    </div>
  ),
}

// Rows the backend would refuse stay visible but cannot be picked.
const BINS = [
  { id: 'bin-a1', name: 'A-01', full: false },
  { id: 'bin-a2', name: 'A-02 (full)', full: true },
  { id: 'bin-a3', name: 'A-03', full: false },
]
const useBinOptions = makeStaticAsyncOptions(BINS, (b) => b.name)

export const DisabledItems: Story = {
  render: () => (
    <div className="w-72">
      <AsyncSelect
        value={null}
        onValueChange={() => {}}
        useOptions={useBinOptions}
        toLabel={(b) => b.name}
        placeholder="Select bin…"
        isItemDisabled={(b) => b.full}
      />
    </div>
  ),
}

// A picker that also takes free text: Enter in the search box uses what was
// typed (the replacement-request "Part" field — a part typed by name).
function FreeTextDemo() {
  const [value, setValue] = React.useState<AsyncSelectOption | null>(null)
  return (
    <div className="w-72">
      <AsyncSelect
        value={value}
        onValueChange={setValue}
        useOptions={useNoOptions}
        toLabel={(w) => w.name}
        placeholder="Pick a part or type its name…"
        emptyText="Nothing listed — type the part's name and press Enter."
        onSearchEnter={(text) => setValue({ id: `typed:${text}`, label: `${text} (typed)` })}
      />
    </div>
  )
}

export const FreeTextOnEnter: Story = {
  render: () => <FreeTextDemo />,
}

// `getDescription` adds a muted, one-line (truncated) description under each
// option — part pickers use it so similar part numbers are easy to tell apart.
const PARTS = [
  {
    id: 'pv-1',
    title: '0JMN1 · Dell PowerEdge R740 fan',
    description: 'Hot-swap system fan for R740 / R740xd, 2U chassis, high-performance airflow',
  },
  { id: 'pv-2', title: '0JMN2 · Dell PowerEdge R740 fan', description: 'Standard fan, 2U' },
  { id: 'pv-3', title: 'P74651 · HPE 64GB DDR5', description: null },
]

const usePartOptions = makeStaticAsyncOptions(PARTS, (p) => `${p.title} ${p.description ?? ''}`)

export const WithDescription: Story = {
  render: () => (
    <div className="w-72">
      <AsyncSelect
        value={null}
        onValueChange={() => {}}
        useOptions={usePartOptions}
        toLabel={(p) => p.title}
        getDescription={(p) => p.description}
        placeholder="Select part…"
      />
    </div>
  ),
}
