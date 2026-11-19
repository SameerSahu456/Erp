import type { Meta, StoryObj } from '@storybook/react-vite'

import { Slider } from './slider'

const meta = {
  title: 'Forms/Slider',
  component: Slider,
  tags: ['autodocs'],
} satisfies Meta<typeof Slider>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <div className="w-72">
      <Slider defaultValue={[50]} />
    </div>
  ),
}

export const Range: Story = {
  render: () => (
    <div className="w-72">
      <Slider defaultValue={[25, 75]} />
    </div>
  ),
}

export const Stepped: Story = {
  render: () => (
    <div className="w-72">
      <Slider defaultValue={[40]} min={0} max={100} step={10} />
    </div>
  ),
}

export const Disabled: Story = {
  render: () => (
    <div className="w-72">
      <Slider defaultValue={[60]} disabled />
    </div>
  ),
}
