/**
 * Google Drive tool definition for the chat system.
 * This tool allows the LLM to search files in the user's Google Drive.
 */

import type { ToolConfig } from "./googleCalendar";
import { getLogger } from "../lib/logger";

export interface SearchFilesArgs {
  query: string;
  maxResults?: number;
  mimeType?: string;
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  modifiedTime?: string;
  size?: string;
  owners?: { displayName: string; emailAddress: string }[];
}

interface DriveApiFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  modifiedTime?: string;
  size?: string;
  owners?: { displayName: string; emailAddress: string }[];
}

interface DriveApiResponse {
  files?: DriveApiFile[];
  error?: { message: string };
}

/**
 * Searches for files in Google Drive API
 */
async function searchDriveFiles(
  accessToken: string,
  args: SearchFilesArgs
): Promise<DriveFile[] | string> {
  const { query, maxResults = 10, mimeType } = args;

  // Build the query string for Google Drive API
  // Search in file name and full text
  let driveQuery = `fullText contains '${query.replace(/'/g, "\\'")}'`;

  // Add mime type filter if specified
  if (mimeType) {
    driveQuery += ` and mimeType = '${mimeType}'`;
  }

  // Exclude trashed files
  driveQuery += " and trashed = false";

  const params = new URLSearchParams({
    q: driveQuery,
    pageSize: String(maxResults),
    fields: "files(id,name,mimeType,webViewLink,modifiedTime,size,owners)",
    orderBy: "modifiedTime desc",
  });

  try {
    const response = await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        return "Error: Google Drive access not authorized. Please grant Drive permissions.";
      }
      if (response.status === 403) {
        return "Error: Insufficient permissions to access Google Drive. Please grant read access to your Drive.";
      }
      const errorText = await response.text();
      return `Error: Failed to search Google Drive (${response.status}): ${errorText}`;
    }

    const data: DriveApiResponse = await response.json();
    const files: DriveFile[] = (data.files || []).map((file: DriveApiFile) => ({
      id: file.id,
      name: file.name,
      mimeType: file.mimeType,
      webViewLink: file.webViewLink,
      modifiedTime: file.modifiedTime,
      size: file.size,
      owners: file.owners,
    }));

    if (files.length === 0) {
      return `No files found matching "${query}"`;
    }

    return files;
  } catch (error) {
    return `Error: ${error instanceof Error ? error.message : "Unknown error occurred"}`;
  }
}

/**
 * Creates the Google Drive search tool with access to the token getter.
 * The token getter is captured in a closure so the executor can access it.
 */
export function createGoogleDriveSearchTool(
  getAccessToken: () => string | null,
  requestDriveAccess: () => Promise<string>
): ToolConfig {
  return {
    type: "function",
    function: {
      name: "google_drive_search",
      description:
        "Searches for files in the user's Google Drive. Returns matching files with their names, types, and links. Use this to help users find documents, spreadsheets, presentations, PDFs, and other files stored in their Drive.",
      arguments: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description:
              'The search query to find files. Searches in file names and content. Examples: "quarterly report", "budget 2024", "meeting notes".',
          },
          maxResults: {
            type: "number",
            description: "Maximum number of files to return. Defaults to 10. Maximum is 100.",
          },
          mimeType: {
            type: "string",
            description:
              'Optional MIME type filter. Common types: "application/vnd.google-apps.document" (Google Docs), "application/vnd.google-apps.spreadsheet" (Sheets), "application/vnd.google-apps.presentation" (Slides), "application/pdf" (PDF files).',
          },
        },
        required: ["query"],
      },
    },
    executor: async (args: Record<string, unknown>): Promise<DriveFile[] | string> => {
      // Try to get existing token first
      let token = getAccessToken();

      // If no token, request Drive access
      if (!token) {
        try {
          token = await requestDriveAccess();
        } catch {
          return "Error: Failed to get Google Drive access. Please grant permissions when prompted.";
        }
      }

      if (!token) {
        return "Error: No Google Drive access token available. Please connect your Google account.";
      }

      const typedArgs: SearchFilesArgs = {
        query: args.query as string,
        maxResults: args.maxResults as number | undefined,
        mimeType: args.mimeType as string | undefined,
      };

      return searchDriveFiles(token, typedArgs);
    },
    autoExecute: true,
  };
}

export interface ListRecentFilesArgs {
  maxResults?: number;
  mimeType?: string;
}

/**
 * Lists recent files from Google Drive API
 */
async function listRecentDriveFiles(
  accessToken: string,
  args: ListRecentFilesArgs
): Promise<DriveFile[] | string> {
  const { maxResults = 10, mimeType } = args;

  // Build the query string - only exclude trashed files
  let driveQuery = "trashed = false";

  // Add mime type filter if specified
  if (mimeType) {
    driveQuery += ` and mimeType = '${mimeType}'`;
  }

  const params = new URLSearchParams({
    q: driveQuery,
    pageSize: String(maxResults),
    fields: "files(id,name,mimeType,webViewLink,modifiedTime,size,owners)",
    orderBy: "modifiedTime desc",
  });

  try {
    const response = await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        return "Error: Google Drive access not authorized. Please grant Drive permissions.";
      }
      if (response.status === 403) {
        return "Error: Insufficient permissions to access Google Drive. Please grant read access to your Drive.";
      }
      const errorText = await response.text();
      return `Error: Failed to list Google Drive files (${response.status}): ${errorText}`;
    }

    const data: DriveApiResponse = await response.json();
    const files: DriveFile[] = (data.files || []).map((file: DriveApiFile) => ({
      id: file.id,
      name: file.name,
      mimeType: file.mimeType,
      webViewLink: file.webViewLink,
      modifiedTime: file.modifiedTime,
      size: file.size,
      owners: file.owners,
    }));

    if (files.length === 0) {
      return "No recent files found in your Google Drive.";
    }

    return files;
  } catch (error) {
    return `Error: ${error instanceof Error ? error.message : "Unknown error occurred"}`;
  }
}

/**
 * Creates the Google Drive list recent files tool with access to the token getter.
 */
export function createGoogleDriveListRecentTool(
  getAccessToken: () => string | null,
  requestDriveAccess: () => Promise<string>
): ToolConfig {
  return {
    type: "function",
    function: {
      name: "google_drive_list_recent",
      description:
        "Lists recent files from the user's Google Drive, ordered by last modified date. Use this when the user wants to see their recent files without a specific search query.",
      arguments: {
        type: "object",
        properties: {
          maxResults: {
            type: "number",
            description: "Maximum number of files to return. Defaults to 10. Maximum is 100.",
          },
          mimeType: {
            type: "string",
            description:
              'Optional MIME type filter. Common types: "application/vnd.google-apps.document" (Google Docs), "application/vnd.google-apps.spreadsheet" (Sheets), "application/vnd.google-apps.presentation" (Slides), "application/pdf" (PDF files).',
          },
        },
        required: [],
      },
    },
    executor: async (args: Record<string, unknown>): Promise<DriveFile[] | string> => {
      // Try to get existing token first
      let token = getAccessToken();

      // If no token, request Drive access
      if (!token) {
        try {
          token = await requestDriveAccess();
        } catch {
          return "Error: Failed to get Google Drive access. Please grant permissions when prompted.";
        }
      }

      if (!token) {
        return "Error: No Google Drive access token available. Please connect your Google account.";
      }

      const typedArgs: ListRecentFilesArgs = {
        maxResults: args.maxResults as number | undefined,
        mimeType: args.mimeType as string | undefined,
      };

      return listRecentDriveFiles(token, typedArgs);
    },
    autoExecute: true,
  };
}

export interface GetFileContentArgs {
  fileId?: string;
  fileName?: string;
}

interface FileMetadataResponse {
  id: string;
  name: string;
  mimeType: string;
  error?: { message: string };
}

/**
 * Searches for a file by name and returns its ID
 */
async function findFileByName(accessToken: string, fileName: string): Promise<string | null> {
  const driveQuery = `name contains '${fileName.replace(/'/g, "\\'")}' and trashed = false`;
  const params = new URLSearchParams({
    q: driveQuery,
    pageSize: "1",
    fields: "files(id,name)",
    orderBy: "modifiedTime desc",
  });

  const response = await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    return null;
  }

  const data: DriveApiResponse = await response.json();
  return data.files?.[0]?.id || null;
}

/** Google Workspace mime types that can be exported as text */
const GOOGLE_DOCS_EXPORT_TYPES: Record<string, string> = {
  "application/vnd.google-apps.document": "text/plain",
  "application/vnd.google-apps.spreadsheet": "text/csv",
  "application/vnd.google-apps.presentation": "text/plain",
};

/** Maximum content length to avoid overwhelming LLM context */
const MAX_CONTENT_LENGTH = 50000;

interface FileMetadata {
  name: string;
  mimeType: string;
  webViewLink?: string;
}

interface ContentUrlResult {
  url: string;
  isExport: boolean;
}

/**
 * Resolves a file identifier (either fileId or fileName) to a fileId
 */
async function resolveFileId(
  accessToken: string,
  fileId: string | undefined,
  fileName: string | undefined
): Promise<{ fileId: string } | { error: string }> {
  if (fileId) {
    return { fileId };
  }

  if (fileName) {
    getLogger().debug("[google_drive_get_content] Searching for file by name:", fileName);
    const foundId = await findFileByName(accessToken, fileName);
    if (!foundId) {
      return {
        error: `Error: Could not find a file matching "${fileName}". Please check the file name and try again.`,
      };
    }
    getLogger().debug("[google_drive_get_content] Found file ID:", foundId);
    return { fileId: foundId };
  }

  return { error: "Error: Please provide either a fileId or fileName to get file content." };
}

/**
 * Fetches file metadata from Google Drive
 */
async function fetchFileMetadata(
  accessToken: string,
  fileId: string
): Promise<{ metadata: FileMetadata } | { error: string }> {
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,mimeType,webViewLink`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!response.ok) {
    if (response.status === 404) {
      return { error: "Error: File not found. Please check the file ID." };
    }
    return { error: `Error: Failed to get file metadata (${response.status})` };
  }

  const data: FileMetadataResponse & { webViewLink?: string } = await response.json();
  return {
    metadata: { name: data.name, mimeType: data.mimeType, webViewLink: data.webViewLink },
  };
}

/**
 * Determines the content URL for a given mime type, or returns null for non-text types
 */
function getContentUrl(fileId: string, mimeType: string): ContentUrlResult | null {
  if (GOOGLE_DOCS_EXPORT_TYPES[mimeType]) {
    const exportMimeType = GOOGLE_DOCS_EXPORT_TYPES[mimeType];
    return {
      url: `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=${encodeURIComponent(exportMimeType)}`,
      isExport: true,
    };
  }

  if (
    mimeType.startsWith("text/") ||
    mimeType === "application/json" ||
    mimeType === "application/xml"
  ) {
    return {
      url: `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      isExport: false,
    };
  }

  return null;
}

/**
 * Formats a response for non-text file types (PDF, images, etc.)
 */
function formatNonTextFileResponse(fileId: string, metadata: FileMetadata): string {
  const { name, mimeType, webViewLink } = metadata;
  const linkInfo = webViewLink ? `\nView in Google Drive: ${webViewLink}` : "";

  if (mimeType === "application/pdf") {
    return `File: ${name}\nType: PDF${linkInfo}\n\nNote: PDF content cannot be extracted directly in the browser. The user can click the link above to view the PDF in Google Drive.`;
  }

  if (mimeType.startsWith("image/")) {
    const directUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;
    return `File: ${name}\nType: ${mimeType}${linkInfo}\nDirect image URL: ${directUrl}\n\nTo view this image, click the Google Drive link above or use the direct URL.`;
  }

  return `File: ${name}\nType: ${mimeType}${linkInfo}\n\nNote: This file type cannot be displayed as text.`;
}

/**
 * Fetches and formats file content with header and optional truncation
 */
async function fetchAndFormatContent(
  accessToken: string,
  contentUrl: string,
  metadata: FileMetadata,
  isExport: boolean
): Promise<string> {
  const response = await fetch(contentUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    if (response.status === 403) {
      return `Error: Permission denied. You may not have access to view this file's content.`;
    }
    return `Error: Failed to get file content (${response.status})`;
  }

  const content = await response.text();
  const truncated = content.length > MAX_CONTENT_LENGTH;
  const displayContent = truncated ? content.slice(0, MAX_CONTENT_LENGTH) : content;

  const header = `=== File: ${metadata.name} ===\nType: ${metadata.mimeType}${isExport ? " (exported as text)" : ""}\n\n`;
  const footer = truncated
    ? `\n\n... (content truncated, showing first ${MAX_CONTENT_LENGTH} characters of ${content.length})`
    : "";

  return header + displayContent + footer;
}

/**
 * Gets the content of a file from Google Drive
 * Supports Google Docs, Sheets, Slides (exported as text), and text-based files
 */
async function getDriveFileContent(accessToken: string, args: GetFileContentArgs): Promise<string> {
  getLogger().debug("[google_drive_get_content] Starting with:", args);

  // Resolve file identifier
  const fileIdResult = await resolveFileId(accessToken, args.fileId, args.fileName);
  if ("error" in fileIdResult) {
    return fileIdResult.error;
  }
  const { fileId } = fileIdResult;

  try {
    // Fetch file metadata
    const metadataResult = await fetchFileMetadata(accessToken, fileId);
    if ("error" in metadataResult) {
      return metadataResult.error;
    }
    const { metadata } = metadataResult;

    getLogger().debug("[google_drive_get_content] File metadata:", metadata);

    // Determine content URL based on mime type
    const contentUrlResult = getContentUrl(fileId, metadata.mimeType);
    if (!contentUrlResult) {
      return formatNonTextFileResponse(fileId, metadata);
    }

    // Fetch and format the content
    return fetchAndFormatContent(
      accessToken,
      contentUrlResult.url,
      metadata,
      contentUrlResult.isExport
    );
  } catch (error) {
    return `Error: ${error instanceof Error ? error.message : "Unknown error occurred"}`;
  }
}

/**
 * Creates the Google Drive get file content tool
 */
export function createGoogleDriveGetContentTool(
  getAccessToken: () => string | null,
  requestDriveAccess: () => Promise<string>
): ToolConfig {
  return {
    type: "function",
    function: {
      name: "google_drive_get_content",
      description:
        "Gets the text content of a file from the user's Google Drive. Works with Google Docs, Sheets, Slides (exported as text/CSV), and text-based files. You can provide either a fileId (from a previous search) or a fileName to search for.",
      arguments: {
        type: "object",
        properties: {
          fileId: {
            type: "string",
            description:
              "The unique file ID from Google Drive. Use this if you have the ID from a previous search result.",
          },
          fileName: {
            type: "string",
            description:
              "The name (or partial name) of the file to find and read. Use this when you know the file name but not the ID.",
          },
        },
        required: [],
      },
    },
    executor: async (args: Record<string, unknown>): Promise<string> => {
      getLogger().debug("[google_drive_get_content] Executor called with args:", args);

      // Try to get existing token first
      let token = getAccessToken();

      // If no token, request Drive access
      if (!token) {
        getLogger().debug("[google_drive_get_content] No token, requesting access...");
        try {
          token = await requestDriveAccess();
        } catch {
          return "Error: Failed to get Google Drive access. Please grant permissions when prompted.";
        }
      }

      if (!token) {
        return "Error: No Google Drive access token available. Please connect your Google account.";
      }

      const typedArgs: GetFileContentArgs = {
        fileId: args.fileId as string | undefined,
        fileName: args.fileName as string | undefined,
      };

      const result = await getDriveFileContent(token, typedArgs);
      getLogger().debug(
        "[google_drive_get_content] Result length:",
        result.length,
        "First 200 chars:",
        result.slice(0, 200)
      );
      return result;
    },
    autoExecute: true,
  };
}

/**
 * Creates all Google Drive tools with the provided token context.
 */
export function createDriveTools(
  getAccessToken: () => string | null,
  requestDriveAccess: () => Promise<string>
): ToolConfig[] {
  return [
    createGoogleDriveSearchTool(getAccessToken, requestDriveAccess),
    createGoogleDriveListRecentTool(getAccessToken, requestDriveAccess),
    createGoogleDriveGetContentTool(getAccessToken, requestDriveAccess),
  ];
}
