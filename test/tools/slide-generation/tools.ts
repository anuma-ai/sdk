/**
 * Slide deck tools backed by an in-memory file store for testing.
 *
 * Uses only createSlideTools — the two-step plan_slides → create_slides
 * flow writes slides.jsx directly via the storage adapter, so no
 * createAppGenerationTools (create_file) dependency is needed.
 */

import { normalizePath, type AppFileStorage } from "../../../src/tools/appGeneration.js";
import { createSlideTools } from "../../../src/tools/slides/index.js";
import type { FileStore } from "./setup.js";

/** Minimal AppFileStorage adapter backed by an in-memory Map (getFile + putFile only). */
function createMapStorage(store: FileStore): Pick<AppFileStorage, "getFile" | "putFile"> {
  return {
    getFile: async (_cid: string, p: string) => {
      const content = store.get(normalizePath(p));
      return content !== undefined ? { path: normalizePath(p), content } : null;
    },
    putFile: async (_cid: string, p: string, content: string) => {
      store.set(normalizePath(p), content);
    },
  };
}

const TEST_CONVERSATION_ID = "test-conversation";

/**
 * Returns the slide tool suite: plan_slides, create_slides, read_slides,
 * patch_slides, display_slides — all sharing the same in-memory store.
 */
export function createTestSlideTools(store: FileStore) {
  const storage = createMapStorage(store);
  const getConversationId = () => TEST_CONVERSATION_ID;

  return createSlideTools({
    getConversationId,
    storage,
    displaySlides: async (args: Record<string, unknown>) => ({
      title: args.title ?? "Slides",
      interaction_id: `slides_test_${Date.now()}`,
      displayType: "slides",
    }),
  });
}
