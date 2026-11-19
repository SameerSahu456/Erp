import type { Meta, StoryObj } from '@storybook/react-vite'
import { Bold, Italic, Underline } from 'lucide-react'

import { Toggle } from './toggle'

const meta = {
  title: 'Forms/Toggle',
  component: Toggle,
  tags: ['autodocs'],
  argTypes: {
    variant: { control: 'inline-radio', options: ['default', 'outline'] },
    size: { control: 'inline-radio', options: ['sm', 'default', 'lg'] },
    disabled: { control: 'boolean' },
  },
} satisfies Meta<typeof Toggle>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: { 'aria-label': 'Toggle bold', children: <Bold /> },
}

export const Pressed: Story = {
  render: () => (
    <Toggle defaultPressed aria-label="Toggle italic">
      <Italic />
    </Toggle>
  ),
}

export const WithText: Story = {
  render: () => (
    <Toggle variant="outline">
      <Underline />
      Underline
    </Toggle>
  ),
}

export const States: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <Toggle aria-label="Off">
        <Bold />
      </Toggle>
      <Toggle defaultPressed aria-label="On">
        <Bold />
      </Toggle>
      <Toggle disabled aria-label="Disabled">
        <Bold />
      </Toggle>
    </div>
  ),
}
