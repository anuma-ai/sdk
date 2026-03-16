/**
 * Google Calendar tool definition for the chat system.
 * This tool allows the LLM to list events from the user's Google Calendar.
 */

import type { ToolConfig } from "../lib/chat/useChat/types.js";

export interface ListEventsArgs {
  timeMin?: string;
  timeMax?: string;
  maxResults?: number;
}

export interface CreateEventArgs {
  summary: string;
  start: string;
  end: string;
  description?: string;
  location?: string;
  attendees?: string[];
}

export interface UpdateEventArgs {
  eventId: string;
  summary?: string;
  start?: string;
  end?: string;
  description?: string;
  location?: string;
  attendees?: string[];
}

export interface CalendarEvent {
  id: string;
  summary: string;
  start: string;
  end: string;
  description?: string;
  location?: string;
}

/**
 * Ensures a timestamp has timezone information (appends Z if missing)
 */
function ensureTimezone(timestamp: string): string {
  // If already has timezone (Z, +, or -), return as-is
  if (/[Zz]$/.test(timestamp) || /[+-]\d{2}:\d{2}$/.test(timestamp)) {
    return timestamp;
  }
  // Append Z for UTC if no timezone specified
  return `${timestamp}Z`;
}

/**
 * Fetches events from Google Calendar API
 */
async function fetchCalendarEvents(
  accessToken: string,
  args: ListEventsArgs
): Promise<CalendarEvent[] | string> {
  const { timeMin, timeMax, maxResults = 10 } = args;

  // Build query parameters
  const params = new URLSearchParams({
    maxResults: String(maxResults),
    singleEvents: "true",
    orderBy: "startTime",
  });

  // Default to next 7 days if no time range specified
  const now = new Date();
  const defaultTimeMin = now.toISOString();
  const defaultTimeMax = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

  params.set("timeMin", ensureTimezone(timeMin || defaultTimeMin));
  params.set("timeMax", ensureTimezone(timeMax || defaultTimeMax));

  try {
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      if (response.status === 401) {
        return "Error: Calendar access not authorized. Please grant calendar permissions.";
      }
      const errorText = await response.text();
      return `Error: Failed to fetch calendar events (${response.status}): ${errorText}`;
    }

    const data = await response.json();
    const events: CalendarEvent[] = (data.items || []).map(
      (item: {
        id: string;
        summary?: string;
        start?: { dateTime?: string; date?: string };
        end?: { dateTime?: string; date?: string };
        description?: string;
        location?: string;
      }) => ({
        id: item.id,
        summary: item.summary || "No title",
        start: item.start?.dateTime || item.start?.date || "Unknown",
        end: item.end?.dateTime || item.end?.date || "Unknown",
        description: item.description,
        location: item.location,
      })
    );

    return events;
  } catch (error) {
    return `Error: ${error instanceof Error ? error.message : "Unknown error occurred"}`;
  }
}

/**
 * Builds the event body for the Google Calendar API
 */
function buildEventBody(args: CreateEventArgs): Record<string, unknown> {
  const { summary, start, end, description, location, attendees } = args;
  const isAllDay = !start.includes("T");

  const eventBody: Record<string, unknown> = {
    summary,
    description,
    location,
    start: isAllDay ? { date: start } : { dateTime: start },
    end: isAllDay ? { date: end } : { dateTime: end },
  };

  if (attendees && attendees.length > 0) {
    eventBody.attendees = attendees.map((email) => ({ email }));
  }

  return eventBody;
}

/**
 * Parses the API response into a CalendarEvent
 */
function parseEventResponse(data: {
  id: string;
  summary?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  description?: string;
  location?: string;
}): CalendarEvent {
  return {
    id: data.id,
    summary: data.summary || "No title",
    start: data.start?.dateTime || data.start?.date || "Unknown",
    end: data.end?.dateTime || data.end?.date || "Unknown",
    description: data.description,
    location: data.location,
  };
}

/**
 * Creates an event in Google Calendar API
 */
async function createCalendarEvent(
  accessToken: string,
  args: CreateEventArgs
): Promise<CalendarEvent | string> {
  const eventBody = buildEventBody(args);

  try {
    const response = await fetch(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(eventBody),
      }
    );

    if (!response.ok) {
      if (response.status === 401) {
        return "Error: Calendar access not authorized. Please grant calendar permissions.";
      }
      const errorText = await response.text();
      return `Error: Failed to create calendar event (${response.status}): ${errorText}`;
    }

    const data = await response.json();
    return parseEventResponse(data);
  } catch (error) {
    return `Error: ${error instanceof Error ? error.message : "Unknown error occurred"}`;
  }
}

/**
 * Builds the update body for the Google Calendar API (only includes provided fields)
 */
function buildUpdateEventBody(args: UpdateEventArgs): Record<string, unknown> {
  const { summary, start, end, description, location, attendees } = args;
  const eventBody: Record<string, unknown> = {};

  if (summary !== undefined) eventBody.summary = summary;
  if (description !== undefined) eventBody.description = description;
  if (location !== undefined) eventBody.location = location;

  if (start !== undefined) {
    const isAllDay = !start.includes("T");
    eventBody.start = isAllDay ? { date: start } : { dateTime: start };
  }

  if (end !== undefined) {
    const isAllDay = !end.includes("T");
    eventBody.end = isAllDay ? { date: end } : { dateTime: end };
  }

  if (attendees !== undefined) {
    eventBody.attendees = attendees.map((email) => ({ email }));
  }

  return eventBody;
}

/**
 * Updates an event in Google Calendar API
 */
async function updateCalendarEvent(
  accessToken: string,
  args: UpdateEventArgs
): Promise<CalendarEvent | string> {
  const { eventId } = args;
  const eventBody = buildUpdateEventBody(args);

  try {
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(eventBody),
      }
    );

    if (!response.ok) {
      if (response.status === 401) {
        return "Error: Calendar access not authorized. Please grant calendar permissions.";
      }
      if (response.status === 404) {
        return `Error: Event not found with ID: ${eventId}`;
      }
      const errorText = await response.text();
      return `Error: Failed to update calendar event (${response.status}): ${errorText}`;
    }

    const data = await response.json();
    return parseEventResponse(data);
  } catch (error) {
    return `Error: ${error instanceof Error ? error.message : "Unknown error occurred"}`;
  }
}

/**
 * Creates the Google Calendar list events tool with access to the token getter.
 * The token getter is captured in a closure so the executor can access it.
 */
export function createGoogleCalendarTool(
  getAccessToken: () => string | null,
  requestCalendarAccess: () => Promise<string>
): ToolConfig {
  return {
    type: "function",
    function: {
      name: "google_calendar_list_events",
      description:
        "Lists upcoming events from the user's Google Calendar. Returns events within a specified time range. If no time range is specified, returns events for the next 7 days.",
      parameters: {
        type: "object",
        properties: {
          timeMin: {
            type: "string",
            description:
              'Start of the time range (ISO 8601 format, e.g., "2024-01-15T00:00:00Z"). Defaults to now.',
          },
          timeMax: {
            type: "string",
            description:
              'End of the time range (ISO 8601 format, e.g., "2024-01-22T23:59:59Z"). Defaults to 7 days from now.',
          },
          maxResults: {
            type: "number",
            description: "Maximum number of events to return. Defaults to 10.",
          },
        },
        required: [],
      },
    },
    executor: async (args: Record<string, unknown>): Promise<CalendarEvent[] | string> => {
      // Try to get existing token first
      let token = getAccessToken();

      // If no token, request calendar access
      if (!token) {
        try {
          token = await requestCalendarAccess();
        } catch {
          return "Error: Failed to get calendar access. Please grant permissions when prompted.";
        }
      }

      if (!token) {
        return "Error: No Google Calendar access token available. Please connect your Google account.";
      }

      const typedArgs: ListEventsArgs = {
        timeMin: args.timeMin as string | undefined,
        timeMax: args.timeMax as string | undefined,
        maxResults: args.maxResults as number | undefined,
      };

      return fetchCalendarEvents(token, typedArgs);
    },
  };
}

/**
 * Creates the Google Calendar create event tool with access to the token getter.
 * The token getter is captured in a closure so the executor can access it.
 */
export function createGoogleCalendarCreateEventTool(
  getAccessToken: () => string | null,
  requestCalendarAccess: () => Promise<string>
): ToolConfig {
  return {
    type: "function",
    function: {
      name: "google_calendar_create_event",
      description:
        "Creates a new event in the user's Google Calendar. Supports both timed events (with specific times) and all-day events (date only).",
      parameters: {
        type: "object",
        properties: {
          summary: {
            type: "string",
            description: "The title/name of the event.",
          },
          start: {
            type: "string",
            description:
              'Start time in ISO 8601 format. For timed events use datetime format (e.g., "2024-01-15T09:00:00-05:00"). For all-day events use date format (e.g., "2024-01-15").',
          },
          end: {
            type: "string",
            description:
              'End time in ISO 8601 format. For timed events use datetime format (e.g., "2024-01-15T10:00:00-05:00"). For all-day events use date format (e.g., "2024-01-16", note: end date is exclusive).',
          },
          description: {
            type: "string",
            description: "Optional description or notes for the event.",
          },
          location: {
            type: "string",
            description: "Optional location for the event.",
          },
          attendees: {
            type: "array",
            items: { type: "string" },
            description: "Optional list of email addresses to invite as attendees.",
          },
        },
        required: ["summary", "start", "end"],
      },
    },
    executor: async (args: Record<string, unknown>): Promise<CalendarEvent | string> => {
      // Try to get existing token first
      let token = getAccessToken();

      // If no token, request calendar access
      if (!token) {
        try {
          token = await requestCalendarAccess();
        } catch {
          return "Error: Failed to get calendar access. Please grant permissions when prompted.";
        }
      }

      if (!token) {
        return "Error: No Google Calendar access token available. Please connect your Google account.";
      }

      const typedArgs: CreateEventArgs = {
        summary: args.summary as string,
        start: args.start as string,
        end: args.end as string,
        description: args.description as string | undefined,
        location: args.location as string | undefined,
        attendees: args.attendees as string[] | undefined,
      };

      return createCalendarEvent(token, typedArgs);
    },
  };
}

/**
 * Creates the Google Calendar update event tool with access to the token getter.
 * The token getter is captured in a closure so the executor can access it.
 */
export function createGoogleCalendarUpdateEventTool(
  getAccessToken: () => string | null,
  requestCalendarAccess: () => Promise<string>
): ToolConfig {
  return {
    type: "function",
    function: {
      name: "google_calendar_update_event",
      description:
        "Updates an existing event in the user's Google Calendar. Only the fields provided will be updated; other fields remain unchanged. Use google_calendar_list_events first to get the event ID.",
      parameters: {
        type: "object",
        properties: {
          eventId: {
            type: "string",
            description:
              "The ID of the event to update (obtained from google_calendar_list_events).",
          },
          summary: {
            type: "string",
            description: "The new title/name of the event.",
          },
          start: {
            type: "string",
            description:
              'New start time in ISO 8601 format. For timed events use datetime format (e.g., "2024-01-15T09:00:00-05:00"). For all-day events use date format (e.g., "2024-01-15").',
          },
          end: {
            type: "string",
            description:
              'New end time in ISO 8601 format. For timed events use datetime format (e.g., "2024-01-15T10:00:00-05:00"). For all-day events use date format (e.g., "2024-01-16").',
          },
          description: {
            type: "string",
            description: "New description or notes for the event.",
          },
          location: {
            type: "string",
            description: "New location for the event.",
          },
          attendees: {
            type: "array",
            items: { type: "string" },
            description:
              "New list of email addresses to invite as attendees (replaces existing attendees).",
          },
        },
        required: ["eventId"],
      },
    },
    executor: async (args: Record<string, unknown>): Promise<CalendarEvent | string> => {
      // Try to get existing token first
      let token = getAccessToken();

      // If no token, request calendar access
      if (!token) {
        try {
          token = await requestCalendarAccess();
        } catch {
          return "Error: Failed to get calendar access. Please grant permissions when prompted.";
        }
      }

      if (!token) {
        return "Error: No Google Calendar access token available. Please connect your Google account.";
      }

      const typedArgs: UpdateEventArgs = {
        eventId: args.eventId as string,
        summary: args.summary as string | undefined,
        start: args.start as string | undefined,
        end: args.end as string | undefined,
        description: args.description as string | undefined,
        location: args.location as string | undefined,
        attendees: args.attendees as string[] | undefined,
      };

      return updateCalendarEvent(token, typedArgs);
    },
  };
}

/**
 * Creates all chat tools with the provided token context.
 * This factory function allows tools to access authentication tokens via closures.
 */
export function createChatTools(
  getAccessToken: () => string | null,
  requestCalendarAccess: () => Promise<string>
): ToolConfig[] {
  return [
    createGoogleCalendarTool(getAccessToken, requestCalendarAccess),
    createGoogleCalendarCreateEventTool(getAccessToken, requestCalendarAccess),
    createGoogleCalendarUpdateEventTool(getAccessToken, requestCalendarAccess),
  ];
}
