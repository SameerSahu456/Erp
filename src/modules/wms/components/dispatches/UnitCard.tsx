import { useState } from "react";
import { ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/common/display/StatusBadge";

import type { DispatchLineItem } from "../../api/dispatch";
import { UnitContent } from "./UnitContent";
import { DispatchKitButton } from "../kits/DispatchKitDialog";

// One machine (primary) rendered as a collapsible accordion: the header row is
// the trigger, its fitted components expand on a tinted band below. A machine
// with no components is a plain, non-collapsible row. Components indent by icon
// width — no side-stripe accent (banned) — so hierarchy reads structurally.
export function UnitCard({
  primary,
  components,
}: {
  primary: DispatchLineItem;
  components: DispatchLineItem[];
}) {
  const [open, setOpen] = useState(false);
  const hasKids = components.length > 0;
  const rowCls = "flex items-center gap-2.5 px-3 py-2";
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      {/* The toggle and the Kit button are siblings — a button inside a
          button is invalid and swallows the click. */}
      <div className="flex items-center">
        {hasKids ? (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className={cn(
              rowCls,
              "min-w-0 flex-1 text-left transition-colors hover:bg-muted/40",
            )}
          >
            <ChevronRight
              className={cn(
                "size-4 shrink-0 text-muted-foreground transition-transform",
                open && "rotate-90",
              )}
            />
            <UnitContent
              line={primary}
              trailing={
                <StatusBadge variant="neutral">{components.length}</StatusBadge>
              }
            />
          </button>
        ) : (
          <div className={cn(rowCls, "min-w-0 flex-1")}>
            <span className="size-4 shrink-0" aria-hidden />
            <UnitContent line={primary} />
          </div>
        )}
        {/* What went out with the unit (charger, bag…) — return-by-count §9. */}
        <div className="shrink-0 pr-2">
          <DispatchKitButton driId={primary.id} />
        </div>
      </div>
      {hasKids && open && (
        <div className="border-t border-border bg-muted/40">
          {components.map((c) => (
            <div key={c.id} className={cn(rowCls, "pl-9")}>
              <UnitContent line={c} component />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
