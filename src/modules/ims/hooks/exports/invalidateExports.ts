import type { QueryClient } from "@tanstack/react-query";

import { imsKeys } from "../keys";

/** Every export list and tab count — a request, rerun or download changes them. */
export function invalidateExports(qc: QueryClient): void {
  void qc.invalidateQueries({ queryKey: imsKeys.exports.all });
}
