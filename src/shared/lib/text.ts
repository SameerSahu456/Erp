/**
 * Capitalize the first letter of each word, leaving the rest of each word
 * exactly as typed.
 *
 * So a lowercase entry ("pune warehouse") reads as "Pune Warehouse", while
 * acronyms and intentional camelCase the user typed on purpose (DIS, QC,
 * MaterialIssue) are preserved — a blunt title-case would turn "DIS" into
 * "Dis", which reads worse. Only word-initial LOWERCASE letters are touched.
 */
export function titleCaseWords(value: string): string {
  return value.replace(/\b[a-z]/g, (ch) => ch.toUpperCase())
}
