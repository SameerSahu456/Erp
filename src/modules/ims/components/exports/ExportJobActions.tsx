import { Download, Loader2, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";

import { useDownloadExport } from "../../hooks/exports/useDownloadExport";
import { useRerunExport } from "../../hooks/exports/useRerunExport";
import type { ExportStatus } from "../../lib/export-types";
import { EXPORTS_STRINGS as S } from "./exports.strings";

const spinner = <Loader2 className="mr-1.5 size-3.5 animate-spin" aria-hidden />;

/** Download (Ready) / Run again (Expired, Failed) for one export row. */
export function ExportJobActions({ id, status }: { id: string; status: ExportStatus }) {
  const download = useDownloadExport();
  const rerun = useRerunExport();
  if (status === "completed") {
    return (
      <Button size="sm" variant="outline" disabled={download.isPending} onClick={() => download.mutate(id)}>
        {download.isPending ? spinner : <Download className="mr-1.5 size-3.5" aria-hidden />}
        {S.download}
      </Button>
    );
  }
  if (status === "expired" || status === "failed") {
    return (
      <Button size="sm" variant="ghost" disabled={rerun.isPending} onClick={() => rerun.mutate(id)}>
        {rerun.isPending ? spinner : <RotateCcw className="mr-1.5 size-3.5" aria-hidden />}
        {S.rerun}
      </Button>
    );
  }
  return null;
}
