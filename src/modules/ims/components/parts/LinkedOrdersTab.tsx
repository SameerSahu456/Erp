import { Typography } from "@/components/ui/typography";
import { PARTS_STRINGS } from "./parts.strings";

const SLO = PARTS_STRINGS.linkedOrders;

export function LinkedOrdersTab() {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-dashed p-8 text-center">
        <Typography variant="body-strong">{SLO.noLinkedOrdersTitle}</Typography>
        <Typography asChild variant="helper" className="mt-1">
          <p>{SLO.noLinkedOrdersHelper}</p>
        </Typography>
      </div>
    </div>
  );
}
