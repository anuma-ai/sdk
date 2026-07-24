/**
 * `deriveActiveToolSets` — event-shape-agnostic sticky tool-set derivation
 * (issue #702, Phase 4).
 *
 * Web derived sticky sets by scanning `ChatMessage[]` for two web-specific
 * signals: synthetic tool-result user messages (`Tool "<name>" returned: …`)
 * and `ActivityPhase.id`s shaped `server-tool-<name>-<n>`. This module keeps the
 * exact matching logic but keys on a neutral {@link ToolActivationEvent[]}, so
 * both apps feed it through a tiny adapter that maps their own message/activity
 * store to events. That closes the terse-follow-up gap on mobile: a 3-char
 * "yes" inside a slide conversation keeps the slide toolkit because the set
 * stays sticky.
 *
 * Pure and node/RN-safe.
 */

import { BUILT_IN_TOOL_SETS, type ToolSet } from "../serverTools";

/**
 * A neutral activation signal derived from conversation history.
 *
 * - `tool-result` — a tool ran and returned; `toolName` is the tool's name.
 * - `server-tool-phase` — a server-tool activity phase occurred; `phaseId` is
 *   the phase id (shaped like `server-tool-<name>-<n>` on web).
 */
export interface ToolActivationEvent {
  kind: "tool-result" | "server-tool-phase";
  /** The tool name, for `tool-result` events. */
  toolName?: string;
  /** The phase id, for `server-tool-phase` events. */
  phaseId?: string;
}

/** Does a `server-tool-phase` id correspond to a given tool-set member? */
function phaseMatchesMember(phaseId: string, member: string): boolean {
  if (!phaseId) return false;
  return phaseId === member || phaseId.endsWith(`-${member}`) || phaseId.includes(`-${member}-`);
}

/** Does a single event indicate the given member fired? */
function eventMatchesMember(event: ToolActivationEvent, member: string): boolean {
  if (event.kind === "tool-result") {
    return !!event.toolName && event.toolName === member;
  }
  return !!event.phaseId && phaseMatchesMember(event.phaseId, member);
}

/**
 * Derive the set of tool-set names that have "genuinely activated" across a
 * conversation's activation events. Accumulation is monotonic: a set, once
 * detected, stays detected; the scan early-exits once every set is active.
 *
 * @param events - Neutral activation signals, oldest-to-newest.
 * @param sets - Tool sets to test against (defaults to `BUILT_IN_TOOL_SETS`).
 * @returns The active tool-set names, to pass as `activeToolSets`.
 */
export function deriveActiveToolSets(
  events: ToolActivationEvent[],
  sets: readonly ToolSet[] = BUILT_IN_TOOL_SETS
): string[] {
  const active = new Set<string>();
  for (const event of events) {
    for (const ts of sets) {
      if (active.has(ts.name)) continue;
      if (ts.members.some((member) => eventMatchesMember(event, member))) {
        active.add(ts.name);
      }
    }
    if (active.size === sets.length) break;
  }
  return [...active];
}

/**
 * Merge freshly-derived sticky sets into an existing sticky list without ever
 * removing (append-only union). Mirrors web's Zustand `setFor`: an empty
 * detection means a truncated/paginated history window, not "drop stickiness".
 * Returns the same array reference when nothing changed.
 */
export function mergeActiveToolSets(current: string[], derived: string[]): string[] {
  if (derived.length === 0) return current;
  const merged = Array.from(new Set([...current, ...derived]));
  return merged.length === current.length ? current : merged;
}
