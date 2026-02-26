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
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}

/** Default logger that delegates to the global `console` object. */
/* eslint-disable no-console */
export const consoleLogger: Logger = {
  debug: console.debug.bind(console),
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

let currentLogger: Logger = consoleLogger;

/** Replace the active SDK logger. Pass {@link consoleLogger} to restore defaults. */
export function setLogger(logger: Logger): void {
  currentLogger = logger;
}

/** Return the active SDK logger. */
export function getLogger(): Logger {
  return currentLogger;
}
