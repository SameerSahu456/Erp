import type { Meta, StoryObj } from '@storybook/react-vite'
import { Mail, Search, Send } from 'lucide-react'

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
} from './input-group'

const meta = {
  title: 'Forms/InputGroup',
  component: InputGroup,
  tags: ['autodocs'],
} satisfies Meta<typeof InputGroup>

export default meta
type Story = StoryObj<typeof meta>

export const LeadingIcon: Story = {
  render: () => (
    <InputGroup className="w-72">
      <InputGroupAddon align="inline-start">
        <Search />
      </InputGroupAddon>
      <InputGroupInput placeholder="Search…" />
    </InputGroup>
  ),
}

export const TrailingButton: Story = {
  render: () => (
    <InputGroup className="w-72">
      <InputGroupAddon align="inline-start">
        <Mail />
      </InputGroupAddon>
      <InputGroupInput placeholder="Recipient email" />
      <InputGroupAddon align="inline-end">
        <InputGroupButton aria-label="Send">
          <Send />
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  ),
}

export const TextAddon: Story = {
  render: () => (
    <InputGroup className="w-72">
      <InputGroupAddon align="inline-start">
        <InputGroupText>https://</InputGroupText>
      </InputGroupAddon>
      <InputGroupInput placeholder="example.com" />
    </InputGroup>
  ),
}
