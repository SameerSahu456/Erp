import type { Meta, StoryObj } from '@storybook/react-vite'

import { AspectRatio } from './aspect-ratio'

const meta = {
  title: 'Primitives/AspectRatio',
  component: AspectRatio,
  tags: ['autodocs'],
} satisfies Meta<typeof AspectRatio>

export default meta
type Story = StoryObj

export const Widescreen: Story = {
  render: () => (
    <div className="w-80">
      <AspectRatio ratio={16 / 9}>
        <div className="flex size-full items-center justify-center rounded-md bg-primary/15 text-sm text-primary">
          16 / 9
        </div>
      </AspectRatio>
    </div>
  ),
}

export const Square: Story = {
  render: () => (
    <div className="w-64">
      <AspectRatio ratio={1}>
        <div className="flex size-full items-center justify-center rounded-md bg-muted text-sm text-muted-foreground">
          1 / 1
        </div>
      </AspectRatio>
    </div>
  ),
}
