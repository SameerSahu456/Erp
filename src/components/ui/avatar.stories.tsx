import type { Meta, StoryObj } from '@storybook/react-vite'

import {
  Avatar,
  AvatarBadge,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
} from './avatar'

const meta = {
  title: 'Primitives/Avatar',
  component: Avatar,
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'select', options: ['sm', 'default', 'lg', '24', '28', '34', '40', '60', '80', '100'] },
    shape: { control: 'inline-radio', options: ['circle', 'rounded'] },
  },
} satisfies Meta<typeof Avatar>

export default meta
type Story = StoryObj<typeof meta>

export const Fallback: Story = {
  render: (args) => (
    <Avatar {...args}>
      <AvatarFallback>YC</AvatarFallback>
    </Avatar>
  ),
}

export const WithStatus: Story = {
  render: () => (
    <Avatar>
      <AvatarFallback>YC</AvatarFallback>
      <AvatarBadge status="online" />
    </Avatar>
  ),
}

export const Group: Story = {
  render: () => (
    <AvatarGroup>
      <Avatar><AvatarFallback>A</AvatarFallback></Avatar>
      <Avatar><AvatarFallback>B</AvatarFallback></Avatar>
      <Avatar><AvatarFallback>C</AvatarFallback></Avatar>
      <AvatarGroupCount>+5</AvatarGroupCount>
    </AvatarGroup>
  ),
}
