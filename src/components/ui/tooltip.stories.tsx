import type { Meta, StoryObj } from '@storybook/react-vite'
import { InfoIcon } from 'lucide-react'

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './tooltip'
import { Button } from './button'

const meta = {
  title: 'Overlays/Tooltip',
  component: Tooltip,
  tags: ['autodocs'],
} satisfies Meta<typeof Tooltip>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <TooltipProvider delay={150}>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button variant="outline" size="icon-sm" aria-label="More info">
              <InfoIcon />
            </Button>
          }
        />
        <TooltipContent>Margin excludes freight and taxes</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ),
}

export const Open: Story = {
  render: () => (
    <TooltipProvider delay={0}>
      <Tooltip defaultOpen>
        <TooltipTrigger render={<Button variant="outline">Hover me</Button>} />
        <TooltipContent>Opens by default for the docs preview</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ),
}
