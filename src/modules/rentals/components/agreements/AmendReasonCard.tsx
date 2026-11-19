import { SquarePen } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { SectionHeader } from "../shared/SectionHeader";
import { AGREEMENTS_STRINGS as S } from "./agreements.strings";

/** Why the terms changed — recorded against the new version. */
export function AmendReasonCard({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (next: string) => void;
  disabled: boolean;
}) {
  return (
    <Card>
      <SectionHeader
        icon={SquarePen}
        title={S.configure.amendSectionTitle}
        subtitle={S.configure.amendSectionSubtitle}
      />
      <CardContent>
        <div className="min-w-0 max-w-2xl space-y-1.5">
          <Label htmlFor="so-billing-amend-reason">{S.fields.amendReason}</Label>
          <Textarea
            id="so-billing-amend-reason"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={S.fields.amendReasonPlaceholder}
            disabled={disabled}
            rows={3}
          />
        </div>
      </CardContent>
    </Card>
  );
}
