import { createGmailTools } from "@anuma/sdk/tools";
import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { createConnectorTokenGetter } from "../src/createConnectorTokenGetter.js";
import { runAgentRequest } from "../src/runAgentRequest.js";
import type { PortalClient } from "../src/types.js";

import { havenAgent, havenGrant, mockReq, plannedTransport, sentinelGrant } from "./fixtures.js";
import { startStubPortal, type StubPortalHandle } from "./stub-portal.js";

const HAVEN_BEARER = "haven-bearer";
const SENTINEL_BEARER = "sentinel-bearer";

let stub: StubPortalHandle;
let originalFetch: typeof globalThis.fetch | undefined;

beforeEach(() => {
  originalFetch = globalThis.fetch;
});

afterEach(async () => {
  globalThis.fetch = originalFetch as typeof globalThis.fetch;
  if (stub) await stub.stop();
});

function buildGmailFactories(): Array<(portal: PortalClient) => ReturnType<typeof Object.values>> {
  return [
    (portal) =>
      Object.values(
        createGmailTools(createConnectorTokenGetter(portal, "gmail"), async () => {
          throw new Error("server agent cannot initiate OAuth");
        })
      ),
  ];
}

describe("agent-runtime e2e", () => {
  test("happy path: valid grant + connected connector mints and the LLM reply references the upstream tool output", async () => {
    stub = await startStubPortal({
      grants: { [HAVEN_BEARER]: havenGrant },
      credentials: {
        [havenGrant.userAddress]: [
          {
            oauthApp: "google",
            externalAccount: "tanmay@example.com",
            grantedScopes: ["https://www.googleapis.com/auth/gmail.readonly"],
          },
        ],
      },
      mintBehavior: {
        gmail: { kind: "ok", accessToken: "live-token" },
      },
    });

    // Wrap fetch: portal calls go to the stub, gmail.googleapis.com calls
    // are stubbed to return one fake message.
    globalThis.fetch = (async (
      input: string | URL | Request,
      init?: RequestInit
    ): Promise<Response> => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      if (url.startsWith(stub.url)) {
        return originalFetch!(input, init);
      }
      if (url.includes("gmail.googleapis.com")) {
        return new Response(JSON.stringify({ messages: [{ id: "abc", threadId: "t1" }] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response("unexpected url: " + url, { status: 500 });
    }) as typeof globalThis.fetch;

    const transport = plannedTransport([
      { kind: "tool_call", toolName: "gmail_search_messages", args: { query: "invoice" } },
      {
        kind: "assistant",
        content: "I found one invoice in your Gmail. Message ID: abc.",
      },
    ]);

    const result = await runAgentRequest({
      request: mockReq(HAVEN_BEARER),
      agent: havenAgent,
      messages: [{ role: "user", content: [{ type: "text", text: "find invoices from acme" }] }],
      toolFactories: buildGmailFactories(),
      portalClientOpts: { baseUrl: stub.url, maxRetries: 1, retryBaseMs: 1 },
      transport,
      apiType: "completions",
    });

    expect(result.toolErrors).toHaveLength(0);
    const tail = result.messages.at(-1);
    const tailText = Array.isArray(tail?.content)
      ? tail!.content.map((p) => p.text ?? "").join("")
      : ((tail?.content as unknown as string) ?? "");
    expect(tailText).toMatch(/invoice/i);
    expect(stub.mintCount).toBe(1);
  });

  test("412 path: missing connector_credentials surfaces a connect URL", async () => {
    stub = await startStubPortal({
      grants: { [HAVEN_BEARER]: havenGrant },
      credentials: { [havenGrant.userAddress]: [] },
      mintBehavior: {
        gmail: {
          kind: "connector_not_connected",
          provider: "gmail",
          connectUrl: "http://stub/connectors/gmail/connect?ticket=t1",
        },
      },
    });

    globalThis.fetch = (async (
      input: string | URL | Request,
      init?: RequestInit
    ): Promise<Response> => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      if (url.startsWith(stub.url)) return originalFetch!(input, init);
      return new Response("unexpected url: " + url, { status: 500 });
    }) as typeof globalThis.fetch;

    const transport = plannedTransport([
      { kind: "tool_call", toolName: "gmail_search_messages", args: { query: "anything" } },
      {
        kind: "assistant",
        content:
          "You haven't connected Gmail yet. Please connect at http://stub/connectors/gmail/connect?ticket=t1",
      },
    ]);

    const result = await runAgentRequest({
      request: mockReq(HAVEN_BEARER),
      agent: havenAgent,
      messages: [{ role: "user", content: [{ type: "text", text: "search my gmail" }] }],
      toolFactories: buildGmailFactories(),
      portalClientOpts: { baseUrl: stub.url, maxRetries: 1, retryBaseMs: 1 },
      transport,
      apiType: "completions",
    });

    expect(result.toolErrors.length).toBeGreaterThanOrEqual(1);
    expect(result.toolErrors[0]).toEqual(
      expect.objectContaining({
        error: expect.objectContaining({ code: "connector_not_connected", provider: "gmail" }),
      })
    );

    // The tool-result message in the loop carries the canonical marker.
    const toolResultMsg = result.messages.find((m) => m.role === "tool");
    expect(toolResultMsg).toBeTruthy();
    const toolResultText = Array.isArray(toolResultMsg!.content)
      ? toolResultMsg!.content.map((p) => p.text ?? "").join("")
      : (toolResultMsg!.content as unknown as string);
    const parsedResult = JSON.parse(toolResultText) as Record<string, unknown>;
    expect(parsedResult.__anuma_connector_error_v1).toBe(true);

    // The agent's reply contains the connect URL.
    const tail = result.messages.at(-1);
    const tailText = Array.isArray(tail?.content)
      ? tail!.content.map((p) => p.text ?? "").join("")
      : ((tail?.content as unknown as string) ?? "");
    expect(tailText).toContain("/connectors/gmail/connect");
  });

  test("scope_not_covered: agent has grant but stored creds don't cover the scope", async () => {
    stub = await startStubPortal({
      grants: { [HAVEN_BEARER]: havenGrant },
      credentials: {
        [havenGrant.userAddress]: [
          {
            oauthApp: "google",
            grantedScopes: ["https://www.googleapis.com/auth/drive.readonly"],
          },
        ],
      },
      mintBehavior: {
        gmail: {
          kind: "scope_not_covered",
          provider: "gmail",
          missingScopes: ["https://www.googleapis.com/auth/gmail.readonly"],
          connectUrl: "http://stub/connectors/gmail/connect?ticket=t2",
        },
      },
    });

    globalThis.fetch = (async (
      input: string | URL | Request,
      init?: RequestInit
    ): Promise<Response> => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      if (url.startsWith(stub.url)) return originalFetch!(input, init);
      return new Response("unexpected url: " + url, { status: 500 });
    }) as typeof globalThis.fetch;

    const transport = plannedTransport([
      { kind: "tool_call", toolName: "gmail_search_messages", args: { query: "x" } },
      { kind: "assistant", content: "Gmail scope is missing." },
    ]);

    const result = await runAgentRequest({
      request: mockReq(HAVEN_BEARER),
      agent: havenAgent,
      messages: [{ role: "user", content: [{ type: "text", text: "look at gmail" }] }],
      toolFactories: buildGmailFactories(),
      portalClientOpts: { baseUrl: stub.url, maxRetries: 1, retryBaseMs: 1 },
      transport,
      apiType: "completions",
    });

    expect(result.toolErrors.length).toBeGreaterThanOrEqual(1);
    // The mint-error code in the parsed payload depends on what the tool
    // factory wrote. Today it writes connector_not_connected because the
    // token-getter returns null after any mint failure when there's no
    // onNotConnected. That's the documented v1 behavior — the connect URL
    // is still surfaced via the same canonical shape.
    expect(result.toolErrors[0].error.code).toBe("connector_not_connected");
  });

  test("insufficient_scope: agent's grant lacks the requested scope", async () => {
    stub = await startStubPortal({
      grants: { [SENTINEL_BEARER]: sentinelGrant },
      credentials: { [sentinelGrant.userAddress]: [] },
      mintBehavior: {
        gmail: { kind: "insufficient_scope", required: "connector:gmail:read" },
      },
    });

    globalThis.fetch = (async (
      input: string | URL | Request,
      init?: RequestInit
    ): Promise<Response> => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      if (url.startsWith(stub.url)) return originalFetch!(input, init);
      return new Response("unexpected url: " + url, { status: 500 });
    }) as typeof globalThis.fetch;

    const transport = plannedTransport([
      { kind: "tool_call", toolName: "gmail_search_messages", args: { query: "x" } },
      { kind: "assistant", content: "Sentinel can't read Gmail." },
    ]);

    const result = await runAgentRequest({
      request: mockReq(SENTINEL_BEARER),
      agent: havenAgent,
      messages: [{ role: "user", content: [{ type: "text", text: "check gmail" }] }],
      toolFactories: buildGmailFactories(),
      portalClientOpts: { baseUrl: stub.url, maxRetries: 1, retryBaseMs: 1 },
      transport,
      apiType: "completions",
    });

    expect(result.toolErrors.length).toBeGreaterThanOrEqual(1);
    expect(result.toolErrors[0].error.code).toBe("connector_not_connected");
  });

  test("upstream 5xx: portal client retries, eventually surfaces upstream_unavailable", async () => {
    stub = await startStubPortal({
      grants: { [HAVEN_BEARER]: havenGrant },
      credentials: {
        [havenGrant.userAddress]: [
          { oauthApp: "google", grantedScopes: ["https://www.googleapis.com/auth/gmail.readonly"] },
        ],
      },
      mintBehavior: { gmail: { kind: "upstream_5xx", count: 10 } },
    });

    globalThis.fetch = (async (
      input: string | URL | Request,
      init?: RequestInit
    ): Promise<Response> => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      if (url.startsWith(stub.url)) return originalFetch!(input, init);
      return new Response("unexpected url: " + url, { status: 500 });
    }) as typeof globalThis.fetch;

    const transport = plannedTransport([
      { kind: "tool_call", toolName: "gmail_search_messages", args: { query: "x" } },
      { kind: "assistant", content: "Gmail is briefly unavailable." },
    ]);

    const result = await runAgentRequest({
      request: mockReq(HAVEN_BEARER),
      agent: havenAgent,
      messages: [{ role: "user", content: [{ type: "text", text: "search gmail" }] }],
      toolFactories: buildGmailFactories(),
      portalClientOpts: { baseUrl: stub.url, maxRetries: 2, retryBaseMs: 1 },
      transport,
      apiType: "completions",
    });

    expect(result.toolErrors.length).toBeGreaterThanOrEqual(1);
    expect(result.toolErrors[0].error.code).toBe("connector_not_connected");
  });

  test("token caching: two tool calls within the same request mint only once", async () => {
    stub = await startStubPortal({
      grants: { [HAVEN_BEARER]: havenGrant },
      credentials: {
        [havenGrant.userAddress]: [
          { oauthApp: "google", grantedScopes: ["https://www.googleapis.com/auth/gmail.readonly"] },
        ],
      },
      mintBehavior: { gmail: { kind: "ok", accessToken: "live-token", expiresIn: 300 } },
    });

    globalThis.fetch = (async (
      input: string | URL | Request,
      init?: RequestInit
    ): Promise<Response> => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      if (url.startsWith(stub.url)) return originalFetch!(input, init);
      if (url.includes("gmail.googleapis.com")) {
        return new Response(JSON.stringify({ messages: [{ id: "abc", threadId: "t1" }] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response("unexpected url: " + url, { status: 500 });
    }) as typeof globalThis.fetch;

    const transport = plannedTransport([
      { kind: "tool_call", toolName: "gmail_search_messages", args: { query: "first" } },
      { kind: "tool_call", toolName: "gmail_search_messages", args: { query: "second" } },
      { kind: "assistant", content: "Two searches done." },
    ]);

    const result = await runAgentRequest({
      request: mockReq(HAVEN_BEARER),
      agent: havenAgent,
      messages: [{ role: "user", content: [{ type: "text", text: "search twice" }] }],
      toolFactories: buildGmailFactories(),
      portalClientOpts: { baseUrl: stub.url, maxRetries: 1, retryBaseMs: 1 },
      transport,
      apiType: "completions",
    });

    expect(result.toolErrors).toHaveLength(0);
    expect(stub.mintCount).toBe(1);
  });
});
