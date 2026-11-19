import type { Meta, StoryObj } from '@storybook/react-vite'

import { ScrollArea } from './scroll-area'

const meta = {
  title: 'Primitives/ScrollArea',
  component: ScrollArea,
  tags: ['autodocs'],
} satisfies Meta<typeof ScrollArea>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <ScrollArea className="h-48 w-64 rounded-md border">
      <div className="flex flex-col gap-2 p-4 text-sm">
        {Array.from({ length: 30 }, (_, i) => (
          <div key={i} className="rounded bg-muted/40 px-3 py-2">
            Item {i + 1}
          </div>
        ))}
      </div>
    </ScrollArea>
  ),
}
