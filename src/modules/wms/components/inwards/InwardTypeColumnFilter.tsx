import { Typography } from '@/components/ui/typography'
import { AsyncSelect, makeStaticAsyncOptions } from '@/components/ui/async-select'

import type { InwardType } from '../../api'
import { INWARD_TYPE_LABELS } from '../../constants'
import { INWARD_PAGE_STRINGS } from './inward-list.strings'

// Transfers are received on the transfer itself and never make a GRN, so this
// option could only ever show an empty list. The label stays for old rows.
const typeOptions = (Object.keys(INWARD_TYPE_LABELS) as InwardType[])
  .filter((code) => code !== 'warehouse_transfer_inward')
  .map((code) => ({ id: code, name: INWARD_TYPE_LABELS[code] }))
const typeOptionsHook = makeStaticAsyncOptions(typeOptions, (o) => o.name)

/** Inward Type filter on the column header. Status lives in the tabs; warehouse
 *  follows the navbar switcher. */
export function InwardTypeColumnFilter({
  value,
  onChange,
}: {
  value: string | undefined
  onChange: (v: string) => void
}) {
  const selected = typeOptions.find((o) => o.id === value)
  return (
    <div className="w-[190px]">
      <Typography variant="body-sm" asChild>
        <AsyncSelect
          value={selected ? { id: selected.id, label: selected.name } : null}
          onValueChange={(opt) => onChange(opt?.id ?? '__all__')}
          useOptions={typeOptionsHook}
          toLabel={(o) => o.name}
          placeholder={INWARD_PAGE_STRINGS.typeFilter.placeholder}
          searchPlaceholder={INWARD_PAGE_STRINGS.typeFilter.searchPlaceholder}
          className="h-10 w-full rounded-[7px] border-input bg-card px-[10px] shadow-xs"
          clearable
          chevron="down"
        />
      </Typography>
    </div>
  )
}
