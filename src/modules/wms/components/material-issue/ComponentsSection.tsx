import { useState } from "react";
import { Plus, ChevronDown, ChevronRight, Layers } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Typography } from "@/components/ui/typography";
import { StatusBadge } from "@/components/common/display/StatusBadge";

import { MATERIAL_ISSUE_STRINGS as S } from "./material-issue.strings";
import {
  type StagedComponent,
  newComponent,
} from "./material-issue-form-helpers";
import { ComponentRow } from "./ComponentRow";

export function ComponentsSection({
  title,
  components,
  warehouseId,
  isDuplicateSerial,
  selectedSerials,
  onChange,
}: {
  title: string;
  components: StagedComponent[];
  warehouseId: string;
  isDuplicateSerial: (serial: string) => boolean;
  /** Serials picked across the form, forwarded so each component's serial
   *  dropdown hides units already selected elsewhere. */
  selectedSerials?: Set<string>;
  onChange: (next: StagedComponent[]) => void;
}) {
  const [open, setOpen] = useState(components.length > 0);

  return (
    <div className="overflow-hidden rounded-xl border">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left hover:bg-muted/40"
      >
        {open ? (
          <ChevronDown className="size-4 shrink-0" />
        ) : (
          <ChevronRight className="size-4 shrink-0" />
        )}
        <Layers className="size-4 shrink-0 text-primary" />
        <Typography variant="body" asChild>
          <span className="min-w-0 flex-1 truncate">{title}</span>
        </Typography>
        {components.length > 0 && (
          <StatusBadge variant="info">{components.length}</StatusBadge>
        )}
      </button>
      {open && (
        <div className="space-y-2 border-t p-3">
          {components.map((c) => (
            <ComponentRow
              key={c.key}
              comp={c}
              warehouseId={warehouseId}
              isDuplicateSerial={isDuplicateSerial}
              selectedSerials={selectedSerials}
              onPatch={(patch) =>
                onChange(
                  components.map((x) =>
                    x.key === c.key ? { ...x, ...patch } : x,
                  ),
                )
              }
              onRemove={() => onChange(components.filter((x) => x.key !== c.key))}
            />
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onChange([...components, newComponent()])}
          >
            <Plus className="size-4" />
            {S.form.lines.addComponent}
          </Button>
        </div>
      )}
    </div>
  );
}
