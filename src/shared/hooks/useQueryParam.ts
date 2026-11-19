import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";

export function useQueryParam(
  key: string,
): [string | null, (value: string | null) => void] {
  const [params, setParams] = useSearchParams();
  const value = params.get(key);

  const setValue = useCallback(
    (next: string | null) => {
      setParams(
        (prev) => {
          const updated = new URLSearchParams(prev);
          if (next == null) updated.delete(key);
          else updated.set(key, next);
          return updated;
        },
        { replace: true },
      );
    },
    [key, setParams],
  );

  return [value, setValue];
}
