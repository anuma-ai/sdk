import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { CONNECTOR_ERROR_MARKER } from "../lib/connectors/errors.js";
import { createDriveTools } from "./googleDrive.js";

type ToolResult = unknown;

function toolByName(name: string) {
  const tool = createDriveTools(
    () => "good-token",
    async () => "good-token"
  ).find((t) => t.function.name === name);
  if (!tool?.executor) throw new Error(`no executor for ${name}`);
  return tool.executor as (args: Record<string, unknown>) => Promise<ToolResult>;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("Google Drive write tools", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test("google_drive_create_file posts multipart and returns id/name/webViewLink", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ id: "file-1", name: "notes.txt", webViewLink: "https://drive/file-1" })
    );

    const result = await toolByName("google_drive_create_file")({
      name: "notes.txt",
      content: "hello world",
    });

    expect(result).toEqual({
      id: "file-1",
      name: "notes.txt",
      webViewLink: "https://drive/file-1",
    });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain("/upload/drive/v3/files?uploadType=multipart");
    expect((init as RequestInit).method).toBe("POST");
    const headers = (init as RequestInit).headers as Record<string, string>;
    expect(headers["Content-Type"]).toContain("multipart/related; boundary=");
    expect((init as RequestInit).body).toContain("hello world");
    expect((init as RequestInit).body).toContain('"name":"notes.txt"');
  });

  test("google_drive_update_file patches with media upload and returns id/name", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: "file-1", name: "notes.txt" }));

    const result = await toolByName("google_drive_update_file")({
      fileId: "file-1",
      content: "updated",
    });

    expect(result).toEqual({ id: "file-1", name: "notes.txt" });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain("/upload/drive/v3/files/file-1?uploadType=media");
    expect((init as RequestInit).method).toBe("PATCH");
    expect((init as RequestInit).body).toBe("updated");
  });

  test("google_drive_create_file returns a connector error on 403", async () => {
    fetchMock.mockResolvedValueOnce(new Response("forbidden", { status: 403 }));

    const result = (await toolByName("google_drive_create_file")({
      name: "notes.txt",
      content: "hello",
    })) as string;

    const parsed = JSON.parse(result);
    expect(parsed[CONNECTOR_ERROR_MARKER]).toBe(true);
    expect(parsed.code).toBe("connector_not_connected");
    expect(parsed.provider).toBe("gdrive");
  });

  test("google_drive_update_file returns a connector error on 403", async () => {
    fetchMock.mockResolvedValueOnce(new Response("forbidden", { status: 403 }));

    const result = (await toolByName("google_drive_update_file")({
      fileId: "file-1",
      content: "hello",
    })) as string;

    const parsed = JSON.parse(result);
    expect(parsed[CONNECTOR_ERROR_MARKER]).toBe(true);
    expect(parsed.code).toBe("connector_not_connected");
    expect(parsed.provider).toBe("gdrive");
  });
});
