import type { Meta, StoryObj } from '@storybook/react-vite'

import { Label } from './label'
import { RadioGroup, RadioGroupItem } from './radio-group'

const meta = {
  title: 'Forms/RadioGroup',
  component: RadioGroup,
  tags: ['autodocs'],
} satisfies Meta<typeof RadioGroup>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <RadioGroup defaultValue="view">
      <label className="flex items-center gap-3" htmlFor="perm-view">
        <RadioGroupItem id="perm-view" value="view" />
        <Label htmlFor="perm-view">View</Label>
      </label>
      <label className="flex items-center gap-3" htmlFor="perm-manage">
        <RadioGroupItem id="perm-manage" value="manage" />
        <Label htmlFor="perm-manage">View and edit</Label>
      </label>
      <label className="flex items-center gap-3" htmlFor="perm-none">
        <RadioGroupItem id="perm-none" value="none" />
        <Label htmlFor="perm-none">No access</Label>
      </label>
    </RadioGroup>
  ),
}

export const Disabled: Story = {
  render: () => (
    <RadioGroup defaultValue="one" disabled>
      <label className="flex items-center gap-3" htmlFor="opt-one">
        <RadioGroupItem id="opt-one" value="one" />
        <Label htmlFor="opt-one">Option one</Label>
      </label>
      <label className="flex items-center gap-3" htmlFor="opt-two">
        <RadioGroupItem id="opt-two" value="two" />
        <Label htmlFor="opt-two">Option two</Label>
      </label>
    </RadioGroup>
  ),
}
