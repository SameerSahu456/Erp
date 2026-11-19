import type { Meta, StoryObj } from '@storybook/react-vite'
import { LayoutDashboard, Package, Settings, Users } from 'lucide-react'

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from './sidebar'

const meta = {
  title: 'Data/Sidebar',
  component: Sidebar,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof Sidebar>

export default meta
type Story = StoryObj<typeof meta>

const NAV = [
  { label: 'Dashboard', Icon: LayoutDashboard, active: true },
  { label: 'Inventory', Icon: Package, active: false },
  { label: 'Users', Icon: Users, active: false },
  { label: 'Settings', Icon: Settings, active: false },
]

export const Default: Story = {
  render: () => (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader className="px-3 py-2 text-sm font-semibold">
          Comprint ERP
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Platform</SidebarGroupLabel>
            <SidebarMenu>
              {NAV.map(({ label, Icon, active }) => (
                <SidebarMenuItem key={label}>
                  <SidebarMenuButton isActive={active} tooltip={label}>
                    <Icon />
                    <span>{label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <div className="flex items-center gap-2 p-4">
          <SidebarTrigger />
          <span className="text-sm text-muted-foreground">
            Toggle the sidebar
          </span>
        </div>
      </SidebarInset>
    </SidebarProvider>
  ),
}
