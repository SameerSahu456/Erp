import type { Meta, StoryObj } from '@storybook/react-vite'
import { Monitor, Moon, Palette, Sun } from 'lucide-react'

import { Button } from './button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './dropdown-menu'

const meta = {
  title: 'Navigation/DropdownMenu',
  component: DropdownMenu,
  tags: ['autodocs'],
} satisfies Meta<typeof DropdownMenu>

export default meta
type Story = StoryObj<typeof meta>

// Mirrors src/app/layouts/ThemeSwitcher.tsx — trigger via `render`, grouped items.
export const Default: Story = {
  render: () => (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" />}>
        <Palette className="h-4 w-4" />
        <span className="sr-only">Toggle color mode</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Mode</DropdownMenuLabel>
          <DropdownMenuItem>
            <Sun className="mr-2 h-4 w-4" />
            <span className="flex-1">Light</span>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Moon className="mr-2 h-4 w-4" />
            <span className="flex-1">Dark</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <Monitor className="mr-2 h-4 w-4" />
            <span className="flex-1">System</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
}
