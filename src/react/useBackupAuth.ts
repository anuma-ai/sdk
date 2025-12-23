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
  clearToken as clearDropboxToken,
  getDropboxAccessToken,
  handleDropboxCallback,
  hasDropboxCredentials,
  isDropboxCallback,
  revokeDropboxToken,
  startDropboxAuth,
} from "../lib/backup/dropbox/auth";
import {
  clearGoogleDriveToken,
  getGoogleDriveAccessToken,
  handleGoogleDriveCallback,
  hasGoogleDriveCredentials,
  isGoogleDriveCallback,
  revokeGoogleDriveToken,
  startGoogleDriveAuth,
} from "../lib/backup/google/auth";
import {
  authenticateICloud,
  configureCloudKit,
  type CloudKitConfig,
  DEFAULT_CONTAINER_ID,
  loadCloudKit,
  requestICloudSignIn,
} from "../lib/backup/icloud/api";

/**
 * Props for BackupAuthProvider
 *
 * At least one of `dropboxAppKey`, `googleClientId`, or `icloudApiToken` should be provided
 * for the provider to be useful. All are optional to allow using just one backup provider.
 */
export interface BackupAuthProviderProps {
  /** Dropbox App Key (from Dropbox Developer Console). Optional - omit to disable Dropbox. */
  dropboxAppKey?: string;
  /** Dropbox OAuth callback path (default: "/auth/dropbox/callback") */
  dropboxCallbackPath?: string;
  /** Google OAuth Client ID (from Google Cloud Console). Optional - omit to disable Google Drive. */
  googleClientId?: string;
  /** Google OAuth callback path (default: "/auth/google/callback") */
  googleCallbackPath?: string;
  /** CloudKit API token (from Apple Developer Console). Optional - omit to disable iCloud. */
  icloudApiToken?: string;
  /** CloudKit container identifier (default: "iCloud.Memoryless") */
  icloudContainerIdentifier?: string;
  /** CloudKit environment (default: "production") */
  icloudEnvironment?: "development" | "production";
  /**
   * API client for backend OAuth requests. Optional - uses the default SDK client if not provided.
   * Only needed if you have a custom client configuration (e.g., different baseUrl).
   */
  apiClient?: Client;
  /** Children to render */
  children: ReactNode;
}

/**
 * Auth state for a single provider
 */
export interface ProviderAuthState {
  /** Current access token (null if not authenticated) */
  accessToken: string | null;
  /** Whether user has authenticated with this provider */
  isAuthenticated: boolean;
  /** Whether this provider is configured */
  isConfigured: boolean;
  /** Request access - returns token or redirects to OAuth */
  requestAccess: () => Promise<string>;
  /** Clear stored token and log out */
  logout: () => Promise<void>;
  /** Refresh the access token using the refresh token */
  refreshToken: () => Promise<string | null>;
}

/**
 * Context value for unified backup authentication
 */
export interface BackupAuthContextValue {
  /** Dropbox authentication state and methods */
  dropbox: ProviderAuthState;
  /** Google Drive authentication state and methods */
  googleDrive: ProviderAuthState;
  /** iCloud authentication state and methods */
  icloud: ProviderAuthState;
  /** Check if any provider is configured */
  hasAnyProvider: boolean;
  /** Check if any provider is authenticated */
  hasAnyAuthentication: boolean;
  /** Logout from all providers */
  logoutAll: () => Promise<void>;
}

const BackupAuthContext = createContext<BackupAuthContextValue | null>(null);

/**
 * Unified provider component for backup OAuth authentication.
 *
 * Wrap your app with this provider to enable both Dropbox and Google Drive
 * authentication. It handles the OAuth 2.0 Authorization Code flow with
 * refresh tokens for both providers.
 *
 * @example
 * ```tsx
 * import { BackupAuthProvider } from "@reverbia/sdk/react";
 *
 * function App() {
 *   return (
 *     <BackupAuthProvider
 *       dropboxAppKey={process.env.NEXT_PUBLIC_DROPBOX_APP_KEY}
 *       dropboxCallbackPath="/auth/dropbox/callback"
 *       googleClientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID}
 *       googleCallbackPath="/auth/google/callback"
 *       icloudApiToken={process.env.NEXT_PUBLIC_CLOUDKIT_API_TOKEN}
 *       icloudContainerIdentifier="iCloud.Memoryless"
 *       apiClient={apiClient}
 *     >
 *       <MyApp />
 *     </BackupAuthProvider>
 *   );
 * }
 * ```
 *
 * @category Components
 */
export function BackupAuthProvider({
  dropboxAppKey,
  dropboxCallbackPath = "/auth/dropbox/callback",
  googleClientId,
  googleCallbackPath = "/auth/google/callback",
  icloudApiToken,
  icloudContainerIdentifier = DEFAULT_CONTAINER_ID,
  icloudEnvironment = "production",
  apiClient,
  children,
}: BackupAuthProviderProps): JSX.Element {
  // Dropbox state
  const [dropboxToken, setDropboxToken] = useState<string | null>(null);
  const isDropboxConfigured = !!dropboxAppKey;

  // Google Drive state
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const isGoogleConfigured = !!googleClientId;

  // iCloud state
  const [icloudAuthenticated, setIcloudAuthenticated] = useState(false);
  const [icloudUserRecordName, setIcloudUserRecordName] = useState<string | null>(null);
  const [isIcloudAvailable, setIsIcloudAvailable] = useState(false);
  const isIcloudConfigured = isIcloudAvailable && !!icloudApiToken;

  // Check for stored tokens on mount
  useEffect(() => {
    const checkStoredTokens = async () => {
      // Check Dropbox
      if (hasDropboxCredentials()) {
        const token = await getDropboxAccessToken(apiClient);
        if (token) {
          setDropboxToken(token);
        }
      }

      // Check Google Drive
      if (hasGoogleDriveCredentials()) {
        const token = await getGoogleDriveAccessToken(apiClient);
        if (token) {
          setGoogleToken(token);
        }
      }
    };
    checkStoredTokens();
  }, [apiClient]);

  // Initialize iCloud on mount - load dynamically
  useEffect(() => {
    if (!icloudApiToken || typeof window === "undefined") {
      return;
    }

    const initCloudKit = async () => {
      try {
        // Load CloudKit JS dynamically
        await loadCloudKit();
        setIsIcloudAvailable(true);

        // Configure CloudKit
        const config: CloudKitConfig = {
          containerIdentifier: icloudContainerIdentifier,
          apiToken: icloudApiToken,
          environment: icloudEnvironment,
        };
        await configureCloudKit(config);

        // Check for existing authentication
        try {
          const userIdentity = await authenticateICloud();
          if (userIdentity) {
            setIcloudAuthenticated(true);
            setIcloudUserRecordName(userIdentity.userRecordName);
          }
        } catch {
          // User not signed in
        }
      } catch {
        // CloudKit configuration failed
        setIsIcloudAvailable(false);
      }
    };

    initCloudKit();
  }, [icloudApiToken, icloudContainerIdentifier, icloudEnvironment]);

  // Handle Dropbox OAuth callback
  useEffect(() => {
    if (!isDropboxConfigured) return;

    const handleCallback = async () => {
      if (isDropboxCallback()) {
        const token = await handleDropboxCallback(
          dropboxCallbackPath,
          apiClient
        );
        if (token) {
          setDropboxToken(token);
        }
      }
    };

    handleCallback();
  }, [dropboxCallbackPath, isDropboxConfigured, apiClient]);

  // Handle Google OAuth callback
  useEffect(() => {
    if (!isGoogleConfigured) return;

    const handleCallback = async () => {
      if (isGoogleDriveCallback()) {
        const token = await handleGoogleDriveCallback(
          googleCallbackPath,
          apiClient
        );
        if (token) {
          setGoogleToken(token);
        }
      }
    };

    handleCallback();
  }, [googleCallbackPath, isGoogleConfigured, apiClient]);

  // Dropbox methods
  const refreshDropboxTokenFn = useCallback(async (): Promise<string | null> => {
    const token = await getDropboxAccessToken(apiClient);
    if (token) {
      setDropboxToken(token);
    }
    return token;
  }, [apiClient]);

  const requestDropboxAccess = useCallback(async (): Promise<string> => {
    if (!isDropboxConfigured || !dropboxAppKey) {
      throw new Error("Dropbox is not configured");
    }

    // Always try to get a valid token from storage (which handles expiration + refresh)
    // Don't short-circuit with cached state token as it may be expired
    const storedToken = await getDropboxAccessToken(apiClient);
    if (storedToken) {
      setDropboxToken(storedToken); // Update state with potentially refreshed token
      return storedToken;
    }

    // No valid token available - start OAuth flow
    return startDropboxAuth(dropboxAppKey, dropboxCallbackPath);
  }, [dropboxAppKey, dropboxCallbackPath, isDropboxConfigured, apiClient]);

  const logoutDropbox = useCallback(async () => {
    await revokeDropboxToken(apiClient);
    setDropboxToken(null);
  }, [apiClient]);

  // Google Drive methods
  const refreshGoogleTokenFn = useCallback(async (): Promise<string | null> => {
    const token = await getGoogleDriveAccessToken(apiClient);
    if (token) {
      setGoogleToken(token);
    }
    return token;
  }, [apiClient]);

  const requestGoogleAccess = useCallback(async (): Promise<string> => {
    if (!isGoogleConfigured || !googleClientId) {
      throw new Error("Google Drive is not configured");
    }

    // Always try to get a valid token from storage (which handles expiration + refresh)
    // Don't short-circuit with cached state token as it may be expired
    const storedToken = await getGoogleDriveAccessToken(apiClient);
    if (storedToken) {
      setGoogleToken(storedToken); // Update state with potentially refreshed token
      return storedToken;
    }

    // No valid token available - start OAuth flow
    return startGoogleDriveAuth(googleClientId, googleCallbackPath);
  }, [googleClientId, googleCallbackPath, isGoogleConfigured, apiClient]);

  const logoutGoogle = useCallback(async () => {
    await revokeGoogleDriveToken(apiClient);
    setGoogleToken(null);
  }, [apiClient]);

  // iCloud methods
  const refreshIcloudTokenFn = useCallback(async (): Promise<string | null> => {
    // iCloud doesn't use tokens in the same way - just check auth status
    try {
      const userIdentity = await authenticateICloud();
      if (userIdentity) {
        setIcloudAuthenticated(true);
        setIcloudUserRecordName(userIdentity.userRecordName);
        return userIdentity.userRecordName;
      }
    } catch {
      // Not authenticated
    }
    return null;
  }, []);

  const requestIcloudAccess = useCallback(async (): Promise<string> => {
    if (!isIcloudConfigured) {
      throw new Error("iCloud is not configured");
    }

    if (icloudAuthenticated && icloudUserRecordName) {
      return icloudUserRecordName;
    }

    try {
      // Request sign-in - this will check for existing session first,
      // then programmatically trigger the Apple sign-in popup if needed
      const userIdentity = await requestICloudSignIn();
      setIcloudAuthenticated(true);
      setIcloudUserRecordName(userIdentity.userRecordName);
      return userIdentity.userRecordName;
    } catch (err) {
      throw new Error(
        err instanceof Error ? err.message : "Failed to sign in to iCloud"
      );
    }
  }, [icloudAuthenticated, icloudUserRecordName, isIcloudConfigured]);

  const logoutIcloud = useCallback(async () => {
    setIcloudAuthenticated(false);
    setIcloudUserRecordName(null);
    // Note: CloudKit JS doesn't have a programmatic sign-out
    // Users sign out through Apple ID settings
  }, []);

  // Combined methods
  const logoutAll = useCallback(async () => {
    await Promise.all([
      isDropboxConfigured ? logoutDropbox() : Promise.resolve(),
      isGoogleConfigured ? logoutGoogle() : Promise.resolve(),
      isIcloudConfigured ? logoutIcloud() : Promise.resolve(),
    ]);
  }, [isDropboxConfigured, isGoogleConfigured, isIcloudConfigured, logoutDropbox, logoutGoogle, logoutIcloud]);

  const dropboxState: ProviderAuthState = {
    accessToken: dropboxToken,
    isAuthenticated: !!dropboxToken,
    isConfigured: isDropboxConfigured,
    requestAccess: requestDropboxAccess,
    logout: logoutDropbox,
    refreshToken: refreshDropboxTokenFn,
  };

  const googleDriveState: ProviderAuthState = {
    accessToken: googleToken,
    isAuthenticated: !!googleToken,
    isConfigured: isGoogleConfigured,
    requestAccess: requestGoogleAccess,
    logout: logoutGoogle,
    refreshToken: refreshGoogleTokenFn,
  };

  const icloudState: ProviderAuthState = {
    accessToken: icloudUserRecordName, // Use userRecordName as the "token" for iCloud
    isAuthenticated: icloudAuthenticated,
    isConfigured: isIcloudConfigured,
    requestAccess: requestIcloudAccess,
    logout: logoutIcloud,
    refreshToken: refreshIcloudTokenFn,
  };

  return createElement(
    BackupAuthContext.Provider,
    {
      value: {
        dropbox: dropboxState,
        googleDrive: googleDriveState,
        icloud: icloudState,
        hasAnyProvider: isDropboxConfigured || isGoogleConfigured || isIcloudConfigured,
        hasAnyAuthentication: !!dropboxToken || !!googleToken || icloudAuthenticated,
        logoutAll,
      },
    },
    children
  );
}

/**
 * Hook to access unified backup authentication state and methods.
 *
 * Must be used within a BackupAuthProvider.
 *
 * @example
 * ```tsx
 * import { useBackupAuth } from "@reverbia/sdk/react";
 *
 * function BackupSettings() {
 *   const { dropbox, googleDrive, logoutAll } = useBackupAuth();
 *
 *   return (
 *     <div>
 *       <h3>Backup Providers</h3>
 *
 *       {dropbox.isConfigured && (
 *         <div>
 *           <span>Dropbox: {dropbox.isAuthenticated ? 'Connected' : 'Not connected'}</span>
 *           {dropbox.isAuthenticated ? (
 *             <button onClick={dropbox.logout}>Disconnect</button>
 *           ) : (
 *             <button onClick={dropbox.requestAccess}>Connect</button>
 *           )}
 *         </div>
 *       )}
 *
 *       {googleDrive.isConfigured && (
 *         <div>
 *           <span>Google Drive: {googleDrive.isAuthenticated ? 'Connected' : 'Not connected'}</span>
 *           {googleDrive.isAuthenticated ? (
 *             <button onClick={googleDrive.logout}>Disconnect</button>
 *           ) : (
 *             <button onClick={googleDrive.requestAccess}>Connect</button>
 *           )}
 *         </div>
 *       )}
 *
 *       <button onClick={logoutAll}>Disconnect All</button>
 *     </div>
 *   );
 * }
 * ```
 *
 * @category Hooks
 */
export function useBackupAuth(): BackupAuthContextValue {
  const context = useContext(BackupAuthContext);
  if (!context) {
    throw new Error("useBackupAuth must be used within BackupAuthProvider");
  }
  return context;
}

/**
 * Hook to access Dropbox authentication from BackupAuthProvider.
 * Convenience wrapper that returns only Dropbox state.
 *
 * @category Hooks
 */
export function useDropboxAuthFromBackup(): ProviderAuthState {
  const { dropbox } = useBackupAuth();
  return dropbox;
}

/**
 * Hook to access Google Drive authentication from BackupAuthProvider.
 * Convenience wrapper that returns only Google Drive state.
 *
 * @category Hooks
 */
export function useGoogleDriveAuthFromBackup(): ProviderAuthState {
  const { googleDrive } = useBackupAuth();
  return googleDrive;
}

/**
 * Hook to access iCloud authentication from BackupAuthProvider.
 * Convenience wrapper that returns only iCloud state.
 *
 * @category Hooks
 */
export function useICloudAuthFromBackup(): ProviderAuthState {
  const { icloud } = useBackupAuth();
  return icloud;
}
