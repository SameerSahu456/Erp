import type { LucideIcon } from "lucide-react";

import { CardHeader, CardTitle } from "@/components/ui/card";
import { Typography } from "@/components/ui/typography";

/** Card header with an icon, title and one-line subtitle. */
export function SectionHeader({ icon: Icon, title, subtitle }: { icon: LucideIcon; title: string; subtitle: string }) {
  return (
    <CardHeader>
      <div className="min-w-0">
        <CardTitle className="flex items-center gap-2">
          <Icon className="size-[18px] shrink-0 text-muted-foreground" />
          {title}
        </CardTitle>
        <Typography variant="helper" tone="muted" className="mt-[2px]">
          {subtitle}
        </Typography>
      </div>
    </CardHeader>
  );
}
