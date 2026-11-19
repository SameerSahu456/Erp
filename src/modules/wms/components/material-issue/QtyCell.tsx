import { Input } from "@/components/ui/input";
import { Typography } from "@/components/ui/typography";
import { useNumberField } from "@/hooks/use-number-field";

import { MATERIAL_ISSUE_STRINGS as S } from "./material-issue.strings";

// Qty cell: a serialized part (or a picked serial) is always 1; otherwise a
// number input.
export function QtyCell({
  locked,
  quantity,
  max,
  onChange,
}: {
  locked: boolean;
  quantity: number;
  max?: number;
  onChange: (n: number) => void;
}) {
  // A line always issues at least 1 unit; the shared hook adds the numeric
  // keypad + leading-zero strip (§3.2). Hook is called unconditionally, before
  // the `locked` early return.
  const qty = useNumberField(quantity, onChange, { min: 1, max });
  if (locked) {
    return (
      <Typography variant="body" numeric asChild>
        <span className="text-right">1</span>
      </Typography>
    );
  }
  return (
    <Input
      {...qty}
      className="h-9 w-16 text-right"
      aria-label={S.form.lines.colQty}
    />
  );
}
