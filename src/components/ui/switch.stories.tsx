import type { Meta, StoryObj } from '@storybook/react-vite'

import { Switch } from './switch'

const meta = {
  title: 'Forms/Switch',
  component: Switch,
  tags: ['autodocs'],
  argTypes: { size: { control: 'inline-radio', options: ['sm', 'default'] } },
} satisfies Meta<typeof Switch>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = { args: { defaultChecked: true } }

export const States: Story = {
  render: () => (
    <div className="flex items-center gap-6">
      <Switch defaultChecked />
      <Switch />
      <Switch size="sm" defaultChecked />
      <Switch disabled defaultChecked />
    </div>
  ),
}
