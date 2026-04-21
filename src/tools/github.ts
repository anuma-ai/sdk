/**
 * GitHub tools for the chat system.
 *
 * Two tools:
 * 1. github_get_authenticated_user — discover the user's identity and orgs
 * 2. github_api — make any authenticated GitHub REST API call
 *
 * This lets the LLM use its training knowledge of the GitHub API directly,
 * instead of us defining individual tools for every endpoint.
 */

import type { ToolConfig } from "../lib/chat/useChat/types.js";
import { getLogger } from "../lib/logger";

const GITHUB_API = "https://api.github.com";
const FETCH_TIMEOUT_MS = 30_000;

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

async function githubFetch(
  token: string,
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  // Require relative paths to start with / to prevent concatenation attacks
  // (e.g., ".evil.com/steal" → "https://api.github.com.evil.com/steal")
  if (!path.startsWith("http") && !path.startsWith("/")) {
    throw new Error("githubFetch: relative path must start with /");
  }

  const url = path.startsWith("http") ? path : `${GITHUB_API}${path}`;

  // SSRF protection: validate the final URL targets GitHub API
  if (!url.startsWith(`${GITHUB_API}/`)) {
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

function createGetAuthenticatedUserTool(
  getAccessToken: () => string | null,
  requestAccess: () => Promise<string>
): ToolConfig {
  return {
    type: "function",
    function: {
      name: "github_get_authenticated_user",
      description:
        "Get the authenticated GitHub user's profile including username and organizations. Call this first to discover the user's identity before making other GitHub API calls.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
    executor: async () => {
      const token = await resolveToken(getAccessToken, requestAccess);
      if (!token) return "Error: GitHub not connected. Please connect your GitHub account first.";

      try {
        const userResp = await githubFetch(token, "/user");
        if (!userResp.ok) return `Error: Failed to get user (${userResp.status})`;
        const user = (await userResp.json()) as Record<string, unknown>;

        const orgsResp = await githubFetch(token, "/user/orgs?per_page=100");
        let orgs: string[] = [];
        if (orgsResp.ok) {
          const orgsData = (await orgsResp.json()) as Record<string, unknown>[];
          orgs = orgsData.map((o) => o.login as string);
        }

        return {
          login: user.login,
          name: user.name,
          email: user.email,
          organizations: orgs,
          public_repos: user.public_repos,
          html_url: user.html_url,
        };
      } catch (err) {
        getLogger().error("github_get_authenticated_user error", err);
        return "Error: Failed to get user profile.";
      }
    },
  };
}

const MAX_RESPONSE_SIZE = 100_000;

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + `\n\n... (truncated, ${text.length - maxLen} characters omitted)`;
}

function createGitHubApiTool(
  getAccessToken: () => string | null,
  requestAccess: () => Promise<string>
): ToolConfig {
  return {
    type: "function",
    function: {
      name: "github_api",
      description: `Make an authenticated request to the GitHub REST API (https://api.github.com). You can call any endpoint documented at https://docs.github.com/en/rest.

Examples:
- List PRs: GET /repos/{owner}/{repo}/pulls?state=open
- Get file: GET /repos/{owner}/{repo}/contents/{path}
- Create issue: POST /repos/{owner}/{repo}/issues with body {"title": "...", "body": "..."}
- Search repos: GET /search/repositories?q={query}

IMPORTANT: For write operations (POST, PUT, PATCH, DELETE), always confirm with the user before executing. This includes creating issues, opening PRs, merging, committing files, and submitting reviews.`,
      parameters: {
        type: "object",
        properties: {
          method: {
            type: "string",
            enum: ["GET", "POST", "PUT", "PATCH", "DELETE"],
            description: "HTTP method",
          },
          path: {
            type: "string",
            description: "API path (e.g., /repos/owner/repo/pulls) or full URL for pagination",
          },
          body: {
            type: "object",
            description: "Request body for POST/PUT/PATCH requests",
            additionalProperties: true,
          },
        },
        required: ["method", "path"],
      },
    },
    executor: async (args: Record<string, unknown>) => {
      const token = await resolveToken(getAccessToken, requestAccess);
      if (!token) return "Error: GitHub not connected. Please connect your GitHub account first.";

      const method = args.method as string;
      const path = args.path as string;
      const body = args.body as Record<string, unknown> | undefined;

      try {
        const resp = await githubFetch(token, path, {
          method,
          body: body ? JSON.stringify(body) : undefined,
        });

        const text = await resp.text();
        if (!resp.ok) {
          return `Error: GitHub API ${method} ${path} returned ${resp.status}: ${truncate(text, 500)}`;
        }

        // Parse JSON if possible, otherwise return raw text
        try {
          const data: unknown = JSON.parse(text);
          const json = JSON.stringify(data, null, 2);
          return truncate(json, MAX_RESPONSE_SIZE);
        } catch {
          return truncate(text, MAX_RESPONSE_SIZE);
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          return `Error: GitHub API request timed out after ${FETCH_TIMEOUT_MS / 1000}s.`;
        }
        getLogger().error("github_api error", err);
        return `Error: GitHub API request failed: ${err instanceof Error ? err.message : "unknown error"}`;
      }
    },
  };
}

/**
 * Create GitHub tools for the chat system.
 *
 * @param getAccessToken - Returns the current GitHub access token (or null)
 * @param requestGitHubAccess - Triggers the OAuth flow and returns a token
 */
export function createGitHubTools(
  getAccessToken: () => string | null,
  requestGitHubAccess: () => Promise<string>
): ToolConfig[] {
  return [
    createGetAuthenticatedUserTool(getAccessToken, requestGitHubAccess),
    createGitHubApiTool(getAccessToken, requestGitHubAccess),
  ];
}
