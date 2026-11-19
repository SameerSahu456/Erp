import { ConfirmDialog } from "@/components/common/dialogs/ConfirmDialog";

import { Typography } from "@/components/ui/typography";
import { Badge } from "@/components/ui/badge";
import {
  SearchableSelect,
  type SearchableOption,
} from "../shared/SearchableSelect";

import {
  useEngineerAssignSelect,
  type AssignStage,
} from "../../hooks/devices/useEngineerAssignSelect";
import type { AssignmentLevel, DeviceAssignableUser } from "../../api";
import { ASSIGNMENT_LEVEL_LABELS } from "../../constants/assignment";
import { WITHDRAW_VALUE, cleanName } from "./engineer-assign-helpers";
import { ENGINEER_ASSIGN_SELECT_STRINGS } from "./engineer-assign-select.strings";

/** One wired engineer-assignment dropdown: pick an engineer from the warehouse
 *  pool → PATCH the device's stage assignee, echoing the pick locally until the
 *  list refetches. Shared by the Devices hub, the inward batch devices, and the
 *  device-detail page so all three behave identically. The caller fetches the
 *  warehouse pool + computes `mayAssign` (canAssign at the device's warehouse). */
export function EngineerAssignSelect({
  deviceId,
  stage,
  pool,
  currentUserId,
  currentName,
  mayAssign,
  assignable = true,
  levels = null,
  placeholder = ENGINEER_ASSIGN_SELECT_STRINGS.placeholder,
  notReadyText = ENGINEER_ASSIGN_SELECT_STRINGS.notReady,
}: {
  deviceId: string;
  stage: AssignStage;
  pool: DeviceAssignableUser[];
  currentUserId?: string | null;
  currentName?: string | null;
  mayAssign: boolean;
  /** The device has a live op of this stage (else the backend assign would 404,
   *  e.g. assigning QC before the device reaches QC). When false the dropdown is
   *  shown disabled with `notReadyText`. */
  assignable?: boolean;
  levels?: string[] | null;
  placeholder?: string;
  notReadyText?: string;
}) {
  const c = useEngineerAssignSelect({
    deviceId,
    stage,
    pool,
    currentUserId,
    currentName,
    mayAssign,
    assignable,
    levels,
    placeholder,
    notReadyText,
  });
  const { value, name } = c;

  // A role that can NEVER assign here is a role block, so it gets a plain
  // read-only display (§0.9); `!assignable` is fixable and stays a disabled dropdown.
  if (!mayAssign) {
    return (
      <Typography variant="body" tone={name ? "default" : "muted"}>
        {name || "—"}
      </Typography>
    );
  }

  // `label` stays the clean name (trigger + search); the level rides in
  // `content` as an L1/L2/L3 badge and is also a search keyword.
  const options: SearchableOption[] = c.slotPool.map((u) => {
    const label = cleanName(u.name);
    return {
      value: u.user_id,
      label,
      keywords: [label, u.level ?? ""],
      content: (
        <EngineerOptionContent
          label={label}
          level={u.level as AssignmentLevel | null}
        />
      ),
    };
  });
  // The pool briefly empties right after a pick; inject the current/picked
  // assignee so the trigger keeps showing the name, not the placeholder.
  if (value && name && !options.some((o) => o.value === value)) {
    options.unshift({ value, label: name, keywords: [name] });
  }
  // Withdraw as an explicit CHOICE (the backend accepts user_id: null), offered
  // only when somebody IS assigned — on an empty field it would do nothing.
  if (value) {
    options.unshift({
      value: WITHDRAW_VALUE,
      label: ENGINEER_ASSIGN_SELECT_STRINGS.withdraw.option,
      keywords: [
        ENGINEER_ASSIGN_SELECT_STRINGS.withdraw.option,
        ...ENGINEER_ASSIGN_SELECT_STRINGS.withdraw.keywords,
      ],
    });
  }

  return (
    <>
      <SearchableSelect
        options={options}
        value={value ?? ""}
        disabled={c.disabled}
        placeholder={c.ph}
        searchPlaceholder={ENGINEER_ASSIGN_SELECT_STRINGS.searchPlaceholder}
        emptyText={ENGINEER_ASSIGN_SELECT_STRINGS.emptyText}
        onChange={c.handlePick}
      />
      <ConfirmDialog
        open={c.confirmingWithdraw}
        onOpenChange={c.setConfirmingWithdraw}
        title={ENGINEER_ASSIGN_SELECT_STRINGS.withdraw.title}
        description={ENGINEER_ASSIGN_SELECT_STRINGS.withdraw.description(
          name || "—",
        )}
        confirmLabel={ENGINEER_ASSIGN_SELECT_STRINGS.withdraw.confirm}
        variant="destructive"
        onConfirm={c.confirmWithdraw}
      />
    </>
  );
}

function EngineerOptionContent({
  label,
  level,
}: {
  label: string;
  level: AssignmentLevel | null;
}) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <span className="min-w-0 truncate">{label}</span>
      {level ? (
        <Badge variant="secondary" size="sm" className="shrink-0">
          {ASSIGNMENT_LEVEL_LABELS[level] ?? level.toUpperCase()}
        </Badge>
      ) : null}
    </span>
  );
}
