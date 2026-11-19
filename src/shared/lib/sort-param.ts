/** Backend `sort` param from table state; unmapped columns return undefined (§11.1). */
export function toSortParam(
  column: string | null | undefined,
  direction: "asc" | "desc" | null | undefined,
  fieldMap: Readonly<Record<string, string>>,
): string | undefined {
  if (!column || !direction) return undefined;
  const field = fieldMap[column];
  if (!field) return undefined;
  return direction === "desc" ? `-${field}` : field;
}
