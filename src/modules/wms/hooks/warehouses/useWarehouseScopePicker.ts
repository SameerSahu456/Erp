import { useEffect, useMemo, useRef, useState } from 'react'

import { useWarehouseScope } from '../../context/warehouse-scope'
import { useWarehousePickerInfinite } from './useWarehouses'

/** State + data for the navbar warehouse switcher (`WarehouseScopePicker`). */
export function useWarehouseScopePicker() {
  const scope = useWarehouseScope()
  const { pickerWarehouses, isFullAccess } = scope

  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  // Full-access: server-side, debounced, infinite list — enabled only while the
  // menu is open, so nothing loads until the operator opens the picker.
  const infinite = useWarehousePickerInfinite(search, {
    enabled: isFullAccess && open,
  })
  const infiniteItems = useMemo(
    () => (infinite.data?.pages ?? []).flatMap((p) => p.items),
    [infinite.data],
  )
  const { fetchNextPage, hasNextPage, isFetchingNextPage } = infinite

  // Scoped users: client-filter their small, already-loaded assignment list.
  const scopedFiltered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return q ? pickerWarehouses.filter((w) => w.name.toLowerCase().includes(q)) : pickerWarehouses
  }, [pickerWarehouses, search])

  // Infinite-scroll: fetch the next page when the bottom sentinel enters the
  // scroll box (rootMargin preloads just before it's reached).
  const scrollRef = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!isFullAccess || !open) return
    const root = scrollRef.current
    const target = sentinelRef.current
    if (!root || !target) return
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          void fetchNextPage()
        }
      },
      { root, rootMargin: '80px' },
    )
    io.observe(target)
    return () => io.disconnect()
  }, [isFullAccess, open, hasNextPage, isFetchingNextPage, fetchNextPage, infiniteItems.length])

  return {
    ...scope,
    open,
    setOpen,
    search,
    setSearch,
    infiniteIsLoading: infinite.isLoading,
    infiniteItems,
    isFetchingNextPage,
    scopedFiltered,
    scrollRef,
    sentinelRef,
  }
}
