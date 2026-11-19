import * as React from "react"

import { cn } from "@/lib/utils"

// forwardRef so callers (e.g. MentionInput, autosize plugins, focus-after-
// submit flows) can grab the underlying <textarea> for caret/selection
// manipulation. No call sites change — refs are opt-in.
const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  function Textarea({ className, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        data-slot="textarea"
        className={cn(
          // Auto-grow HEIGHT with content (field-sizing-content), but lock the
          // WIDTH to the container so a long/pasted unbroken string can never
          // balloon the box sideways: w-full + max-w-full + min-w-0 (shrink in
          // flex rows) + overflow-x-hidden, and resize-none to kill the default
          // drag-to-resize handle. Height grows to max-h-64 then scrolls.
          "flex field-sizing-content min-h-16 max-h-64 w-full max-w-full min-w-0 resize-none overflow-y-auto overflow-x-hidden [overflow-wrap:anywhere] rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
          className
        )}
        {...props}
      />
    )
  },
)

export { Textarea }
