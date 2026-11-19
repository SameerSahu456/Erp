import type { Meta, StoryObj } from '@storybook/react-vite'
import { SlidersHorizontalIcon } from 'lucide-react'

import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from './popover'
import { Button } from './button'

const meta = {
  title: 'Overlays/Popover',
  component: Popover,
  tags: ['autodocs'],
} satisfies Meta<typeof Popover>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <Popover>
      <PopoverTrigger
        render={
          <Button variant="outline">
            <SlidersHorizontalIcon />
            Display
          </Button>
        }
      />
      <PopoverContent align="start">
        <PopoverHeader>
          <PopoverTitle>Display settings</PopoverTitle>
          <PopoverDescription>
            Choose which columns are visible in the table.
          </PopoverDescription>
        </PopoverHeader>
        <div className="flex flex-col gap-2 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" defaultChecked /> Status
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" defaultChecked /> Owner
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" /> Created date
          </label>
        </div>
      </PopoverContent>
    </Popover>
  ),
}
