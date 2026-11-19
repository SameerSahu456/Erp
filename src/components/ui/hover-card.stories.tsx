import type { Meta, StoryObj } from '@storybook/react-vite'

import { HoverCard, HoverCardContent, HoverCardTrigger } from './hover-card'
import { Button } from './button'

const meta = {
  title: 'Overlays/HoverCard',
  component: HoverCard,
  tags: ['autodocs'],
} satisfies Meta<typeof HoverCard>

export default meta
type Story = StoryObj<typeof meta>

// HoverCard wraps Base UI's PreviewCard — the trigger renders an `<a>` and
// opens on hover/focus, so we mirror that with a link-style trigger.
export const Default: Story = {
  render: () => (
    <HoverCard>
      <HoverCardTrigger
        render={
          <Button variant="link" className="px-0">
            @aisha
          </Button>
        }
      />
      <HoverCardContent>
        <div className="flex flex-col gap-1">
          <p className="font-medium">Aisha Khan</p>
          <p className="text-muted-foreground">
            Procurement Manager · joined May 2026
          </p>
        </div>
      </HoverCardContent>
    </HoverCard>
  ),
}
