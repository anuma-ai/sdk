import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { CONNECTOR_ERROR_MARKER } from "../lib/connectors/errors.js";
import { consoleLogger, setLogger } from "../lib/logger";
import { createDriveTools } from "./googleDrive.js";

type ToolResult = unknown;

function toolByName(name: string) {
  const tool = createDriveTools(
    () => "good-token",
    async () => "good-token"
  ).find((t) => (t.function as { name: string }).name === name);
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

  test("google_drive_create_file rejects a native Google Docs mimeType without calling fetch", async () => {
    const result = await toolByName("google_drive_create_file")({
      name: "notes",
      content: "hello",
      mimeType: "application/vnd.google-apps.document",
    });

    expect(result).toBe(
      "Error: this tool creates plain files only; native Google Docs/Sheets/Slides aren't supported. Omit mimeType or use a blob type like text/plain."
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("google_drive_update_file rejects a native Google Docs mimeType without calling fetch", async () => {
    const result = await toolByName("google_drive_update_file")({
      fileId: "file-1",
      content: "hello",
      mimeType: "application/vnd.google-apps.document",
    });

    expect(result).toBe(
      "Error: this tool creates plain files only; native Google Docs/Sheets/Slides aren't supported. Omit mimeType or use a blob type like text/plain."
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("Google Drive input safety", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    setLogger(consoleLogger);
  });

  function driveQueryOf(callIndex: number): string {
    const url = new URL(fetchMock.mock.calls[callIndex][0] as string);
    return url.searchParams.get("q") ?? "";
  }

  const badIds = ["..", "../../x/events/y", "%2e%2e/x", "abc?alt=media", "a.b"];

  test.each(badIds)(
    "google_drive_get_content rejects fileId %j without calling fetch",
    async (fileId) => {
      const result = await toolByName("google_drive_get_content")({ fileId });

      expect(result).toBe(`Error: Invalid file ID: ${fileId}`);
      expect(fetchMock).not.toHaveBeenCalled();
    }
  );

  test.each(badIds)(
    "google_drive_update_file rejects fileId %j without calling fetch",
    async (fileId) => {
      const result = await toolByName("google_drive_update_file")({ fileId, content: "x" });

      expect(result).toBe(`Error: Invalid file ID: ${fileId}`);
      expect(fetchMock).not.toHaveBeenCalled();
    }
  );

  test("google_drive_get_content rejects an id returned by a name search when it is malformed", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ files: [{ id: "../x", name: "notes" }] }));

    const result = await toolByName("google_drive_get_content")({ fileName: "notes" });

    expect(result).toBe("Error: Invalid file ID: ../x");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test("google_drive_get_content reads a real-shaped id", async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({ id: "1aBc-De_F", name: "notes.txt", mimeType: "text/plain" })
      )
      .mockResolvedValueOnce(new Response("hello", { status: 200 }));

    const result = await toolByName("google_drive_get_content")({ fileId: "1aBc-De_F" });

    expect(result).toContain("hello");
    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://www.googleapis.com/drive/v3/files/1aBc-De_F?fields=id,name,mimeType,webViewLink&supportsAllDrives=true"
    );
    expect(fetchMock.mock.calls[1][0]).toBe(
      "https://www.googleapis.com/drive/v3/files/1aBc-De_F?alt=media&supportsAllDrives=true"
    );
  });

  test("google_drive_search escapes quotes and backslashes in the query", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ files: [] }));

    await toolByName("google_drive_search")({ query: "x' or name contains '" });
    await toolByName("google_drive_search")({ query: "a\\' or trashed = true or name = '" });

    expect(driveQueryOf(0)).toBe(
      "fullText contains 'x\\' or name contains \\'' and trashed = false"
    );
    expect(driveQueryOf(1)).toBe(
      "fullText contains 'a\\\\\\' or trashed = true or name = \\'' and trashed = false"
    );
  });

  test("google_drive_get_content escapes backslashes in a file name search", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ files: [] }));

    await toolByName("google_drive_get_content")({ fileName: "a\\' or name contains '" });

    expect(driveQueryOf(0)).toBe(
      "name contains 'a\\\\\\' or name contains \\'' and trashed = false"
    );
  });

  test.each(["google_drive_search", "google_drive_list_recent"])(
    "%s rejects a mimeType that is not type/subtype",
    async (name) => {
      const result = await toolByName(name)({ query: "q", mimeType: "x' or name contains '" });

      expect(result).toBe("Error: Invalid mimeType: x' or name contains '");
      expect(fetchMock).not.toHaveBeenCalled();
    }
  );

  test.each(["google_drive_search", "google_drive_list_recent"])(
    "%s accepts a plain mimeType",
    async (name) => {
      fetchMock.mockResolvedValueOnce(jsonResponse({ files: [] }));

      await toolByName(name)({ query: "q", mimeType: "application/vnd.google-apps.document" });

      expect(driveQueryOf(0)).toContain("mimeType = 'application/vnd.google-apps.document'");
    }
  );

  test("google_drive_get_content never logs file content or the file name", async () => {
    const logged: unknown[][] = [];
    const record = (...args: unknown[]) => logged.push(args);
    setLogger({ debug: record, info: record, warn: record, error: record });
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ files: [{ id: "file1", name: "secret-plans.txt" }] }))
      .mockResolvedValueOnce(
        jsonResponse({ id: "file1", name: "secret-plans.txt", mimeType: "text/plain" })
      )
      .mockResolvedValueOnce(new Response("THE-SECRET-CONTENT", { status: 200 }));

    const result = await toolByName("google_drive_get_content")({ fileName: "secret-plans" });

    expect(result).toContain("THE-SECRET-CONTENT");
    const flat = JSON.stringify(logged);
    expect(flat).not.toContain("THE-SECRET-CONTENT");
    expect(flat).not.toContain("secret-plans");
  });
});
