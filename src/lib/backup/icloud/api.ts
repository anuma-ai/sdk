/**
 * iCloud CloudKit API utilities
 *
 * Uses Apple CloudKit JS for file operations in iCloud Drive.
 * Requires CloudKit container configuration and user authentication.
 *
 * CloudKit JS is loaded dynamically when needed.
 */

/** CloudKit JS CDN URL */
const CLOUDKIT_JS_URL = "https://cdn.apple-cloudkit.com/ck/2/cloudkit.js";

/** Default folder path for iCloud backups */
export const DEFAULT_BACKUP_FOLDER = "conversations";

/** Container identifier for iCloud */
export const DEFAULT_CONTAINER_ID = "iCloud.Memoryless";

/** Record type for conversation backups */
const RECORD_TYPE = "ConversationBackup";

/** Track if CloudKit JS is currently being loaded */
let cloudKitLoadPromise: Promise<void> | null = null;

/** CloudKit configuration interface */
export interface CloudKitConfig {
  containerIdentifier: string;
  apiToken: string;
  environment: "development" | "production";
}

/** iCloud file metadata */
export interface ICloudFile {
  recordName: string;
  filename: string;
  modifiedAt: Date;
  size: number;
  assetDownloadURL?: string;
}

/** CloudKit record structure */
interface CloudKitRecord {
  recordName: string;
  recordType: string;
  fields: {
    filename?: { value: string };
    data?: { value: { downloadURL: string; size: number } };
  };
  modified?: { timestamp: number };
  created?: { timestamp: number };
}

/** CloudKit response structure */
interface CloudKitResponse {
  records?: CloudKitRecord[];
  continuationMarker?: string;
}

declare global {
  interface Window {
    CloudKit?: {
      configure: (config: {
        containers: Array<{
          containerIdentifier: string;
          apiTokenAuth: {
            apiToken: string;
            persist: boolean;
            signInButton?: { id: string; theme?: string };
            signOutButton?: { id: string; theme?: string };
          };
          environment: string;
        }>;
      }) => void;
      getDefaultContainer: () => CloudKitContainer;
    };
  }
}

interface CloudKitContainer {
  containerIdentifier: string;
  setUpAuth: (options?: {
    buttonContainer?: HTMLElement;
    signInButtonId?: string;
    signOutButtonId?: string;
  }) => Promise<CloudKitUserIdentity | null>;
  whenUserSignsIn: () => Promise<CloudKitUserIdentity>;
  whenUserSignsOut: () => Promise<void>;
  privateCloudDatabase: CloudKitDatabase;
}

interface CloudKitUserIdentity {
  userRecordName: string;
  isDiscoverable?: boolean;
}

interface CloudKitDatabase {
  saveRecords: (
    records: CloudKitRecordToSave | CloudKitRecordToSave[],
    options?: { zoneName?: string }
  ) => Promise<CloudKitResponse>;
  deleteRecords: (
    recordNames: { recordName: string }[],
    options?: { zoneName?: string }
  ) => Promise<CloudKitResponse>;
  performQuery: (query: CloudKitQuery) => Promise<CloudKitResponse>;
  fetchRecords: (
    recordNames: Array<{ recordName: string }>,
    options?: { desiredKeys?: string[] }
  ) => Promise<CloudKitResponse>;
}

interface CloudKitRecordToSave {
  recordType: string;
  recordName?: string;
  fields: Record<string, { value: unknown }>;
}

interface CloudKitQuery {
  recordType: string;
  filterBy?: Array<{
    fieldName: string;
    comparator: string;
    fieldValue: { value: unknown };
  }>;
  sortBy?: Array<{ fieldName: string; ascending: boolean }>;
}

/**
 * Check if CloudKit JS is loaded
 */
export function isCloudKitAvailable(): boolean {
  return typeof window !== "undefined" && !!window.CloudKit;
}

/**
 * Load CloudKit JS dynamically
 * Returns a promise that resolves when CloudKit is ready
 */
export async function loadCloudKit(): Promise<void> {
  if (typeof window === "undefined") {
    throw new Error("CloudKit JS can only be loaded in browser environment");
  }

  // Already loaded
  if (window.CloudKit) {
    return;
  }

  // Already loading
  if (cloudKitLoadPromise) {
    return cloudKitLoadPromise;
  }

  // Load the script
  cloudKitLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = CLOUDKIT_JS_URL;
    script.async = true;

    script.onload = () => {
      if (window.CloudKit) {
        resolve();
      } else {
        reject(new Error("CloudKit JS loaded but CloudKit object not found"));
      }
    };

    script.onerror = () => {
      cloudKitLoadPromise = null;
      reject(new Error("Failed to load CloudKit JS"));
    };

    document.head.appendChild(script);
  });

  return cloudKitLoadPromise;
}

/**
 * Ensure CloudKit JS is loaded, loading it if necessary
 */
async function ensureCloudKitLoaded(): Promise<void> {
  if (!isCloudKitAvailable()) {
    await loadCloudKit();
  }
}

/**
 * Configure CloudKit with container credentials
 * Automatically loads CloudKit JS if not already loaded
 */
export async function configureCloudKit(config: CloudKitConfig): Promise<void> {
  await ensureCloudKitLoaded();

  // Ensure DOM elements exist before configuring CloudKit
  // CloudKit needs these elements to render sign-in/sign-out buttons
  ensureAuthElements();

  window.CloudKit!.configure({
    containers: [
      {
        containerIdentifier: config.containerIdentifier,
        apiTokenAuth: {
          apiToken: config.apiToken,
          persist: true,
          signInButton: {
            id: "apple-sign-in-button",
            theme: "black",
          },
          signOutButton: {
            id: "apple-sign-out-button",
            theme: "black",
          },
        },
        environment: config.environment,
      },
    ],
  });
}

/**
 * Get the CloudKit container
 */
async function getContainer(): Promise<CloudKitContainer> {
  await ensureCloudKitLoaded();
  return window.CloudKit!.getDefaultContainer();
}

/**
 * Ensure required DOM elements exist for CloudKit authentication
 * CloudKit JS requires specific elements for its sign-in/sign-out buttons
 */
function ensureAuthElements(): { signIn: HTMLElement; signOut: HTMLElement } {
  let signInButton = document.getElementById("apple-sign-in-button");
  let signOutButton = document.getElementById("apple-sign-out-button");

  if (!signInButton) {
    signInButton = document.createElement("div");
    signInButton.id = "apple-sign-in-button";
    signInButton.style.position = "fixed";
    signInButton.style.top = "-9999px";
    signInButton.style.left = "-9999px";
    document.body.appendChild(signInButton);
  }

  if (!signOutButton) {
    signOutButton = document.createElement("div");
    signOutButton.id = "apple-sign-out-button";
    signOutButton.style.position = "fixed";
    signOutButton.style.top = "-9999px";
    signOutButton.style.left = "-9999px";
    document.body.appendChild(signOutButton);
  }

  return { signIn: signInButton, signOut: signOutButton };
}

/**
 * Authenticate user with iCloud (check existing session)
 * Returns user identity if already authenticated, null otherwise
 * Does NOT trigger sign-in flow - use requestICloudSignIn for that
 */
export async function authenticateICloud(): Promise<CloudKitUserIdentity | null> {
  const container = await getContainer();

  // Ensure DOM elements exist for CloudKit auth
  ensureAuthElements();

  return container.setUpAuth();
}

/**
 * Request user to sign in to iCloud
 * Opens Apple sign-in popup and waits for authentication
 */
export async function requestICloudSignIn(): Promise<CloudKitUserIdentity> {
  const container = await getContainer();

  // Ensure DOM elements exist for CloudKit auth
  const { signIn } = ensureAuthElements();

  // First, set up auth to render the sign-in button
  const existingUser = await container.setUpAuth();
  if (existingUser) {
    return existingUser;
  }

  // Debug: log what CloudKit rendered
  console.log("[CloudKit] Sign-in container innerHTML:", signIn.innerHTML);
  console.log("[CloudKit] Sign-in container children:", signIn.children.length);

  // Find and click the Apple sign-in button that was rendered by setUpAuth
  // CloudKit JS renders an anchor or button inside the container
  const appleButton = signIn.querySelector("a, button, [role='button'], div[id*='apple']");
  console.log("[CloudKit] Found button element:", appleButton);

  if (appleButton) {
    console.log("[CloudKit] Clicking button...");
    appleButton.click();
  } else {
    // Try clicking any clickable element in the container
    const anyClickable = signIn.firstElementChild as HTMLElement | null;
    if (anyClickable) {
      console.log("[CloudKit] Clicking first child element:", anyClickable);
      anyClickable.click();
    }
  }

  // Wait for the user to complete sign-in
  return container.whenUserSignsIn();
}

/**
 * Wait for user to sign in to iCloud
 */
async function waitForICloudSignIn(): Promise<CloudKitUserIdentity> {
  const container = await getContainer();
  return container.whenUserSignsIn();
}

/**
 * Check if user is authenticated with iCloud
 */
async function isICloudAuthenticated(): Promise<boolean> {
  try {
    const userIdentity = await authenticateICloud();
    return userIdentity !== null;
  } catch {
    return false;
  }
}

/**
 * Upload a file to iCloud
 */
export async function uploadFileToICloud(filename: string, content: Blob): Promise<ICloudFile> {
  const container = await getContainer();
  const database = container.privateCloudDatabase;

  // Generate a record name from filename
  const recordName = `backup_${filename.replace(/[^a-zA-Z0-9]/g, "_")}`;

  // For CloudKit assets, we need to upload the file as base64 or use asset uploads
  // CloudKit JS uses a different approach - we'll store data as a base64 string for simplicity
  const arrayBuffer = await content.arrayBuffer();
  const base64Data = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

  const record: CloudKitRecordToSave = {
    recordType: RECORD_TYPE,
    recordName,
    fields: {
      filename: { value: filename },
      data: { value: base64Data },
      size: { value: content.size },
      contentType: { value: content.type || "application/json" },
    },
  };

  const response = await database.saveRecords(record);

  if (!response.records || response.records.length === 0) {
    throw new Error("Failed to upload file to iCloud");
  }

  const savedRecord = response.records[0];

  return {
    recordName: savedRecord.recordName,
    filename,
    modifiedAt: new Date(savedRecord.modified?.timestamp ?? Date.now()),
    size: content.size,
  };
}

/**
 * List all backup files in iCloud
 */
export async function listICloudFiles(): Promise<ICloudFile[]> {
  const container = await getContainer();
  const database = container.privateCloudDatabase;

  const query: CloudKitQuery = {
    recordType: RECORD_TYPE,
    // Note: Sorting requires SORTABLE index on the field in CloudKit Dashboard
    // For now, we skip sorting and sort client-side after fetching
  };

  const allRecords: CloudKitRecord[] = [];
  const response = await database.performQuery(query);

  if (response.records) {
    allRecords.push(...response.records);
  }

  // Handle pagination if needed
  while (response.continuationMarker) {
    // CloudKit JS doesn't have a direct continuation API in performQuery
    // For large datasets, you'd use fetchRecords with zoneWide queries
    break;
  }

  const files = allRecords.map((record) => ({
    recordName: record.recordName,
    filename: record.fields.filename?.value ?? "",
    modifiedAt: new Date(record.modified?.timestamp ?? Date.now()),
    size:
      typeof record.fields.data?.value === "object" && record.fields.data?.value !== null
        ? (record.fields.data.value as { size: number }).size
        : 0,
  }));

  // Sort client-side by modification date (newest first)
  return files.sort((a, b) => b.modifiedAt.getTime() - a.modifiedAt.getTime());
}

/**
 * Download a file from iCloud
 */
export async function downloadICloudFile(recordName: string): Promise<Blob> {
  const container = await getContainer();
  const database = container.privateCloudDatabase;

  const response = await database.fetchRecords([{ recordName }], {
    desiredKeys: ["filename", "data", "contentType"],
  });

  if (!response.records || response.records.length === 0) {
    throw new Error(`File not found: ${recordName}`);
  }

  const record = response.records[0];
  const dataField = record.fields.data?.value;

  if (!dataField) {
    throw new Error("No data in record");
  }

  // If it's a base64 string (our upload format)
  if (typeof dataField === "string") {
    const binaryString = atob(dataField);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return new Blob([bytes], { type: "application/json" });
  }

  // If it's an asset with downloadURL
  if (typeof dataField === "object" && "downloadURL" in dataField) {
    const fetchResponse = await fetch((dataField as { downloadURL: string }).downloadURL);
    if (!fetchResponse.ok) {
      throw new Error(`Failed to download from iCloud: ${fetchResponse.status}`);
    }
    return fetchResponse.blob();
  }

  throw new Error("Unknown data format in iCloud record");
}

/**
 * Find a specific file in iCloud by filename
 */
export async function findICloudFile(filename: string): Promise<ICloudFile | null> {
  const container = await getContainer();
  const database = container.privateCloudDatabase;

  const query: CloudKitQuery = {
    recordType: RECORD_TYPE,
    filterBy: [
      {
        fieldName: "filename",
        comparator: "EQUALS",
        fieldValue: { value: filename },
      },
    ],
  };

  const response = await database.performQuery(query);

  if (!response.records || response.records.length === 0) {
    return null;
  }

  const record = response.records[0];
  return {
    recordName: record.recordName,
    filename: record.fields.filename?.value ?? "",
    modifiedAt: new Date(record.modified?.timestamp ?? Date.now()),
    size:
      typeof record.fields.data?.value === "object" && record.fields.data?.value !== null
        ? (record.fields.data.value as { size: number }).size
        : 0,
  };
}

/**
 * Delete a file from iCloud
 */
async function deleteICloudFile(recordName: string): Promise<void> {
  const container = await getContainer();
  const database = container.privateCloudDatabase;

  await database.deleteRecords([{ recordName }]);
}

/**
 * Get iCloud user record name (unique identifier)
 */
async function getICloudUserRecordName(): Promise<string | null> {
  try {
    const userIdentity = await authenticateICloud();
    return userIdentity?.userRecordName ?? null;
  } catch {
    return null;
  }
}
