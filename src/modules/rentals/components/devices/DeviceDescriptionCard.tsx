import { FileText } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Typography } from "@/components/ui/typography";

import { DEVICE_STRINGS as S } from "./devices.strings";

const D = S.deviceDetail;

/** The unit's free-text description off its order line. */
export function DeviceDescriptionCard({ description }: { description: string | null | undefined }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="size-[18px] shrink-0 text-muted-foreground" />
          {D.descriptionCard}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Typography variant="body" tone={description ? "default" : "muted"}>
          {description || D.noDescription}
        </Typography>
      </CardContent>
    </Card>
  );
}
