import type { Meta, StoryObj } from '@storybook/react-vite'

import { Progress, ProgressLabel, ProgressValue } from './progress'

const meta = {
  title: 'Forms/Progress',
  component: Progress,
  tags: ['autodocs'],
} satisfies Meta<typeof Progress>

export default meta
type Story = StoryObj

export const Default: Story = {
  render: () => (
    <div className="w-72">
      <Progress value={60} />
    </div>
  ),
}

export const WithLabel: Story = {
  render: () => (
    <div className="w-72">
      <Progress value={72}>
        <ProgressLabel>Uploading</ProgressLabel>
        <ProgressValue />
      </Progress>
    </div>
  ),
}

export const Colors: Story = {
  render: () => (
    <div className="flex w-72 flex-col gap-4">
      <Progress value={40} color="primary" />
      <Progress value={60} color="success" />
      <Progress value={80} color="warning" />
      <Progress value={30} color="danger" />
    </div>
  ),
}
