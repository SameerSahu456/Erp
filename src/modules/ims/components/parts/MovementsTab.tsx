import { Typography } from "@/components/ui/typography";
import { PARTS_STRINGS } from "./parts.strings";

const SMV = PARTS_STRINGS.movements;

export function MovementsTab() {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-dashed p-8 text-center">
        <Typography variant="body-strong">{SMV.noMovementsTitle}</Typography>
        <Typography asChild variant="helper" className="mt-1">
          <p>{SMV.noMovementsHelper}</p>
        </Typography>
      </div>
    </div>
  );
}
