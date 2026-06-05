/**
 * Contract tests for {@link createPortalClient} against the live-shaped
 * {@link startStubPortal}. These guard the two bugs the stub previously hid:
 * a body-less mint and a misparsed connect-ticket response.
 */

import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { createPortalClient } from "../src/createPortalClient.js";

import { havenGrant } from "./fixtures.js";
import { startStubPortal, type StubPortalHandle } from "./stub-portal.js";

const BEARER = "haven-bearer";

let stub: StubPortalHandle;
let originalFetch: typeof globalThis.fetch | undefined;

beforeEach(() => {
  originalFetch = globalThis.fetch;
});

afterEach(async () => {
  globalThis.fetch = originalFetch as typeof globalThis.fetch;
  if (stub) await stub.stop();
});

describe("createPortalClient mint contract", () => {
  test("sends the default access body for the provider", async () => {
    stub = await startStubPortal({
      grants: { [BEARER]: havenGrant },
      mintBehavior: { gmail: { kind: "ok", accessToken: "live-token" } },
    });
    const client = createPortalClient(BEARER, { baseUrl: stub.url, maxRetries: 1, retryBaseMs: 1 });

    const result = await client.mintConnectorToken("gmail");

    expect(result.ok).toBe(true);
    expect(stub.lastMintBody).toEqual({ access: "read" });
  });

  test("an explicit access argument overrides the default", async () => {
    stub = await startStubPortal({
      grants: { [BEARER]: havenGrant },
      mintBehavior: { gdrive: { kind: "ok", accessToken: "live-token" } },
    });
    const client = createPortalClient(BEARER, { baseUrl: stub.url, maxRetries: 1, retryBaseMs: 1 });

    await client.mintConnectorToken("gdrive", "write");

    expect(stub.lastMintBody).toEqual({ access: "write" });
  });

  test("github defaults to the repo access level", async () => {
    stub = await startStubPortal({
      grants: { [BEARER]: havenGrant },
      mintBehavior: { github: { kind: "ok", accessToken: "live-token" } },
    });
    const client = createPortalClient(BEARER, { baseUrl: stub.url, maxRetries: 1, retryBaseMs: 1 });

    await client.mintConnectorToken("github");

    expect(stub.lastMintBody).toEqual({ access: "repo" });
  });

  test("an unknown provider falls back to read", async () => {
    stub = await startStubPortal({
      grants: { [BEARER]: havenGrant },
      mintBehavior: { slack: { kind: "ok", accessToken: "live-token" } },
    });
    const client = createPortalClient(BEARER, { baseUrl: stub.url, maxRetries: 1, retryBaseMs: 1 });

    await client.mintConnectorToken("slack");

    expect(stub.lastMintBody).toEqual({ access: "read" });
  });
});

describe("createPortalClient createConnectTicket contract", () => {
  test("builds the connect URL from the logical provider and a future expiry", async () => {
    stub = await startStubPortal({ grants: { [BEARER]: havenGrant } });
    const client = createPortalClient(BEARER, { baseUrl: stub.url, maxRetries: 1, retryBaseMs: 1 });

    const before = Date.now();
    const ticket = await client.createConnectTicket({
      provider: "gmail",
      requestedScopes: ["https://www.googleapis.com/auth/gmail.readonly"],
      returnTo: "https://app.example/done",
    });

    expect(ticket.connectUrl).toBe(
      `${stub.url}/connectors/gmail/connect?ticket=${ticket.ticketId}`
    );
    // expires_in is 600s; allow slack for the round trip.
    expect(ticket.expiresAt).toBeGreaterThan(before + 590_000);
    expect(ticket.expiresAt).toBeLessThan(Date.now() + 600_000 + 5_000);
    // Google's three connectors share the "google" oauth_app upstream.
    expect(stub.lastConnectTicketBody?.oauth_app).toBe("google");
  });

  test("non-Google providers map oauth_app 1:1", async () => {
    stub = await startStubPortal({ grants: { [BEARER]: havenGrant } });
    const client = createPortalClient(BEARER, { baseUrl: stub.url, maxRetries: 1, retryBaseMs: 1 });

    const ticket = await client.createConnectTicket({
      provider: "github",
      requestedScopes: ["repo"],
      returnTo: "https://app.example/done",
    });

    expect(stub.lastConnectTicketBody?.oauth_app).toBe("github");
    expect(ticket.connectUrl).toBe(
      `${stub.url}/connectors/github/connect?ticket=${ticket.ticketId}`
    );
  });
});
