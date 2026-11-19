import type { ComponentProps } from "react";

import { TableCell } from "@/components/ui/table";
import { Typography } from "@/components/ui/typography";
import { EngineerAssignSelect } from "../../devices/EngineerAssignSelect";

/** Engineer-assignment cell; stops propagation so the row does not open the device. */
export function AssignEngineerCell({
  stockItemId,
  ...selectProps
}: { stockItemId: string | null | undefined } & Omit<
  ComponentProps<typeof EngineerAssignSelect>,
  "deviceId"
>) {
  return (
    <TableCell className="min-w-44" onClick={(e) => e.stopPropagation()}>
      {stockItemId ? (
        <EngineerAssignSelect deviceId={stockItemId ?? ""} {...selectProps} />
      ) : (
        <Typography variant="helper" asChild>
          <span>—</span>
        </Typography>
      )}
    </TableCell>
  );
}
