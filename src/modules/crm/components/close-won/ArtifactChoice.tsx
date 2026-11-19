import { Check, Package, Receipt } from "lucide-react"

import { cn } from "@/lib/utils"

import { CLOSE_WON_STRINGS } from "./close-won.strings"

// ── Artifact choice (Sales Order vs Demo Request) ──
//
// Segmented control shown at the top of the Sales Order step for lead/deal
// closed-won flows. Picking "Demo Request" swaps the SO form for the
// embedded `ClosedWonDemoForm`.
export function ArtifactChoice({
  value,
  onChange,
}: {
  value: "so" | "demo"
  onChange: (next: "so" | "demo") => void
}) {
  const options = [
    {
      key: "so" as const,
      icon: Receipt,
      title: CLOSE_WON_STRINGS.artifact.so.title,
      desc: CLOSE_WON_STRINGS.artifact.so.desc,
    },
    {
      key: "demo" as const,
      icon: Package,
      title: CLOSE_WON_STRINGS.artifact.demo.title,
      desc: CLOSE_WON_STRINGS.artifact.demo.desc,
    },
  ]
  return (
    <div>
      <p className="mb-2 text-[12.5px] font-medium text-muted-foreground">
        {CLOSE_WON_STRINGS.artifact.prompt}
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {options.map((opt) => {
          const Icon = opt.icon
          const selected = value === opt.key
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => onChange(opt.key)}
              className={cn(
                "flex items-start gap-3 rounded-xl border p-4 text-left transition-all",
                selected
                  ? "border-primary/40 bg-primary/5 ring-1 ring-primary/20"
                  : "border-border bg-card hover:bg-muted/40",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full border",
                  selected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-muted-foreground/40",
                )}
              >
                {selected && <Check className="size-3" strokeWidth={3} />}
              </span>
              <span
                className={cn(
                  "inline-flex size-8 shrink-0 items-center justify-center rounded-lg",
                  selected
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground",
                )}
              >
                <Icon className="size-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-[13.5px] font-semibold">
                  {opt.title}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {opt.desc}
                </span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
