import { TruncatedText } from "./TruncatedText";

/**
 * A serial / barcode value: monospace, ellipsized when too long, with the full
 * value revealed in a custom hover tooltip that wraps long unbreakable strings
 * inside a bounded box.
 *
 * Thin preset over [TruncatedText] — monospace + character-level wrapping. The
 * trigger is capped at a fixed 160px (a pixel cap, so one long serial can't
 * stretch a table the way a percentage max-width would); pass a `max-w-[…]` /
 * `max-w-full` class to widen it for detail / dialog contexts.
 */
export function TruncatedSerial({
  value,
  className,
  mono = true,
}: {
  value: string | null | undefined;
  /** Extra classes for the trigger — e.g. a wider `max-w-[240px]` / `max-w-full`. */
  className?: string;
  /** Monospace (default). */
  mono?: boolean;
}) {
  return <TruncatedText value={value} className={className} mono={mono} breakAll />;
}
