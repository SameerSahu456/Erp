import * as React from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'

import { CategoryCombobox, type CategoryOption } from './category-combobox'

const meta = {
  title: 'Forms/CategoryCombobox',
  component: CategoryCombobox,
  tags: ['autodocs'],
} satisfies Meta<typeof CategoryCombobox>

export default meta
type Story = StoryObj

// Plain in-memory tree — CategoryCombobox flattens `parent_id` into an
// indented list, so no backend/query layer is involved.
const CATEGORIES: CategoryOption[] = [
  { id: 'elec', name: 'Electronics', parent_id: null, display_order: 0 },
  { id: 'pumps', name: 'Pumps', parent_id: null, display_order: 1 },
  { id: 'sensors', name: 'Sensors', parent_id: 'elec', display_order: 0 },
  { id: 'controllers', name: 'Controllers', parent_id: 'elec', display_order: 1 },
  { id: 'hydraulic', name: 'Hydraulic', parent_id: 'pumps', display_order: 0 },
]

function Demo() {
  const [value, setValue] = React.useState<string | null>('sensors')
  return (
    <div className="w-72">
      <CategoryCombobox
        categories={CATEGORIES}
        value={value}
        onChange={setValue}
      />
    </div>
  )
}

export const Default: Story = {
  render: () => <Demo />,
}
