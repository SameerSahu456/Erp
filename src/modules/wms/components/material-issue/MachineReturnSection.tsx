import { useMemo } from "react";

import { Typography } from "@/components/ui/typography";

import type { MaterialIssueLineResponse } from "../../api";
import { useReturnWorkspace } from "./returnWorkspaceContext";
import { issuedComponents, toReturnUnit } from "./return-workspace-helpers";
import { ReturnUnitRow } from "./ReturnUnitRow";
import { MATERIAL_ISSUE_STRINGS as S } from "./material-issue.strings";

// Per-machine return checklist: the machine on top, its components indented beneath.
export function MachineReturnSection({ machine }: { machine: MaterialIssueLineResponse }) {
  const { selectedMachineIds, toggleMachine, toggleComponent } = useReturnWorkspace();
  const machineUnit = useMemo(() => toReturnUnit(machine, machine.id), [machine]);
  const components = useMemo(() => issuedComponents(machine), [machine]);

  if (machine.status !== "issued") {
    return (
      <div className="p-4">
        <Typography variant="helper" tone="muted">
          {S.returnWorkspace.notReturnable}
        </Typography>
      </div>
    );
  }

  const machineSelected = selectedMachineIds.has(machine.id);

  return (
    <div className="space-y-1 p-4">
      <ReturnUnitRow
        lineId={machine.id}
        title={machineUnit.title}
        serial={machineUnit.serial}
        onToggle={() => toggleMachine(machineUnit, components)}
        emphasis
      />

      {components.length > 0 && (
        <div className="border-t border-border pt-1">
          <div className="flex items-center justify-between py-1">
            <Typography variant="badge" tone="muted" asChild>
              <span>{S.returnWorkspace.componentsHeading}</span>
            </Typography>
            {machineSelected && (
              <Typography variant="caption" tone="muted" asChild>
                <span>{S.returnWorkspace.machineCascade}</span>
              </Typography>
            )}
          </div>
          <div className="divide-y divide-border">
            {components.map((c) => (
              // A component rides along when its machine is returned (cascade),
              // shown checked + locked; otherwise it's individually selectable.
              <ReturnUnitRow
                key={c.lineId}
                lineId={c.lineId}
                title={c.title}
                serial={c.serial}
                disabled={machineSelected}
                onToggle={() => toggleComponent(c)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
