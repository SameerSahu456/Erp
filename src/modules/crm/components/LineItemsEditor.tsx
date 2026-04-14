import { Plus, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export interface LineItem {
  id: string
  item: string
  description: string
  qty: number
  rate: number
}

interface LineItemsEditorProps {
  items: LineItem[]
  onChange: (items: LineItem[]) => void
  className?: string
}

function generateId(): string {
  return `li-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function createEmptyItem(): LineItem {
  return { id: generateId(), item: '', description: '', qty: 1, rate: 0 }
}

function formatCurrency(value: number): string {
  return value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function LineItemsEditor({ items, onChange, className }: LineItemsEditorProps) {
  function updateItem(id: string, field: keyof Omit<LineItem, 'id'>, value: string | number) {
    onChange(
      items.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    )
  }

  function addItem() {
    onChange([...items, createEmptyItem()])
  }

  function removeItem(id: string) {
    if (items.length <= 1) return
    onChange(items.filter((item) => item.id !== id))
  }

  return (
    <div className={className}>
      <h3 className="mb-3 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
        Line Items
      </h3>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="w-10 px-3 py-2 text-left font-medium text-muted-foreground">#</th>
              <th className="min-w-[160px] px-3 py-2 text-left font-medium text-muted-foreground">Item</th>
              <th className="min-w-[200px] px-3 py-2 text-left font-medium text-muted-foreground">Description</th>
              <th className="w-24 px-3 py-2 text-right font-medium text-muted-foreground">Qty</th>
              <th className="w-32 px-3 py-2 text-right font-medium text-muted-foreground">Rate (&#8377;)</th>
              <th className="w-36 px-3 py-2 text-right font-medium text-muted-foreground">Amount (&#8377;)</th>
              <th className="w-14 px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {items.map((lineItem, index) => {
              const amount = lineItem.qty * lineItem.rate
              return (
                <tr key={lineItem.id} className="border-b last:border-b-0">
                  <td className="px-3 py-2 text-muted-foreground">{index + 1}</td>
                  <td className="px-2 py-1.5">
                    <Input
                      placeholder="Item name"
                      value={lineItem.item}
                      onChange={(e) => updateItem(lineItem.id, 'item', e.target.value)}
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <Input
                      placeholder="Description"
                      value={lineItem.description}
                      onChange={(e) => updateItem(lineItem.id, 'description', e.target.value)}
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <Input
                      type="number"
                      min={1}
                      className="text-right"
                      value={lineItem.qty}
                      onChange={(e) => updateItem(lineItem.id, 'qty', Number(e.target.value) || 0)}
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <Input
                      type="number"
                      min={0}
                      className="text-right"
                      value={lineItem.rate}
                      onChange={(e) => updateItem(lineItem.id, 'rate', Number(e.target.value) || 0)}
                    />
                  </td>
                  <td className="px-3 py-2 text-right font-medium tabular-nums">
                    &#8377;{formatCurrency(amount)}
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => removeItem(lineItem.id)}
                      disabled={items.length <= 1}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <Button variant="outline" size="sm" className="mt-3" onClick={addItem}>
        <Plus className="mr-1.5 size-4" />
        Add Line Item
      </Button>
    </div>
  )
}

export { LineItemsEditor, createEmptyItem, formatCurrency }
