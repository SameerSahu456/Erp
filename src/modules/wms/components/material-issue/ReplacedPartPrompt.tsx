import { useState } from "react";
import { Wrench } from "lucide-react";

import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useStockItemComponents, type StockItemComponent } from "@modules/ims";

import type { MaterialIssueLineResponse } from "../../api";
import { PullComponentDialog } from "../devices/device-detail/PullComponentDialog";
import { MATERIAL_ISSUE_STRINGS } from "./material-issue.strings";

const S = MATERIAL_ISSUE_STRINGS.replacedPart;

const partLabel = (c: StockItemComponent): string =>
  [c.part_name ?? c.description, c.internal_serial ?? c.manufacturer_serial]
    .filter(Boolean)
    .join(" · ");

/** An in-house component swap's prompt to pull the replaced parts out (spec
 *  D10, O4). One prompt per part still inside the device — several when more
 *  than one part of the device is being replaced. A prompt, never a gate: each
 *  disappears once its part is out, by this pull or an earlier one in repair. */
export function ReplacedPartPrompt({ line }: { line: MaterialIssueLineResponse }) {
  const deviceId = line.stock_item_id ?? "";
  const componentIds = line.replaced_component_ids ?? [];
  const contents = useStockItemComponents(deviceId, { enabled: componentIds.length > 0 });
  const [pullTarget, setPullTarget] = useState<StockItemComponent | null>(null);

  const inside = (contents.data?.current_components ?? []).filter((c) =>
    componentIds.includes(c.id),
  );
  if (inside.length === 0) return null;

  return (
    <div className="space-y-2 px-4 pt-4">
      {inside.map((part) => (
        <Alert key={part.id}>
          <Wrench />
          <AlertTitle>{S.title(partLabel(part))}</AlertTitle>
          <AlertDescription>{S.description}</AlertDescription>
          <AlertAction>
            <Button size="sm" variant="outline" onClick={() => setPullTarget(part)}>
              {S.action}
            </Button>
          </AlertAction>
        </Alert>
      ))}
      <PullComponentDialog
        component={pullTarget}
        deviceId={deviceId}
        onClose={() => setPullTarget(null)}
      />
    </div>
  );
}
