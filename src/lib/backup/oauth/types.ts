/**
 * OAuth callback error types
 */
export type OAuthCallbackErrorType =
  | "oauth_error" // Error returned by OAuth provider (e.g., access_denied)
  | "csrf_mismatch" // State parameter doesn't match stored state
  | "missing_params" // Required parameters (code, state) are missing
  | "exchange_failed"; // Token exchange failed

/**
 * OAuth callback error with structured information
 */
export interface OAuthCallbackError {
  /** Error type for programmatic handling */
  type: OAuthCallbackErrorType;
  /** Human-readable error message */
  message: string;
  /** Additional error description from OAuth provider */
  description?: string;
}

/**
 * Result of OAuth callback handling
 */
export type OAuthCallbackResult =
  | { success: true; accessToken: string }
  | { success: false; error: OAuthCallbackError };

/**
 * Status of OAuth callback processing
 */
export type OAuthCallbackStatus = "idle" | "processing" | "success" | "error";
