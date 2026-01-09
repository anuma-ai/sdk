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
  configureCloudKit,
  type CloudKitConfig,
  DEFAULT_CONTAINER_ID,
  isCloudKitAvailable,
  loadCloudKit,
  requestICloudSignIn,
} from "../lib/backup/icloud/api";

/**
 * Props for ICloudAuthProvider
 */
export interface ICloudAuthProviderProps {
  /** CloudKit API token (from Apple Developer Console) */
  apiToken: string;
  /** CloudKit container identifier (default: "iCloud.Memoryless") */
  containerIdentifier?: string;
  /** CloudKit environment (default: "production") */
  environment?: "development" | "production";
  /** Children to render */
  children: ReactNode;
}

/**
 * Context value for iCloud authentication
 */
export interface ICloudAuthContextValue {
  /** Whether user is authenticated with iCloud */
  isAuthenticated: boolean;
  /** Whether iCloud is configured and available */
  isConfigured: boolean;
  /** Whether CloudKit JS is loaded */
  isAvailable: boolean;
  /** User record name (unique identifier) */
  userRecordName: string | null;
  /** Request access - triggers iCloud sign-in if needed */
  requestAccess: () => Promise<void>;
  /** Sign out from iCloud */
  logout: () => void;
}

const ICloudAuthContext = createContext<ICloudAuthContextValue | null>(null);

/**
 * Provider component for iCloud authentication.
 *
 * Wrap your app with this provider to enable iCloud authentication.
 * CloudKit JS is loaded automatically when needed.
 *
 * @example
 * ```tsx
 * import { ICloudAuthProvider } from "@reverbia/sdk/react";
 *
 * function App() {
 *   return (
 *     <ICloudAuthProvider
 *       apiToken={process.env.NEXT_PUBLIC_CLOUDKIT_API_TOKEN!}
 *       containerIdentifier="iCloud.Memoryless"
 *       environment="production"
 *     >
 *       <MyApp />
 *     </ICloudAuthProvider>
 *   );
 * }
 * ```
 *
 * @category Components
 * @category Backup
 */
export function ICloudAuthProvider({
  apiToken,
  containerIdentifier = DEFAULT_CONTAINER_ID,
  environment = "production",
  children,
}: ICloudAuthProviderProps): JSX.Element {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRecordName, setUserRecordName] = useState<string | null>(null);
  const [isAvailable, setIsAvailable] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Initialize CloudKit on mount - load dynamically
  useEffect(() => {
    if (!apiToken || typeof window === "undefined") {
      return;
    }

    const initCloudKit = async () => {
      setIsLoading(true);
      try {
        // Load CloudKit JS dynamically
        await loadCloudKit();
        setIsAvailable(true);

        // Configure CloudKit
        const config: CloudKitConfig = {
          containerIdentifier,
          apiToken,
          environment,
        };
        await configureCloudKit(config);
        setIsConfigured(true);

        // Check for existing authentication
        try {
          const userIdentity = await authenticateICloud();
          if (userIdentity) {
            setIsAuthenticated(true);
            setUserRecordName(userIdentity.userRecordName);
          }
        } catch {
          // User not signed in
        }
      } catch {
        setIsAvailable(false);
        setIsConfigured(false);
      } finally {
        setIsLoading(false);
      }
    };

    initCloudKit();
  }, [apiToken, containerIdentifier, environment]);

  const requestAccess = useCallback(async (): Promise<void> => {
    if (!isConfigured) {
      throw new Error("iCloud is not configured");
    }

    if (isAuthenticated) {
      return;
    }

    try {
      // Request sign-in - this will check for existing session first,
      // then programmatically trigger the Apple sign-in popup if needed
      const userIdentity = await requestICloudSignIn();
      setIsAuthenticated(true);
      setUserRecordName(userIdentity.userRecordName);
    } catch (err) {
      throw new Error(
        err instanceof Error ? err.message : "Failed to sign in to iCloud"
      );
    }
  }, [isAuthenticated, isConfigured]);

  const logout = useCallback(() => {
    setIsAuthenticated(false);
    setUserRecordName(null);
    // Note: CloudKit JS doesn't have a programmatic sign-out
    // Users sign out through Apple ID settings
  }, []);

  return createElement(
    ICloudAuthContext.Provider,
    {
      value: {
        isAuthenticated,
        isConfigured,
        isAvailable,
        userRecordName,
        requestAccess,
        logout,
      },
    },
    children
  );
}

/**
 * Hook to access iCloud authentication state and methods.
 *
 * Must be used within an ICloudAuthProvider.
 *
 * @example
 * ```tsx
 * import { useICloudAuth } from "@reverbia/sdk/react";
 *
 * function ICloudStatus() {
 *   const { isAuthenticated, isAvailable, requestAccess, logout } = useICloudAuth();
 *
 *   if (!isAvailable) {
 *     return <p>iCloud is not available. Please load CloudKit JS.</p>;
 *   }
 *
 *   return (
 *     <div>
 *       {isAuthenticated ? (
 *         <>
 *           <span>Connected to iCloud</span>
 *           <button onClick={logout}>Disconnect</button>
 *         </>
 *       ) : (
 *         <button onClick={requestAccess}>Connect to iCloud</button>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 *
 * @category Hooks
 */
export function useICloudAuth(): ICloudAuthContextValue {
  const context = useContext(ICloudAuthContext);
  if (!context) {
    throw new Error("useICloudAuth must be used within ICloudAuthProvider");
  }
  return context;
}

/**
 * Check if iCloud is configured (has API token)
 */
export function hasICloudCredentials(): boolean {
  return isCloudKitAvailable();
}

/**
 * Clear iCloud authentication state
 * Note: This only clears local state; user remains signed in to iCloud
 */
export function clearICloudAuth(): void {
  // CloudKit JS doesn't provide programmatic sign-out
  // This is handled by the provider's logout method
}
