import { titleCaseWords } from "@/shared/lib/text";

/** Clean Title Case for display even when the operator typed ALL CAPS or all
 *  lowercase. The stored value is never rewritten. */
export function displayName(value: string | null | undefined): string {
  return value ? titleCaseWords(value.toLowerCase()) : "";
}
