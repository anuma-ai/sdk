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
 *   model: "fireworks/accounts/fireworks/models/kimi-k2p5",
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
export type { CreateWeatherToolOptions, DisplayWeatherResult, ForecastDay } from "./weather";
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

// Gmail exports
export type {
  GmailGetMessageArgs,
  GmailMessageDetail,
  GmailMessageSummary,
  GmailRequestAccess,
  GmailSearchArgs,
  GmailSendMessageArgs,
  GmailTokenGetter,
} from "./gmail";
export { connectorMintErrorToToolResult, createGmailTools } from "./gmail";

// Connector vault primitives
export type {
  ConnectorErrorCode,
  ConnectorMintError,
  ConnectorMintResult,
  ConnectorTokenGetterOpts,
  ConnectorTokenSource,
} from "../lib/connectors";
export {
  buildConnectorErrorResult,
  CONNECTOR_ERROR_MARKER,
  createConnectorTokenGetter,
} from "../lib/connectors";

// App generation tools
export type {
  AuditIssue,
  AuditIssueType,
  AuditResult,
  AuditSeverity,
  AuditTokens,
} from "./appAudit";
export { auditDesign } from "./appAudit";
export type { AppCompleteBridge, AppCompleteBridgeOptions } from "./appCompleteBridge";
export {
  APP_COMPLETE_CONNECT_ACK_TYPE,
  APP_COMPLETE_CONNECT_TYPE,
  APP_COMPLETE_DEFAULT_TIMEOUT_MS,
  APP_COMPLETE_IFRAME_SHIM_SCRIPT,
  APP_COMPLETE_REQUEST_TYPE,
  APP_COMPLETE_RESPONSE_TYPE,
  createAppCompleteBridge,
  installAppCompleteIframeShim,
} from "./appCompleteBridge";
export type { ExportAppOptions } from "./appExport";
export {
  APP_COMPLETE_STUB_SCRIPT,
  APP_PREVIEW_BASELINE_CSS,
  exportAppToHtml,
  RUNTIME_ERROR_OVERLAY_SCRIPT,
} from "./appExport";
export type {
  AnchorMatch,
  AppFileRecord,
  AppFileStorage,
  CreateAppGenerationToolsOptions,
  FileChangeEvent,
  FileSnippet,
  PatchFailure,
  PatchFailureReason,
  VerifyAppResult,
} from "./appGeneration";
export {
  APP_BUILDER_PROMPT,
  APP_FILE_TOOL_NAMES,
  applyPatches,
  AUDIT_DESIGN_SCHEMA,
  buildAppFileManifest,
  buildAppSystemPrompt,
  CREATE_FILE_SCHEMA,
  createAppGenerationTools,
  CRITIQUE_DESIGN_SCHEMA,
  DEFAULT_DESIGN_CRITIQUE_RUBRIC,
  DEFAULT_MAX_CONVERSATIONS,
  DELETE_FILE_SCHEMA,
  LIST_FILES_SCHEMA,
  MapFileStorage,
  normalizePath,
  PATCH_FILE_SCHEMA,
  READ_FILE_SCHEMA,
  truncateContent,
  VERIFY_APP_SCHEMA,
} from "./appGeneration";

// Slide deck tools — now Anuma-JSX-AST native
export type {
  AnumaChild,
  AnumaNode,
  AttrValue,
  BuildSlideSystemPromptOptions,
  CreateSlideToolsOptions,
  FontCategory,
  FontPreset,
  FontSpec,
  KnownTag,
  LayoutMode,
  LegacyDeckJson,
  SlideToolSet,
  ThemeAttr,
} from "./slides";
export {
  ADD_SLIDE_SCHEMA,
  AnumaJsxError,
  buildFontsUrl,
  buildSlideSystemPrompt,
  convertLegacyDeckJson,
  createSlideTools,
  findById,
  findParentOfId,
  FONT_LIBRARY,
  FONT_PRESETS,
  getFontByName,
  getId,
  getNumberAttr,
  getStringAttr,
  insertAfterId,
  insertChild,
  isAnumaTag,
  isHtmlTag,
  isKnownFont,
  isLegacyDeckJson,
  LAYOUT_MODES,
  parseJsx,
  PATCH_SLIDES_SCHEMA,
  PLAN_DECK_SCHEMA,
  READ_SLIDES_SCHEMA,
  removeById,
  replaceById,
  serializeJsx,
  SLIDE_CANVAS_HEIGHT,
  SLIDE_CANVAS_WIDTH,
  SLIDES_FILE_PATH,
  THEME_ATTRS,
  updateAttrs,
  walk,
} from "./slides";

// Document generation tools (react-pdf DSL → vector PDF)
export type {
  CreateDocumentToolsOptions,
  DocAttrValue,
  DocChild,
  DocNode,
  PdfTag,
} from "./document";
export {
  buildDocumentSystemPrompt,
  CREATE_DOCUMENT_SCHEMA,
  createDocumentTools,
  DEFAULT_DOCUMENT_ID,
  DEFAULT_MAX_DOCUMENT_CONVERSATIONS,
  DocDslError,
  DOCUMENT_BUILDER_PROMPT,
  DOCUMENT_TOOL_NAMES,
  documentPath,
  isPdfTag,
  parseDocumentDsl,
  PATCH_DOCUMENT_SCHEMA,
  pdfStyleKeys,
  pdfTags,
  READ_DOCUMENT_SCHEMA,
} from "./document";
