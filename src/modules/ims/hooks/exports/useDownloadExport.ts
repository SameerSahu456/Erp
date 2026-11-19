import { useMutation, useQueryClient } from "@tanstack/react-query";

import { notifyMutationError } from "@shared/api/notify-mutation-error";
import { saveBlob, saveUrl } from "@shared/lib/saveBlob";

import { fetchExportDownload, fetchExportFile } from "../../exports.api";
import { invalidateExports } from "./invalidateExports";

/** Download a ready export (spec E7). S3 hands out a presigned URL; local
 *  storage (dev) returns an auth-proxied path that must be fetched as a blob,
 *  since the token is a header and a plain navigation would 401. */
export function useDownloadExport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const download = await fetchExportDownload(id);
      if (!download.requires_auth) {
        saveUrl(download.url, download.filename);
        return;
      }
      const { blob } = await fetchExportFile(download.url);
      saveBlob(blob, download.filename);
    },
    onError: notifyMutationError,
    // Each download bumps the job's download count.
    onSettled: () => invalidateExports(qc),
  });
}
