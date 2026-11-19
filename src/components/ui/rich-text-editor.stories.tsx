import * as React from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'

import { RichTextEditor } from './rich-text-editor'

const meta = {
  title: 'Forms/RichTextEditor',
  component: RichTextEditor,
  tags: ['autodocs'],
} satisfies Meta<typeof RichTextEditor>

export default meta
type Story = StoryObj

function Demo() {
  const [value, setValue] = React.useState(
    '<p>Replace the <b>hydraulic seal</b> before reassembly.</p>',
  )
  return (
    <div className="w-96">
      <RichTextEditor
        value={value}
        onChange={setValue}
        placeholder="Add description…"
      />
    </div>
  )
}

export const Default: Story = {
  render: () => <Demo />,
}

/** Pasted content keeps its structure — e.g. a copied quote table renders as a
 *  grid (only scripts / event handlers / `javascript:` URLs are stripped). */
function TableDemo() {
  const [value, setValue] = React.useState(
    '<p><b>Quote QT-2026-001</b></p>' +
      '<table><thead><tr><th>Item</th><th>Qty</th><th>Price</th></tr></thead>' +
      '<tbody>' +
      '<tr><td>Hydraulic seal</td><td>4</td><td>₹1,200</td></tr>' +
      '<tr><td>Pump assembly</td><td>1</td><td>₹18,500</td></tr>' +
      '</tbody></table>',
  )
  return (
    <div className="w-96">
      <RichTextEditor value={value} onChange={setValue} />
    </div>
  )
}

export const WithPastedTable: Story = {
  render: () => <TableDemo />,
}

/** Content copied from elsewhere in the app arrives wrapped in the source's own
 *  chrome — Tailwind classes, `contenteditable="false"`, a scroll cap, the
 *  disabled fade. The sanitiser strips all of it so the paste lands as plain,
 *  editable text instead of a dead mini-editor nested inside this one. The
 *  value below is a verbatim copy of a Description field; it renders as just
 *  "GPU". */
function PastedAppChromeDemo() {
  const [value, setValue] = React.useState(
    '<div class="min-w-[220px] flex-[2]" style="font-size: medium;">' +
      '<div class="overflow-hidden rounded-[7px] border border-input bg-card opacity-60" style="border-style: solid; border-color: rgb(208, 213, 221); background-color: rgb(255, 255, 255);">' +
      '<div contenteditable="false" role="textbox" data-placeholder="Add description…" class="rte-content max-h-28 overflow-y-auto px-2.5 py-2" style="max-height: 112px; padding-inline: 10px;">GPU</div>' +
      '</div></div>',
  )
  return (
    <div className="w-96">
      <RichTextEditor value={value} onChange={setValue} />
    </div>
  )
}

export const PastedAppChrome: Story = {
  render: () => <PastedAppChromeDemo />,
}
