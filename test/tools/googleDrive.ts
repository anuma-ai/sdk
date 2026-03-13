/**
 * Google Drive tool e2e test
 *
 * Verifies that runToolLoop correctly executes Google Drive tools
 * against the real Google Drive API using a service account.
 *
 * Uses a Shared Drive (GOOGLE_SHARED_DRIVE_ID) that the service account
 * has Content Manager access to. Uploads a test file before tests, cleans up after.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { runToolLoop } from "../../src/lib/chat/toolLoop.js";
import {
  createGoogleDriveSearchTool,
  createGoogleDriveListRecentTool,
  createGoogleDriveGetContentTool,
} from "../../src/tools/googleDrive.js";
import { config, printResult, wrapTool, type ToolCallLog } from "./setup.js";
import { createGoogleTokenManager } from "./googleAuth.js";

// ── Setup ─────────────────────────────────────────────────────────────────────

if (!process.env.GOOGLE_SHARED_DRIVE_ID) {
  throw new Error(
    "GOOGLE_SHARED_DRIVE_ID is required. Add it to .env or set the environment variable."
  );
}
const SHARED_DRIVE_ID = process.env.GOOGLE_SHARED_DRIVE_ID;

const auth = createGoogleTokenManager("https://www.googleapis.com/auth/drive");
let testFileId: string | null = null;
const TEST_FILE_NAME = "E2E_Test_Document.txt";
const TEST_FILE_CONTENT = "This is an automated e2e test file for the Google Drive tool.";

async function uploadTestFile(): Promise<string> {
  const token = await auth.ensureToken();

  const metadata = {
    name: TEST_FILE_NAME,
    mimeType: "text/plain",
    parents: [SHARED_DRIVE_ID],
  };

  const boundary = "e2e_test_boundary";
  const body =
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: text/plain\r\n\r\n` +
    `${TEST_FILE_CONTENT}\r\n` +
    `--${boundary}--`;

  const res = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id,name",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body,
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to upload test file (${res.status}): ${text}`);
  }

  const data = await res.json();
  console.log(`  [setup] Uploaded test file: ${data.name} (${data.id})`);
  return data.id;
}

async function trashFile(fileId: string) {
  const token = await auth.ensureToken();
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?supportsAllDrives=true`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ trashed: true }),
    }
  );
  if (!res.ok) {
    const text = await res.text();
    console.warn(`  [cleanup] Failed to trash ${fileId} (${res.status}): ${text}`);
  }
}

async function cleanupOrphanedTestFiles() {
  const token = await auth.ensureToken();
  const params = new URLSearchParams({
    q: `name = '${TEST_FILE_NAME}' and trashed = false`,
    corpora: "allDrives",
    supportsAllDrives: "true",
    includeItemsFromAllDrives: "true",
    fields: "files(id)",
  });
  const res = await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return;
  const data = await res.json();
  for (const f of data.files || []) {
    await trashFile(f.id);
    console.log(`  [cleanup] Trashed orphaned file ${f.id}`);
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("google-drive", () => {
  beforeAll(async () => {
    await cleanupOrphanedTestFiles();
    testFileId = await uploadTestFile();
  });

  afterAll(async () => {
    if (testFileId) {
      try {
        await trashFile(testFileId);
        console.log(`  [cleanup] Trashed test file ${testFileId}`);
      } catch {
        console.warn(`  [cleanup] Failed to trash test file ${testFileId}`);
      }
    }
  });

  it("lists recent files", async () => {
    await auth.ensureToken();

    const log: ToolCallLog[] = [];
    const listTool = wrapTool(
      createGoogleDriveListRecentTool(auth.getAccessToken, auth.requestAccess),
      log
    );

    const result = await runToolLoop({
      messages: [
        {
          role: "user",
          content: [{ type: "text", text: "List my recent Google Drive files." }],
        },
      ],
      model: config.model,
      baseUrl: config.baseUrl,
      headers: { "X-API-Key": config.portalKey },
      apiType: config.apiType,
      tools: [listTool],
      toolChoice: "auto",
      maxToolRounds: 3,
    });

    printResult(result);

    expect(result.error).toBeNull();
    expect(log.length).toBeGreaterThanOrEqual(1);
    expect(log[0].name).toBe("google_drive_list_recent");

    const files = log[0].result;
    expect(Array.isArray(files)).toBe(true);
    expect((files as unknown[]).length).toBeGreaterThanOrEqual(1);
  });

  it("searches for files", async () => {
    await auth.ensureToken();

    const log: ToolCallLog[] = [];
    const searchTool = wrapTool(
      createGoogleDriveSearchTool(auth.getAccessToken, auth.requestAccess),
      log
    );

    const result = await runToolLoop({
      messages: [
        {
          role: "system",
          content: [
            {
              type: "text",
              text: "You are a file assistant. When asked to search for files, call the tool immediately with the search query. Do not ask for confirmation.",
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Search my Google Drive for files matching "E2E_Test".`,
            },
          ],
        },
      ],
      model: config.model,
      baseUrl: config.baseUrl,
      headers: { "X-API-Key": config.portalKey },
      apiType: config.apiType,
      tools: [searchTool],
      toolChoice: "auto",
      maxToolRounds: 3,
    });

    printResult(result);

    expect(result.error).toBeNull();
    expect(log.length).toBeGreaterThanOrEqual(1);
    expect(log[0].name).toBe("google_drive_search");

    const args = log[0].args;
    expect(typeof args.query).toBe("string");

    // fullText search may not find recently uploaded files due to indexing delay;
    // verify the tool executed and returned a valid response (array or "no files" string)
    const files = log[0].result;
    expect(typeof files === "string" || Array.isArray(files)).toBe(true);
  });

  it("gets file content by ID", async () => {
    await auth.ensureToken();
    expect(testFileId).toBeTruthy();

    const log: ToolCallLog[] = [];
    const getContentTool = wrapTool(
      createGoogleDriveGetContentTool(auth.getAccessToken, auth.requestAccess),
      log
    );

    const result = await runToolLoop({
      messages: [
        {
          role: "system",
          content: [
            {
              type: "text",
              text: "You are a file assistant. When asked to read a file, call the tool immediately with the provided file ID. Do not ask for confirmation.",
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Read the content of the Google Drive file with ID "${testFileId}".`,
            },
          ],
        },
      ],
      model: config.model,
      baseUrl: config.baseUrl,
      headers: { "X-API-Key": config.portalKey },
      apiType: config.apiType,
      tools: [getContentTool],
      toolChoice: "auto",
      maxToolRounds: 3,
    });

    printResult(result);

    expect(result.error).toBeNull();
    expect(log.length).toBeGreaterThanOrEqual(1);
    expect(log[0].name).toBe("google_drive_get_content");

    const contentResult = log[0].result as string;
    expect(typeof contentResult).toBe("string");
    expect(contentResult).toContain(TEST_FILE_CONTENT);
  });

  it("chains list → get_content: lists files then reads one", async () => {
    await auth.ensureToken();

    const log: ToolCallLog[] = [];
    const listTool = wrapTool(
      createGoogleDriveListRecentTool(auth.getAccessToken, auth.requestAccess),
      log
    );
    const getContentTool = wrapTool(
      createGoogleDriveGetContentTool(auth.getAccessToken, auth.requestAccess),
      log
    );

    const result = await runToolLoop({
      messages: [
        {
          role: "system",
          content: [
            {
              type: "text",
              text: "You are a file assistant. Execute tool calls immediately without asking for confirmation. When listing files and reading content, use the tools directly.",
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `List my recent Google Drive files, then read the content of the file named "${TEST_FILE_NAME}".`,
            },
          ],
        },
      ],
      model: config.model,
      baseUrl: config.baseUrl,
      headers: { "X-API-Key": config.portalKey },
      apiType: config.apiType,
      tools: [listTool, getContentTool],
      toolChoice: "auto",
      maxToolRounds: 5,
    });

    printResult(result);

    expect(result.error).toBeNull();

    const listCalls = log.filter((l) => l.name === "google_drive_list_recent");
    const contentCalls = log.filter((l) => l.name === "google_drive_get_content");

    expect(listCalls.length).toBeGreaterThanOrEqual(1);
    expect(contentCalls.length).toBeGreaterThanOrEqual(1);

    const firstListIdx = log.indexOf(listCalls[0]);
    const firstContentIdx = log.indexOf(contentCalls[0]);
    expect(firstListIdx).toBeLessThan(firstContentIdx);

    const contentResult = contentCalls[0].result as string;
    expect(contentResult).toContain(TEST_FILE_CONTENT);
  });
});
