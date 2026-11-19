import { useState } from "react"
import { ArrowDown, ArrowUp, Plus, X } from "lucide-react"
import { partOptionDescription } from "../../../lib/part-description"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Typography } from "@/components/ui/typography"
import { AsyncSelect, type AsyncSelectOption } from "@/components/ui/async-select"
import { usePermission } from "@shared/rbac"

import { imsCan } from "../../../permissions"
import {
  useKitVariantOptions,
  usePartKitItems,
  useReplacePartKit,
  type PartKitItem,
} from "../../../hooks/parts/usePartKit"
import { PART_KIT_STRINGS as S } from "./part-kit.strings"

interface Row {
  key: string
  variant: AsyncSelectOption | null
  label: string
}

const toRows = (items: readonly PartKitItem[]): Row[] =>
  items.map((i) => ({
    key: i.id,
    variant: i.part_variant_id ? { id: i.part_variant_id, label: i.display_name } : null,
    label: i.part_variant_id ? "" : (i.label ?? ""),
  }))

function KitEditor({ partId, items, canEdit }: { partId: string; items: PartKitItem[]; canEdit: boolean }) {
  const save = useReplacePartKit(partId)
  const [rows, setRows] = useState<Row[]>(() => toRows(items))
  const patch = (key: string, part: Partial<Row>) => setRows((r) => r.map((x) => (x.key === key ? { ...x, ...part } : x)))
  const move = (i: number, d: -1 | 1) =>
    setRows((r) => {
      const next = [...r]
      ;[next[i], next[i + d]] = [next[i + d], next[i]]
      return next
    })
  const complete = rows.every((r) => r.variant || r.label.trim())
  const submit = () =>
    save.mutate(rows.map((r) => (r.variant ? { part_variant_id: r.variant.id } : { label: r.label.trim() })))

  if (!canEdit && rows.length === 0) return <Typography variant="body" tone="muted">{S.empty}</Typography>
  return (
    <div className="space-y-3">
      {rows.length === 0 && <Typography variant="body" tone="muted">{S.empty}</Typography>}
      <ul className="space-y-2">
        {rows.map((r, i) => (
          <li key={r.key} className="grid gap-2 rounded-md border p-2 md:grid-cols-[1fr_1fr_auto] md:items-center">
            <AsyncSelect
              value={r.variant}
              onValueChange={(v) => patch(r.key, { variant: v, label: v ? "" : r.label })}
              useOptions={useKitVariantOptions}
              toLabel={(v) => `${v.part_name} · ${v.name}`}
              getDescription={partOptionDescription}
              placeholder={S.stockPlaceholder}
              disabled={!canEdit}
              clearable
              className="w-full"
            />
            <Input
              value={r.label}
              onChange={(e) => patch(r.key, { label: e.target.value })}
              placeholder={S.freeTextPlaceholder}
              aria-label={S.freeText}
              disabled={!canEdit || !!r.variant}
            />
            {canEdit && (
              <div className="flex shrink-0 gap-1">
                <Button size="icon-sm" variant="ghost" aria-label={S.moveUp} disabled={i === 0} onClick={() => move(i, -1)}>
                  <ArrowUp className="size-4" />
                </Button>
                <Button size="icon-sm" variant="ghost" aria-label={S.moveDown} disabled={i === rows.length - 1} onClick={() => move(i, 1)}>
                  <ArrowDown className="size-4" />
                </Button>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label={S.remove(r.variant?.label ?? r.label)}
                  onClick={() => setRows((x) => x.filter((y) => y.key !== r.key))}
                >
                  <X className="size-4" />
                </Button>
              </div>
            )}
          </li>
        ))}
      </ul>
      {canEdit && (
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => setRows((r) => [...r, { key: crypto.randomUUID(), variant: null, label: "" }])}>
            <Plus className="size-4" data-icon="inline-start" />
            {S.add}
          </Button>
          <Button onClick={submit} disabled={!complete || save.isPending}>
            {S.save}
          </Button>
          {!complete && (
            <Typography variant="helper" tone="muted">
              {S.incomplete}
            </Typography>
          )}
        </div>
      )}
    </div>
  )
}

/** Part detail › Kit — the template WMS ticks at dispatch and checks on return. */
export function PartKitTab({ partId }: { partId: string }) {
  const { can } = usePermission()
  const query = usePartKitItems(partId)
  return (
    <Card>
      <CardHeader>
        <CardTitle>{S.title}</CardTitle>
        <CardDescription>{S.description}</CardDescription>
      </CardHeader>
      <CardContent>
        {query.isLoading && <div className="h-24 animate-pulse rounded-md bg-muted" />}
        {query.data && <KitEditor partId={partId} items={query.data} canEdit={can([...imsCan.write])} />}
      </CardContent>
    </Card>
  )
}
