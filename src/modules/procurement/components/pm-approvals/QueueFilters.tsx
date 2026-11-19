import { useState } from "react"

import { AsyncMultiSelect, type AsyncOption } from "@/components/ui/async-multi-select"
import { useAccountNames, useAccountOptions } from "@modules/crm"
import { getUserDisplayName, useUserOptions, useUsersByIds } from "@modules/users"

import { PM_APPROVALS_STRINGS } from "./pm-approvals.strings"

const S = PM_APPROVALS_STRINGS.queueFilters

// Option sources for the pickers — module-level hooks (the picker calls
// `useOptions` as a hook) with the filter-appropriate defaults.
function useAccountFilterOptions(search: string, opts?: { enabled?: boolean }) {
  return useAccountOptions(search, { enabled: opts?.enabled })
}
function useUserFilterOptions(search: string, opts?: { enabled?: boolean }) {
  return useUserOptions(search, { is_active: true }, opts)
}

/**
 * Selected ids → `{id, label}` chips. Labels picked in this session are kept
 * locally; ids that arrived via the URL (reload, Back) resolve through the
 * shared detail cache and show "…" until they do.
 */
function useChips(ids: string[], resolved: Record<string, string>) {
  const [picked, setPicked] = useState<Record<string, string>>({})
  const value: AsyncOption[] = ids.map((id) => ({
    id,
    label: picked[id] ?? resolved[id] ?? S.resolving,
  }))
  const remember = (next: AsyncOption[]) =>
    setPicked((prev) => ({ ...prev, ...Object.fromEntries(next.map((o) => [o.id, o.label])) }))
  return { value, remember }
}

/** Multi-select Account filter for a PM Approvals queue toolbar. */
export function AccountMultiFilter({
  value: ids,
  onChange,
}: {
  value: string[]
  onChange: (ids: string[]) => void
}) {
  const names = useAccountNames(ids)
  const { value, remember } = useChips(ids, names)
  return (
    // Sized by `.pm-queue-filter` (comprint.css) — the Accounts filter footprint.
    <div className="pm-queue-filter">
      <AsyncMultiSelect
        value={value}
        onValueChange={(next) => {
          remember(next)
          onChange(next.map((o) => o.id))
        }}
        useOptions={useAccountFilterOptions}
        toLabel={(account) => account.name}
        placeholder={S.allAccounts}
        summary={ids.length ? S.accountsSelected(ids.length) : ""}
        loadOnOpen
        nativeTitle
      />
    </div>
  )
}

/** Multi-select User filter — creator on most queues, created-or-submitted on
 *  SO, requester on Demo (the placeholder names which). */
export function UserMultiFilter({
  value: ids,
  onChange,
  placeholder = S.allUsers,
}: {
  value: string[]
  onChange: (ids: string[]) => void
  placeholder?: string
}) {
  const { displayNameById } = useUsersByIds(ids)
  const { value, remember } = useChips(ids, displayNameById)
  return (
    <div className="pm-queue-filter">
      <AsyncMultiSelect
        value={value}
        onValueChange={(next) => {
          remember(next)
          onChange(next.map((o) => o.id))
        }}
        useOptions={useUserFilterOptions}
        toLabel={(user) => getUserDisplayName(user)}
        placeholder={placeholder}
        summary={ids.length ? S.usersSelected(ids.length) : ""}
        loadOnOpen
        nativeTitle
      />
    </div>
  )
}
