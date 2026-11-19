import type { Meta, StoryObj } from '@storybook/react-vite'

import { Tabs, TabsList, TabsTrigger, TabsContent } from './tabs'

const meta = {
  title: 'Navigation/Tabs',
  component: Tabs,
  tags: ['autodocs'],
} satisfies Meta<typeof Tabs>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <Tabs defaultValue="overview" className="w-96">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="activity">Activity</TabsTrigger>
        <TabsTrigger value="notes">Notes</TabsTrigger>
      </TabsList>
      <TabsContent value="overview" className="pt-4">
        Summary information for this record.
      </TabsContent>
      <TabsContent value="activity" className="pt-4">
        Recent activity timeline.
      </TabsContent>
      <TabsContent value="notes" className="pt-4">
        Internal notes and remarks.
      </TabsContent>
    </Tabs>
  ),
}

export const LineVariant: Story = {
  render: () => (
    <Tabs defaultValue="open" className="w-96">
      <TabsList variant="line">
        <TabsTrigger value="open">Open</TabsTrigger>
        <TabsTrigger value="closed">Closed</TabsTrigger>
      </TabsList>
      <TabsContent value="open" className="pt-4">
        Open items.
      </TabsContent>
      <TabsContent value="closed" className="pt-4">
        Closed items.
      </TabsContent>
    </Tabs>
  ),
}
