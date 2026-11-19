import type { Meta, StoryObj } from '@storybook/react-vite'

import { Input } from './input'

const meta = {
  title: 'Forms/Input',
  component: Input,
  tags: ['autodocs'],
  args: { placeholder: 'Type here…', variant: 'outline', inputSize: 'default' },
  argTypes: {
    variant: { control: 'inline-radio', options: ['outline', 'solid', 'tertiary', 'white'] },
    inputSize: { control: 'inline-radio', options: ['sm', 'default', 'lg'] },
    disabled: { control: 'boolean' },
  },
} satisfies Meta<typeof Input>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}

export const Variants: Story = {
  render: () => (
    <div className="flex max-w-sm flex-col gap-3">
      {(['outline', 'solid', 'tertiary', 'white'] as const).map((v) => (
        <Input key={v} variant={v} placeholder={v} />
      ))}
    </div>
  ),
}

export const Invalid: Story = {
  args: { 'aria-invalid': true, placeholder: 'Invalid input' },
}

/**
 * Numeric fields auto-enforce "≤ 1 decimal point, ≤ N digits after it" at the
 * keystroke/paste level — no per-field onChange filtering needed. The guard turns
 * on for `type="number"`, `inputMode="decimal"`, or the explicit `numeric` prop.
 * `decimals` tunes the fractional precision (default 2). Try typing `12.999` or
 * pasting `1.2345` — the extra fractional digits are rejected.
 */
export const NumericDecimalGuard: Story = {
  render: () => (
    <div className="flex max-w-sm flex-col gap-3">
      <Input type="number" placeholder="type=number (max 2 decimals)" />
      <Input inputMode="decimal" placeholder="text + inputMode=decimal" />
      <Input numeric decimals={3} placeholder="numeric, decimals={3}" />
    </div>
  ),
}
