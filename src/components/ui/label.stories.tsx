import type { Meta, StoryObj } from '@storybook/react-vite'

import { Checkbox } from './checkbox'
import { Input } from './input'
import { Label, RequiredMark } from './label'

const meta = {
  title: 'Forms/Label',
  component: Label,
  tags: ['autodocs'],
  argTypes: {
    required: { control: 'boolean' },
  },
} satisfies Meta<typeof Label>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: { children: 'Email address' },
}

export const Required: Story = {
  args: { children: 'Full name', required: true },
}

export const WithInput: Story = {
  render: () => (
    <div className="flex max-w-sm flex-col gap-2">
      <Label htmlFor="email" required>
        Email
      </Label>
      <Input id="email" type="email" placeholder="you@example.com" />
    </div>
  ),
}

/** The bare marker, for non-label contexts such as a grid column header. */
export const MarkerOnly: Story = {
  render: () => (
    <span className="text-xs font-semibold tracking-wider uppercase">
      Part Number
      <RequiredMark className="ml-0.5" />
    </span>
  ),
}

export const WithCheckbox: Story = {
  render: () => (
    <label className="flex items-center gap-2" htmlFor="terms">
      <Checkbox id="terms" />
      <Label htmlFor="terms">Accept terms and conditions</Label>
    </label>
  ),
}
