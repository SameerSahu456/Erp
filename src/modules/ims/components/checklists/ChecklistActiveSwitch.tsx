import { Switch } from "@/components/ui/switch";

import type { ChecklistTemplate } from "../../api";
import { useSetChecklistActive } from "../../hooks/checklists/useChecklists";
import { CHECKLISTS_STRINGS } from "./checklists.strings";

/** Activate / deactivate a checklist template in place. Shared by the IMS
 *  Parts › Checklist tab and the WMS Checklists list. */
export function ChecklistActiveSwitch({
  template,
}: {
  template: Pick<ChecklistTemplate, "id" | "name" | "is_active">;
}) {
  const setActive = useSetChecklistActive();
  return (
    // Stop the click so a clickable row (WMS list) doesn't navigate.
    <span className="inline-flex" onClick={(e) => e.stopPropagation()}>
      <Switch
        checked={template.is_active}
        onCheckedChange={(next) => setActive.mutate({ id: template.id, isActive: next })}
        disabled={setActive.isPending}
        aria-label={CHECKLISTS_STRINGS.activeToggle.ariaLabel(template.name)}
      />
    </span>
  );
}
