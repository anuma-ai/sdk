"use client";

import { type ReactNode, useLayoutEffect } from "react";

import { type Logger, getLogger, setLogger } from "../lib/logger";

export interface LoggerProviderProps {
  logger: Logger;
  children: ReactNode;
}

/**
 * Sets the active SDK logger for the lifetime of this component.
 * Restores the previous logger on unmount, so it can be nested or used
 * alongside a top-level `setLogger` call without discarding the outer logger.
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
  useLayoutEffect(() => {
    const previousLogger = getLogger();
    setLogger(logger);
    return () => setLogger(previousLogger);
  }, [logger]);

  return children;
}
