import type { Meta, StoryObj } from '@storybook/react-vite'

import { Badge } from './badge'

const VARIANTS = [
  'default', 'secondary', 'destructive', 'outline', 'ghost', 'link',
  'success', 'warning', 'info', 'grey',
  'primary-soft', 'success-soft', 'danger-soft', 'warning-soft', 'info-soft', 'grey-soft',
] as const

const meta = {
  title: 'Primitives/Badge',
  component: Badge,
  tags: ['autodocs'],
  args: { children: 'Badge', variant: 'default' },
  argTypes: {
    variant: { control: 'select', options: VARIANTS },
    size: { control: 'inline-radio', options: ['sm', 'default', 'lg'] },
    shape: { control: 'inline-radio', options: ['rounded', 'pill'] },
  },
} satisfies Meta<typeof Badge>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-2">
      {VARIANTS.map((v) => (
        <Badge key={v} variant={v}>{v}</Badge>
      ))}
    </div>
  ),
}
