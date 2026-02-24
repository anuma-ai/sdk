/**
 * Google Drive API utilities
 *
 * Uses Google Drive API v3 for file operations.
 * Requires an OAuth 2.0 access token with drive.file scope.
 */

const DRIVE_API_URL = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD_URL = "https://www.googleapis.com/upload/drive/v3";
const FOLDER_MIME_TYPE = "application/vnd.google-apps.folder";

/**
 * Escape single quotes for Google Drive API query strings
 * Single quotes must be doubled to prevent query injection
 */
function escapeQueryValue(value: string): string {
  return value.replace(/'/g, "''");
}

/** Default root folder name for backups */
export const DEFAULT_ROOT_FOLDER = "ai-chat-app";
/** Default subfolder for conversation backups */
export const DEFAULT_CONVERSATIONS_FOLDER = "conversations";

export interface DriveFile {
  id: string;
  name: string;
  createdTime: string;
  modifiedTime: string;
  size: string;
}

/**
 * Find or create a folder in Google Drive
 */
async function ensureFolder(accessToken: string, name: string, parentId?: string): Promise<string> {
  const parentQuery = parentId ? `'${escapeQueryValue(parentId)}' in parents and ` : "";
  const query = `${parentQuery}mimeType='${FOLDER_MIME_TYPE}' and name='${escapeQueryValue(name)}' and trashed=false`;

  const response = await fetch(
    `${DRIVE_API_URL}/files?q=${encodeURIComponent(query)}&fields=files(id)`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to search for folder ${name}: ${response.status}`);
  }

  const data = await response.json();
  if (data.files && data.files.length > 0) {
    return data.files[0].id;
  }

  // Create folder if it doesn't exist
  const body: Record<string, unknown> = {
    name,
    mimeType: FOLDER_MIME_TYPE,
  };

  if (parentId) {
    body.parents = [parentId];
  }

  const createResponse = await fetch(`${DRIVE_API_URL}/files`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!createResponse.ok) {
    throw new Error(`Failed to create folder ${name}: ${createResponse.status}`);
  }

  const folderData = await createResponse.json();
  return folderData.id;
}

/**
 * Get or create the backup folder structure
 */
export async function getBackupFolder(
  accessToken: string,
  rootFolder: string = DEFAULT_ROOT_FOLDER,
  subfolder: string = DEFAULT_CONVERSATIONS_FOLDER
): Promise<string> {
  const rootId = await ensureFolder(accessToken, rootFolder);
  return ensureFolder(accessToken, subfolder, rootId);
}

/**
 * Upload a file to Google Drive
 */
export async function uploadFileToDrive(
  accessToken: string,
  folderId: string,
  content: Blob,
  filename: string
): Promise<{ id: string; name: string }> {
  const metadata = {
    name: filename,
    parents: [folderId],
    mimeType: "application/json",
  };

  const form = new FormData();
  form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
  form.append("file", content);

  const response = await fetch(`${DRIVE_UPLOAD_URL}/files?uploadType=multipart`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Drive upload failed: ${response.status} - ${errorText}`);
  }

  return response.json();
}

/**
 * Update an existing file on Google Drive
 */
export async function updateDriveFile(
  accessToken: string,
  fileId: string,
  content: Blob
): Promise<{ id: string; name: string }> {
  const response = await fetch(`${DRIVE_UPLOAD_URL}/files/${fileId}?uploadType=media`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: content,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Drive update failed: ${response.status} - ${errorText}`);
  }

  return response.json();
}

/**
 * List files in a Google Drive folder
 */
export async function listDriveFiles(accessToken: string, folderId: string): Promise<DriveFile[]> {
  const query = `'${escapeQueryValue(folderId)}' in parents and mimeType='application/json' and trashed=false`;
  const fields = "files(id,name,createdTime,modifiedTime,size)";

  const response = await fetch(
    `${DRIVE_API_URL}/files?q=${encodeURIComponent(query)}&fields=${fields}&pageSize=1000`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to list files: ${response.status}`);
  }

  const data: { files?: DriveFile[] } = await response.json();
  return data.files ?? [];
}

/**
 * Download a file from Google Drive
 */
export async function downloadDriveFile(accessToken: string, fileId: string): Promise<Blob> {
  const response = await fetch(`${DRIVE_API_URL}/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`Failed to download file: ${response.status}`);
  }

  return response.blob();
}

/**
 * Find a specific file in a Google Drive folder
 */
export async function findDriveFile(
  accessToken: string,
  folderId: string,
  filename: string
): Promise<DriveFile | null> {
  const query = `'${escapeQueryValue(folderId)}' in parents and name='${escapeQueryValue(filename)}' and trashed=false`;
  const fields = "files(id,name,createdTime,modifiedTime,size)";

  const response = await fetch(
    `${DRIVE_API_URL}/files?q=${encodeURIComponent(query)}&fields=${fields}&pageSize=1`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to find file: ${response.status}`);
  }

  const data: { files?: DriveFile[] } = await response.json();
  return data.files?.[0] ?? null;
}
