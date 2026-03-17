/**
 * Generic factories for creating client-side UI interaction tools.
 *
 * These factories handle the boilerplate of wiring tool executors to the
 * UIInteractionProvider lifecycle (ID generation, context injection,
 * promise resolution). Apps provide the tool schema and any custom logic.
 */

import type { ToolConfig } from "../lib/chat/useChat/types.js";

/**
 * Minimal context interface required by tool factories.
 * Matches the methods provided by UIInteractionProvider.
 */
export type UIInteractionContext = {
  createInteraction: (id: string, type: string, data: any) => Promise<any>;
  createDisplayInteraction: (
    id: string,
    displayType: string,
    data: any,
    result: any,
    toolVersion?: number
  ) => void;
};

/**
 * Options for context injection, following the same getter pattern
 * as createGoogleCalendarTool and createDriveTools.
 */
export type CreateUIToolsOptions = {
  /** Returns the current UIInteractionContext (or null if unavailable) */
  getContext: () => UIInteractionContext | null;
  /** Returns the ID of the last message in the conversation (used for anchoring) */
  getLastMessageId?: () => string | undefined;
};

/**
 * Configuration for an interactive tool that waits for user input.
 */
export type InteractiveToolConfig = {
  /** Tool name as called by the LLM (e.g. "prompt_user_choice") */
  name: string;
  /** Tool description shown to the LLM */
  description: string;
  /** JSON Schema for tool parameters */
  parameters: Record<string, unknown>;
  /** Interaction type string used by the provider (e.g. "choice", "form") */
  interactionType: string;
  /** Optional validation of LLM-provided args. Return false to cancel. */
  validate?: (args: any) => boolean;
  /** Transform args before storing as interaction data */
  mapArgs?: (args: any) => any;
  /** Transform the user's result before returning to the LLM */
  mapResult?: (result: any, args: any) => any;
};

/**
 * Migration map for a display tool.
 * Keys are "fromVersion->toVersion" strings (e.g. "1->2").
 * Each function receives the stored result at fromVersion and returns the
 * result upgraded to toVersion.
 *
 * @example
 * ```typescript
 * migrations: {
 *   "1->2": (old) => ({ ...old, newField: old.legacyField ?? defaultValue }),
 * }
 * ```
 */
export type DisplayToolMigrations = {
  [key: `${number}->${number}`]: (data: any) => any;
};

/**
 * Configuration for a display-only tool that renders data without blocking.
 */
export type DisplayToolConfig<TArgs = any, TResult = any> = {
  /** Tool name as called by the LLM (e.g. "display_weather") */
  name: string;
  /** Tool description shown to the LLM */
  description: string;
  /** JSON Schema for tool parameters */
  parameters: Record<string, unknown>;
  /** Display type string used to dispatch rendering (e.g. "weather") */
  displayType: string;
  /** Execute function that fetches/computes the display data */
  execute: (args: TArgs) => Promise<TResult>;
  /**
   * Schema version for the result format. Increment when the result shape
   * changes in a backward-incompatible way. Default: 1.
   */
  version?: number;
  /**
   * Migration functions keyed by "fromVersion->toVersion".
   * Used to upgrade stored results to the current version on restore.
   */
  migrations?: DisplayToolMigrations;
};

/**
 * Migrate a stored display result from an older version to the current version.
 *
 * Runs the migration chain step-by-step: fromVersion → fromVersion+1 → … → toVersion.
 * Steps with no registered migration function are skipped (result passes through unchanged).
 * Returns the original result unchanged if fromVersion >= toVersion.
 *
 * @example
 * ```typescript
 * const migrated = migrateDisplayResult(storedResult, 1, 3, {
 *   "1->2": (v1) => ({ ...v1, added: v1.old ?? 0 }),
 *   "2->3": (v2) => ({ ...v2, renamed: v2.added }),
 * });
 * ```
 */
export function migrateDisplayResult(
  result: any,
  fromVersion: number,
  toVersion: number,
  migrations: DisplayToolMigrations
): any {
  if (fromVersion >= toVersion) return result;
  let current = result;
  for (let v = fromVersion; v < toVersion; v++) {
    const key: `${number}->${number}` = `${v}->${v + 1}`;
    const migrate = migrations[key];
    if (migrate) {
      current = migrate(current);
    }
  }
  return current;
}

function generateInteractionId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Create an interactive tool that waits for user input.
 *
 * When the LLM calls this tool, it creates a pending interaction in
 * the UIInteractionProvider and returns a Promise that resolves when
 * the user responds via the UI.
 *
 * @example
 * ```typescript
 * const choiceTool = createInteractiveTool(
 *   { getContext: () => uiInteraction, getLastMessageId: () => lastMsgId },
 *   {
 *     name: "prompt_user_choice",
 *     description: "Present choices to the user",
 *     parameters: { type: "object", properties: { ... } },
 *     interactionType: "choice",
 *     validate: (args) => args.title && args.options?.length >= 2,
 *   }
 * );
 * ```
 */
export function createInteractiveTool(
  options: CreateUIToolsOptions,
  config: InteractiveToolConfig
): ToolConfig {
  return {
    type: "function",
    function: {
      name: config.name,
      description: config.description,
      arguments: config.parameters,
    },
    executor: async (args: Record<string, unknown>): Promise<unknown> => {
      if (config.validate && !config.validate(args)) {
        return { cancelled: true };
      }

      const context = options.getContext();
      if (!context) {
        return { cancelled: true };
      }

      const interactionId = generateInteractionId(config.interactionType);
      const interactionData = config.mapArgs ? config.mapArgs(args) : args;

      try {
        const result = await context.createInteraction(interactionId, config.interactionType, {
          ...interactionData,
          afterMessageId: options.getLastMessageId?.(),
        });

        if (config.mapResult) {
          return config.mapResult(result, args);
        }

        return result;
      } catch {
        return { cancelled: true };
      }
    },
    // Interactive tools wait for user input and should not be subject
    // to the default 30-second executor timeout.
    executorTimeout: Infinity,
  };
}

/**
 * Create a display-only tool that renders data without blocking.
 *
 * When the LLM calls this tool, it executes the provided function,
 * stores the result as a resolved display interaction for rendering,
 * and immediately returns the data to the LLM.
 *
 * @example
 * ```typescript
 * const weatherTool = createDisplayTool(
 *   { getContext: () => uiInteraction, getLastMessageId: () => lastMsgId },
 *   {
 *     name: "display_weather",
 *     description: "Show weather for a location",
 *     parameters: { type: "object", properties: { location: { type: "string" } } },
 *     displayType: "weather",
 *     execute: async (args) => fetchWeatherData(args.location),
 *   }
 * );
 * ```
 */
export function createDisplayTool<TArgs = any, TResult = any>(
  options: CreateUIToolsOptions,
  config: DisplayToolConfig<TArgs, TResult>
): ToolConfig {
  return {
    type: "function",
    function: {
      name: config.name,
      description: config.description,
      arguments: config.parameters,
    },
    executor: async (args: Record<string, unknown>): Promise<unknown> => {
      const result = await config.execute(args as unknown as TArgs);

      const context = options.getContext();
      if (context) {
        const interactionId = generateInteractionId(config.displayType);
        context.createDisplayInteraction(
          interactionId,
          config.displayType,
          { afterMessageId: options.getLastMessageId?.() },
          result,
          config.version ?? 1
        );
      }

      return result;
    },
    skipContinuation: true,
  };
}
