import type { Meta, StoryObj } from '@storybook/react-vite'

import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from './resizable'

const meta = {
  title: 'Data/Resizable',
  component: ResizablePanelGroup,
  tags: ['autodocs'],
} satisfies Meta<typeof ResizablePanelGroup>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <ResizablePanelGroup
      orientation="horizontal"
      className="h-64 max-w-2xl rounded-lg border"
    >
      <ResizablePanel defaultSize={40}>
        <div className="flex h-full items-center justify-center p-6 text-sm">
          Sidebar
        </div>
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={60}>
        <div className="flex h-full items-center justify-center p-6 text-sm">
          Content
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  ),
}
