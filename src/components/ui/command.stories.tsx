import type { Meta, StoryObj } from '@storybook/react-vite'
import { Calendar, Settings, User } from 'lucide-react'

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from './command'

const meta = {
  title: 'Navigation/Command',
  component: Command,
  tags: ['autodocs'],
} satisfies Meta<typeof Command>

export default meta
type Story = StoryObj<typeof meta>

// Mirrors the part-combobox popup in wms/.../InwardFormPage.tsx.
export const Default: Story = {
  render: () => (
    <div className="w-72 rounded-lg border shadow-md">
      <Command>
        <CommandInput placeholder="Type a command or search…" />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup>
            <CommandItem>
              <Calendar />
              Calendar
            </CommandItem>
            <CommandItem>
              <User />
              Profile
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup>
            <CommandItem>
              <Settings />
              Settings
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    </div>
  ),
}
