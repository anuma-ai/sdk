interface ToolCallEvent {
  name?: string;
  output?: string;
}

type ExtractedMediaKind = "image" | "video";

interface ExtractedMediaUrl {
  url: string;
  model: string;
  mediaType: ExtractedMediaKind;
}

/** Image tool names recognized by the MCP image pipeline. */
export const IMAGE_TOOL_NAMES = new Set([
  "AnumaMediaMCP-anuma_create_image",
  "anuma_create_image",
  "AnumaImageMCP-generate_cloud_image",
  "AnumaImageMCP-edit_cloud_image",
  "generate_cloud_image",
  "edit_cloud_image",
]);

/**
 * A tool's output as it is sent back to the model. An image tool's URLs are
 * stripped so the model can't echo prior images into the next turn, which
 * stores them twice. anuma_create_image returns `output_images: [{url,...}]`;
 * the old tools returned a single `imageUrl`/`url`.
 */
export function toolOutputForModel(name: string | undefined, output: string): string {
  if (!name || !IMAGE_TOOL_NAMES.has(name)) return output;
  try {
    const {
      imageUrl: _imageUrl,
      url: _url,
      output_images: _outputImages,
      ...rest
    } = JSON.parse(output) as Record<string, unknown>;
    return JSON.stringify(rest);
  } catch {
    return output;
  }
}

const VIDEO_TOOL_NAMES = new Set([
  "AnumaMediaMCP-anuma_create_video",
  "AnumaFalMCP-fal_generate_video",
  "anuma_create_video",
  "fal_generate_video",
]);

/**
 * Single source of truth for video file extensions. Adding a new format here
 * updates classification everywhere (extraction, fallback, and the relink
 * recovery op in db/media/operations.ts which imports this list + helper).
 */
export const VIDEO_EXTENSIONS = ["mp4", "webm", "mov"] as const;

const VIDEO_EXTENSION_RE = new RegExp(`\\.(${VIDEO_EXTENSIONS.join("|")})(?:[?#]|$)`, "i");

/** Extract the lowercased video extension from a URL/filename, or null. */
export function videoExtensionOf(value: string | undefined | null): string | null {
  return value?.match(VIDEO_EXTENSION_RE)?.[1]?.toLowerCase() ?? null;
}

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

  if (toolCallEvents && toolCallEvents.length > 0) {
    for (const event of toolCallEvents) {
      if (!event.name) continue;

      if (IMAGE_TOOL_NAMES.has(event.name)) {
        try {
          const output = JSON.parse(event.output || "{}") as {
            model?: string;
            imageUrl?: string;
            url?: string;
            output_images?: Array<{ url?: string }>;
          };
          const model = output.model || "image";
          const imageUrls = [
            ...new Set(
              [
                ...(output.output_images?.map((i) => i.url) ?? []),
                output.imageUrl,
                output.url,
              ].filter((u): u is string => Boolean(u))
            ),
          ];
          for (const url of imageUrls) {
            urls.push({ url, model, mediaType: "image" });
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
          const videoUrls = [
            ...new Set(
              [
                ...(output.videos?.map((v) => v.video_url) ?? []),
                output.videoUrl,
                output.url,
              ].filter((u): u is string => Boolean(u))
            ),
          ];
          for (const url of videoUrls) {
            urls.push({ url, model, mediaType: "video" });
          }
        } catch {
          // Malformed JSON — skip this event
        }
      }
    }
  }

  if (urls.length === 0 && content) {
    const escaped = mcpR2Domain.replace(/\./g, "\\.");
    const patterns = [
      new RegExp(`https://${escaped}[^\\s"'<>)\\]]+`, "gi"),
      new RegExp(`https?://[^\\s"'<>)\\]]+/api/v1/media/[^/\\s"'<>)\\]]+/[^\\s"'<>)\\]]+`, "gi"),
    ];
    const matches = patterns.flatMap((re) => content.match(re) ?? []);
    if (matches.length > 0) {
      const seen = new Set<string>();
      for (const url of matches) {
        const normalized = url.replace(/[)"'>\s]+$/, "");
        if (!seen.has(normalized)) {
          seen.add(normalized);
          const mediaType = classifyUrl(normalized);
          urls.push({ url: normalized, model: "image", mediaType });
        }
      }
    }
  }

  return urls;
}
