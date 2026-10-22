import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import type { GmailSendMessageArgs } from "./gmail.js";
import { connectorMintErrorToToolResult, createGmailTools } from "./gmail.js";

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

describe("createGmailTools", () => {
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

  test("gmail_search_messages returns matching message IDs on success", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        messages: [
          { id: "m1", threadId: "t1" },
          { id: "m2", threadId: "t2" },
        ],
      })
    );
    const tools = createGmailTools(
      async () => "good-token",
      async () => null
    );
    const result = (await runExecutor(tools.gmail_search_messages, {
      query: "subject:invoice",
    })) as { id: string }[];
    expect(result).toEqual([
      { id: "m1", threadId: "t1" },
      { id: "m2", threadId: "t2" },
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain("/gmail/v1/users/me/messages");
    expect(url).toContain("q=subject%3Ainvoice");
    expect((init as RequestInit).headers).toEqual({
      Authorization: "Bearer good-token",
    });
  });

  test("returns canonical connector error when token getter returns null and requestAccess yields nothing", async () => {
    const tools = createGmailTools(
      async () => null,
      async () => null
    );
    const raw = (await runExecutor(tools.gmail_search_messages, {
      query: "anything",
    })) as string;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    expect(parsed).toEqual({
      __anuma_connector_error_v1: true,
      code: "connector_not_connected",
      provider: "gmail",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("returns canonical connector error when requestAccess throws", async () => {
    const tools = createGmailTools(
      async () => null,
      async () => {
        throw new Error("server agent cannot initiate OAuth");
      }
    );
    const raw = (await runExecutor(tools.gmail_search_messages, {
      query: "anything",
    })) as string;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    expect(parsed.__anuma_connector_error_v1).toBe(true);
    expect(parsed.code).toBe("connector_not_connected");
  });

  test("returns connector error when Gmail responds 401", async () => {
    fetchMock.mockResolvedValueOnce(textResponse("unauthorized", 401));
    const tools = createGmailTools(
      async () => "stale-token",
      async () => null
    );
    const raw = (await runExecutor(tools.gmail_search_messages, {
      query: "anything",
    })) as string;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    expect(parsed.__anuma_connector_error_v1).toBe(true);
    expect(parsed.code).toBe("connector_not_connected");
    expect(parsed.provider).toBe("gmail");
  });

  test("returns connector error when Gmail responds 403", async () => {
    fetchMock.mockResolvedValueOnce(textResponse("forbidden", 403));
    const tools = createGmailTools(
      async () => "good-token",
      async () => null
    );
    const raw = (await runExecutor(tools.gmail_get_message, {
      messageId: "m1",
    })) as string;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    expect(parsed.code).toBe("connector_not_connected");
  });

  test("connectorMintErrorToToolResult uses the supplied provider for variants without one", () => {
    const raw = connectorMintErrorToToolResult(
      { code: "insufficient_scope", required: "connector:gdrive:read" },
      "gdrive"
    );
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    expect(parsed).toEqual({
      __anuma_connector_error_v1: true,
      code: "insufficient_scope",
      provider: "gdrive",
      required: "connector:gdrive:read",
    });
  });

  test("connectorMintErrorToToolResult preserves the embedded provider and drops connectUrl", () => {
    const raw = connectorMintErrorToToolResult(
      { code: "connector_not_connected", provider: "gmail", connectUrl: "https://x/connect" },
      "ignored"
    );
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    expect(parsed.provider).toBe("gmail");
    expect("connect_url" in parsed).toBe(false);
  });

  test("surfaces non-connector Gmail errors as raw error strings", async () => {
    fetchMock.mockResolvedValueOnce(textResponse("server burped", 500));
    const tools = createGmailTools(
      async () => "good-token",
      async () => null
    );
    const result = (await runExecutor(tools.gmail_search_messages, {
      query: "x",
    })) as string;
    expect(result).toContain("Error: Failed to search Gmail (500)");
    expect(result).toContain("server burped");
  });

  test("gmail_get_message decodes base64url plaintext body and exposes headers", async () => {
    const bodyText = "Hello, Anuma!";
    const base64 = Buffer.from(bodyText, "utf-8")
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        id: "m1",
        threadId: "t1",
        snippet: "Hello, Anum…",
        payload: {
          headers: [
            { name: "From", value: "billing@example.com" },
            { name: "Subject", value: "Invoice #42" },
          ],
          parts: [
            {
              mimeType: "text/plain",
              body: { data: base64 },
            },
          ],
        },
      })
    );
    const tools = createGmailTools(
      async () => "good-token",
      async () => null
    );
    const result = (await runExecutor(tools.gmail_get_message, {
      messageId: "m1",
    })) as { from?: string; subject?: string; body?: string };
    expect(result.from).toBe("billing@example.com");
    expect(result.subject).toBe("Invoice #42");
    expect(result.body).toBe(bodyText);
  });

  test("gmail_get_message does not throw when payload is malformed base64", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        id: "m2",
        threadId: "t2",
        snippet: "",
        payload: {
          headers: [{ name: "Subject", value: "Garbled" }],
          parts: [{ mimeType: "text/plain", body: { data: "not***valid***b64" } }],
        },
      })
    );
    const tools = createGmailTools(
      async () => "good-token",
      async () => null
    );
    const result = (await runExecutor(tools.gmail_get_message, {
      messageId: "m2",
    })) as { subject?: string; body?: string };
    expect(result.subject).toBe("Garbled");
    expect(result.body).toBeUndefined();
  });

  test("gmail_send_message waits for host confirmation of the complete message", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: "sent-1", threadId: "t1" }));
    let approve!: (confirmed: boolean) => void;
    const confirmSend = vi.fn(() => new Promise<boolean>((resolve) => (approve = resolve)));
    const getToken = vi.fn().mockResolvedValue("good-token");
    const tools = createGmailTools(getToken, async () => null, confirmSend);
    const args = {
      to: "ada@example.com",
      subject: "hi",
      body: "let's chat",
      cc: "charles@example.com",
      bcc: "grace@example.com",
    };
    const pending = runExecutor(tools.gmail_send_message, args);
    expect(confirmSend).toHaveBeenCalledExactlyOnceWith(args);
    expect(getToken).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
    approve(true);
    const result = await pending;
    expect(result).toEqual({ id: "sent-1", threadId: "t1" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0];
    const sent = JSON.parse((init as RequestInit).body as string) as { raw: string };
    const decoded = Buffer.from(sent.raw.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString(
      "utf-8"
    );
    expect(decoded).toContain("To: ada@example.com");
    expect(decoded).toContain("Cc: charles@example.com");
    expect(decoded).toContain("Bcc: grace@example.com");
    expect(decoded).toContain("Subject: hi");
    expect(decoded).toContain("let's chat");
  });

  test.each([false, undefined, "true"])(
    "gmail_send_message blocks sends when host confirmation returns %s",
    async (decision) => {
      fetchMock.mockResolvedValueOnce(jsonResponse({ id: "sent-1", threadId: "t1" }));
      const getToken = vi.fn().mockResolvedValue("good-token");
      const requestAccess = vi.fn();
      const tools = createGmailTools(getToken, requestAccess, vi.fn().mockResolvedValue(decision));
      const result = await runExecutor(tools.gmail_send_message, {
        to: "ada@example.com",
        subject: "hi",
        body: "hello",
        confirmed: true,
      });
      expect(result).toBe("Error: Gmail message send was not confirmed.");
      expect(getToken).not.toHaveBeenCalled();
      expect(requestAccess).not.toHaveBeenCalled();
      expect(fetchMock).not.toHaveBeenCalled();
    }
  );

  test("gmail_send_message blocks sends when host confirmation throws", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: "sent-1", threadId: "t1" }));
    const getToken = vi.fn().mockResolvedValue("good-token");
    const tools = createGmailTools(
      getToken,
      async () => null,
      vi.fn().mockRejectedValue(new Error("confirmation failed"))
    );
    await expect(
      runExecutor(tools.gmail_send_message, { to: "ada@example.com", subject: "hi", body: "hello" })
    ).rejects.toThrow("confirmation failed");
    expect(getToken).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("gmail_send_message requires a new host confirmation for each send", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: "sent-1", threadId: "t1" }));
    const confirmSend = vi.fn().mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    const tools = createGmailTools(
      async () => "good-token",
      async () => null,
      confirmSend
    );
    const args = { to: "ada@example.com", subject: "hi", body: "hello" };
    expect(await runExecutor(tools.gmail_send_message, args)).toEqual({
      id: "sent-1",
      threadId: "t1",
    });
    expect(await runExecutor(tools.gmail_send_message, args)).toBe(
      "Error: Gmail message send was not confirmed."
    );
    expect(confirmSend).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test("gmail_send_message blocks sends when the host aborts before confirmation", async () => {
    let approve!: (confirmed: boolean) => void;
    const confirmSend = vi.fn(() => new Promise<boolean>((resolve) => (approve = resolve)));
    const getToken = vi.fn().mockResolvedValue("good-token");
    const tools = createGmailTools(getToken, async () => null, confirmSend);
    const controller = new AbortController();
    const pending = tools.gmail_send_message.executor?.(
      { to: "ada@example.com", subject: "hi", body: "hello" },
      controller.signal
    );
    controller.abort();
    approve(true);
    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
    expect(getToken).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("gmail_send_message sends the confirmed snapshot when the caller changes the arguments", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: "sent-1", threadId: "t1" }));
    const args = {
      to: "ada@example.com\r\n",
      subject: " hi ",
      body: "hello",
      cc: "charles@example.com\r\n",
      bcc: "grace@example.com\0",
    };
    const confirmed = {
      to: "ada@example.com",
      subject: "hi",
      body: "hello",
      cc: "charles@example.com",
      bcc: "grace@example.com",
    };
    const confirmSend = vi.fn((message: Readonly<GmailSendMessageArgs>) => {
      expect(message).toEqual(confirmed);
      expect(Object.isFrozen(message)).toBe(true);
      Object.assign(args, {
        to: "other@example.com",
        subject: "changed",
        body: "changed",
        cc: "other@example.com",
        bcc: "other@example.com",
      });
      return true;
    });
    const tools = createGmailTools(
      async () => "good-token",
      async () => null,
      confirmSend
    );
    await runExecutor(tools.gmail_send_message, args);
    expect(confirmSend).toHaveBeenCalledExactlyOnceWith(confirmed);
    const [, init] = fetchMock.mock.calls[0];
    const sent = JSON.parse((init as RequestInit).body as string) as { raw: string };
    expect(Buffer.from(sent.raw, "base64url").toString("utf-8")).toBe(
      "To: ada@example.com\r\nCc: charles@example.com\r\nBcc: grace@example.com\r\nSubject: hi\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\nhello"
    );
  });

  test("gmail_send_message strips CRLF from header values to block header injection", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: "sent-2", threadId: "t2" }));
    const tools = createGmailTools(
      async () => "good-token",
      async () => null,
      () => true
    );
    await runExecutor(tools.gmail_send_message, {
      to: "ada@example.com",
      subject: "hello\r\nBcc: evil@attacker.com",
      body: "hi",
    });
    const [, init] = fetchMock.mock.calls[0];
    const sent = JSON.parse((init as RequestInit).body as string) as { raw: string };
    const decoded = Buffer.from(sent.raw.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString(
      "utf-8"
    );
    const headerBlock = decoded.split("\r\n\r\n", 1)[0];
    const headerLines = headerBlock.split("\r\n");
    expect(headerLines.some((line) => line.startsWith("Bcc:"))).toBe(false);
    expect(headerLines).toContain("Subject: hello Bcc: evil@attacker.com");
  });

  test("gmail_create_draft posts a base64url-encoded RFC822 message wrapped in {message:{raw}}", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ id: "draft-1", message: { id: "m9", threadId: "t9" } })
    );
    const tools = createGmailTools(
      async () => "good-token",
      async () => null
    );
    const result = (await runExecutor(tools.gmail_create_draft, {
      to: "ada@example.com",
      subject: "hi",
      body: "let's chat",
    })) as { id: string; messageId: string; threadId: string };
    expect(result).toEqual({ id: "draft-1", messageId: "m9", threadId: "t9" });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain("/gmail/v1/users/me/drafts");
    const sent = JSON.parse((init as RequestInit).body as string) as { message: { raw: string } };
    const decoded = Buffer.from(
      sent.message.raw.replace(/-/g, "+").replace(/_/g, "/"),
      "base64"
    ).toString("utf-8");
    expect(decoded).toContain("To: ada@example.com");
    expect(decoded).toContain("Subject: hi");
    expect(decoded).toContain("let's chat");
  });

  test("gmail_create_draft strips CRLF from header values to block header injection", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ id: "draft-2", message: { id: "m10", threadId: "t10" } })
    );
    const tools = createGmailTools(
      async () => "good-token",
      async () => null
    );
    await runExecutor(tools.gmail_create_draft, {
      to: "ada@example.com",
      subject: "hello\r\nBcc: evil@attacker.com",
      body: "hi",
    });
    const [, init] = fetchMock.mock.calls[0];
    const sent = JSON.parse((init as RequestInit).body as string) as { message: { raw: string } };
    const decoded = Buffer.from(
      sent.message.raw.replace(/-/g, "+").replace(/_/g, "/"),
      "base64"
    ).toString("utf-8");
    const headerBlock = decoded.split("\r\n\r\n", 1)[0];
    const headerLines = headerBlock.split("\r\n");
    expect(headerLines.some((line) => line.startsWith("Bcc:"))).toBe(false);
    expect(headerLines).toContain("Subject: hello Bcc: evil@attacker.com");
  });

  test("gmail_create_draft returns connector error when Gmail responds 403", async () => {
    fetchMock.mockResolvedValueOnce(textResponse("forbidden", 403));
    const tools = createGmailTools(
      async () => "good-token",
      async () => null
    );
    const raw = (await runExecutor(tools.gmail_create_draft, {
      to: "ada@example.com",
      subject: "hi",
      body: "draft me",
    })) as string;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    expect(parsed.__anuma_connector_error_v1).toBe(true);
    expect(parsed.code).toBe("connector_not_connected");
    expect(parsed.provider).toBe("gmail");
  });
});
