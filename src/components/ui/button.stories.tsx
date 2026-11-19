import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'

import { Button } from './button'

const VARIANTS = [
  'default', 'outline', 'secondary', 'ghost', 'destructive', 'link',
  'success', 'warning', 'info',
  'primary-light', 'success-light', 'danger-light', 'warning-light', 'info-light',
  'primary-tertiary', 'success-tertiary', 'danger-tertiary', 'warning-tertiary', 'info-tertiary',
] as const

const meta = {
  title: 'Primitives/Button',
  component: Button,
  tags: ['autodocs'],
  args: { children: 'Button', variant: 'default', size: 'default' },
  argTypes: {
    variant: { control: 'select', options: VARIANTS },
    size: { control: 'select', options: ['xs', 'sm', 'default', 'lg', 'icon', 'icon-xs', 'icon-sm', 'icon-lg'] },
    shape: { control: 'inline-radio', options: ['default', 'rounded'] },
    disabled: { control: 'boolean' },
  },
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      {VARIANTS.map((v) => (
        <Button key={v} variant={v}>{v}</Button>
      ))}
    </div>
  ),
}

export const Sizes: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      {(['xs', 'sm', 'default', 'lg'] as const).map((s) => (
        <Button key={s} size={s}>{s}</Button>
      ))}
    </div>
  ),
}

export const Disabled: Story = { args: { disabled: true } }

// `storybook ai setup` CssCheck — the one mandatory proof that the design-token
// CSS pipeline actually loaded in the preview (toBeVisible passes even on an
// unstyled component; a concrete computed colour does not). The default Button
// uses `bg-primary`, which resolves to --primary → --color-slate-700 (#0F1B2D)
// in light mode. Pinned to Light so the asserted value is stable.
export const CssCheck: Story = {
  args: { children: 'Submit' },
  globals: { theme: 'Light' },
  play: async ({ canvas }) => {
    const button = canvas.getByRole('button', { name: /submit/i })
    await expect(getComputedStyle(button).backgroundColor).toBe('rgb(15, 27, 45)')
  },
}
