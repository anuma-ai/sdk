/**
 * The `@anuma/sdk/tools` package provides AI tool configurations for
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
 * import { createChatTools } from "@anuma/sdk/tools";
 * import { useGoogleDriveAuth } from "@anuma/sdk/react";
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
 * import { createDriveTools } from "@anuma/sdk/tools";
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
 * import { createNotionTools } from "@anuma/sdk/tools";
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
export type { ToolConfig } from "../lib/chat/useChat/types.js";
export type { ToolExecutionErrorType, ToolExecutionResult } from "../lib/chat/useChat/utils.js";
export type {
  CalendarEvent,
  CreateEventArgs,
  ListEventsArgs,
  UpdateEventArgs,
} from "./googleCalendar";
export {
  createChatTools,
  createGoogleCalendarCreateEventTool,
  createGoogleCalendarTool,
  createGoogleCalendarUpdateEventTool,
} from "./googleCalendar";

// UI Interaction tool factories
export type {
  CreateUIToolsOptions,
  DisplayToolConfig,
  DisplayToolMigrations,
  InteractiveToolConfig,
  UIInteractionContext,
} from "./uiInteraction";
export { createDisplayTool, createInteractiveTool, migrateDisplayResult } from "./uiInteraction";

// Chart display tool
export type { ChartDataPoint, DisplayChartResult } from "./chart";
export { createChartTool } from "./chart";
export type { DisplayPhoneCallOfferResult } from "./phoneCallOffer";
export { createPhoneCallOfferTool } from "./phoneCallOffer";

// Choice interaction tool
export type { ChoiceOption } from "./choice";
export { createChoiceTool } from "./choice";

// Form interaction tool
export type { FormField, FormFieldOption, FormFieldType } from "./form";
export { createFormTool } from "./form";

// Weather display tool
export type { DisplayWeatherResult, ForecastDay } from "./weather";
export { createWeatherTool } from "./weather";

// Google Drive exports
export type {
  DriveFile,
  GetFileContentArgs,
  ListRecentFilesArgs,
  SearchFilesArgs,
} from "./googleDrive";
export {
  createDriveTools,
  createGoogleDriveGetContentTool,
  createGoogleDriveListRecentTool,
  createGoogleDriveSearchTool,
} from "./googleDrive";

// Notion MCP exports
export type {
  NotionCreatePagesArgs,
  NotionFetchArgs,
  NotionMovePagesArgs,
  NotionSearchArgs,
  NotionUpdatePageArgs,
} from "./notion";
export {
  callNotionMCPTool,
  createNotionCreateCommentTool,
  createNotionCreateDatabaseTool,
  createNotionCreatePagesTool,
  createNotionDuplicatePageTool,
  createNotionFetchTool,
  createNotionGetCommentsTool,
  createNotionGetTeamsTool,
  createNotionGetUsersTool,
  createNotionMovePagesTool,
  createNotionSearchTool,
  createNotionTools,
  createNotionUpdateDataSourceTool,
  createNotionUpdatePageTool,
  getMCPEndpoints,
} from "./notion";

// GitHub exports
export { createGitHubTools } from "./github";

// App generation tools
export type {
  AppFileRecord,
  AppFileStorage,
  CreateAppGenerationToolsOptions,
} from "./appGeneration";
export {
  applyPatches,
  buildAppSystemPrompt,
  CREATE_FILE_SCHEMA,
  createAppGenerationTools,
  DELETE_FILE_SCHEMA,
  DISPLAY_APP_SCHEMA,
  LIST_FILES_SCHEMA,
  normalizePath,
  PATCH_FILE_SCHEMA,
  READ_FILE_SCHEMA,
  truncateContent,
} from "./appGeneration";

// Subscription analysis tools
export type {
  AnalyzeSubscriptionsResult,
  CategoryTotal,
  FlagSubscriptionsResult,
  NormalizedSubscription,
  SubscriptionCategory,
  SubscriptionFlag,
  SubscriptionFlagType,
  SubscriptionFrequency,
  SubscriptionItem,
} from "./subscriptionAnalysis";
export {
  ANALYZE_SUBSCRIPTIONS_SCHEMA,
  createSubscriptionAnalysisTools,
  FLAG_SUBSCRIPTIONS_SCHEMA,
  SUBSCRIPTION_CATEGORIES,
  SUBSCRIPTION_FLAG_TYPES,
  SUBSCRIPTION_FREQUENCIES,
} from "./subscriptionAnalysis";
