import { StatusBadge } from "@/components/common/display/StatusBadge";
import { STATUS_LABEL, STATUS_VARIANT } from "./pm-assignments-helpers";

export function PMStatusBadge({ status }: { status: string | null | undefined }) {
  const s = status ?? "active";
  return (
    <StatusBadge variant={STATUS_VARIANT[s] ?? "neutral"}>
      {STATUS_LABEL[s] ?? s}
    </StatusBadge>
  );
}
