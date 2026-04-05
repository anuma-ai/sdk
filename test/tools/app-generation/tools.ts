/**
 * App file tools backed by an in-memory file store for testing.
 *
 * Uses the SDK's createAppGenerationTools with a Map-based storage adapter
 * so tests run without any external dependencies.
 */

import {
  createAppGenerationTools,
  type AppFileStorage,
} from "../../../src/tools/appGeneration.js";
import type { FileStore } from "./setup.js";
import { normalizePath } from "../../../src/tools/appGeneration.js";

/** Create an AppFileStorage adapter backed by an in-memory Map. */
function createMapStorage(store: FileStore): AppFileStorage {
  return {
    getFile: async (_cid: string, p: string) => {
      const content = store.get(normalizePath(p));
      return content !== undefined ? { path: normalizePath(p), content } : null;
    },
    getFiles: async (_cid: string) =>
      Array.from(store.entries()).map(([path, content]) => ({ path, content })),
    putFile: async (_cid: string, p: string, content: string) => {
      store.set(normalizePath(p), content);
    },
    putFiles: async (
      _cid: string,
      files: Array<{ path: string; content: string }>
    ) => {
      for (const f of files) store.set(normalizePath(f.path), f.content);
    },
    deleteFile: async (_cid: string, p: string) => {
      store.delete(normalizePath(p));
    },
  };
}

const TEST_CONVERSATION_ID = "test-conversation";

export function createTestAppTools(store: FileStore) {
  return createAppGenerationTools({
    getConversationId: () => TEST_CONVERSATION_ID,
    storage: createMapStorage(store),
    displayApp: async (args: Record<string, unknown>) => {
      return {
        title: args.title ?? "App",
        interaction_id: `app_test_${Date.now()}`,
      };
    },
  });
}
