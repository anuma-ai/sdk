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

import {
  clearToken,
  getStoredToken,
  handleDropboxCallback,
  requestDropboxAccess,
  storeToken,
} from "../lib/backup/dropbox/auth";

/**
 * Props for DropboxAuthProvider
 */
export interface DropboxAuthProviderProps {
  /** Dropbox App Key (from Dropbox Developer Console) */
  appKey: string | undefined;
  /** OAuth callback path (e.g., "/auth/dropbox/callback") */
  callbackPath?: string;
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
  logout: () => void;
}

const DropboxAuthContext = createContext<DropboxAuthContextValue | null>(null);

/**
 * Provider component for Dropbox OAuth authentication.
 *
 * Wrap your app with this provider to enable Dropbox authentication.
 * It handles the OAuth 2.0 PKCE flow automatically.
 *
 * @example
 * ```tsx
 * import { DropboxAuthProvider } from "@reverbia/sdk/react";
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
 * @category Components
 */
export function DropboxAuthProvider({
  appKey,
  callbackPath = "/auth/dropbox/callback",
  children,
}: DropboxAuthProviderProps): JSX.Element {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const isConfigured = !!appKey;

  // Check for stored token on mount
  useEffect(() => {
    const storedToken = getStoredToken();
    if (storedToken) {
      setAccessToken(storedToken);
    }
  }, []);

  // Handle OAuth callback
  useEffect(() => {
    if (!isConfigured || !appKey) return;

    const handleCallback = async () => {
      const token = await handleDropboxCallback(appKey, callbackPath);
      if (token) {
        setAccessToken(token);
      }
    };

    handleCallback();
  }, [appKey, callbackPath, isConfigured]);

  const requestAccess = useCallback(async (): Promise<string> => {
    if (!isConfigured || !appKey) {
      throw new Error("Dropbox is not configured");
    }

    // If we already have a token, return it
    if (accessToken) {
      return accessToken;
    }

    // Check session storage
    const storedToken = getStoredToken();
    if (storedToken) {
      setAccessToken(storedToken);
      return storedToken;
    }

    // Start OAuth flow (this will redirect)
    return requestDropboxAccess(appKey, callbackPath);
  }, [accessToken, appKey, callbackPath, isConfigured]);

  const logout = useCallback(() => {
    clearToken();
    setAccessToken(null);
  }, []);

  return createElement(
    DropboxAuthContext.Provider,
    {
      value: {
        accessToken,
        isAuthenticated: !!accessToken,
        isConfigured,
        requestAccess,
        logout,
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
 * import { useDropboxAuth } from "@reverbia/sdk/react";
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
export { getStoredToken, storeToken, clearToken } from "../lib/backup/dropbox/auth";
