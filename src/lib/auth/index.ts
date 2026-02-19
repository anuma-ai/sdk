/**
 * OAuth Authentication Modules
 *
 * This module provides OAuth 2.0 authentication for various services:
 * - Google Calendar & Drive (uses backend for token exchange)
 * - Notion MCP (uses PKCE - fully client-side, no backend needed)
 *
 * ## Google Calendar Auth
 *
 * Requests calendar.readonly and calendar.events scopes to:
 * - Read calendar events
 * - Create, update, and delete events
 *
 * ```typescript
 * import {
 *   startCalendarAuth,
 *   handleCalendarCallback,
 *   getValidCalendarToken,
 * } from "@reverbia/sdk/react";
 *
 * // Start OAuth flow
 * await startCalendarAuth(clientId, "/auth/callback");
 *
 * // Handle callback
 * await handleCalendarCallback("/auth/callback");
 *
 * // Get token for API calls
 * const token = getValidCalendarToken();
 * ```
 *
 * ## Google Drive Auth
 *
 * Requests drive.readonly scope to access ALL user files (not just app-created files).
 * Use this when you need to search and read any file in the user's Drive.
 *
 * ```typescript
 * import {
 *   startDriveAuth,
 *   handleDriveCallback,
 *   getValidDriveToken,
 * } from "@reverbia/sdk/react";
 *
 * // Start OAuth flow
 * await startDriveAuth(clientId, "/auth/callback");
 *
 * // Handle callback
 * await handleDriveCallback("/auth/callback");
 *
 * // Get token for API calls
 * const token = getValidDriveToken();
 * ```
 *
 * Note: For Drive backup functionality (which only needs access to app-created files),
 * use the backup/google/auth module with drive.file scope instead.
 *
 * ## Notion MCP Auth
 *
 * Uses PKCE (Proof Key for Code Exchange) for fully client-side OAuth.
 * No backend required - tokens are exchanged directly with Notion.
 * Tokens are encrypted using the wallet-derived encryption key.
 *
 * ```typescript
 * import {
 *   startNotionAuth,
 *   handleNotionCallback,
 *   getNotionAccessToken,
 * } from "@reverbia/sdk/react";
 *
 * // Start OAuth flow (redirects to Notion, uses Dynamic Client Registration)
 * await startNotionAuth("/auth/notion/callback");
 *
 * // Handle callback (exchange code for tokens)
 * await handleNotionCallback("/auth/notion/callback", walletAddress);
 *
 * // Get token for MCP calls
 * const token = await getNotionAccessToken(walletAddress);
 * ```
 */

// Google Calendar Auth
export {
  startCalendarAuth,
  handleCalendarCallback,
  isCalendarCallback,
  getValidCalendarToken,
  getCalendarAccessToken,
  refreshCalendarToken,
  revokeCalendarToken,
  clearCalendarToken,
  storeCalendarToken,
  hasCalendarCredentials,
  storeCalendarReturnUrl,
  getAndClearCalendarReturnUrl,
  storeCalendarPendingMessage,
  getAndClearCalendarPendingMessage,
} from "./google-calendar";

// Google Drive Auth (with drive.readonly scope for full read access)
export {
  startDriveAuth,
  handleDriveCallback,
  isDriveCallback,
  getValidDriveToken,
  getDriveAccessToken,
  refreshDriveToken,
  revokeDriveToken,
  clearDriveToken,
  storeDriveToken,
  hasDriveCredentials,
  storeDriveReturnUrl,
  getAndClearDriveReturnUrl,
  storeDrivePendingMessage,
  getAndClearDrivePendingMessage,
} from "./google-drive";

// Notion MCP Auth (with PKCE - no backend required)
export {
  startNotionAuth,
  handleNotionCallback,
  isNotionCallback,
  getNotionAccessToken,
  getValidNotionToken,
  refreshNotionToken,
  revokeNotionAccess,
  clearNotionToken,
  hasNotionCredentials,
  migrateNotionToken,
  migrateNotionClientRegistration,
  storeNotionReturnUrl,
  getAndClearNotionReturnUrl,
  storeNotionPendingMessage,
  getAndClearNotionPendingMessage,
  getNotionMCPUrl,
} from "./notion";
