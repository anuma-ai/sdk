/**
 * GitHub tool definitions for the chat system.
 * These tools allow the LLM to interact with the user's GitHub repositories,
 * issues, pull requests, and code via the GitHub REST API.
 *
 * All tools follow the closure-based dependency injection pattern:
 * factory functions receive getAccessToken() and requestGitHubAccess() callbacks.
 */

import type { ToolConfig } from "../lib/chat/useChat/types.js";
import { getLogger } from "../lib/logger";
import { uint8ArrayToBase64 } from "../lib/processors/encoding";

// ─── Constants ───────────────────────────────────────────────────────────────

const GITHUB_API = "https://api.github.com";
const MAX_CONTENT_SIZE = 100_000; // 100KB max for file contents returned to LLM
const MAX_TREE_SIZE = 50_000; // 50KB max for directory trees
const MAX_DIFF_SIZE = 50_000; // 50KB max for PR diffs

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Get a valid GitHub access token, requesting access if needed.
 */
async function resolveToken(
  getAccessToken: () => string | null,
  requestGitHubAccess: () => Promise<string>
): Promise<string | null> {
  let token = getAccessToken();
  if (!token) {
    try {
      token = await requestGitHubAccess();
    } catch (err) {
      getLogger().error("Failed to resolve GitHub token", err);
      return null;
    }
  }
  return token;
}

const FETCH_TIMEOUT_MS = 30_000;

/**
 * Make an authenticated GitHub API request with timeout and SSRF protection.
 */
async function githubFetch(
  token: string,
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = path.startsWith("http") ? path : `${GITHUB_API}${path}`;

  // SSRF protection: only allow GitHub API URLs
  if (path.startsWith("http") && !path.startsWith(GITHUB_API)) {
    throw new Error("githubFetch: URL must target GitHub API");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2022-11-28",
        ...options.headers,
      },
    });
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Encode a GitHub API path, encoding each segment individually.
 * Handles owner, repo, and file paths with special characters.
 */
function encodePath(segments: string[]): string {
  return segments.map((s) => encodeURIComponent(s)).join("/");
}

/**
 * Encode a file path (may contain /) by encoding each segment.
 */
function encodeFilePath(filePath: string): string {
  return filePath
    .split("/")
    .map((s) => encodeURIComponent(s))
    .join("/");
}

/**
 * Handle common GitHub API error responses.
 */
function handleApiError(status: number, body: string, context: string): string {
  if (status === 401)
    return `Error: GitHub access not authorized. Please reconnect your GitHub account.`;
  if (status === 403)
    return `Error: Insufficient permissions for ${context}. Check your GitHub OAuth scopes.`;
  if (status === 404) return `Error: ${context} not found. Check the owner, repo, and path.`;
  if (status === 422) return `Error: Invalid request for ${context}: ${body}`;
  return `Error: GitHub API error (${status}) for ${context}: ${body}`;
}

/**
 * Truncate a string to maxLen with a notice.
 */
function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + `\n\n... (truncated, ${text.length - maxLen} characters omitted)`;
}

// ─── Tool: Search Repos ──────────────────────────────────────────────────────

function createSearchReposTool(
  getAccessToken: () => string | null,
  requestAccess: () => Promise<string>
): ToolConfig {
  return {
    type: "function",
    function: {
      name: "github_search_repos",
      description:
        "Search for GitHub repositories. Can search across all of GitHub or filter to the authenticated user's repos.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Search query (e.g., 'language:typescript stars:>100' or a keyword)",
          },
          user_only: {
            type: "boolean",
            description:
              "If true, only search repos the authenticated user owns or has access to. Default false.",
          },
          max_results: {
            type: "number",
            description: "Max results to return (default 10, max 30)",
          },
        },
        required: ["query"],
      },
    },
    executor: async (args: Record<string, unknown>) => {
      const token = await resolveToken(getAccessToken, requestAccess);
      if (!token) return "Error: GitHub not connected. Please connect your GitHub account first.";

      const query = args.query as string;
      const userOnly = args.user_only as boolean | undefined;
      const maxResults = Math.min((args.max_results as number) || 10, 30);

      const q = userOnly ? `${query} user:@me` : query;
      const params = new URLSearchParams({ q, per_page: String(maxResults), sort: "updated" });

      try {
        const resp = await githubFetch(token, `/search/repositories?${params}`);
        if (!resp.ok) return handleApiError(resp.status, await resp.text(), "repository search");

        const data = await resp.json();
        return (data.items || []).map((r: Record<string, unknown>) => ({
          full_name: r.full_name,
          description: r.description,
          language: r.language,
          stars: r.stargazers_count,
          updated_at: r.updated_at,
          html_url: r.html_url,
          private: r.private,
          default_branch: r.default_branch,
        }));
      } catch (err) {
        getLogger().error("github_search_repos error", err);
        return "Error: Failed to search GitHub repositories.";
      }
    },
  };
}

// ─── Tool: Read File ─────────────────────────────────────────────────────────

function createReadFileTool(
  getAccessToken: () => string | null,
  requestAccess: () => Promise<string>
): ToolConfig {
  return {
    type: "function",
    function: {
      name: "github_read_file",
      description: "Read the contents of a file from a GitHub repository.",
      parameters: {
        type: "object",
        properties: {
          owner: { type: "string", description: "Repository owner (user or org)" },
          repo: { type: "string", description: "Repository name" },
          path: { type: "string", description: "File path within the repo (e.g., 'src/index.ts')" },
          ref: {
            type: "string",
            description: "Branch, tag, or commit SHA (default: repo default branch)",
          },
        },
        required: ["owner", "repo", "path"],
      },
    },
    executor: async (args: Record<string, unknown>) => {
      const token = await resolveToken(getAccessToken, requestAccess);
      if (!token) return "Error: GitHub not connected. Please connect your GitHub account first.";

      const { owner, repo, path, ref } = args as {
        owner: string;
        repo: string;
        path: string;
        ref?: string;
      };
      const params = ref ? `?ref=${encodeURIComponent(ref)}` : "";

      try {
        const resp = await githubFetch(
          token,
          `/repos/${encodePath([owner, repo])}/contents/${encodeFilePath(path)}${params}`
        );
        if (!resp.ok)
          return handleApiError(resp.status, await resp.text(), `file ${owner}/${repo}/${path}`);

        const data = await resp.json();
        if (data.type !== "file")
          return `Error: ${path} is a ${data.type}, not a file. Use github_get_directory_tree for directories.`;
        if (!data.content)
          return `Error: File ${path} has no content (may be too large for the Contents API).`;

        const bytes = Uint8Array.from(atob(data.content.replace(/\n/g, "")), (c) =>
          c.charCodeAt(0)
        );
        const content = new TextDecoder().decode(bytes);
        return {
          path: data.path,
          size: data.size,
          sha: data.sha,
          content: truncate(content, MAX_CONTENT_SIZE),
        };
      } catch (err) {
        getLogger().error("github_read_file error", err);
        return `Error: Failed to read file ${path}.`;
      }
    },
  };
}

// ─── Tool: Search Code ───────────────────────────────────────────────────────

function createSearchCodeTool(
  getAccessToken: () => string | null,
  requestAccess: () => Promise<string>
): ToolConfig {
  return {
    type: "function",
    function: {
      name: "github_search_code",
      description:
        "Search for code across GitHub repositories. Useful for finding specific functions, imports, or patterns.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Code search query (e.g., 'className language:tsx repo:owner/repo')",
          },
          max_results: { type: "number", description: "Max results (default 10, max 30)" },
        },
        required: ["query"],
      },
    },
    executor: async (args: Record<string, unknown>) => {
      const token = await resolveToken(getAccessToken, requestAccess);
      if (!token) return "Error: GitHub not connected. Please connect your GitHub account first.";

      const query = args.query as string;
      const maxResults = Math.min((args.max_results as number) || 10, 30);
      const params = new URLSearchParams({ q: query, per_page: String(maxResults) });

      try {
        const resp = await githubFetch(token, `/search/code?${params}`);
        if (!resp.ok) return handleApiError(resp.status, await resp.text(), "code search");

        const data = await resp.json();
        return (data.items || []).map((item: Record<string, unknown>) => ({
          path: item.path,
          repository: (item.repository as Record<string, unknown>)?.full_name,
          html_url: item.html_url,
          score: item.score,
        }));
      } catch (err) {
        getLogger().error("github_search_code error", err);
        return "Error: Failed to search code.";
      }
    },
  };
}

// ─── Tool: Directory Tree ────────────────────────────────────────────────────

function createDirectoryTreeTool(
  getAccessToken: () => string | null,
  requestAccess: () => Promise<string>
): ToolConfig {
  return {
    type: "function",
    function: {
      name: "github_get_directory_tree",
      description:
        "Get the file and directory structure of a GitHub repository. Returns a recursive tree of all paths.",
      parameters: {
        type: "object",
        properties: {
          owner: { type: "string", description: "Repository owner" },
          repo: { type: "string", description: "Repository name" },
          ref: {
            type: "string",
            description: "Branch, tag, or commit SHA (default: repo default branch)",
          },
          path: {
            type: "string",
            description: "Subdirectory path to scope the tree to (optional)",
          },
        },
        required: ["owner", "repo"],
      },
    },
    executor: async (args: Record<string, unknown>) => {
      const token = await resolveToken(getAccessToken, requestAccess);
      if (!token) return "Error: GitHub not connected. Please connect your GitHub account first.";

      const {
        owner,
        repo,
        ref,
        path: subPath,
      } = args as {
        owner: string;
        repo: string;
        ref?: string;
        path?: string;
      };
      const sha = ref || "HEAD";

      try {
        const resp = await githubFetch(
          token,
          `/repos/${encodePath([owner, repo])}/git/trees/${encodeURIComponent(sha)}?recursive=1`
        );
        if (!resp.ok)
          return handleApiError(resp.status, await resp.text(), `tree for ${owner}/${repo}`);

        const data = await resp.json();
        let tree = (data.tree || []) as { path: string; type: string; size?: number }[];

        // Filter to subdirectory if specified
        if (subPath) {
          const prefix = subPath.endsWith("/") ? subPath : `${subPath}/`;
          tree = tree.filter((item) => item.path.startsWith(prefix) || item.path === subPath);
        }

        const result = tree.map((item) => ({
          path: item.path,
          type: item.type === "blob" ? "file" : "directory",
          size: item.size,
        }));

        const json = JSON.stringify(result);
        if (json.length > MAX_TREE_SIZE) {
          return {
            truncated: true,
            total_items: result.length,
            items: result.slice(0, 200),
            message: `Tree has ${result.length} items. Showing first 200. Use the 'path' parameter to scope to a subdirectory.`,
          };
        }
        return result;
      } catch (err) {
        getLogger().error("github_get_directory_tree error", err);
        return `Error: Failed to get directory tree for ${owner}/${repo}.`;
      }
    },
  };
}

// ─── Tool: List Issues ───────────────────────────────────────────────────────

function createListIssuesTool(
  getAccessToken: () => string | null,
  requestAccess: () => Promise<string>
): ToolConfig {
  return {
    type: "function",
    function: {
      name: "github_list_issues",
      description: "List issues in a GitHub repository with optional filters.",
      parameters: {
        type: "object",
        properties: {
          owner: { type: "string", description: "Repository owner" },
          repo: { type: "string", description: "Repository name" },
          state: {
            type: "string",
            enum: ["open", "closed", "all"],
            description: "Issue state (default: open)",
          },
          labels: { type: "string", description: "Comma-separated list of label names" },
          assignee: { type: "string", description: "Filter by assignee username" },
          max_results: { type: "number", description: "Max results (default 20, max 100)" },
        },
        required: ["owner", "repo"],
      },
    },
    executor: async (args: Record<string, unknown>) => {
      const token = await resolveToken(getAccessToken, requestAccess);
      if (!token) return "Error: GitHub not connected. Please connect your GitHub account first.";

      const { owner, repo } = args as { owner: string; repo: string };
      const params = new URLSearchParams({
        state: (args.state as string) || "open",
        per_page: String(Math.min((args.max_results as number) || 20, 100)),
      });
      if (args.labels) params.set("labels", args.labels as string);
      if (args.assignee) params.set("assignee", args.assignee as string);

      try {
        const resp = await githubFetch(
          token,
          `/repos/${encodePath([owner, repo])}/issues?${params}`
        );
        if (!resp.ok)
          return handleApiError(resp.status, await resp.text(), `issues for ${owner}/${repo}`);

        const data = await resp.json();
        // GitHub's issues endpoint also returns PRs — filter them out
        return (data as Record<string, unknown>[])
          .filter((issue) => !issue.pull_request)
          .map((issue) => ({
            number: issue.number,
            title: issue.title,
            state: issue.state,
            author: (issue.user as Record<string, unknown>)?.login,
            labels: (issue.labels as Record<string, unknown>[])?.map((l) => l.name),
            assignees: (issue.assignees as Record<string, unknown>[])?.map((a) => a.login),
            created_at: issue.created_at,
            updated_at: issue.updated_at,
            comments: issue.comments,
            html_url: issue.html_url,
          }));
      } catch (err) {
        getLogger().error("github_list_issues error", err);
        return `Error: Failed to list issues for ${owner}/${repo}.`;
      }
    },
  };
}

// ─── Tool: Create Issue ──────────────────────────────────────────────────────

function createCreateIssueTool(
  getAccessToken: () => string | null,
  requestAccess: () => Promise<string>
): ToolConfig {
  return {
    type: "function",
    function: {
      name: "github_create_issue",
      description: "Create a new issue in a GitHub repository.",
      parameters: {
        type: "object",
        properties: {
          owner: { type: "string", description: "Repository owner" },
          repo: { type: "string", description: "Repository name" },
          title: { type: "string", description: "Issue title" },
          body: { type: "string", description: "Issue body (markdown)" },
          labels: { type: "array", items: { type: "string" }, description: "Labels to add" },
          assignees: {
            type: "array",
            items: { type: "string" },
            description: "Usernames to assign",
          },
        },
        required: ["owner", "repo", "title"],
      },
    },
    executor: async (args: Record<string, unknown>) => {
      const token = await resolveToken(getAccessToken, requestAccess);
      if (!token) return "Error: GitHub not connected. Please connect your GitHub account first.";

      const { owner, repo, title, body, labels, assignees } = args as {
        owner: string;
        repo: string;
        title: string;
        body?: string;
        labels?: string[];
        assignees?: string[];
      };

      try {
        const resp = await githubFetch(token, `/repos/${encodePath([owner, repo])}/issues`, {
          method: "POST",
          body: JSON.stringify({ title, body, labels, assignees }),
        });
        if (!resp.ok) return handleApiError(resp.status, await resp.text(), "create issue");

        const data = await resp.json();
        return {
          number: data.number,
          title: data.title,
          html_url: data.html_url,
          state: data.state,
        };
      } catch (err) {
        getLogger().error("github_create_issue error", err);
        return "Error: Failed to create issue.";
      }
    },
  };
}

// ─── Tool: List Pull Requests ────────────────────────────────────────────────

function createListPullRequestsTool(
  getAccessToken: () => string | null,
  requestAccess: () => Promise<string>
): ToolConfig {
  return {
    type: "function",
    function: {
      name: "github_list_pull_requests",
      description: "List pull requests in a GitHub repository with optional filters.",
      parameters: {
        type: "object",
        properties: {
          owner: { type: "string", description: "Repository owner" },
          repo: { type: "string", description: "Repository name" },
          state: {
            type: "string",
            enum: ["open", "closed", "all"],
            description: "PR state (default: open)",
          },
          head: { type: "string", description: "Filter by head branch (format: 'user:branch')" },
          base: { type: "string", description: "Filter by base branch" },
          max_results: { type: "number", description: "Max results (default 20, max 100)" },
        },
        required: ["owner", "repo"],
      },
    },
    executor: async (args: Record<string, unknown>) => {
      const token = await resolveToken(getAccessToken, requestAccess);
      if (!token) return "Error: GitHub not connected. Please connect your GitHub account first.";

      const { owner, repo } = args as { owner: string; repo: string };
      const params = new URLSearchParams({
        state: (args.state as string) || "open",
        per_page: String(Math.min((args.max_results as number) || 20, 100)),
      });
      if (args.head) params.set("head", args.head as string);
      if (args.base) params.set("base", args.base as string);

      try {
        const resp = await githubFetch(
          token,
          `/repos/${encodePath([owner, repo])}/pulls?${params}`
        );
        if (!resp.ok)
          return handleApiError(
            resp.status,
            await resp.text(),
            `pull requests for ${owner}/${repo}`
          );

        const data = await resp.json();
        return (data as Record<string, unknown>[]).map((pr) => ({
          number: pr.number,
          title: pr.title,
          state: pr.state,
          author: (pr.user as Record<string, unknown>)?.login,
          head: (pr.head as Record<string, unknown>)?.ref,
          base: (pr.base as Record<string, unknown>)?.ref,
          draft: pr.draft,
          mergeable: pr.mergeable,
          created_at: pr.created_at,
          updated_at: pr.updated_at,
          html_url: pr.html_url,
        }));
      } catch (err) {
        getLogger().error("github_list_pull_requests error", err);
        return `Error: Failed to list pull requests for ${owner}/${repo}.`;
      }
    },
  };
}

// ─── Tool: Get Pull Request ──────────────────────────────────────────────────

function createGetPullRequestTool(
  getAccessToken: () => string | null,
  requestAccess: () => Promise<string>
): ToolConfig {
  return {
    type: "function",
    function: {
      name: "github_get_pull_request",
      description:
        "Get details of a pull request including its diff/changed files. Essential for reviewing PRs.",
      parameters: {
        type: "object",
        properties: {
          owner: { type: "string", description: "Repository owner" },
          repo: { type: "string", description: "Repository name" },
          pull_number: { type: "number", description: "Pull request number" },
          include_diff: {
            type: "boolean",
            description:
              "Include the file-level diff (default: true). Set false for just metadata.",
          },
        },
        required: ["owner", "repo", "pull_number"],
      },
    },
    executor: async (args: Record<string, unknown>) => {
      const token = await resolveToken(getAccessToken, requestAccess);
      if (!token) return "Error: GitHub not connected. Please connect your GitHub account first.";

      const { owner, repo, pull_number } = args as {
        owner: string;
        repo: string;
        pull_number: number;
      };
      const includeDiff = args.include_diff !== false;

      try {
        // Fetch PR metadata
        const prResp = await githubFetch(
          token,
          `/repos/${encodePath([owner, repo])}/pulls/${pull_number}`
        );
        if (!prResp.ok)
          return handleApiError(prResp.status, await prResp.text(), `PR #${pull_number}`);

        const pr = await prResp.json();
        const result: Record<string, unknown> = {
          number: pr.number,
          title: pr.title,
          state: pr.state,
          author: pr.user?.login,
          head: pr.head?.ref,
          base: pr.base?.ref,
          body: pr.body ? truncate(pr.body, 5000) : null,
          draft: pr.draft,
          mergeable: pr.mergeable,
          mergeable_state: pr.mergeable_state,
          additions: pr.additions,
          deletions: pr.deletions,
          changed_files: pr.changed_files,
          created_at: pr.created_at,
          updated_at: pr.updated_at,
          html_url: pr.html_url,
        };

        // Fetch changed files with patches
        if (includeDiff) {
          const filesResp = await githubFetch(
            token,
            `/repos/${encodePath([owner, repo])}/pulls/${pull_number}/files?per_page=100`
          );
          if (filesResp.ok) {
            const files = (await filesResp.json()) as Record<string, unknown>[];
            let totalDiffSize = 0;
            result.files = files.map((f) => {
              const patch = (f.patch as string) || "";
              const wouldExceed = totalDiffSize + patch.length > MAX_DIFF_SIZE;
              if (!wouldExceed) totalDiffSize += patch.length;
              return {
                filename: f.filename,
                status: f.status,
                additions: f.additions,
                deletions: f.deletions,
                patch: wouldExceed ? "(diff too large, omitted)" : patch,
              };
            });

            // Warn if GitHub truncated the files list (max 100 per page)
            const totalChanged = pr.changed_files as number;
            if (totalChanged && files.length < totalChanged) {
              result.files_warning = `Only ${files.length} of ${totalChanged} changed files shown. GitHub limits to 100 files per page.`;
            }
          }
        }

        return result;
      } catch (err) {
        getLogger().error("github_get_pull_request error", err);
        return `Error: Failed to get PR #${pull_number}.`;
      }
    },
  };
}

// ─── Tool: Create Pull Request ───────────────────────────────────────────────

function createCreatePullRequestTool(
  getAccessToken: () => string | null,
  requestAccess: () => Promise<string>
): ToolConfig {
  return {
    type: "function",
    function: {
      name: "github_create_pull_request",
      description:
        "Create a new pull request. IMPORTANT: Always confirm with the user before executing this action.",
      parameters: {
        type: "object",
        properties: {
          owner: { type: "string", description: "Repository owner" },
          repo: { type: "string", description: "Repository name" },
          title: { type: "string", description: "PR title" },
          body: { type: "string", description: "PR description (markdown)" },
          head: { type: "string", description: "Branch containing changes" },
          base: { type: "string", description: "Branch to merge into (e.g., 'main')" },
          draft: { type: "boolean", description: "Create as draft PR (default: false)" },
        },
        required: ["owner", "repo", "title", "head", "base"],
      },
    },
    executor: async (args: Record<string, unknown>) => {
      const token = await resolveToken(getAccessToken, requestAccess);
      if (!token) return "Error: GitHub not connected. Please connect your GitHub account first.";

      const { owner, repo, title, body, head, base, draft } = args as {
        owner: string;
        repo: string;
        title: string;
        body?: string;
        head: string;
        base: string;
        draft?: boolean;
      };

      try {
        const resp = await githubFetch(token, `/repos/${encodePath([owner, repo])}/pulls`, {
          method: "POST",
          body: JSON.stringify({ title, body, head, base, draft: draft || false }),
        });
        if (!resp.ok) return handleApiError(resp.status, await resp.text(), "create pull request");

        const data = await resp.json();
        return {
          number: data.number,
          title: data.title,
          html_url: data.html_url,
          state: data.state,
          draft: data.draft,
        };
      } catch (err) {
        getLogger().error("github_create_pull_request error", err);
        return "Error: Failed to create pull request.";
      }
    },
  };
}

// ─── Tool: Merge Pull Request ────────────────────────────────────────────────

function createMergePullRequestTool(
  getAccessToken: () => string | null,
  requestAccess: () => Promise<string>
): ToolConfig {
  return {
    type: "function",
    function: {
      name: "github_merge_pull_request",
      description:
        "Merge a pull request. IMPORTANT: Always confirm with the user before executing this action. This is irreversible.",
      parameters: {
        type: "object",
        properties: {
          owner: { type: "string", description: "Repository owner" },
          repo: { type: "string", description: "Repository name" },
          pull_number: { type: "number", description: "Pull request number" },
          merge_method: {
            type: "string",
            enum: ["merge", "squash", "rebase"],
            description: "Merge method (default: merge)",
          },
          commit_title: { type: "string", description: "Custom merge commit title" },
          commit_message: { type: "string", description: "Custom merge commit message" },
        },
        required: ["owner", "repo", "pull_number"],
      },
    },
    executor: async (args: Record<string, unknown>) => {
      const token = await resolveToken(getAccessToken, requestAccess);
      if (!token) return "Error: GitHub not connected. Please connect your GitHub account first.";

      const { owner, repo, pull_number, merge_method, commit_title, commit_message } = args as {
        owner: string;
        repo: string;
        pull_number: number;
        merge_method?: string;
        commit_title?: string;
        commit_message?: string;
      };

      try {
        const resp = await githubFetch(
          token,
          `/repos/${encodePath([owner, repo])}/pulls/${pull_number}/merge`,
          {
            method: "PUT",
            body: JSON.stringify({
              merge_method: merge_method || "merge",
              commit_title,
              commit_message,
            }),
          }
        );
        if (!resp.ok)
          return handleApiError(resp.status, await resp.text(), `merge PR #${pull_number}`);

        const data = await resp.json();
        return { merged: data.merged, message: data.message, sha: data.sha };
      } catch (err) {
        getLogger().error("github_merge_pull_request error", err);
        return `Error: Failed to merge PR #${pull_number}.`;
      }
    },
  };
}

// ─── Tool: List PR Comments ──────────────────────────────────────────────────

function createListPRCommentsTool(
  getAccessToken: () => string | null,
  requestAccess: () => Promise<string>
): ToolConfig {
  return {
    type: "function",
    function: {
      name: "github_list_pr_comments",
      description: "List review comments on a pull request.",
      parameters: {
        type: "object",
        properties: {
          owner: { type: "string", description: "Repository owner" },
          repo: { type: "string", description: "Repository name" },
          pull_number: { type: "number", description: "Pull request number" },
        },
        required: ["owner", "repo", "pull_number"],
      },
    },
    executor: async (args: Record<string, unknown>) => {
      const token = await resolveToken(getAccessToken, requestAccess);
      if (!token) return "Error: GitHub not connected. Please connect your GitHub account first.";

      const { owner, repo, pull_number } = args as {
        owner: string;
        repo: string;
        pull_number: number;
      };

      try {
        const resp = await githubFetch(
          token,
          `/repos/${encodePath([owner, repo])}/pulls/${pull_number}/comments?per_page=100`
        );
        if (!resp.ok)
          return handleApiError(resp.status, await resp.text(), `comments on PR #${pull_number}`);

        const data = await resp.json();
        return (data as Record<string, unknown>[]).map((c) => ({
          id: c.id,
          path: c.path,
          line: c.line,
          body: c.body,
          author: (c.user as Record<string, unknown>)?.login,
          created_at: c.created_at,
          html_url: c.html_url,
        }));
      } catch (err) {
        getLogger().error("github_list_pr_comments error", err);
        return `Error: Failed to list comments on PR #${pull_number}.`;
      }
    },
  };
}

// ─── Tool: Create PR Review ──────────────────────────────────────────────────

interface ReviewComment {
  path: string;
  line: number;
  body: string;
  side?: "LEFT" | "RIGHT";
}

function createPRReviewTool(
  getAccessToken: () => string | null,
  requestAccess: () => Promise<string>
): ToolConfig {
  return {
    type: "function",
    function: {
      name: "github_create_pr_review",
      description:
        "Submit a review on a pull request. Can approve, request changes, or leave comments with optional inline comments on specific lines. IMPORTANT: Always confirm with the user before submitting APPROVE or REQUEST_CHANGES reviews.",
      parameters: {
        type: "object",
        properties: {
          owner: { type: "string", description: "Repository owner" },
          repo: { type: "string", description: "Repository name" },
          pull_number: { type: "number", description: "Pull request number" },
          event: {
            type: "string",
            enum: ["APPROVE", "REQUEST_CHANGES", "COMMENT"],
            description: "Review action",
          },
          body: { type: "string", description: "Review summary comment" },
          comments: {
            type: "array",
            description: "Inline comments on specific files/lines",
            items: {
              type: "object",
              properties: {
                path: { type: "string", description: "File path" },
                line: { type: "number", description: "Line number in the diff" },
                body: { type: "string", description: "Comment text" },
                side: {
                  type: "string",
                  enum: ["LEFT", "RIGHT"],
                  description: "Side of the diff (default: RIGHT)",
                },
              },
              required: ["path", "line", "body"],
            },
          },
        },
        required: ["owner", "repo", "pull_number", "event"],
      },
    },
    executor: async (args: Record<string, unknown>) => {
      const token = await resolveToken(getAccessToken, requestAccess);
      if (!token) return "Error: GitHub not connected. Please connect your GitHub account first.";

      const { owner, repo, pull_number, event, body, comments } = args as {
        owner: string;
        repo: string;
        pull_number: number;
        event: string;
        body?: string;
        comments?: ReviewComment[];
      };

      try {
        const resp = await githubFetch(
          token,
          `/repos/${encodePath([owner, repo])}/pulls/${pull_number}/reviews`,
          {
            method: "POST",
            body: JSON.stringify({
              event,
              body: body || "",
              comments: comments?.map((c) => ({
                path: c.path,
                line: c.line,
                body: c.body,
                side: c.side || "RIGHT",
              })),
            }),
          }
        );
        if (!resp.ok)
          return handleApiError(resp.status, await resp.text(), `review on PR #${pull_number}`);

        const data = await resp.json();
        return { id: data.id, state: data.state, html_url: data.html_url };
      } catch (err) {
        getLogger().error("github_create_pr_review error", err);
        return `Error: Failed to submit review on PR #${pull_number}.`;
      }
    },
  };
}

// ─── Tool: Create Branch ─────────────────────────────────────────────────────

function createBranchTool(
  getAccessToken: () => string | null,
  requestAccess: () => Promise<string>
): ToolConfig {
  return {
    type: "function",
    function: {
      name: "github_create_branch",
      description: "Create a new branch in a repository from a given ref (branch, tag, or SHA).",
      parameters: {
        type: "object",
        properties: {
          owner: { type: "string", description: "Repository owner" },
          repo: { type: "string", description: "Repository name" },
          branch: { type: "string", description: "New branch name" },
          from_ref: {
            type: "string",
            description:
              "Source branch, tag, or commit SHA to branch from (default: repo default branch)",
          },
        },
        required: ["owner", "repo", "branch"],
      },
    },
    executor: async (args: Record<string, unknown>) => {
      const token = await resolveToken(getAccessToken, requestAccess);
      if (!token) return "Error: GitHub not connected. Please connect your GitHub account first.";

      const { owner, repo, branch, from_ref } = args as {
        owner: string;
        repo: string;
        branch: string;
        from_ref?: string;
      };

      try {
        let sha: string;

        if (!from_ref) {
          // No ref specified — use the repo's default branch
          const repoResp = await githubFetch(token, `/repos/${encodePath([owner, repo])}`);
          if (!repoResp.ok)
            return handleApiError(repoResp.status, await repoResp.text(), `repo ${owner}/${repo}`);
          const repoData = (await repoResp.json()) as { default_branch: string };

          const defaultRefResp = await githubFetch(
            token,
            `/repos/${encodePath([owner, repo])}/git/ref/heads/${repoData.default_branch}`
          );
          if (!defaultRefResp.ok)
            return handleApiError(
              defaultRefResp.status,
              await defaultRefResp.text(),
              `ref ${repoData.default_branch}`
            );
          const defaultRefData = (await defaultRefResp.json()) as { object: { sha: string } };
          sha = defaultRefData.object.sha;
        } else if (/^[0-9a-f]{40}$/i.test(from_ref)) {
          // Full commit SHA — use directly
          sha = from_ref;
        } else {
          // Try as branch first, then tag
          const branchResp = await githubFetch(
            token,
            `/repos/${encodePath([owner, repo])}/git/ref/heads/${from_ref}`
          );
          if (branchResp.ok) {
            const branchData = (await branchResp.json()) as { object: { sha: string } };
            sha = branchData.object.sha;
          } else {
            const tagResp = await githubFetch(
              token,
              `/repos/${encodePath([owner, repo])}/git/ref/tags/${from_ref}`
            );
            if (tagResp.ok) {
              const tagData = (await tagResp.json()) as {
                object: { sha: string; type: string };
              };
              // Annotated tags point to a tag object, not a commit — dereference
              if (tagData.object.type === "tag") {
                const derefResp = await githubFetch(
                  token,
                  `/repos/${encodePath([owner, repo])}/git/tags/${tagData.object.sha}`
                );
                if (derefResp.ok) {
                  const derefData = (await derefResp.json()) as { object: { sha: string } };
                  sha = derefData.object.sha;
                } else {
                  return `Error: Failed to dereference annotated tag '${from_ref}'.`;
                }
              } else {
                sha = tagData.object.sha;
              }
            } else {
              return `Error: Ref '${from_ref}' not found as a branch or tag in ${owner}/${repo}.`;
            }
          }
        }

        // Create the new branch
        const createResp = await githubFetch(
          token,
          `/repos/${encodePath([owner, repo])}/git/refs`,
          {
            method: "POST",
            body: JSON.stringify({ ref: `refs/heads/${branch}`, sha }),
          }
        );
        if (!createResp.ok)
          return handleApiError(
            createResp.status,
            await createResp.text(),
            `create branch ${branch}`
          );

        const data = await createResp.json();
        return { ref: data.ref, sha: data.object.sha };
      } catch (err) {
        getLogger().error("github_create_branch error", err);
        return `Error: Failed to create branch ${branch}.`;
      }
    },
  };
}

// ─── Tool: Create or Update File ─────────────────────────────────────────────

function createOrUpdateFileTool(
  getAccessToken: () => string | null,
  requestAccess: () => Promise<string>
): ToolConfig {
  return {
    type: "function",
    function: {
      name: "github_create_or_update_file",
      description:
        "Create or update a file in a GitHub repository. This creates a commit on the specified branch. IMPORTANT: Always confirm with the user before executing this action.",
      parameters: {
        type: "object",
        properties: {
          owner: { type: "string", description: "Repository owner" },
          repo: { type: "string", description: "Repository name" },
          path: { type: "string", description: "File path within the repo" },
          content: {
            type: "string",
            description: "File content (plain text, will be base64-encoded)",
          },
          message: { type: "string", description: "Commit message" },
          branch: { type: "string", description: "Branch to commit to" },
          sha: {
            type: "string",
            description:
              "SHA of the file being replaced (required for updates, omit for new files)",
          },
        },
        required: ["owner", "repo", "path", "content", "message", "branch"],
      },
    },
    executor: async (args: Record<string, unknown>) => {
      const token = await resolveToken(getAccessToken, requestAccess);
      if (!token) return "Error: GitHub not connected. Please connect your GitHub account first.";

      const { owner, repo, path, content, message, branch, sha } = args as {
        owner: string;
        repo: string;
        path: string;
        content: string;
        message: string;
        branch: string;
        sha?: string;
      };

      try {
        const body: Record<string, unknown> = {
          message,
          content: uint8ArrayToBase64(new TextEncoder().encode(content)),
          branch,
        };
        if (sha) body.sha = sha;

        const resp = await githubFetch(
          token,
          `/repos/${encodePath([owner, repo])}/contents/${encodeFilePath(path)}`,
          {
            method: "PUT",
            body: JSON.stringify(body),
          }
        );
        if (!resp.ok) return handleApiError(resp.status, await resp.text(), `commit file ${path}`);

        const data = await resp.json();
        return {
          path: data.content?.path,
          sha: data.content?.sha,
          commit_sha: data.commit?.sha,
          commit_url: data.commit?.html_url,
        };
      } catch (err) {
        getLogger().error("github_create_or_update_file error", err);
        return `Error: Failed to commit file ${path}.`;
      }
    },
  };
}

// ─── Umbrella Factory ────────────────────────────────────────────────────────

/**
 * Create all GitHub tools for the chat system.
 *
 * @param getAccessToken - Returns the current GitHub access token (or null)
 * @param requestGitHubAccess - Triggers the OAuth flow and returns a token
 */
export function createGitHubTools(
  getAccessToken: () => string | null,
  requestGitHubAccess: () => Promise<string>
): ToolConfig[] {
  return [
    // Read
    createSearchReposTool(getAccessToken, requestGitHubAccess),
    createReadFileTool(getAccessToken, requestGitHubAccess),
    createSearchCodeTool(getAccessToken, requestGitHubAccess),
    createDirectoryTreeTool(getAccessToken, requestGitHubAccess),
    // Issues
    createListIssuesTool(getAccessToken, requestGitHubAccess),
    createCreateIssueTool(getAccessToken, requestGitHubAccess),
    // Pull Requests
    createListPullRequestsTool(getAccessToken, requestGitHubAccess),
    createGetPullRequestTool(getAccessToken, requestGitHubAccess),
    createCreatePullRequestTool(getAccessToken, requestGitHubAccess),
    createMergePullRequestTool(getAccessToken, requestGitHubAccess),
    // PR Review
    createListPRCommentsTool(getAccessToken, requestGitHubAccess),
    createPRReviewTool(getAccessToken, requestGitHubAccess),
    // Write
    createBranchTool(getAccessToken, requestGitHubAccess),
    createOrUpdateFileTool(getAccessToken, requestGitHubAccess),
  ];
}
