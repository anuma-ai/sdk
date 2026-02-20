/**
 * Google OAuth Authentication Modules
 *
 * This module provides OAuth 2.0 authentication for Google services
 * with proper scopes for full access to user data.
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
 * const token = await getValidCalendarToken(walletAddress);
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
 * const token = await getValidDriveToken(walletAddress);
 * ```
 *
 * Note: For Drive backup functionality (which only needs access to app-created files),
 * use the backup/google/auth module with drive.file scope instead.
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
  migrateCalendarToken,
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
  migrateDriveToken,
  storeDriveReturnUrl,
  getAndClearDriveReturnUrl,
  storeDrivePendingMessage,
  getAndClearDrivePendingMessage,
} from "./google-drive";
