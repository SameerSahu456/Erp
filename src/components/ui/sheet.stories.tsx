import type { Meta, StoryObj } from '@storybook/react-vite'

import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from './sheet'
import { Button } from './button'

const meta = {
  title: 'Overlays/Sheet',
  component: Sheet,
  tags: ['autodocs'],
} satisfies Meta<typeof Sheet>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <Sheet>
      <SheetTrigger render={<Button variant="outline">Open filters</Button>} />
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>Filters</SheetTitle>
          <SheetDescription>
            Narrow the list by status, owner, or date range.
          </SheetDescription>
        </SheetHeader>
        <SheetFooter>
          <SheetClose render={<Button>Apply</Button>} />
          <SheetClose render={<Button variant="outline">Cancel</Button>} />
        </SheetFooter>
      </SheetContent>
    </Sheet>
  ),
}

export const LeftSide: Story = {
  render: () => (
    <Sheet>
      <SheetTrigger render={<Button variant="outline">Open menu</Button>} />
      <SheetContent side="left" className="w-[260px]">
        <SheetHeader>
          <SheetTitle>Navigation</SheetTitle>
          <SheetDescription>Jump to a module.</SheetDescription>
        </SheetHeader>
      </SheetContent>
    </Sheet>
  ),
}
