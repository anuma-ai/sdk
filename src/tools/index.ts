/**
 * The `@reverbia/sdk/tools` package provides AI tool configurations for
 * integrating with external services like Google Calendar and Google Drive.
 *
 * These tools enable your AI to interact with user data on their behalf,
 * with proper authentication and permission handling.
 *
 * ## Overview
 *
 * Tools follow a factory pattern where you provide authentication callbacks,
 * and they return fully-configured tool objects that can be used with the
 * chat API.
 *
 * ## Google Calendar Tools
 *
 * ```typescript
 * import { createChatTools } from "@reverbia/sdk/tools";
 * import { useGoogleDriveAuth } from "@reverbia/sdk/react";
 *
 * const { getAccessToken, requestAccess } = useGoogleDriveAuth();
 *
 * const calendarTools = createChatTools(
 *   () => getAccessToken('calendar'),
 *   () => requestAccess('calendar')
 * );
 *
 * // Use with chat
 * await sendMessage({
 *   messages: [...],
 *   model: "gpt-4o-mini",
 *   tools: calendarTools,
 * });
 * ```
 *
 * ## Google Drive Tools
 *
 * ```typescript
 * import { createDriveTools } from "@reverbia/sdk/tools";
 *
 * const driveTools = createDriveTools(
 *   () => getAccessToken('drive'),
 *   () => requestAccess('drive')
 * );
 * ```
 *
 * @module tools
 */

// Google Calendar exports
export {
  createGoogleCalendarTool,
  createGoogleCalendarCreateEventTool,
  createGoogleCalendarUpdateEventTool,
  createChatTools,
} from "./googleCalendar";
export type {
  ToolConfig,
  ListEventsArgs,
  CreateEventArgs,
  UpdateEventArgs,
  CalendarEvent,
} from "./googleCalendar";

// UI Interaction tool factories
export {
  createInteractiveTool,
  createDisplayTool,
} from "./uiInteraction";
export type {
  UIInteractionContext,
  CreateUIToolsOptions,
  InteractiveToolConfig,
  DisplayToolConfig,
} from "./uiInteraction";

// Google Drive exports
export {
  createGoogleDriveSearchTool,
  createGoogleDriveListRecentTool,
  createGoogleDriveGetContentTool,
  createDriveTools,
} from "./googleDrive";
export type {
  SearchFilesArgs,
  DriveFile,
  ListRecentFilesArgs,
  GetFileContentArgs,
} from "./googleDrive";
