import { ApiError } from "@shared/api/envelope";

/** A server error list split by where it belongs on screen. */
export interface SortedAdjustmentErrors {
  /** 0-based form row → messages. The backend names rows `lines.N`, 1-based. */
  byLine: Record<number, string[]>;
  /** Header fields the form renders (`notes`, `warehouse_id`, `reason`). */
  byField: Record<string, string>;
  /** Everything else — shown as a list above the form / on the detail page. */
  general: string[];
}

const LINE_FIELD = /^lines\.(\d+)/;

export function sortAdjustmentErrors(error: unknown): SortedAdjustmentErrors {
  const out: SortedAdjustmentErrors = { byLine: {}, byField: {}, general: [] };
  // No list → the mutation's toast already carried the message.
  if (!(error instanceof ApiError) || !error.errors?.length) return out;
  for (const detail of error.errors) {
    const lineMatch = detail.field ? LINE_FIELD.exec(detail.field) : null;
    if (lineMatch) {
      // TODO: confirm against the backend that `lines.N` is 1-based.
      const index = Number(lineMatch[1]) - 1;
      (out.byLine[index] ??= []).push(detail.message);
    } else if (detail.field) {
      out.byField[detail.field] = detail.message;
    } else {
      out.general.push(detail.message);
    }
  }
  return out;
}

/** Errors[] as `{line, message}` rows for the detail page's blocked-action list. */
export function listAdjustmentErrors(error: unknown): { line: number | null; message: string }[] {
  if (!(error instanceof ApiError) || !error.errors) return [];
  return error.errors.map((d) => {
    const m = d.field ? LINE_FIELD.exec(d.field) : null;
    return { line: m ? Number(m[1]) : null, message: d.message };
  });
}
