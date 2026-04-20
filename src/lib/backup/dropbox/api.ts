/**
 * Dropbox API utilities
 *
 * Uses Dropbox HTTP API for file operations.
 * Dropbox uses OAuth 2.0 with PKCE for browser apps.
 */

const DROPBOX_API_URL = "https://api.dropboxapi.com/2";
const DROPBOX_CONTENT_URL = "https://content.dropboxapi.com/2";

/** Default folder path for Dropbox backups */
export const DEFAULT_BACKUP_FOLDER = "/ai-chat-app/conversations";

export interface DropboxFile {
  id: string;
  name: string;
  path_lower: string;
  path_display: string;
  client_modified: string;
  server_modified: string;
  size: number;
}

interface DropboxListFolderResponse {
  entries: Array<{
    ".tag": "file" | "folder" | "deleted";
    id: string;
    name: string;
    path_lower: string;
    path_display: string;
    client_modified?: string;
    server_modified?: string;
    size?: number;
  }>;
  cursor: string;
  has_more: boolean;
}

interface DropboxUploadResponse {
  id: string;
  name: string;
  path_lower: string;
  path_display: string;
  client_modified: string;
  server_modified: string;
  size: number;
}

interface DropboxError {
  error_summary: string;
  error: {
    ".tag": string;
    path?: {
      ".tag": string;
    };
  };
}

/**
 * Ensure the backup folder exists in Dropbox
 */
async function ensureBackupFolder(
  accessToken: string,
  folder: string = DEFAULT_BACKUP_FOLDER
): Promise<void> {
  try {
    await fetch(`${DROPBOX_API_URL}/files/create_folder_v2`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        path: folder,
        autorename: false,
      }),
    });
    // Folder created or already exists (error will be path/conflict which is fine)
  } catch {
    // Ignore errors - folder may already exist
  }
}

/**
 * Upload a file to Dropbox
 */
export async function uploadFileToDropbox(
  accessToken: string,
  filename: string,
  content: Blob,
  folder: string = DEFAULT_BACKUP_FOLDER
): Promise<DropboxUploadResponse> {
  await ensureBackupFolder(accessToken, folder);

  const path = `${folder}/${filename}`;

  const response = await fetch(`${DROPBOX_CONTENT_URL}/files/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/octet-stream",
      "Dropbox-API-Arg": JSON.stringify({
        path,
        mode: "overwrite",
        autorename: false,
        mute: true,
      }),
    },
    body: content,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Dropbox upload failed: ${response.status} - ${errorText}`);
  }

  return response.json() as Promise<DropboxUploadResponse>;
}

/**
 * List all backup files in Dropbox
 */
export async function listDropboxFiles(
  accessToken: string,
  folder: string = DEFAULT_BACKUP_FOLDER
): Promise<DropboxFile[]> {
  await ensureBackupFolder(accessToken, folder);

  const response = await fetch(`${DROPBOX_API_URL}/files/list_folder`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      path: folder,
      recursive: false,
      include_deleted: false,
    }),
  });

  if (!response.ok) {
    const error = (await response.json()) as DropboxError;
    // If folder doesn't exist, return empty array
    if (error.error?.path?.[".tag"] === "not_found") {
      return [];
    }
    throw new Error(`Dropbox list failed: ${error.error_summary}`);
  }

  let data = (await response.json()) as DropboxListFolderResponse;

  // Accumulate all entries across paginated responses
  const allEntries: DropboxListFolderResponse["entries"] = [...data.entries];

  // Continue fetching while there are more results
  while (data.has_more) {
    const continueResponse = await fetch(`${DROPBOX_API_URL}/files/list_folder/continue`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        cursor: data.cursor,
      }),
    });

    if (!continueResponse.ok) {
      const errorText = await continueResponse.text();
      throw new Error(`Dropbox list continue failed: ${continueResponse.status} - ${errorText}`);
    }

    data = (await continueResponse.json()) as DropboxListFolderResponse;
    allEntries.push(...data.entries);
  }

  // Filter to only files (not folders) and map to our interface
  const files: DropboxFile[] = allEntries
    .filter((entry) => entry[".tag"] === "file")
    .map((entry) => ({
      id: entry.id,
      name: entry.name,
      path_lower: entry.path_lower,
      path_display: entry.path_display,
      client_modified: entry.client_modified || "",
      server_modified: entry.server_modified || "",
      size: entry.size || 0,
    }));

  return files;
}

/**
 * Download a file from Dropbox
 */
export async function downloadDropboxFile(accessToken: string, path: string): Promise<Blob> {
  const response = await fetch(`${DROPBOX_CONTENT_URL}/files/download`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Dropbox-API-Arg": JSON.stringify({ path }),
    },
  });

  if (!response.ok) {
    throw new Error(`Dropbox download failed: ${response.status}`);
  }

  return response.blob();
}

/**
 * Find a specific file in Dropbox by filename
 */
export async function findDropboxFile(
  accessToken: string,
  filename: string,
  folder: string = DEFAULT_BACKUP_FOLDER
): Promise<DropboxFile | null> {
  const files = await listDropboxFiles(accessToken, folder);
  return files.find((f) => f.name === filename) || null;
}
