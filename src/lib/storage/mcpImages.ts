/**
 * Pure functions for extracting and replacing MCP image URLs.
 *
 * These are extracted from `useChatStorage.extractAndStoreEncryptedMCPImages`
 * so they can be tested in isolation without React hooks or OPFS dependencies.
 */

import { createFilePlaceholder } from "./opfs";

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
const IMAGE_TOOL_NAMES = new Set([
  "AnumaImageMCP_generate_cloud_image",
  "AnumaImageMCP_edit_cloud_image",
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
          const output = JSON.parse(event.output || "{}");
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

/**
 * Replaces MCP R2 URLs in content with `__SDKFILE__` placeholders for successfully
 * downloaded images, and strips MCP URLs for failed downloads.
 *
 * Handles three URL embedding formats:
 *   - Markdown images: `![alt](mcpUrl)`
 *   - HTML img tags: `<img src="mcpUrl" ...>`
 *   - Bare URLs
 *
 * @param content         - The message content
 * @param urlToMediaIdMap - Map from original MCP URL → mediaId (only successful downloads)
 * @param mcpR2Domain     - The R2 domain to match
 * @returns Content with placeholders inserted and failed/unmatched URLs stripped
 */
export function replaceMCPUrlsWithPlaceholders(
  content: string,
  urlToMediaIdMap: Map<string, string>,
  mcpR2Domain: string
): string {
  let result = content;
  const escapedDomain = mcpR2Domain.replace(/\./g, "\\.");

  // 1. Replace markdown images: ![alt](mcpUrl) → ![alt](__SDKFILE__mediaId__)
  result = result.replace(
    new RegExp(`!\\[([^\\]]*)\\]\\([\\s]*(https://${escapedDomain}[^)]*?)\\)`, "g"),
    (_match, alt: string, url: string) => {
      const mediaId = findMediaIdForUrl(url, urlToMediaIdMap);
      if (mediaId) {
        return `![${alt}](${createFilePlaceholder(mediaId)})`;
      }
      // Failed download — strip
      return "";
    }
  );

  // 2. Replace HTML img tags: <img src="mcpUrl" ...> → placeholder markdown
  result = result.replace(
    new RegExp(`<img[^>]*src=["'](https://${escapedDomain}[^"']*?)["'][^>]*>`, "gi"),
    (_match, url: string) => {
      const mediaId = findMediaIdForUrl(url, urlToMediaIdMap);
      if (mediaId) {
        return `![image](${createFilePlaceholder(mediaId)})`;
      }
      return "";
    }
  );

  // 3. Replace bare MCP URLs (not already handled above)
  result = result.replace(
    new RegExp(`(https://${escapedDomain}[^\\s"'<>)\\]]+)`, "gi"),
    (url: string) => {
      const mediaId = findMediaIdForUrl(url, urlToMediaIdMap);
      if (mediaId) {
        return `![image](${createFilePlaceholder(mediaId)})`;
      }
      return "";
    }
  );

  // Clean up extra whitespace/newlines left by stripping
  result = result.replace(/\n{3,}/g, "\n\n").trim();

  return result;
}

/**
 * Look up a URL in the urlToMediaIdMap, trying both exact match
 * and normalized (query-string-stripped) match.
 */
function findMediaIdForUrl(url: string, urlToMediaIdMap: Map<string, string>): string | undefined {
  // Exact match first
  const exact = urlToMediaIdMap.get(url);
  if (exact) return exact;

  // Try normalized (strip trailing punctuation)
  const normalized = url.replace(/[)"'>\s]+$/, "");
  return urlToMediaIdMap.get(normalized);
}
