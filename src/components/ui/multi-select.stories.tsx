import * as React from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'

import { MultiSelect } from './multi-select'

const meta = {
  title: 'Forms/MultiSelect',
  component: MultiSelect,
  tags: ['autodocs'],
} satisfies Meta<typeof MultiSelect>

export default meta
type Story = StoryObj

const OPTIONS = ['Draft', 'Pending', 'Approved', 'Rejected', 'Archived'] as const

function Demo() {
  const [value, setValue] = React.useState<string[]>(['Pending'])
  return (
    <div className="w-72">
      <MultiSelect
        options={OPTIONS}
        value={value}
        onValueChange={setValue}
        placeholder="Select statuses…"
      />
    </div>
  )
}

export const Default: Story = {
  render: () => <Demo />,
}

// Mirrors the rentals device tracking toolbar: enum values shown by label,
// compact trigger, no search box for a short fixed list.
const LABELS: Record<string, string> = {
  'On Rent': 'On rent',
  Hold: 'On hold',
  Billed: 'Settled',
}

function ToolbarDemo() {
  const [value, setValue] = React.useState<string[]>(['On Rent', 'Hold'])
  return (
    <MultiSelect
      options={Object.keys(LABELS)}
      value={value}
      onValueChange={setValue}
      placeholder="All statuses"
      getOptionLabel={(option) => LABELS[option] ?? option}
      formatSelection={(selected) =>
        selected.length === 1 ? (LABELS[selected[0]] ?? selected[0]) : `${selected.length} statuses`
      }
      size="sm"
      searchable={false}
      className="w-[185px]"
    />
  )
}

export const CompactToolbarFilter: Story = {
  render: () => <ToolbarDemo />,
}
