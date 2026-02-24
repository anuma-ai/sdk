import { describe, it, expect } from "vitest";
import { extractMCPImageUrls, replaceMCPUrlsWithPlaceholders } from "./mcpImages";

const MCP_DOMAIN = "ai-image-mcp-images.4cf0e0ea50b97e72386fcf2f92a2d4e8.r2.cloudflarestorage.com";
const MCP_URL_1 = `https://${MCP_DOMAIN}/image1.png?token=abc`;
const MCP_URL_2 = `https://${MCP_DOMAIN}/image2.png?token=def`;

describe("extractMCPImageUrls", () => {
  it("extracts URLs from tool_call_events with AnumaImageMCP prefix", () => {
    const events = [
      {
        name: "AnumaImageMCP_generate_cloud_image",
        output: JSON.stringify({ url: MCP_URL_1, model: "flux-1" }),
      },
    ];
    const result = extractMCPImageUrls("", events, MCP_DOMAIN);
    expect(result).toEqual([{ url: MCP_URL_1, model: "flux-1" }]);
  });

  it("extracts URLs from tool_call_events without prefix", () => {
    const events = [
      {
        name: "generate_cloud_image",
        output: JSON.stringify({ url: MCP_URL_1, model: "dall-e-3" }),
      },
    ];
    const result = extractMCPImageUrls("", events, MCP_DOMAIN);
    expect(result).toEqual([{ url: MCP_URL_1, model: "dall-e-3" }]);
  });

  it("falls back to content regex when tool_call_events is empty array", () => {
    const content = `Here is the image: ![cat](${MCP_URL_1})`;
    const result = extractMCPImageUrls(content, [], MCP_DOMAIN);
    expect(result).toHaveLength(1);
    expect(result[0].url).toBe(MCP_URL_1);
    expect(result[0].model).toBe("image");
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
    expect(result).toEqual([{ url: MCP_URL_1, model: "image" }]);
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
});

describe("replaceMCPUrlsWithPlaceholders", () => {
  it("replaces markdown image ![alt](mcpUrl) with ![alt](__SDKFILE__mediaId__)", () => {
    const content = `Here is the image:\n\n![cat](${MCP_URL_1})`;
    const map = new Map([[MCP_URL_1, "media_abc123"]]);
    const result = replaceMCPUrlsWithPlaceholders(content, map, MCP_DOMAIN);
    expect(result).toContain("![cat](__SDKFILE__media_abc123__)");
    expect(result).not.toContain(MCP_DOMAIN);
  });

  it("replaces HTML <img src='mcpUrl'> with placeholder markdown", () => {
    const content = `<img src="${MCP_URL_1}" alt="test">`;
    const map = new Map([[MCP_URL_1, "media_xyz"]]);
    const result = replaceMCPUrlsWithPlaceholders(content, map, MCP_DOMAIN);
    expect(result).toContain("![image](__SDKFILE__media_xyz__)");
    expect(result).not.toContain("<img");
  });

  it("replaces bare MCP URLs with placeholder", () => {
    const content = `Check this out: ${MCP_URL_1}`;
    const map = new Map([[MCP_URL_1, "media_bare"]]);
    const result = replaceMCPUrlsWithPlaceholders(content, map, MCP_DOMAIN);
    expect(result).toContain("__SDKFILE__media_bare__");
    expect(result).not.toContain(MCP_DOMAIN);
  });

  it("strips MCP URLs that have no matching mediaId (failed downloads)", () => {
    const content = `![img](${MCP_URL_1})`;
    const map = new Map<string, string>(); // empty — all failed
    const result = replaceMCPUrlsWithPlaceholders(content, map, MCP_DOMAIN);
    expect(result).not.toContain(MCP_DOMAIN);
    expect(result).not.toContain("![img]");
  });

  it("handles multiple images in same content", () => {
    const content = `![a](${MCP_URL_1})\n\n![b](${MCP_URL_2})`;
    const map = new Map([
      [MCP_URL_1, "media_1"],
      [MCP_URL_2, "media_2"],
    ]);
    const result = replaceMCPUrlsWithPlaceholders(content, map, MCP_DOMAIN);
    expect(result).toContain("__SDKFILE__media_1__");
    expect(result).toContain("__SDKFILE__media_2__");
  });

  it("handles mix of successful and failed URLs", () => {
    const content = `![ok](${MCP_URL_1})\n\n![fail](${MCP_URL_2})`;
    const map = new Map([[MCP_URL_1, "media_ok"]]);
    const result = replaceMCPUrlsWithPlaceholders(content, map, MCP_DOMAIN);
    expect(result).toContain("__SDKFILE__media_ok__");
    expect(result).not.toContain(MCP_URL_2);
  });

  it("cleans up extra whitespace after replacements", () => {
    const content = `text\n\n\n\n![img](${MCP_URL_1})\n\n\n\nmore`;
    const map = new Map<string, string>();
    const result = replaceMCPUrlsWithPlaceholders(content, map, MCP_DOMAIN);
    // Should collapse triple+ newlines to double
    expect(result).not.toMatch(/\n{3,}/);
  });

  it("returns content unchanged when no MCP URLs present", () => {
    const content = "Hello world, no images here.";
    const map = new Map<string, string>();
    const result = replaceMCPUrlsWithPlaceholders(content, map, MCP_DOMAIN);
    expect(result).toBe(content);
  });
});
