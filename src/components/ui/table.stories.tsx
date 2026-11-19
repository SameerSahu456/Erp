import type { Meta, StoryObj } from '@storybook/react-vite'

import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './table'

const meta = {
  title: 'Data/Table',
  component: Table,
  tags: ['autodocs'],
} satisfies Meta<typeof Table>

export default meta
type Story = StoryObj<typeof meta>

const ROWS = [
  { id: 'PRT-001', name: 'Hydraulic Pump', qty: 12, status: 'In stock' },
  { id: 'PRT-002', name: 'Drive Belt', qty: 4, status: 'Low' },
  { id: 'PRT-003', name: 'Control Valve', qty: 0, status: 'Out of stock' },
]

export const Default: Story = {
  render: () => (
    <Table>
      <TableCaption>Inventory snapshot</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Part #</TableHead>
          <TableHead>Name</TableHead>
          <TableHead className="text-right">Qty</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {ROWS.map((row) => (
          <TableRow key={row.id}>
            <TableCell className="font-medium">{row.id}</TableCell>
            <TableCell>{row.name}</TableCell>
            <TableCell className="text-right">{row.qty}</TableCell>
            <TableCell>{row.status}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  ),
}
