/**
 * Pure functions for extracting MCP image URLs.
 *
 * These are extracted from `useChatStorage.extractAndStoreEncryptedMCPImages`
 * so they can be tested in isolation without React hooks or OPFS dependencies.
 */

/** Minimal tool call event shape needed for URL extraction. */
interface ToolCallEvent {
  name?: string;
  output?: string;
}

/** Extracted image URL with its associated model. */
interface ExtractedImageUrl {
  url: string;
  model: string;
}

/** Image tool names recognized by the MCP image pipeline. */
export const IMAGE_TOOL_NAMES = new Set([
  "AnumaImageMCP-generate_cloud_image",
  "AnumaImageMCP-edit_cloud_image",
  "generate_cloud_image",
  "edit_cloud_image",
]);

/**
 * Extracts MCP image URLs from tool_call_events (primary) or content (fallback).
 *
 * Primary path: parses JSON output of image-generation tool calls.
 * Fallback path: regex-matches MCP R2 domain URLs embedded in content.
 *
 * @param content    - The message content (may contain markdown/HTML image refs)
 * @param toolCallEvents - Tool call events from streaming accumulator
 * @param mcpR2Domain    - The R2 domain to match (e.g. "ai-image-mcp-images.xxx.r2.cloudflarestorage.com")
 * @returns Array of extracted URLs with model info
 */
export function extractMCPImageUrls(
  content: string,
  toolCallEvents: ToolCallEvent[] | undefined,
  mcpR2Domain: string
): ExtractedImageUrl[] {
  const urls: ExtractedImageUrl[] = [];

  // Primary: extract from tool_call_events
  if (toolCallEvents && toolCallEvents.length > 0) {
    for (const event of toolCallEvents) {
      if (event.name && IMAGE_TOOL_NAMES.has(event.name)) {
        try {
          const output = JSON.parse(event.output || "{}") as { model?: string; url?: string };
          const { model, url } = output;
          if (url) {
            urls.push({ url, model: model || "image" });
          }
        } catch {
          // Malformed JSON — skip this event
        }
      }
    }
  }

  // Fallback: regex-match MCP R2 URLs in content when tool_call_events yield nothing
  if (urls.length === 0 && content) {
    const escaped = mcpR2Domain.replace(/\./g, "\\.");
    const urlPattern = new RegExp(`https://${escaped}[^\\s"'<>)\\]]+`, "gi");
    const matches = content.match(urlPattern);
    if (matches) {
      const seen = new Set<string>();
      for (const url of matches) {
        const normalized = url.replace(/[)"'>\s]+$/, "");
        if (!seen.has(normalized)) {
          seen.add(normalized);
          urls.push({ url: normalized, model: "image" });
        }
      }
    }
  }

  return urls;
}
