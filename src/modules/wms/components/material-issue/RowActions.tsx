import { useState } from "react";
import {
  ClipboardCheck,
  MoreHorizontal,
  PackageCheck,
  Pencil,
  XCircle,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/common/dialogs/ConfirmDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type {
  MaterialIssueLineRow,
  MaterialIssueStage,
} from "../../api";
import { MATERIAL_ISSUE_STRINGS as S } from "./material-issue.strings";
import { useWmsStageAccess } from "../../hooks/operations/useStageAccess";

interface RowAction {
  key: string;
  label: string;
  icon: LucideIcon;
  onSelect: () => void;
  /** Visual weight when shown as a direct button: the next worklist step is
   *  `primary` (filled), supporting steps are `secondary` (outline), and an
   *  irreversible step is `destructive`. */
  tone: "primary" | "secondary" | "destructive";
}

// Direct-button variant per tone (the kebab items key off `destructive` only).
const TONE_BUTTON_VARIANT = {
  primary: "default",
  secondary: "outline",
  destructive: "destructive",
} as const;

// The per-row action set, keyed off the machine's derived stage. The listing
// offers only the next worklist step; the heavier operations — Pull Out, Return,
// Add Component — live on the detail page, so the column stays uncluttered:
//   * draft     → Edit · Issue · Cancel
//   * issued    → Start QC
//   * qc_failed → Re-run QC
// Every other stage (ready_for_dispatch / dispatched / returned / cancelled)
// renders nothing — the row itself still opens the detail page.
//
// How the actions are shown follows one rule (CP-350): a row with a single
// available action (issued / qc_failed → QC) shows it as a DIRECT button so the
// next step is one click away; a row with more than two (draft → edit/issue/
// cancel) keeps the 3-dot kebab so the column doesn't sprawl. Issue and Cancel
// are irreversible, so each opens a confirm dialog regardless of how it's shown.
export function RowActions({
  row,
  qcOnly,
  onQc,
  onEdit,
  onIssue,
  onCancel,
}: {
  row: MaterialIssueLineRow;
  /** QC-only engineer: the ONLY action offered is Start/Re-run QC. */
  qcOnly: boolean;
  onQc: (row: MaterialIssueLineRow) => void;
  onEdit: (materialIssueId: string) => void;
  onIssue: (materialIssueId: string) => void;
  onCancel: (materialIssueId: string) => void;
}) {
  const { canOutwardQc } = useWmsStageAccess();
  const stage = row.stage as MaterialIssueStage;
  // Dynamic outward QC: shown to managers/mis/superuser + any engineer with a
  // live assignment at this warehouse (no capability needed). canOutwardQc
  // mirrors the backend grant.
  const qcVisible =
    (stage === "issued" || stage === "qc_failed") && canOutwardQc(row.warehouse_id);
  // A QC-only engineer never edits/issues/cancels a draft — those are manager
  // tools. Draft is the only multi-action stage; issued/qc_failed show just QC.
  const isDraft = !qcOnly && stage === "draft";
  const miId = row.material_issue_id;
  const [confirm, setConfirm] = useState<"issue" | "cancel" | null>(null);

  const actions: RowAction[] = [];
  if (isDraft) {
    actions.push(
      {
        key: "edit",
        label: S.worklist.actions.edit,
        icon: Pencil,
        onSelect: () => onEdit(miId),
        tone: "secondary",
      },
      {
        key: "issue",
        label: S.worklist.actions.issue,
        icon: PackageCheck,
        onSelect: () => setConfirm("issue"),
        tone: "primary",
      },
      {
        key: "cancel",
        label: S.worklist.actions.cancel,
        icon: XCircle,
        onSelect: () => setConfirm("cancel"),
        tone: "destructive",
      },
    );
  }
  if (qcVisible) {
    actions.push({
      key: "qc",
      label:
        stage === "qc_failed"
          ? S.worklist.actions.rerunQc
          : S.worklist.actions.startQc,
      icon: ClipboardCheck,
      onSelect: () => onQc(row),
      tone: "primary",
    });
  }

  // No actionable step for this stage → render nothing.
  if (actions.length === 0) return null;

  // More than two actions → collapse into a kebab so the column stays tidy;
  // one or two → show them directly (CP-350).
  const useKebab = actions.length > 2;

  return (
    <>
      {useKebab ? (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={S.worklist.actions.menu}
                onClick={(e) => e.stopPropagation()}
              />
            }
          >
            <MoreHorizontal className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="min-w-44"
            onClick={(e) => e.stopPropagation()}
          >
            {actions.map((action) => (
              <DropdownMenuItem
                key={action.key}
                variant={action.tone === "destructive" ? "destructive" : undefined}
                onClick={action.onSelect}
              >
                <action.icon className="size-4 mr-2" />
                {action.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <div
          className="flex items-center justify-end gap-1.5"
          onClick={(e) => e.stopPropagation()}
        >
          {actions.map((action) => (
            <Button
              key={action.key}
              variant={TONE_BUTTON_VARIANT[action.tone]}
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                action.onSelect();
              }}
            >
              <action.icon data-icon="inline-start" />
              {action.label}
            </Button>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={confirm === "issue"}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={S.issueDialog.title}
        description={S.issueDialog.body}
        confirmLabel={S.issueDialog.confirm}
        cancelLabel={S.issueDialog.cancel}
        onConfirm={() => {
          onIssue(miId);
          setConfirm(null);
        }}
        trigger={null}
      />
      <ConfirmDialog
        open={confirm === "cancel"}
        onOpenChange={(open) => !open && setConfirm(null)}
        variant="destructive"
        title={S.cancelDialog.title}
        description={S.cancelDialog.body}
        confirmLabel={S.cancelDialog.confirm}
        cancelLabel={S.cancelDialog.cancel}
        onConfirm={() => {
          onCancel(miId);
          setConfirm(null);
        }}
        trigger={null}
      />
    </>
  );
}
