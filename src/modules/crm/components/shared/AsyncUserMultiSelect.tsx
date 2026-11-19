import { useMemo, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";

import {
  FIRST_PAGE,
  nextPage,
  type PageResponse,
} from "@/shared/api/pagination";

import { Checkbox } from "@/components/ui/checkbox";
import { Popover } from "@/components/ui/popover";
import { PopoverSelectTrigger } from "@/components/ui/popover-select-trigger";
import { cn } from "@/lib/utils";
import { API, PAGINATION, UI } from "@/shared/constants";
import { useDebounce } from "@/shared/hooks";

import {
  getUserDisplayName,
  usePinnedUserRows,
  useUserOptions,
  type UserListItem,
} from "@modules/users";

import { InfiniteScrollPickerContent } from "./InfiniteScrollPickerContent";
import { CRM_SHARED_STRINGS } from "./crm-shared.strings";

/** The fields an option row reads — a `UserListItem` has them, and so does
 *  any narrower user projection an endpoint returns. */
export type UserOptionItem = Pick<
  UserListItem,
  "id" | "first_name" | "last_name" | "email"
>;

/** A custom option list for the picker, in place of "every active user".
 *  `fetchPage` gets the debounced search plus a page number and size and
 *  returns that standard page. `queryKey` must
 *  identify the source and every input other than search/page. */
export interface UserOptionsSource {
  queryKey: readonly unknown[];
  fetchPage: (args: {
    search: string | undefined;
    page: number;
    page_size: number;
  }) => Promise<PageResponse<UserOptionItem>>;
}

interface AsyncUserMultiSelectProps {
  /** Selected user ids. */
  value: string[];
  onValueChange: (ids: string[]) => void;
  /** Shown in the trigger; the count is appended when users are selected. */
  label: string;
  /** Optional placeholder when nothing is selected (defaults to `label`). */
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  /** Scope the picker to a reporting subtree. See `useUserOptions.filters.manager_id`
   *  — the manager themselves is excluded, so callers that want "self + reports"
   *  must OR the actor id on the FE. */
  managerId?: string;
  /** OPT-IN. Load options from this source instead of the users directory
   *  (e.g. only the users who own a listed account). Omitted → the default
   *  active-users list, unchanged. `managerId` is ignored when set. */
  optionsSource?: UserOptionsSource;
}

/**
 * Toolbar-style multi-select user filter. API-backed via `useUserOptions`
 * (infinite scroll + debounced search, §16.11). Selecting a row toggles its id
 * in `value` without closing the popover. The trigger shows "<label> (N)".
 */
export function AsyncUserMultiSelect({
  value,
  onValueChange,
  label,
  placeholder,
  className,
  disabled = false,
  managerId,
  optionsSource,
}: AsyncUserMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [rawSearch, setRawSearch] = useState("");
  const debouncedSearch = useDebounce(rawSearch.trim(), UI.DEBOUNCE_SEARCH_MS);

  // Only fetch while the popover is open. Both queries are always declared
  // (rules of hooks); exactly one is enabled — the custom source when given,
  // else the active-users directory.
  const directory = useUserOptions(
    debouncedSearch,
    { is_active: true, manager_id: managerId },
    { enabled: open && !optionsSource },
  );
  const pageSize = PAGINATION.INFINITE_SCROLL_BATCH;
  const custom = useInfiniteQuery({
    queryKey: [
      ...(optionsSource?.queryKey ?? ["user-options-source", "none"]),
      debouncedSearch,
    ],
    queryFn: ({ pageParam }) =>
      (optionsSource as UserOptionsSource).fetchPage({
        search: debouncedSearch || undefined,
        page: pageParam,
        page_size: pageSize,
      }),
    initialPageParam: FIRST_PAGE,
    getNextPageParam: nextPage,
    staleTime: API.STALE_TIME_MS,
    enabled: open && !!optionsSource,
  });
  const active = optionsSource ? custom : directory;
  const {
    isLoading,
    isError,
    error,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = active;

  const directoryPages = directory.data?.pages;
  const customPages = custom.data?.pages;
  const loadedItems = useMemo<UserOptionItem[]>(
    () =>
      ((optionsSource ? customPages : directoryPages) ?? []).flatMap(
        (p: { items: UserOptionItem[] }) => p.items,
      ),
    [optionsSource, customPages, directoryPages],
  );
  // Selected users first (as of open, not live), including ones on pages not
  // loaded yet; the paged list continues beneath them.
  const items = usePinnedUserRows({
    open,
    selectedIds: value,
    loaded: loadedItems,
    search: debouncedSearch,
  });
  const selectedSet = useMemo(() => new Set(value), [value]);

  function toggle(id: string) {
    onValueChange(
      selectedSet.has(id) ? value.filter((v) => v !== id) : [...value, id],
    );
  }

  function clearAll(e: React.MouseEvent) {
    e.stopPropagation();
    onValueChange([]);
  }

  const summary =
    value.length > 0 ? `${label} (${value.length})` : (placeholder ?? label);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverSelectTrigger
        dimWhenEmpty={false}
        hasValue={value.length > 0}
        onClear={clearAll}
        clearLabel={`Clear ${label.toLowerCase()}`}
        title={value.length > 0 ? `${label}: ${value.length} selected` : label}
        className={className}
        disabled={disabled}
      >
        {summary}
      </PopoverSelectTrigger>
      <InfiniteScrollPickerContent
        // The trigger is a narrow toolbar chip (~170–190px) but user rows carry
        // a full name over an email — widen the panel past the anchor so names
        // like "ADITYA PM JAISWAL" read in full, capped at the viewport (§8.7).
        contentClassName="w-[min(20rem,calc(100vw-2rem))] min-w-(--anchor-width)"
        search={{
          value: rawSearch,
          onChange: setRawSearch,
          placeholder: CRM_SHARED_STRINGS.userMultiSelect.searchPlaceholder,
        }}
        query={{
          isLoading,
          isError,
          error,
          hasNextPage,
          isFetchingNextPage,
          fetchNextPage,
        }}
        items={items}
        errorText={CRM_SHARED_STRINGS.userMultiSelect.loadError}
        emptyText={
          rawSearch
            ? CRM_SHARED_STRINGS.userMultiSelect.noMatches
            : CRM_SHARED_STRINGS.userMultiSelect.noUsers
        }
        renderItem={(item) => {
          const checked = selectedSet.has(item.id);
          return (
            <button
              type="button"
              onClick={() => toggle(item.id)}
              className={cn(
                // items-start + mt-0.5 on the checkbox: the box sits on the
                // NAME line rather than centring between name and email.
                "flex w-full items-start gap-2 rounded-sm px-2 py-1.5 text-left text-sm",
                "hover:bg-accent",
                checked && "bg-accent/50",
              )}
            >
              <Checkbox
                checked={checked}
                className="pointer-events-none mt-0.5 shrink-0"
              />
              {/* Name over email (stacked), both truncate — never push the row
                  wide / cause horizontal scroll (§8.7). */}
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate">{getUserDisplayName(item)}</span>
                {item.email && (
                  <span className="truncate text-[10px] text-muted-foreground">
                    {item.email}
                  </span>
                )}
              </span>
            </button>
          );
        }}
      />
    </Popover>
  );
}
