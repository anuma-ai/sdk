/**
 * The `@reverbia/sdk/tools` package provides AI tool configurations for
 * integrating with external services like Google Calendar, Google Drive, and Notion.
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
 * ## Notion MCP Tools
 *
 * Notion tools use the Model Context Protocol (MCP) to communicate with
 * Notion's hosted MCP server. No direct API calls needed.
 *
 * ```typescript
 * import { createNotionTools } from "@reverbia/sdk/tools";
 *
 * const notionTools = createNotionTools(
 *   () => getNotionAccessToken(walletAddress, clientId),
 *   () => requestNotionAccess()
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
  migrateDisplayResult,
} from "./uiInteraction";
export type {
  UIInteractionContext,
  CreateUIToolsOptions,
  InteractiveToolConfig,
  DisplayToolConfig,
  DisplayToolMigrations,
} from "./uiInteraction";

// Chart display tool
export { createChartTool } from "./chart";
export type { ChartDataPoint, DisplayChartResult } from "./chart";

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

// Notion MCP exports
export {
  createNotionSearchTool,
  createNotionFetchTool,
  createNotionCreatePagesTool,
  createNotionUpdatePageTool,
  createNotionMovePagesTool,
  createNotionDuplicatePageTool,

  createNotionCreateDatabaseTool,
  createNotionUpdateDataSourceTool,
  createNotionCreateCommentTool,
  createNotionGetCommentsTool,
  createNotionGetUsersTool,
  createNotionGetTeamsTool,
  createNotionTools,
  getMCPEndpoints,
  callNotionMCPTool,
} from "./notion";
export type {
  NotionSearchArgs,
  NotionFetchArgs,
  NotionCreatePagesArgs,
  NotionUpdatePageArgs,
  NotionMovePagesArgs,
} from "./notion";
