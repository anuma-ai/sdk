import { describe, it, expect } from "vitest";
import { extractMCPImageUrls } from "./mcpImages";

const MCP_DOMAIN = "ai-image-mcp-images.4cf0e0ea50b97e72386fcf2f92a2d4e8.r2.cloudflarestorage.com";
const MCP_URL_1 = `https://${MCP_DOMAIN}/image1.png?token=abc`;
const MCP_URL_2 = `https://${MCP_DOMAIN}/image2.png?token=def`;
const MCP_VIDEO_URL = `https://${MCP_DOMAIN}/2026-05-26/clip.mp4?X-Amz-Signature=abc`;

describe("extractMCPImageUrls", () => {
  it("extracts URLs from tool_call_events with AnumaImageMCP prefix", () => {
    const events = [
      {
        name: "AnumaImageMCP-generate_cloud_image",
        output: JSON.stringify({ url: MCP_URL_1, model: "flux-1" }),
      },
    ];
    const result = extractMCPImageUrls("", events, MCP_DOMAIN);
    expect(result).toEqual([{ url: MCP_URL_1, model: "flux-1", mediaType: "image" }]);
  });

  it("extracts URLs from tool_call_events without prefix", () => {
    const events = [
      {
        name: "generate_cloud_image",
        output: JSON.stringify({ url: MCP_URL_1, model: "dall-e-3" }),
      },
    ];
    const result = extractMCPImageUrls("", events, MCP_DOMAIN);
    expect(result).toEqual([{ url: MCP_URL_1, model: "dall-e-3", mediaType: "image" }]);
  });

  it("falls back to content regex when tool_call_events is empty array", () => {
    const content = `Here is the image: ![cat](${MCP_URL_1})`;
    const result = extractMCPImageUrls(content, [], MCP_DOMAIN);
    expect(result).toHaveLength(1);
    expect(result[0].url).toBe(MCP_URL_1);
    expect(result[0].model).toBe("image");
    expect(result[0].mediaType).toBe("image");
  });

  it("falls back to content regex when tool_call_events is undefined", () => {
    const content = `Check it out: ${MCP_URL_1}`;
    const result = extractMCPImageUrls(content, undefined, MCP_DOMAIN);
    expect(result).toHaveLength(1);
    expect(result[0].url).toBe(MCP_URL_1);
  });

  it("deduplicates URLs from content", () => {
    const content = `![img1](${MCP_URL_1}) and again ${MCP_URL_1}`;
    const result = extractMCPImageUrls(content, undefined, MCP_DOMAIN);
    expect(result).toHaveLength(1);
  });

  it("returns empty array when no MCP URLs found", () => {
    const result = extractMCPImageUrls("Hello world", undefined, MCP_DOMAIN);
    expect(result).toEqual([]);
  });

  it("handles malformed JSON in tool_call_event output gracefully", () => {
    const events = [
      {
        name: "generate_cloud_image",
        output: "not valid json {{{",
      },
    ];
    const result = extractMCPImageUrls("", events, MCP_DOMAIN);
    expect(result).toEqual([]);
  });

  it("defaults model to 'image' when not in tool output", () => {
    const events = [
      {
        name: "edit_cloud_image",
        output: JSON.stringify({ url: MCP_URL_1 }),
      },
    ];
    const result = extractMCPImageUrls("", events, MCP_DOMAIN);
    expect(result).toEqual([{ url: MCP_URL_1, model: "image", mediaType: "image" }]);
  });

  it("does not use content fallback when tool_call_events yield URLs", () => {
    const events = [
      {
        name: "generate_cloud_image",
        output: JSON.stringify({ url: MCP_URL_1 }),
      },
    ];
    // Content has a different URL — should NOT be extracted since events succeeded
    const content = `![img](${MCP_URL_2})`;
    const result = extractMCPImageUrls(content, events, MCP_DOMAIN);
    expect(result).toHaveLength(1);
    expect(result[0].url).toBe(MCP_URL_1);
  });

  // --- Video classification ---------------------------------------------------

  it("classifies a video tool's output as video (videos[] array shape)", () => {
    const events = [
      {
        name: "AnumaMediaMCP-anuma_create_video",
        output: JSON.stringify({ model: "veo-3.1", videos: [{ video_url: MCP_VIDEO_URL }] }),
      },
    ];
    const result = extractMCPImageUrls("", events, MCP_DOMAIN);
    expect(result).toEqual([{ url: MCP_VIDEO_URL, model: "veo-3.1", mediaType: "video" }]);
  });

  it("classifies fal video tool output as video", () => {
    const events = [
      {
        name: "AnumaFalMCP-fal_generate_video",
        output: JSON.stringify({ videoUrl: MCP_VIDEO_URL }),
      },
    ];
    const result = extractMCPImageUrls("", events, MCP_DOMAIN);
    expect(result).toEqual([{ url: MCP_VIDEO_URL, model: "video", mediaType: "video" }]);
  });

  it("classifies a .mp4 URL captured by the content fallback as video", () => {
    const content = `Your video: ${MCP_VIDEO_URL}`;
    const result = extractMCPImageUrls(content, undefined, MCP_DOMAIN);
    expect(result).toHaveLength(1);
    expect(result[0].url).toBe(MCP_VIDEO_URL);
    expect(result[0].mediaType).toBe("video");
  });

  it("classifies a .png URL captured by the content fallback as image", () => {
    const content = `Your image: ${MCP_URL_1}`;
    const result = extractMCPImageUrls(content, undefined, MCP_DOMAIN);
    expect(result[0].mediaType).toBe("image");
  });
});
