import { type ReactNode, useEffect } from "react";

import { consoleLogger, type Logger, setLogger } from "../lib/logger";

export interface LoggerProviderProps {
  logger: Logger;
  children: ReactNode;
}

/**
 * Sets the active SDK logger for the lifetime of this component.
 * Restores the default {@link consoleLogger} on unmount.
 *
 * Only one `LoggerProvider` should be mounted at a time. Because the logger
 * is a module-level singleton, mounting multiple providers will cause them
 * to overwrite each other, and the cleanup of one will reset the logger
 * set by another.
 *
 * @example
 * ```tsx
 * import { LoggerProvider, type Logger } from "@anuma/sdk/react";
 *
 * const myLogger: Logger = {
 *   debug: () => {},
 *   info: (...args) => posthog.capture("sdk_info", { message: args }),
 *   warn: (...args) => console.warn("[SDK]", ...args),
 *   error: (...args) => Sentry.captureMessage(args.join(" ")),
 * };
 *
 * <LoggerProvider logger={myLogger}>
 *   <App />
 * </LoggerProvider>
 * ```
 */
export function LoggerProvider({ logger, children }: LoggerProviderProps) {
  useEffect(() => {
    setLogger(logger);
    return () => setLogger(consoleLogger);
  }, [logger]);

  return children;
}
