type SetState<T> = (update: (prev: T) => T) => void;

/** Shared per-row runner: clears the row's error, marks it pending, runs the
 *  mutation, records a failure message on the row. Resolves to success. */
export function makeRowRunner({
  setRowErrors,
  setPendingIds,
}: {
  setRowErrors: SetState<Record<string, string>>;
  setPendingIds: SetState<string[]>;
}) {
  return async function runRow(
    itemId: string,
    fallbackError: string,
    run: () => Promise<unknown>,
  ): Promise<boolean> {
    setRowErrors((prev) => ({ ...prev, [itemId]: "" }));
    setPendingIds((prev) => [...prev, itemId]);
    try {
      await run();
      return true;
    } catch (error) {
      setRowErrors((prev) => ({
        ...prev,
        [itemId]: error instanceof Error ? error.message : fallbackError,
      }));
      return false;
    } finally {
      setPendingIds((prev) => prev.filter((id) => id !== itemId));
    }
  };
}
