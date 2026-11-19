import type { Meta, StoryObj } from '@storybook/react-vite'

import { Checkbox } from './checkbox'

const meta = {
  title: 'Forms/Checkbox',
  component: Checkbox,
  tags: ['autodocs'],
} satisfies Meta<typeof Checkbox>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = { args: { defaultChecked: true } }

export const States: Story = {
  render: () => (
    <div className="flex items-center gap-6">
      <Checkbox defaultChecked />
      <Checkbox />
      <Checkbox disabled defaultChecked />
    </div>
  ),
}
