/**
 * GitHub tool e2e test
 *
 * Verifies that the LLM correctly uses github_api and
 * github_get_authenticated_user tools via the real Portal API.
 *
 * Requires: PORTAL_API_KEY environment variable
 */

import { describe, it, expect } from "vitest";
import { runToolLoop } from "../../src/lib/chat/toolLoop.js";
import { createGitHubTools } from "../../src/tools/github.js";
import { config, extractText, printResult, wrapTool, type ToolCallLog } from "./setup.js";

// Use a static token — in CI this would come from a GitHub OAuth token secret.
// For now, tests verify tool invocation patterns, not actual GitHub API responses.
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || "";

describe("github", () => {
  const getToken = () => GITHUB_TOKEN || "test-token";
  const requestAccess = async () => getToken();

  it(
    "calls github_get_authenticated_user when asked about user's repos",
    { retry: 2 },
    async () => {
      const log: ToolCallLog[] = [];
      const tools = createGitHubTools(getToken, requestAccess).map((t) => wrapTool(t, log));

      const result = await runToolLoop({
        messages: [
          {
            role: "system",
            content: [
              {
                type: "text",
                text: "You are a helpful assistant with access to GitHub. Use the provided tools to answer questions. Execute tool calls immediately without asking for confirmation.",
              },
            ],
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "What is my GitHub username?",
              },
            ],
          },
        ],
        model: config.model,
        baseUrl: config.baseUrl,
        headers: { "X-API-Key": config.portalKey },
        apiType: config.apiType,
        tools,
        toolChoice: "auto",
        maxToolRounds: 3,
      });

      printResult(result);
      expect(result.error).toBeNull();

      const userCalls = log.filter((l) => l.name === "github_get_authenticated_user");
      expect(userCalls.length).toBeGreaterThanOrEqual(1);
    }
  );

  it("calls github_api with correct path for listing PRs", { retry: 2 }, async () => {
    const log: ToolCallLog[] = [];
    const tools = createGitHubTools(getToken, requestAccess).map((t) => wrapTool(t, log));

    const result = await runToolLoop({
      messages: [
        {
          role: "system",
          content: [
            {
              type: "text",
              text: "You are a helpful assistant with access to GitHub. Use the provided tools to answer questions. Execute tool calls immediately without asking for confirmation. The user's GitHub username is 'testuser' and the repo owner is 'zeta-chain'.",
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "List the open pull requests on zeta-chain/ai-portal",
            },
          ],
        },
      ],
      model: config.model,
      baseUrl: config.baseUrl,
      headers: { "X-API-Key": config.portalKey },
      apiType: config.apiType,
      tools,
      toolChoice: "auto",
      maxToolRounds: 3,
    });

    printResult(result);
    expect(result.error).toBeNull();

    const apiCalls = log.filter((l) => l.name === "github_api");
    expect(apiCalls.length).toBeGreaterThanOrEqual(1);

    // Verify the LLM called the right endpoint
    const prCall = apiCalls.find(
      (l) =>
        (l.args.path as string)?.includes("/pulls") &&
        (l.args.path as string)?.includes("ai-portal")
    );
    expect(prCall).toBeDefined();
    expect(prCall!.args.method).toBe("GET");
  });
});
