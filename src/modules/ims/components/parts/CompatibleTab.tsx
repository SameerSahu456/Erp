import { Search } from "lucide-react";

import { Typography } from "@/components/ui/typography";
import { PARTS_STRINGS } from "./parts.strings";

const SCOMP = PARTS_STRINGS.compatible;

// ─── Compatible / Movements / Linked Orders / Activity tabs ─────────────────
//
// BOM lives on the variant now (one Reference BOM per variant) — see
// `modules/ims/components/BomTab.tsx`. The placeholder that used to live
// here was removed along with the BOM tab on the Part detail page.

export function CompatibleTab() {
  return (
    <div className="space-y-6">
      <div>
        <div className="mb-3">
          <Typography asChild variant="body-strong">
            <h3>
              {SCOMP.heading}
              <Typography asChild variant="helper" className="ml-2 font-normal">
                <span>(0)</span>
              </Typography>
            </h3>
          </Typography>
        </div>
        <div className="rounded-lg border bg-background">
          <div className="rounded-t-lg border-b bg-muted/30 px-4 py-3">
            <Typography asChild variant="body">
              <h4 className="font-semibold">{SCOMP.subheading}</h4>
            </Typography>
            <Typography asChild variant="helper" className="mt-0.5">
              <p>{SCOMP.subheadingHelper}</p>
            </Typography>
          </div>
          <div className="relative border-b bg-background px-4 py-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Typography
                asChild
                variant="body"
                tone="muted"
              >
                <input
                  type="text"
                  disabled
                  placeholder={SCOMP.searchPlaceholder}
                  className="block h-9 w-full rounded-md border border-input bg-muted/20 pl-8 pr-3 placeholder:text-muted-foreground focus:outline-none disabled:cursor-not-allowed"
                />
              </Typography>
            </div>
          </div>
          <Typography asChild variant="helper" align="center">
            <p className="px-4 py-6">{SCOMP.noPartsYet}</p>
          </Typography>
        </div>
      </div>
    </div>
  );
}
