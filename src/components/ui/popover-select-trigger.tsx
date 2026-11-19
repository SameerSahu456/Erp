import type { MouseEventHandler, ReactNode } from "react"
import { ChevronDownIcon, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { PopoverTrigger } from "@/components/ui/popover"
import { HoverTip } from "@/components/common/display/HoverTip"

interface PopoverSelectTriggerProps {
  /** Trigger label content (a string, formatted node, or count summary). */
  children: ReactNode
  /** Whether a value is currently selected — drives chevron↔clear and dimming. */
  hasValue: boolean
  /** When provided, a value-present trigger shows a clear-"X" instead of the chevron. */
  onClear?: MouseEventHandler<HTMLButtonElement>
  disabled?: boolean
  /** Hover tooltip (styled, not the native `title`). */
  title?: string
  /** Extra classes appended to the trigger frame. */
  className?: string
  /** Dim the label while empty (form placeholder). Filter chips pass `false` — their label is a name, not a hint. */
  dimWhenEmpty?: boolean
  /** aria-label for the clear button. */
  clearLabel?: string
  /** Trigger id, so a form `<Label htmlFor>` points at it. */
  id?: string
  /** Marks the field invalid: red border, like the other form inputs. */
  invalid?: boolean
}

// Shared trigger frame for the CRM API-backed popover selects (account, contact,
// owner, assignee, …). Renders the consistent input-styled trigger with a
// dropdown chevron when empty; when a value is selected and `onClear` is given,
// the chevron is replaced by a clear-"X". The clear button is a sibling of the
// trigger (not nested) because nesting a <button> inside the trigger <button>
// trips a hydration error. The chevron flips 180° on open via Base UI's
// `data-popup-open` attribute (mirrors components/ui/select.tsx).
export function PopoverSelectTrigger({
  children,
  hasValue,
  onClear,
  disabled = false,
  title,
  className,
  clearLabel = "Clear selection",
  dimWhenEmpty = true,
  id,
  invalid = false,
}: PopoverSelectTriggerProps) {
  const showClear = hasValue && !!onClear && !disabled

  const frame = (
    <div className="relative w-full">
      <PopoverTrigger
        id={id}
        data-slot="input"
        disabled={disabled}
        aria-invalid={invalid || undefined}
        className={cn(
          "group/select-trigger flex h-10 w-full items-center justify-between rounded-[7px] border border-input bg-card pl-[10px] text-[13.5px] shadow-xs",
          "cursor-pointer transition-colors disabled:cursor-not-allowed disabled:opacity-60",
          "aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
          showClear ? "pr-9" : "pr-[10px]",
          className,
        )}
      >
        <span
          className={cn(
            "min-w-0 flex-1 truncate text-left",
            !hasValue && dimWhenEmpty && "text-muted-foreground",
          )}
        >
          {children}
        </span>
        {!showClear && (
          <ChevronDownIcon className="pointer-events-none ml-2 size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-popup-open/select-trigger:rotate-180 group-data-open/select-trigger:rotate-180" />
        )}
      </PopoverTrigger>
      {showClear && (
        <button
          type="button"
          onClick={onClear}
          className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
          aria-label={clearLabel}
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  )
  return title ? <HoverTip text={title}>{frame}</HoverTip> : frame
}
