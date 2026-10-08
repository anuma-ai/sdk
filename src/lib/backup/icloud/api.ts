import { getLogger } from "../../logger";
import { base64ToUint8Array, uint8ArrayToBase64 } from "../../processors/encoding";

const CLOUDKIT_JS_URL = "https://cdn.apple-cloudkit.com/ck/2/cloudkit.js";

/** Default folder path for iCloud backups */
export const DEFAULT_BACKUP_FOLDER = "conversations";

/** Container identifier for iCloud */
export const DEFAULT_CONTAINER_ID = "iCloud.Memoryless";

const RECORD_TYPE = "ConversationBackup";

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

  if (window.CloudKit) {
    return;
  }

  if (cloudKitLoadPromise) {
    return cloudKitLoadPromise;
  }

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

async function getContainer(): Promise<CloudKitContainer> {
  await ensureCloudKitLoaded();
  return window.CloudKit!.getDefaultContainer();
}

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

  ensureAuthElements();

  return container.setUpAuth();
}

/**
 * Request user to sign in to iCloud
 * Opens Apple sign-in popup and waits for authentication
 */
export async function requestICloudSignIn(): Promise<CloudKitUserIdentity> {
  const container = await getContainer();

  const { signIn } = ensureAuthElements();

  const existingUser = await container.setUpAuth();
  if (existingUser) {
    return existingUser;
  }

  getLogger().debug("[CloudKit] Sign-in container innerHTML:", signIn.innerHTML);
  getLogger().debug("[CloudKit] Sign-in container children:", signIn.children.length);

  const appleButton = signIn.querySelector<HTMLElement>(
    "a, button, [role='button'], div[id*='apple']"
  );
  getLogger().debug("[CloudKit] Found button element:", appleButton);

  if (appleButton) {
    getLogger().debug("[CloudKit] Clicking button...");
    appleButton.click();
  } else {
    const anyClickable = signIn.firstElementChild as HTMLElement | null;
    if (anyClickable) {
      getLogger().debug("[CloudKit] Clicking first child element:", anyClickable);
      anyClickable.click();
    }
  }

  return container.whenUserSignsIn();
}

/**
 * Upload a file to iCloud
 */
export async function uploadFileToICloud(filename: string, content: Blob): Promise<ICloudFile> {
  const container = await getContainer();
  const database = container.privateCloudDatabase;

  const recordName = `backup_${filename.replace(/[^a-zA-Z0-9]/g, "_")}`;

  const arrayBuffer = await content.arrayBuffer();
  const base64Data = uint8ArrayToBase64(new Uint8Array(arrayBuffer));

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
  };

  const allRecords: CloudKitRecord[] = [];
  const response = await database.performQuery(query);

  if (response.records) {
    allRecords.push(...response.records);
  }

  while (response.continuationMarker) {
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

  if (typeof dataField === "string") {
    const bytes = base64ToUint8Array(dataField);
    return new Blob([bytes], { type: "application/json" });
  }

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
