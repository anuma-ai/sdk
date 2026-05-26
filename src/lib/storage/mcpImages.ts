/**
 * Pure functions for extracting MCP media URLs (images and videos).
 *
 * These are extracted from `useChatMedia.extractAndStoreEncryptedMCPImages`
 * so they can be tested in isolation without React hooks or OPFS dependencies.
 */

/** Minimal tool call event shape needed for URL extraction. */
interface ToolCallEvent {
  name?: string;
  output?: string;
}

/** Media kind an extracted URL resolves to. */
type ExtractedMediaKind = "image" | "video";

/** Extracted media URL with its associated model and resolved kind. */
interface ExtractedMediaUrl {
  url: string;
  model: string;
  /** "video" when the URL/tool is a video source, otherwise "image". */
  mediaType: ExtractedMediaKind;
}

/** Image tool names recognized by the MCP image pipeline. */
export const IMAGE_TOOL_NAMES = new Set([
  "AnumaImageMCP-generate_cloud_image",
  "AnumaImageMCP-edit_cloud_image",
  "generate_cloud_image",
  "edit_cloud_image",
]);

/** Video tool names recognized by the MCP video pipeline. */
const VIDEO_TOOL_NAMES = new Set([
  "AnumaMediaMCP-anuma_create_video",
  "AnumaFalMCP-fal_generate_video",
  "anuma_create_video",
  "fal_generate_video",
]);

/** Video file extensions — used to classify URLs the fallback regex captures. */
const VIDEO_EXTENSION_RE = /\.(mp4|webm|mov)(?:\?|$)/i;

/** Classify a URL by file extension. Defaults to image. */
function classifyUrl(url: string): ExtractedMediaKind {
  return VIDEO_EXTENSION_RE.test(url) ? "video" : "image";
}

/**
 * Extracts MCP media URLs from tool_call_events (primary) or content (fallback).
 *
 * Primary path: parses JSON output of image- and video-generation tool calls.
 * Fallback path: regex-matches MCP R2 domain URLs in content and classifies
 * each by file extension (so videos aren't mislabeled as images).
 *
 * The function name is retained for call-site stability; it now returns videos
 * too, each tagged with `mediaType`.
 *
 * @param content    - The message content (may contain markdown/HTML media refs)
 * @param toolCallEvents - Tool call events from streaming accumulator
 * @param mcpR2Domain    - The R2 domain to match
 * @returns Array of extracted URLs with model + mediaType info
 */
export function extractMCPImageUrls(
  content: string,
  toolCallEvents: ToolCallEvent[] | undefined,
  mcpR2Domain: string
): ExtractedMediaUrl[] {
  const urls: ExtractedMediaUrl[] = [];

  // Primary: extract from tool_call_events
  if (toolCallEvents && toolCallEvents.length > 0) {
    for (const event of toolCallEvents) {
      if (!event.name) continue;

      if (IMAGE_TOOL_NAMES.has(event.name)) {
        try {
          const output = JSON.parse(event.output || "{}") as {
            model?: string;
            imageUrl?: string;
            url?: string;
          };
          // Tool output uses "imageUrl"; also check "url" for backward compatibility
          const imageUrl = output.imageUrl || output.url;
          if (imageUrl) {
            urls.push({ url: imageUrl, model: output.model || "image", mediaType: "image" });
          }
        } catch {
          // Malformed JSON — skip this event
        }
      } else if (VIDEO_TOOL_NAMES.has(event.name)) {
        try {
          const output = JSON.parse(event.output || "{}") as {
            model?: string;
            videos?: Array<{ video_url?: string }>;
            videoUrl?: string;
            url?: string;
          };
          const model = output.model || "video";
          // Video tools return a `videos: [{ video_url }]` array; fall back to
          // single videoUrl/url for resilience.
          const videoUrls = [
            ...(output.videos?.map((v) => v.video_url) ?? []),
            output.videoUrl,
            output.url,
          ].filter((u): u is string => Boolean(u));
          for (const url of videoUrls) {
            urls.push({ url, model, mediaType: "video" });
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
          const mediaType = classifyUrl(normalized);
          urls.push({ url: normalized, model: mediaType, mediaType });
        }
      }
    }
  }

  return urls;
}
