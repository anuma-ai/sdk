/**
 * Google Calendar tool e2e test
 *
 * Verifies that runToolLoop correctly executes Google Calendar tools
 * against the real Google Calendar API using a service account.
 */

import { describe, it, expect, afterAll } from "vitest";
import { createSign } from "crypto";
import { runToolLoop } from "../../src/lib/chat/toolLoop.js";
import {
  createGoogleCalendarTool,
  createGoogleCalendarCreateEventTool,
} from "../../src/tools/googleCalendar.js";
import { config, extractText, printResult, wrapTool, type ToolCallLog } from "./setup.js";

// ── Service account auth ──────────────────────────────────────────────────────

interface ServiceAccountKey {
  client_email: string;
  private_key: string;
  token_uri: string;
}

function base64url(data: string | Buffer): string {
  const buf = typeof data === "string" ? Buffer.from(data) : data;
  return buf.toString("base64url");
}

function createJwt(key: ServiceAccountKey): string {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64url(
    JSON.stringify({
      iss: key.client_email,
      scope: "https://www.googleapis.com/auth/calendar",
      aud: key.token_uri,
      iat: now,
      exp: now + 3600,
    })
  );
  const signable = `${header}.${payload}`;
  const sign = createSign("RSA-SHA256");
  sign.update(signable);
  const signature = sign.sign(key.private_key, "base64url");
  return `${signable}.${signature}`;
}

async function getServiceAccountToken(key: ServiceAccountKey): Promise<string> {
  const jwt = createJwt(key);
  const res = await fetch(key.token_uri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to get service account token (${res.status}): ${text}`);
  }
  const data = await res.json();
  return data.access_token;
}

// ── Setup ─────────────────────────────────────────────────────────────────────

if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
  throw new Error(
    "GOOGLE_SERVICE_ACCOUNT_KEY is required. Add it to .env or set the environment variable."
  );
}
const serviceKey: ServiceAccountKey = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);

let accessToken: string | null = null;
const createdEventIds: string[] = [];

async function ensureToken(): Promise<string> {
  if (!accessToken) {
    accessToken = await getServiceAccountToken(serviceKey);
  }
  return accessToken;
}

const getAccessToken = () => accessToken;
const requestCalendarAccess = async () => ensureToken();

async function deleteEvent(eventId: string) {
  const token = await ensureToken();
  await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("google-calendar", () => {
  // Clean up any events created during tests
  afterAll(async () => {
    for (const id of createdEventIds) {
      try {
        await deleteEvent(id);
        console.log(`  [cleanup] Deleted event ${id}`);
      } catch {
        console.warn(`  [cleanup] Failed to delete event ${id}`);
      }
    }
  });

  it("lists calendar events", async () => {
    await ensureToken();

    const log: ToolCallLog[] = [];
    const listTool = wrapTool(
      createGoogleCalendarTool(getAccessToken, requestCalendarAccess),
      log
    );

    const result = await runToolLoop({
      messages: [
        {
          role: "user",
          content: [{ type: "text", text: "List my calendar events for the next 7 days." }],
        },
      ],
      model: config.model,
      baseUrl: config.baseUrl,
      headers: { "X-API-Key": config.portalKey },
      apiType: config.apiType,
      tools: [listTool],
      toolChoice: "auto",
      maxToolRounds: 3,
    });

    printResult(result);

    expect(result.error).toBeNull();
    expect(log.length).toBeGreaterThanOrEqual(1);
    expect(log[0].name).toBe("google_calendar_list_events");

    const events = log[0].result;
    expect(Array.isArray(events)).toBe(true);
  });

  it("creates a calendar event", async () => {
    await ensureToken();

    const log: ToolCallLog[] = [];
    const createTool = wrapTool(
      createGoogleCalendarCreateEventTool(getAccessToken, requestCalendarAccess),
      log
    );

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split("T")[0];

    const result = await runToolLoop({
      messages: [
        {
          role: "system",
          content:
            "You are a calendar assistant. When asked to create an event, call the tool immediately with all required arguments. Do not ask for confirmation.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Create a calendar event with summary "E2E Test Meeting", start "${dateStr}T10:00:00Z", end "${dateStr}T11:00:00Z", description "Automated test event".`,
            },
          ],
        },
      ],
      model: config.model,
      baseUrl: config.baseUrl,
      headers: { "X-API-Key": config.portalKey },
      apiType: config.apiType,
      tools: [createTool],
      toolChoice: "auto",
      maxToolRounds: 3,
    });

    printResult(result);

    expect(result.error).toBeNull();
    expect(log.length).toBeGreaterThanOrEqual(1);
    expect(log[0].name).toBe("google_calendar_create_event");

    // Track created event for cleanup
    const createResult = log[0].result as Record<string, unknown>;
    if (createResult?.id) {
      createdEventIds.push(createResult.id as string);
    }

    const args = log[0].args;
    expect(args.summary).toContain("E2E Test");
    expect(typeof args.start).toBe("string");
    expect(typeof args.end).toBe("string");

    expect(createResult.id).toBeDefined();
    expect(createResult.summary).toContain("E2E Test");
  });

  it("chains list → create: checks availability then creates an event", async () => {
    await ensureToken();

    const log: ToolCallLog[] = [];
    const listTool = wrapTool(
      createGoogleCalendarTool(getAccessToken, requestCalendarAccess),
      log
    );
    const createTool = wrapTool(
      createGoogleCalendarCreateEventTool(getAccessToken, requestCalendarAccess),
      log
    );

    const dayAfter = new Date();
    dayAfter.setDate(dayAfter.getDate() + 2);
    const dateStr = dayAfter.toISOString().split("T")[0];

    const result = await runToolLoop({
      messages: [
        {
          role: "system",
          content:
            "You are a calendar assistant. Execute tool calls immediately without asking for confirmation. When checking availability and creating events, use the tools directly.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Check my calendar for ${dateStr}, then create a 1-hour event called "E2E Chain Test" at 3:00 PM UTC on that day.`,
            },
          ],
        },
      ],
      model: config.model,
      baseUrl: config.baseUrl,
      headers: { "X-API-Key": config.portalKey },
      apiType: config.apiType,
      tools: [listTool, createTool],
      toolChoice: "auto",
      maxToolRounds: 5,
    });

    printResult(result);

    expect(result.error).toBeNull();

    const listCalls = log.filter((l) => l.name === "google_calendar_list_events");
    const createCalls = log.filter((l) => l.name === "google_calendar_create_event");

    expect(listCalls.length).toBeGreaterThanOrEqual(1);
    expect(createCalls.length).toBeGreaterThanOrEqual(1);

    // List should come before create
    const firstListIdx = log.indexOf(listCalls[0]);
    const firstCreateIdx = log.indexOf(createCalls[0]);
    expect(firstListIdx).toBeLessThan(firstCreateIdx);

    // Track created event for cleanup
    const createResult = createCalls[0].result as Record<string, unknown>;
    if (createResult?.id) {
      createdEventIds.push(createResult.id as string);
    }

    const createArgs = createCalls[0].args;
    expect((createArgs.summary as string).toLowerCase()).toContain("e2e chain");
  });
});
