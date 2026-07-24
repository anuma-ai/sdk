/**
 * Server-tools policy — resolve the concrete server-tools filter for a turn
 * from the app-injected {@link ServerToolCatalog} (issue #702, Phase 2).
 *
 * The catalog is opaque to the SDK: each app builds it from its own static
 * server-tool lists (`IMAGE_SERVER_TOOLS`, `SLIDE_SERVER_TOOLS`, …) and passes
 * it in. This module only knows how to pick the right entry and, when the entry
 * is an attachment-aware factory, apply it with the turn's context.
 */

import type {
  CreationIntent,
  ServerToolCatalog,
  ServerToolCatalogEntry,
  ServerToolsFilter,
  ToolIntentDescriptor,
} from "./intents";

/**
 * Look up the catalog entry for a descriptor. Chat turns key on the creation
 * intent; council/aggregation turns key on the lane.
 */
export function getCatalogEntry(
  descriptor: ToolIntentDescriptor,
  catalog: ServerToolCatalog
): ServerToolCatalogEntry | undefined {
  if (descriptor.lane === "council" || descriptor.lane === "aggregation") {
    return catalog[descriptor.lane];
  }
  return catalog[descriptor.creation];
}

/**
 * Resolve a catalog entry's server tools to a concrete filter. The
 * attachment-aware `resolveServerTools` factory takes precedence over the
 * static `serverTools` value. When the intent has no catalog entry (or an empty
 * one) the fallback is used — defaulting to an empty allow-list, which
 * `resolveToolChoice` reads as `auto`.
 */
export function resolveServerTools(
  descriptor: ToolIntentDescriptor,
  catalog: ServerToolCatalog,
  fallback: ServerToolsFilter = []
): ServerToolsFilter {
  const entry = getCatalogEntry(descriptor, catalog);
  if (!entry) return fallback;
  if (entry.resolveServerTools) {
    return entry.resolveServerTools({ attachments: descriptor.attachments });
  }
  return entry.serverTools ?? fallback;
}

/**
 * A creation intent whose server tools are a coercing (non-empty static) list —
 * useful for tests and diagnostics. Distinguishes the "required" creation modes
 * from the semantic-filter chat modes without resolving a full plan.
 */
export function isCoercingIntent(creation: CreationIntent, catalog: ServerToolCatalog): boolean {
  const entry = catalog[creation];
  if (!entry) return false;
  const slot = entry.serverTools;
  return Array.isArray(slot) && slot.length > 0;
}
