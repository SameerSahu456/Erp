/** The description to show under a part / variant in a dropdown: the
 *  variant's own description when it has one, else the parent part's. */
export function partOptionDescription(row: {
  description?: string | null
  part_description?: string | null
}): string | null {
  return row.description?.trim() || row.part_description?.trim() || null
}
