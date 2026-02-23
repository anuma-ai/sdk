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
  getDropboxAccessToken,
  handleDropboxCallback,
  hasDropboxCredentials,
  isDropboxCallback,
  revokeDropboxToken,
  startDropboxAuth,
} from "../lib/backup/dropbox/auth";
import { migrateUnencryptedTokens } from "../lib/backup/oauth/storage";

/**
 * Props for DropboxAuthProvider
 */
export interface DropboxAuthProviderProps {
  /** Dropbox App Key (from Dropbox Developer Console) */
  appKey: string | undefined;
  /** OAuth callback path (default: "/auth/dropbox/callback") */
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
 * Context value for Dropbox authentication
 */
export interface DropboxAuthContextValue {
  /** Current access token (null if not authenticated) */
  accessToken: string | null;
  /** Whether user has authenticated with Dropbox */
  isAuthenticated: boolean;
  /** Whether Dropbox is configured (app key exists) */
  isConfigured: boolean;
  /** Request Dropbox access - returns token or redirects to OAuth */
  requestAccess: () => Promise<string>;
  /** Clear stored token and log out */
  logout: () => Promise<void>;
  /** Refresh the access token using the refresh token */
  refreshToken: () => Promise<string | null>;
}

const DropboxAuthContext = createContext<DropboxAuthContextValue | null>(null);

/**
 * Provider component for Dropbox OAuth authentication.
 *
 * Wrap your app with this provider to enable Dropbox authentication.
 * It handles the OAuth 2.0 Authorization Code flow with refresh tokens.
 *
 * @example
 * ```tsx
 * import { DropboxAuthProvider } from "@anuma/sdk/react";
 *
 * function App() {
 *   return (
 *     <DropboxAuthProvider
 *       appKey={process.env.NEXT_PUBLIC_DROPBOX_APP_KEY}
 *       callbackPath="/auth/dropbox/callback"
 *     >
 *       <MyApp />
 *     </DropboxAuthProvider>
 *   );
 * }
 * ```
 *
 */
export function DropboxAuthProvider({
  appKey,
  callbackPath = "/auth/dropbox/callback",
  apiClient,
  walletAddress,
  children,
}: DropboxAuthProviderProps): JSX.Element {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const isConfigured = !!appKey;

  // Check for stored token on mount and migrate unencrypted tokens
  useEffect(() => {
    const checkStoredToken = async () => {
      // Migrate unencrypted tokens if wallet address is available
      if (walletAddress) {
        await migrateUnencryptedTokens("dropbox", walletAddress);
      }

      // First check if we have valid stored credentials
      if (await hasDropboxCredentials(walletAddress)) {
        // Try to get a valid access token (will refresh if expired)
        const token = await getDropboxAccessToken(apiClient, walletAddress);
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
      if (isDropboxCallback()) {
        const result = await handleDropboxCallback(callbackPath, apiClient, walletAddress);
        if (result.ok) {
          setAccessToken(result.data);
        } else {
          console.error(`Dropbox OAuth failed: ${result.error.code} - ${result.error.message}`);
        }
      }
    };

    handleCallback();
  }, [callbackPath, isConfigured, apiClient, walletAddress]);

  const refreshTokenFn = useCallback(async (): Promise<string | null> => {
    const token = await getDropboxAccessToken(apiClient, walletAddress);
    if (token) {
      setAccessToken(token);
    }
    return token;
  }, [apiClient, walletAddress]);

  const requestAccess = useCallback(async (): Promise<string> => {
    if (!isConfigured || !appKey) {
      throw new Error("Dropbox is not configured");
    }

    // If we already have a token, return it
    if (accessToken) {
      return accessToken;
    }

    // Try to get a valid token (will refresh if expired)
    const storedToken = await getDropboxAccessToken(apiClient, walletAddress);
    if (storedToken) {
      setAccessToken(storedToken);
      return storedToken;
    }

    // Start OAuth flow (this will redirect)
    return startDropboxAuth(appKey, callbackPath);
  }, [accessToken, appKey, callbackPath, isConfigured, apiClient, walletAddress]);

  const logout = useCallback(async () => {
    await revokeDropboxToken(apiClient, walletAddress);
    setAccessToken(null);
  }, [apiClient, walletAddress]);

  return createElement(
    DropboxAuthContext.Provider,
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
 * Hook to access Dropbox authentication state and methods.
 *
 * Must be used within a DropboxAuthProvider.
 *
 * @example
 * ```tsx
 * import { useDropboxAuth } from "@anuma/sdk/react";
 *
 * function DropboxButton() {
 *   const { isAuthenticated, isConfigured, requestAccess, logout } = useDropboxAuth();
 *
 *   if (!isConfigured) {
 *     return <p>Dropbox not configured</p>;
 *   }
 *
 *   if (isAuthenticated) {
 *     return <button onClick={logout}>Disconnect Dropbox</button>;
 *   }
 *
 *   return <button onClick={requestAccess}>Connect Dropbox</button>;
 * }
 * ```
 *
 * @category Hooks
 */
export function useDropboxAuth(): DropboxAuthContextValue {
  const context = useContext(DropboxAuthContext);
  if (!context) {
    throw new Error("useDropboxAuth must be used within DropboxAuthProvider");
  }
  return context;
}

// Re-export utility functions for direct use
export { clearToken, hasDropboxCredentials } from "../lib/backup/dropbox/auth";
