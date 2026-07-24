/**
 * Send-policy primitives — the per-turn `tool_choice` / `maxToolRounds` /
 * thinking-mode / coerced-memory-write rules, unified so web and mobile stop
 * hand-duplicating them (issue #702, Phase 1).
 *
 * These were previously spread across web's `useChatSetup` + `useChatSubmitHandler`
 * + `webChatSendMessage` and mobile's `chatModeRouting`. They are pure and
 * node/RN-safe.
 */

import type { LlmapiChatCompletionTool } from "../../../client";
import { getToolName } from "../clientToolSelection";
import type {
  ServerToolCatalogEntry,
  ServerToolsFilter,
  ThinkingModeHint,
  ToolChoice,
} from "./intents";

/** The vault-save tool name — the one client tool stripped on a coerced turn. */
export const MEMORY_SAVE_TOOL_NAME = "memory_vault_save";

/**
 * Resolve the turn's tool-choice from the SHAPE of its server-tools filter,
 * unless the caller/catalog set an explicit value.
 *
 * The rule (matching both apps today): an explicit choice wins; otherwise a
 * non-empty static array of server tools coerces `required` (creation modes
 * like image/audio/video/remove-bg must call their one tool), while a filter
 * function or an empty array defers to `auto` (plain chat, and builder modes
 * whose server list is empty).
 *
 * This is load-bearing: naively defaulting an unset choice to `auto` would
 * silently downgrade image/audio/video/remove-bg from single-forced-tool to
 * `auto` — a real behavior regression.
 */
export function resolveToolChoice(
  serverTools: ServerToolsFilter,
  explicit?: ToolChoice
): ToolChoice {
  if (explicit) return explicit;
  if (Array.isArray(serverTools)) return serverTools.length > 0 ? "required" : "auto";
  return "auto";
}

/**
 * The per-turn max tool rounds. Returns the catalog entry's value when set,
 * else the supplied fallback (e.g. web's flat 35), else undefined to let the
 * SDK/host default apply.
 */
export function getMaxToolRounds(
  entry: ServerToolCatalogEntry | undefined,
  fallback?: number
): number | undefined {
  return entry?.maxToolRounds ?? fallback;
}

/**
 * The per-turn thinking hint. Returns the catalog entry's value when set, else
 * undefined so the host applies its model-dependent default (e.g. web's
 * gemini-fast→`fast`, otherwise `thinking`). The app translates the hint into
 * its provider reasoning config.
 */
export function getThinkingMode(
  entry: ServerToolCatalogEntry | undefined,
  fallback?: ThinkingModeHint
): ThinkingModeHint | undefined {
  return entry?.thinkingMode ?? fallback;
}

/**
 * Remove `memory_vault_save` from a client-tool list when the turn coerces a
 * single tool (`tool_choice: "required"`). Under coercion the model MUST call
 * exactly one tool; leaving the save tool in risks the model "saving" instead
 * of running the coerced generator. Both apps do this today.
 *
 * `recall_memory` and every other tool are preserved. Returns the same array
 * reference when nothing changed, so callers can cheaply skip re-renders.
 */
export function stripCoercedMemoryWrite<T extends LlmapiChatCompletionTool>(
  clientTools: T[],
  toolChoice: ToolChoice
): T[] {
  if (toolChoice !== "required") return clientTools;
  const filtered = clientTools.filter((t) => getToolName(t) !== MEMORY_SAVE_TOOL_NAME);
  return filtered.length === clientTools.length ? clientTools : filtered;
}
