import type { Meta, StoryObj } from '@storybook/react-vite'
import { Info, TriangleAlert } from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from './alert'

const meta = {
  title: 'Feedback/Alert',
  component: Alert,
  tags: ['autodocs'],
  argTypes: {
    variant: { control: 'inline-radio', options: ['default', 'destructive'] },
  },
} satisfies Meta<typeof Alert>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <Alert className="max-w-md">
      <Info />
      <AlertTitle>Heads up</AlertTitle>
      <AlertDescription>
        This alert uses semantic tokens, so it adapts automatically in dark mode.
      </AlertDescription>
    </Alert>
  ),
}

export const Destructive: Story = {
  render: () => (
    <Alert variant="destructive" className="max-w-md">
      <TriangleAlert />
      <AlertTitle>Something went wrong</AlertTitle>
      <AlertDescription>Your changes could not be saved. Please try again.</AlertDescription>
    </Alert>
  ),
}
