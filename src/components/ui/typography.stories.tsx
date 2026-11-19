import type { Meta, StoryObj } from '@storybook/react-vite'

import { Typography } from './typography'

const VARIANTS = [
  'page-title', 'page-subtitle', 'section-title', 'subsection-title',
  'card-title', 'stat-value', 'card-meta', 'body', 'body-strong', 'body-sm', 'body-lg',
  'helper', 'caption', 'badge', 'micro', 'mono',
  'eyebrow', 'kpi-label', 'kpi-value', 'kpi-value-sm', 'kpi-label-sm', 'kpi-value-xs',
  'table-header', 'table-cell', 'table-name', 'table-figure', 'table-secondary', 'widget-subtitle',
] as const

const TONES = ['default', 'label', 'muted', 'primary', 'success', 'danger', 'warning', 'info'] as const

const meta = {
  title: 'Foundations/Typography',
  component: Typography,
  tags: ['autodocs'],
  args: { children: 'The quick brown fox jumps over the lazy dog', variant: 'body', tone: 'default' },
  argTypes: {
    variant: { control: 'select', options: VARIANTS },
    tone: { control: 'select', options: TONES },
    align: { control: 'inline-radio', options: ['start', 'center', 'end'] },
    truncate: { control: 'boolean' },
    numeric: { control: 'boolean' },
    children: { control: 'text' },
  },
} satisfies Meta<typeof Typography>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}

export const Scale: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      {VARIANTS.map((v) => (
        <Typography key={v} variant={v}>
          {v} — The quick brown fox jumps over the lazy dog
        </Typography>
      ))}
    </div>
  ),
}

export const Tones: Story = {
  render: () => (
    <div className="flex flex-col gap-1">
      {TONES.map((t) => (
        <Typography key={t} variant="body-strong" tone={t}>
          tone: {t}
        </Typography>
      ))}
    </div>
  ),
}

// The dashboard role variants together, in the four-level colour hierarchy:
// headings dark → labels (`label` tone) → content dark → secondary muted.
export const DashboardRoles: Story = {
  render: () => (
    <div className="flex max-w-md flex-col gap-4">
      <Typography variant="eyebrow">Revenue insights</Typography>
      <div className="rounded-xl border bg-card p-4">
        <Typography variant="card-title">Sales Team</Typography>
        <Typography variant="widget-subtitle">Revenue closed by each member</Typography>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <Typography variant="kpi-label">Team revenue</Typography>
            <Typography variant="kpi-value">₹1.58Cr</Typography>
          </div>
          <div>
            <Typography variant="kpi-label">Deals</Typography>
            <Typography variant="kpi-value-sm">3/29</Typography>
          </div>
        </div>
        {/* Dense tiles, 4 across — the smaller pair keeps labels untruncated. */}
        <div className="mt-3 grid grid-cols-4 gap-2 text-center">
          {['Leads', 'Unassigned leads', 'Deals', 'Unassigned deals'].map((l) => (
            <div key={l} className="min-w-0 rounded-md border px-2 py-1.5">
              <Typography variant="kpi-label-sm" className="block truncate">{l}</Typography>
              <Typography variant="kpi-value-xs">41</Typography>
            </div>
          ))}
        </div>
        <table className="mt-3 w-full">
          <thead>
            <tr>
              <th className="text-left"><Typography variant="table-header">Name</Typography></th>
              <th className="text-right"><Typography variant="table-header">Revenue</Typography></th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <Typography variant="table-cell" className="block font-medium">Bhavesh Moda</Typography>
                <Typography variant="table-secondary">4 orders</Typography>
              </td>
              <td className="text-right">
                <Typography variant="table-cell" numeric className="font-semibold">₹1.21Cr</Typography>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  ),
}

// Correct use of `asChild`: it clones a SINGLE element child (e.g. a Link),
// merging the typographic classes onto it. It must not be used with a plain
// string child — that throws React.Children.only(...).
export const AsChild: Story = {
  args: { asChild: true, variant: 'card-title' },
  render: (args) => (
    <Typography {...args}>
      <a href="#" className="underline underline-offset-2">
        A link rendered with card-title styles
      </a>
    </Typography>
  ),
}
