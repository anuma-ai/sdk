import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { createDropboxTools } from "./dropbox.js";

type ToolResult = unknown;

async function runExecutor(
  tool: { executor?: (args: Record<string, unknown>) => Promise<ToolResult> | ToolResult },
  args: Record<string, unknown>
): Promise<ToolResult> {
  if (!tool.executor) throw new Error("tool has no executor");
  return tool.executor(args);
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function textResponse(text: string, status: number): Response {
  return new Response(text, { status });
}

describe("createDropboxTools", () => {
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

  test("dropbox_list_folders returns a compact entry list on success", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        entries: [
          {
            ".tag": "folder",
            name: "Documents",
            path_display: "/Documents",
          },
          {
            ".tag": "file",
            name: "notes.txt",
            path_display: "/notes.txt",
            size: 42,
            server_modified: "2026-06-01T00:00:00Z",
          },
        ],
      })
    );
    const tools = createDropboxTools(
      async () => "good-token",
      async () => null
    );
    const result = (await runExecutor(tools.dropbox_list_folders, {
      path: "",
    })) as unknown[];
    expect(result).toEqual([
      { name: "Documents", path_display: "/Documents", tag: "folder" },
      {
        name: "notes.txt",
        path_display: "/notes.txt",
        tag: "file",
        size: 42,
        server_modified: "2026-06-01T00:00:00Z",
      },
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.dropboxapi.com/2/files/list_folder");
    const req = init as RequestInit;
    expect((req.headers as Record<string, string>).Authorization).toBe("Bearer good-token");
    expect(JSON.parse(req.body as string)).toEqual({ path: "", recursive: false, limit: 100 });
  });

  test("dropbox_list_folders defaults path to root when omitted", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ entries: [] }));
    const tools = createDropboxTools(
      async () => "good-token",
      async () => null
    );
    const result = (await runExecutor(tools.dropbox_list_folders, {})) as string;
    expect(result).toBe('No entries found at "/"');
    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse((init as RequestInit).body as string).path).toBe("");
  });

  test("dropbox_get_file_content returns text and passes the path via Dropbox-API-Arg", async () => {
    fetchMock.mockResolvedValueOnce(textResponse("hello from dropbox", 200));
    const tools = createDropboxTools(
      async () => "good-token",
      async () => null
    );
    const result = (await runExecutor(tools.dropbox_get_file_content, {
      path: "/notes.txt",
    })) as string;
    expect(result).toBe("hello from dropbox");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://content.dropboxapi.com/2/files/download");
    const headers = (init as RequestInit).headers as Record<string, string>;
    expect(headers["Dropbox-API-Arg"]).toBe(JSON.stringify({ path: "/notes.txt" }));
    // No JSON body — download requests must not carry a JSON Content-Type.
    expect((init as RequestInit).body).toBeUndefined();
    expect(headers["Content-Type"]).toBeUndefined();
  });

  test("dropbox_get_file_content truncates oversized content", async () => {
    const big = "a".repeat(120_000);
    fetchMock.mockResolvedValueOnce(textResponse(big, 200));
    const tools = createDropboxTools(
      async () => "good-token",
      async () => null
    );
    const result = (await runExecutor(tools.dropbox_get_file_content, {
      path: "/big.txt",
    })) as string;
    expect(result).toContain("... (truncated,");
    expect(result.length).toBeLessThan(big.length);
  });

  test("dropbox_get_file_content returns a note for binary content instead of garbage", async () => {
    // A NUL byte is a strong binary signal that download content is not text.
    const binary = "PNG\x00\x00garbage";
    fetchMock.mockResolvedValueOnce(textResponse(binary, 200));
    const tools = createDropboxTools(
      async () => "good-token",
      async () => null
    );
    const result = (await runExecutor(tools.dropbox_get_file_content, {
      path: "/image.png",
    })) as string;
    expect(result).toBe(
      'The file at "/image.png" appears to be binary and cannot be shown as text.'
    );
  });

  test("dropbox_search returns matches on success", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        matches: [
          {
            metadata: {
              metadata: { ".tag": "file", name: "report.pdf", path_display: "/report.pdf" },
            },
          },
          {
            metadata: {
              metadata: { ".tag": "folder", name: "Reports", path_display: "/Reports" },
            },
          },
        ],
      })
    );
    const tools = createDropboxTools(
      async () => "good-token",
      async () => null
    );
    const result = (await runExecutor(tools.dropbox_search, {
      query: "report",
    })) as unknown[];
    expect(result).toEqual([
      { name: "report.pdf", path_display: "/report.pdf", tag: "file" },
      { name: "Reports", path_display: "/Reports", tag: "folder" },
    ]);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.dropboxapi.com/2/files/search_v2");
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({
      query: "report",
      options: { max_results: 20 },
    });
  });

  test("dropbox_search returns a friendly message when there are no matches", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ matches: [] }));
    const tools = createDropboxTools(
      async () => "good-token",
      async () => null
    );
    const result = (await runExecutor(tools.dropbox_search, { query: "nope" })) as string;
    expect(result).toBe('No files found matching "nope"');
  });

  test("returns canonical connector error when token getter and requestAccess both yield null", async () => {
    const tools = createDropboxTools(
      async () => null,
      async () => null
    );
    const raw = (await runExecutor(tools.dropbox_list_folders, {})) as string;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    expect(parsed).toEqual({
      __anuma_connector_error_v1: true,
      code: "connector_not_connected",
      provider: "dropbox",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("returns canonical connector error when requestAccess throws", async () => {
    const tools = createDropboxTools(
      async () => null,
      async () => {
        throw new Error("server agent cannot initiate OAuth");
      }
    );
    const raw = (await runExecutor(tools.dropbox_search, { query: "x" })) as string;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    expect(parsed.__anuma_connector_error_v1).toBe(true);
    expect(parsed.code).toBe("connector_not_connected");
    expect(parsed.provider).toBe("dropbox");
  });

  test("returns connector error when Dropbox responds 401", async () => {
    fetchMock.mockResolvedValueOnce(textResponse("unauthorized", 401));
    const tools = createDropboxTools(
      async () => "stale-token",
      async () => null
    );
    const raw = (await runExecutor(tools.dropbox_list_folders, {})) as string;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    expect(parsed.__anuma_connector_error_v1).toBe(true);
    expect(parsed.code).toBe("connector_not_connected");
    expect(parsed.provider).toBe("dropbox");
  });

  test("returns connector error when Dropbox responds 403", async () => {
    fetchMock.mockResolvedValueOnce(textResponse("forbidden", 403));
    const tools = createDropboxTools(
      async () => "good-token",
      async () => null
    );
    const raw = (await runExecutor(tools.dropbox_get_file_content, {
      path: "/secret.txt",
    })) as string;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    expect(parsed.code).toBe("connector_not_connected");
    expect(parsed.provider).toBe("dropbox");
  });

  test("surfaces non-connector Dropbox errors as raw error strings", async () => {
    fetchMock.mockResolvedValueOnce(textResponse("server burped", 500));
    const tools = createDropboxTools(
      async () => "good-token",
      async () => null
    );
    const result = (await runExecutor(tools.dropbox_search, { query: "x" })) as string;
    expect(result).toContain("Error: Failed to search Dropbox (500)");
    expect(result).toContain("server burped");
  });
});
