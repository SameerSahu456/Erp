/** The wire values of a `Record<Enum, label>` map, in declaration order. */
export const keysOf = <T extends string>(labels: Record<T, string>): T[] =>
  Object.keys(labels) as T[];

/** `{ value, label }` options for a select/filter built from a label map. */
export const optionsOf = <T extends string>(labels: Record<T, string>) =>
  keysOf(labels).map((value) => ({ value, label: labels[value] }));
