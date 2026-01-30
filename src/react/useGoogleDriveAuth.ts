"use client";

import {
  createContext,
  createElement,
  type JSX,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import type { Client } from "../client/client";
import {
  clearGoogleDriveToken,
  getGoogleDriveAccessToken,
  getGoogleDriveStoredToken,
  handleGoogleDriveCallback,
  hasGoogleDriveCredentials,
  isGoogleDriveCallback,
  revokeGoogleDriveToken,
  startGoogleDriveAuth,
} from "../lib/backup/google/auth";
import { migrateUnencryptedTokens } from "../lib/backup/oauth/storage";

/**
 * Props for GoogleDriveAuthProvider
 */
export interface GoogleDriveAuthProviderProps {
  /** Google OAuth Client ID (from Google Cloud Console) */
  clientId: string | undefined;
  /** OAuth callback path (default: "/auth/google/callback") */
  callbackPath?: string;
  /**
   * API client for backend OAuth requests. Optional - uses the default SDK client if not provided.
   * Only needed if you have a custom client configuration (e.g., different baseUrl).
   */
  apiClient?: Client;
  /**
   * Wallet address for encrypting OAuth tokens at rest.
   * If provided, tokens will be encrypted before storing in localStorage.
   * If omitted, tokens are stored temporarily in sessionStorage (cleared on page close).
   */
  walletAddress?: string;
  /** Children to render */
  children: ReactNode;
}

/**
 * Context value for Google Drive authentication
 */
export interface GoogleDriveAuthContextValue {
  /** Current access token (null if not authenticated) */
  accessToken: string | null;
  /** Whether user has authenticated with Google Drive */
  isAuthenticated: boolean;
  /** Whether Google Drive is configured (client ID exists) */
  isConfigured: boolean;
  /** Request Google Drive access - returns token or redirects to OAuth */
  requestAccess: () => Promise<string>;
  /** Clear stored token and log out */
  logout: () => Promise<void>;
  /** Refresh the access token using the refresh token */
  refreshToken: () => Promise<string | null>;
}

const GoogleDriveAuthContext =
  createContext<GoogleDriveAuthContextValue | null>(null);

/**
 * Provider component for Google Drive OAuth authentication.
 *
 * Wrap your app with this provider to enable Google Drive authentication.
 * It handles the OAuth 2.0 Authorization Code flow with refresh tokens.
 *
 * @example
 * ```tsx
 * import { GoogleDriveAuthProvider } from "@reverbia/sdk/react";
 *
 * function App() {
 *   return (
 *     <GoogleDriveAuthProvider
 *       clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID}
 *       callbackPath="/auth/google/callback"
 *     >
 *       <MyApp />
 *     </GoogleDriveAuthProvider>
 *   );
 * }
 * ```
 *
 */
export function GoogleDriveAuthProvider({
  clientId,
  callbackPath = "/auth/google/callback",
  apiClient,
  walletAddress,
  children,
}: GoogleDriveAuthProviderProps): JSX.Element {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const isConfigured = !!clientId;

  // Check for stored token on mount and migrate unencrypted tokens
  useEffect(() => {
    const checkStoredToken = async () => {
      // Migrate unencrypted tokens if wallet address is available
      if (walletAddress) {
        await migrateUnencryptedTokens("google-drive", walletAddress);
      }

      // First check if we have valid stored credentials
      if (await hasGoogleDriveCredentials(walletAddress)) {
        // Try to get a valid access token (will refresh if expired)
        const token = await getGoogleDriveAccessToken(apiClient, walletAddress);
        if (token) {
          setAccessToken(token);
        }
      }
    };
    checkStoredToken();
  }, [apiClient, walletAddress]);

  // Handle OAuth callback
  useEffect(() => {
    if (!isConfigured) return;

    const handleCallback = async () => {
      if (isGoogleDriveCallback()) {
        const result = await handleGoogleDriveCallback(
          callbackPath,
          apiClient,
          walletAddress
        );
        if (result.ok) {
          setAccessToken(result.data);
        } else {
          console.error(
            `Google Drive OAuth failed: ${result.error.code} - ${result.error.message}`
          );
        }
      }
    };

    handleCallback();
  }, [callbackPath, isConfigured, apiClient, walletAddress]);

  const refreshTokenFn = useCallback(async (): Promise<string | null> => {
    const token = await getGoogleDriveAccessToken(apiClient, walletAddress);
    if (token) {
      setAccessToken(token);
    }
    return token;
  }, [apiClient, walletAddress]);

  const requestAccess = useCallback(async (): Promise<string> => {
    if (!isConfigured || !clientId) {
      throw new Error("Google Drive is not configured");
    }

    // If we already have a token, return it
    if (accessToken) {
      return accessToken;
    }

    // Try to get a valid token (will refresh if expired)
    const storedToken = await getGoogleDriveAccessToken(
      apiClient,
      walletAddress
    );
    if (storedToken) {
      setAccessToken(storedToken);
      return storedToken;
    }

    // Start OAuth flow (this will redirect)
    return startGoogleDriveAuth(clientId, callbackPath);
  }, [
    accessToken,
    clientId,
    callbackPath,
    isConfigured,
    apiClient,
    walletAddress,
  ]);

  const logout = useCallback(async () => {
    await revokeGoogleDriveToken(apiClient, walletAddress);
    setAccessToken(null);
  }, [apiClient, walletAddress]);

  return createElement(
    GoogleDriveAuthContext.Provider,
    {
      value: {
        accessToken,
        isAuthenticated: !!accessToken,
        isConfigured,
        requestAccess,
        logout,
        refreshToken: refreshTokenFn,
      },
    },
    children
  );
}

/**
 * Hook to access Google Drive authentication state and methods.
 *
 * Must be used within a GoogleDriveAuthProvider.
 *
 * @example
 * ```tsx
 * import { useGoogleDriveAuth } from "@reverbia/sdk/react";
 *
 * function GoogleDriveButton() {
 *   const { isAuthenticated, isConfigured, requestAccess, logout } = useGoogleDriveAuth();
 *
 *   if (!isConfigured) {
 *     return <p>Google Drive not configured</p>;
 *   }
 *
 *   if (isAuthenticated) {
 *     return <button onClick={logout}>Disconnect Google Drive</button>;
 *   }
 *
 *   return <button onClick={requestAccess}>Connect Google Drive</button>;
 * }
 * ```
 *
 * @category Hooks
 */
export function useGoogleDriveAuth(): GoogleDriveAuthContextValue {
  const context = useContext(GoogleDriveAuthContext);
  if (!context) {
    throw new Error(
      "useGoogleDriveAuth must be used within GoogleDriveAuthProvider"
    );
  }
  return context;
}

// Re-export utility functions for direct use
export {
  getGoogleDriveStoredToken,
  clearGoogleDriveToken,
  hasGoogleDriveCredentials,
} from "../lib/backup/google/auth";
