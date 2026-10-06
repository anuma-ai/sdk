import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { createChatTools } from "./googleCalendar.js";

function updateEvent(args: Record<string, unknown>): Promise<unknown> {
  const tool = createChatTools(
    () => "good-token",
    async () => "good-token"
  ).find((t) => (t.function as { name: string }).name === "google_calendar_update_event");
  if (!tool?.executor) throw new Error("no executor for google_calendar_update_event");
  return (tool.executor as (a: Record<string, unknown>) => Promise<unknown>)(args);
}

describe("google_calendar_update_event eventId", () => {
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

  test.each([
    "abc?sendUpdates=all",
    "..",
    "../../x/events/y",
    "%2e%2e/x",
    "abc/def",
    "abc.def",
    "",
  ])("rejects %j without calling Google", async (eventId) => {
    const result = await updateEvent({ eventId, summary: "x" });

    expect(result).toBe(`Error: Invalid event ID: ${eventId}`);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("rejects a non-string eventId", async () => {
    const result = await updateEvent({ eventId: 42, summary: "x" });

    expect(result).toBe("Error: Invalid event ID: 42");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("patches a recurring instance id", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ id: "abc_20261001T150000Z", summary: "Standup" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    await updateEvent({ eventId: "abc_20261001T150000Z", summary: "Standup" });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events/abc_20261001T150000Z"
    );
    expect((init as RequestInit).method).toBe("PATCH");
  });
});
