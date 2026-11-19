import type { Meta, StoryObj } from '@storybook/react-vite'

import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from './drawer'
import { Button } from './button'

const meta = {
  title: 'Overlays/Drawer',
  component: Drawer,
  tags: ['autodocs'],
} satisfies Meta<typeof Drawer>

export default meta
type Story = StoryObj<typeof meta>

// Drawer is backed by `vaul` (Radix Dialog under the hood), so triggers and
// close buttons compose with Radix's `asChild` rather than Base UI's `render`.
export const Default: Story = {
  render: () => (
    <Drawer>
      <DrawerTrigger asChild>
        <Button variant="outline">Open drawer</Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Move stock item</DrawerTitle>
          <DrawerDescription>
            Pick a destination warehouse to transfer this item.
          </DrawerDescription>
        </DrawerHeader>
        <DrawerFooter>
          <Button>Confirm transfer</Button>
          <DrawerClose asChild>
            <Button variant="outline">Cancel</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  ),
}
