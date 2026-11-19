import { Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { PURCHASE_REQUESTS_STRINGS } from "./purchase-requests.strings"
import { IMS_CATEGORIES } from "../../types"
import type { PurchaseRequestFormController } from "../../hooks/purchase-requests/usePurchaseRequestForm"

const ITEMS_STRINGS = PURCHASE_REQUESTS_STRINGS.items

export function PurchaseRequestItemsTable({ form }: { form: PurchaseRequestFormController }) {
  const { items, updateItem, addItem, removeItem } = form

  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
        {ITEMS_STRINGS.heading}
      </h3>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="w-10 px-3 py-2 text-left font-medium text-muted-foreground">{ITEMS_STRINGS.columns.index}</th>
              <th className="min-w-[130px] px-3 py-2 text-left font-medium text-muted-foreground">{ITEMS_STRINGS.columns.item}</th>
              <th className="min-w-[120px] px-3 py-2 text-left font-medium text-muted-foreground">{ITEMS_STRINGS.columns.category}</th>
              <th className="w-16 px-3 py-2 text-right font-medium text-muted-foreground">{ITEMS_STRINGS.columns.qty}</th>
              <th className="w-28 px-3 py-2 text-right font-medium text-muted-foreground">{ITEMS_STRINGS.columns.estRate}</th>
              <th className="w-28 px-3 py-2 text-right font-medium text-muted-foreground">{ITEMS_STRINGS.columns.confirmed}</th>
              <th className="w-28 px-3 py-2 text-left font-medium text-muted-foreground">{ITEMS_STRINGS.columns.available}</th>
              <th className="min-w-[120px] px-3 py-2 text-left font-medium text-muted-foreground">{ITEMS_STRINGS.columns.vendorNotes}</th>
              <th className="w-14 px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={item.id} className="border-b last:border-b-0">
                <td className="px-3 py-2 text-muted-foreground">{index + 1}</td>
                <td className="px-2 py-1.5">
                  <Input
                    placeholder={ITEMS_STRINGS.itemPlaceholder}
                    value={item.item}
                    onChange={(e) => updateItem(item.id, "item", e.target.value)}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <Select
                    value={item.category}
                    onValueChange={(val) => updateItem(item.id, "category", val ?? "")}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={ITEMS_STRINGS.categoryPlaceholder} />
                    </SelectTrigger>
                    <SelectContent>
                      {IMS_CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-2 py-1.5">
                  <Input
                    type="number"
                    min={1}
                    className="text-right"
                    value={item.qty}
                    onChange={(e) => updateItem(item.id, "qty", Number(e.target.value) || 0)}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <Input
                    type="number"
                    min={0}
                    className="text-right"
                    value={item.estimatedRate ?? ""}
                    onChange={(e) => updateItem(item.id, "estimatedRate", Number(e.target.value) || 0)}
                    placeholder="0"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <Input
                    type="number"
                    min={0}
                    className="text-right"
                    value={item.confirmedRate ?? ""}
                    onChange={(e) => updateItem(item.id, "confirmedRate", Number(e.target.value) || 0)}
                    placeholder="0"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <Input
                    type="date"
                    value={item.availableDate ?? ""}
                    onChange={(e) => updateItem(item.id, "availableDate", e.target.value)}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <Input
                    placeholder={ITEMS_STRINGS.vendorNotesPlaceholder}
                    value={item.vendorNotes ?? ""}
                    onChange={(e) => updateItem(item.id, "vendorNotes", e.target.value)}
                  />
                </td>
                <td className="px-2 py-1.5 text-center">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => removeItem(item.id)}
                    disabled={items.length <= 1}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Button variant="outline" size="sm" className="mt-3" onClick={addItem}>
        <Plus className="mr-1.5 size-4" />
        {ITEMS_STRINGS.addItem}
      </Button>
    </div>
  )
}
