import * as Sentry from "@sentry/react";

const isProd = import.meta.env.PROD;

/** Sentry log attributes accept only string | number | boolean — flatten
 *  Errors and plain objects one level into searchable fields. */
function toAttributes(args: unknown[]): Record<string, string | number | boolean> {
  const attrs: Record<string, string | number | boolean> = {};
  const put = (key: string, value: unknown) => {
    if (value == null) return;
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      attrs[key] = value;
    } else if (value instanceof Error) {
      attrs[`${key}.name`] = value.name;
      attrs[`${key}.message`] = value.message;
      if (value.stack) attrs[`${key}.stack`] = value.stack.slice(0, 2000);
    } else {
      try {
        attrs[key] = JSON.stringify(value).slice(0, 2000);
      } catch {
        attrs[key] = String(value);
      }
    }
  };
  args.forEach((arg, i) => {
    if (arg && typeof arg === "object" && !(arg instanceof Error) && !Array.isArray(arg)) {
      for (const [k, v] of Object.entries(arg)) put(k, v);
    } else {
      put(`arg${i}`, arg);
    }
  });
  return attrs;
}

/**
 * App-wide logger.
 * - Console output in dev only.
 * - `warn`/`error` also go to Sentry Logs (Explore → Logs) in every env —
 *   requires `enableLogs: true` in src/instrument.ts. Logs flush in ~5s batches.
 * - `info` stays console-only to keep Sentry volume down.
 * - Unexpected critical failures should still be Sentry *errors* (Issues) —
 *   those are captured automatically via reactErrorHandler/global handlers.
 */
export const logger = {
  info: (...args: unknown[]) => {
    if (!isProd) console.info(...args);
  },
  warn: (...args: unknown[]) => {
    if (!isProd) console.warn(...args);
    Sentry.logger.warn(typeof args[0] === "string" ? args[0] : "log", toAttributes(args.slice(1)));
  },
  error: (msg: string, err?: unknown) => {
    if (!isProd) console.error(msg, err);
    Sentry.logger.error(msg, toAttributes(err === undefined ? [] : [err]));
  },
};
