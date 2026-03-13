/**
 * Google Calendar tool e2e test
 *
 * Verifies that runToolLoop correctly executes Google Calendar tools
 * against the real Google Calendar API using a service account.
 */

import { describe, it, expect, afterAll } from "vitest";
import { runToolLoop } from "../../src/lib/chat/toolLoop.js";
import {
  createGoogleCalendarTool,
  createGoogleCalendarCreateEventTool,
} from "../../src/tools/googleCalendar.js";
import { config, extractText, printResult, wrapTool, type ToolCallLog } from "./setup.js";
import { createGoogleTokenManager } from "./googleAuth.js";

// ── Setup ─────────────────────────────────────────────────────────────────────

const auth = createGoogleTokenManager("https://www.googleapis.com/auth/calendar");
const createdEventIds: string[] = [];

async function deleteEvent(eventId: string) {
  const token = await auth.ensureToken();
  await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("google-calendar", () => {
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
    await auth.ensureToken();

    const log: ToolCallLog[] = [];
    const listTool = wrapTool(
      createGoogleCalendarTool(auth.getAccessToken, auth.requestAccess),
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
    await auth.ensureToken();

    const log: ToolCallLog[] = [];
    const createTool = wrapTool(
      createGoogleCalendarCreateEventTool(auth.getAccessToken, auth.requestAccess),
      log
    );

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split("T")[0];

    const result = await runToolLoop({
      messages: [
        {
          role: "system",
          content: [
            {
              type: "text",
              text: "You are a calendar assistant. When asked to create an event, call the tool immediately with all required arguments. Do not ask for confirmation.",
            },
          ],
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
    await auth.ensureToken();

    const log: ToolCallLog[] = [];
    const listTool = wrapTool(
      createGoogleCalendarTool(auth.getAccessToken, auth.requestAccess),
      log
    );
    const createTool = wrapTool(
      createGoogleCalendarCreateEventTool(auth.getAccessToken, auth.requestAccess),
      log
    );

    const dayAfter = new Date();
    dayAfter.setDate(dayAfter.getDate() + 2);
    const dateStr = dayAfter.toISOString().split("T")[0];

    const result = await runToolLoop({
      messages: [
        {
          role: "system",
          content: [
            {
              type: "text",
              text: "You are a calendar assistant. Execute tool calls immediately without asking for confirmation. When checking availability and creating events, use the tools directly.",
            },
          ],
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

    const firstListIdx = log.indexOf(listCalls[0]);
    const firstCreateIdx = log.indexOf(createCalls[0]);
    expect(firstListIdx).toBeLessThan(firstCreateIdx);

    const createResult = createCalls[0].result as Record<string, unknown>;
    if (createResult?.id) {
      createdEventIds.push(createResult.id as string);
    }

    const createArgs = createCalls[0].args;
    expect((createArgs.summary as string).toLowerCase()).toContain("e2e chain");
  });
});
