import type { Meta, StoryObj } from '@storybook/react-vite'

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from './card'
import { Button } from './button'
import { Badge } from './badge'

const meta = {
  title: 'Primitives/Card',
  component: Card,
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'inline-radio', options: ['default', 'sm'] },
  },
} satisfies Meta<typeof Card>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: (args) => (
    <Card {...args} className="max-w-sm">
      <CardHeader className="border-b">
        <div>
          <CardTitle>Sales order SO-1042</CardTitle>
          <CardDescription>Created 30 May 2026 · awaiting approval</CardDescription>
        </div>
        <CardAction>
          <Badge variant="warning-soft">Pending</Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="py-3 text-muted-foreground">
        3 line items · ₹2,40,000 total. Approval routed to the procurement manager.
      </CardContent>
      <CardFooter>
        <Button size="sm" variant="outline">View</Button>
        <Button size="sm" className="ml-2">Approve</Button>
      </CardFooter>
    </Card>
  ),
}
