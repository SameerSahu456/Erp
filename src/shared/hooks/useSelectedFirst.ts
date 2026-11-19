import { useState } from "react";

/**
 * Selection captured at the moment a dropdown opens, held until the next open.
 *
 * Dropdowns float their selected rows to the top so the user sees what is
 * already chosen. Sorting from the LIVE selection would make a row jump to the
 * top the instant it is ticked — under the cursor, mid multi-select. Sorting
 * from this snapshot instead keeps the list still while open and re-orders on
 * the next open.
 *
 * The snapshot is deliberately NOT swapped back to the live value on close: the
 * popover keeps rendering through its exit animation, and re-sorting then makes
 * the list visibly reshuffle as it fades out. It only refreshes on the next open.
 *
 * Uses the "adjust state during render" pattern (no effect) so the very first
 * open frame is already sorted — an effect would paint unsorted, then jump.
 */
export function useOpenSnapshot<T>(open: boolean, current: T): T {
  const [prevOpen, setPrevOpen] = useState(open);
  const [snapshot, setSnapshot] = useState<T>(current);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setSnapshot(current);
  }
  return snapshot;
}

/**
 * Stable partition: rows whose key is in `pinnedKeys` first, the rest after,
 * each group keeping its original order. Returns the same array when nothing is
 * pinned so memoised consumers don't re-render for no reason.
 */
export function selectedFirst<T>(
  items: readonly T[],
  getKey: (item: T) => string,
  pinnedKeys: ReadonlySet<string>,
): T[] {
  if (pinnedKeys.size === 0) return items as T[];
  const head: T[] = [];
  const tail: T[] = [];
  for (const item of items) (pinnedKeys.has(getKey(item)) ? head : tail).push(item);
  return head.length === 0 ? (items as T[]) : [...head, ...tail];
}

/**
 * Selected rows first, then the rest of the paged list.
 *
 * Dropdown lists are paginated, so a selected option may sit on a page that has
 * not loaded — pinning only what happens to be loaded would show some selected
 * rows on top and miss the others. `pinnedIds` (the selection as of open, see
 * `useOpenSnapshot`) is therefore resolved row by row: the loaded row when the
 * page has it, otherwise `resolveMissing(id)` (a cached by-id fetch). A row that
 * cannot be resolved yet is skipped and appears once its fetch lands. The paged
 * list that follows omits the pinned ids, so nothing renders twice and infinite
 * scroll carries on unchanged beneath the pinned block.
 *
 * `keep` narrows the pinned block while a search term is active: loaded rows are
 * already server-filtered, but a resolved-by-id row is not.
 */
export function pinSelected<T extends { id: string }>(
  loaded: readonly T[],
  pinnedIds: readonly string[],
  resolveMissing: (id: string) => T | undefined,
  keep: (item: T) => boolean = () => true,
): T[] {
  if (pinnedIds.length === 0) return loaded as T[];
  const loadedById = new Map(loaded.map((i) => [i.id, i] as const));
  const pinnedSet = new Set(pinnedIds);
  const head: T[] = [];
  for (const id of pinnedIds) {
    const item = loadedById.get(id) ?? resolveMissing(id);
    if (item && keep(item)) head.push(item);
  }
  const tail = loaded.filter((i) => !pinnedSet.has(i.id));
  return head.length === 0 ? tail : [...head, ...tail];
}
