import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Typography } from "@/components/ui/typography";

import type { ChecklistTemplate } from "../../api";
import { ChecklistPreviewList } from "./ChecklistPreviewList";
import { CHECKLISTS_STRINGS } from "./checklists.strings";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: ChecklistTemplate | null;
  typeLabel?: string;
}

/**
 * Read-only preview of a saved checklist template. Shows each item exactly as
 * the inspector will see it at runtime, with the authored config (min/max,
 * options, integer_only, photo slots) already applied. No save, no edit.
 *
 * The item-rendering lives in `<ChecklistPreviewList>` so the WMS full-page
 * preview shares the exact same look.
 */
export function ChecklistPreviewDialog({
  open,
  onOpenChange,
  template,
  typeLabel,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 sm:max-w-2xl">
        <DialogHeader className="border-b pb-3">
          <Typography asChild variant="body-lg">
            <DialogTitle>
              {template ? template.name : CHECKLISTS_STRINGS.previewDialog.fallbackTitle}
            </DialogTitle>
          </Typography>
          {template && (
            <Typography asChild variant="helper">
              <p>
                {typeLabel ? `${typeLabel} · ` : ""}
                {CHECKLISTS_STRINGS.previewDialog.itemCountSuffix(template.items.length)}
              </p>
            </Typography>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-1 py-4">
          {template && <ChecklistPreviewList items={template.items} />}
        </div>
      </DialogContent>
    </Dialog>
  );
}
