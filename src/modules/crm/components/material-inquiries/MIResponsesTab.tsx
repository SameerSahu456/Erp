import { useMemo, useState } from "react"
import { Clock } from "lucide-react"

import type { useMaterialInquiryDetail } from "../../hooks/material-inquiries/useMaterialInquiryDetail"
import { MIItemResponseCard } from "./MIItemResponseCard"
import { MATERIAL_INQUIRIES_STRINGS as S } from "./material-inquiries.strings"

type MI = NonNullable<ReturnType<typeof useMaterialInquiryDetail>["mi"]>

// One per-item card with its own response list. The awaiting-response alert is
// driven by sales-side embed counts (cheap, pre-loaded).
export function MIResponsesTab({ mi }: { mi: MI }) {
  const [activeItemId, setActiveItemId] = useState<string | null>(null)
  const itemsWithoutResponse = useMemo(
    () => mi.items.filter((item) => item.responses.length === 0),
    [mi.items],
  )

  return (
    <div className="space-y-6">
      {itemsWithoutResponse.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50/60 px-4 py-3 dark:border-amber-900/40 dark:bg-amber-950/20">
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-md bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
              <Clock className="size-3.5" />
            </span>
            <div className="flex-1">
              <p className="text-xs font-semibold text-amber-900 dark:text-amber-200">
                {S.responsesTab.awaitingTitle}
                <span className="ml-1 font-normal text-amber-700/80 dark:text-amber-300/80">
                  {S.responsesTab.awaitingCount(itemsWithoutResponse.length)}
                </span>
              </p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {itemsWithoutResponse.map((it) => (
                  <button
                    key={it.id}
                    type="button"
                    onClick={() => setActiveItemId(it.id)}
                    className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-white px-2 py-0.5 text-[11px] text-foreground/80 hover:border-amber-300 dark:border-amber-900/40 dark:bg-amber-950/40"
                  >
                    {it.item_name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Per-item response cards */}
      <div className="space-y-4">
        {mi.items.map((item) => (
          <MIItemResponseCard
            key={item.id}
            miId={mi.id}
            item={item}
            initialDialogOpen={activeItemId === item.id}
            onDialogClose={() => {
              if (activeItemId === item.id) setActiveItemId(null)
            }}
          />
        ))}
      </div>
    </div>
  )
}
