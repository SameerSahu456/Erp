import { compactParams } from "@shared/api/client";

import type { ExportFilters, ExportJobsPage } from "./export-types";

/** "My exports" — where the export toasts and notifications land. */
export const EXPORTS_PATH = "/ims/exports";

/** Drop empty / null / `[]` filter values so the job's snapshot names only
 *  what was actually applied. */
export function compactExportFilters(filters: ExportFilters): ExportFilters {
  return compactParams(filters) as ExportFilters;
}

/** True when a job on both pages changed status — a poll saw a transition, so
 *  the tab counts are out of date. */
export function exportStatusChanged(prev: ExportJobsPage, next: ExportJobsPage): boolean {
  const before = new Map(prev.items.map((job) => [job.id, job.status]));
  return next.items.some((job) => {
    const was = before.get(job.id);
    return was !== undefined && was !== job.status;
  });
}
