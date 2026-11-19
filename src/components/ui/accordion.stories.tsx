import type { Meta, StoryObj } from '@storybook/react-vite'

import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from './accordion'

const meta = {
  title: 'Primitives/Accordion',
  component: Accordion,
  tags: ['autodocs'],
} satisfies Meta<typeof Accordion>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <Accordion className="w-80">
      <AccordionItem>
        <AccordionTrigger>What is an account?</AccordionTrigger>
        <AccordionContent>
          An account represents a company you do business with.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem>
        <AccordionTrigger>What is a contact?</AccordionTrigger>
        <AccordionContent>
          A contact is a person associated with an account.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem>
        <AccordionTrigger>What is a lead?</AccordionTrigger>
        <AccordionContent>
          A lead is a potential opportunity not yet qualified.
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
}
