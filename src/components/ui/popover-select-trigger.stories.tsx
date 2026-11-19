import type { Meta, StoryObj } from '@storybook/react-vite'

import { Popover, PopoverContent } from './popover'
import { PopoverSelectTrigger } from './popover-select-trigger'

const meta = {
  title: 'Forms/PopoverSelectTrigger',
  component: PopoverSelectTrigger,
  tags: ['autodocs'],
} satisfies Meta<typeof PopoverSelectTrigger>

export default meta
type Story = StoryObj<typeof meta>

const sampleMenu = (
  <PopoverContent className="w-[var(--anchor-width)] p-2" align="start">
    <div className="flex flex-col gap-1 text-sm">
      <span className="rounded px-2 py-1 hover:bg-secondary">Acme Corp</span>
      <span className="rounded px-2 py-1 hover:bg-secondary">Globex Pvt Ltd</span>
      <span className="rounded px-2 py-1 hover:bg-secondary">Initech</span>
    </div>
  </PopoverContent>
)

// Empty single-select: shows the dropdown chevron and dimmed placeholder.
export const Empty: Story = {
  args: { children: 'Select an account…', hasValue: false, onClear: () => {} },
  render: (args) => (
    <div className="w-72">
      <Popover>
        <PopoverSelectTrigger {...args} />
        {sampleMenu}
      </Popover>
    </div>
  ),
}

// Value selected with a clear handler: chevron is swapped for the clear-"X".
export const Selected: Story = {
  args: { children: 'Acme Corp', hasValue: true, onClear: () => {} },
  render: (args) => (
    <div className="w-72">
      <Popover>
        <PopoverSelectTrigger {...args} />
        {sampleMenu}
      </Popover>
    </div>
  ),
}

// Multi-select (no onClear): the chevron stays even when values are present.
export const MultiSelect: Story = {
  args: { children: '2 owners selected', hasValue: true },
  render: (args) => (
    <div className="w-72">
      <Popover>
        <PopoverSelectTrigger {...args} />
        {sampleMenu}
      </Popover>
    </div>
  ),
}

// Disabled trigger.
export const Disabled: Story = {
  args: { children: 'Select an account…', hasValue: false, disabled: true },
  render: (args) => (
    <div className="w-72">
      <Popover>
        <PopoverSelectTrigger {...args} />
        {sampleMenu}
      </Popover>
    </div>
  ),
}

// Invalid form field: red border, like an invalid Input or Select.
export const Invalid: Story = {
  args: { children: 'Select a state…', hasValue: false, invalid: true },
  render: (args) => (
    <div className="w-72">
      <Popover>
        <PopoverSelectTrigger {...args} />
        {sampleMenu}
      </Popover>
    </div>
  ),
}
