import type { ComponentType } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { toast } from 'sonner'

import { ThemeProvider } from '@/contexts/ThemeContext'
import { Button } from './button'
import { Toaster } from './sonner'

const meta = {
  title: 'Feedback/Toast',
  component: Toaster,
  tags: ['autodocs'],
  // Toaster reads the active color mode via useTheme(), so it must render
  // inside ThemeProvider — the global preview decorator only sets the
  // data-theme attribute, not the React context.
  decorators: [
    (Story: ComponentType) => (
      <ThemeProvider>
        <Story />
      </ThemeProvider>
    ),
  ],
} satisfies Meta<typeof Toaster>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      <Button onClick={() => toast('Saved')}>Show toast</Button>
      <Button variant="success" onClick={() => toast.success('Part created')}>
        Success
      </Button>
      <Button
        variant="destructive"
        onClick={() => toast.error('Something went wrong')}
      >
        Error
      </Button>
      <Toaster />
    </div>
  ),
}
