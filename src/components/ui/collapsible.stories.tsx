import type { Meta, StoryObj } from '@storybook/react-vite'

import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from './collapsible'

const meta = {
  title: 'Primitives/Collapsible',
  component: Collapsible,
  tags: ['autodocs'],
} satisfies Meta<typeof Collapsible>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <Collapsible defaultOpen className="w-72">
      <CollapsibleTrigger className="text-sm font-medium underline-offset-4 hover:underline">
        Toggle details
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-2 rounded-md border p-3 text-sm text-muted-foreground">
          Hidden content revealed by the trigger above.
        </div>
      </CollapsibleContent>
    </Collapsible>
  ),
}
