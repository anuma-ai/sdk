/**
 * Slide deck tools backed by an in-memory file store for testing.
 *
 * Combines createAppGenerationTools (for the initial create_file write of
 * slides.json) with createSlideTools (read_slides, patch_slides,
 * display_slides) using a Map-based storage adapter so tests run without
 * any external dependencies.
 */

import {
  createAppGenerationTools,
  normalizePath,
  type AppFileStorage,
} from "../../../src/tools/appGeneration.js";
import { createSlideTools } from "../../../src/tools/slides/index.js";
import type { FileStore } from "./setup.js";

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
    putFiles: async (_cid: string, files: Array<{ path: string; content: string }>) => {
      for (const f of files) store.set(normalizePath(f.path), f.content);
    },
    deleteFile: async (_cid: string, p: string) => {
      store.delete(normalizePath(p));
    },
  };
}

const TEST_CONVERSATION_ID = "test-conversation";

/**
 * Returns the full slide tool suite:
 *   - create_file, patch_file, read_file, list_files, delete_file, display_app
 *     (from createAppGenerationTools — only create_file/patch_file are used)
 *   - read_slides, patch_slides, display_slides (from createSlideTools)
 *
 * All tools share the same in-memory store.
 */
export function createTestSlideTools(store: FileStore) {
  const storage = createMapStorage(store);
  const getConversationId = () => TEST_CONVERSATION_ID;

  const appTools = createAppGenerationTools({
    getConversationId,
    storage,
    displayApp: async (args: Record<string, unknown>) => ({
      title: args.title ?? "App",
      interaction_id: `app_test_${Date.now()}`,
    }),
  });

  const slideTools = createSlideTools({
    getConversationId,
    storage,
    displaySlides: async (args: Record<string, unknown>) => ({
      title: args.title ?? "Slides",
      interaction_id: `slides_test_${Date.now()}`,
      displayType: "slides",
    }),
  });

  return [...appTools, ...slideTools];
}
