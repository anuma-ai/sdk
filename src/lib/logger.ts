/**
 * Pluggable logger for the Anuma SDK.
 *
 * By default all SDK logging goes to `console`. Call {@link setLogger} at app
 * init (or use `<LoggerProvider>` in React) to redirect output to your own
 * logging infrastructure (PostHog, Datadog, Sentry, etc.).
 *
 * @example
 * ```ts
 * import { setLogger, type Logger } from "@anuma/sdk";
 *
 * const myLogger: Logger = {
 *   debug: () => {},
 *   info: (...args) => posthog.capture("sdk_info", { message: args }),
 *   warn: (...args) => console.warn("[SDK]", ...args),
 *   error: (...args) => Sentry.captureMessage(args.join(" ")),
 * };
 *
 * setLogger(myLogger);
 * ```
 */

export interface Logger {
  debug: (...args: unknown[]) => void;
  /** Used for outcomes that are noteworthy but expected — a consolidation
   * refusal that preserved a memory, for example. Keep genuinely-wrong things at
   * `warn` so the two stay distinguishable in a log search. */
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}

/** Default logger that delegates to the global `console` object. */
/* eslint-disable no-console */
export const consoleLogger: Logger = {
  debug: console.log.bind(console),
  info: console.info.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
};
/* eslint-enable no-console */

/** Silent logger that discards all output. */
export const noopLogger: Logger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
};

const LOGGER_STATE_KEY = Symbol.for("@anuma/sdk/logger/v1");

interface LoggerState {
  logger: Logger;
}

const loggerGlobal = globalThis as typeof globalThis & {
  [LOGGER_STATE_KEY]?: LoggerState;
};

const fallbackLoggerState: LoggerState = { logger: consoleLogger };

// Separate entrypoint bundles share one logger in each JavaScript realm.
// Each bundle uses its local state when the global blocks a new property.
function getLoggerState(): LoggerState {
  try {
    return (loggerGlobal[LOGGER_STATE_KEY] ??= fallbackLoggerState);
  } catch {
    return fallbackLoggerState;
  }
}

/** Replace the active SDK logger. Pass {@link consoleLogger} to restore defaults. */
export function setLogger(logger: Logger): void {
  getLoggerState().logger = logger;
}

/** Return the active SDK logger. */
export function getLogger(): Logger {
  return getLoggerState().logger;
}
