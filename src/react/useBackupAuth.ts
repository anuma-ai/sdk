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
  authenticateICloud,
  type CloudKitConfig,
  configureCloudKit,
  DEFAULT_CONTAINER_ID,
  loadCloudKit,
  requestICloudSignIn,
} from "../lib/backup/icloud/api";

/**
 * Props for BackupAuthProvider
 */
export interface BackupAuthProviderProps {
  /** CloudKit API token (from Apple Developer Console). Optional - omit to disable iCloud. */
  icloudApiToken?: string;
  /** CloudKit container identifier (default: "iCloud.Memoryless") */
  icloudContainerIdentifier?: string;
  /** CloudKit environment (default: "production") */
  icloudEnvironment?: "development" | "production";
  /** @deprecated This prop is ignored. */
  walletAddress?: string;
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
  /** Request access - triggers iCloud sign-in if needed and returns the user record name */
  requestAccess: () => Promise<string>;
  /** Sign out of iCloud */
  logout: () => Promise<void>;
  /** Re-check the iCloud session and return the user record name */
  refreshToken: () => Promise<string | null>;
}

/**
 * Context value for unified backup authentication
 */
export interface BackupAuthContextValue {
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
 * Provider component for backup authentication.
 *
 * Wrap your app with this provider to enable iCloud backup authentication.
 *
 * @example
 * ```tsx
 * import { BackupAuthProvider } from "@anuma/sdk/react";
 *
 * function App() {
 *   return (
 *     <BackupAuthProvider
 *       icloudApiToken={process.env.NEXT_PUBLIC_CLOUDKIT_API_TOKEN}
 *       icloudContainerIdentifier="iCloud.Memoryless"
 *     >
 *       <MyApp />
 *     </BackupAuthProvider>
 *   );
 * }
 * ```
 *
 */
export function BackupAuthProvider({
  icloudApiToken,
  icloudContainerIdentifier = DEFAULT_CONTAINER_ID,
  icloudEnvironment = "production",
  children,
}: BackupAuthProviderProps): JSX.Element {
  const [icloudAuthenticated, setIcloudAuthenticated] = useState(false);
  const [icloudUserRecordName, setIcloudUserRecordName] = useState<string | null>(null);
  const [isIcloudAvailable, setIsIcloudAvailable] = useState(false);
  const isIcloudConfigured = isIcloudAvailable && !!icloudApiToken;

  useEffect(() => {
    if (!icloudApiToken || typeof window === "undefined") {
      return;
    }

    const initCloudKit = async () => {
      try {
        await loadCloudKit();
        setIsIcloudAvailable(true);

        const config: CloudKitConfig = {
          containerIdentifier: icloudContainerIdentifier,
          apiToken: icloudApiToken,
          environment: icloudEnvironment,
        };
        await configureCloudKit(config);

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
        setIsIcloudAvailable(false);
      }
    };

    void initCloudKit();
  }, [icloudApiToken, icloudContainerIdentifier, icloudEnvironment]);

  const refreshIcloudTokenFn = useCallback(async (): Promise<string | null> => {
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
      const userIdentity = await requestICloudSignIn();
      setIcloudAuthenticated(true);
      setIcloudUserRecordName(userIdentity.userRecordName);
      return userIdentity.userRecordName;
    } catch (err) {
      // eslint-disable-next-line preserve-caught-error -- ES2020 target doesn't support ErrorOptions
      throw new Error(err instanceof Error ? err.message : "Failed to sign in to iCloud");
    }
  }, [icloudAuthenticated, icloudUserRecordName, isIcloudConfigured]);

  // eslint-disable-next-line @typescript-eslint/require-await -- must return Promise<void> per interface
  const logoutIcloud = useCallback(async () => {
    setIcloudAuthenticated(false);
    setIcloudUserRecordName(null);
  }, []);

  const logoutAll = useCallback(async () => {
    if (isIcloudConfigured) await logoutIcloud();
  }, [isIcloudConfigured, logoutIcloud]);

  const icloudState: ProviderAuthState = {
    accessToken: icloudUserRecordName,
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
        icloud: icloudState,
        hasAnyProvider: isIcloudConfigured,
        hasAnyAuthentication: icloudAuthenticated,
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
 * import { useBackupAuth } from "@anuma/sdk/react";
 *
 * function BackupSettings() {
 *   const { icloud, logoutAll } = useBackupAuth();
 *
 *   if (!icloud.isConfigured) return null;
 *
 *   return (
 *     <div>
 *       <span>iCloud: {icloud.isAuthenticated ? 'Connected' : 'Not connected'}</span>
 *       {icloud.isAuthenticated ? (
 *         <button onClick={logoutAll}>Disconnect</button>
 *       ) : (
 *         <button onClick={icloud.requestAccess}>Connect</button>
 *       )}
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
