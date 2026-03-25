import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createGitHubTools } from "./github";

// ── Mock fetch ──────────────────────────────────────────────────────────────

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function errorResponse(status: number, message: string): Response {
  return new Response(JSON.stringify({ message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// ── Helpers ─────────────────────────────────────────────────────────────────

const getToken = () => "test-token";
const requestAccess = async () => "test-token";

function getTools() {
  return createGitHubTools(getToken, requestAccess);
}

function findTool(name: string) {
  const tool = getTools().find(
    (t) => (t as Record<string, unknown> & { function: { name: string } }).function.name === name
  );
  if (!tool) throw new Error(`Tool ${name} not found`);
  return tool;
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe("createGitHubTools", () => {
  beforeEach(() => mockFetch.mockReset());
  afterEach(() => vi.restoreAllMocks());

  it("returns exactly 2 tools", () => {
    const tools = getTools();
    expect(tools).toHaveLength(2);
    const names = tools.map(
      (t) => (t as Record<string, unknown> & { function: { name: string } }).function.name
    );
    expect(names).toContain("github_get_authenticated_user");
    expect(names).toContain("github_api");
  });
});

describe("github_get_authenticated_user", () => {
  beforeEach(() => mockFetch.mockReset());

  it("returns user profile and orgs", async () => {
    mockFetch
      .mockResolvedValueOnce(
        jsonResponse({
          login: "peterlee",
          name: "Peter",
          email: "p@test.com",
          public_repos: 42,
          html_url: "https://github.com/peterlee",
        })
      )
      .mockResolvedValueOnce(jsonResponse([{ login: "zeta-chain" }, { login: "anuma-ai" }]));

    const tool = findTool("github_get_authenticated_user");
    const result = await tool.executor!({});

    expect(result).toEqual({
      login: "peterlee",
      name: "Peter",
      email: "p@test.com",
      organizations: ["zeta-chain", "anuma-ai"],
      public_repos: 42,
      html_url: "https://github.com/peterlee",
    });
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(mockFetch.mock.calls[0][0]).toBe("https://api.github.com/user");
    expect(mockFetch.mock.calls[1][0]).toBe("https://api.github.com/user/orgs?per_page=100");
  });

  it("returns error when not connected", async () => {
    const tools = createGitHubTools(
      () => null,
      () => Promise.reject(new Error("no auth"))
    );
    const tool = tools.find(
      (t) =>
        (t as Record<string, unknown> & { function: { name: string } }).function.name ===
        "github_get_authenticated_user"
    )!;
    const result = await tool.executor!({});
    expect(result).toContain("Error: GitHub not connected");
  });

  it("handles API error", async () => {
    mockFetch.mockResolvedValueOnce(errorResponse(401, "Bad credentials"));
    const tool = findTool("github_get_authenticated_user");
    const result = await tool.executor!({});
    expect(result).toContain("Error");
    expect(result).toContain("401");
  });
});

describe("github_api", () => {
  beforeEach(() => mockFetch.mockReset());

  it("makes GET request with correct headers", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse([{ number: 1, title: "Fix bug" }]));

    const tool = findTool("github_api");
    const result = await tool.executor!({
      method: "GET",
      path: "/repos/owner/repo/pulls",
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.github.com/repos/owner/repo/pulls");
    expect(opts.method).toBe("GET");
    expect((opts.headers as Record<string, string>)["Authorization"]).toBe("Bearer test-token");
    expect((opts.headers as Record<string, string>)["X-GitHub-Api-Version"]).toBe("2022-11-28");
    expect((opts.headers as Record<string, string>)["Accept"]).toBe("application/vnd.github+json");

    const parsed = JSON.parse(result as string);
    expect(parsed).toEqual([{ number: 1, title: "Fix bug" }]);
  });

  it("makes POST request with body", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({
        number: 42,
        title: "New issue",
        html_url: "https://github.com/o/r/issues/42",
      })
    );

    const tool = findTool("github_api");
    await tool.executor!({
      method: "POST",
      path: "/repos/owner/repo/issues",
      body: { title: "New issue", body: "Description" },
    });

    const [, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(opts.method).toBe("POST");
    expect(JSON.parse(opts.body as string)).toEqual({
      title: "New issue",
      body: "Description",
    });
  });

  it("returns error for non-ok responses", async () => {
    mockFetch.mockResolvedValueOnce(errorResponse(404, "Not Found"));

    const tool = findTool("github_api");
    const result = await tool.executor!({
      method: "GET",
      path: "/repos/owner/nonexistent",
    });

    expect(result).toContain("Error");
    expect(result).toContain("404");
  });

  it("blocks SSRF — rejects non-GitHub URLs", async () => {
    const tool = findTool("github_api");
    const result = await tool.executor!({
      method: "GET",
      path: "https://evil.com/steal-token",
    });

    expect(result).toContain("Error");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("blocks SSRF — rejects subdomain spoofing", async () => {
    const tool = findTool("github_api");
    const result = await tool.executor!({
      method: "GET",
      path: "https://api.github.com.evil.com/repos",
    });

    expect(result).toContain("Error");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("blocks SSRF — rejects relative path concatenation attack", async () => {
    const tool = findTool("github_api");
    const result = await tool.executor!({
      method: "GET",
      path: ".evil.com/steal",
    });

    expect(result).toContain("Error");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("allows full GitHub API URLs (for pagination)", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse([]));

    const tool = findTool("github_api");
    await tool.executor!({
      method: "GET",
      path: "https://api.github.com/repos/owner/repo/pulls?page=2",
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch.mock.calls[0][0]).toBe("https://api.github.com/repos/owner/repo/pulls?page=2");
  });

  it("truncates large responses", async () => {
    const largeData = "x".repeat(200_000);
    mockFetch.mockResolvedValueOnce(new Response(largeData, { status: 200 }));

    const tool = findTool("github_api");
    const result = (await tool.executor!({
      method: "GET",
      path: "/repos/owner/repo/contents/big",
    })) as string;

    expect(result.length).toBeLessThan(110_000);
    expect(result).toContain("truncated");
  });

  it("handles timeout", async () => {
    mockFetch.mockImplementationOnce(
      () =>
        new Promise((_, reject) => {
          const err = new DOMException("The operation was aborted", "AbortError");
          setTimeout(() => reject(err), 10);
        })
    );

    const tool = findTool("github_api");
    const result = await tool.executor!({
      method: "GET",
      path: "/repos/owner/repo",
    });
    expect(result).toContain("timed out");
  });

  it("returns error when not connected", async () => {
    const tools = createGitHubTools(
      () => null,
      () => Promise.reject(new Error("no auth"))
    );
    const tool = tools.find(
      (t) =>
        (t as Record<string, unknown> & { function: { name: string } }).function.name ===
        "github_api"
    )!;
    const result = await tool.executor!({ method: "GET", path: "/user" });
    expect(result).toContain("Error: GitHub not connected");
  });
});
